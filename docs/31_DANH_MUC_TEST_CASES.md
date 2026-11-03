# DANH MỤC TRƯỜNG HỢP KIỂM THỬ CHI TIẾT (TEST CASES SPECIFICATION)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-QA-002` | **Phiên bản**: `1.0.0` | **Trạng thái**: `APPROVED_BY_QA_LEAD`  
> **Tác giả**: `qa-engineer` (Chuyên gia Đảm bảo Chất lượng & Tự động hóa Kiểm thử)  
> **Ánh xạ nguồn**: Bao phủ 100% kịch bản trong `docs/06_TIEU_CHI_NGHIEM_THU_ACCEPTANCE_CRITERIA.md`  

---

## 1. MA TRẬN TỔNG HỢP BAO PHỦ KIỂM THỬ (TEST COVERAGE MATRIX)

| Nhóm Kiểm Thử (Test Suite) | Mã Kiểm Thử | Số Lượng Test Cases | Tỷ Lệ Đạt (Pass Rate) | Mức Độ Ưu Tiên |
| :--- | :---: | :---: | :---: | :---: |
| **Nhóm 1: Geospatial Routing & Distance** | `TC-GEO-01` ➔ `TC-GEO-03` | 3 | 100% (3/3) | P1 - High |
| **Nhóm 2: Parallel Quoting Engine & SLA** | `TC-QUOTE-01` ➔ `TC-QUOTE-05` | 5 | 100% (5/5) | P0 - Blocker |
| **Nhóm 3: Smart Badges Evaluation** | `TC-BADGE-01` ➔ `TC-BADGE-06`| 6 | 100% (6/6) | P0 - Blocker |
| **Nhóm 4: Prepaid Wallet & Balance ACID** | `TC-WALLET-01` ➔ `TC-WALLET-05`| 5 | 100% (5/5) | P0 - Blocker |
| **Nhóm 5: Idempotency & Anti-Duplicate** | `TC-IDEMP-01` ➔ `TC-IDEMP-03` | 3 | 100% (3/3) | P0 - Blocker |
| **Nhóm 6: 1-Click Order Booking & Dispatch**| `TC-BOOK-01` ➔ `TC-BOOK-04` | 4 | 100% (4/4) | P0 - Blocker |
| **Nhóm 7: Public Live Tracking & Privacy** | `TC-TRACK-01` ➔ `TC-TRACK-04` | 4 | 100% (4/4) | P1 - High |
| **Nhóm 8: Order Cancellation & State Guard**| `TC-CANCEL-01` ➔ `TC-CANCEL-02`| 2 | 100% (2/2) | P1 - High |
| **Nhóm 9: Exception, Timeout & Circuit Breaker**| `TC-EXC-01` ➔ `TC-EXC-05` | 5 | 100% (5/5) | P0 - Blocker |
| **Nhóm 10: VietQR Napas 247 Dynamic Payment**| `TC-QR-01` ➔ `TC-QR-02` | 2 | 100% (2/2) | P1 - High |
| **TỔNG CỘNG** | **39 TEST CASES** | **39** | **100.00% (39/39)**| **ALL PASSED** |

---

## 2. BẢNG ĐẶC TẢ CHI TIẾT CÁC TEST CASES

### NHÓM 1: TÍNH TOÁN ĐỊA LÝ & LỘ TRÌNH (GEOSPATIAL ROUTING)

#### Test Case TC-GEO-01: Tính khoảng cách đường bộ Haversine nội đô Hà Nội
- **Loại kiểm thử**: Unit Test / Calculation Integrity
- **Mức độ**: P1 (Cao)
- **Ánh xạ AC**: Kịch bản 1.1 trong `DOC-AC-001`
- **Tiền điều kiện**: Hệ tọa độ WGS84 cho điểm Tràng Tiền (`21.028511, 105.854444`) và Đội Cấn (`21.037288, 105.834466`).
- **Các bước thực hiện**:
  1. Gọi hàm `calculateHaversineDistanceKm(lat1, lon1, lat2, lon2)`.
  2. Đo cự ly trả về.
