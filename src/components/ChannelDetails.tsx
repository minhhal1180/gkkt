import {
  formatMarginPercent,
  formatRate,
  formatSourceAmount,
  formatVnd,
} from '../domain/format';
import type { ComparisonResult, SourceCurrency } from '../domain/types';
import { ChevronIcon } from './ChevronIcon';

interface ChannelDetailsProps {
  result: ComparisonResult;
  sourceCurrency: SourceCurrency;
  resetKey: string;
  isTable?: boolean;
}

export function ChannelDetails({
  result,
  sourceCurrency,
  resetKey,
  isTable = false,
}: ChannelDetailsProps) {
  return (
    <details
      key={resetKey}
      className={isTable ? 'calc-details calc-details--table' : 'calc-details'}
    >
      <summary className="calc-summary">
        <span>Chi tiết</span>
        <ChevronIcon />
      </summary>
      <dl className="calc-rows">
        <div className="calc-row">
          <dt>Bạn chi</dt>
          <dd>{formatSourceAmount(result.budget, sourceCurrency)}</dd>
        </div>
        <div className="calc-row">
          <dt>Phí gửi</dt>
          <dd>{formatSourceAmount(result.fixedFee, sourceCurrency)}</dd>
        </div>
        <div className="calc-row">
          <dt>Số tiền đổi</dt>
          <dd>
            {result.convertedAmount !== null
              ? formatSourceAmount(result.convertedAmount, sourceCurrency)
              : '—'}
          </dd>
        </div>
        <div className="calc-row">
          <dt>Tỷ giá tham chiếu</dt>
          <dd>{`${formatRate(result.referenceRate, 6)} VND/${sourceCurrency}`}</dd>
        </div>
        <div className="calc-row">
          <dt>Biên tỷ giá</dt>
          <dd>{formatMarginPercent(result.margin)}</dd>
        </div>
        <div className="calc-row">
          <dt>Tỷ giá áp dụng</dt>
          <dd>{`${formatRate(result.appliedRate, 6)} VND/${sourceCurrency}`}</dd>
        </div>
        <div className="calc-row">
          <dt>Phí nhận</dt>
          <dd>0 ₫</dd>
        </div>
        <div className="calc-row">
          <dt>Nhận ước tính</dt>
          <dd>
            {result.estimatedReceiveVnd !== null
              ? formatVnd(result.estimatedReceiveVnd)
              : '—'}
          </dd>
        </div>
      </dl>
      <p className="calc-note">
        Biên tỷ giá là mức giảm giả định so với tỷ giá tham chiếu.
      </p>
      <p className="calc-note">Phí nhận giả định bằng 0.</p>
    </details>
  );
}
