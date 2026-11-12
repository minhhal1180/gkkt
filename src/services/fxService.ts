import type { FxSnapshot } from '../domain/types';
import {
  clearFxStorageForTests,
  isPlainObject,
  isPositiveFiniteNumber,
  readCooldownMeta,
  readStoredSnapshot,
  writeCooldownMeta,
  writeStoredSnapshot,
} from './fxStorage';

export const FX_API_URL = 'https://open.er-api.com/v6/latest/USD';
export const FX_TIMEOUT_MS = 8_000;
export const MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const AUTO_COOLDOWN_MS = 60 * 60 * 1000;

export const FX_PROVIDER_NAME = 'ExchangeRate-API (Open Access)';
export const FX_ATTRIBUTION_URL = 'https://www.exchangerate-api.com';

export type FxStateStatus =
  | 'fresh'
  | 'cachedFallback'
  | 'expired'
  | 'unavailable';

export type FxErrorKind =
  | 'network'
  | 'timeout'
  | 'rate_limited'
  | 'http_error'
  | 'invalid_data'
  | 'expired'
  | 'cooldown';

export interface FxServiceResult {
  status: FxStateStatus;
  snapshot: FxSnapshot | null;
  source: 'network' | 'cache' | 'none';
  staleWarning: boolean;
  error: FxErrorKind | null;
}

export interface FxServiceOptions {
  now?: () => number;
  fetchImpl?: typeof fetch;
}

type FetchOutcome =
  | { ok: true; snapshot: FxSnapshot }
  | { ok: false; error: Exclude<FxErrorKind, 'expired' | 'cooldown'> };

let inFlightFetch: Promise<FetchOutcome> | null = null;

/**
 * Returns true when the snapshot age exceeds 48 hours (strictly > MAX_AGE_MS).
 * Exactly 48 hours (age === MAX_AGE_MS) remains usable.
 */
export function isSnapshotExpired(
  snapshot: FxSnapshot,
  now: number = Date.now(),
): boolean {
  return now - snapshot.sourceUpdatedAt > MAX_AGE_MS;
}

/**
 * Returns true when the snapshot is still within 48 hours but past its
 * scheduled nextUpdateAt timestamp.
 */
export function isSnapshotStaleWarning(
  snapshot: FxSnapshot,
  now: number = Date.now(),
): boolean {
  return !isSnapshotExpired(snapshot, now) && now >= snapshot.nextUpdateAt;
}

/**
 * Validates the raw JSON payload from open.er-api.com and maps it into an FxSnapshot.
 * Returns null if any required field, currency rate, or timestamp is invalid.
 */
export function validateOpenErApiResponse(
  payload: unknown,
  fetchedAt: number,
): FxSnapshot | null {
  if (!isPlainObject(payload)) {
    return null;
  }
  if (payload.result !== 'success' || payload.base_code !== 'USD') {
    return null;
  }
  if (
    !isPositiveFiniteNumber(payload.time_last_update_unix) ||
    !isPositiveFiniteNumber(payload.time_next_update_unix) ||
    !isPositiveFiniteNumber(fetchedAt)
  ) {
    return null;
  }
  if (!isPlainObject(payload.rates)) {
    return null;
  }

  const rates = payload.rates;
  if (
    !isPositiveFiniteNumber(rates.VND) ||
    !isPositiveFiniteNumber(rates.JPY) ||
    !isPositiveFiniteNumber(rates.KRW) ||
    !isPositiveFiniteNumber(rates.TWD)
  ) {
    return null;
  }

  const sourceUpdatedAt = payload.time_last_update_unix * 1000;
  const nextUpdateAt = payload.time_next_update_unix * 1000;
  if (!Number.isFinite(sourceUpdatedAt) || !Number.isFinite(nextUpdateAt)) {
    return null;
  }

  return {
    baseCode: 'USD',
    rates: {
      VND: rates.VND,
      JPY: rates.JPY,
      KRW: rates.KRW,
      TWD: rates.TWD,
    },
    sourceUpdatedAt,
    nextUpdateAt,
    fetchedAt,
  };
}

