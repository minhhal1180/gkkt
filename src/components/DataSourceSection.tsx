import type { RefObject } from 'react';
import { ChevronIcon } from './ChevronIcon';

interface DataSourceSectionProps {
  sourceUpdatedAt: number | null;
  fetchedAt: number | null;
  formatDateTime: (epochMs: number) => string;
  detailsRef: RefObject<HTMLDetailsElement | null>;
  summaryRef: RefObject<HTMLElement | null>;
}

export function DataSourceSection({
  sourceUpdatedAt,
  fetchedAt,
  formatDateTime,
  detailsRef,
  summaryRef,
}: DataSourceSectionProps) {
  return (
    <section className="data-source-section" aria-labelledby="nguon-du-lieu-heading">
      <details ref={detailsRef} id="nguon-du-lieu">
        <summary
          ref={summaryRef}
          id="nguon-du-lieu-heading"
          className="data-source-summary"
        >
          <span>Nguồn dữ liệu</span>
          <ChevronIcon />
        </summary>
        <div className="data-source-body">
          <dl className="data-source-list">
            <div className="data-source-item">
              <dt>Nguồn tỷ giá tham chiếu</dt>
              <dd>ExchangeRate-API (Open Access, quy đổi qua USD)</dd>
            </div>
            <div className="data-source-item">
              <dt>Thời điểm cập nhật từ nguồn</dt>
              <dd className="tabular-nums">
                {sourceUpdatedAt !== null
                  ? formatDateTime(sourceUpdatedAt)
                  : 'Chưa có dữ liệu tỷ giá'}
              </dd>
            </div>
            <div className="data-source-item">
              <dt>Thời điểm tải dữ liệu</dt>
              <dd className="tabular-nums">
                {fetchedAt !== null
                  ? formatDateTime(fetchedAt)
                  : 'Chưa có dữ liệu tỷ giá'}
              </dd>
            </div>
            <div className="data-source-item">
              <dt>Tần suất cập nhật</dt>
              <dd>Mỗi ngày một lần theo lịch từ nguồn.</dd>
            </div>
            <div className="data-source-item">
              <dt>Dữ liệu công khai theo từng tuyến</dt>
              <dd>
                <strong>Nhật Bản (JPY):</strong> Wise Public Comparison API v4
                (Instarem, SBI Remit, Wise). <strong>Hàn Quốc (KRW):</strong>{' '}
                Vietcombank (Mua chuyển khoản), MoneyBox Seoul (quầy đổi tiền)
                và ExchangeRate-API. <strong>Đài Loan / Đài Bắc (TWD):</strong>{' '}
                Ngân hàng Đài Loan (Bank of Taiwan · Đài Bắc) và
                ExchangeRate-API.
              </dd>
            </div>
            <div className="data-source-item">
              <dt>Chế độ dự phòng phí minh họa</dt>
              <dd>
                Khi ngoại tuyến hoặc nguồn trực tiếp tạm gián đoạn, hệ thống tự
                động dùng Kênh A, Kênh B, Kênh C (phí minh họa) kết hợp bản lưu
                tỷ giá gần nhất (tối đa 48 giờ).
              </dd>
            </div>
            <div className="data-source-item">
              <dt>Giới hạn mô hình</dt>
              <dd>
                Phí nhận giả định bằng 0, không tính bậc phí theo số tiền hay ưu
                đãi khách hàng mới; chỉ hỗ trợ tham khảo tuyến JPY, KRW, TWD về
                VND.
              </dd>
            </div>
            <div className="data-source-item">
              <dt>Ghi nguồn</dt>
              <dd>
                <a
                  href="https://www.exchangerate-api.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rates By Exchange Rate API (exchangerate-api.com)
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </details>
    </section>
  );
}
