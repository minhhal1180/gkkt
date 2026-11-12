import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import {
  FX_SNAPSHOT_STORAGE_KEY,
  MAX_AGE_MS,
  resetFxServiceForTests,
} from './services';

const BASE_NOW = Date.UTC(2026, 10, 12, 5, 0, 0); // 12/11/2026 12:00 Asia/Ho_Chi_Minh

function makeApiPayload(
  updatedMs = BASE_NOW,
  nextMs = BASE_NOW + 24 * 3600 * 1000
) {
  return {
    result: 'success',
    base_code: 'USD',
    time_last_update_unix: Math.floor(updatedMs / 1000),
    time_next_update_unix: Math.floor(nextMs / 1000),
    rates: {
      USD: 1,
      VND: 26400,
      JPY: 160,
      KRW: 1320,
      TWD: 32,
    },
  };
}

function makeOkFetchResponse(payload = makeApiPayload()): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as unknown as Response;
}

function seedCachedSnapshot(
  updatedMs: number,
  nextMs: number,
  fetchedMs = updatedMs
) {
  localStorage.setItem(
    FX_SNAPSHOT_STORAGE_KEY,
    JSON.stringify({
      baseCode: 'USD',
      rates: {
        JPY: 160,
        KRW: 1320,
        TWD: 32,
        VND: 26400,
      },
      sourceUpdatedAt: updatedMs,
      nextUpdateAt: nextMs,
      fetchedAt: fetchedMs,
    })
  );
}

