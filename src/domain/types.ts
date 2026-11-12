export type SourceCurrency = 'JPY' | 'KRW' | 'TWD';

export type ChannelId = 'A' | 'B' | 'C';

export type QuoteStatus = 'valid' | 'insufficient_budget';

/** Exchange-rate snapshot anchored on USD with epoch-millisecond timestamps. */
export interface FxSnapshot {
  baseCode: 'USD';
  rates: Record<SourceCurrency | 'VND', number>;
  sourceUpdatedAt: number;
  nextUpdateAt: number;
  fetchedAt: number;
}

/** Illustrative remittance channel configuration. */
export interface ChannelConfig {
  id: ChannelId;
  name: string;
  fixedFee: Record<SourceCurrency, number>;
  margin: number;
  dataKind: 'illustrative';
}

export interface CountryConfig {
  currency: SourceCurrency;
  countryName: string;
  defaultBudget: string;
  presets: readonly [string, string, string];
}

export interface CompareInput {
  sourceCurrency: SourceCurrency;
  budget: string;
}

export type QuoteDataKind = 'illustrative' | 'live_provider';

export interface ComparisonResult {
  channelId: string;
  channelName: string;
  dataKind: QuoteDataKind;
  status: QuoteStatus;
  budget: number;
  fixedFee: number;
  convertedAmount: number | null;
  referenceRate: number;
  margin: number;
  appliedRate: number;
  receiveFee: 0;
  estimatedReceiveVnd: number | null;
  diffFromBestVnd: number | null;
  isTopRank: boolean;
  isTiedTop: boolean;
  collectedAt?: number | null;
}

export type BudgetParseResult =
  | { ok: true; normalized: string; value: number }
  | { ok: false; error: string };
