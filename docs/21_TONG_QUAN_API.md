# TỔNG QUAN DANH MỤC API HỆ THỐNG (API OVERVIEW & DIRECTORY)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-BE-001` | **Phiên bản**: `1.0.0` | **Trạng thái**: `APPROVED_FOR_FRONTEND_AND_INTEGRATION`  
> **Tác giả**: `backend-engineer` (Kỹ Sư Backend Cấp Cao)  
> **Đối tượng áp dụng**: `frontend-engineer`, `qa-engineer`, `security-reviewer`, `devops-engineer`

---

## 1. NGUYÊN TẮC THIẾT KẾ & TIÊU CHUẨN KỸ THUẬT

Hệ thống API của `FAST-SHIP-HUB` được xây dựng dựa trên các nguyên tắc thiết kế hiện đại nhằm đảm bảo độ tin cậy, tốc độ cao và tính bảo mật nghiêm ngặt:

1. **Kiến trúc RESTful kết hợp Streaming (SSE)**:
   - Các API trao đổi dữ liệu tuân thủ chuẩn RESTful qua giao thức HTTPS.
   - Luồng cập nhật vị trí GPS tài xế và trạng thái theo dõi thời gian thực sử dụng **Server-Sent Events (SSE)** thông qua Web Standards `ReadableStream`.
2. **Tiền tố phiên bản (API Versioning)**:
   - Mọi endpoint công khai đều bắt đầu bằng tiền tố `/api/v1/` để đảm bảo tính tương thích ngược lâu dài.
3. **Phong bì phản hồi thống nhất (Unified Response Envelope)**:
   - 100% phản hồi từ server (kể cả thành công và thất bại) đều được bao bọc trong định dạng `ApiResponse<T>` chuẩn hóa với `timestamp` và `traceId` (UUIDv4) để phục vụ truy vết lỗi phân tán.
4. **Tiền tệ & Đo đạc chuẩn hóa**:
   - Tất cả giá trị tiền tệ đều là số nguyên chuẩn `VNĐ` (không dùng số thập phân).
   - Khoảng cách tính bằng mét (`meters`), thời gian tính bằng giây (`seconds`) hoặc phút (`minutes`), khối lượng tính bằng gram (`grams`), kích thước tính bằng xentimét (`cm`).
5. **Độ trễ mục tiêu (Latency SLA)**:
   - API Báo giá song song (`POST /api/v1/quotes`): **P95 ≤ 1.500ms** (Áp dụng ngắt mạch Timeout 1.800ms cho từng Adapter).
   - API Đặt đơn (`POST /api/v1/orders`): **P95 ≤ 1.000ms**.
   - API Tra cứu Tracking (`GET /api/v1/tracking/:trackingNumber`): **P95 ≤ 150ms** (Tối ưu hóa với B-tree Partial Indexes trên PostgreSQL).

---

## 2. QUY CHUẨN HEADERS YÊU CẦU

| Tên Header | Bắt buộc | Định dạng | Mô tả & Mục đích |
| :--- | :---: | :--- | :--- |
| `Content-Type` | Có (POST/PUT) | `application/json` | Định dạng dữ liệu gửi lên body |
| `Accept` | Tùy chọn | `application/json` hoặc `text/event-stream` | `text/event-stream` dùng riêng cho endpoint SSE Tracking |
| `Authorization` | Có (trừ Public API) | `Bearer <JWT_TOKEN>` hoặc Cookie | Token xác thực danh tính người dùng (Merchant/Admin) |
| `Idempotency-Key` | Bắt buộc (Tạo đơn) | `UUIDv4` (VD: `550e8400-e29b-41d4-a716-446655440000`) | Khóa chống click đúp và chống tạo trùng đơn (TTL: 120s) |
| `X-Request-Id` | Khuyến nghị | `UUIDv4` | Mã định danh truy vết xuyên suốt từ Client đến Gateway |
| `X-Signature` | Bắt buộc (Webhooks) | `hex-encoded HMAC-SHA256` | Chữ ký số xác thực webhook từ các đối tác (Grab, Shopee, Xanh SM...) |

---

## 3. DANH MỤC TẤT CẢ CÁC ENDPOINTS HỆ THỐNG