- **Kết quả kỳ vọng**: Khoảng cách nằm trong khoảng từ 2.5 km đến 3.5 km (thực tế ~2.9 km tính cả hệ số quanh co nội đô 1.25).
- **Kết quả thực tế**: `2.9 km` — **PASS** (0ms).

#### Test Case TC-GEO-02: Tổng hợp thông tin lộ trình và đường cong Polyline
- **Loại kiểm thử**: Unit Test
- **Mức độ**: P1 (Cao)
- **Các bước thực hiện**: Gọi `calculateRouteInfo(lat1, lon1, lat2, lon2)`.
- **Kết quả kỳ vọng**: Trả về `distanceMeters >= 2500m`, `durationMinutes >= 5 phút`, `polyline` không rỗng dạng JSON GeoPoints.
- **Kết quả thực tế**: `distanceMeters = 2900m`, `durationMinutes = 9 phút`, polyline hợp lệ — **PASS** (0ms).

#### Test Case TC-GEO-03: Ước tính thời gian giao hàng đường bộ (ETA)
- **Loại kiểm thử**: Unit Test
- **Mức độ**: P2 (Vừa)
- **Các bước thực hiện**: Gọi `estimateDeliveryMinutes(3.0)` với vận tốc trung bình xe máy nội đô 20 km/h.
- **Kết quả kỳ vọng**: ETA từ 5 đến 30 phút.
- **Kết quả thực tế**: `ETA = 9 phút` — **PASS** (0ms).

---

### NHÓM 2: SO SÁNH GIÁ CƯỚC THỜI GIAN THỰC (PARALLEL QUOTING ENGINE)

#### Test Case TC-QUOTE-01: SLA thời gian phản hồi so sánh cước đa hãng đồng thời ≤ 1.500ms
- **Loại kiểm thử**: Performance & Integration Test
- **Mức độ**: P0 (Nghiêm trọng - Blocker)
- **Ánh xạ AC**: Kịch bản 1.1 trong `DOC-AC-001`
- **Tiền điều kiện**: Toàn bộ 6 Carrier Adapters được nạp vào Registry.
- **Các bước thực hiện**:
  1. Chuẩn bị `CarrierQuoteRequest` lộ trình 2.9 km, kiện hàng 1.5 kg.
  2. Bấm giờ bắt đầu `Date.now()`.
  3. Gửi yêu cầu qua `parallelQuotingEngineService.getAggregatedQuotes(req)`.
  4. Đo thời gian hoàn tất `elapsed`.
- **Kết quả kỳ vọng**: Thời gian hoàn tất `elapsed <= 1500 ms`.
- **Kết quả thực tế**: `elapsed = 251 ms` (nhanh gấp 6 lần yêu cầu SLA) — **PASS** (251ms).

#### Test Case TC-QUOTE-02: Tổng hợp đủ 6 hãng đối tác không bị thiếu sót
- **Loại kiểm thử**: Integration Test
- **Mức độ**: P0 (Blocker)
- **Các bước thực hiện**: Kiểm tra độ dài mảng `quotes` trong kết quả trả về.
- **Kết quả kỳ vọng**: Có đúng 6 bản ghi báo giá từ: Grab, ShopeeFood, Xanh SM, Ahamove, Be, Mock Sandbox.
- **Kết quả thực tế**: Nhận đủ `6/6 báo giá` — **PASS** (251ms).

#### Test Case TC-QUOTE-03: Kiểm tra tính toán cước phí và phụ phí sàn 1.000đ
- **Loại kiểm thử**: Business Rule Validation
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 1.1 trong `DOC-AC-001` & Quy tắc BR-04 trong `05_BUSINESS_RULES.md`
- **Các bước thực hiện**: Duyệt qua từng bản ghi báo giá: kiểm tra `finalTotalFee === carrierOriginalTotal + 1000`.
- **Kết quả kỳ vọng**: 100% hãng đều có `platformFee = 1000` và `finalTotalFee` khớp chính xác.
- **Kết quả thực tế**: 100% khớp đúng chuẩn biểu phí — **PASS** (0ms).

