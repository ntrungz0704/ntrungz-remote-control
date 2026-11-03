# HỢP ĐỒNG GIAO TIẾP API ĐÓNG BĂNG CHO FRONTEND (API CONTRACTS SPECIFICATION)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-BE-002` | **Phiên bản**: `1.0.0` | **Trạng thái**: `FROZEN_FOR_FRONTEND`  
> **Tác giả**: `backend-engineer` (Kỹ Sư Backend Cấp Cao)  
> **Người tiếp nhận**: `frontend-engineer`, `qa-engineer`, `security-reviewer`

---

## 1. NGUYÊN TẮC HỢP ĐỒNG ĐÓNG BĂNG (FROZEN CONTRACT POLICY)

1. Tài liệu này là **hợp đồng kỹ thuật bất biến** giữa đội ngũ Backend và Frontend. Mọi tên trường (Field names), kiểu dữ liệu (Types), cấu trúc lồng nhau (Nesting) và mã lỗi (Error codes) đã được chuẩn hóa và **đóng băng 100%**.
2. Phía Frontend có thể tự tin sử dụng các schema và interface dưới đây để tạo Mock Service Worker (MSW), viết kịch bản kiểm thử Vitest/Playwright và xây dựng UI mà không sợ bị breaking change.
3. Mọi phản hồi thành công hoặc thất bại đều tuân thủ phong bì `ApiResponse<T>`:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    processingTimeMs?: number;
    [key: string]: unknown;
  };
  timestamp: string; // ISO 8601 UTC
  traceId: string;   // UUIDv4
}
```

---

## 2. CHI TIẾT HỢP ĐỒNG CÁC ENDPOINT TRỌNG ĐIỂM

### 2.1. Endpoint 1: Báo Giá Cước Đa Hãng Đồng Thời (`POST /api/v1/quotes`)

- **Mục đích**: Nhận thông tin tuyến đường và kiện hàng, gọi song song 6 hãng vận chuyển và trả về danh sách gói cước được xếp hạng thông minh trong vòng ≤ 1.500ms.
- **Xác thực**: Public (Khách vãng lai) hoặc Cookie / Header Bearer (Merchant).

#### Schema Request Payload:
```json
{
  "pickup": {
    "latitude": 21.028511,
    "longitude": 105.854444,
    "address": "Số 1 Tràng Tiền, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội",
    "senderOrReceiverName": "Kho Hàng Tràng Tiền",
    "phoneNumber": "0988111222",
    "note": "Gọi trước khi lấy, bấm chuông cửa cuốn tầng 1"
  },
  "dropoff": {
    "latitude": 21.037288,
    "longitude": 105.834466,
    "address": "Số 280 Đội Cấn, Phường Liễu Giai, Quận Ba Đình, Hà Nội",
    "senderOrReceiverName": "Nguyễn Văn Nhận",
    "phoneNumber": "0912333444",
    "note": "Giao giờ hành chính, gọi trước 10 phút"
  },
  "packageDetails": {
    "name": "Hộp quần áo thời trang dạ hội",
    "packageType": "FASHION",
    "weightInGrams": 1500,
    "lengthCm": 30,
    "widthCm": 20,
    "heightCm": 10,
    "declaredValueVnd": 500000,
    "codAmountVnd": 0,
    "isFragile": false,
    "deliverToDoor": true
  },
  "serviceTier": "BIKE_INSTANT"
}
```

#### Schema Response Thành Công (`200 OK`):
```json
{
  "success": true,
  "data": {
    "origin": {
      "latitude": 21.028511,
      "longitude": 105.854444,
      "address": "Số 1 Tràng Tiền, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội",
      "senderOrReceiverName": "Kho Hàng Tràng Tiền",
      "phoneNumber": "0988111222"
    },
    "destination": {
      "latitude": 21.037288,
      "longitude": 105.834466,
      "address": "Số 280 Đội Cấn, Phường Liễu Giai, Quận Ba Đình, Hà Nội",
      "senderOrReceiverName": "Nguyễn Văn Nhận",
      "phoneNumber": "0912333444"
    },
    "route": {
      "distanceMeters": 4200,
      "durationSeconds": 780,
      "polyline": "m`~aAc_`iS..."
    },
    "quotes": [
      {
        "carrierCode": "XANH_SM",
        "carrierServiceName": "Xanh SM Bike Delivery (Xe Máy Điện)",
        "serviceTier": "BIKE_INSTANT",
        "baseFee": 14000,
        "surcharges": 0,
        "discountAmount": 0,
        "carrierOriginalTotal": 25440,
        "platformFee": 1000,
        "finalTotalFee": 26440,
        "estimatedPickupMinutes": 4,
        "estimatedDeliveryMinutes": 13,
        "totalEstimatedMinutes": 17,
        "currency": "VND",
        "expiredAt": "2026-11-04T00:25:00.000Z",
        "quoteReferenceId": "QUOTE-XANH-8912345",
        "badge": "GREENEST",
        "co2SavingGrams": 178,
        "breakdown": {
          "baseDistanceKm": 2,
          "extraDistanceKm": 2.2,
          "pricePerNextKm": 5200,
          "nightSurcharge": 0,
          "surgeMultiplier": 1.0
        }
      },
      {
        "carrierCode": "SHOPEE_FOOD",
        "carrierServiceName": "ShopeeFood Instant Siêu Tốc",
        "serviceTier": "BIKE_INSTANT",
        "baseFee": 15000,
        "surcharges": 0,
        "discountAmount": 0,
        "carrierOriginalTotal": 25000,
        "platformFee": 1000,
        "finalTotalFee": 26000,
        "estimatedPickupMinutes": 6,
        "estimatedDeliveryMinutes": 15,
        "totalEstimatedMinutes": 21,
        "currency": "VND",
        "expiredAt": "2026-11-04T00:25:00.000Z",
        "quoteReferenceId": "QUOTE-SHOPEE-991823",
        "badge": "CHEAPEST",
        "savingsVnd": 4500,
        "breakdown": {
          "baseDistanceKm": 2,
          "extraDistanceKm": 2.2,
          "pricePerNextKm": 5000,
          "nightSurcharge": 0,
          "surgeMultiplier": 1.0
        }
      },
      {
        "carrierCode": "GRAB",
        "carrierServiceName": "GrabExpress Siêu Tốc",
        "serviceTier": "BIKE_INSTANT",
        "baseFee": 16000,
        "surcharges": 0,
        "discountAmount": 0,
        "carrierOriginalTotal": 28100,
        "platformFee": 1000,
        "finalTotalFee": 29100,
        "estimatedPickupMinutes": 3,
        "estimatedDeliveryMinutes": 11,
        "totalEstimatedMinutes": 14,
        "currency": "VND",
        "expiredAt": "2026-11-04T00:25:00.000Z",
        "quoteReferenceId": "QUOTE-GRAB-771625",
        "badge": "FASTEST",
        "breakdown": {
          "baseDistanceKm": 2,
          "extraDistanceKm": 2.2,
          "pricePerNextKm": 5500,
          "nightSurcharge": 0,
          "surgeMultiplier": 1.0
        }
      },
      {
        "carrierCode": "SANDBOX_MOCK",
        "carrierServiceName": "FAST-SHIP Sandbox Siêu Tốc (Mô phỏng)",
        "serviceTier": "BIKE_INSTANT",
        "baseFee": 14500,
        "surcharges": 0,
        "discountAmount": 0,
        "carrierOriginalTotal": 25500,
        "platformFee": 1000,
        "finalTotalFee": 26500,
        "estimatedPickupMinutes": 5,
        "estimatedDeliveryMinutes": 15,
        "totalEstimatedMinutes": 20,
        "currency": "VND",
        "expiredAt": "2026-11-04T00:25:00.000Z",
        "quoteReferenceId": "QUOTE-MOCK-1730678900",
        "badge": "BEST_VALUE",
        "breakdown": {
          "baseDistanceKm": 2,
          "extraDistanceKm": 2.2,
          "pricePerNextKm": 5000,
          "nightSurcharge": 0,
          "surgeMultiplier": 1.0
        }
      }
    ],
    "failedCarriers": [
      {
        "carrierCode": "BE",
        "errorCode": "CARRIER_TIMEOUT",
        "errorMessage": "Đối tác Be phản hồi quá thời gian cho phép (1.8s)",
        "durationMs": 1802
      }
    ],
    "summary": {
      "totalCarriersQueried": 6,
      "successfulQuotes": 5,
      "failedCount": 1,
      "cheapestCarrier": "SHOPEE_FOOD",
      "fastestCarrier": "GRAB",
      "recommendedCarrier": "SANDBOX_MOCK",
      "ttlSeconds": 300,
      "expiresAt": "2026-11-04T00:25:00.000Z"
    }
  },
  "metadata": {
    "processingTimeMs": 850
  },
  "timestamp": "2026-11-04T00:20:00.850Z",
  "traceId": "9d8e7f6a-5b4c-3d2e-1f0a-123456789abc"
}
```

---

### 2.2. Endpoint 2: Tạo Đơn Hàng & Dispatch Đối Tác (`POST /api/v1/orders`)

- **Mục đích**: Nhận quyết định chọn hãng từ phía người dùng, trừ/tạm giữ ví trả trước và gửi lệnh đặt xe tức thì sang hãng đối tác.
- **Headers bắt buộc**: `Idempotency-Key: <UUIDv4>`
- **Xác thực**: Bắt buộc đăng nhập (`MERCHANT` hoặc `ADMIN`).

#### Schema Request Payload:
```json
{
  "quoteReferenceId": "QUOTE-XANH-8912345",
  "carrierCode": "XANH_SM",
  "serviceTier": "BIKE_INSTANT",
  "pickup": {
    "latitude": 21.028511,
    "longitude": 105.854444,
    "address": "Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội",
    "senderOrReceiverName": "Kho Hàng Tràng Tiền",
    "phoneNumber": "0988111222",
    "note": "Bấm chuông tầng 1"
  },
  "dropoff": {
    "latitude": 21.037288,
    "longitude": 105.834466,
    "address": "Số 280 Đội Cấn, Ba Đình, Hà Nội",
    "senderOrReceiverName": "Nguyễn Văn Nhận",
    "phoneNumber": "0912333444",
    "note": "Gọi trước khi giao"
  },
  "packageDetails": {
    "name": "Hộp quần áo thời trang dạ hội",
    "packageType": "FASHION",
    "weightInGrams": 1500,
    "lengthCm": 30,
    "widthCm": 20,
    "heightCm": 10,
    "declaredValueVnd": 500000,
    "codAmountVnd": 0,
    "isFragile": false,
    "deliverToDoor": true
  },
  "paymentMethod": "WALLET",
  "notesForDriver": "Hàng quần áo dễ rách, xin nhẹ tay"
}
```

#### Schema Response Thành Công (`201 Created`):
```json
{
  "success": true,
  "data": {
    "orderCode": "FSH-20261104-0012",
    "trackingToken": "fsh_live_89a7df6b02a4b3c1d9e20011a8b9c0d1",
    "trackingUrl": "/track/fsh_live_89a7df6b02a4b3c1d9e20011a8b9c0d1",
    "carrierCode": "XANH_SM",
    "carrierOrderId": "GSM-DELIVERY-99123",
    "status": "PICKING",
    "fare": {
      "baseFee": 14000,
      "surcharges": 0,
      "platformFee": 1000,
      "discountAmount": 0,
      "finalTotalFee": 26440
    },
    "paymentSummary": {
      "paymentMethod": "WALLET",
      "walletBalanceBefore": 2000000,
      "holdAmount": 26440,
      "walletAvailableAfter": 1973560
    },
    "driver": {
      "name": "Trần Văn Bình",
      "phone": "0977889900",
      "licensePlate": "29-E1 668.99",
      "vehicleType": "ELECTRIC_BIKE",
      "avatarUrl": "https://cdn.fastshiphub.vn/drivers/xanhsm-binh.jpg",
      "currentLocation": {
        "latitude": 21.030112,
        "longitude": 105.852331,
        "updatedAt": "2026-11-04T00:20:05.000Z"
      }
    },
    "estimatedPickupMinutes": 4,
    "createdAt": "2026-11-04T00:20:05.000Z"
  },
  "metadata": {
    "processingTimeMs": 480
  },
  "timestamp": "2026-11-04T00:20:05.480Z",
  "traceId": "b1a2c3d4-e5f6-7a8b-9c0d-ef1234567890"
}
```

#### Schema Response Lỗi Ví Không Đủ Tiền (`422 Unprocessable Entity`):
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_WALLET_BALANCE",
    "message": "Số dư khả dụng trong ví không đủ để thanh toán cước phí đơn hàng",
    "details": {
      "requiredAmount": 26440,
      "availableBalance": 10000,
      "deficit": 16440
    }
  },
  "timestamp": "2026-11-04T00:20:06.100Z",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef0123456789"
}
```

