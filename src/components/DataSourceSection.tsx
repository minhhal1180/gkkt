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
              <dt>Báo giá nhà cung cấp thực tế (JPY → VND)</dt>
              <dd>
                Tuyến Nhật Bản lấy báo giá công khai trực tiếp qua Cloudflare
                Worker từ{' '}
                <a
                  href="https://wise.com/gb/compare/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wise Public Comparison API v4
                </a>{' '}
                (Instarem, SBI Remit, Wise — phương thức chuyển khoản tiêu
                chuẩn).
              </dd>
            </div>
            <div className="data-source-item">
              <dt>Tính chất phí và biên tỷ giá (KRW, TWD hoặc khi dự phòng)</dt>
              <dd>
                Tuyến Hàn Quốc (Hanpass, SentBe, GmoneyTrans) và Đài Loan
                (VietMoney, Western Union) hiện chưa có API báo giá công khai
                không cần khóa nên vẫn dùng cấu hình Kênh A, Kênh B, Kênh C
                minh họa giả định kết hợp tỷ giá tham chiếu.
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
