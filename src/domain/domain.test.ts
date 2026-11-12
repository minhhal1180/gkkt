import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  BUDGET_ERRORS,
  CHANNELS,
  COUNTRIES,
  compare,
  formatDateTimeVn,
  formatDateVn,
  formatIntegerVi,
  formatMarginPercent,
  formatRate,
  formatSourceAmount,
  formatVnd,
  parseBudgetInput,
} from './index';
import type { ChannelConfig, FxSnapshot } from './types';

const BASE_SNAPSHOT: FxSnapshot = {
  baseCode: 'USD',
  rates: {
    VND: 26400,
    JPY: 160,
    KRW: 1400,
    TWD: 32,
  },
  sourceUpdatedAt: Date.UTC(2026, 10, 12, 0, 0, 0),
  nextUpdateAt: Date.UTC(2026, 10, 13, 0, 0, 0),
  fetchedAt: Date.UTC(2026, 10, 12, 1, 0, 0),
};

describe('domain configs', () => {
  it('defines expected country defaults and presets', () => {
    expect(COUNTRIES.JPY).toEqual({
      currency: 'JPY',
      countryName: 'Nhật Bản',
      defaultBudget: '100000',
      presets: ['50000', '100000', '200000'],
    });
    expect(COUNTRIES.KRW).toEqual({
      currency: 'KRW',
      countryName: 'Hàn Quốc',
      defaultBudget: '1000000',
      presets: ['500000', '1000000', '2000000'],
    });
    expect(COUNTRIES.TWD).toEqual({
      currency: 'TWD',
      countryName: 'Đài Loan',
      defaultBudget: '20000',
      presets: ['10000', '20000', '50000'],
    });
  });

  it('defines expected channel fees and margins', () => {
    const byId = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));
    expect(byId.A.fixedFee).toEqual({ JPY: 400, KRW: 4000, TWD: 100 });
    expect(byId.A.margin).toBe(0.015);
    expect(byId.B.fixedFee).toEqual({ JPY: 800, KRW: 8000, TWD: 200 });
    expect(byId.B.margin).toBe(0.005);
    expect(byId.C.fixedFee).toEqual({ JPY: 0, KRW: 0, TWD: 0 });
    expect(byId.C.margin).toBe(0.025);
  });
});

describe('parseBudgetInput (U04-U05)', () => {
  it('accepts plain digits and consistent thousand separators (U04)', () => {
    expect(parseBudgetInput('100000')).toEqual({
      ok: true,
      normalized: '100000',
      value: 100000,
    });
    expect(parseBudgetInput('100.000')).toEqual({
      ok: true,
      normalized: '100000',
      value: 100000,
    });
    expect(parseBudgetInput('100,000')).toEqual({
      ok: true,
      normalized: '100000',
      value: 100000,
    });
    expect(parseBudgetInput('100 000')).toEqual({
      ok: true,
      normalized: '100000',
      value: 100000,
    });
    expect(parseBudgetInput('1\u00A0000\u00A0000')).toEqual({
      ok: true,
      normalized: '1000000',
      value: 1000000,
    });
    expect(parseBudgetInput('  999.999.999  ')).toEqual({
      ok: true,
      normalized: '999999999',
      value: 999999999,
    });
    expect(parseBudgetInput('1')).toEqual({
      ok: true,
      normalized: '1',
      value: 1,
    });
  });

  it('rejects empty, zero, and negative inputs (U05)', () => {
    for (const raw of ['', '   ', '0', '000', '-100', '-100.000', '-0']) {
      expect(parseBudgetInput(raw)).toEqual({
        ok: false,
        error: BUDGET_ERRORS.emptyOrNonPositive,
      });
    }
  });

  it('rejects decimals, scientific notation, letters, and inconsistent separators (U05)', () => {
    for (const raw of [
      '100.50',
      '100,50',
      '0.500',
      '0,500',
      '1e5',
      '1E5',
      'abc',
      '100abc',
      '1.000,000',
      '1000.000',
      '100.00',
      '+100000',
      '100..000',
    ]) {
      expect(parseBudgetInput(raw)).toEqual({
        ok: false,
        error: BUDGET_ERRORS.invalidFormat,
      });
    }
  });

  it('rejects values above 999999999', () => {
    for (const raw of ['1000000000', '1.000.000.000', '99999999999999999999']) {
      expect(parseBudgetInput(raw)).toEqual({
        ok: false,
        error: BUDGET_ERRORS.exceedsMax,
      });
    }
  });
});