#### Test Case TC-QUOTE-04: Thời hạn hiệu lực báo giá (TTL = 300s)
- **Loại kiểm thử**: Business Rule Validation
- **Mức độ**: P1 (Cao)
- **Các bước thực hiện**: Kiểm tra `summary.ttlSeconds` và `summary.expiresAt`.
- **Kết quả kỳ vọng**: `ttlSeconds = 300` và `expiresAt > Date.now()`.
- **Kết quả thực tế**: `ttlSeconds = 300`, `expiresAt = Date.now() + 300s` — **PASS** (0ms).

#### Test Case TC-QUOTE-05: Toàn vẹn danh mục mã định danh hãng vận chuyển
- **Loại kiểm thử**: Contract Validation
- **Mức độ**: P1 (Cao)
- **Các bước thực hiện**: So khớp mã đối tác với tập enum chuẩn: `['GRAB', 'SHOPEE_FOOD', 'XANH_SM', 'AHAMOVE', 'BE', 'SANDBOX_MOCK']`.
- **Kết quả kỳ vọng**: Chứa đủ 6 mã không bị trùng lặp.
- **Kết quả thực tế**: Đầy đủ 6/6 mã hãng — **PASS** (0ms).

---

### NHÓM 3: THUẬT TOÁN GÁN HUY HIỆU THÔNG MINH (SMART BADGES)

#### Test Case TC-BADGE-01: Gán huy hiệu 🏆 CHEAPEST cho gói cước thấp nhất
- **Loại kiểm thử**: Algorithmic Correctness
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 1.1 trong `DOC-AC-001`
- **Các bước thực hiện**:
  1. Tìm gói cước có `badge === 'CHEAPEST'`.
  2. So sánh với giá trị cước nhỏ nhất `min(finalTotalFee)` trong toàn bộ danh sách.
- **Kết quả kỳ vọng**: Gói cước mang huy hiệu CHEAPEST phải có giá bằng đúng mức giá rẻ nhất thị trường tại thời điểm đó.
- **Kết quả thực tế**: Gói `SANDBOX_MOCK` (20.000đ) mang huy hiệu CHEAPEST — **PASS** (0ms).

#### Test Case TC-BADGE-02: Tính toán chính xác số tiền tiết kiệm `savingsVnd`
- **Loại kiểm thử**: Algorithmic Correctness
- **Mức độ**: P1 (Cao)
- **Các bước thực hiện**: Kiểm tra trường `cheapestQuote.savingsVnd`.
- **Kết quả kỳ vọng**: `savingsVnd === max(finalTotalFee) - min(finalTotalFee)`.
- **Kết quả thực tế**: `savingsVnd = 31.950đ - 20.000đ = 11.950đ` — **PASS** (0ms).

#### Test Case TC-BADGE-03: Gán huy hiệu ⚡ FASTEST cho dịch vụ giao nhanh nhất
- **Loại kiểm thử**: Algorithmic Correctness
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 1.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Kiểm tra gói có `badge === 'FASTEST'` và so sánh với thời gian ước tính ngắn nhất `totalEstimatedMinutes`.
- **Kết quả kỳ vọng**: Huy hiệu FASTEST thuộc về hãng có thời gian ngắn nhất (GrabExpress: 11 phút).
- **Kết quả thực tế**: Gán đúng cho `GRAB` (11 phút) — **PASS** (0ms).

#### Test Case TC-BADGE-04: Gán huy hiệu 🌿 GREENEST cho Xanh SM
- **Loại kiểm thử**: Algorithmic Correctness
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 1.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Kiểm tra thẻ cước của `XANH_SM`.
- **Kết quả kỳ vọng**: Mang huy hiệu `GREENEST` (trừ khi đạt CHEAPEST/FASTEST).
- **Kết quả thực tế**: Xanh SM mang huy hiệu `GREENEST` — **PASS** (0ms).

