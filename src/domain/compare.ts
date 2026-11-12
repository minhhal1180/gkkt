import Decimal from 'decimal.js';
import { parseBudgetInput } from './budget';
import { CHANNELS } from './config';
import type {
  ChannelConfig,
  CompareInput,
  ComparisonResult,
  FxSnapshot,
} from './types';

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${label}: expected positive finite number.`);
  }
}

/**
 * Pure comparison calculation using decimal.js without intermediate rounding.
 * Rounds only the final estimated VND output once with ROUND_HALF_UP.
 */
export function compare(
  input: CompareInput,
  snapshot: FxSnapshot,
  channels: readonly ChannelConfig[] = CHANNELS
): ComparisonResult[] {
  const parsed = parseBudgetInput(input.budget);
  if (!parsed.ok) {
    throw new Error(`Invalid budget input: ${parsed.error}`);
  }

  const vndRateRaw = snapshot.rates.VND;
  const sourceRateRaw = snapshot.rates[input.sourceCurrency];
  assertPositiveFinite(vndRateRaw, 'rates.VND');
  assertPositiveFinite(sourceRateRaw, `rates.${input.sourceCurrency}`);

  const budgetDecimal = new Decimal(parsed.normalized);
  const referenceRateDecimal = new Decimal(vndRateRaw).div(sourceRateRaw);
  const referenceRate = referenceRateDecimal.toNumber();

  const rawResults: ComparisonResult[] = channels.map((channel) => {
    const fixedFee = channel.fixedFee[input.sourceCurrency];
    const appliedRateDecimal = referenceRateDecimal.mul(
      new Decimal(1).minus(channel.margin)
    );
    const appliedRate = appliedRateDecimal.toNumber();

    if (budgetDecimal.lte(fixedFee)) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        dataKind: channel.dataKind,
        status: 'insufficient_budget',
        budget: parsed.value,
        fixedFee,
        convertedAmount: null,
        referenceRate,
        margin: channel.margin,
        appliedRate,
        receiveFee: 0,
        estimatedReceiveVnd: null,
        diffFromBestVnd: null,
        isTopRank: false,
        isTiedTop: false,
      };
    }

    const convertedDecimal = budgetDecimal.minus(fixedFee);
    const estimatedReceiveVnd = convertedDecimal
      .mul(appliedRateDecimal)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();

    return {
      channelId: channel.id,
      channelName: channel.name,
      dataKind: channel.dataKind,
      status: 'valid',
      budget: parsed.value,
      fixedFee,
      convertedAmount: convertedDecimal.toNumber(),
      referenceRate,
      margin: channel.margin,
      appliedRate,
      receiveFee: 0,
      estimatedReceiveVnd,
      diffFromBestVnd: 0,
      isTopRank: false,
      isTiedTop: false,
    };
  });

  const validResults = rawResults
    .filter((item) => item.status === 'valid')
    .sort((a, b) => {
      const diff = (b.estimatedReceiveVnd ?? 0) - (a.estimatedReceiveVnd ?? 0);
      if (diff !== 0) return diff;
      return a.channelId.localeCompare(b.channelId);
    });

  const insufficientResults = rawResults
    .filter((item) => item.status === 'insufficient_budget')
    .sort((a, b) => a.channelId.localeCompare(b.channelId));

  if (validResults.length > 0) {
    const bestVnd = validResults[0].estimatedReceiveVnd as number;
    const topCount = validResults.filter(
      (item) => item.estimatedReceiveVnd === bestVnd
    ).length;
    const canMarkTop = validResults.length >= 2;

    for (const item of validResults) {
      const receiveVnd = item.estimatedReceiveVnd as number;
      item.diffFromBestVnd = bestVnd - receiveVnd;
      if (canMarkTop && receiveVnd === bestVnd) {
        item.isTopRank = true;
        item.isTiedTop = topCount > 1;
      }
    }
  }

  return [...validResults, ...insufficientResults];
}
