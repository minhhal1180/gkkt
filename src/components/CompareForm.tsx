import type { FormEvent, RefObject } from 'react';
import { COUNTRIES, COUNTRY_LIST } from '../domain/config';
import { formatIntegerVi } from '../domain/format';
import type { SourceCurrency } from '../domain/types';

interface CompareFormProps {
  sourceCurrency: SourceCurrency;
  budgetText: string;
  validationError: string | null;
  isLoading: boolean;
  budgetInputRef: RefObject<HTMLInputElement | null>;
  onSelectCountry: (currency: SourceCurrency) => void;
  onBudgetChange: (nextValue: string) => void;
  onBudgetFocus: () => void;
  onBudgetBlur: () => void;
  onSelectPreset: (presetRaw: string) => void;
  onSubmit: () => void;
}

export function CompareForm({
  sourceCurrency,
  budgetText,
  validationError,
  isLoading,
  budgetInputRef,
  onSelectCountry,
  onBudgetChange,
  onBudgetFocus,
  onBudgetBlur,
  onSelectPreset,
  onSubmit,
}: CompareFormProps) {
  const country = COUNTRIES[sourceCurrency];
  const describedBy = validationError
    ? 'budget-currency budget-helper budget-error'
    : 'budget-currency budget-helper';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="compare-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="country-fieldset">
        <legend className="sr-only">Quốc gia gửi</legend>
        <div className="country-grid">
          {COUNTRY_LIST.map((item) => (
            <div key={item.currency} className="country-option">
              <input
                id={`country-${item.currency}`}
                className="country-radio"
                type="radio"
                name="sourceCurrency"
                value={item.currency}
                checked={sourceCurrency === item.currency}
                onChange={() => onSelectCountry(item.currency)}
              />
              <label
                htmlFor={`country-${item.currency}`}
                className="country-label"
              >
                <span className="country-name">{item.countryName}</span>
                <span className="country-code">{item.currency}</span>
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="field-group">
        <label htmlFor="budget-input" className="field-label">
          Bạn chi
        </label>
        <div
          className={`budget-input-wrapper${validationError ? ' has-error' : ''}`}
        >
          <input
            id="budget-input"
            ref={budgetInputRef}
            className="budget-input"
            type="text"
            inputMode="numeric"
            value={budgetText}
            onChange={(event) => onBudgetChange(event.target.value)}
            onFocus={onBudgetFocus}
            onBlur={onBudgetBlur}
            aria-describedby={describedBy}
            aria-invalid={validationError ? 'true' : undefined}
            autoComplete="off"
          />
          <span id="budget-currency" className="currency-suffix">
            {sourceCurrency}
          </span>
        </div>
        <p id="budget-helper" className="field-helper">
          Đã gồm phí
        </p>
        {validationError && (
          <p id="budget-error" className="field-error" role="alert">
            {validationError}
          </p>
        )}
      </div>

      <div className="preset-group" role="group" aria-label="Mức tiền gợi ý">
        {country.presets.map((presetRaw) => {
          const formattedPreset = formatIntegerVi(presetRaw);
          const isSelected =
            budgetText.replace(/[.,\s\u00A0\u202F]/g, '') === presetRaw;

          return (
            <button
              key={presetRaw}
              type="button"
              className={`preset-btn${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onSelectPreset(presetRaw)}
            >
              {formattedPreset}
            </button>
          );
        })}
      </div>

      <p className="destination-line">Về Việt Nam · VND</p>

      <button type="submit" className="primary-btn" disabled={isLoading}>
        {isLoading ? 'Đang lấy tỷ giá…' : 'So sánh'}
      </button>
    </form>
  );
}