#### Test Case TC-BADGE-05: Tính chỉ số giảm phát thải CO2 xe máy điện VinFast
- **Loại kiểm thử**: Business Rule Validation
- **Mức độ**: P1 (Cao)
- **Các bước thực hiện**: Kiểm tra trường `co2SavingGrams` của Xanh SM (`cự ly 2.9 km x 42.5 g/km`).
- **Kết quả kỳ vọng**: `co2SavingGrams > 0` (kỳ vọng ~123 gam CO2).
- **Kết quả thực tế**: `co2SavingGrams = 123 gam` — **PASS** (0ms).

#### Test Case TC-BADGE-06: Thuật toán tính điểm cân bằng 🌟 BEST_VALUE
- **Loại kiểm thử**: Algorithmic Correctness
- **Mức độ**: P2 (Vừa)
- **Các bước thực hiện**: Kiểm tra thuật toán tính điểm trọng số chuẩn hóa `S = 0.6 * Giá + 0.4 * Thời gian`.
- **Kết quả kỳ vọng**: Một gói cước cân bằng được gán nhãn `BEST_VALUE`.
- **Kết quả thực tế**: Huy hiệu `BEST_VALUE` được gán chính xác — **PASS** (0ms).

---

### NHÓM 4: VÍ TRẢ TRƯỚC & TOÀN VẸN TÀI CHÍNH (WALLET & ACID)

#### Test Case TC-WALLET-01: Kiểm tra số dư khởi tạo của Merchant
- **Loại kiểm thử**: Financial Integrity
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `walletService.getWallet('usr_merchant_001')`.
- **Kết quả kỳ vọng**: `balance = 2.000.000đ`, `holdBalance = 0đ`, `availableBalance = 2.000.000đ`.
- **Kết quả thực tế**: Số dư khả dụng đúng `2.000.000 VNĐ` — **PASS** (0ms).

#### Test Case TC-WALLET-02: Tạm giữ số dư (HOLD_RESERVATION) khi đặt đơn
- **Loại kiểm thử**: Financial ACID Transaction
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `walletService.reserveHold('usr_merchant_001', 35000, 'FSH-QA-001', 'Test Hãng')`.
- **Kết quả kỳ vọng**: `availableBalance` giảm còn `1.965.000đ`, `holdBalance = 35.000đ`, `balance` tổng giữ nguyên `2.000.000đ`.
- **Kết quả thực tế**: Khớp chính xác 100% — **PASS** (0ms).

#### Test Case TC-WALLET-03: Hoàn trả số dư tạm giữ (RELEASE_HOLD) khi hủy hoặc lỗi
- **Loại kiểm thử**: Financial ACID Transaction
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.3 & 4.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `walletService.releaseHold('usr_merchant_001', 35000, 'FSH-QA-001', 'Test Refund')`.
- **Kết quả kỳ vọng**: `availableBalance` phục hồi về `2.000.000đ`, `holdBalance = 0đ`.
- **Kết quả thực tế**: Phục hồi trọn vẹn số dư khả dụng — **PASS** (0ms).

#### Test Case TC-WALLET-04: Quyết toán trừ tiền vĩnh viễn (SETTLE_PAYMENT)
- **Loại kiểm thử**: Financial Settlement
- **Mức độ**: P0 (Blocker)
- **Các bước thực hiện**: Gọi `walletService.reserveHold(...)` sau đó gọi `settlePayment(merchantId, 50000, orderCode)`.
- **Kết quả kỳ vọng**: `balance` giảm vĩnh viễn 50.000đ (còn 1.950.000đ), `holdBalance = 0đ`, `availableBalance = 1.950.000đ`.
- **Kết quả thực tế**: Quyết toán sổ cái thành công — **PASS** (0ms).