describe('compare (L01-L07)', () => {
  it('L01: matches Japan fixture 100.000 JPY at R=165', () => {
    const results = compare(
      { sourceCurrency: 'JPY', budget: '100000' },
      BASE_SNAPSHOT
    );

    expect(results.map((r) => r.channelId)).toEqual(['B', 'A', 'C']);

    expect(results[0]).toMatchObject({
      channelId: 'B',
      channelName: 'Kênh B',
      dataKind: 'illustrative',
      status: 'valid',
      budget: 100000,
      fixedFee: 800,
      convertedAmount: 99200,
      referenceRate: 165,
      margin: 0.005,
      appliedRate: 164.175,
      receiveFee: 0,
      estimatedReceiveVnd: 16286160,
      diffFromBestVnd: 0,
      isTopRank: true,
      isTiedTop: false,
    });

    expect(results[1]).toMatchObject({
      channelId: 'A',
      status: 'valid',
      fixedFee: 400,
      convertedAmount: 99600,
      appliedRate: 162.525,
      estimatedReceiveVnd: 16187490,
      diffFromBestVnd: 98670,
      isTopRank: false,
      isTiedTop: false,
    });

    expect(results[2]).toMatchObject({
      channelId: 'C',
      status: 'valid',
      fixedFee: 0,
      convertedAmount: 100000,
      appliedRate: 160.875,
      estimatedReceiveVnd: 16087500,
      diffFromBestVnd: 198660,
      isTopRank: false,
      isTiedTop: false,
    });
  });

  it('L02: computes cross-rate VND/source without inversion', () => {
    const results = compare(
      { sourceCurrency: 'JPY', budget: '100000' },
      BASE_SNAPSHOT
    );
    expect(results[0].referenceRate).toBe(165);
  });

  it('L03: uses correct rates[sourceCurrency] and fixedFee for all three currencies', () => {
    const jpy = compare({ sourceCurrency: 'JPY', budget: '100000' }, BASE_SNAPSHOT);
    const krw = compare({ sourceCurrency: 'KRW', budget: '1000000' }, BASE_SNAPSHOT);
    const twd = compare({ sourceCurrency: 'TWD', budget: '20000' }, BASE_SNAPSHOT);

    expect(jpy[0].referenceRate).toBeCloseTo(26400 / 160, 12);
    expect(krw[0].referenceRate).toBeCloseTo(26400 / 1400, 12);
    expect(twd[0].referenceRate).toBeCloseTo(26400 / 32, 12);

    expect(krw.find((r) => r.channelId === 'A')?.fixedFee).toBe(4000);
    expect(twd.find((r) => r.channelId === 'B')?.fixedFee).toBe(200);
  });

  it('L04: marks channels with budget <= fixedFee as insufficient_budget after valid channels', () => {
    const results = compare(
      { sourceCurrency: 'JPY', budget: '400' },
      BASE_SNAPSHOT
    );

    expect(results.map((r) => r.channelId)).toEqual(['C', 'A', 'B']);

    // Only 1 valid channel -> isTopRank must be false
    expect(results[0]).toMatchObject({
      channelId: 'C',
      status: 'valid',
      convertedAmount: 400,
      estimatedReceiveVnd: 64350,
      diffFromBestVnd: 0,
      isTopRank: false,
      isTiedTop: false,
    });

    // A has budget === fixedFee (400), B has budget < fixedFee (800)
    for (const bad of [results[1], results[2]]) {
      expect(bad.status).toBe('insufficient_budget');
      expect(bad.convertedAmount).toBeNull();
      expect(bad.estimatedReceiveVnd).toBeNull();
      expect(bad.diffFromBestVnd).toBeNull();
      expect(bad.isTopRank).toBe(false);
      expect(bad.isTiedTop).toBe(false);
    }
  });

  it('L04b: handles case where all channels have insufficient budget', () => {
    const customChannels: ChannelConfig[] = [
      { id: 'B', name: 'Kênh B', fixedFee: { JPY: 500, KRW: 500, TWD: 500 }, margin: 0.01, dataKind: 'illustrative' },
      { id: 'A', name: 'Kênh A', fixedFee: { JPY: 500, KRW: 500, TWD: 500 }, margin: 0.02, dataKind: 'illustrative' },
    ];
    const results = compare(
      { sourceCurrency: 'JPY', budget: '500' },
      BASE_SNAPSHOT,
      customChannels
    );
    expect(results.map((r) => r.channelId)).toEqual(['A', 'B']);
    expect(results.every((r) => r.status === 'insufficient_budget')).toBe(true);
    expect(results.every((r) => !r.isTopRank && !r.isTiedTop)).toBe(true);
  });

  it('L05: marks tied top channels with isTiedTop and sorts deterministically by channelId', () => {
    const tiedChannels: ChannelConfig[] = [
      { id: 'C', name: 'Kênh C', fixedFee: { JPY: 0, KRW: 0, TWD: 0 }, margin: 0.02, dataKind: 'illustrative' },
      { id: 'B', name: 'Kênh B', fixedFee: { JPY: 0, KRW: 0, TWD: 0 }, margin: 0.01, dataKind: 'illustrative' },
      { id: 'A', name: 'Kênh A', fixedFee: { JPY: 0, KRW: 0, TWD: 0 }, margin: 0.01, dataKind: 'illustrative' },
    ];

    const results = compare(
      { sourceCurrency: 'JPY', budget: '10000' },
      BASE_SNAPSHOT,
      tiedChannels
    );

    expect(results.map((r) => r.channelId)).toEqual(['A', 'B', 'C']);
    expect(results[0]).toMatchObject({
      channelId: 'A',
      isTopRank: true,
      isTiedTop: true,
      diffFromBestVnd: 0,
    });
    expect(results[1]).toMatchObject({
      channelId: 'B',
      isTopRank: true,
      isTiedTop: true,
      diffFromBestVnd: 0,
    });
    expect(results[2]).toMatchObject({
      channelId: 'C',
      isTopRank: false,
      isTiedTop: false,
    });
    expect(results[2].diffFromBestVnd).toBe(
      (results[0].estimatedReceiveVnd ?? 0) - (results[2].estimatedReceiveVnd ?? 0)
    );
  });

  it('L06: rounds x.5 VND with ROUND_HALF_UP (not half-to-even) once at the end', () => {
    const halfUpSnapshot: FxSnapshot = {
      ...BASE_SNAPSHOT,
      rates: {
        VND: 2001,
        JPY: 2, // R = 1000.5
        KRW: 1,
        TWD: 1,
      },
    };
    const zeroFeeChannel: ChannelConfig[] = [
      {
        id: 'A',
        name: 'Kênh A',
        fixedFee: { JPY: 0, KRW: 0, TWD: 0 },
        margin: 0,
        dataKind: 'illustrative',
      },
    ];
    // 1 * 1000.5 = 1000.5 -> ROUND_HALF_UP gives 1001 (banker's rounding would give 1000)
    const evenHalf = compare(
      { sourceCurrency: 'JPY', budget: '1' },
      halfUpSnapshot,
      zeroFeeChannel
    );
    expect(evenHalf[0].estimatedReceiveVnd).toBe(1001);

    // 3 * 1000.5 = 3001.5 -> 3002
    const oddHalf = compare(
      { sourceCurrency: 'JPY', budget: '3' },
      halfUpSnapshot,
      zeroFeeChannel
    );
    expect(oddHalf[0].estimatedReceiveVnd).toBe(3002);
  });

  it('L07: keeps full precision for repeating cross-rates without premature rounding', () => {
    const repeatingSnapshot: FxSnapshot = {
      ...BASE_SNAPSHOT,
      rates: {
        VND: 25345,
        JPY: 137, // 25345 / 137 = 185.000000... wait let's pick non-terminating
        KRW: 139, // 25345 / 139 = 182.338129496402877...
        TWD: 31,
      },
    };
    const results = compare(
      { sourceCurrency: 'KRW', budget: '999999999' },
      repeatingSnapshot
    );

    const byId = Object.fromEntries(results.map((r) => [r.channelId, r]));
    const fullR = new Decimal(25345).div(139);
    const expectedB = new Decimal(999999999 - 8000)
      .mul(fullR.mul(new Decimal(1).minus(0.005)))
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();

    // If R had been prematurely rounded to 6 decimals (182.338129), result would differ on 999,999,999 KRW
    const roundedR6 = fullR.toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
    const wrongB = new Decimal(999999999 - 8000)
      .mul(roundedR6.mul(new Decimal(1).minus(0.005)))
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();

    expect(expectedB).not.toBe(wrongB);
    expect(byId.B.estimatedReceiveVnd).toBe(expectedB);
  });

  it('throws on invalid budget or invalid snapshot rates', () => {
    expect(() =>
      compare({ sourceCurrency: 'JPY', budget: '0' }, BASE_SNAPSHOT)
    ).toThrow();
    expect(() =>
      compare(
        { sourceCurrency: 'JPY', budget: '100000' },
        { ...BASE_SNAPSHOT, rates: { ...BASE_SNAPSHOT.rates, JPY: 0 } }
      )
    ).toThrow();
  });
});

