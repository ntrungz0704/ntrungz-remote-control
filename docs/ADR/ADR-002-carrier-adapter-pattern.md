# KIẾN TRÚC QUYẾT ĐỊNH (ADR-002): ÁP DỤNG CARRIER ADAPTER PATTERN CHO TÍCH HỢP ĐA HÃNG

- **Mã tài liệu**: `ADR-002`
- **Tiêu đề**: Ứng dụng Mô hình Kiến trúc Lục giác (Ports & Adapters) và Adapter Pattern để chuẩn hóa tích hợp các hãng giao hàng (Grab, ShopeeFood, Xanh SM, Ahamove, Be, Mock)
- **Trạng thái**: **ACCEPTED (ĐÃ PHÊ DUYỆT)**
- **Ngày quyết định**: 2026-11-03
- **Tác giả**: `system-architect` (Chuyên gia Kiến trúc Hệ thống)
- **Các bên liên quan**: `backend-engineer`, `qa-engineer`, `security-reviewer`

---

## 1. BỐI CẢNH VÀ VẤN ĐỀ (CONTEXT & PROBLEM STATEMENT)

Mỗi hãng giao hàng tức thì tại Việt Nam vận hành một hệ thống API hoàn toàn khác biệt:
- **Xác thực (Authentication)**: Grab sử dụng OAuth2 Client Credentials; ShopeeFood dùng HMAC-SHA256 trên từng URL; Xanh SM dùng Static Bearer Token; Ahamove truyền token qua query string.
- **Cấu trúc Dữ liệu (Data Schemas)**: Tên trường, đơn vị tiền tệ, phân cấp địa chỉ, cách định nghĩa kích thước kiện hàng (cm vs mm, gram vs kg) không có sự thống nhất.
- **Trạng thái Đơn hàng (Status Nomenclature)**: Grab gọi là `ALLOCATING`, ShopeeFood gọi là `FINDING_DRIVER`, Xanh SM gọi là `ASSIGNING_VEHICLE`, Ahamove gọi là `IN_PROCESS`.

Nếu mã nguồn ứng dụng gọi trực tiếp API của từng hãng hoặc nhúng các lệnh rẽ nhánh `if-else` vào sâu trong Business Logic, hệ thống sẽ nhanh chóng trở thành một "khối mã nguồn Spaghetti khổng lồ", cực kỳ dễ vỡ khi một hãng thay đổi phiên bản API, đồng thời không thể viết Unit Test độc lập.

---

## 2. CÁC PHƯƠNG ÁN ĐÃ XEM XÉT (CONSIDERED OPTIONS)

### Phương án 1: Viết Code Xử lý Trực tiếp tại Controller (Direct Integration)
- *Mô tả*: Mỗi khi có request tính cước, Controller gọi lần lượt hoặc gọi gộp các hàm `callGrabApi()`, `callShopeeApi()` ngay trong file route.
- *Hạn chế*: Vi phạm nghiêm trọng nguyên lý Single Responsibility (SRP) và Open/Closed (OCP). Mã nguồn bị khóa chặt vào cấu trúc của từng hãng. Không thể mock dữ liệu khi test.

### Phương án 2 (Được chọn): Mô Hình Hexagonal Architecture kết hợp Adapter Pattern
- *Mô tả*: 
  - Khai báo một giao diện chuẩn trừu tượng duy nhất: `ICarrierAdapter` (Outbound Port).
  - Tầng Business Logic Lõi (Domain Core) chỉ tương tác thông qua `ICarrierAdapter` với các kiểu dữ liệu đã chuẩn hóa (`CarrierQuoteRequest`, `CarrierQuoteResponse`, `CarrierBookingRequest`, `CarrierBookingResponse`).
  - Mỗi hãng vận chuyển được triển khai dưới dạng một lớp Adapter độc lập (`GrabExpressAdapter`, `ShopeeFoodAdapter`, `XanhSMAdapter`, `AhamoveAdapter`, `BeDeliveryAdapter`).
  - Xây dựng một `MockSandboxCarrierAdapter` như một thành viên hạng nhất để chạy test offline.

---

## 3. QUYẾT ĐỊNH KỸ THUẬT (DECISION OUTCOME)

Chúng tôi quyết định chọn **Phương án 2**:
1. **Thiết lập Interface Bắt buộc**: Mọi Adapter bắt buộc phải thực thi 6 phương thức chuẩn:
   - `getQuote(request)`: Tính cước và quy đổi về `CarrierQuoteItem`.
   - `createBooking(request)`: Đẩy đơn và quy đổi trạng thái về `BOOKED` hoặc `FAILED_DISPATCH`.
   - `cancelBooking(request)`: Hủy đơn theo mã vận đơn của hãng.
   - `getTracking(request)`: Tra cứu hành trình tài xế trực tiếp.
   - `verifyWebhookSignature(rawBody, headers)`: Thẩm định chữ ký số chống giả mạo.
   - `parseWebhookPayload(payload)`: Quy đổi webhook của hãng về `WebhookNormalizedEvent`.
2. **Quy đổi Máy trạng thái Chuẩn (State Mapping)**: Mọi mã trạng thái bất quy tắc của các hãng phải được ánh xạ về đúng **1 trong 10 trạng thái chuẩn** của FAST-SHIP-HUB đã quy định tại `docs/05_QUY_TAC_NGHIEP_VU_BUSINESS_RULES.md`.
3. **Cổng Giả lập Hạng nhất (First-Class Sandbox Mock)**:
   - `MockSandboxCarrierAdapter` được cài đặt sẵn, hỗ trợ mô phỏng mọi tình huống nghiệp vụ: chậm phản hồi, tài xế bận, giao hàng thành công, tài xế di chuyển GPS từng giây.

---

## 4. HỆ QUẢ VÀ ĐÁNH GIÁ (CONSEQUENCES)

### 4.1. Tác động Tích cực (Positive Impacts)
- **Khả năng Mở rộng Tuyệt vời (Open for Extension, Closed for Modification)**: Khi tích hợp thêm hãng mới (như Lalamove, ViettelPost Instant), lập trình viên chỉ cần tạo thêm file `LalamoveAdapter.ts` và đăng ký vào Adapter Registry mà không cần sửa bất kỳ dòng code nào trong Core Engine.
- **Tối ưu Hóa Quy Trình Phát Triển & Kiểm Thử**: Đội ngũ Frontend và QA có thể phát triển toàn bộ giao diện và kịch bản test bằng `MockSandboxCarrierAdapter` ngay cả khi hợp đồng pháp lý hoặc API Key của Grab/Xanh SM chưa được cấp.
- **Khả năng Cách ly Lỗi (Fault Isolation)**: Lỗi cấu trúc JSON từ một hãng đối tác chỉ dừng lại bên trong file Adapter của hãng đó, không bao giờ lan truyền (propagate) làm sập hệ thống lõi.

### 4.2. Thách thức và Biện pháp Giảm thiểu (Mitigation Strategies)
- *Thách thức*: Đòi hỏi viết các hàm Mapper chuyển đổi qua lại giữa định dạng riêng của hãng và định dạng chuẩn hệ thống.
  - *Biện pháp*: Sử dụng Zod Schemas để parse và validate cả request gửi đi lẫn response nhận về từ hãng, phát hiện sớm các thay đổi bất ngờ từ phía đối tác.
