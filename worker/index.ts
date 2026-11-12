export type SupportedSourceCurrency = 'JPY' | 'KRW' | 'TWD';

export interface LiveProviderQuote {
  providerId: string;
  providerName: string;
  providerType: string;
  fee: number;
  rate: number;
  markupPercent: number;
  receivedAmountVnd: number;
  collectedAt: number | null;
}

export interface ApiQuotesLiveResponse {
  mode: 'live_providers';
  sourceCurrency: 'JPY';
  sendAmount: number;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: number;
  quotes: LiveProviderQuote[];
}

export interface ApiQuotesIllustrativeResponse {
  mode: 'illustrative_only';
  sourceCurrency: 'KRW' | 'TWD';
  sendAmount: number;
  reason: 'no_public_live_api';
  referenceProviders: Array<{ name: string; url: string }>;
}

interface WiseQuoteRaw {
  rate?: unknown;
  fee?: unknown;
  markup?: unknown;
  receivedAmount?: unknown;
  dateCollected?: unknown;
}

interface WiseProviderRaw {
  id?: unknown;
  alias?: unknown;
  name?: unknown;
  type?: unknown;
  quotes?: unknown;
}

interface WiseComparisonRaw {
  providers?: unknown;
}

export interface WorkerEnv {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const WISE_COMPARISON_ENDPOINT = 'https://api.wise.com/v4/comparisons';
const UPSTREAM_TIMEOUT_MS = 7000;

const REFERENCE_PROVIDERS: Record<'KRW' | 'TWD', Array<{ name: string; url: string }>> = {
  KRW: [
    { name: 'Hanpass', url: 'https://www.hanpass.com' },
    { name: 'SentBe', url: 'https://www.sentbe.com' },
    { name: 'GmoneyTrans', url: 'https://www.gmoneytrans.com' },
  ],
  TWD: [
    { name: 'Western Union', url: 'https://www.westernunion.com' },
    { name: 'VietMoney (EUI)', url: 'https://www.westernunion.com' },
  ],
};

function jsonResponse(body: unknown, status = 200, cacheControl = 'no-store'): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
    },
  });
}

export function buildWiseComparisonUrl(sendAmount: number): string {
  const params = new URLSearchParams({
    sourceCurrency: 'JPY',
    targetCurrency: 'VND',
    sendAmount: String(sendAmount),
    sourceCountry: 'JP',
  });
  return `${WISE_COMPARISON_ENDPOINT}?${params.toString()}`;
}

export function normalizeWiseComparisonResponse(
  raw: unknown,
  sendAmount: number
): LiveProviderQuote[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const providers = (raw as WiseComparisonRaw).providers;
  if (!Array.isArray(providers)) {
    return [];
  }

  const results: LiveProviderQuote[] = [];

  for (const item of providers as WiseProviderRaw[]) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) continue;

    const alias =
      typeof item.alias === 'string' && item.alias.trim()
        ? item.alias.trim()
        : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const providerType =
      typeof item.type === 'string' ? item.type : 'moneyTransferProvider';

    const quotes = Array.isArray(item.quotes) ? (item.quotes as WiseQuoteRaw[]) : [];
    const firstQuote = quotes[0];
    if (!firstQuote || typeof firstQuote !== 'object') continue;

    const fee = Number(firstQuote.fee);
    const rate = Number(firstQuote.rate);
    const receivedAmount = Number(firstQuote.receivedAmount);
    const markupRaw = Number(firstQuote.markup ?? 0);

    if (
      !Number.isFinite(fee) ||
      fee < 0 ||
      fee >= sendAmount ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      !Number.isFinite(receivedAmount) ||
      receivedAmount <= 0
    ) {
      continue;
    }

    let collectedAt: number | null = null;
    if (typeof firstQuote.dateCollected === 'string') {
      const parsedMs = Date.parse(firstQuote.dateCollected);
      if (Number.isFinite(parsedMs)) {
        collectedAt = parsedMs;
      }
    }

    results.push({
      providerId: alias,
      providerName: name,
      providerType,
      fee,
      rate,
      markupPercent: Number.isFinite(markupRaw) && markupRaw >= 0 ? markupRaw : 0,
      receivedAmountVnd: Math.round(receivedAmount),
      collectedAt,
    });
  }

  results.sort((a, b) => {
    if (b.receivedAmountVnd !== a.receivedAmountVnd) {
      return b.receivedAmountVnd - a.receivedAmountVnd;
    }
    return a.providerName.localeCompare(b.providerName, 'en');
  });

  return results;
}

export async function handleApiQuotes(
  request: Request,
  fetchImpl: typeof fetch = fetch,
  nowMs: () => number = () => Date.now()
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const url = new URL(request.url);
  const sourceCurrency = url.searchParams.get('sourceCurrency');
  const sendAmountRaw = url.searchParams.get('sendAmount') ?? '';

  if (sourceCurrency !== 'JPY' && sourceCurrency !== 'KRW' && sourceCurrency !== 'TWD') {
    return jsonResponse({ error: 'invalid_source_currency' }, 400);
  }

  if (!/^[1-9]\d{0,8}$/.test(sendAmountRaw)) {
    return jsonResponse({ error: 'invalid_send_amount' }, 400);
  }

  const sendAmount = Number(sendAmountRaw);

  if (sourceCurrency !== 'JPY') {
    const body: ApiQuotesIllustrativeResponse = {
      mode: 'illustrative_only',
      sourceCurrency,
      sendAmount,
      reason: 'no_public_live_api',
      referenceProviders: REFERENCE_PROVIDERS[sourceCurrency],
    };
    return jsonResponse(body, 200, 'public, max-age=300');
  }

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamRes = await fetchImpl(buildWiseComparisonUrl(sendAmount), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'GuiVe-MVP/1.0',
      },
      signal: controller.signal,
    });

    if (!upstreamRes.ok) {
      return jsonResponse(
        {
          mode: 'unavailable',
          error: 'upstream_http_error',
          status: upstreamRes.status,
        },
        502
      );
    }

    const rawJson = (await upstreamRes.json()) as unknown;
    const quotes = normalizeWiseComparisonResponse(rawJson, sendAmount);

    if (quotes.length === 0) {
      return jsonResponse(
        { mode: 'unavailable', error: 'no_valid_quotes' },
        502
      );
    }

    const body: ApiQuotesLiveResponse = {
      mode: 'live_providers',
      sourceCurrency: 'JPY',
      sendAmount,
      sourceName: 'Wise Public Comparison API v4',
      sourceUrl: 'https://wise.com/gb/compare/',
      fetchedAt: nowMs(),
      quotes,
    };

    return jsonResponse(body, 200, 'public, max-age=120');
  } catch {
    return jsonResponse({ mode: 'unavailable', error: 'upstream_failed' }, 502);
  } finally {
    clearTimeout(timerId);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/quotes') {
      return handleApiQuotes(request);
    }

    return env.ASSETS.fetch(request);
  },
};