#### Schema Response Lỗi Trùng Lặp Idempotency (`409 Conflict`):
```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Yêu cầu tạo đơn hàng với Idempotency-Key này đang được xử lý, vui lòng không bấm lặp lại"
  },
  "timestamp": "2026-11-04T00:20:06.200Z",
  "traceId": "c1d2e3f4-a5b6-7890-1234-567890abcdef"
}
```

---

### 2.3. Endpoint 3: Tra Cứu Live Tracking Công Khai (`GET /api/v1/tracking/:trackingNumber`)

- **Mục đích**: Người nhận hàng mở link tra cứu hành trình không cần đăng nhập. Hệ thống ẩn danh tính nhạy cảm, chỉ cung cấp tiến độ giao hàng và vị trí GPS của shipper.
- **Xác thực**: Công khai qua `trackingToken` (32 ký tự).

#### Schema Response Thành Công (`200 OK`):
```json
{
  "success": true,
  "data": {
    "orderCode": "FSH-20261104-0012",
    "trackingToken": "fsh_live_89a7df6b02a4b3c1d9e20011a8b9c0d1",
    "status": "DELIVERING",
    "statusLabel": "Đang giao hàng",
    "carrier": {
      "code": "XANH_SM",
      "name": "Xanh SM Delivery",
      "logoUrl": "https://cdn.fastshiphub.vn/logos/xanh-sm.svg",
      "hotline": "19002088"
    },
    "driver": {
      "name": "Trần Văn Bình",
      "phone": "0977889900",
      "licensePlate": "29-E1 668.99",
      "vehicleType": "ELECTRIC_BIKE",
      "vehicleModel": "VinFast Feliz S",
      "avatarUrl": "https://cdn.fastshiphub.vn/drivers/xanhsm-binh.jpg",
      "currentLocation": {
        "latitude": 21.033500,
        "longitude": 105.845000,
        "updatedAt": "2026-11-04T00:22:15.000Z"
      }
    },
    "route": {
      "pickupAddress": "Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội",
      "dropoffAddress": "Số 280 Đội Cấn, Ba Đình, Hà Nội",
      "pickupLatitude": 21.028511,
      "pickupLongitude": 105.854444,
      "dropoffLatitude": 21.037288,
      "dropoffLongitude": 105.834466,
      "distanceMeters": 4200,
      "durationSeconds": 780
    },
    "timeline": [
      {
        "status": "BOOKED",
        "description": "Đơn hàng đã được tạo và chuyển tới hãng Xanh SM",
        "timestamp": "2026-11-04T00:20:05.000Z"
      },
      {
        "status": "PICKING",
        "description": "Tài xế Trần Văn Bình đang di chuyển tới điểm lấy hàng",
        "timestamp": "2026-11-04T00:20:45.000Z"
      },
      {
        "status": "DELIVERING",
        "description": "Tài xế đã lấy hàng thành công và đang di chuyển tới người nhận",
        "timestamp": "2026-11-04T00:22:00.000Z"
      }
    ],
    "etaMinutes": 8,
    "co2SavedGrams": 178,
    "createdAt": "2026-11-04T00:20:05.000Z",
    "pickedUpAt": "2026-11-04T00:22:00.000Z"
  },
  "metadata": {
    "processingTimeMs": 45
  },
  "timestamp": "2026-11-04T00:22:15.100Z",
  "traceId": "f9e8d7c6-b5a4-3210-9876-543210fedcba"
}
```

