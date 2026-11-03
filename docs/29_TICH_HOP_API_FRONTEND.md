# TÀI LIỆU TÍCH HỢP API FRONTEND (FRONTEND API INTEGRATION GUIDE)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-FE-003` | **Phiên bản**: `1.0.0` | **Trạng thái**: `APPROVED_AND_IMPLEMENTED`  
> **Tác giả**: `frontend-engineer` (Kỹ sư Frontend Cấp Cao)  
> **Hợp đồng API tham chiếu**: `docs/22_HOP_DONG_GIAO_TIEP_API_CONTRACTS.md`

---

## 1. NGUYÊN TẮC TÍCH HỢP CHUẨN MỰC (INTEGRATION PRINCIPLES)

1. **Zero-Mock Policy (Tuyệt đối không dùng dữ liệu giả lập tĩnh)**: Toàn bộ giao diện người dùng kết nối trực tiếp với hệ thống API Handlers thực tế (`/api/v1/*`), đảm bảo dữ liệu hiển thị là dữ liệu nghiệp vụ thật từ Backend Engine.
2. **Type-Safe Contract**: Tái sử dụng 100% các Types và Interfaces đã định nghĩa trong `src/types/carrier.types.ts` và `src/types/api.types.ts`.
3. **Idempotency Guard**: Mọi giao dịch tạo đơn đều bắt buộc truyền Header `Idempotency-Key` (UUIDv4) để ngăn chặn trừ tiền ví hai lần khi click nhanh.
4. **Resilient SSE Streaming**: Cơ chế theo dõi GPS tài xế sử dụng `EventSource` chuẩn của trình duyệt, tự động kết nối lại khi gián đoạn mạng.

---

## 2. DANH MỤC CÁC ENDPOINT TÍCH HỢP TRÊN GIAO DIỆN

### 2.1. API So Sánh Cước Đa Hãng Thời Gian Thực
- **Endpoint**: `POST /api/v1/quotes`
- **Màn hình sử dụng**: Trang Chủ (`/`) và Màn hình So sánh cước (`/quote`)
- **Headers**: `Content-Type: application/json`, `x-request-id: <uuid>`
- **Request Body**:
  ```json
  {
    "pickup": {
      "latitude": 21.028511,
      "longitude": 105.854444,
      "address": "Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội",
      "senderOrReceiverName": "Kho Hàng Tràng Tiền",
      "phoneNumber": "0988111222"
    },
    "dropoff": {
      "latitude": 21.037288,
      "longitude": 105.834466,
      "address": "Số 280 Đội Cấn, Ba Đình, Hà Nội",
      "senderOrReceiverName": "Nguyễn Văn Nhận",
      "phoneNumber": "0912333444"
    },
    "packageDetails": {
      "name": "Hộp quà thời trang",
      "weightInGrams": 1500,
      "lengthCm": 30,
      "widthCm": 20,
      "heightCm": 10,
      "packageType": "FASHION",
      "declaredValueVnd": 500000,
      "codAmountVnd": 0,
      "deliverToDoor": true
    },
    "serviceTier": "BIKE_INSTANT"
  }
  ```
- **Xử lý UI**:
  - Khi bắt đầu gọi: Kích hoạt trạng thái Skeleton Shimmer cho 5 thẻ cước.
  - Phản hồi thành công: Sắp xếp theo giá tăng dần, kích hoạt đồng hồ đếm ngược TTL 300 giây, highlight thẻ rẻ nhất / nhanh nhất.
  - Trường hợp 1 hãng bị lỗi/timeout: Hiển thị thẻ mờ ở cuối, không làm ảnh hưởng các hãng khác.

---

### 2.2. API Đặt Đơn Hàng 1-Click
- **Endpoint**: `POST /api/v1/orders`
- **Màn hình sử dụng**: Màn hình Xác nhận Đặt Đơn (`/orders/new`)
- **Headers**: 
  - `Content-Type: application/json`
  - `Idempotency-Key: <UUIDv4>` (Bắt buộc)
  - `x-request-id: <UUIDv4>`
- **Request Body**:
  ```json
  {
    "quoteReferenceId": "QR-GRAB-1730648900",
    "carrierCode": "XANH_SM",
    "serviceTier": "BIKE_INSTANT",
    "pickup": { ... },
    "dropoff": { ... },
    "packageDetails": { ... },
    "paymentMethod": "WALLET",
    "notesForDriver": "Giao giờ hành chính, gọi trước 10 phút"
  }
  ```
- **Xử lý UI**:
  - Khóa nút "Xác Nhận Đặt Đơn" ngay sau khi click (`disabled={isSubmitting}`).
  - Nếu thành công (HTTP 201): Chuyển hướng ngay tới `/track/:trackingNumber` kèm Toast thông báo thành công.
  - Nếu thiếu tiền ví (`INSUFFICIENT_WALLET_BALANCE` - HTTP 422): Mở Modal nạp tiền VietQR kèm số tiền cần nạp bổ sung.

---

### 2.3. API Tra Cứu Live Tracking Công Khai (Guest Safe)
- **Endpoint**: `GET /api/v1/tracking/:trackingNumber`
- **Màn hình sử dụng**: Màn hình Live Tracking (`/track/[trackingNumber]`)
- **Đầu ra**: Trả về dữ liệu hành trình, vị trí tài xế, ảnh đại diện, xe máy điện VinFast, và timeline các mốc sự kiện.

---

### 2.4. API Kết Nối Luồng Server-Sent Events (SSE) Live Tracking
- **Endpoint**: `GET /api/v1/tracking/:trackingNumber/stream`
- **Màn hình sử dụng**: Màn hình Live Tracking (`/track/[trackingNumber]`)
- **Cơ chế hoạt động**:
  ```typescript
  const eventSource = new EventSource(`/api/v1/tracking/${trackingNumber}/stream`);
  
  eventSource.addEventListener('status', (e) => {
    const data = JSON.parse(e.data);
    updateOrderStatus(data.status, data.statusLabel);
  });
  
  eventSource.addEventListener('location', (e) => {
    const data = JSON.parse(e.data);
    updateDriverLocation(data.latitude, data.longitude, data.etaMinutes);
  });
  ```
- **Xử lý UI**: Tọa độ GPS tài xế được nội suy để xe di chuyển mượt mà trên bản đồ SVG không bị giật lag.

---

### 2.5. API Quản Trị Ví Tiền & Nạp VietQR
- **Tra cứu ví**: `GET /api/v1/wallet` (Lấy số dư khả dụng, số dư hold, 20 giao dịch gần nhất).
- **Tạo mã nạp tiền VietQR**: `POST /api/v1/wallet/topup`
  - **Body**: `{ "amount": 500000, "paymentMethod": "VIETQR" }`
  - **Đầu ra**: Trả về URL ảnh QR động, mã giao dịch, và số tài khoản ngân hàng MBBank để hiển thị trong Modal.

---

### 2.6. API Quản Lý Đơn Hàng Của Shop
- **Danh sách đơn**: `GET /api/v1/orders?status=DELIVERING&carrierCode=XANH_SM&page=1&limit=20`
- **Hủy đơn hàng**: `POST /api/v1/orders/:orderCode/cancel`
  - **Body**: `{ "reason": "Khách đổi ý muốn dời lịch giao" }`
  - **Xử lý UI**: Cảnh báo xác nhận trước khi hủy. Tự động cập nhật trạng thái đơn thành CANCELLED và cộng hoàn số dư ví.

---
*Tài liệu hướng dẫn đã hoàn thiện và được áp dụng làm quy chuẩn kiểm thử tích hợp Frontend-Backend.*