async function fetchFromApi(
  nowFn: () => number,
  fetchImpl?: typeof fetch,
): Promise<FetchOutcome> {
  const fetcher = fetchImpl ?? globalThis.fetch;
  if (typeof fetcher !== 'function') {
    return { ok: false, error: 'network' };
  }

  const attemptTime = nowFn();
  const previousMeta = readCooldownMeta();
  const existingRateLimit =
    previousMeta.rateLimitedUntil !== null &&
    attemptTime < previousMeta.rateLimitedUntil
      ? previousMeta.rateLimitedUntil
      : null;

  writeCooldownMeta({
    lastAutoAttemptAt: attemptTime,
    rateLimitedUntil: existingRateLimit,
  });

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FX_TIMEOUT_MS);

  try {
    const response = await fetcher(FX_API_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (response.status === 429) {
      writeCooldownMeta({
        lastAutoAttemptAt: attemptTime,
        rateLimitedUntil: attemptTime + AUTO_COOLDOWN_MS,
      });
      return { ok: false, error: 'rate_limited' };
    }

    if (!response.ok) {
      return { ok: false, error: 'http_error' };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: 'invalid_data' };
    }

    const fetchedAt = nowFn();
    const snapshot = validateOpenErApiResponse(payload, fetchedAt);
    if (!snapshot) {
      return { ok: false, error: 'invalid_data' };
    }

    writeStoredSnapshot(snapshot);
    writeCooldownMeta({
      lastAutoAttemptAt: attemptTime,
      rateLimitedUntil: null,
    });
    return { ok: true, snapshot };
  } catch (err) {
    if (timedOut || (err instanceof Error && err.name === 'AbortError')) {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: 'network' };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function runDedupedFetch(options?: FxServiceOptions): Promise<FetchOutcome> {
  if (inFlightFetch) {
    return inFlightFetch;
  }

  const nowFn = options?.now ?? Date.now;
  inFlightFetch = fetchFromApi(nowFn, options?.fetchImpl).finally(() => {
    inFlightFetch = null;
  });
  return inFlightFetch;
}

function resolveFromCache(
  cached: FxSnapshot | null,
  now: number,
  fallbackError: FxErrorKind,
): FxServiceResult {
  if (cached && !isSnapshotExpired(cached, now)) {
    return {
      status: 'cachedFallback',
      snapshot: cached,
      source: 'cache',
      staleWarning: true,
      error: fallbackError,
    };
  }
  if (cached && isSnapshotExpired(cached, now)) {
    return {
      status: 'expired',
      snapshot: cached,
      source: 'cache',
      staleWarning: false,
      error: 'expired',
    };
  }
  return {
    status: 'unavailable',
    snapshot: null,
    source: 'none',
    staleWarning: false,
    error: fallbackError,
  };
}

function buildNetworkResult(
  outcome: FetchOutcome,
  now: number,
): FxServiceResult {
  if (outcome.ok) {
    if (isSnapshotExpired(outcome.snapshot, now)) {
      return {
        status: 'expired',
        snapshot: outcome.snapshot,
        source: 'network',
        staleWarning: false,
        error: 'expired',
      };
    }
    return {
      status: 'fresh',
      snapshot: outcome.snapshot,
      source: 'network',
      staleWarning: false,
      error: null,
    };
  }

  const cached = readStoredSnapshot();
  return resolveFromCache(cached, now, outcome.error);
}

function getCooldownState(now: number): {
  isRateLimited: boolean;
  isAutoCoolingDown: boolean;
} {
  const meta = readCooldownMeta();
  const isRateLimited =
    meta.rateLimitedUntil !== null && now < meta.rateLimitedUntil;
  const isAutoCoolingDown =
    meta.lastAutoAttemptAt !== null &&
    now - meta.lastAutoAttemptAt < AUTO_COOLDOWN_MS;
  return { isRateLimited, isAutoCoolingDown };
}

/**
 * Loads the initial FX snapshot (or checks for scheduled updates on focus/timer).
 * Uses cached snapshot without network when now < nextUpdateAt.
 * Enforces the 60-minute automatic refresh and HTTP 429 cooldowns.
 */
export async function loadInitialSnapshot(
  options?: FxServiceOptions,
): Promise<FxServiceResult> {
  const nowFn = options?.now ?? Date.now;
  const now = nowFn();
  const cached = readStoredSnapshot();

  if (cached && !isSnapshotExpired(cached, now) && now < cached.nextUpdateAt) {
    return {
      status: 'fresh',
      snapshot: cached,
      source: 'cache',
      staleWarning: false,
      error: null,
    };
  }

  const { isRateLimited, isAutoCoolingDown } = getCooldownState(now);
  if (!inFlightFetch && (isRateLimited || isAutoCoolingDown)) {
    return resolveFromCache(
      cached,
      now,
      isRateLimited ? 'rate_limited' : 'cooldown',
    );
  }

  const outcome = await runDedupedFetch(options);
  return buildNetworkResult(outcome, nowFn());
}

/**
 * Ensures a usable snapshot is available before running a comparison.
 * Shares in-flight requests, honors HTTP 429 cooldown, and falls back to
 * valid <=48h cached snapshots without exceeding 1 auto-refresh per 60 minutes.
 */
export async function ensureSnapshotForCompare(
  options?: FxServiceOptions,
): Promise<FxServiceResult> {
  const nowFn = options?.now ?? Date.now;
  const now = nowFn();
  const cached = readStoredSnapshot();

  if (cached && !isSnapshotExpired(cached, now) && now < cached.nextUpdateAt) {
    return {
      status: 'fresh',
      snapshot: cached,
      source: 'cache',
      staleWarning: false,
      error: null,
    };
  }

  const { isRateLimited, isAutoCoolingDown } = getCooldownState(now);

  if (cached && !isSnapshotExpired(cached, now)) {
    if (!inFlightFetch && (isRateLimited || isAutoCoolingDown)) {
      return resolveFromCache(
        cached,
        now,
        isRateLimited ? 'rate_limited' : 'cooldown',
      );
    }
    const outcome = await runDedupedFetch(options);
    return buildNetworkResult(outcome, nowFn());
  }

  if (!inFlightFetch && isRateLimited) {
    return resolveFromCache(cached, now, 'rate_limited');
  }

  const outcome = await runDedupedFetch(options);
  return buildNetworkResult(outcome, nowFn());
}

/**
 * Explicit user-triggered refresh ("Thử lại" / manual update).
 * Deduplicates concurrent requests while bypassing automatic cooldowns.
 */
export async function refreshSnapshot(
  options?: FxServiceOptions,
): Promise<FxServiceResult> {
  const nowFn = options?.now ?? Date.now;
  const outcome = await runDedupedFetch(options);
  return buildNetworkResult(outcome, nowFn());
}

/** Returns the currently stored valid snapshot, or null if absent/invalid. */
export function getCachedSnapshot(): FxSnapshot | null {
  return readStoredSnapshot();
}

/** Resets in-flight state and cached storage for isolated unit tests. */
export function resetFxServiceForTests(): void {
  inFlightFetch = null;
  clearFxStorageForTests();
}