#### Test Case TC-WALLET-05: Kiểm tra sổ cái lịch sử giao dịch (Audit Ledger)
- **Loại kiểm thử**: Audit Trail
- **Mức độ**: P1 (Cao)
- **Các bước thực hiện**: Đọc `recentTransactions` từ ví Merchant.
- **Kết quả kỳ vọng**: Mỗi lệnh hold, release, settle đều sinh 1 bản ghi có mã giao dịch duy nhất, thời gian UTC và số dư trước/sau.
- **Kết quả thực tế**: Ghi nhận đầy đủ lịch sử với đầy đủ metadata — **PASS** (0ms).

---

### NHÓM 5: CHỐNG CLICK ĐÚP (IDEMPOTENCY GUARD)

#### Test Case TC-IDEMP-01: Cấp quyền xử lý cho request đầu tiên (ACQUIRED)
- **Loại kiểm thử**: Concurrency Control
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.5 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `idempotencyStore.acquire(key)` với key ngẫu nhiên.
- **Kết quả kỳ vọng**: Trả về `{ status: 'ACQUIRED' }`.
- **Kết quả thực tế**: Nhận quyền xử lý `ACQUIRED` — **PASS** (0ms).

#### Test Case TC-IDEMP-02: Từ chối request click đúp đồng thời (IN_PROGRESS / 409 Conflict)
- **Loại kiểm thử**: Concurrency & Security
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.5 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi lại `idempotencyStore.acquire(key)` ngay khi request trước đang xử lý (chưa resolve).
- **Kết quả kỳ vọng**: Trả về `{ status: 'IN_PROGRESS' }` tương ứng HTTP `409 Conflict`.
- **Kết quả thực tế**: Chặn đứng click đúp với `IN_PROGRESS` — **PASS** (0ms).

#### Test Case TC-IDEMP-03: Trả về kết quả lưu đệm khi người dùng Replay (CACHED)
- **Loại kiểm thử**: Idempotent Replay
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.5 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `idempotencyStore.resolve(key, cachedData)` rồi gọi lại `acquire(key)`.
- **Kết quả kỳ vọng**: Trả về `{ status: 'CACHED', cachedResponse: cachedData }` mà không trừ tiền hay tạo đơn mới.
- **Kết quả thực tế**: Replay trả kết quả đệm chính xác 100% — **PASS** (0ms).

---

### NHÓM 6: ĐẶT ĐƠN TÍCH HỢP & ĐIỀU PHỐI (ORDER BOOKING & DISPATCH)

#### Test Case TC-BOOK-01: SLA thời gian đặt đơn hàng ≤ 3.000ms
- **Loại kiểm thử**: Performance & Integration Test
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `orderService.createOrder(...)` và đo thời gian thực hiện.
- **Kết quả kỳ vọng**: Toàn bộ luồng tính cước + tạm giữ ví + dispatch sang hãng hoàn tất trong ≤ 3000ms.
- **Kết quả thực tế**: Hoàn thành trong `263 ms` (nhanh gấp 11 lần SLA) — **PASS** (263ms).

#### Test Case TC-BOOK-02: Mã định danh đơn hàng chuẩn `FSH-YYYYMMDD-XXXX`
- **Loại kiểm thử**: Data Format Validation
- **Mức độ**: P1 (Cao)
- **Ánh xạ AC**: Kịch bản 2.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Kiểm tra định dạng `orderCode` bằng Regex `/^FSH-\d{8}-\d{4}$/`.
- **Kết quả kỳ vọng**: Trùng khớp với định dạng mã hóa hệ thống.
- **Kết quả thực tế**: Khớp chuẩn (Ví dụ: `FSH-20261103-7218`) — **PASS** (1ms).

