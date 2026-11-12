import type { ChannelConfig, CountryConfig, SourceCurrency } from './types';

export const MAX_BUDGET = 999_999_999;

export const BUDGET_ERRORS = {
  emptyOrNonPositive: 'Nhập số tiền lớn hơn 0.',
  invalidFormat: 'Nhập số nguyên, ví dụ 100.000.',
  exceedsMax: 'Nhập tối đa 999.999.999.',
} as const;

export const SOURCE_CURRENCIES: readonly SourceCurrency[] = ['JPY', 'KRW', 'TWD'];

export const COUNTRIES: Record<SourceCurrency, CountryConfig> = {
  JPY: {
    currency: 'JPY',
    countryName: 'Nhật Bản',
    defaultBudget: '100000',
    presets: ['50000', '100000', '200000'],
  },
  KRW: {
    currency: 'KRW',
    countryName: 'Hàn Quốc',
    defaultBudget: '1000000',
    presets: ['500000', '1000000', '2000000'],
  },
  TWD: {
    currency: 'TWD',
    countryName: 'Đài Loan',
    defaultBudget: '20000',
    presets: ['10000', '20000', '50000'],
  },
};

export const COUNTRY_LIST: readonly CountryConfig[] = SOURCE_CURRENCIES.map(
  (currency) => COUNTRIES[currency]
);

export const CHANNELS: readonly ChannelConfig[] = [
  {
    id: 'A',
    name: 'Kênh A',
    fixedFee: { JPY: 400, KRW: 4000, TWD: 100 },
    margin: 0.015,
    dataKind: 'illustrative',
  },
  {
    id: 'B',
    name: 'Kênh B',
    fixedFee: { JPY: 800, KRW: 8000, TWD: 200 },
    margin: 0.005,
    dataKind: 'illustrative',
  },
  {
    id: 'C',
    name: 'Kênh C',
    fixedFee: { JPY: 0, KRW: 0, TWD: 0 },
    margin: 0.025,
    dataKind: 'illustrative',
  },
];
