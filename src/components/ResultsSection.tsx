import { useEffect, useState } from 'react';
import {
  formatDateTimeVn,
  formatDateVn,
  formatRate,
  formatSourceAmount,
  formatVnd,
} from '../domain/format';
import type {
  ComparisonResult,
  FxSnapshot,
  SourceCurrency,
} from '../domain/types';
import { ChannelDetails } from './ChannelDetails';

export interface LiveSourceMeta {
  sourceName: string;
  fetchedAt: number;
}

interface ResultsSectionProps {
  isLoading: boolean;
  rateErrorKind: 'no_rate' | 'expired' | null;
  isCachedWarning: boolean;
  liveFallbackNotice?: boolean;
  liveSourceMeta?: LiveSourceMeta | null;
  isDraftDirty: boolean;
  results: ComparisonResult[] | null;
  snapshot: FxSnapshot | null;
  sourceCurrency: SourceCurrency;
  detailsResetKey: string;
  onRetry: () => void;
  onFocusBudget: () => void;
  onNavigateDataSource: () => void;
}

function getIsDesktop(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(min-width: 1024px)').matches
  );
}

function getRankBadge(result: ComparisonResult): {
  label: string;
  className: string;
} | null {
  if (result.status === 'insufficient_budget') {
    return {
      label: 'Không đủ trả phí',
      className: 'rank-badge rank-badge--insufficient',
    };
  }
  if (result.isTiedTop) {
    return {
      label: 'Đồng hạng',
      className: 'rank-badge rank-badge--tied',
    };
  }
  if (result.isTopRank) {
    return {
      label: 'Nhận cao nhất',
      className: 'rank-badge rank-badge--best',
    };
  }
  return null;
}