#### Test Case TC-BOOK-03: Sinh token bí mật 32 ký tự Hex URL-safe (`fsh_live_...`)
- **Loại kiểm thử**: Security & Privacy
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 3.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Kiểm tra định dạng `trackingToken` bằng Regex `/^fsh_live_[a-f0-9]{32}$/`.
- **Kết quả kỳ vọng**: Token dài 41 ký tự (gồm prefix), ngẫu nhiên bằng `crypto.randomBytes(16)`.
- **Kết quả thực tế**: Khớp chuẩn `fsh_live_664b5619bba6bea3f1a114aebb7566b0` — **PASS** (0ms).

#### Test Case TC-BOOK-04: Phân bổ và ghép tài xế tự động
- **Loại kiểm thử**: Integration Test
- **Mức độ**: P1 (Cao)
- **Các bước thực hiện**: Kiểm tra đối tượng `driver` trong phản hồi tạo đơn.
- **Kết quả kỳ vọng**: Chứa tên tài xế, số điện thoại, biển số xe và tọa độ GPS ban đầu.
- **Kết quả thực tế**: Tài xế Nguyễn Văn Test, biển số `29-M1 999.88` — **PASS** (0ms).

---

### NHÓM 7: TRA CỨU HÀNH TRÌNH CÔNG KHAI (LIVE TRACKING & PRIVACY)

#### Test Case TC-TRACK-01: Tra cứu công khai qua trackingToken không cần đăng nhập
- **Loại kiểm thử**: Functional & Security
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 3.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `orderService.getPublicTracking(trackingToken)`.
- **Kết quả kỳ vọng**: Trả về dữ liệu chi tiết của đơn hàng mà không bắt buộc kiểm tra Bearer token hay Cookie người dùng.
- **Kết quả thực tế**: Trả về đầy đủ thông tin lộ trình và hãng vận chuyển — **PASS** (0ms).

#### Test Case TC-TRACK-02: Kiểm tra dòng thời gian sự kiện (Tracking Timeline)
- **Loại kiểm thử**: Business Logic
- **Mức độ**: P1 (Cao)
- **Ánh xạ AC**: Kịch bản 3.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Kiểm tra mảng `timeline` trong phản hồi.
- **Kết quả kỳ vọng**: Có ít nhất 2 sự kiện: `BOOKED` (Tạo đơn) và `PICKING` (Tài xế nhận cuốc).
- **Kết quả thực tế**: Đầy đủ 2 sự kiện kèm timestamp chính xác — **PASS** (0ms).

#### Test Case TC-TRACK-03: Cập nhật tọa độ GPS tài xế di chuyển thời gian thực
- **Loại kiểm thử**: Real-time GPS Sync
- **Mức độ**: P1 (Cao)
- **Ánh xạ AC**: Kịch bản 3.2 trong `DOC-AC-001`
- **Các bước thực hiện**:
  1. Cập nhật vị trí mới qua `orderService.updateDriverLocation(orderCode, 21.0325, 105.8420)`.
  2. Tra cứu lại tracking.
- **Kết quả kỳ vọng**: Tọa độ GPS tài xế cập nhật thành `21.0325, 105.8420`.
- **Kết quả thực tế**: Khớp chính xác tọa độ mới và mốc thời gian cập nhật — **PASS** (0ms).

#### Test Case TC-TRACK-04: Xử lý an toàn khi tra cứu token không tồn tại
- **Loại kiểm thử**: Security & Error Handling
- **Mức độ**: P1 (Cao)
- **Các bước thực hiện**: Tra cứu với chuỗi `fsh_live_invalid_token_999999999999`.
- **Kết quả kỳ vọng**: Trả về `null` (hoặc HTTP 404), không crash hệ thống hoặc rò rỉ stack trace.
- **Kết quả thực tế**: Trả về `null` an toàn — **PASS** (0ms).

---

### NHÓM 8: HỦY ĐƠN & MA TRẬN CHUYỂN ĐỔI TRẠNG THÁI (CANCELLATION GUARD)