describe('App integration & behavior tests (U01–U10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetFxServiceForTests();
    vi.spyOn(Date, 'now').mockReturnValue(BASE_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('U01: submits on Enter and renders exact JPY fixture ranking, diffs, and metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeOkFetchResponse());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    const input = screen.getByLabelText('Bạn chi');
    await user.click(input);
    expect(input).toHaveValue('100000');

    await user.keyboard('{Enter}');

    const topAmounts = await screen.findAllByText('16.286.160 ₫');
    expect(topAmounts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Nhận cao nhất')).toBeInTheDocument();
    expect(screen.getAllByText('16.187.490 ₫').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Ít hơn 98\.670 ₫/)).toBeInTheDocument();
    expect(screen.getAllByText('16.087.500 ₫').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Ít hơn 198\.660 ₫/)).toBeInTheDocument();

    expect(screen.getByText('Ước tính · Phí minh họa')).toBeInTheDocument();
    expect(screen.getByText(/Tỷ giá ngày 12\/11\/2026/)).toBeInTheDocument();

    // Verify stable descending card order: B, A, C
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((el) => el.textContent)).toEqual([
      'Kênh B',
      'Kênh A',
      'Kênh C',
    ]);
  });

  it('U02: changing country resets default budget, updates presets, clears results, closes details, and announces change', async () => {
    seedCachedSnapshot(BASE_NOW, BASE_NOW + 3600_000);
    const fetchMock = vi.fn().mockResolvedValue(makeOkFetchResponse());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect((await screen.findAllByText('16.286.160 ₫')).length).toBeGreaterThanOrEqual(1);

    // Open one channel details independently
    const detailSummaries = screen.getAllByText('Chi tiết');
    const firstDetails = detailSummaries[0].closest('details') as HTMLDetailsElement;
    const secondDetails = detailSummaries[1].closest('details') as HTMLDetailsElement;
    await user.click(detailSummaries[0]);
    expect(firstDetails.open).toBe(true);
    expect(secondDetails.open).toBe(false);
    expect(within(firstDetails).getByText('Tỷ giá tham chiếu')).toBeInTheDocument();

    // Switch to Hàn Quốc (KRW)
    await user.click(screen.getByRole('radio', { name: /Hàn Quốc/i }));

    expect(screen.getByLabelText('Bạn chi')).toHaveValue('1.000.000');
    expect(screen.queryByText('16.286.160 ₫')).not.toBeInTheDocument();
    expect(screen.queryByText('Tỷ giá tham chiếu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '500.000' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2.000.000' })).toBeInTheDocument();

    // Preset sets draft without auto-submitting
    await user.click(screen.getByRole('button', { name: '2.000.000' }));
    expect(screen.getByLabelText('Bạn chi')).toHaveValue('2.000.000');
    expect(screen.queryByText('Kết quả')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    const liveRegions = screen.getAllByRole('status');
    expect(
      liveRegions.some((el) => el.textContent?.includes('Hàn Quốc (KRW)'))
    ).toBe(true);
  });

  it('U03: editing budget after comparison hides old VND amounts and shows update prompt; focus/blur alone does not hide results', async () => {
    seedCachedSnapshot(BASE_NOW, BASE_NOW + 3600_000);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect((await screen.findAllByText('16.286.160 ₫')).length).toBeGreaterThanOrEqual(1);

    const input = screen.getByLabelText('Bạn chi');
    await user.click(input);
    expect(input).toHaveValue('100000');
    expect(screen.getAllByText('16.286.160 ₫').length).toBeGreaterThanOrEqual(1);

    await user.clear(input);
    await user.type(input, '150000');

    expect(screen.queryByText('16.286.160 ₫')).not.toBeInTheDocument();
    expect(screen.getByText('Bấm So sánh để cập nhật.')).toBeInTheDocument();
  });

  it('U04: normalizes 100000, 100.000, and 100,000 to identical comparison output', async () => {
    seedCachedSnapshot(BASE_NOW, BASE_NOW + 3600_000);
    const user = userEvent.setup();

    render(<App />);
    const input = screen.getByLabelText('Bạn chi');

    for (const raw of ['100000', '100.000', '100,000']) {
      await user.clear(input);
      await user.type(input, raw);
      await user.click(screen.getByRole('button', { name: 'So sánh' }));
      expect((await screen.findAllByText('16.286.160 ₫')).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('U05: shows validation errors for invalid inputs, focuses input, and preserves user text', async () => {
    seedCachedSnapshot(BASE_NOW, BASE_NOW + 3600_000);
    const user = userEvent.setup();

    render(<App />);
    const input = screen.getByLabelText('Bạn chi');

    // Decimal
    await user.clear(input);
    await user.type(input, '100.50');
    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect(screen.getByText('Nhập số nguyên, ví dụ 100.000.')).toBeInTheDocument();
    expect(input).toHaveValue('100.50');
    expect(input).toHaveFocus();

    // Scientific notation
    await user.clear(input);
    await user.type(input, '1e5');
    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect(screen.getByText('Nhập số nguyên, ví dụ 100.000.')).toBeInTheDocument();
    expect(input).toHaveValue('1e5');
    expect(input).toHaveFocus();

    // Negative
    await user.clear(input);
    await user.type(input, '-500');
    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect(screen.getByText('Nhập số tiền lớn hơn 0.')).toBeInTheDocument();
    expect(input).toHaveValue('-500');
    expect(input).toHaveFocus();

    // Empty
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect(screen.getByText('Nhập số tiền lớn hơn 0.')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    // Exceeds max
    await user.type(input, '1000000000');
    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect(screen.getByText('Nhập tối đa 999.999.999.')).toBeInTheDocument();
    expect(input).toHaveValue('1000000000');
    expect(input).toHaveFocus();
  });

  it('U06: locks duplicate submit while loading and uses a single network request', async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    const submitBtn = screen.getByRole('button', { name: 'So sánh' });
    await user.click(submitBtn);

    expect(screen.getByRole('button', { name: 'Đang lấy tỷ giá…' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Attempt second click while disabled
    await user.click(screen.getByRole('button', { name: 'Đang lấy tỷ giá…' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(makeOkFetchResponse());
    });

    expect((await screen.findAllByText('16.286.160 ₫')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('U07: handles offline/429 errors with Retry when no cache exists, and falls back to valid <=48h cache with warning', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect(
      await screen.findByText('Chưa lấy được tỷ giá. Thử lại.')
    ).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(makeOkFetchResponse());
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect((await screen.findAllByText('16.286.160 ₫')).length).toBeGreaterThanOrEqual(1);

    unmount();
    localStorage.clear();
    resetFxServiceForTests();

    // Valid <=48h cache whose nextUpdateAt has already passed -> 429 triggers cachedFallback warning
    const staleDateMs = BASE_NOW - 24 * 3600 * 1000;
    seedCachedSnapshot(staleDateMs, BASE_NOW - 1000);
    const rateLimitedMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as unknown as Response);
    vi.stubGlobal('fetch', rateLimitedMock);

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'So sánh' }));

    expect((await screen.findAllByText('16.286.160 ₫')).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Đang dùng tỷ giá ngày 11/11/2026.')
    ).toBeInTheDocument();
  });

  it('U08: continues working with in-memory snapshot when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const fetchMock = vi.fn().mockResolvedValue(makeOkFetchResponse());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect((await screen.findAllByText('16.286.160 ₫')).length).toBeGreaterThanOrEqual(1);
  });

  it('U09: permits exact 48h cached snapshot and blocks >48h expired snapshot', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Offline'));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // Exact 48h boundary -> allowed
    seedCachedSnapshot(BASE_NOW - MAX_AGE_MS, BASE_NOW - 1000);
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect((await screen.findAllByText('16.286.160 ₫')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Đang dùng tỷ giá ngày 10/11/2026.')).toBeInTheDocument();
    unmount();

    // 48h + 1ms -> expired
    localStorage.clear();
    resetFxServiceForTests();
    seedCachedSnapshot(BASE_NOW - MAX_AGE_MS - 1, BASE_NOW - 1000);
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect(
      await screen.findByText('Tỷ giá đã cũ. Cập nhật để so sánh.')
    ).toBeInTheDocument();
    expect(screen.queryByText('16.286.160 ₫')).not.toBeInTheDocument();
  });

  it('U10: discards stale in-flight submit result if user changes country while waiting', async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    // Submit JPY
    await user.click(screen.getByRole('button', { name: 'So sánh' }));
    expect(screen.getByRole('button', { name: 'Đang lấy tỷ giá…' })).toBeDisabled();

    // Change country to Đài Loan while request is still pending
    await user.click(screen.getByRole('radio', { name: /Đài Loan/i }));
    expect(screen.getByLabelText('Bạn chi')).toHaveValue('20.000');

    // Old JPY request now resolves
    await act(async () => {
      resolveFetch(makeOkFetchResponse());
    });

    // Must NOT render stale JPY results!
    expect(screen.queryByText('16.286.160 ₫')).not.toBeInTheDocument();
    expect(screen.queryByText('Kết quả')).not.toBeInTheDocument();
  });

  it('supports progressive disclosure (channel details & data source) and insufficient budget handling', async () => {
    seedCachedSnapshot(BASE_NOW, BASE_NOW + 3600_000);
    const user = userEvent.setup();

    render(<App />);

    const input = screen.getByLabelText('Bạn chi');
    await user.clear(input);
    await user.type(input, '400');
    await user.click(screen.getByRole('button', { name: 'So sánh' }));

    // Only Channel C is valid -> NO "Nhận cao nhất" badge, A and B show "Không đủ trả phí"
    expect(await screen.findByText('Kênh C')).toBeInTheDocument();
    expect(screen.queryByText('Nhận cao nhất')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Không đủ trả phí/).length).toBeGreaterThanOrEqual(2);

    // Open Channel C details independently
    const summaries = screen.getAllByText('Chi tiết');
    const firstDetails = summaries[0].closest('details') as HTMLDetailsElement;
    const secondDetails = summaries[1].closest('details') as HTMLDetailsElement;
    await user.click(summaries[0]);
    expect(firstDetails.open).toBe(true);
    expect(secondDetails.open).toBe(false);
    expect(
      within(firstDetails).getByText(
        'Biên tỷ giá là mức giảm giả định so với tỷ giá tham chiếu.'
      )
    ).toBeInTheDocument();
    expect(
      within(firstDetails).getByText('Phí nhận giả định bằng 0.')
    ).toBeInTheDocument();

    // Header "Dữ liệu" link opens and focuses "Nguồn dữ liệu"
    await user.click(screen.getByRole('link', { name: 'Dữ liệu' }));
    const dataSourceDetails = document.getElementById('nguon-du-lieu') as HTMLDetailsElement;
    expect(dataSourceDetails.open).toBe(true);
    expect(
      screen.getByRole('link', { name: /Rates By Exchange Rate API/i })
    ).toHaveAttribute('href', 'https://www.exchangerate-api.com');
  });

  it('renders semantic table layout on desktop (>= 1024px)', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('min-width: 1024px'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    seedCachedSnapshot(BASE_NOW, BASE_NOW + 3600_000);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'So sánh' }));

    const table = await screen.findByRole('table');
    expect(within(table).getAllByText('16.286.160 ₫').length).toBeGreaterThanOrEqual(1);
    expect(within(table).getByRole('columnheader', { name: 'Kênh' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Nhận ước tính' })).toBeInTheDocument();

    // Ensure enter / form submit works via fireEvent.submit as well
    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });
    expect(within(table).getAllByText('16.286.160 ₫').length).toBeGreaterThanOrEqual(1);
  });

  it('renders live verified JPY providers from Cloudflare Worker /api/quotes and falls back cleanly on error', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/quotes')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            mode: 'live_providers',
            sourceCurrency: 'JPY',
            sendAmount: 100000,
            sourceName: 'Wise Public Comparison API v4',
            sourceUrl: 'https://wise.com/gb/compare/',
            fetchedAt: BASE_NOW,
            quotes: [
              {
                providerId: 'instarem',
                providerName: 'Instarem',
                providerType: 'moneyTransferProvider',
                fee: 0,
                rate: 159.75,
                markupPercent: 0.51,
                receivedAmountVnd: 15975000,
                collectedAt: BASE_NOW - 60_000,
              },
              {
                providerId: 'sbi-remit',
                providerName: 'SBI Remit',
                providerType: 'moneyTransferProvider',
                fee: 760,
                rate: 159.875,
                markupPercent: 0.44,
                receivedAmountVnd: 15866000,
                collectedAt: BASE_NOW - 30_000,
              },
              {
                providerId: 'wise',
                providerName: 'Wise',
                providerType: 'moneyTransferProvider',
                fee: 1244,
                rate: 160.557,
                markupPercent: 0,
                receivedAmountVnd: 15855967,
                collectedAt: BASE_NOW,
              },
            ],
          }),
        } as unknown as Response;
      }
      return makeOkFetchResponse();
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App enableLiveProviderQuotes />);
    await user.click(screen.getByRole('button', { name: 'So sánh' }));

    expect(await screen.findByText('Instarem')).toBeInTheDocument();
    expect(screen.getByText('SBI Remit')).toBeInTheDocument();
    expect(screen.getByText('Wise')).toBeInTheDocument();
    expect(
      screen.getByText('Báo giá công khai · Wise Public Comparison API v4')
    ).toBeInTheDocument();
    expect(screen.getAllByText('15.975.000 ₫').length).toBeGreaterThanOrEqual(1);

    // Now simulate Worker /api/quotes returning 502 -> falls back to illustrative channels with warning
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/quotes')) {
        return { ok: false, status: 502, json: async () => ({}) } as unknown as Response;
      }
      return makeOkFetchResponse();
    });

    const input = screen.getByLabelText('Bạn chi');
    await user.clear(input);
    await user.type(input, '100000');
    await user.click(screen.getByRole('button', { name: 'So sánh' }));

    expect(
      await screen.findByText(/Không lấy được báo giá nhà cung cấp trực tiếp/)
    ).toBeInTheDocument();
    expect(screen.getByText('Kênh B')).toBeInTheDocument();
  });
});
