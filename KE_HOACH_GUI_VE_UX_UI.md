# GỬI VỀ — KẾ HOẠCH MVP 20 GIỜ VÀ QUY CHUẨN UX/UI

Phiên bản: 2.0 · Ngày lập: 12/11/2026 · Trạng thái: đặc tả để triển khai, chưa xây dựng website.

## 1. Quyết định sản phẩm

Xây một website tiếng Việt giúp so sánh số tiền ước tính người nhận tại Việt Nam nhận được khi người gửi chi cùng một ngân sách tại Nhật Bản, Hàn Quốc hoặc Đài Loan.

| Hạng mục | Quyết định |
| --- | --- |
| Người dùng chính | Người Việt đang làm việc tại Nhật, Hàn, Đài Loan; ưu tiên dùng điện thoại |
| Câu hỏi cần trả lời | Với ngân sách này, phương án nào cho số tiền nhận cao hơn theo các giả định đã công bố? |
| Tuyến tiền | JPY → VND; KRW → VND; TWD → VND |
| Thời gian | 20 giờ công cho một người quen React; gồm 2 giờ dự phòng |
| Tỷ giá | Dữ liệu tham chiếu thật, API cập nhật hằng ngày |
| Phí/biên tỷ giá | Ba cấu hình minh họa cho mỗi tuyến; sửa trong mã nguồn |
| Phạm vi chức năng | Chọn tuyến, nhập ngân sách, so sánh, xem phép tính, xem nguồn dữ liệu |
| Bản triển khai | Website tĩnh công khai trên Cloudflare Pages |

Phải phân biệt hai lớp dữ liệu trên giao diện: tỷ giá tham chiếu từ API và phí/biên tỷ giá giả định. Không gắn tên hoặc logo công ty chuyển tiền thật cho biểu phí minh họa. Kết quả không phải báo giá giao dịch.

Không đưa vào MVP: tài khoản, chuyển tiền, thu thập thông tin người nhận, dashboard quản trị, AI tư vấn, bản đồ, biểu đồ lịch sử, thông báo tỷ giá, đa ngôn ngữ, dark mode, affiliate và tích hợp API báo giá từng nhà cung cấp.

## 2. Sản phẩm tham khảo và cách áp dụng

Khảo sát cấu trúc và nội dung công khai; không coi đây là kiểm thử tương tác đầy đủ hoặc đo kích thước giao diện các sản phẩm. Các thông số thiết kế ở phần sau là quyết định riêng của Gửi Về.