#### Test Case TC-CANCEL-01: Hủy đơn hàng hợp lệ ở trạng thái PICKING và hoàn tiền ví
- **Loại kiểm thử**: State Machine & Financial Refund
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 4.1 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `orderService.cancelOrder(orderCode, 'Chủ shop đổi lộ trình')`.
- **Kết quả kỳ vọng**: Trạng thái đơn chuyển thành `CANCELLED`, tiền cước tạm giữ được giải phóng hoàn lại ví 100%.
- **Kết quả thực tế**: Hủy đơn thành công, ví khả dụng được hoàn trả đầy đủ — **PASS** (0ms).

#### Test Case TC-CANCEL-02: Cấm hủy đơn hàng khi trạng thái là DELIVERING
- **Loại kiểm thử**: State Transition Guard
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 4.2 trong `DOC-AC-001` & Ma trận trạng thái `05_BUSINESS_RULES.md`
- **Các bước thực hiện**: Thử gọi `orderService.cancelOrder('FSH-20261103-8899', ...)` (đơn mẫu đang giao hàng).
- **Kết quả kỳ vọng**: Hệ thống ném lỗi mã `INVALID_STATE_TRANSITION` và chặn đứng hành động hủy.
- **Kết quả thực tế**: Bắt được mã lỗi `INVALID_STATE_TRANSITION` như mong đợi — **PASS** (0ms).

---

### NHÓM 9: NGOẠI LỆ, TIMEOUT 1.8S & CIRCUIT BREAKER (RESILIENCE SUITE)

#### Test Case TC-EXC-01: Cô lập lỗi Timeout 1.8s của hãng đối tác qua AbortController
- **Loại kiểm thử**: Fault-Tolerance & Timeout Isolation
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 1.2 trong `DOC-AC-001`
- **Tiền điều kiện**: Thiết lập `mockAdapter.shouldFailTimeout = true` (độ trễ 2500ms > 1800ms).
- **Các bước thực hiện**: Gọi báo giá song song `parallelQuotingEngineService.getAggregatedQuotes(req)`.
- **Kết quả kỳ vọng**:
  1. Hãng chậm trễ bị ngắt đúng mốc 1.8s bởi `AbortController`.
  2. Ghi nhận lỗi `CARRIER_TIMEOUT` trong mảng `failedCarriers`.
  3. 5 hãng còn lại vẫn trả kết quả bình thường mà không bị ảnh hưởng.
- **Kết quả thực tế**: Đạt đúng 1.806ms ngắt AbortError, trả về 5 báo giá thành công và 1 hãng thất bại — **PASS** (1806ms).

#### Test Case TC-EXC-02: Máy trạng thái Circuit Breaker (CLOSED ➔ OPEN ➔ HALF_OPEN ➔ CLOSED)
- **Loại kiểm thử**: Resilience Pattern
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Quy tắc BR-08 trong `05_BUSINESS_RULES.md`
- **Các bước thực hiện**:
  1. Khởi tạo Circuit Breaker với ngưỡng 3 lỗi, cooldown 400ms, success threshold 2.
  2. Ghi nhận 2 lỗi: trạng thái vẫn `CLOSED`.
  3. Ghi nhận lỗi thứ 3: trạng thái nhảy sang `OPEN`, `canExecute()` trả về `false` ngay lập tức (0ms).
  4. Chờ 450ms (hết cooldown): trạng thái chuyển sang `HALF_OPEN`, cho phép thăm dò.
  5. Ghi nhận 2 lần thành công liên tiếp: trạng thái hồi phục về `CLOSED`.
- **Kết quả kỳ vọng**: Máy trạng thái hoạt động chính xác theo đúng lý thuyết Circuit Breaker.
- **Kết quả thực tế**: Chuyển trạng thái 100% chính xác — **PASS** (452ms).

#### Test Case TC-EXC-03: Chặn đặt đơn khi số dư ví khả dụng không đủ
- **Loại kiểm thử**: Financial Validation
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.1 & Endpoint 2 trong `DOC-BE-002`
- **Các bước thực hiện**: Thử hold 999.000.000 VNĐ vượt quá số dư ví Merchant.
- **Kết quả kỳ vọng**: Hệ thống chặn và ném lỗi thông báo số dư khả dụng không đủ thanh toán.
- **Kết quả thực tế**: Bắt lỗi `không đủ để thanh toán` thành công — **PASS** (10ms).

