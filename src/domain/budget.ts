import { BUDGET_ERRORS, MAX_BUDGET } from './config';
import type { BudgetParseResult } from './types';

const PLAIN_DIGITS_RE = /^\d+$/;
const GROUPED_DIGITS_RE = /^[1-9]\d{0,2}([., ])\d{3}(?:\1\d{3})*$/;
const NEGATIVE_INT_RE = /^-\s*(?:\d+|[1-9]\d{0,2}(?:([., ])\d{3})+)$/;

/**
 * Parses and validates user budget input into a normalized integer string (1..999999999).
 * Accepts plain digits or consistent thousand-grouping using '.', ',', or space.
 */
export function parseBudgetInput(raw: string): BudgetParseResult {
  const trimmed = raw.trim().replace(/[\u00A0\u202F]/g, ' ');

  if (trimmed.length === 0) {
    return { ok: false, error: BUDGET_ERRORS.emptyOrNonPositive };
  }

  if (NEGATIVE_INT_RE.test(trimmed)) {
    return { ok: false, error: BUDGET_ERRORS.emptyOrNonPositive };
  }

  if (!PLAIN_DIGITS_RE.test(trimmed) && !GROUPED_DIGITS_RE.test(trimmed)) {
    return { ok: false, error: BUDGET_ERRORS.invalidFormat };
  }

  const digitsOnly = trimmed.replace(/[., ]/g, '');
  const normalized = digitsOnly.replace(/^0+/, '');

  if (normalized.length === 0) {
    return { ok: false, error: BUDGET_ERRORS.emptyOrNonPositive };
  }

  if (normalized.length > 9) {
    return { ok: false, error: BUDGET_ERRORS.exceedsMax };
  }

  const value = Number(normalized);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: BUDGET_ERRORS.emptyOrNonPositive };
  }

  if (value > MAX_BUDGET) {
    return { ok: false, error: BUDGET_ERRORS.exceedsMax };
  }

  return { ok: true, normalized, value };
}
