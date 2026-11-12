import { describe, expect, it, vi } from 'vitest';
import {
  buildWiseComparisonUrl,
  handleApiQuotes,
  normalizeWiseComparisonResponse,
  parseBankOfTaiwanVndRate,
  parseVietcombankXmlRate,
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

  it('parses Vietcombank XML KRW transfer rate and Bank of Taiwan CSV VND rate', () => {
    const xml = `<ExrateList><DateTime>11/12/2026 10:35:05 PM</DateTime><Exrate CurrencyCode="KRW" CurrencyName="KOREAN WON" Buy="16.65" Transfer="18.50" Sell="20.08" /></ExrateList>`;
    const vcb = parseVietcombankXmlRate(xml, 'KRW');
    expect(vcb?.transferRate).toBe(18.5);
    expect(vcb?.updatedAt).not.toBeNull();

    const csv = [
      '幣別,匯率,現金,即期,遠期10天,遠期30天,遠期60天,遠期90天,遠期120天,遠期150天,遠期180天,匯率,現金,即期',
      'VND,本行買入,0.00104,0.00000,0.00000,0.00000,0.00000,0.00000,0.00000,0.00000,0.00000,本行賣出,0.00145,0.00000',
    ].join('\n');
    const botRate = parseBankOfTaiwanVndRate(csv);
    expect(botRate).toBeCloseTo(1 / 0.00145, 4);
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

  it('returns live public sources for KRW (VCB + MoneyBox + Open ER-API) and TWD (Bank of Taiwan + Open ER-API)', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('open.er-api.com')) {
        return new Response(
          JSON.stringify({
            result: 'success',
            time_last_update_unix: 1794440000,
            rates: { VND: 26400, KRW: 1320, TWD: 32 },
          }),
          { status: 200 }
        );
      }
      if (url.includes('vietcombank.com.vn')) {
        return new Response(
          `<ExrateList><DateTime>11/12/2026 10:35:05 PM</DateTime><Exrate CurrencyCode="KRW" Transfer="18.50" /></ExrateList>`,
          { status: 200 }
        );
      }
      if (url.includes('rate.bot.com.tw')) {
        return new Response(
          'VND,本行買入,0.00104,0,0,0,0,0,0,0,0,本行賣出,0.00145,0',
          { status: 200 }
        );
      }
      if (url.includes('current.json')) {
        return new Response(
          JSON.stringify({ manifest: { path: 'rel.json' } }),
          { status: 200 }
        );
      }
      if (url.includes('rel.json')) {
        return new Response(
          JSON.stringify({
            providers: [{ providerId: 'moneybox', snapshot: { path: 'mb.json' } }],
          }),
          { status: 200 }
        );
      }
      if (url.includes('mb.json')) {
        return new Response(
          JSON.stringify({
            quotes: [
              {
                fromCurrency: 'KRW',
                toCurrency: 'VND',
                status: 'available',
                rate: '18.181818',
                sourceQuote: { sourcePublishedAt: '2026-11-12T07:29:09Z' },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('', { status: 404 });
    });

    const krwRes = await handleApiQuotes(
      new Request('https://example.com/api/quotes?sourceCurrency=KRW&sendAmount=1000000'),
      fetchMock as unknown as typeof fetch,
      () => 1794498000000
    );
    expect(krwRes.status).toBe(200);
    const krwData = (await krwRes.json()) as {
      mode: string;
      quotes: Array<{ providerName: string; receivedAmountVnd: number }>;
    };
    expect(krwData.mode).toBe('live_providers');
    expect(krwData.quotes.map((q) => q.providerName)).toEqual([
      'Tham chiếu liên ngân hàng',
      'Vietcombank (Mua chuyển khoản)',
      'MoneyBox (Quầy Seoul)',
    ]);

    const twdRes = await handleApiQuotes(
      new Request('https://example.com/api/quotes?sourceCurrency=TWD&sendAmount=20000'),
      fetchMock as unknown as typeof fetch,
      () => 1794498000000
    );
    expect(twdRes.status).toBe(200);
    const twdData = (await twdRes.json()) as {
      mode: string;
      quotes: Array<{ providerName: string; receivedAmountVnd: number }>;
    };
    expect(twdData.mode).toBe('live_providers');
    expect(twdData.quotes.map((q) => q.providerName)).toEqual([
      'Tham chiếu liên ngân hàng',
      'Ngân hàng Đài Loan (Đài Bắc)',
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
