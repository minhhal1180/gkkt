# Gửi Về — So sánh tiền gửi về Việt Nam (MVP)

Ứng dụng web tiếng Việt giúp người lao động tại **Nhật Bản (JPY)**, **Hàn Quốc (KRW)** và **Đài Loan (TWD)** ước tính và so sánh số tiền **VND** người nhận tại Việt Nam có thể nhận được khi chi cùng một ngân sách gửi (đã bao gồm phí).

> **Lưu ý tính chất dữ liệu:** Tỷ giá tham chiếu lấy trực tiếp từ API mở (`open.er-api.com`, gốc USD). Biểu phí và biên tỷ giá của ba kênh (Kênh A, Kênh B, Kênh C) là **cấu hình minh họa giả định** để so sánh mô hình — **không phải** báo giá giao dịch thực tế hay tên nhà cung cấp thật.

---

## 1. Yêu cầu môi trường và lệnh chạy

- **Node.js:** Major `24` (xem `.nvmrc`, khuyến nghị `>=24 <25`, dùng `npm ci` với `package-lock.json` đã khóa).
- **Công nghệ:** React + Vite + TypeScript, CSS thuần, `decimal.js`, Vitest + Testing Library (`jsdom`).

```bash
# Cài đặt phụ thuộc từ lockfile
npm ci

# Chạy máy chủ phát triển
npm run dev

# Kiểm tra kiểu TypeScript
npm run typecheck

# Chạy kiểm thử đơn vị & hành vi
npm run test:run

# Build bản production (xuất ra thư mục dist/)
npm run build

# Cổng kiểm tra tổng hợp (dùng cho CI / Cloudflare Pages)
npm run verify
```

---

## 2. Cấu trúc thư mục chính

- `index.html`: Tài liệu gốc `lang="vi"`, không tải font hay analytics bên ngoài.
- `src/domain/`: Hợp đồng kiểu dữ liệu, cấu hình tuyến tiền/kênh, bộ phân tích & kiểm tra ngân sách, phép tính thuần `compare()` bằng `decimal.js`, hàm định dạng `vi-VN`.
- `src/services/`: Gọi `GET https://open.er-api.com/v6/latest/USD` (timeout 8 giây), kiểm tra tính hợp lệ, lưu đệm `localStorage` có fallback bộ nhớ phiên, kiểm soát độ mới 48 giờ và cooldown 60 phút.
- `src/components/`, `src/styles/`, `src/App.tsx`, `src/main.tsx`: Giao diện responsive, accessibility và luồng tương tác.

---

## 3. Hướng dẫn cập nhật cấu hình phí & biên tỷ giá

Cấu hình ba kênh minh họa (`CHANNELS`) và cấu hình tuyến tiền (`COUNTRIES`) nằm trong [`src/domain/config.ts`](src/domain/config.ts).

| Kênh | Phí JPY | Phí KRW | Phí TWD | Biên giảm tỷ giá |
| --- | ---: | ---: | ---: | ---: |
| Kênh A | 400 | 4.000 | 100 | 1,5% (`0.015`) |
| Kênh B | 800 | 8.000 | 200 | 0,5% (`0.005`) |
| Kênh C | 0 | 0 | 0 | 2,5% (`0.025`) |

Cấu hình tuyến tiền mặc định và mức gợi ý:

| Quốc gia | Tiền | Mặc định | Mức gợi ý (Preset) |
| --- | --- | ---: | --- |
| Nhật Bản | JPY | 100.000 | 50.000 / 100.000 / 200.000 |
| Hàn Quốc | KRW | 1.000.000 | 500.000 / 1.000.000 / 2.000.000 |
| Đài Loan | TWD | 20.000 | 10.000 / 20.000 / 50.000 |

**Quy trình khi sửa cấu hình phí/biên tỷ giá:**
1. Cập nhật `CHANNELS` trong [`src/domain/config.ts`](src/domain/config.ts), giữ nguyên `dataKind: 'illustrative'` trừ khi chuyển sang giai đoạn dữ liệu thật đã xác minh.
2. Cập nhật hoặc bổ sung fixture kiểm thử tương ứng trong [`src/domain/domain.test.ts`](src/domain/domain.test.ts).
3. Chạy `npm run verify` (`typecheck` → `test:run` → `build`) và kiểm tra nhãn **"Ước tính · Phí minh họa"** vẫn hiển thị sát vùng kết quả.

---

## 4. Deploy và Rollback trên Cloudflare Pages

### 4.1. Cấu hình build