describe('format helpers', () => {
  it('formats vi-VN integers, VND, source amounts, rates, and margins', () => {
    expect(formatIntegerVi(100000)).toBe('100.000');
    expect(formatIntegerVi('16286160')).toBe('16.286.160');
    expect(formatVnd(16286160)).toBe('16.286.160 ₫');
    expect(formatSourceAmount(800, 'JPY')).toBe('800 JPY');
    expect(formatRate(164.175)).toBe('164,175');
    expect(formatRate(165)).toBe('165');
    expect(formatRate(182.3381294964, 6)).toBe('182,338129');
    expect(formatMarginPercent(0.015)).toBe('1,5%');
    expect(formatMarginPercent(0.005)).toBe('0,5%');
    expect(formatMarginPercent(0.025)).toBe('2,5%');
  });

  it('formats dates and datetimes in Asia/Ho_Chi_Minh timezone', () => {
    // 2026-11-12T18:30:00Z -> 2026-11-13 01:30 in UTC+7
    const utcMs = Date.UTC(2026, 10, 12, 18, 30, 0);
    expect(formatDateVn(utcMs)).toBe('13/11/2026');
    expect(formatDateTimeVn(utcMs)).toBe('13/11/2026 01:30');

    // Midnight UTC -> 07:00 in UTC+7
    const midnightUtc = Date.UTC(2026, 0, 5, 0, 0, 0);
    expect(formatDateVn(midnightUtc)).toBe('05/01/2026');
    expect(formatDateTimeVn(midnightUtc)).toBe('05/01/2026 07:00');
  });
});
