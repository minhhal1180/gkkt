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
  note?: string | null;
}

export interface ApiQuotesLiveResponse {
  mode: 'live_providers';
  sourceCurrency: SupportedSourceCurrency;
  sendAmount: number;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: number;
  quotes: LiveProviderQuote[];
}

interface WiseQuoteRaw {
  rate?: unknown;
  fee?: unknown;
  markup?: unknown;
  receivedAmount?: unknown;
  dateCollected?: unknown;
}

interface WiseProviderRaw {
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
const VCB_XML_ENDPOINT =
  'https://portal.vietcombank.com.vn/UserControls/TVPortal.TyGia/pXML.aspx';
const BOT_CSV_ENDPOINT = 'https://rate.bot.com.tw/xrt/flcsv/0/day';
const HAOTOOL_CURRENT_ENDPOINT =
  'https://cdn.jsdelivr.net/gh/haotool/app@data/public/rates/v3/current.json';
const HAOTOOL_BASE_URL =
  'https://cdn.jsdelivr.net/gh/haotool/app@data/public/rates/v3/';
const OPEN_ER_API_ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

const UPSTREAM_TIMEOUT_MS = 7000;

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl = 'no-store'
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
    },
  });
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit = {},
  timeoutMs = UPSTREAM_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timerId);
  }
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

    const quotes = Array.isArray(item.quotes)
      ? (item.quotes as WiseQuoteRaw[])
      : [];
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
      note: 'Báo giá công khai từ Wise Comparison API (chuyển khoản ngân hàng tiêu chuẩn).',
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

/**
 * Parses Vietcombank's official XML exchange-rate feed for a given currency's
 * Transfer buying rate (Mua chuyển khoản, VND per 1 unit of source currency).
 */
export function parseVietcombankXmlRate(
  xml: string,
  currencyCode: 'KRW' | 'JPY'
): { transferRate: number; updatedAt: number | null } | null {
  const regex = new RegExp(
    `<Exrate[^>]*CurrencyCode=["']${currencyCode}["'][^>]*>`,
    'i'
  );
  const tagMatch = xml.match(regex);
  if (!tagMatch) return null;

  const transferMatch = tagMatch[0].match(/Transfer=["']([^"']+)["']/i);
  if (!transferMatch) return null;

  const numeric = Number(transferMatch[1].replace(/,/g, '').trim());
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  let updatedAt: number | null = null;
  const dtMatch = xml.match(/<DateTime>([^<]+)<\/DateTime>/i);
  if (dtMatch) {
    // Format is typically MM/DD/YYYY HH:MM:SS AM/PM (Vietnam time UTC+7)
    const parsed = Date.parse(`${dtMatch[1].trim()} GMT+0700`);
    if (Number.isFinite(parsed)) {
      updatedAt = parsed;
    }
  }

  return { transferRate: numeric, updatedAt };
}

/**
 * Parses Bank of Taiwan's official daily CSV (`https://rate.bot.com.tw/xrt/flcsv/0/day`)
 * for VND cash selling rate (column 12: 本行賣出 TWD per 1 VND -> VND per 1 TWD = 1 / sell).
 */
export function parseBankOfTaiwanVndRate(csv: string): number | null {
  const lines = csv.split(/\r?\n/);
  const vndLine = lines.find((line) => line.startsWith('VND,'));
  if (!vndLine) return null;

  const cols = vndLine.split(',');
  // Column 12 is 現金本行賣出 (Bank sells VND cash for TWD)
  const cashSellTwdPerVnd = Number(cols[12]?.trim());
  if (!Number.isFinite(cashSellTwdPerVnd) || cashSellTwdPerVnd <= 0) {
    return null;
  }

  return 1 / cashSellTwdPerVnd;
}

/**
 * Computes markup percentage compared against a reference mid-market rate.
 */
function calcMarkupPercent(appliedRate: number, referenceRate: number | null): number {
  if (!referenceRate || !Number.isFinite(referenceRate) || referenceRate <= 0) {
    return 0;
  }
  const diff = ((referenceRate - appliedRate) / referenceRate) * 100;
  return diff > 0 ? Number(diff.toFixed(2)) : 0;
}

async function fetchOpenErMidMarket(
  fetchImpl: typeof fetch
): Promise<{ krwToVnd: number; twdToVnd: number; updatedAt: number | null } | null> {
  try {
    const res = await fetchWithTimeout(fetchImpl, OPEN_ER_API_ENDPOINT, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: string;
      time_last_update_unix?: number;
      rates?: Record<string, number>;
    };
    if (data.result !== 'success' || !data.rates) return null;

    const vnd = Number(data.rates.VND);
    const krw = Number(data.rates.KRW);
    const twd = Number(data.rates.TWD);
    if (
      !Number.isFinite(vnd) ||
      vnd <= 0 ||
      !Number.isFinite(krw) ||
      krw <= 0 ||
      !Number.isFinite(twd) ||
      twd <= 0
    ) {
      return null;
    }

    const updatedAt =
      typeof data.time_last_update_unix === 'number' &&
      Number.isFinite(data.time_last_update_unix)
        ? data.time_last_update_unix * 1000
        : null;

    return {
      krwToVnd: vnd / krw,
      twdToVnd: vnd / twd,
      updatedAt,
    };
  } catch {
    return null;
  }
}

