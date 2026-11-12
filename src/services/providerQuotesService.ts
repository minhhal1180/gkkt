import type { ComparisonResult, SourceCurrency } from '../domain/types';

export interface LiveProviderQuoteDto {
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

export interface LiveQuotesFetchResult {
  kind: 'live_provider';
  results: ComparisonResult[];
  sourceName: string;
  sourceUrl: string;
  fetchedAt: number;
}

export interface FallbackQuotesResult {
  kind: 'fallback_illustrative';
  hadLiveError: boolean;
}

export type ProviderQuotesFetchResult =
  | LiveQuotesFetchResult
  | FallbackQuotesResult;

const WORKER_QUOTES_TIMEOUT_MS = 7500;

function isValidQuoteDto(item: unknown): item is LiveProviderQuoteDto {
  if (!item || typeof item !== 'object') return false;
  const q = item as Record<string, unknown>;
  return (
    typeof q.providerId === 'string' &&
    q.providerId.length > 0 &&
    typeof q.providerName === 'string' &&
    q.providerName.length > 0 &&
    typeof q.fee === 'number' &&
    Number.isFinite(q.fee) &&
    q.fee >= 0 &&
    typeof q.rate === 'number' &&
    Number.isFinite(q.rate) &&
    q.rate > 0 &&
    typeof q.markupPercent === 'number' &&
    Number.isFinite(q.markupPercent) &&
    q.markupPercent >= 0 &&
    typeof q.receivedAmountVnd === 'number' &&
    Number.isFinite(q.receivedAmountVnd) &&
    q.receivedAmountVnd > 0
  );
}

export function mapLiveQuotesToComparisonResults(
  quotes: LiveProviderQuoteDto[],
  sendAmount: number
): ComparisonResult[] {
  const sorted = [...quotes].sort((a, b) => {
    if (b.receivedAmountVnd !== a.receivedAmountVnd) {
      return b.receivedAmountVnd - a.receivedAmountVnd;
    }
    return a.providerName.localeCompare(b.providerName, 'en');
  });

  const bestVnd = sorted.length > 0 ? sorted[0].receivedAmountVnd : null;
  const topCount =
    bestVnd !== null
      ? sorted.filter((q) => q.receivedAmountVnd === bestVnd).length
      : 0;
  const canHighlightTop = sorted.length >= 2 && bestVnd !== null;

  return sorted.map((q) => {
    const isBest = bestVnd !== null && q.receivedAmountVnd === bestVnd;
    const marginDecimal = q.markupPercent / 100;
    const referenceRate =
      marginDecimal < 1 ? q.rate / (1 - marginDecimal) : q.rate;

    return {
      channelId: q.providerId,
      channelName: q.providerName,
      dataKind: 'live_provider',
      status: 'valid',
      budget: sendAmount,
      fixedFee: q.fee,
      convertedAmount: Math.max(0, sendAmount - q.fee),
      referenceRate,
      margin: marginDecimal,
      appliedRate: q.rate,
      receiveFee: 0,
      estimatedReceiveVnd: q.receivedAmountVnd,
      diffFromBestVnd: bestVnd !== null ? bestVnd - q.receivedAmountVnd : null,
      isTopRank: canHighlightTop && isBest && topCount === 1,
      isTiedTop: canHighlightTop && isBest && topCount > 1,
      collectedAt: q.collectedAt,
      providerNote: typeof q.note === 'string' ? q.note : null,
    };
  });
}

/**
 * Fetches live provider/institution quotes from the Cloudflare Worker `/api/quotes`
 * for JPY (Wise Comparison API), KRW (Vietcombank, MoneyBox, Open ER-API),
 * and TWD (Bank of Taiwan Taipei & Open ER-API).
 */
export async function fetchProviderQuotes(
  sourceCurrency: SourceCurrency,
  sendAmount: number,
  fetchImpl: typeof fetch = fetch
): Promise<ProviderQuotesFetchResult> {
  const controller = new AbortController();
  const timerId = globalThis.setTimeout(
    () => controller.abort(),
    WORKER_QUOTES_TIMEOUT_MS
  );

  try {
    const url = `/api/quotes?sourceCurrency=${encodeURIComponent(
      sourceCurrency
    )}&sendAmount=${encodeURIComponent(String(sendAmount))}`;

    const res = await fetchImpl(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { kind: 'fallback_illustrative', hadLiveError: true };
    }

    const payload = (await res.json()) as Record<string, unknown>;
    if (
      payload.mode !== 'live_providers' ||
      !Array.isArray(payload.quotes)
    ) {
      return { kind: 'fallback_illustrative', hadLiveError: true };
    }

    const validQuotes = payload.quotes.filter(isValidQuoteDto);
    if (validQuotes.length === 0) {
      return { kind: 'fallback_illustrative', hadLiveError: true };
    }

    return {
      kind: 'live_provider',
      results: mapLiveQuotesToComparisonResults(validQuotes, sendAmount),
      sourceName:
        typeof payload.sourceName === 'string'
          ? payload.sourceName
          : 'Wise Public Comparison API v4',
      sourceUrl:
        typeof payload.sourceUrl === 'string'
          ? payload.sourceUrl
          : 'https://wise.com/gb/compare/',
      fetchedAt:
        typeof payload.fetchedAt === 'number' &&
        Number.isFinite(payload.fetchedAt)
          ? payload.fetchedAt
          : Date.now(),
    };
  } catch {
    return { kind: 'fallback_illustrative', hadLiveError: true };
  } finally {
    globalThis.clearTimeout(timerId);
  }
}
