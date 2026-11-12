import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FxSnapshot } from '../domain/types';
import {
  AUTO_COOLDOWN_MS,
  FX_API_URL,
  FX_SNAPSHOT_STORAGE_KEY,
  FX_TIMEOUT_MS,
  MAX_AGE_MS,
  ensureSnapshotForCompare,
  getCachedSnapshot,
  isSnapshotExpired,
  isSnapshotStaleWarning,
  loadInitialSnapshot,
  refreshSnapshot,
  resetFxServiceForTests,
  validateOpenErApiResponse,
} from './index';

const BASE_TIME_MS = 1_760_000_000_000;

function makeApiPayload(overrides: Record<string, unknown> = {}) {
  const lastUpdateUnix = Math.floor((BASE_TIME_MS - 3_600_000) / 1000);
  const nextUpdateUnix = Math.floor((BASE_TIME_MS + 20 * 3_600_000) / 1000);
  return {
    result: 'success',
    base_code: 'USD',
    time_last_update_unix: lastUpdateUnix,
    time_next_update_unix: nextUpdateUnix,
    rates: {
      USD: 1,
      VND: 26400,
      JPY: 160,
      KRW: 1400,
      TWD: 32,
    },
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<FxSnapshot> = {}): FxSnapshot {
  return {
    baseCode: 'USD',
    rates: {
      VND: 26400,
      JPY: 160,
      KRW: 1400,
      TWD: 32,
    },
    sourceUpdatedAt: BASE_TIME_MS - 3_600_000,
    nextUpdateAt: BASE_TIME_MS + 20 * 3_600_000,
    fetchedAt: BASE_TIME_MS - 1_800_000,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fxService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME_MS);
    localStorage.clear();
    resetFxServiceForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    resetFxServiceForTests();
  });

  describe('L08: strict response validation & cache integrity', () => {
    it('parses a valid open.er-api.com response and converts unix seconds to ms', () => {
      const payload = makeApiPayload();
      const snapshot = validateOpenErApiResponse(payload, BASE_TIME_MS);
      expect(snapshot).toEqual({
        baseCode: 'USD',
        rates: {
          VND: 26400,
          JPY: 160,
          KRW: 1400,
          TWD: 32,
        },
        sourceUpdatedAt: payload.time_last_update_unix * 1000,
        nextUpdateAt: payload.time_next_update_unix * 1000,
        fetchedAt: BASE_TIME_MS,
      });
    });

    it.each([
      ['non-object payload', null],
      ['array payload', []],
      ['result !== success', makeApiPayload({ result: 'error' })],
      ['base_code !== USD', makeApiPayload({ base_code: 'EUR' })],
      [
        'missing JPY rate',
        makeApiPayload({ rates: { VND: 26400, KRW: 1400, TWD: 32 } }),
      ],
      [
        'negative VND rate',
        makeApiPayload({
          rates: { VND: -1, JPY: 160, KRW: 1400, TWD: 32 },
        }),
      ],
      [
        'zero KRW rate',
        makeApiPayload({
          rates: { VND: 26400, JPY: 160, KRW: 0, TWD: 32 },
        }),
      ],
      [
        'NaN TWD rate',
        makeApiPayload({
          rates: { VND: 26400, JPY: 160, KRW: 1400, TWD: Number.NaN },
        }),
      ],
      [
        'Infinity rate',
        makeApiPayload({
          rates: { VND: 26400, JPY: Infinity, KRW: 1400, TWD: 32 },
        }),
      ],
      [
        'string rate',
        makeApiPayload({
          rates: { VND: '26400', JPY: 160, KRW: 1400, TWD: 32 },
        }),
      ],
      [
        'negative time_last_update_unix',
        makeApiPayload({ time_last_update_unix: -10 }),
      ],
      [
        'zero time_next_update_unix',
        makeApiPayload({ time_next_update_unix: 0 }),
      ],
      [
        'missing time_next_update_unix',
        makeApiPayload({ time_next_update_unix: undefined }),
      ],
    ])('rejects invalid payload (%s)', (_label, badPayload) => {
      expect(validateOpenErApiResponse(badPayload, BASE_TIME_MS)).toBeNull();
    });

    it('never overwrites a valid cached snapshot with invalid API data and never fabricates mock rates', async () => {
      const validCached = makeSnapshot({
        sourceUpdatedAt: BASE_TIME_MS - 30 * 3_600_000,
        nextUpdateAt: BASE_TIME_MS - 60_000, // due for refresh
      });
      localStorage.setItem(
        FX_SNAPSHOT_STORAGE_KEY,
        JSON.stringify(validCached),
      );

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse(
            makeApiPayload({
              rates: { VND: 26400, JPY: -160, KRW: 1400, TWD: 32 },
            }),
          ),
        );
      vi.stubGlobal('fetch', fetchMock);

      const result = await loadInitialSnapshot();

      expect(result).toEqual({
        status: 'cachedFallback',
        snapshot: validCached,
        source: 'cache',
        staleWarning: true,
        error: 'invalid_data',
      });
      expect(getCachedSnapshot()).toEqual(validCached);

      // Now clear cache and verify no mock fallback rates are returned on error
      resetFxServiceForTests();
      fetchMock.mockResolvedValueOnce(
        new Response('not-json', { status: 200 }),
      );
      const unavailable = await loadInitialSnapshot();
      expect(unavailable).toEqual({
        status: 'unavailable',
        snapshot: null,
        source: 'none',
        staleWarning: false,
        error: 'invalid_data',
      });
    });

    it('ignores corrupted snapshot JSON already present in localStorage', async () => {
      localStorage.setItem(FX_SNAPSHOT_STORAGE_KEY, '{corrupt json');
      expect(getCachedSnapshot()).toBeNull();

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(makeApiPayload()));
      vi.stubGlobal('fetch', fetchMock);

      const result = await loadInitialSnapshot();
      expect(result.status).toBe('fresh');
      expect(result.source).toBe('network');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('U09: freshness, nextUpdateAt cache hit, and exact 48h boundary', () => {
    it('uses cached snapshot without network call when now < nextUpdateAt', async () => {
      const cached = makeSnapshot({
        sourceUpdatedAt: BASE_TIME_MS - 3_600_000,
        nextUpdateAt: BASE_TIME_MS + 3_600_000,
      });
      localStorage.setItem(FX_SNAPSHOT_STORAGE_KEY, JSON.stringify(cached));

      const fetchMock = vi.fn<typeof fetch>();
      vi.stubGlobal('fetch', fetchMock);

      const initResult = await loadInitialSnapshot();
      const compareResult = await ensureSnapshotForCompare();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(initResult).toEqual({
        status: 'fresh',
        snapshot: cached,
        source: 'cache',
        staleWarning: false,
        error: null,
      });
      expect(compareResult).toEqual(initResult);
      expect(isSnapshotExpired(cached, BASE_TIME_MS)).toBe(false);
      expect(isSnapshotStaleWarning(cached, BASE_TIME_MS)).toBe(false);
    });

    it('treats exact 48h age (age === MAX_AGE_MS) as usable and 48h + 1ms as expired', async () => {
      const sourceUpdatedAt = BASE_TIME_MS - MAX_AGE_MS;
      const snapshot = makeSnapshot({
        sourceUpdatedAt,
        nextUpdateAt: sourceUpdatedAt + 24 * 3_600_000,
      });

      expect(isSnapshotExpired(snapshot, BASE_TIME_MS)).toBe(false);
      expect(isSnapshotStaleWarning(snapshot, BASE_TIME_MS)).toBe(true);
      expect(isSnapshotExpired(snapshot, BASE_TIME_MS + 1)).toBe(true);
      expect(isSnapshotStaleWarning(snapshot, BASE_TIME_MS + 1)).toBe(false);

      localStorage.setItem(FX_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockRejectedValue(new TypeError('offline'));
      vi.stubGlobal('fetch', fetchMock);

      // At exact 48h: usable as cachedFallback
      const at48h = await ensureSnapshotForCompare();
      expect(at48h.status).toBe('cachedFallback');
      expect(at48h.staleWarning).toBe(true);
      expect(at48h.snapshot).toEqual(snapshot);

      // Advance 1ms past 48h: blocked as expired
      vi.advanceTimersByTime(1);
      const past48h = await ensureSnapshotForCompare();
      expect(past48h).toEqual({
        status: 'expired',
        snapshot,
        source: 'cache',
        staleWarning: false,
        error: 'expired',
      });
    });

    it('recovers from expired (>48h) cache when API returns a fresh snapshot', async () => {
      const expired = makeSnapshot({
        sourceUpdatedAt: BASE_TIME_MS - MAX_AGE_MS - 10_000,
        nextUpdateAt: BASE_TIME_MS - 24 * 3_600_000,
      });
      localStorage.setItem(FX_SNAPSHOT_STORAGE_KEY, JSON.stringify(expired));

      const freshPayload = makeApiPayload();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(freshPayload));
      vi.stubGlobal('fetch', fetchMock);

      const result = await ensureSnapshotForCompare();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('fresh');
      expect(result.source).toBe('network');
      expect(result.snapshot?.rates.VND).toBe(26400);
    });
  });

  describe('U06: in-flight request deduplication', () => {
    it('shares a single network fetch across concurrent callers', async () => {
      let resolveFetch!: (res: Response) => void;
      const pendingResponse = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockReturnValue(pendingResponse);
      vi.stubGlobal('fetch', fetchMock);

      const p1 = loadInitialSnapshot();
      const p2 = ensureSnapshotForCompare();
      const p3 = ensureSnapshotForCompare();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        FX_API_URL,
        expect.objectContaining({ method: 'GET' }),
      );

      resolveFetch(jsonResponse(makeApiPayload()));
      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      expect(r1.status).toBe('fresh');
      expect(r1.snapshot).toEqual(r2.snapshot);
      expect(r2.snapshot).toEqual(r3.snapshot);
    });
  });

  describe('U07: timeout (8000ms), offline errors, and HTTP 429 cooldown', () => {
    it('aborts request after 8000ms timeout and uses valid <=48h cache if available', async () => {
      const validCached = makeSnapshot({
        sourceUpdatedAt: BASE_TIME_MS - 25 * 3_600_000,
        nextUpdateAt: BASE_TIME_MS - 1_000,
      });
      localStorage.setItem(
        FX_SNAPSHOT_STORAGE_KEY,
        JSON.stringify(validCached),
      );

      const fetchMock = vi.fn<typeof fetch>((_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const promise = loadInitialSnapshot();
      await vi.advanceTimersByTimeAsync(FX_TIMEOUT_MS);
      const result = await promise;

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        status: 'cachedFallback',
        snapshot: validCached,
        source: 'cache',
        staleWarning: true,
        error: 'timeout',
      });
    });

    it('returns unavailable on timeout when no valid cache exists', async () => {
      const fetchMock = vi.fn<typeof fetch>((_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abortErr = new Error('Aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const promise = ensureSnapshotForCompare();
      await vi.advanceTimersByTimeAsync(FX_TIMEOUT_MS);
      const result = await promise;

      expect(result).toEqual({
        status: 'unavailable',
        snapshot: null,
        source: 'none',
        staleWarning: false,
        error: 'timeout',
      });
    });

    it('enforces 60-minute cooldown on HTTP 429 without automatic retries, then resumes after 60m', async () => {
      const validCached = makeSnapshot({
        sourceUpdatedAt: BASE_TIME_MS - 25 * 3_600_000,
        nextUpdateAt: BASE_TIME_MS - 1_000,
      });
      localStorage.setItem(
        FX_SNAPSHOT_STORAGE_KEY,
        JSON.stringify(validCached),
      );

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
        .mockResolvedValueOnce(jsonResponse(makeApiPayload()));
      vi.stubGlobal('fetch', fetchMock);

      // 1st call hits 429 -> returns valid <=48h cachedFallback
      const first = await loadInitialSnapshot();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(first).toEqual({
        status: 'cachedFallback',
        snapshot: validCached,
        source: 'cache',
        staleWarning: true,
        error: 'rate_limited',
      });

      // Within 60m: automatic calls must NOT hit network
      vi.advanceTimersByTime(AUTO_COOLDOWN_MS - 1);
      const duringCooldown = await ensureSnapshotForCompare();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(duringCooldown.status).toBe('cachedFallback');
      expect(duringCooldown.error).toBe('rate_limited');

      // After 60m: automatic refresh tries again and succeeds
      vi.advanceTimersByTime(1);
      const afterCooldown = await loadInitialSnapshot();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(afterCooldown.status).toBe('fresh');
      expect(afterCooldown.source).toBe('network');
    });

    it('returns rate_limited unavailable on HTTP 429 when no cache exists, and allows explicit manual refreshSnapshot', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
        .mockResolvedValueOnce(jsonResponse(makeApiPayload()));
      vi.stubGlobal('fetch', fetchMock);

      const first = await loadInitialSnapshot();
      expect(first).toEqual({
        status: 'unavailable',
        snapshot: null,
        source: 'none',
        staleWarning: false,
        error: 'rate_limited',
      });

      // Automatic compare within cooldown does not re-fetch
      const autoDuringCooldown = await ensureSnapshotForCompare();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(autoDuringCooldown.error).toBe('rate_limited');

      // Explicit user "Thử lại" action bypasses cooldown
      const manualRetry = await refreshSnapshot();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(manualRetry.status).toBe('fresh');
      expect(manualRetry.source).toBe('network');
    });

    it('throttles automatic background refreshes to at most once per 60 minutes on failure', async () => {
      const validCached = makeSnapshot({
        sourceUpdatedAt: BASE_TIME_MS - 25 * 3_600_000,
        nextUpdateAt: BASE_TIME_MS - 1_000,
      });
      localStorage.setItem(
        FX_SNAPSHOT_STORAGE_KEY,
        JSON.stringify(validCached),
      );

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('Server Error', { status: 503 }))
        .mockResolvedValueOnce(jsonResponse(makeApiPayload()));
      vi.stubGlobal('fetch', fetchMock);

      const first = await loadInitialSnapshot();
      expect(first.status).toBe('cachedFallback');
      expect(first.error).toBe('http_error');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(30 * 60_000);
      const second = await loadInitialSnapshot();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(second.status).toBe('cachedFallback');
      expect(second.error).toBe('cooldown');

      vi.advanceTimersByTime(30 * 60_000);
      const third = await loadInitialSnapshot();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(third.status).toBe('fresh');
    });
  });

  describe('U08: localStorage unavailable or throwing', () => {
    it('falls back seamlessly to in-memory session storage when localStorage getItem/setItem throw', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError');
      });

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(makeApiPayload()));
      vi.stubGlobal('fetch', fetchMock);

      const first = await loadInitialSnapshot();
      expect(first.status).toBe('fresh');
      expect(first.source).toBe('network');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Subsequent call reads from in-memory fallback without hitting network again
      const second = await ensureSnapshotForCompare();
      expect(second.status).toBe('fresh');
      expect(second.source).toBe('cache');
      expect(second.snapshot).toEqual(first.snapshot);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to in-memory session storage when setItem throws QuotaExceededError while getItem returns null', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(makeApiPayload()));
      vi.stubGlobal('fetch', fetchMock);

      const first = await loadInitialSnapshot();
      expect(first.status).toBe('fresh');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const second = await ensureSnapshotForCompare();
      expect(second.status).toBe('fresh');
      expect(second.source).toBe('cache');
      expect(second.snapshot).toEqual(first.snapshot);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