| Hạng mục | Giá trị |
| --- | --- |
| Hosting | Cloudflare Pages |
| Nhánh Production | `main` |
| Nhánh Preview | Nhánh tính năng / Pull Request |
| Node version | Major `24` (qua `.nvmrc` hoặc biến môi trường `NODE_VERSION=24`) |
| Build command | `npm run verify` |
| Build output directory | `dist` |
| Biến môi trường / Secrets | Không cần (API mở không dùng key) |

### 4.2. Quy trình phát hành

1. Chạy `npm run verify` đạt trên máy phát triển.
2. Push nhánh tính năng lên GitHub để tạo bản **Preview** trên Cloudflare Pages.
3. Kiểm tra trực tiếp trên origin Preview: gọi API tỷ giá, thử cả 3 tuyến (JPY, KRW, TWD), form validation, nhãn minh họa và giao diện mobile/desktop.
4. Merge vào `main` khi đạt checklist; Cloudflare Pages tự chạy `npm run verify` trước khi xuất bản `dist`.
5. Kiểm tra URL production: tải mới, reload trang (kiểm tra đọc bản lưu `localStorage`), bấm **So sánh**, mở **Chi tiết** và **Nguồn**.
6. Ghi lại commit hash và URL production đã kiểm tra vào mục **Trạng thái kiểm thử & bàn giao** ở cuối tài liệu này.

### 4.3. Rollback

- Nếu phát hiện sai phép tính hoặc lỗi giao diện nghiêm trọng sau khi deploy:
  1. Vào **Cloudflare Dashboard → Workers & Pages → dự án Gửi Về → Deployments**.
  2. Chọn bản deploy **production** thành công gần nhất và nhấn **Rollback to this deployment** (không dùng bản Preview làm đích rollback production).
  3. Khắc phục lỗi trên nhánh mã nguồn, chạy `npm run verify`, thử lại trên Preview rồi mới merge lại vào `main`.

---

## 5. Bảng token UX/UI

### 5.1. Màu sắc

| Token | Giá trị | Cách dùng |
| --- | --- | --- |
| `page` | `#F5F7F9` | Nền trang |
| `surface` | `#FFFFFF` | Form, bảng, thẻ |
| `text` | `#172B4D` | Chữ chính (~14,10:1 trên trắng) |
| `text-secondary` | `#52616B` | Nhãn phụ (~6,40:1 trên trắng) |
| `primary` | `#155EEF` | Nút chính và liên kết (chữ trắng ~5,41:1) |
| `primary-hover` | `#124ECC` | Hover nút chính |
| `border-decorative` | `#D8E0E7` | Phân cách trang trí |
| `border-control` | `#718096` | Viền trường nhập (~4,02:1 trên trắng) |
| `success` / `background` | `#166534` / `#F0FDF4` | Nhãn nhận cao nhất (~6,81:1) |
| `warning` / `background` | `#92400E` / `#FFFBEB` | Đang dùng dữ liệu cũ (~6,84:1) |
| `error` / `background` | `#B42318` / `#FEF3F2` | Lỗi (~6,05:1) |

### 5.2. Chữ, số và khoảng cách

- **Font:** `system-ui, -apple-system, "Segoe UI", sans-serif` (không tải font ngoài).
- **Số liệu:** `font-variant-numeric: tabular-nums`, căn phải các cột tiền và tỷ giá.
- **Thang khoảng cách:** `4, 8, 12, 16, 24, 32, 48 px`.
- **Layout:** `max-width: 1120 px`; một cột ở `320–1023 px` (thẻ), hai cột từ `1024 px` (form `320 px` bên trái + bảng bên phải).
- **Touch target & Focus:** Vùng bấm tối thiểu `44 × 44 px` (ưu tiên `48 px` trên mobile); focus ring `3 px` màu `primary`, `offset 2 px`; tôn trọng `prefers-reduced-motion: reduce`.

---

## 6. Bảng microcopy đã chốt

