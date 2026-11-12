import { describe, expect, it, vi } from 'vitest';
import {
  buildWiseComparisonUrl,
  handleApiQuotes,
  normalizeWiseComparisonResponse,
} from './index';

describe('Cloudflare Worker /api/quotes', () => {
  it('normalizes live JPY providers sorted descending by receivedAmountVnd', () => {
    const raw = {
      providers: [
        {
          id: 1,
          alias: 'wise',
          name: 'Wise',
          type: 'moneyTransferProvider',
          quotes: [
            {
              fee: 1244,
              rate: 160.557,
              markup: 0,
              receivedAmount: 15855967,
              dateCollected: '2026-11-12T15:41:32Z',
            },
          ],
        },
        {
          id: 107,
          alias: 'instarem',
          name: 'Instarem',
          type: 'moneyTransferProvider',
          quotes: [
            {
              fee: 0,
              rate: 159.750406,
              markup: 0.514765,
              receivedAmount: 15975041,
              dateCollected: '2026-11-12T14:25:33.544Z',
            },
          ],
        },
        {
          id: 25,
          alias: 'sbi-remit',
          name: 'SBI Remit',
          type: 'moneyTransferProvider',
          quotes: [
            {
              fee: 760,
              rate: 159.875546,
              markup: 0.436833,
              receivedAmount: 15866049,
              dateCollected: '2026-11-12T15:40:13.382Z',
            },
          ],
        },
      ],
    };

    const normalized = normalizeWiseComparisonResponse(raw, 100000);
    expect(normalized.map((q) => q.providerName)).toEqual([
      'Instarem',
      'SBI Remit',
      'Wise',
    ]);
    expect(normalized[0].receivedAmountVnd).toBe(15975041);
    expect(normalized[1].fee).toBe(760);
    expect(normalized[2].markupPercent).toBe(0);
  });

  it('fetches live Wise comparison quotes for JPY and rejects invalid params', async () => {
    const badRes = await handleApiQuotes(
      new Request('https://example.com/api/quotes?sourceCurrency=USD&sendAmount=100')
    );
    expect(badRes.status).toBe(400);

    const badAmt = await handleApiQuotes(
      new Request('https://example.com/api/quotes?sourceCurrency=JPY&sendAmount=0')
    );
    expect(badAmt.status).toBe(400);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          providers: [
            {
              alias: 'instarem',
              name: 'Instarem',
              type: 'moneyTransferProvider',
              quotes: [
                {
                  fee: 0,
                  rate: 159.75,
                  markup: 0.51,
                  receivedAmount: 15975000,
                  dateCollected: '2026-11-12T14:25:33Z',
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const okRes = await handleApiQuotes(
      new Request('https://example.com/api/quotes?sourceCurrency=JPY&sendAmount=100000'),
      fetchMock as unknown as typeof fetch,
      () => 1794498000000
    );

    expect(fetchMock).toHaveBeenCalledWith(
      buildWiseComparisonUrl(100000),
      expect.any(Object)
    );
    expect(okRes.status).toBe(200);
    const data = (await okRes.json()) as {
      mode: string;
      quotes: Array<{ providerName: string }>;
    };
    expect(data.mode).toBe('live_providers');
    expect(data.quotes[0].providerName).toBe('Instarem');
  });

  it('returns illustrative_only with reference providers for KRW and TWD', async () => {
    const krwRes = await handleApiQuotes(
      new Request('https://example.com/api/quotes?sourceCurrency=KRW&sendAmount=1000000')
    );
    expect(krwRes.status).toBe(200);
    const krwData = (await krwRes.json()) as {
      mode: string;
      referenceProviders: Array<{ name: string }>;
    };
    expect(krwData.mode).toBe('illustrative_only');
    expect(krwData.referenceProviders.map((p) => p.name)).toEqual([
      'Hanpass',
      'SentBe',
      'GmoneyTrans',
    ]);
  });

  it('returns 502 unavailable if upstream Wise API fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Upstream down'));
    const res = await handleApiQuotes(
      new Request('https://example.com/api/quotes?sourceCurrency=JPY&sendAmount=100000'),
      fetchMock as unknown as typeof fetch
    );
    expect(res.status).toBe(502);
  });
});