#### Test Case TC-EXC-04: Hãng không có tài xế ➔ Tự động hoàn tiền tạm giữ ví
- **Loại kiểm thử**: Rollback & Compensation Flow
- **Mức độ**: P0 (Blocker)
- **Ánh xạ AC**: Kịch bản 2.3 trong `DOC-AC-001`
- **Tiền điều kiện**: Thiết lập `mockAdapter.shouldFailNoDriver = true`.
- **Các bước thực hiện**: Gọi `orderService.createOrder(...)`.
- **Kết quả kỳ vọng**:
  1. Bắt mã lỗi `CARRIER_DISPATCH_FAILED`.
  2. Lệnh `releaseHold` được kích hoạt tự động.
  3. Số dư khả dụng của Shop phục hồi nguyên vẹn như trước khi đặt đơn.
- **Kết quả thực tế**: Hoàn trả 100% tiền tạm giữ ngay lập tức — **PASS** (255ms).

#### Test Case TC-EXC-05: Chặn kiện hàng vượt quá 20kg của xe máy GrabExpress
- **Loại kiểm thử**: Boundary Value Analysis
- **Mức độ**: P1 (Cao)
- **Ánh xạ AC**: Kịch bản 1.4 trong `DOC-AC-001`
- **Các bước thực hiện**: Gửi yêu cầu tính cước với kiện hàng 25kg (25.000g) tới `GrabExpressAdapter`.
- **Kết quả kỳ vọng**: Trả về `success: false` kèm mã lỗi `PACKAGE_EXCEEDS_LIMITS`.
- **Kết quả thực tế**: Chặn chuẩn xác với mã `PACKAGE_EXCEEDS_LIMITS` — **PASS** (0ms).

---

### NHÓM 10: NẠP TIỀN VÍ QUA VIETQR NAPAS 247 ĐỘNG (VIETQR PAYMENTS)

#### Test Case TC-QR-01: Sinh mã VietQR Napas 247 động chuẩn EMVCo và URL ảnh MBBank
- **Loại kiểm thử**: Integration & Data Format
- **Mức độ**: P1 (Cao)
- **Ánh xạ AC**: Kịch bản 2.2 trong `DOC-AC-001`
- **Các bước thực hiện**: Gọi `generateVietQrTopup(500000)`.
- **Kết quả kỳ vọng**:
  1. Chuỗi `vietQrString` bắt đầu bằng `000201` và chứa mã BIN MBBank `970422`.
  2. `qrImageUrl` trỏ tới `img.vietqr.io` với số tiền 500.000đ.
- **Kết quả thực tế**: Sinh mã EMVCo chuẩn mực — **PASS** (0ms).

#### Test Case TC-QR-02: Kiểm soát hạn mức nạp tiền tối thiểu (50.000 VNĐ)
- **Loại kiểm thử**: Business Rule Validation
- **Mức độ**: P2 (Vừa)
- **Các bước thực hiện**: Thử tạo lệnh nạp 10.000đ qua `walletService.createTopupRequest(merchantId, 10000)`.
- **Kết quả kỳ vọng**: Ném lỗi cảnh báo số tiền tối thiểu là 50.000 VNĐ.
- **Kết quả thực tế**: Chặn đúng lỗi ngưỡng nạp — **PASS** (0ms).

---

## 3. KẾT LUẬN NGHIỆM THU TEST CASES

- **Tổng số trường hợp kiểm thử**: 39 Test Cases.
- **Số lượng vượt qua (Passed)**: 39 / 39 (100.00%).
- **Số lượng thất bại (Failed)**: 0.
- **Mức độ bao phủ kịch bản Acceptance Criteria**: **100%**.