### 3.1. Phân hệ Báo Giá & So Sánh Cước Đa Hãng (Quotation Domain)

| Phương thức | Đường dẫn Endpoint | Quyền hạn | Mô tả chức năng |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/quotes` | `Public / Merchant` | Gọi đồng thời (Parallel Quoting) tới 6 hãng: Grab, ShopeeFood, Xanh SM, Ahamove, Be, Mock Sandbox. Tự động áp dụng Timeout 1.8s, Circuit Breaker và gắn 4 Smart Badges (🏆 Rẻ nhất, ⚡ Nhanh nhất, 🌿 Xanh nhất, 🌟 Tối ưu). |

### 3.2. Phân hệ Đơn Hàng & Điều Phối (Order & Dispatch Domain)

| Phương thức | Đường dẫn Endpoint | Quyền hạn | Mô tả chức năng |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/orders` | `Merchant / Admin` | Tạo đơn hàng mới, kiểm tra và tạm giữ số dư ví (`hold_balance`), dispatch yêu cầu đặt cuốc sang API hãng đã chọn. Bắt buộc header `Idempotency-Key`. |
| `GET` | `/api/v1/orders` | `Merchant / Admin` | Lấy danh sách đơn hàng đã tạo của tài khoản hiện tại, hỗ trợ phân trang (`page`, `limit`), lọc theo `status`, `carrierCode`, ngày tạo. |
| `GET` | `/api/v1/orders/:orderCode` | `Merchant / Admin` | Tra cứu toàn bộ chi tiết đơn hàng nội bộ: gói hàng, thông tin tài xế, bóc tách cước phí sàn và hãng, lịch sử 10 trạng thái đơn. |
| `POST` | `/api/v1/orders/:orderCode/cancel`| `Merchant / Admin` | Hủy đơn hàng đang ở trạng thái `BOOKED` hoặc `PICKING`. Tự động gọi API hủy sang hãng và xử lý hoàn tiền ví theo ma trận quy định hủy đơn. |

### 3.3. Phân hệ Tra Cứu Hành Trình Thời Gian Thực (Live Tracking Domain)

| Phương thức | Đường dẫn Endpoint | Quyền hạn | Mô tả chức năng |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/v1/tracking/:trackingNumber` | `Public (Guest)` | Tra cứu thông tin hành trình giao hàng công khai (Read-only) bằng `trackingToken` (32 ký tự URL-safe) mà không cần đăng nhập. Ẩn toàn bộ thông tin nhạy cảm. |
| `GET` | `/api/v1/tracking/:trackingNumber/stream` | `Public (Guest)` | Kênh kết nối Server-Sent Events (SSE) đẩy dữ liệu tọa độ GPS tài xế (mỗi 3s - 5s) và cập nhật thay đổi trạng thái cuốc xe trực tiếp lên bản đồ. |

### 3.4. Phân hệ Ví Trả Trước & Nạp Tiền VietQR (Prepaid Wallet Domain)

| Phương thức | Đường dẫn Endpoint | Quyền hạn | Mô tả chức năng |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/v1/wallet` | `Merchant / Admin` | Xem thông tin số dư ví hiện tại: Số dư tổng (`balance`), Số dư tạm giữ (`hold_balance`), Số dư khả dụng (`available_balance = balance - hold_balance`), kèm 20 giao dịch sổ cái gần nhất. |
| `POST` | `/api/v1/wallet/topup` | `Merchant / Admin` | Tạo yêu cầu nạp ví trả trước: Sinh mã giao dịch nạp duy nhất và trả về chuỗi VietQR chuẩn Napas 247 kèm link ảnh QR để người dùng quét nạp tiền tự động 24/7. |

### 3.5. Phân hệ Tiếp Nhận Webhook Đối Tác (Carrier Webhook Gateway)