| Sản phẩm | Quan sát từ trang công khai | Áp dụng vào Gửi Về |
| --- | --- | --- |
| [Wise Compare](https://wise.com/gb/compare/) | Bộ nhập tiền/đồng tiền và bảng gồm nhà cung cấp, tỷ giá, phí, tiền nhận; có đường mở giải thích dữ liệu | Giữ cấu trúc bộ nhập liệu → kết quả cùng ngân sách; số tiền nhận làm thông tin chính; bảng cho desktop |
| [Exiap](https://www.exiap.com/) | So sánh số tiền nhận, hiển thị thời điểm dữ liệu và phần mở chi tiết chi phí | Cho mở phép tính theo hàng; hiển thị tuổi dữ liệu; phương án nhận cao nhất đứng đầu |
| [Monito](https://www.monito.com/) | Bộ chọn nước gửi, nước nhận và số tiền trước nút so sánh | Với ba nước cố định, dùng nhóm chọn trực tiếp; Việt Nam là đích cố định |
| [Remitly — Vietnam](https://www.remitly.com/us/en/money-transfer/send-money-to-vietnam) | Bộ tính có số tiền gửi, tiền nhận và các mức tiền chọn nhanh | Dùng ba nút số tiền gợi ý, số tiền lớn dễ đọc; không thêm luồng thanh toán |

Wise Compare là mẫu chính cho thứ tự dữ liệu. Exiap là mẫu cho mở chi tiết. Monito là mẫu cho chọn tuyến. Remitly là mẫu cho nhập số tiền nhanh.

Mục tiêu là gần về cấu trúc sử dụng và thứ tự thông tin. Tên, màu, font, biểu tượng và nội dung dùng quy chuẩn riêng. Không sao chép đánh giá người dùng, huy hiệu an toàn, số lượng giao dịch hay cam kết của sản phẩm khác.

## 3. Nguyên tắc UX và giới hạn chữ

### 3.1. Thứ tự ưu tiên

1. Người dùng đang chi bao nhiêu, bằng đồng tiền nào?
2. Người nhận nhận được bao nhiêu VND?
3. Chênh bao nhiêu giữa các phương án?
4. Phí, tỷ giá và cách tính như thế nào?

Số tiền nhận có độ nổi bật cao nhất trong vùng kết quả. Phí và thông tin giải thích có độ nổi bật thấp hơn nhưng vẫn dễ đọc.

### 3.2. Hai mức thông tin

| Hiện mặc định | Hiện khi mở chi tiết |
| --- | --- |
| Nước gửi, ngân sách, đồng tiền | Công thức và các bước trừ phí |
| Nhãn “Ước tính · Phí minh họa” | Biên tỷ giá giả định của từng kênh |
| Tiền nhận ước tính, phí gửi | Khoản tiền thực sự được quy đổi |
| Phương án nhận cao nhất | Phí nhận mặc định bằng 0 |
| Chênh lệch so với phương án đầu | Thời điểm nguồn và thời điểm lấy dữ liệu |
| Ngày tỷ giá và liên kết nguồn | Giới hạn của mô hình và hướng nâng cấp |

Nguyên tắc mở dần chi tiết dựa trên [Progressive Disclosure của Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/). Thông tin ảnh hưởng đến cách hiểu kết quả, đặc biệt tính minh họa và dữ liệu cũ, phải hiện sẵn.

### 3.3. Quy chuẩn nội dung

| Loại nội dung | Quy tắc |
| --- | --- |
| Tiêu đề chính | Một câu ngắn, tối đa hai dòng trên mobile |
| Đoạn giới thiệu | Không có đoạn marketing dài trước bộ nhập tiền |
| Nhãn trường | Mục tiêu 2–4 từ; luôn hiển thị, không thay bằng placeholder |
| Nút | Động từ rõ; mục tiêu 1–3 từ |
| Hướng dẫn dưới trường | Một ý; thường một dòng, được xuống dòng khi chữ phóng to |
| Lỗi | Nêu vấn đề và hành động sửa; tối đa hai câu ngắn |
| Công thức | Dùng danh sách nhãn–giá trị khi mở, không đưa đoạn văn ra màn chính |
| Thuật ngữ | Dùng “tiền nhận”, “phí gửi”, “tỷ giá áp dụng”; thuật ngữ kỹ thuật chỉ ở tài liệu |

Mục tiêu biên tập là khoảng 70 từ tách bằng khoảng trắng trên màn hình mobile đầu tiên ở trạng thái bình thường, không tính số tiền/mã tiền tệ. Đây là mục tiêu kiểm tra, không ép bằng cách cắt nhãn hoặc giấu thông tin quan trọng. Không dùng line-clamp cho cảnh báo và số tiền.

Không rút gọn số tiền nhận thành “16,3 triệu” trên dòng quyết định chính. Không dùng icon thay cho nhãn “Phí”, “Nguồn”, “Chi tiết”. Không dùng nhãn “Tiết kiệm nhất thị trường” hoặc “Gửi ngay”.

## 4. Kiến trúc thông tin và wireframe

### 4.1. Trang chính

Thứ tự DOM: header → tiêu đề → bộ nhập liệu → trạng thái dữ liệu → kết quả → thông tin nguồn/phương pháp. Chỉ có một URL chức năng chính `/`.

Header có tên “Gửi Về” và liên kết “Dữ liệu” trỏ tới vùng giải thích trong trang. Không cần menu hamburger hoặc sidebar.

### 4.2. Mobile

```text
Gửi Về                              Dữ liệu

Gửi về, nhận bao nhiêu?

[ Nhật Bản ] [ Hàn Quốc ] [ Đài Loan ]

Bạn chi
[             100.000            JPY ]
Đã gồm phí

[ 50.000 ] [ 100.000 ] [ 200.000 ]
Về Việt Nam · VND

[                 So sánh                ]

Ước tính · Phí minh họa
Tỷ giá ngày DD/MM · Nguồn

Kết quả
┌────────────────────────────────────────┐
│ Kênh B                Nhận cao nhất    │
│ Nhận ước tính                          │
│                 16.286.160 ₫           │
│ Phí 800 JPY                            │
│ Chi tiết                            ˅  │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ Kênh A                                 │
│ Nhận ước tính                          │
│                 16.187.490 ₫           │
│ Ít hơn 98.670 ₫ · Phí 400 JPY           │
│ Chi tiết                            ˅  │
└────────────────────────────────────────┘

Kênh C hiển thị tiếp bên dưới.
```

Số tiền trong wireframe là fixture với tỷ giá giả định, không phải tỷ giá hiện tại. Kết quả chỉ xuất hiện sau lần so sánh đầu tiên.

Trên màn hình nhỏ, cả ba phương án đều nằm trong luồng cuộn dọc. Không dùng carousel phải vuốt ngang để thấy các phương án còn lại.

### 4.3. Desktop

```text
Gửi Về                                                    Dữ liệu

Gửi về, nhận bao nhiêu?

┌──────── Bộ nhập: 320 px ──────┐  ┌──────── Kết quả ────────────────┐
│ Quốc gia                    │  │ Ước tính · Phí minh họa        │
│ Bạn chi + JPY               │  │ Tỷ giá ngày DD/MM · Nguồn      │
│ Ba mức tiền gợi ý           │  │                                │
│ Về Việt Nam · VND           │  │ Kênh | Phí | Tỷ giá | Nhận | ...│
│ So sánh                    │  │ B    | ... | ...    | ...  | ...│
└─────────────────────────────┘  │ A    | ... | ...    | ...  | ...│
                                │ C    | ... | ...    | ...  | ...│
                                └────────────────────────────────┘
```

Thay ba thẻ thống kê trong kế hoạch cũ bằng chính bảng/kết quả xếp hạng. Không lặp lại số tiền tốt nhất trong nhiều khối. Dòng chênh lệch tổng chỉ thêm nếu kiểm thử người dùng cho thấy cần; mặc định đã có chênh lệch ở từng kênh.

## 5. Design system tối thiểu

### 5.1. Màu sắc

Các cặp tương phản dưới đây đã tính theo công thức relative luminance của WCAG; đây là tính toán cho token đề xuất, chưa phải kết quả audit giao diện hoàn chỉnh.

| Token | Giá trị | Cách dùng |
| --- | --- | --- |
| page | `#F5F7F9` | Nền trang |
| surface | `#FFFFFF` | Form, bảng, thẻ |
| text | `#172B4D` | Chữ chính; khoảng 14,10:1 trên nền trắng |
| text-secondary | `#52616B` | Nhãn phụ; khoảng 6,40:1 trên nền trắng |
| primary | `#155EEF` | Nút chính và liên kết; chữ trắng trên nút khoảng 5,41:1 |
| primary-hover | `#124ECC` | Hover nút chính |
| border-decorative | `#D8E0E7` | Phân cách trang trí, không dùng một mình để nhận biết input |
| border-control | `#718096` | Viền trường nhập; khoảng 4,02:1 trên trắng |
| success / background | `#166534` / `#F0FDF4` | Nhãn nhận cao nhất; khoảng 6,81:1 |
| warning / background | `#92400E` / `#FFFBEB` | Đang dùng dữ liệu cũ; khoảng 6,84:1 |
| error / background | `#B42318` / `#FEF3F2` | Lỗi; khoảng 6,05:1 |

Không dùng màu đỏ cho mọi phương án có tiền nhận thấp hơn. Chúng là lựa chọn so sánh, không phải lỗi. Nhãn nhận cao nhất cần có chữ, không chỉ tô xanh.

### 5.2. Chữ và số

Font: `system-ui, -apple-system, "Segoe UI", sans-serif`. Không tải font ngoài ở MVP. Kiểm tra dấu tiếng Việt trong tất cả trạng thái.

| Thành phần | Mobile | Desktop | Độ đậm |
| --- | --- | --- | --- |
| Tiêu đề chính | 28 px / 36 px | 36 px / 44 px | 700 |
| Tiêu đề vùng kết quả | 20 px / 28 px | 24 px / 32 px | 600 |
| Số tiền nhập | 28 px / 36 px | 32 px / 40 px | 600 |
| Tiền nhận trên thẻ | 28 px / 36 px | — | 700 |
| Tiền nhận trong bảng | — | 20 px / 28 px | 700 |
| Nội dung và nhãn | 16 px / 24 px | 16 px / 24 px | 400–600 |
| Metadata, badge | 14 px / 20 px | 14 px / 20 px | 400–600 |

Dùng `font-variant-numeric: tabular-nums` cho số tiền. Căn phải các cột tiền và tỷ giá. Không thu chữ nhỏ hơn 14 px để nhét nội dung; thay vào đó đổi layout hoặc xuống dòng.

### 5.3. Khoảng cách và kích thước

| Hạng mục | Quy chuẩn |
| --- | --- |
| Thang khoảng cách | 4, 8, 12, 16, 24, 32, 48 px |
| Padding trang | 16 px mobile; 24 px tablet; 32 px desktop |
| Max-width | 1.120 px, căn giữa |
| Header | Cao tối thiểu 56 px; cho giãn khi zoom chữ |
| Form desktop | 320 px, khoảng cách sang kết quả 24 px |
| Input/nút chính | Cao tối thiểu 52 px / 48 px |
| Vùng bấm tối thiểu nội bộ | 44 × 44 px; ưu tiên 48 px trên điện thoại |
| Card | Bo góc 12 px; padding 16 px mobile, 24 px desktop |
| Nút/input | Bo góc 8 px |
| Badge | Bo tròn; nội dung không bị cắt khi zoom |
| Icon | 20 px, nét nhất quán, không dùng emoji làm hệ thống icon |
| Focus | Viền 3 px màu primary, offset 2 px |

Đây là chuẩn riêng của dự án. WCAG 2.2 AA về mục tiêu bấm có ngưỡng tối thiểu 24 × 24 CSS px cùng các ngoại lệ; dự án chủ động chọn 44–48 px cho điện thoại. [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### 5.4. Responsive và chuyển động

| Kích thước | Bố cục |
| --- | --- |
| 320–767 px | Một cột; form trên, ba thẻ kết quả dưới |
| 768–1.023 px | Form trên; kết quả dạng thẻ, một cột |
| Từ 1.024 px | Form 320 px bên trái; bảng kết quả bên phải |

Không có thanh nút cố định che nội dung hoặc bàn phím. Ở MVP không dùng modal/bottom sheet: nguồn và phép tính đều mở trong trang, giảm yêu cầu quản lý focus.

Transition 120–160 ms cho hover/focus. Không animate số tiền, không đếm số chạy lên. Tắt chuyển động không cần thiết khi `prefers-reduced-motion: reduce`.

## 6. Đặc tả từng thành phần

### 6.1. Chọn quốc gia

Dùng nhóm radio có nhãn Nhật Bản, Hàn Quốc, Đài Loan. Trạng thái chọn được thể hiện bằng chữ, viền và dấu chọn. Điều khiển được bằng bàn phím và các phím mũi tên theo hành vi radio chuẩn.

Mặc định Nhật Bản. Đổi nước đặt ngân sách về mặc định của nước mới, đổi suffix tiền tệ và preset, đóng chi tiết, xóa kết quả cũ. Thông báo ngắn cho trình đọc màn hình về đồng tiền/ngân sách mới. Không diễn giải cùng số tiền cũ thành đồng tiền khác.

| Nước | Tiền | Mặc định | Preset |
| --- | --- | ---: | --- |
| Nhật Bản | JPY | 100.000 | 50.000 / 100.000 / 200.000 |
| Hàn Quốc | KRW | 1.000.000 | 500.000 / 1.000.000 / 2.000.000 |
| Đài Loan | TWD | 20.000 | 10.000 / 20.000 / 50.000 |

### 6.2. Nhập ngân sách

Nhãn “Bạn chi”, helper “Đã gồm phí”, suffix mã tiền tệ. Input dùng `type="text"`, `inputmode="numeric"`; giá trị chuẩn là chuỗi chữ số nguyên, tránh lỗi số thực và hành vi số mũ của input number.

Quy ước MVP: nhập số nguyên theo đơn vị JPY/KRW/TWD; chấp nhận tối đa 9 chữ số, giá trị từ 1 đến 999.999.999. Định dạng vi-VN khi blur; bỏ định dạng để sửa khi focus. Khi paste, chỉ chấp nhận chuỗi chữ số hoặc nhóm hàng nghìn nhất quán bằng dấu chấm/dấu phẩy/khoảng trắng. Ví dụ `100000`, `100.000`, `100,000` đều là 100.000; `100.50` bị báo lỗi, không tự biến thành 10.050.

Không nhận số âm, số mũ, chữ hoặc số thập phân. Không âm thầm xóa ký tự làm thay đổi ý nghĩa số tiền. Khi submit lỗi, đưa focus vào trường có lỗi; không xóa giá trị người dùng.

Preset thay giá trị input, không tự gọi API và không tự submit. Enter trong form tương đương nút So sánh.

### 6.3. Nút so sánh và kết quả cũ

Giữ nút So sánh hoạt động để người dùng có thể submit và thấy lỗi nhập liệu. Khi đang có một lần submit chờ tỷ giá, khóa submit trùng và hiển thị trạng thái chờ.

Tách `draft` (đang nhập) và `submitted` (đã so sánh). Khi người dùng sửa số tiền sau khi đã so sánh, thay vùng số tiền kết quả cũ bằng lời nhắc “Bấm So sánh để cập nhật”. Không để số tiền cũ đứng cạnh ngân sách mới mà thiếu giải thích. Không dịch chuyển focus chỉ vì kết quả xuất hiện.

### 6.4. Kết quả

Trên mobile: mỗi thẻ có tên kênh, tiền nhận ước tính, phí, chênh lệch so với kênh đứng đầu nếu có và nút Chi tiết. Trên desktop: bảng Kênh / Phí gửi / Tỷ giá áp dụng / Nhận ước tính / Chi tiết.

Sắp giảm dần theo tiền nhận đã làm tròn hiển thị. Bằng nhau đến đơn vị VND thì ghi “Đồng hạng”, giữ thứ tự ID để ổn định. Chỉ gắn “Nhận cao nhất” khi có ít nhất hai kênh hợp lệ. Chênh lệch hiển thị phải khớp phép trừ hai số tiền đang hiển thị.

Kênh không đủ ngân sách được đặt sau các kênh hợp lệ, tiền nhận là dấu gạch ngang và nhãn “Không đủ trả phí”. Nếu không có kênh nào hợp lệ, thay bảng bằng “Ngân sách chưa đủ trả phí” và hành động quay về sửa số tiền.

### 6.5. Chi tiết phép tính

Dùng `<details>`/`<summary>`; mỗi kênh mở độc lập. Nội dung là các dòng nhãn–giá trị: Bạn chi; Phí gửi; Số tiền đổi; Tỷ giá tham chiếu; Biên tỷ giá; Tỷ giá áp dụng; Phí nhận; Nhận ước tính. Tỷ giá chi tiết hiển thị đến tối đa 6 chữ số thập phân, phép tính vẫn dùng độ chính xác đầy đủ.

Ví dụ dòng giải thích: “Biên tỷ giá là mức giảm giả định so với tỷ giá tham chiếu.” Thêm ghi chú “Phí nhận giả định bằng 0” ngay trong phần này.

### 6.6. Nguồn dữ liệu

Nhãn “Tỷ giá ngày DD/MM/YYYY · Nguồn”. Ngày lấy từ thời điểm cập nhật do API cung cấp, định dạng múi giờ Asia/Ho_Chi_Minh. Không dùng giờ mở trang làm giờ cập nhật tỷ giá.

Liên kết Nguồn mở vùng `<details>` trong trang: tên API, thời điểm nguồn, thời điểm lấy dữ liệu, tần suất mỗi ngày, tính minh họa của phí và các giới hạn. Có liên kết ghi nguồn theo yêu cầu nhà cung cấp. Không lộ thuật ngữ như cache/HTTP/CORS trong luồng chính.

## 7. Nội dung giao diện đã chốt

| Vị trí | Nội dung |
| --- | --- |
| Tên | Gửi Về |
| H1 | Gửi về, nhận bao nhiêu? |
| Nhãn số tiền | Bạn chi |
| Helper số tiền | Đã gồm phí |
| Đích | Về Việt Nam · VND |
| CTA | So sánh |
| Nhãn tính chất dữ liệu | Ước tính · Phí minh họa |
| Tiêu đề kết quả | Kết quả |
| Số tiền chính | Nhận ước tính |
| Badge hạng đầu | Nhận cao nhất |
| Mở phép tính | Chi tiết |
| Dữ liệu đang tải | Đang lấy tỷ giá… |
| Lỗi trống/0/âm | Nhập số tiền lớn hơn 0. |
| Lỗi định dạng | Nhập số nguyên, ví dụ 100.000. |
| Lỗi giới hạn | Nhập tối đa 999.999.999. |
| Chỉnh ngân sách | Bấm So sánh để cập nhật. |
| Có bản lưu cũ | Đang dùng tỷ giá ngày DD/MM/YYYY. |
| Không có tỷ giá | Chưa lấy được tỷ giá. Thử lại. |
| Quá 48 giờ | Tỷ giá đã cũ. Cập nhật để so sánh. |
| Không đủ phí | Không đủ trả phí |
| Hành động lỗi | Thử lại |

Nhãn tính minh họa luôn ở sát vùng kết quả; không chỉ xuất hiện ở footer. Nội dung khi lỗi được ưu tiên hơn giới hạn chữ bình thường.

## 8. Dữ liệu và quy tắc tính

### 8.1. Tỷ giá

Gọi trực tiếp `GET https://open.er-api.com/v6/latest/USD` từ trình duyệt, một bộ tỷ giá phục vụ cả ba tuyến. Đã xác minh trong phiên lập kế hoạch: HTTP 200, `Access-Control-Allow-Origin: *`, đủ JPY/KRW/TWD/VND và timestamp cập nhật.

`R = rates.VND / rates[sourceCurrency]`, đơn vị VND cho một đơn vị nguồn. Ví dụ với fixture USD→VND = 26.400 và USD→JPY = 160 thì JPY→VND = 165. Đây là fixture kiểm thử, không phải dữ liệu hiện tại.

Chỉ nhận response có `result=success`, `base_code=USD`, tỷ giá cần dùng hữu hạn và dương, timestamp hợp lệ. Nếu nguồn không đáp ứng kiểm tra, giữ nguyên bản hợp lệ trước đó. Không dùng ngầm dữ liệu mock khi API lỗi.

API mở không cần key, cập nhật hằng ngày, yêu cầu ghi nguồn và cho phép lưu đệm cho mục đích ứng dụng; không xuất dữ liệu thành API tỷ giá để bên khác sử dụng. [Tài liệu chính thức](https://www.exchangerate-api.com/docs/free), [Điều khoản](https://www.exchangerate-api.com/terms).

### 8.2. Lưu đệm và độ mới

Lưu snapshot và thời điểm lấy thành công trong `localStorage` với phiên bản cấu trúc. Nếu không thể đọc/ghi localStorage, chỉ dùng bộ nhớ phiên, không làm hỏng trang.

| Trường hợp | Hành vi |
| --- | --- |
| Có bản hợp lệ, chưa đến cập nhật tiếp | Dùng bản lưu, không gọi lại |
| Không có bản lưu | Gọi API, timeout 8 giây |
| Đến kỳ cập nhật | Gọi lại khi trang mở/hiện, không quá một lần tự động mỗi giờ |
| API lỗi và bản lưu không quá 48 giờ | Cho so sánh, ghi rõ ngày dữ liệu đang dùng |
| Dữ liệu quá 48 giờ | Chặn kết quả và yêu cầu cập nhật |
| HTTP 429 | Không lặp yêu cầu; hiển thị bản lưu nếu còn hợp lệ; thử tự động sau một giờ |
| Tab đang mở | Kiểm tra hạn cập nhật định kỳ mỗi 60 phút và khi tab được hiện lại |

Tự động lấy lại dữ liệu không có nghĩa là cập nhật giá từng phút. Chưa cần cron vì không lưu dữ liệu phía server; khi không có ai mở website, không có yêu cầu cần chạy.

### 8.3. Cấu hình kênh

| Kênh | Phí JPY | Phí KRW | Phí TWD | Biên giảm tỷ giá |
| --- | ---: | ---: | ---: | ---: |
| A | 400 | 4.000 | 100 | 1,5% |
| B | 800 | 8.000 | 200 | 0,5% |
| C | 0 | 0 | 0 | 2,5% |

Phí cố định, tính bằng tiền nguồn; phí nhận VND mặc định 0. Các cấu hình là giả định cho demo. Không bổ sung phí phần trăm/bậc phí/ưu đãi khách mới trong MVP.

### 8.4. Công thức

```text
B = tổng ngân sách nguồn, đã gồm phí
F = phí cố định nguồn
R = tỷ giá tham chiếu sang VND
s = biên giảm tỷ giá dạng thập phân

Tiền đổi = B − F
Tỷ giá áp dụng = R × (1 − s)
Nhận ước tính = round_half_up(Tiền đổi × Tỷ giá áp dụng)
```

Dùng decimal.js, không làm tròn tỷ giá trước phép nhân. Chỉ làm tròn kết quả cuối đến đơn vị VND. Không trừ biên tỷ giá lần thứ hai như một khoản phí riêng.

Fixture Nhật: B = 100.000, R = 165.

| Kênh | Phí | Tỷ giá áp dụng | Tiền nhận |
| --- | ---: | ---: | ---: |
| B | 800 | 164,175 | 16.286.160 VND |
| A | 400 | 162,525 | 16.187.490 VND |
| C | 0 | 160,875 | 16.087.500 VND |

A ít hơn B 98.670 VND; C ít hơn B 198.660 VND. Các giá trị này dùng trong kiểm thử và mockup, không dùng làm fallback production.

## 9. Kiến trúc kỹ thuật và hợp đồng nội bộ

React + Vite + TypeScript; CSS thuần; decimal.js; Vitest và Testing Library cho phép tính và hành vi quan trọng. Node 24 LTS, cố định major 24 trên máy phát triển và hosting, lưu package-lock và cài bằng npm ci. [Trạng thái Node LTS](https://nodejs.org/en/about/previous-releases).

Tách ba phần: adapter tỷ giá; hàm tính thuần; giao diện. Không gọi API trong từng hàng kết quả. Không gọi API khi đổi ngân sách hoặc chọn quốc gia nếu snapshot còn dùng được.

| Hợp đồng | Thông tin tối thiểu |
| --- | --- |
| SourceCurrency | JPY, KRW hoặc TWD |
| FxSnapshot | Tỷ giá USD gốc, sourceUpdatedAt, nextUpdateAt, fetchedAt |
| ChannelConfig | ID A/B/C, phí theo đồng nguồn, margin dạng thập phân, dataKind=illustrative |
| CompareInput | sourceCurrency và budget dạng chuỗi số nguyên đã chuẩn hóa |
| ComparisonResult | Kênh, phí, tiền đổi, tỷ giá tham chiếu/áp dụng, tiền nhận VND, trạng thái |
| QuoteStatus | valid hoặc insufficient_budget |

Hàm `compare()` trả kết quả từ dữ liệu đầu vào, không fetch, không đọc localStorage, không định dạng UI. Hàm định dạng dùng locale vi-VN ở lớp hiển thị.

Ba điểm tổ chức cần giữ rõ: `src/domain/` chứa mô hình và phép tính; `src/services/` chứa API/lưu đệm; `src/components/` chứa giao diện. Chưa cần router, state management library, server, cơ sở dữ liệu, biểu đồ hoặc hệ thống component lớn.

## 10. Trạng thái và xử lý lỗi

| Trạng thái | Người dùng thấy | Xử lý |
| --- | --- | --- |
| Ban đầu | Form có số mặc định; chưa có kết quả | Lấy snapshot hợp lệ nếu cần |
| Chờ tỷ giá | “Đang lấy tỷ giá…” | Giữ dữ liệu người dùng nhập; khóa submit trùng |
| Thành công | Ba kênh, nhận cao nhất, chi tiết đóng | Thông báo ngắn trong vùng live |
| Đang sửa | “Bấm So sánh để cập nhật” | Ẩn số cũ; giữ form và vùng kết quả ổn định |
| Dùng bản lưu cũ | Kết quả + ngày dữ liệu đang dùng | Phân biệt bằng chữ và màu cảnh báo |
| Không có dữ liệu | Thông báo ngắn + Thử lại | Không sinh số tiền giả |
| Dữ liệu hết hạn | Thông báo cập nhật | Không xếp hạng theo dữ liệu quá 48 giờ |
| Kênh không đủ ngân sách | Dấu gạch ngang + Không đủ trả phí | Không tính vào xếp hạng |

Khi có yêu cầu API đang chạy, các submit dùng cùng một promise; không tạo thêm yêu cầu. Nếu người dùng đổi quốc gia/ngân sách lúc chờ, hủy ý định submit cũ; chỉ hiển thị kết quả khớp dữ liệu submit hiện tại.

## 11. Accessibility và chất lượng giao diện

Đặt mục tiêu WCAG 2.2 AA cho các tiêu chí liên quan, kiểm tra thủ công trước khi công bố đạt; không coi việc chọn token đúng là chứng nhận toàn bộ website.

| Tiêu chí | Yêu cầu nghiệm thu |
| --- | --- |
| Chữ | Chữ thường tối thiểu 4,5:1; chữ lớn tối thiểu 3:1 |
| Điều khiển | Có nhãn, viền/focus nhận biết được; không chỉ dùng màu |
| Bàn phím | Đi qua đầy đủ form, preset, chi tiết, nguồn; không bẫy focus |
| Phóng to | Dùng được ở 200%; reflow 320 CSS px, không mất số tiền/hành động |
| Trình đọc màn hình | lang=vi, label đúng, lỗi gắn input, header bảng có ngữ nghĩa |
| Trạng thái | Thông báo loading/kết quả/lỗi qua vùng live phù hợp; không đọc lại toàn bảng |
| Thứ tự | Thứ tự đọc và thứ tự nhìn thống nhất |
| Chuyển động | Tôn trọng prefers-reduced-motion |

Nguồn quy chuẩn: [Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

Không dựa vào hover để giải thích các thông tin quan trọng. Không tự tắt cảnh báo trước khi người dùng đọc xong. Không dùng skeleton nhấp nháy; dùng khung tĩnh nếu cần giữ bố cục lúc chờ.

## 12. Lịch thực hiện 20 giờ

| Giờ | Hạng mục | Đầu ra và điều kiện xong |
| --- | --- | --- |
| 0–1 | Khởi tạo và chốt token | Vite/TS, lockfile, CSS variables, phép build đầu tiên |
| 1–3 | Dựng bố cục và preview | Header, form, kết quả giả lập; deploy preview sớm để phát hiện lỗi hosting |
| 3–6 | Form và tương tác | Radio, tiền, preset, validation, draft/submitted |
| 6–8 | Dữ liệu tự động | API, cross-rate, localStorage, timeout, độ mới và cảnh báo |
| 8–11 | Bộ tính và kết quả | Ba kênh, xếp hạng, chênh lệch, chi tiết, trường hợp thiếu phí |
| 11–13 | Kiểm thử logic/hành vi | Fixture, parsing, lỗi API và dữ liệu cũ |
| 13–15 | Responsive và accessibility | 320/375/768/1440, bàn phím, tương phản, zoom, kiểm tra dấu tiếng Việt |
| 15–17 | Deploy hoàn chỉnh | Preview đạt, gate build, production và kiểm tra tên miền thật |
| 17–18 | Bàn giao và dùng thử | README, nguồn dữ liệu, hướng dẫn sửa phí, demo và kiểm tra nhanh người dùng |
| 18–20 | Dự phòng | Sửa lỗi phát hiện; không thêm tính năng mới |

Nếu trễ: cắt chuyển động/hiệu ứng trang trí trước. Giữ phép tính, nhãn minh họa, lỗi dữ liệu, mobile và kiểm thử cốt lõi. Không thêm chức năng ngoài phạm vi để lấp thời gian dự phòng.

## 13. Kế hoạch deploy và vận hành

### 13.1. Cấu hình

| Mục | Giá trị |
| --- | --- |
| Hosting | Cloudflare Pages |
| Repository | GitHub, một repository mới của dự án |
| Production | Nhánh main |
| Preview | Nhánh tính năng/PR |
| Node | Major 24 |
| Build command | npm run verify |
| verify | typecheck → test:run → build; lỗi bước nào thì dừng |
| Build output | dist |
| URL | Tên miền con pages.dev được cấp; chưa mua domain |
| Secrets | Không cần cho API mở đã chọn |

Cloudflare cho phép lệnh build tùy chỉnh, xác định thành công bằng exit code; React/Vite xuất dist. [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).

### 13.2. Phát hành

1. Kiểm tra verify trên máy phát triển.
2. Push nhánh tính năng, mở preview.
3. Kiểm tra API trên origin preview, ba tuyến, form, nhãn minh họa và responsive.
4. Merge main khi đạt checklist; Cloudflare chạy verify trước khi phát hành.
5. Kiểm tra URL production: tải mới, reload, so sánh, mở chi tiết và nguồn.
6. Ghi commit và URL bản đã kiểm tra trong README.

Không lưu số tiền người dùng trong URL, log hay localStorage. localStorage chỉ chứa snapshot tỷ giá. Không thêm công cụ analytics/session replay vào MVP.

### 13.3. Rollback và bảo trì

Nếu sai phép tính hoặc lỗi giao diện chính sau deploy, quay về bản production thành công gần nhất trong Cloudflare, rồi sửa mã. Preview không phải đích rollback production. [Cloudflare Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).

Mỗi lần sửa cấu hình phí phải chạy lại fixture/verify và kiểm tra nhãn minh họa. Người phụ trách repo cũng phụ trách cập nhật nguồn/biểu phí. Mỗi tuần kiểm tra website trên điện thoại, tuổi dữ liệu và giới hạn API; chưa cần hệ thống giám sát riêng trong 20 giờ.

Chi phí mục tiêu: 0 đồng cho domain/API/hosting của demo trong hạn mức miễn phí; không gồm công lao động hoặc thay đổi giá/hạn mức trong tương lai. Cloudflare Free hiện có 500 build/tháng. [Giới hạn Pages](https://developers.cloudflare.com/pages/platform/limits/).

## 14. Kiểm thử và tiêu chí nghiệm thu

### 14.1. Logic

| Mã | Tình huống | Kết quả kỳ vọng |
| --- | --- | --- |
| L01 | Fixture Nhật, B=100.000, R=165 | B=16.286.160; A=16.187.490; C=16.087.500 VND |
| L02 | Cross-rate fixture USD→VND=26.400; USD→JPY=160 | 165 VND/JPY, không đảo chiều |
| L03 | Ba đồng tiền cùng snapshot | Mỗi tuyến lấy đúng rates[source] |
| L04 | B bằng hoặc nhỏ hơn phí | Kênh không hợp lệ, không có tiền nhận âm |
| L05 | Hai kết quả bằng nhau sau làm tròn | Đồng hạng; thứ tự ID ổn định |
| L06 | Kết quả x.5 VND | ROUND_HALF_UP, chỉ một lần cuối |
| L07 | Tỷ giá có nhiều chữ số | Không làm tròn sớm để tính |
| L08 | Snapshot thiếu tỷ giá, số âm hoặc timestamp sai | Từ chối dữ liệu, không ghi đè bản tốt |

### 14.2. Hành vi

| Mã | Tình huống | Kết quả kỳ vọng |
| --- | --- | --- |
| U01 | Enter trong form | Giống click So sánh |
| U02 | Đổi quốc gia | Đổi tiền/preset, xóa kết quả cũ, ngân sách đúng mặc định |
| U03 | Sửa tiền sau kết quả | Không hiện số cũ như kết quả của ngân sách mới |
| U04 | Nhập 100000 / 100.000 / 100,000 | Chuẩn hóa thành cùng một ngân sách |
| U05 | Nhập 100.50, 1e5, số âm, trống | Báo đúng lỗi, giữ giá trị để sửa |
| U06 | Nhấn submit nhiều lần lúc chờ | Một yêu cầu mạng, không kết quả trùng |
| U07 | API timeout, offline, 429 | Dùng bản lưu hợp lệ hoặc báo lỗi có Thử lại |
| U08 | localStorage lỗi | Ứng dụng vẫn chạy với bộ nhớ phiên |
| U09 | Snapshot đúng 48 giờ / hơn 48 giờ | Đúng ranh giới cho phép / ngừng tính |
| U10 | Đổi nước trong khi request đang chờ | Không hiển thị kết quả cho submit đã bị thay đổi |

### 14.3. UI và dùng thử

Kiểm tra ở 320, 375, 768, 1.024 và 1.440 CSS px; ít nhất Chrome/Edge desktop và một điện thoại thực. Nếu không có thiết bị hoặc trình đọc màn hình để kiểm tra, ghi rõ giới hạn thay vì tuyên bố đã đạt.

Mục tiêu trải nghiệm, cần đo khi có bản chạy: người mới nhận biết tiền nhận cao nhất trong khoảng 5 giây sau khi kết quả hiện; thao tác so sánh đầu tiên trong khoảng 15 giây, không tính thời gian mạng; người thử phân biệt được tỷ giá thật và phí minh họa.

Nếu có sẵn 2–3 người thử, thực hiện ba nhiệm vụ: gửi 100.000 JPY và tìm tiền nhận cao nhất; đổi sang 1.000.000 KRW; chỉ ra phần dữ liệu nào là minh họa. Nếu chưa có người thử trong 20 giờ, bàn giao nhiệm vụ này ở trạng thái chưa đo, không trì hoãn kiểm thử chức năng và deploy vì chờ tuyển người.

### 14.4. Điều kiện hoàn thành

- Có URL HTTPS công khai và mã nguồn bàn giao.
- So sánh được cả ba tuyến với cấu hình đã chốt.
- Số tiền nhận và chênh lệch khớp fixture, không trừ phí hai lần.
- Nhãn minh họa và tuổi dữ liệu xuất hiện cạnh kết quả.
- Không có dữ liệu giả được dùng ngầm khi API lỗi.
- Không có cuộn ngang toàn trang ở 320 px; không cắt số tiền ở zoom 200%.
- Form có nhãn, lỗi sửa được, bàn phím dùng được.
- typecheck, test:run và build đều đạt.
- Có hướng dẫn cập nhật cấu hình và rollback.

## 15. Bàn giao và hướng phát triển sau MVP

Bàn giao source, URL production, README chạy/deploy, bảng token UX/UI, microcopy, cấu hình kênh, danh sách kiểm thử đã chạy/chưa chạy, nguồn tham khảo và kịch bản demo ba phút.

Sau MVP, ưu tiên xác minh một nguồn biểu phí/báo giá cho từng tuyến. Chỉ đổi nhãn kênh minh họa thành tên nhà cung cấp thật khi đã xác minh tuyến hoạt động, cách tính phí, phương thức nạp/nhận tiền, quyền dùng dữ liệu và thời hạn hiệu lực. Nếu cần key, chuyển kết nối sang server để giữ key. Chỉ xếp hạng các dữ liệu tương đương về ngân sách, tuyến và phương thức nhận. Đây là giai đoạn khác, không nằm trong cam kết 20 giờ.