---

### 2.4. Endpoint 4: Tra Cứu Số Dư Ví & Lịch Sử (`GET /api/v1/wallet`)

- **Mục đích**: Chủ shop xem số dư thực tế, số dư tạm giữ và danh sách các giao dịch gần nhất.
- **Xác thực**: Bắt buộc đăng nhập (`MERCHANT` hoặc `ADMIN`).

#### Schema Response Thành Công (`200 OK`):
```json
{
  "success": true,
  "data": {
    "balance": 2000000,
    "holdBalance": 26440,
    "availableBalance": 1973560,
    "currency": "VND",
    "recentTransactions": [
      {
        "id": "e2a1b0c9-8d7e-6f5a-4b3c-2d1e0f9a8b7c",
        "transactionCode": "TX-HOLD-20261104-0012",
        "type": "HOLD_RESERVATION",
        "status": "SUCCESS",
        "amount": 26440,
        "balanceBefore": 2000000,
        "balanceAfter": 1973560,
        "paymentMethod": "WALLET",
        "referenceId": "FSH-20261104-0012",
        "note": "Tạm giữ cước đơn hàng FSH-20261104-0012 (Xanh SM)",
        "createdAt": "2026-11-04T00:20:05.000Z"
      },
      {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "transactionCode": "TX-TOPUP-20261103-9988",
        "type": "TOPUP",
        "status": "SUCCESS",
        "amount": 2000000,
        "balanceBefore": 0,
        "balanceAfter": 2000000,
        "paymentMethod": "VIETQR",
        "referenceId": "NAPAS247-99881122",
        "note": "Nạp tiền ví cước tự động qua VietQR Napas 247",
        "createdAt": "2026-11-03T18:00:00.000Z"
      }
    ]
  },
  "timestamp": "2026-11-04T00:23:00.000Z",
  "traceId": "1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6"
}
```