export function ResultsSection({
  isLoading,
  rateErrorKind,
  isCachedWarning,
  liveFallbackNotice = false,
  liveSourceMeta = null,
  isDraftDirty,
  results,
  snapshot,
  sourceCurrency,
  detailsResetKey,
  onRetry,
  onFocusBudget,
  onNavigateDataSource,
}: ResultsSectionProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(getIsDesktop);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };
    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  if (isLoading) {
    return (
      <section className="results-section" aria-label="Trạng thái tải dữ liệu">
        <div className="status-banner status-banner--info" role="status">
          <p className="status-banner-text">Đang lấy tỷ giá…</p>
        </div>
      </section>
    );
  }

  if (rateErrorKind === 'expired') {
    return (
      <section className="results-section" aria-label="Cảnh báo dữ liệu tỷ giá">
        <div className="status-banner status-banner--error" role="alert">
          <p className="status-banner-text">
            Tỷ giá đã cũ. Cập nhật để so sánh.
          </p>
          <button type="button" className="secondary-btn" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      </section>
    );
  }

  if (rateErrorKind === 'no_rate') {
    return (
      <section className="results-section" aria-label="Lỗi tải tỷ giá">
        <div className="status-banner status-banner--error" role="alert">
          <p className="status-banner-text">
            Chưa lấy được tỷ giá. Thử lại.
          </p>
          <button type="button" className="secondary-btn" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      </section>
    );
  }

  if (!results || (!snapshot && !liveSourceMeta)) {
    return null;
  }

  const formattedDate = snapshot ? formatDateVn(snapshot.sourceUpdatedAt) : '';
  const hasAnyValid = results.some((item) => item.status === 'valid');
  const isLiveMode = liveSourceMeta !== null;

  return (
    <section className="results-section" aria-labelledby="results-heading">
      {isCachedWarning && snapshot && (
        <div className="status-banner status-banner--warning" role="status">
          <p className="status-banner-text">
            {`Đang dùng tỷ giá ngày ${formattedDate}.`}
          </p>
        </div>
      )}

      {liveFallbackNotice && !isLiveMode && (
        <div className="status-banner status-banner--warning" role="status">
          <p className="status-banner-text">
            Không lấy được báo giá nhà cung cấp trực tiếp; đang dùng tỷ giá tham chiếu và phí minh họa.
          </p>
        </div>
      )}

      {isDraftDirty ? (
        <div className="status-banner status-banner--info" role="status">
          <p className="status-banner-text">Bấm So sánh để cập nhật.</p>
        </div>
      ) : (
        <>
          <div className="results-meta">
            <p className="illustrative-label">
              {isLiveMode
                ? `Báo giá công khai · ${liveSourceMeta.sourceName}`
                : 'Ước tính · Phí minh họa'}
            </p>
            <p className="rate-date-line">
              {isLiveMode
                ? `Cập nhật ${formatDateTimeVn(liveSourceMeta.fetchedAt)} · `
                : `Tỷ giá ngày ${formattedDate} · `}
              <button
                type="button"
                className="inline-source-link"
                onClick={onNavigateDataSource}
              >
                Nguồn
              </button>
            </p>
          </div>

          {!hasAnyValid ? (
            <div className="status-banner status-banner--info" role="status">
              <p className="status-banner-text">Ngân sách chưa đủ trả phí</p>
              <button
                type="button"
                className="secondary-btn"
                onClick={onFocusBudget}
              >
                Sửa số tiền
              </button>
            </div>
          ) : (
            <>
              <h2 id="results-heading" className="results-heading">
                Kết quả
              </h2>

              {!isDesktop ? (
                <div className="result-cards">
                  {results.map((result) => {
                    const badge = getRankBadge(result);
                    const isTop = result.isTopRank || result.isTiedTop;
                    const feeText = `Phí ${formatSourceAmount(result.fixedFee, sourceCurrency)}`;
                    const diffText =
                      result.status === 'valid' &&
                      result.diffFromBestVnd !== null &&
                      result.diffFromBestVnd > 0
                        ? `Ít hơn ${formatVnd(result.diffFromBestVnd)} · ${feeText}`
                        : feeText;

                    return (
                      <article
                        key={result.channelId}
                        className={`result-card${isTop ? ' result-card--top' : ''}`}
                      >
                        <div className="result-card-header">
                          <h3 className="channel-title">{result.channelName}</h3>
                          {badge && (
                            <span className={badge.className}>
                              {badge.label}
                            </span>
                          )}
                        </div>

                        <p className="receive-label">Nhận ước tính</p>
                        <p className="receive-amount-card">
                          {result.estimatedReceiveVnd !== null
                            ? formatVnd(result.estimatedReceiveVnd)
                            : '—'}
                        </p>

                        <p className="card-secondary-meta">
                          {result.status === 'insufficient_budget'
                            ? `${feeText} · Không đủ trả phí`
                            : diffText}
                        </p>

                        <ChannelDetails
                          result={result}
                          sourceCurrency={sourceCurrency}
                          resetKey={`${detailsResetKey}-${result.channelId}`}
                        />
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="result-table-wrapper">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th scope="col">Kênh</th>
                        <th scope="col" className="col-num">
                          Phí gửi
                        </th>
                        <th scope="col" className="col-num">
                          Tỷ giá áp dụng
                        </th>
                        <th scope="col" className="col-num">
                          Nhận ước tính
                        </th>
                        <th scope="col">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result) => {
                        const badge = getRankBadge(result);

                        return (
                          <tr key={result.channelId}>
                            <td>
                              <div className="table-channel-cell">
                                <span className="channel-title">
                                  {result.channelName}
                                </span>
                                {badge && (
                                  <span className={badge.className}>
                                    {badge.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="col-num">
                              {formatSourceAmount(
                                result.fixedFee,
                                sourceCurrency
                              )}
                            </td>
                            <td className="col-num">
                              {`${formatRate(result.appliedRate, 6)} VND/${sourceCurrency}`}
                            </td>
                            <td className="col-num">
                              <span className="receive-amount-table">
                                {result.estimatedReceiveVnd !== null
                                  ? formatVnd(result.estimatedReceiveVnd)
                                  : '—'}
                              </span>
                              {result.status === 'valid' &&
                                result.diffFromBestVnd !== null &&
                                result.diffFromBestVnd > 0 && (
                                  <span className="table-diff-note">
                                    {`Ít hơn ${formatVnd(result.diffFromBestVnd)}`}
                                  </span>
                                )}
                            </td>
                            <td>
                              <ChannelDetails
                                result={result}
                                sourceCurrency={sourceCurrency}
                                resetKey={`${detailsResetKey}-${result.channelId}`}
                                isTable
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