| Vị trí | Nội dung |
| --- | --- |
| Tên ứng dụng | Gửi Về |
| Tiêu đề chính (H1) | Gửi về, nhận bao nhiêu? |
| Nhãn số tiền | Bạn chi |
| Helper số tiền | Đã gồm phí |
| Đích | Về Việt Nam · VND |
| Nút hành động (CTA) | So sánh |
| Nhãn tính chất dữ liệu | Ước tính · Phí minh họa |
| Tiêu đề kết quả | Kết quả |
| Số tiền chính | Nhận ước tính |
| Badge hạng đầu | Nhận cao nhất |
| Đồng hạng | Đồng hạng |
| Mở phép tính | Chi tiết |
| Dữ liệu đang tải | Đang lấy tỷ giá… |
| Lỗi trống / 0 / âm | Nhập số tiền lớn hơn 0. |
| Lỗi định dạng | Nhập số nguyên, ví dụ 100.000. |
| Lỗi giới hạn | Nhập tối đa 999.999.999. |
| Khi sửa ngân sách sau kết quả | Bấm So sánh để cập nhật. |
| Có bản lưu cũ | Đang dùng tỷ giá ngày DD/MM/YYYY. |
| Không có tỷ giá | Chưa lấy được tỷ giá. Thử lại. |
| Dữ liệu quá 48 giờ | Tỷ giá đã cũ. Cập nhật để so sánh. |
| Kênh không đủ ngân sách | Không đủ trả phí |
| Hành động thử lại | Thử lại |

---

## 7. Nguồn dữ liệu và tham khảo

