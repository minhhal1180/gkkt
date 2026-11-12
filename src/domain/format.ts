import type { SourceCurrency } from './types';

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

const integerFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
});

const datePartsFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: VIETNAM_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimePartsFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: VIETNAM_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function getPart(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

/** Formats a number using vi-VN locale options. */
export function formatNumberVi(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('vi-VN', options).format(value);
}

/** Formats an integer (or numeric string) with vi-VN thousand separators (dots). */
export function formatIntegerVi(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return '';
  return integerFormatter.format(Math.trunc(num));
}

/** Formats VND amount for display, e.g. "16.286.160 ₫". */
export function formatVnd(amount: number): string {
  return `${formatIntegerVi(amount)} ₫`;
}

/** Formats source currency amount, e.g. "100.000 JPY". */
export function formatSourceAmount(
  amount: number | string,
  currency: SourceCurrency
): string {
  return `${formatIntegerVi(amount)} ${currency}`;
}

/** Formats exchange rate with up to 6 fractional digits in vi-VN locale. */
export function formatRate(rate: number, maxDecimals = 6): string {
  return formatNumberVi(rate, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/** Formats decimal margin as Vietnamese percentage, e.g. 0.015 -> "1,5%". */
export function formatMarginPercent(margin: number): string {
  const percentValue = Math.round(margin * 10000) / 100;
  return `${formatNumberVi(percentValue, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

/** Formats an epoch-ms timestamp as DD/MM/YYYY in Asia/Ho_Chi_Minh timezone. */
export function formatDateVn(epochMs: number): string {
  const parts = datePartsFormatter.formatToParts(new Date(epochMs));
  const day = getPart(parts, 'day');
  const month = getPart(parts, 'month');
  const year = getPart(parts, 'year');
  return `${day}/${month}/${year}`;
}

/** Formats an epoch-ms timestamp as DD/MM/YYYY HH:mm in Asia/Ho_Chi_Minh timezone. */
export function formatDateTimeVn(epochMs: number): string {
  const parts = dateTimePartsFormatter.formatToParts(new Date(epochMs));
  const day = getPart(parts, 'day');
  const month = getPart(parts, 'month');
  const year = getPart(parts, 'year');
  const hour = getPart(parts, 'hour');
  const minute = getPart(parts, 'minute');
  return `${day}/${month}/${year} ${hour}:${minute}`;
}