async function fetchMoneyBoxKrwRate(
  fetchImpl: typeof fetch
): Promise<{ rate: number; updatedAt: number | null } | null> {
  try {
    const manifestRes = await fetchWithTimeout(fetchImpl, HAOTOOL_CURRENT_ENDPOINT, {
      headers: { accept: 'application/json' },
    });
    if (!manifestRes.ok) return null;
    const manifest = (await manifestRes.json()) as {
      manifest?: { path?: string };
    };
    const relPath = manifest.manifest?.path;
    if (!relPath) return null;

    const relRes = await fetchWithTimeout(
      fetchImpl,
      `${HAOTOOL_BASE_URL}${relPath}`,
      { headers: { accept: 'application/json' } }
    );
    if (!relRes.ok) return null;
    const release = (await relRes.json()) as {
      providers?: Array<{
        providerId?: string;
        snapshot?: { path?: string };
      }>;
    };
    const moneybox = release.providers?.find((p) => p.providerId === 'moneybox');
    const snapPath = moneybox?.snapshot?.path;
    if (!snapPath) return null;

    const snapRes = await fetchWithTimeout(
      fetchImpl,
      `${HAOTOOL_BASE_URL}${snapPath}`,
      { headers: { accept: 'application/json' } }
    );
    if (!snapRes.ok) return null;
    const snap = (await snapRes.json()) as {
      quotes?: Array<{
        fromCurrency?: string;
        toCurrency?: string;
        status?: string;
        rate?: string | number | null;
        sourceQuote?: { sourcePublishedAt?: string };
      }>;
    };

    const q = snap.quotes?.find(
      (item) =>
        item.fromCurrency === 'KRW' &&
        item.toCurrency === 'VND' &&
        item.status === 'available'
    );
    if (!q) return null;

    const rate = Number(q.rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;

    const parsedMs =
      typeof q.sourceQuote?.sourcePublishedAt === 'string'
        ? Date.parse(q.sourceQuote.sourcePublishedAt)
        : NaN;

    return {
      rate,
      updatedAt: Number.isFinite(parsedMs) ? parsedMs : null,
    };
  } catch {
    return null;
  }
}

async function fetchVietcombankKrwRate(
  fetchImpl: typeof fetch
): Promise<{ transferRate: number; updatedAt: number | null } | null> {
  try {
    const res = await fetchWithTimeout(fetchImpl, VCB_XML_ENDPOINT, {
      headers: { accept: 'application/xml, text/xml, */*' },
    });
    if (!res.ok) return null;
    const xml = await res.text();
    return parseVietcombankXmlRate(xml, 'KRW');
  } catch {
    return null;
  }
}

async function fetchBankOfTaiwanTwdRate(
  fetchImpl: typeof fetch
): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(fetchImpl, BOT_CSV_ENDPOINT, {
      headers: { accept: 'text/csv, text/plain, */*' },
    });
    if (!res.ok) return null;
    const csv = await res.text();
    return parseBankOfTaiwanVndRate(csv);
  } catch {
    return null;
  }
}