- **API tỷ giá tham chiếu:** [ExchangeRate-API Open Access](https://www.exchangerate-api.com/docs/free) (`GET https://open.er-api.com/v6/latest/USD`, cập nhật hằng ngày, ghi nguồn theo [Điều khoản](https://www.exchangerate-api.com/terms)).
- **Quy chuẩn Accessibility:** W3C WCAG 2.2 AA ([Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- **Quy chuẩn hosting:** [Cloudflare Pages Build Configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).

---

## 8. Kịch bản demo 3 phút

1. **0:00 – 0:30 · Giới thiệu bài toán & tính minh bạch:** Mở trang chính ở khung nhìn mobile/desktop, chỉ ra tiêu đề *"Gửi về, nhận bao nhiêu?"*, ba quốc gia gửi (Nhật Bản, Hàn Quốc, Đài Loan) và đích cố định *"Về Việt Nam · VND"*.
2. **0:30 – 1:15 · So sánh tuyến Nhật Bản (100.000 JPY):** Nhấn **So sánh**, chỉ vào nhãn *"Ước tính · Phí minh họa"* và *"Tỷ giá ngày DD/MM/YYYY · Nguồn"*. Chỉ kênh đứng đầu (*"Nhận cao nhất"*) và chênh lệch VND giữa các kênh.
3. **1:15 – 2:00 · Minh bạch phép tính & nguồn dữ liệu:** Mở **Chi tiết** của một kênh để xem từng bước (`Bạn chi` → `Phí gửi` → `Số tiền đổi` → `Tỷ giá tham chiếu` → `Biên tỷ giá` → `Tỷ giá áp dụng` → `Phí nhận = 0` → `Nhận ước tính`). Mở **Nguồn** để xem thời điểm cập nhật từ API và giới hạn mô hình.
4. **2:00 – 2:35 · Đổi tuyến và kiểm tra nhập liệu:** Chuyển sang **Hàn Quốc (KRW)** (ngân sách tự về `1.000.000`, kết quả cũ xóa sạch), chọn mức gợi ý hoặc nhập sai như `100.50` để minh họa thông báo lỗi rõ ràng, giữ lại giá trị cho người dùng sửa.
5. **2:35 – 3:00 · Độ tin cậy & giới hạn MVP:** Giải thích cơ chế cache 48 giờ, không dùng dữ liệu giả khi API lỗi, không lưu số tiền người dùng, và hướng nâng cấp sau MVP (chỉ đổi tên kênh thành nhà cung cấp thật khi đã xác minh biểu phí và điều khoản).

---

## 9. Trạng thái kiểm thử & bàn giao

### 9.1. Đã chạy và đạt trong môi trường phát triển (Node `v24.11.1`, `jsdom`)

Lệnh cổng kiểm tra `npm run verify` đạt (exit code `0`):

- **`npm run typecheck`** (`tsc --noEmit`): đạt, không lỗi kiểu.
- **`npm run test:run`** (`vitest run`): **3 tệp kiểm thử đạt, 56/56 test đạt**, không có test bị bỏ qua:
  - [`src/domain/domain.test.ts`](src/domain/domain.test.ts) (17 tests): kiểm tra toàn bộ quy tắc tính toán **L01–L07** (bao gồm fixture Nhật `B=100.000`, `R=165` → `B=16.286.160`, `A=16.187.490`, `C=16.087.500`; chênh lệch `98.670` và `198.660`; cross-rate; làm tròn `ROUND_HALF_UP` một lần cuối; đồng hạng; không đủ trả phí), phân tích ngân sách **U04–U05**, và định dạng `vi-VN` / múi giờ `Asia/Ho_Chi_Minh`.
  - [`src/services/fxService.test.ts`](src/services/fxService.test.ts) (27 tests): kiểm tra xác thực dữ liệu **L08**, chống trùng request **U06**, xử lý timeout/offline/HTTP 429 **U07**, fallback bộ nhớ phiên khi `localStorage` lỗi **U08**, và ranh giới đúng 48 giờ / quá 48 giờ + 1 ms **U09**.
  - [`src/App.test.tsx`](src/App.test.tsx) (12 tests): kiểm tra tích hợp hành vi người dùng **U01–U10** (Enter để gửi, đổi quốc gia reset mặc định và xóa kết quả cũ, tách `draft`/`submitted`, chuẩn hóa số nhập, bảo toàn dữ liệu khi lỗi và focus lại ô nhập, hủy kết quả submit cũ khi đổi tuyến lúc đang tải, progressive disclosure `Chi tiết` / `Nguồn dữ liệu`, trường hợp tất cả kênh không đủ phí, bố cục desktop/mobile).
- **`npm run build`** (`vite build`): đóng gói sạch vào `dist/` (`dist/index.html`, `dist/assets/index-Dkfsrg2F.css`, `dist/assets/index-CgyA-MNH.js`).

### 9.2. Đã kiểm thử trực tiếp trên Microsoft Edge cục bộ (`http://localhost:4173/`)

Kiểm thử tự động qua CDP trên **Microsoft Edge** (`Edg/157.0.0.0`) nối với bản build production (`vite preview`):

- **Gọi API thực tế `GET https://open.er-api.com/v6/latest/USD`:** HTTP `200`, không có lỗi console hay lỗi mạng.
- **Ba tuyến tiền thực tế (`12/11/2026`):**
  - Nhật Bản (`100.000 JPY`): `Kênh B` (`15.875.335 ₫`, Nhận cao nhất), `Kênh A` (`15.779.154 ₫`), `Kênh C` (`15.681.687 ₫`).
  - Hàn Quốc (`1.000.000 KRW`): tự reset ngân sách và xóa kết quả cũ khi đổi nước; `Kênh B` (`18.946.033 ₫`), `Kênh A` (`18.831.248 ₫`), `Kênh C` (`18.714.927 ₫`).
  - Đài Loan (`20.000 TWD`): tự reset ngân sách và xóa kết quả cũ khi đổi nước; `Kênh B` (`15.372.421 ₫`), `Kênh A` (`15.294.782 ₫`), `Kênh C` (`15.215.583 ₫`).
- **Mở chi tiết & nguồn dữ liệu:** `<details>` `Chi tiết` và `#nguon-du-lieu` mở độc lập, hiển thị giờ cập nhật/tải theo `Asia/Ho_Chi_Minh`.
- **Kiểm tra nhập liệu & lưu đệm khi reload:** Nhập `100.50` báo lỗi `"Nhập số nguyên, ví dụ 100.000."`, giữ nguyên giá trị và focus vào ô nhập; sửa ngân sách sau kết quả ẩn số cũ và hiện `"Bấm So sánh để cập nhật."`; reload trang vẫn đọc `guive_fx_snapshot_v1` từ `localStorage` mà không gọi lại API.
- **Responsive reflow & giả lập zoom 200%:** Kiểm tra tại `320`, `375`, `768`, `1.024`, `1.440` CSS px và khung nhìn 200% (`320` / `640` CSS px ở `deviceScaleFactor: 2`) — `scrollWidth <= innerWidth` ở mọi mốc, thẻ xếp dọc ở `< 1.024 px`, form `320 px` + bảng ở `>= 1.024 px`, không cắt số tiền VND.

### 9.3. Chưa chạy (cần thiết bị/người thật hoặc hạ tầng deploy)

- Kiểm tra trên thiết bị di động thật.
- Kiểm tra thực tế bằng trình đọc màn hình (NVDA / VoiceOver / TalkBack).
- Thử nghiệm người dùng nhanh (2–3 người thử với 3 tác vụ mục tiêu tại §14.3).
- Triển khai thực tế lên **Cloudflare Pages** (chưa có URL `*.pages.dev` và commit hash phát hành; cập nhật hai thông tin này sau khi thực hiện bước 6 ở mục 4.2).

### 9.4. Thông tin phát hành (điền khi deploy)

- **URL production:** *(chưa triển khai)*
- **Commit đã kiểm tra:** *(chưa triển khai)*