---

### 2.5. Endpoint 5: Yêu Cầu Nạp Tiền Ví VietQR (`POST /api/v1/wallet/topup`)

- **Mục đích**: Sinh yêu cầu nạp tiền, tạo nội dung chuyển khoản duy nhất và sinh chuỗi mã VietQR Napas 247 động để người dùng quét nạp tiền ngay lập tức.
- **Xác thực**: Bắt buộc đăng nhập (`MERCHANT` hoặc `ADMIN`).

#### Schema Request Payload:
```json
{
  "amount": 500000,
  "paymentMethod": "VIETQR"
}
```

#### Schema Response Thành Công (`200 OK`):
```json
{
  "success": true,
  "data": {
    "transactionCode": "TOPUP-20261104-58291",
    "amount": 500000,
    "currency": "VND",
    "bankInfo": {
      "bankCode": "970422",
      "bankName": "Ngân hàng TMCP Quân Đội (MBBank)",
      "accountNumber": "098811122299",
      "accountName": "CONG TY CONG NGHE FAST SHIP HUB",
      "transferContent": "FSH TOPUP 58291"
    },
    "vietQrString": "00020101021238540010A0000007270124000697042201120988111222990208QRIBFTTA530370454065000005802VN62190815FSH TOPUP 582916304C92A",
    "qrImageUrl": "https://img.vietqr.io/image/970422-098811122299-compact2.png?amount=500000&addInfo=FSH%20TOPUP%2058291&accountName=CONG%20TY%20CONG%20NGHE%20FAST%20SHIP%20HUB",
    "expiresAt": "2026-11-04T00:53:00.000Z"
  },
  "timestamp": "2026-11-04T00:23:30.000Z",
  "traceId": "9f8e7d6c-5b4a-3210-fedc-ba9876543210"
}
```

---

### 2.6. Endpoint 6: Tiếp Nhận Webhook Đối Tác Hãng (`POST /api/v1/webhooks/:carrier`)

- **Mục đích**: Cổng tiếp nhận sự kiện cập nhật trạng thái đơn và tọa độ GPS tài xế từ 6 hãng đối tác (`grab`, `shopeefood`, `xanhsm`, `ahamove`, `be`, `sandbox`).
- **Headers**:
  - `X-Grab-Signature` (Grab)
  - `X-Shopee-Signature` (ShopeeFood)
  - `X-XanhSM-Signature` (Xanh SM)
  - `X-Webhook-Signature` (Chung)

#### Schema Response Phản Hồi Cho Hãng:
```json
{
  "success": true,
  "data": {
    "carrierCode": "XANH_SM",
    "eventId": "EVT-GSM-20261104-998811",
    "processed": true,
    "normalizedStatus": "DELIVERING"
  },
  "timestamp": "2026-11-04T00:24:00.000Z",
  "traceId": "webhook-ack-123456"
}
```
