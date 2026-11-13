# GỬI VỀ — BÁO CÁO TÓM TẮT DỰ ÁN MVP

**Tên dự án:** Gửi Về — Web App So Sánh Tiền Gửi Về Việt Nam  
**Phiên bản:** MVP 2.0 (Production Live)  
**Ngày hoàn thiện:** 13/11/2026  
**Repository GitHub:** [minhhal1180/gkkt](https://github.com/minhhal1180/gkkt)  
**Production URL:** [https://gui-ve.buixuanminh1801.workers.dev/](https://gui-ve.buixuanminh1801.workers.dev/)  

---

## 1. Tổng quan & Bài toán giải quyết

### 1.1. Bối cảnh & Mục tiêu
- **Đối tượng người dùng chính:** Người lao động, du học sinh và kiều bào Việt Nam đang làm việc tại **Nhật Bản**, **Hàn Quốc** và **Đài Loan**; phần lớn thao tác trên điện thoại thông minh.
- **Câu hỏi cốt lõi:** *"Với ngân sách này, gửi qua kênh nào người nhận tại Việt Nam sẽ nhận được nhiều tiền VND nhất theo các giả định/báo giá công bố?"*
- **Tuyến tiền hỗ trợ:**
  - **JPY → VND:** Nhật Bản (Yên Nhật)
  - **KRW → VND:** Hàn Quốc (Won Hàn Quốc)
  - **TWD → VND:** Đài Loan / Đài Bắc (Tân Đài Tệ)
- **Đích cố định:** Việt Nam (VND).

### 1.2. Nguyên tắc sản phẩm & Trung thực dữ liệu
- **Minh bạch hai lớp dữ liệu:**
  1. *Lớp trực tiếp (Live):* Tuyến JPY gọi qua API báo giá công khai; tuyến KRW và TWD đối chiếu bảng tỷ giá niêm yết công khai của các ngân hàng/tổ chức tài chính (Vietcombank, Bank of Taiwan, MoneyBox Seoul, ExchangeRate-API).
  2. *Lớp minh họa (Fallback):* Khi offline hoặc nguồn trực tiếp gián đoạn, tự động dự phòng sang ba cấu hình Kênh A, Kênh B, Kênh C với nhãn cảnh báo rõ ràng **"Ước tính · Phí minh họa"**.
- **Không gây hiểu nhầm:** Tuyệt đối không gắn nhãn tiếp thị phóng đại ("Tiết kiệm nhất thị trường", "Gửi ngay"), không rút gọn tiền nhận thành "16,3 triệu" trên dòng kết quả chính mà luôn hiển thị đủ từng chữ số kèm ký hiệu `₫` / `VND`.
- **Phạm vi MVP (Loại trừ):** Không tài khoản, không thực hiện chuyển tiền/thu thập thông tin ngân hàng người nhận, không quảng cáo/affiliate, không dark mode, không AI tư vấn phức tạp nhằm tối ưu tốc độ và độ tin cậy tuyệt đối.

---

## 2. Kiến trúc kỹ thuật & Ngăn xếp công nghệ

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT NGƯỜI DÙNG                          │
│  - React 19 + TypeScript + CSS thuần (Design Tokens)                   │
│  - Progressive Web App (PWA): Manifest, Icons, Service Worker          │
│  - Lưu đệm Offline: Cache Storage (App Shell) + localStorage (Snapshot)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
       [1] Static Assets                         [2] API Endpoint
   (/, /assets/*, /icons/*, sw.js)             (/api/quotes?...)
               │                                         │
               ▼                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE WORKERS & STATIC ASSETS                   │
│  - Định tuyến thông minh: run_worker_first: ["/api/*"]                 │
│  - worker/index.ts: Gateway thu thập & chuẩn hóa báo giá công khai     │
└──────┬────────────────────────────┬────────────────────────────┬───────┘
       │                            │                            │
       ▼                            ▼                            ▼
[Wise Comparison API]    [Vietcombank + MoneyBox]      [Bank of Taiwan]
     (JPY → VND)                  (KRW → VND)             (TWD → VND)
```

### 2.1. Ngăn xếp công nghệ (Tech Stack)
- **Frontend UI:** React 19, TypeScript 5.8, CSS thuần hiện đại (custom properties, không phụ thuộc Tailwind hay UI lib nặng).
- **Tính toán chính xác:** `decimal.js` (xử lý số thực không làm tròn sớm, chỉ làm tròn `ROUND_HALF_UP` một lần cuối sang đơn vị VND).
- **Backend Edge Gateway:** Cloudflare Worker (TypeScript, runtime V8 isolates) chạy kèm Static Assets, xử lý CORS, timeout, chuẩn hóa dữ liệu.
- **Tiêu chuẩn PWA:** `manifest.webmanifest`, bộ icon chuẩn (SVG, 192px, 512px, maskable, apple-touch-icon), `sw.js` precache tự động hash nội dung khi build.
- **Testing:** Vitest 3.2, `@testing-library/react`, `jsdom`, Playwright/CDP automation script.
- **Môi trường chuẩn:** Node.js major `24` LTS (khóa qua `.nvmrc` và `engines.node` `>=24 <25`).

### 2.2. Tổ chức mã nguồn
- `d:\BTGK\src\domain\`: Mô hình dữ liệu thuần, cấu hình kênh/tuyến, bộ phân tích ngân sách `parseBudgetInput()`, hàm so sánh toán học `compare()`, helper định dạng `vi-VN` và múi giờ `Asia/Ho_Chi_Minh`. Hoàn toàn độc lập, không phụ thuộc trình duyệt hay mạng.
- `d:\BTGK\src\services\`: Adapter gọi API tỷ giá mở `open.er-api.com`, quản lý cache `localStorage` kèm fallback bộ nhớ phiên, kiểm soát ranh giới 48 giờ, khử trùng lặp request đang bay (in-flight dedupe), client gọi `/api/quotes`.
- `d:\BTGK\src\components\`: Các thành phần giao diện (`Header`, `CompareForm`, `ResultsSection`, `ChannelDetails`, `DataSourceSection`, `ChevronIcon`).
- `d:\BTGK\src\styles\`: Hệ thống biến màu và kiểu dáng token (`tokens.css`, `app.css`).
- `d:\BTGK\src\pwa\`: Đăng ký Service Worker an toàn trong production (`registerSw.ts`).
- `d:\BTGK\worker\`: Mã nguồn Cloudflare Worker (`index.ts`) phục vụ endpoint `/api/quotes` và proxy dữ liệu tài chính công khai.

---

## 3. Chi tiết các tuyến tiền & Nguồn dữ liệu thực tế

| Tuyến | Ngân sách mặc định | Nguồn dữ liệu thực tế | Nhà cung cấp / Kênh hiển thị | Phí & Đặc điểm |
| :--- | :--- | :--- | :--- | :--- |
| **Nhật Bản (JPY)** | `100.000 JPY`<br>*(Gợi ý: 50k, 100k, 200k)* | **Wise Public Comparison API v4**<br>(live endpoint chính thức) | **1. Instarem**<br>**2. SBI Remit**<br>**3. Wise** | - Instarem: phí 0 JPY, tỷ giá ~159,75<br>- SBI Remit: phí 760 JPY, tỷ giá ~159,87<br>- Wise: phí 1.244 JPY, tỷ giá mid-market ~160,57 |
| **Hàn Quốc (KRW)** | `1.000.000 KRW`<br>*(Gợi ý: 500k, 1M, 2M)* | **Vietcombank XML**, **MoneyBox Seoul** & **Open ER-API** | **1. Tham chiếu liên ngân hàng**<br>**2. Vietcombank (Chuyển khoản)**<br>**3. MoneyBox (Quầy Seoul)** | - Vietcombank: Mua chuyển khoản ~18,50 VND/KRW<br>- MoneyBox: Quầy đổi tiền Seoul ~18,18 VND/KRW<br>- Tham chiếu: ~19,19 VND/KRW |
| **Đài Loan (TWD)** | `20.000 TWD`<br>*(Gợi ý: 10k, 20k, 50k)* | **Bank of Taiwan CSV (Đài Bắc)** & **Open ER-API** | **1. Tham chiếu liên ngân hàng**<br>**2. Ngân hàng Đài Loan (Đài Bắc)** | - Ngân hàng Đài Loan: Tỷ giá bán tiền mặt VND công khai ~689,65 VND/TWD<br>- Tham chiếu: ~780,28 VND/TWD |

> **Cơ chế Fallback thông minh:** Nếu mạng ngắt hoặc API bên thứ ba gặp sự cố, hệ thống chuyển sang tính toán theo biểu phí minh họa cố định (Kênh A: 1,5% margin; Kênh B: 0,5% margin; Kênh C: 2,5% margin) kết hợp snapshot tỷ giá còn hạn trong 48 giờ, luôn đảm bảo người dùng có kết quả tham khảo.

---

## 4. Trải nghiệm người dùng (UX) & Quy chuẩn Accessibility (a11y)

1. **Thứ tự ưu tiên thị giác:**
   - Người dùng chi bao nhiêu, bằng đồng tiền nào?
   - Người nhận nhận được bao nhiêu VND? (số to nhất, in đậm, căn phải, dùng `tabular-nums`).
   - Chênh lệch VND giữa các phương án so với phương án dẫn đầu (*Nhận cao nhất*).
   - Công thức trừ phí, tỷ giá áp dụng, biên tỷ giá khi mở **Chi tiết**.
2. **Nguyên tắc mở dần thông tin (Progressive Disclosure):**
   - Mặc định chỉ hiển thị tóm tắt kênh, số tiền nhận, phí và badge xếp hạng.
   - Chi tiết phép tính ẩn trong thẻ ngữ nghĩa `<details>/<summary>`, người dùng mở độc lập từng kênh mà không bị tải lại trang hay mở pop-up che khuất màn hình.
3. **Phân tách trạng thái Nháp (Draft) và Đã so sánh (Submitted):**
   - Khi sửa ngân sách sau khi đã bấm so sánh, kết quả VND cũ lập tức ẩn đi và hiển thị lời nhắc: *"Bấm So sánh để cập nhật."* để tránh nhầm lẫn giữa số cũ và số mới.
4. **Chuẩn hóa nhập liệu:**
   - Chấp nhận số nguyên `1` đến `999.999.999`.
   - Tự động bỏ qua dấu chấm, phẩy, khoảng trắng phân cách ngàn hợp lệ (ví dụ `100.000`, `100,000`, `100 000` đều nhận là `100000`).
   - Báo lỗi rõ ràng tiếng Việt khi nhập số thập phân (`100.50`), số âm, số mũ hoặc vượt 9 chữ số; tự động đưa focus về lại trường nhập và bảo toàn chuỗi người dùng đã gõ.
5. **Tiêu chuẩn WCAG 2.2 AA:**
   - Tương phản màu vượt chuẩn: Chữ chính `#172B4D` trên nền trắng đạt **14,1:1**; nút bấm `#155EEF` đạt **5,4:1**; viền focus rõ ràng **3px solid #155EEF offset 2px**.
   - Touch target: Vùng chạm tối thiểu **44 × 44 px** (ưu tiên **48 px** trên điện thoại di động).
   - Responsive Reflow: Co giãn hoàn hảo từ **320 px** (không cuộn ngang toàn trang) đến màn hình desktop lớn (bố cục 2 cột: form 320 px bên trái, bảng bên phải).
   - Hỗ trợ tốt `prefers-reduced-motion` và trình đọc màn hình với thẻ ngữ nghĩa `lang="vi"`, `aria-live="polite"`.

---

## 5. Bảng Token UX/UI & Microcopy chuẩn hóa

### 5.1. Bảng Design Tokens
| Token | Giá trị | Vai trò | Tỷ lệ tương phản |
| :--- | :--- | :--- | :--- |
| `page` | `#F5F7F9` | Nền toàn trang | — |
| `surface` | `#FFFFFF` | Nền thẻ, bảng, form | — |
| `text` | `#172B4D` | Chữ chính | ~14,10:1 (trên trắng) |
| `text-secondary` | `#52616B` | Nhãn phụ, giải thích | ~6,40:1 (trên trắng) |
| `primary` | `#155EEF` | Nút chính, liên kết, viền focus | ~5,41:1 (chữ trắng) |
| `primary-hover` | `#124ECC` | Hover nút chính | — |
| `border-control` | `#718096` | Viền ô nhập liệu | ~4,02:1 (trên trắng) |
| `border-decorative`| `#D8E0E7` | Đường kẻ phân cách | — |
| `success` / `bg` | `#166534` / `#F0FDF4` | Nhãn "Nhận cao nhất" | ~6,81:1 |
| `warning` / `bg` | `#92400E` / `#FFFBEB` | Cảnh báo dữ liệu lưu cũ | ~6,84:1 |
| `error` / `bg` | `#B42318` / `#FEF3F2` | Thông báo lỗi | ~6,05:1 |

### 5.2. Danh mục Microcopy đã chốt
- **Tiêu đề chính (H1):** *Gửi về, nhận bao nhiêu?*
- **Nhãn trường nhập:** *Bạn chi* · Gợi ý: *Đã gồm phí* · Đích: *Về Việt Nam · VND*
- **Nút hành động:** *So sánh* · Trạng thái chờ: *Đang lấy tỷ giá…*
- **Badge xếp hạng:** *Nhận cao nhất* · *Đồng hạng* · *Không đủ trả phí*
- **Mở rộng chi tiết:** *Chi tiết* · *Nguồn* · *Nguồn dữ liệu*
- **Thông báo lỗi nhập liệu:**
  - Trống / 0 / Âm: *"Nhập số tiền lớn hơn 0."*
  - Số thập phân / ký tự lạ: *"Nhập số nguyên, ví dụ 100.000."*
  - Quá giới hạn: *"Nhập tối đa 999.999.999."*
- **Thông báo trạng thái dữ liệu:**
  - Sửa tiền sau kết quả: *"Bấm So sánh để cập nhật."*
  - Dữ liệu lưu cũ: *"Đang dùng tỷ giá ngày DD/MM/YYYY."*
  - Mất mạng / Lỗi tỷ giá: *"Chưa lấy được tỷ giá. Thử lại."*
  - Dữ liệu quá 48h: *"Tỷ giá đã cũ. Cập nhật để so sánh."*

---

## 6. Kết quả Kiểm thử & Chất lượng (Quality Assurance)

Tất cả kiểm thử được xác minh tự động thông qua script cổng kiểm soát chất lượng `npm run verify` (`typecheck` → `test:run` → `build`):

```bash
> npm run verify
✓ tsc --noEmit (Passed - 0 errors)
✓ vitest run (Passed 5/5 test files, 65/65 tests passed)
  - src/domain/domain.test.ts (17 tests: L01–L07 toán học fixture, U04–U05 parse ngân sách)
  - src/services/fxService.test.ts (27 tests: L08 validation, U06 dedupe, U07 offline/429, U08 localStorage fallback, U09 ranh giới 48h)
  - src/App.test.tsx (13 tests: U01–U10 luồng người dùng, desktop table, live provider fallback)
  - worker/worker.test.ts (5 tests: endpoint /api/quotes, Wise parser, Vietcombank XML, Bank of Taiwan CSV)
  - src/pwa/pwa.test.ts (3 tests: manifest, icons, service worker cross-origin exclusion)
✓ vite build (Clean dist/ output: HTML, CSS, JS, sw.js precache)
```

### Kiểm thử thực tế trên trình duyệt Microsoft Edge qua giao thức CDP:
- **Kiểm thử trực tiếp trên URL Production:** [https://gui-ve.buixuanminh1801.workers.dev/](https://gui-ve.buixuanminh1801.workers.dev/)
- **Kết quả đo lường thực tế:**
  - API trực tiếp: Tuyến JPY gọi Wise API thành công (Instarem, SBI Remit, Wise); tuyến KRW hiển thị Vietcombank + MoneyBox Seoul; tuyến TWD hiển thị Ngân hàng Đài Loan (Đài Bắc).
  - Không có bất kỳ lỗi JavaScript Console hay lỗi mạng ngầm nào (`consoleErrors: []`, `failedRequests: []`).
  - Co giãn màn hình: Đo đạc chính xác tại `320px`, `375px`, `768px`, `1024px`, `1440px` và chế độ zoom 200% (`scrollWidth <= innerWidth` 100%, không cụt số, không vỡ khung).
  - PWA Offline: Đạt trạng thái Service Worker `activated` (`controller: true`), ngắt mạng hoàn toàn (`offline: true`) và reload trang thì ứng dụng vẫn mở tức thì và so sánh bình thường nhờ snapshot đệm.

---

## 7. Hướng dẫn Chạy, Triển khai & Vận hành

### 7.1. Chạy cục bộ (Local Development)
```powershell
# Di chuyển vào thư mục dự án
cd d:\BTGK

# Cài đặt gói phụ thuộc theo lockfile
npm ci

# Khởi chạy dev server (mặc định port 5173)
npm run dev

# Chạy toàn bộ kiểm thử đơn vị & kiểm tra kiểu
npm run verify
```

### 7.2. Triển khai lên Cloudflare Workers
Dự án được cấu hình sẵn trong [wrangler.jsonc](file:///d:/BTGK/wrangler.jsonc):
```jsonc
{
  "name": "gui-ve",
  "main": "worker/index.ts",
  "compatibility_date": "2026-11-10",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```
Mỗi khi đẩy mã nguồn lên nhánh `main` của GitHub [minhhal1180/gkkt](https://github.com/minhhal1180/gkkt), Cloudflare sẽ tự động nhận diện, chạy `npm run build` và phát hành phiên bản mới chỉ trong vòng dưới 1 phút.

### 7.3. Quy trình Rollback khi có sự cố
1. Truy cập **Cloudflare Dashboard → Workers & Pages → gui-ve → Deployments**.
2. Chọn phiên bản triển khai thành công trước đó (ghi nhận ID phiên bản).
3. Bấm **Rollback to this deployment** để khôi phục trạng thái hoạt động ngay lập tức trong 5 giây mà không cần build lại mã nguồn.

---

## 8. Kịch bản Trình diễn (Demo Script 3 Phút)

- **Phút 0:00 – 0:30 (Ý tưởng & Thiết kế):** Mở giao diện trên điện thoại / co nhỏ trình duyệt về 360px. Giới thiệu bài toán kiều bào chuyển tiền về nước, tiêu đề trực diện *"Gửi về, nhận bao nhiêu?"*, đích đến cố định là tiền Đồng (VND).
- **Phút 0:30 – 1:15 (Tuyến Nhật Bản & Báo giá Live):** Chọn **Nhật Bản (100.000 JPY)**, nhấn **So sánh**. Chỉ rõ thông tin bảng so sánh trực tiếp từ Wise API: Instarem đứng đầu với 15.975.041 ₫, SBI Remit phí 760 JPY, Wise phí 1.244 JPY. Mở phần **Chi tiết** để xem thời điểm thu thập dữ liệu và công thức tính.
- **Phút 1:15 – 2:00 (Tuyến Hàn Quốc & Đài Loan):** Chuyển sang **Hàn Quốc (KRW)** (ngân sách tự động về 1.000.000 KRW, xóa sạch bảng cũ), nhấn **So sánh** để thấy đối chiếu giữa Vietcombank Mua chuyển khoản và Quầy đổi tiền MoneyBox Seoul. Chuyển sang **Đài Loan (TWD)** để xem tỷ giá Ngân hàng Đài Loan (Đài Bắc).
- **Phút 2:00 – 2:30 (Kiểm soát lỗi & Độ tin cậy):** Nhập thử số tiền lỗi `100.50` hoặc số âm. Hệ thống thông báo lỗi tiếng Việt thân thiện, không xóa mất chữ người dùng gõ, tự động focus lại ô nhập. Nhập số hợp lệ, bấm so sánh, sau đó gõ số khác thì màn hình ẩn số cũ và báo *"Bấm So sánh để cập nhật."*.
- **Phút 2:30 – 3:00 (PWA & Khả năng Offline):** Trình diễn tính năng cài đặt ứng dụng (PWA icon trên màn hình chính). Bật chế độ máy bay (ngắt mạng) và tải lại trang: website vẫn mở tức thì, vẫn thực hiện tính toán được nhờ bộ đệm Service Worker và localStorage.

---

## 9. Hướng phát triển tiếp theo (Post-MVP)

1. **Mở rộng API chính thức:** Đăng ký tài khoản doanh nghiệp với các đối tác chuyển tiền tại Hàn Quốc (Hanpass, SentBe) và Đài Loan (VietMoney/EUI) để tích hợp API báo giá thời gian thực có chứng thực.
2. **Theo dõi biến động tỷ giá:** Bổ sung tính năng thông báo (Push Notification qua PWA) khi tỷ giá chạm ngưỡng kỳ vọng của người dùng.
3. **Thêm phương thức nhận tiền:** Tùy chọn so sánh theo hình thức nhận (nhận tiền mặt tại quầy, chuyển khoản 24/7 qua Napas, hoặc nhận qua ví MoMo/ZaloPay).
4. **Đa ngôn ngữ bổ trợ:** Hỗ trợ song ngữ Việt – Nhật, Việt – Hàn, Việt – Trung cho người dùng bản địa có nhu cầu gửi tiền sang Việt Nam.
