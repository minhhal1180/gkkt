import { useCallback, useEffect, useRef, useState } from 'react';
import { CompareForm } from './components/CompareForm';
import { DataSourceSection } from './components/DataSourceSection';
import { Header } from './components/Header';
import { ResultsSection } from './components/ResultsSection';
import { parseBudgetInput } from './domain/budget';
import { compare } from './domain/compare';
import { COUNTRIES } from './domain/config';
import {
  formatDateTimeVn,
  formatIntegerVi,
  formatVnd,
} from './domain/format';
import type {
  CompareInput,
  ComparisonResult,
  FxSnapshot,
  SourceCurrency,
} from './domain/types';
import {
  AUTO_COOLDOWN_MS,
  ensureSnapshotForCompare,
  fetchProviderQuotes,
  getCachedSnapshot,
  loadInitialSnapshot,
  refreshSnapshot,
} from './services';
import type { LiveSourceMeta } from './components/ResultsSection';

export interface AppProps {
  enableLiveProviderQuotes?: boolean;
}

export function App({
  enableLiveProviderQuotes = import.meta.env.MODE !== 'test',
}: AppProps) {
  const [sourceCurrency, setSourceCurrency] = useState<SourceCurrency>('JPY');
  const [budgetText, setBudgetText] = useState<string>(() =>
    formatIntegerVi(COUNTRIES.JPY.defaultBudget)
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [activeSnapshot, setActiveSnapshot] = useState<FxSnapshot | null>(() =>
    getCachedSnapshot()
  );
  const [submitted, setSubmitted] = useState<CompareInput | null>(null);
  const [results, setResults] = useState<ComparisonResult[] | null>(null);
  const [isCachedWarning, setIsCachedWarning] = useState<boolean>(false);
  const [liveFallbackNotice, setLiveFallbackNotice] = useState<boolean>(false);
  const [liveSourceMeta, setLiveSourceMeta] = useState<LiveSourceMeta | null>(
    null
  );
  const [rateErrorKind, setRateErrorKind] = useState<
    'no_rate' | 'expired' | null
  >(null);
  const [isDraftDirty, setIsDraftDirty] = useState<boolean>(false);
  const [detailsResetCounter, setDetailsResetCounter] = useState<number>(0);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const submitTokenRef = useRef<number>(0);
  const budgetInputRef = useRef<HTMLInputElement | null>(null);
  const dataSourceDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const dataSourceSummaryRef = useRef<HTMLElement | null>(null);

  const submittedRef = useRef<CompareInput | null>(submitted);
  submittedRef.current = submitted;
  const liveSourceMetaRef = useRef<LiveSourceMeta | null>(liveSourceMeta);
  liveSourceMetaRef.current = liveSourceMeta;

  useEffect(() => {
    let active = true;

    const checkRefresh = async () => {
      try {
        const res = await loadInitialSnapshot();
        if (!active || !res.snapshot) {
          return;
        }
        setActiveSnapshot(res.snapshot);
        if (
          submittedRef.current &&
          res.status === 'fresh' &&
          !liveSourceMetaRef.current
        ) {
          setResults(compare(submittedRef.current, res.snapshot));
          setIsCachedWarning(false);
          setRateErrorKind(null);
        }
      } catch {
        // Silent background check; user-initiated compare handles surfacing errors.
      }
    };

    void checkRefresh();

    const intervalId = window.setInterval(() => {
      void checkRefresh();
    }, AUTO_COOLDOWN_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleSelectCountry = useCallback(
    (nextCurrency: SourceCurrency) => {
      if (nextCurrency === sourceCurrency) {
        return;
      }

      submitTokenRef.current += 1;
      setIsSubmitting(false);
      setSourceCurrency(nextCurrency);

      const nextDefault = COUNTRIES[nextCurrency].defaultBudget;
      const formattedDefault = formatIntegerVi(nextDefault);
      setBudgetText(formattedDefault);
      setValidationError(null);
      setSubmitted(null);
      setResults(null);
      setIsCachedWarning(false);
      setLiveFallbackNotice(false);
      setLiveSourceMeta(null);
      setRateErrorKind(null);
      setIsDraftDirty(false);
      setDetailsResetCounter((prev) => prev + 1);
      setLiveAnnouncement(
        `Đã chọn ${COUNTRIES[nextCurrency].countryName} (${nextCurrency}), ngân sách mặc định ${formattedDefault} ${nextCurrency}.`
      );
    },
    [sourceCurrency]
  );

  const updateDirtyFromDraft = useCallback(
    (rawDraft: string) => {
      if (!submitted) {
        return;
      }
      const parsed = parseBudgetInput(rawDraft);
      const changed =
        !parsed.ok ||
        parsed.normalized !== submitted.budget ||
        sourceCurrency !== submitted.sourceCurrency;
      setIsDraftDirty(changed);
    },
    [sourceCurrency, submitted]
  );

  const handleBudgetChange = useCallback(
    (nextValue: string) => {
      if (isSubmitting) {
        submitTokenRef.current += 1;
        setIsSubmitting(false);
      }
      setBudgetText(nextValue);
      setValidationError(null);
      updateDirtyFromDraft(nextValue);
    },
    [isSubmitting, updateDirtyFromDraft]
  );

  const handleBudgetFocus = useCallback(() => {
    const parsed = parseBudgetInput(budgetText);
    if (parsed.ok) {
      setBudgetText(parsed.normalized);
    }
  }, [budgetText]);

  const handleBudgetBlur = useCallback(() => {
    const parsed = parseBudgetInput(budgetText);
    if (parsed.ok) {
      setBudgetText(formatIntegerVi(parsed.normalized));
    }
  }, [budgetText]);

  const handleSelectPreset = useCallback(
    (presetRaw: string) => {
      if (isSubmitting) {
        submitTokenRef.current += 1;
        setIsSubmitting(false);
      }
      setBudgetText(formatIntegerVi(presetRaw));
      setValidationError(null);
      updateDirtyFromDraft(presetRaw);
    },
    [isSubmitting, updateDirtyFromDraft]
  );

  const executeCompare = useCallback(
    async (useExplicitRefresh: boolean) => {
      if (isSubmitting) {
        return;
      }

      const parsed = parseBudgetInput(budgetText);
      if (!parsed.ok) {
        setValidationError(parsed.error);
        setLiveAnnouncement('');
        budgetInputRef.current?.focus();
        return;
      }

      setValidationError(null);
      const token = ++submitTokenRef.current;
      const compareInput: CompareInput = {
        sourceCurrency,
        budget: parsed.normalized,
      };

      setIsSubmitting(true);
      setRateErrorKind(null);
      setLiveAnnouncement('');

      try {
        if (enableLiveProviderQuotes) {
          const liveResult = await fetchProviderQuotes(
            sourceCurrency,
            parsed.value
          );

          if (submitTokenRef.current !== token) {
            return;
          }

          if (liveResult.kind === 'live_provider') {
            setIsSubmitting(false);
            setSubmitted(compareInput);
            setResults(liveResult.results);
            setLiveSourceMeta({
              sourceName: liveResult.sourceName,
              fetchedAt: liveResult.fetchedAt,
            });
            setLiveFallbackNotice(false);
            setIsCachedWarning(false);
            setRateErrorKind(null);
            setIsDraftDirty(false);

            const top = liveResult.results[0];
            if (top) {
              setLiveAnnouncement(
                top.isTiedTop
                  ? `Đã cập nhật báo giá trực tiếp. Có phương án đồng hạng với ${formatVnd(top.estimatedReceiveVnd ?? 0)}.`
                  : `Đã cập nhật báo giá trực tiếp. ${top.channelName} nhận ước tính ${formatVnd(top.estimatedReceiveVnd ?? 0)}.`
              );
            }
            return;
          }

          setLiveFallbackNotice(liveResult.hadLiveError);
        } else {
          setLiveFallbackNotice(false);
        }

        const fxResult = useExplicitRefresh
          ? await refreshSnapshot()
          : await ensureSnapshotForCompare();

        if (submitTokenRef.current !== token) {
          return;
        }

        setIsSubmitting(false);

        if (fxResult.snapshot) {
          setActiveSnapshot(fxResult.snapshot);
        }

        if (fxResult.status === 'expired') {
          setRateErrorKind('expired');
          setSubmitted(null);
          setResults(null);
          setLiveSourceMeta(null);
          setIsCachedWarning(false);
          setIsDraftDirty(false);
          setLiveAnnouncement('');
          return;
        }

        if (fxResult.status === 'unavailable' || !fxResult.snapshot) {
          setRateErrorKind('no_rate');
          setSubmitted(null);
          setResults(null);
          setLiveSourceMeta(null);
          setIsCachedWarning(false);
          setIsDraftDirty(false);
          setLiveAnnouncement('');
          return;
        }

        const nextResults = compare(compareInput, fxResult.snapshot);
        setSubmitted(compareInput);
        setResults(nextResults);
        setLiveSourceMeta(null);
        setRateErrorKind(null);
        setIsDraftDirty(false);
        setIsCachedWarning(fxResult.status === 'cachedFallback');

        const validResults = nextResults.filter(
          (item) => item.status === 'valid'
        );
        if (validResults.length === 0) {
          setLiveAnnouncement('Ngân sách chưa đủ trả phí.');
        } else {
          const top = validResults[0];
          if (top.isTiedTop) {
            setLiveAnnouncement(
              `Đã cập nhật kết quả. Có phương án đồng hạng với ${formatVnd(top.estimatedReceiveVnd ?? 0)}.`
            );
          } else {
            setLiveAnnouncement(
              `Đã cập nhật kết quả. ${top.channelName} nhận ước tính ${formatVnd(top.estimatedReceiveVnd ?? 0)}.`
            );
          }
        }
      } catch {
        if (submitTokenRef.current !== token) {
          return;
        }
        setIsSubmitting(false);
        setRateErrorKind('no_rate');
        setSubmitted(null);
        setResults(null);
        setLiveSourceMeta(null);
        setLiveFallbackNotice(false);
        setIsCachedWarning(false);
        setIsDraftDirty(false);
        setLiveAnnouncement('');
      }
    },
    [budgetText, enableLiveProviderQuotes, isSubmitting, sourceCurrency]
  );

  const handleFocusBudget = useCallback(() => {
    budgetInputRef.current?.focus();
  }, []);

  const handleNavigateDataSource = useCallback(() => {
    if (dataSourceDetailsRef.current) {
      dataSourceDetailsRef.current.open = true;
      dataSourceDetailsRef.current.scrollIntoView?.({
        behavior: 'auto',
        block: 'start',
      });
    }
    dataSourceSummaryRef.current?.focus();
  }, []);

  return (
    <div className="page-shell">
      <Header onNavigateDataSource={handleNavigateDataSource} />

      <main className="main-content">
        <h1 className="page-title">Gửi về, nhận bao nhiêu?</h1>

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </div>

        <div className="workspace-grid">
          <CompareForm
            sourceCurrency={sourceCurrency}
            budgetText={budgetText}
            validationError={validationError}
            isLoading={isSubmitting}
            budgetInputRef={budgetInputRef}
            onSelectCountry={handleSelectCountry}
            onBudgetChange={handleBudgetChange}
            onBudgetFocus={handleBudgetFocus}
            onBudgetBlur={handleBudgetBlur}
            onSelectPreset={handleSelectPreset}
            onSubmit={() => void executeCompare(false)}
          />

          <div className="results-column">
            <ResultsSection
              isLoading={isSubmitting}
              rateErrorKind={rateErrorKind}
              isCachedWarning={isCachedWarning}
              liveFallbackNotice={liveFallbackNotice}
              liveSourceMeta={liveSourceMeta}
              isDraftDirty={isDraftDirty}
              results={results}
              snapshot={activeSnapshot}
              sourceCurrency={submitted?.sourceCurrency ?? sourceCurrency}
              detailsResetKey={`${sourceCurrency}-${detailsResetCounter}`}
              onRetry={() => void executeCompare(true)}
              onFocusBudget={handleFocusBudget}
              onNavigateDataSource={handleNavigateDataSource}
            />
          </div>
        </div>

        <DataSourceSection
          sourceUpdatedAt={activeSnapshot?.sourceUpdatedAt ?? null}
          fetchedAt={activeSnapshot?.fetchedAt ?? null}
          formatDateTime={formatDateTimeVn}
          detailsRef={dataSourceDetailsRef}
          summaryRef={dataSourceSummaryRef}
        />
      </main>
    </div>
  );
}

export default App;