| Phương thức | Đường dẫn Endpoint | Quyền hạn | Mô tả chức năng |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/webhooks/:carrier` | `Carrier Partner` | Tiếp nhận webhook cập nhật trạng thái đơn hàng và vị trí GPS tài xế từ hãng đối tác (`grab`, `shopeefood`, `xanhsm`, `ahamove`, `be`, `sandbox`). Xác thực chữ ký số HMAC-SHA256, khử trùng lặp Idempotency và cập nhật CSDL. |

---

## 4. BẢNG MÃ LỖI CHUẨN HÓA & MÃ TRẠNG THÁI HTTP (ERROR CODE CATALOG)

| Mã Lỗi Hệ Thống | HTTP Status | Thông Báo Tiếng Việt Thân Thiện | Nguyên Nhân Kỹ Thuật |
| :--- | :---: | :--- | :--- |
| `VALIDATION_ERROR` | `400` | Dữ liệu đầu vào không hợp lệ hoặc thiếu trường bắt buộc | Thất bại trong bước Zod schema validation |
| `UNAUTHORIZED` | `401` | Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc | Thiếu JWT cookie hoặc Access Token không hợp lệ |
| `FORBIDDEN` | `403` | Bạn không có quyền truy cập vào tài nguyên này | Người dùng cố tình truy vấn đơn của chủ shop khác |
| `NOT_FOUND` | `404` | Không tìm thấy tài nguyên yêu cầu trên hệ thống | Mã đơn `orderCode` hoặc `trackingToken` không tồn tại |
| `IDEMPOTENCY_CONFLICT` | `409` | Yêu cầu tạo đơn đang được xử lý, vui lòng không gửi lại | Khóa `Idempotency-Key` đang ở trạng thái `PROCESSING` |
| `INVALID_STATE_TRANSITION`| `409` | Thao tác không hợp lệ đối với trạng thái đơn hiện tại | Hủy đơn khi shipper đã lấy hàng (`DELIVERING`) |
| `INSUFFICIENT_WALLET_BALANCE`| `422` | Số dư khả dụng trong ví không đủ để thanh toán cước | `available_balance < final_total_fee` |
| `PACKAGE_EXCEEDS_LIMITS` | `422` | Kiện hàng vượt quá kích thước hoặc trọng lượng xe máy | Trọng lượng > 30kg hoặc kích thước > 50x40x50cm |
| `DISTANCE_EXCEEDS_LIMIT` | `422` | Khoảng cách giao hàng vượt quá bán kính phục vụ (50km) | Tuyến đường nằm ngoài phạm vi giao tức thì |
| `RATE_LIMIT_EXCEEDED` | `429` | Bạn thao tác quá nhanh, vui lòng thử lại sau giây lát | Vượt quá ngưỡng 60 requests/phút/IP |
| `CARRIER_DISPATCH_FAILED`| `502` | Hãng vận chuyển không thể điều phối tài xế khu vực này | Đối tác trả về lỗi hết xe; hệ thống tự hoàn tiền ví |
| `CARRIER_CIRCUIT_OPEN` | `503` | Cổng kết nối hãng đang bảo trì tạm thời | Bộ ngắt mạch Circuit Breaker của hãng đang `OPEN` |
| `CARRIER_TIMEOUT` | `504` | Hãng vận chuyển phản hồi quá thời gian cho phép (1.8s) | Bị ngắt bởi `AbortController(1800ms)` |
| `INTERNAL_SERVER_ERROR` | `500` | Hệ thống gặp lỗi xử lý ngoài dự kiến | Unhandled exception trong server route handler |

---

## 5. CHÍNH SÁCH BẢO MẬT & RATE LIMITING

1. **Bảo vệ chống DDoS & Spam**:
   - Áp dụng Token Bucket / Sliding Window qua Redis với giới hạn **60 requests / phút** cho mỗi địa chỉ IP đối với endpoint báo giá và đặt đơn.
   - Endpoint Tra cứu Live Tracking công khai: Tối đa **120 requests / phút / IP**.
2. **Chính sách CORS**:
   - Chỉ cho phép các domain được cấu hình trong `ALLOWED_ORIGINS` (mặc định: giao diện web FAST-SHIP-HUB) gọi trực tiếp API.
   - Chặn toàn bộ các request trái phép từ origin lạ đối với các endpoint thanh toán và ví.
3. **Bảo mật Webhook**:
   - Sử dụng thuật toán `crypto.timingSafeEqual()` khi đối soát mã băm HMAC-SHA256 nhằm ngăn chặn hoàn toàn tấn công kênh phụ dò thời gian (Timing Attack).