async function handleKrwQuotes(
  sendAmount: number,
  fetchImpl: typeof fetch,
  nowMs: number
): Promise<Response> {
  const [midMarket, vcb, moneybox] = await Promise.all([
    fetchOpenErMidMarket(fetchImpl),
    fetchVietcombankKrwRate(fetchImpl),
    fetchMoneyBoxKrwRate(fetchImpl),
  ]);

  const refRate = midMarket?.krwToVnd ?? null;
  const quotes: LiveProviderQuote[] = [];

  if (vcb) {
    quotes.push({
      providerId: 'vietcombank-transfer',
      providerName: 'Vietcombank (Mua chuyển khoản)',
      providerType: 'bank',
      fee: 0,
      rate: vcb.transferRate,
      markupPercent: calcMarkupPercent(vcb.transferRate, refRate),
      receivedAmountVnd: Math.round(sendAmount * vcb.transferRate),
      collectedAt: vcb.updatedAt ?? nowMs,
      note: 'Tỷ giá mua chuyển khoản công khai của Vietcombank; chưa gồm phí chuyển tiền phía ngân hàng Hàn Quốc.',
    });
  }

  if (moneybox) {
    quotes.push({
      providerId: 'moneybox-seoul',
      providerName: 'MoneyBox (Quầy Seoul)',
      providerType: 'moneyTransferProvider',
      fee: 0,
      rate: moneybox.rate,
      markupPercent: calcMarkupPercent(moneybox.rate, refRate),
      receivedAmountVnd: Math.round(sendAmount * moneybox.rate),
      collectedAt: moneybox.updatedAt ?? nowMs,
      note: 'Tỷ giá đổi tiền mặt công khai tại quầy MoneyBox (Myeongdong, Seoul); không tính phí quầy.',
    });
  }

  if (refRate) {
    quotes.push({
      providerId: 'open-er-midmarket',
      providerName: 'Tham chiếu liên ngân hàng',
      providerType: 'reference',
      fee: 0,
      rate: refRate,
      markupPercent: 0,
      receivedAmountVnd: Math.round(sendAmount * refRate),
      collectedAt: midMarket?.updatedAt ?? nowMs,
      note: 'Mốc tỷ giá tham chiếu từ ExchangeRate-API (chưa trừ phí dịch vụ của app chuyển tiền).',
    });
  }

  if (quotes.length === 0) {
    return jsonResponse({ mode: 'unavailable', error: 'upstream_failed' }, 502);
  }

  quotes.sort((a, b) => b.receivedAmountVnd - a.receivedAmountVnd);

  const body: ApiQuotesLiveResponse = {
    mode: 'live_providers',
    sourceCurrency: 'KRW',
    sendAmount,
    sourceName: 'Vietcombank, MoneyBox Seoul & Open ER-API',
    sourceUrl: 'https://portal.vietcombank.com.vn',
    fetchedAt: nowMs,
    quotes,
  };

  return jsonResponse(body, 200, 'public, max-age=120');
}

async function handleTwdQuotes(
  sendAmount: number,
  fetchImpl: typeof fetch,
  nowMs: number
): Promise<Response> {
  const [midMarket, botRate] = await Promise.all([
    fetchOpenErMidMarket(fetchImpl),
    fetchBankOfTaiwanTwdRate(fetchImpl),
  ]);

  const refRate = midMarket?.twdToVnd ?? null;
  const quotes: LiveProviderQuote[] = [];

  if (botRate) {
    quotes.push({
      providerId: 'bank-of-taiwan',
      providerName: 'Ngân hàng Đài Loan (Đài Bắc)',
      providerType: 'bank',
      fee: 0,
      rate: botRate,
      markupPercent: calcMarkupPercent(botRate, refRate),
      receivedAmountVnd: Math.round(sendAmount * botRate),
      collectedAt: nowMs,
      note: 'Tỷ giá bán tiền mặt VND công khai tại quầy Bank of Taiwan (臺灣銀行 · Đài Bắc), phí quầy 0 TWD.',
    });
  }

  if (refRate) {
    quotes.push({
      providerId: 'open-er-midmarket',
      providerName: 'Tham chiếu liên ngân hàng',
      providerType: 'reference',
      fee: 0,
      rate: refRate,
      markupPercent: 0,
      receivedAmountVnd: Math.round(sendAmount * refRate),
      collectedAt: midMarket?.updatedAt ?? nowMs,
      note: 'Mốc tỷ giá tham chiếu từ ExchangeRate-API (chưa trừ phí dịch vụ khi chuyển qua app Đài Loan).',
    });
  }

  if (quotes.length === 0) {
    return jsonResponse({ mode: 'unavailable', error: 'upstream_failed' }, 502);
  }

  quotes.sort((a, b) => b.receivedAmountVnd - a.receivedAmountVnd);

  const body: ApiQuotesLiveResponse = {
    mode: 'live_providers',
    sourceCurrency: 'TWD',
    sendAmount,
    sourceName: 'Bank of Taiwan (Đài Bắc) & Open ER-API',
    sourceUrl: 'https://rate.bot.com.tw/xrt?Lang=zh-TW',
    fetchedAt: nowMs,
    quotes,
  };

  return jsonResponse(body, 200, 'public, max-age=120');
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

  if (
    sourceCurrency !== 'JPY' &&
    sourceCurrency !== 'KRW' &&
    sourceCurrency !== 'TWD'
  ) {
    return jsonResponse({ error: 'invalid_source_currency' }, 400);
  }

  if (!/^[1-9]\d{0,8}$/.test(sendAmountRaw)) {
    return jsonResponse({ error: 'invalid_send_amount' }, 400);
  }

  const sendAmount = Number(sendAmountRaw);

  if (sourceCurrency === 'KRW') {
    return handleKrwQuotes(sendAmount, fetchImpl, nowMs());
  }

  if (sourceCurrency === 'TWD') {
    return handleTwdQuotes(sendAmount, fetchImpl, nowMs());
  }

  try {
    const upstreamRes = await fetchWithTimeout(
      fetchImpl,
      buildWiseComparisonUrl(sendAmount),
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'GuiVe-MVP/1.0',
        },
      }
    );

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
