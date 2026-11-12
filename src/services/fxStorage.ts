import type { FxSnapshot, SourceCurrency } from '../domain/types';

export const FX_SNAPSHOT_STORAGE_KEY = 'guive_fx_snapshot_v1';
export const FX_META_STORAGE_KEY = 'guive_fx_meta_v1';

const REQUIRED_CURRENCIES: readonly (SourceCurrency | 'VND')[] = [
  'VND',
  'JPY',
  'KRW',
  'TWD',
];

export interface FxCooldownMeta {
  lastAutoAttemptAt: number | null;
  rateLimitedUntil: number | null;
}

const memoryFallback = new Map<string, string>();

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isValidFxSnapshot(value: unknown): value is FxSnapshot {
  if (!isPlainObject(value)) {
    return false;
  }
  if (value.baseCode !== 'USD') {
    return false;
  }
  if (
    !isPositiveFiniteNumber(value.sourceUpdatedAt) ||
    !isPositiveFiniteNumber(value.nextUpdateAt) ||
    !isPositiveFiniteNumber(value.fetchedAt)
  ) {
    return false;
  }
  if (!isPlainObject(value.rates)) {
    return false;
  }
  const rates = value.rates;
  return REQUIRED_CURRENCIES.every((code) => isPositiveFiniteNumber(rates[code]));
}

function getLocalStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage !== 'undefined'
      ? globalThis.localStorage
      : null;
  } catch {
    return null;
  }
}

function readRaw(key: string): string | null {
  const storage = getLocalStorage();
  if (storage) {
    try {
      const stored = storage.getItem(key);
      if (stored !== null) {
        return stored;
      }
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  }
  return memoryFallback.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      memoryFallback.delete(key);
      return;
    } catch {
      memoryFallback.set(key, value);
      return;
    }
  }
  memoryFallback.set(key, value);
}

function removeRaw(key: string): void {
  memoryFallback.delete(key);
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage removal failures when localStorage is unavailable.
    }
  }
}

export function readStoredSnapshot(): FxSnapshot | null {
  const raw = readRaw(FX_SNAPSHOT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidFxSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredSnapshot(snapshot: FxSnapshot): void {
  if (!isValidFxSnapshot(snapshot)) {
    return;
  }
  writeRaw(FX_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function readCooldownMeta(): FxCooldownMeta {
  const raw = readRaw(FX_META_STORAGE_KEY);
  if (!raw) {
    return { lastAutoAttemptAt: null, rateLimitedUntil: null };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      return { lastAutoAttemptAt: null, rateLimitedUntil: null };
    }
    return {
      lastAutoAttemptAt: isPositiveFiniteNumber(parsed.lastAutoAttemptAt)
        ? parsed.lastAutoAttemptAt
        : null,
      rateLimitedUntil: isPositiveFiniteNumber(parsed.rateLimitedUntil)
        ? parsed.rateLimitedUntil
        : null,
    };
  } catch {
    return { lastAutoAttemptAt: null, rateLimitedUntil: null };
  }
}

export function writeCooldownMeta(meta: FxCooldownMeta): void {
  writeRaw(FX_META_STORAGE_KEY, JSON.stringify(meta));
}

export function clearFxStorageForTests(): void {
  removeRaw(FX_SNAPSHOT_STORAGE_KEY);
  removeRaw(FX_META_STORAGE_KEY);
}
