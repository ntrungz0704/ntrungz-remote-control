# TÀI LIỆU ĐẶC TẢ LUỒNG NGƯỜI DÙNG (USER FLOWS & INTERACTION SPECIFICATION)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-UX-003` | **Phiên bản**: `1.0.0` | **Trạng thái**: `APPROVED_FOR_FRONTEND`  
> **Tác giả**: `ui-ux-designer` (Chuyên gia Thiết kế UI/UX & Design System)  
> **Đối tượng áp dụng**: `frontend-engineer`, `backend-engineer`, `qa-engineer`

---

## 1. SƠ ĐỒ HÀNH TRÌNH TỔNG THỂ CỦA NGƯỜI DÙNG (END-TO-END USER JOURNEY)

Toàn bộ trải nghiệm của người dùng trên FAST-SHIP-HUB được thiết kế theo một dòng chảy khép kín, tối ưu từng điểm chạm nhằm rút ngắn thời gian từ lúc có nhu cầu gửi hàng đến khi đơn hàng được tài xế tiếp nhận xuống dưới **30 giây**:

```mermaid
flowchart TD
    Start([Người dùng truy cập FAST-SHIP-HUB]) --> F1[1. Nhập lộ trình & Kiện hàng]
    F1 -->|Debounce 300ms Autocomplete| F1_Map[Hiển thị ghim A & B, vẽ Polyline]
    F1_Map --> F2[2. Báo giá đa hãng thời gian thực]
    
    F2 -->|Promise.allSettled <= 1.5s| F2_Rank[Xếp hạng cước & Gắn Smart Badges]
    F2_Rank --> F3[3. Chọn hãng & Tùy chỉnh đơn]
    
    F3 --> F4{4. Phương thức thanh toán?}
    F4 -->|Merchant: Ví trả trước| F4_Wallet{Số dư ví >= Cước?}
    F4_Wallet -->|Đủ tiền| F5_Hold[Tạm giữ tiền ví HOLD]
    F4_Wallet -->|Thiếu tiền| F4_Topup[Hiện modal Nạp ví VietQR]
    F4_Topup -->|Quét QR nạp thành công| F5_Hold
    
    F4 -->|Khách vãng lai: VietQR 24/7| F4_QR[Hiện mã VietQR động theo đơn]
    F4_QR -->|Ngân hàng xác nhận webhook| F5_Hold
    
    F5_Hold --> F6[5. Điều phối đơn sang Hãng]
    F6 -->|Hãng nhận đơn thành công| F7[6. Chuyển sang Live Tracking SSE]
    F6 -->|Hãng từ chối / Hết tài xế| F6_Fallback[Gợi ý đổi sang Hãng rẻ nhì]
    F6_Fallback --> F3
    
    F7 --> F8[7. Theo dõi Shipper GPS thời gian thực]
    F8 --> End([Đơn hàng Giao Thành Công])
```

---

## 2. LUỒNG CHI TIẾT 1: AUTOCOMPLETE ĐỊA CHỈ & DỰNG TUYẾN ĐƯỜNG BẢN ĐỒ

### 2.1. Sơ đồ Luồng Tương Tác Ô Nhập Địa Chỉ (Autocomplete Interaction Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant Input as Ô Input Địa Chỉ
    participant Debounce as Bộ Đệm Trễ (300ms)
    participant MapService as Dịch Vụ Geocoding
    participant MapUI as Bản Đồ Mapbox / Leaflet

    User->>Input: Gõ ký tự "24 Tạ Quang"
    Input->>Debounce: Reset & Khởi động Timer 300ms
    Note over Debounce: Chờ người dùng ngừng gõ...
    Debounce->>MapService: GET /api/v1/geo/autocomplete?q=24+Ta+Quang
    MapService-->>Input: Trả về danh sách 5 địa điểm phù hợp
    Input-->>User: Hiển thị Dropdown gợi ý địa chỉ (Bold tên đường)

    User->>Input: Bấm chọn "24 Tạ Quang Bửu, P. Bách Khoa, Q. Hai Bà Trưng"
    Input->>MapUI: Truyền tọa độ {lat: 21.0052, lng: 105.8456}
    MapUI->>MapUI: Cắm Pin Điểm A (Màu xanh), Fly-to tọa độ trung tâm

    Note over User, MapUI: Người dùng tiếp tục chọn Điểm B (Giao hàng)
    User->>Input: Chọn "182 Lê Duẩn, P. Nguyễn Du, Q. Đống Đa"
    Input->>MapUI: Truyền tọa độ Điểm B {lat: 21.0189, lng: 105.8412}
    MapUI->>MapService: GET /api/v1/geo/directions?origin=A&dest=B
    MapService-->>MapUI: Polyline lộ trình, Cự ly 4.8km, Thời gian 14 phút
    MapUI->>MapUI: Vẽ Polyline màu xanh đậm, tự động căn khung (Fit Bounds)
```

### 2.2. Các Trạng Thái Ngoại Lệ Cần Xử Lý (Edge Cases):
1. **Người dùng nhập địa chỉ không có trên bản đồ (No Results Found)**:
   - Dropdown hiển thị thông báo nhẹ: *"Không tìm thấy địa chỉ khớp. Bạn có thể kéo thả ghim trực tiếp trên bản đồ để chọn tọa độ chính xác."*
2. **Khoảng cách 2 điểm quá gần (< 50 mét)**:
   - Hiển thị badge màu vàng cảnh báo dưới ô Điểm đến: *"Điểm lấy và giao hàng đang trùng hoặc quá gần nhau."* Khóa nút lấy cước.
3. **Khoảng cách vượt quá bán kính xe máy (> 50 km)**:
   - Hiển thị cảnh báo: *"Lộ trình 62km vượt quá giới hạn giao xe máy tức thì (tối đa 50km). Vui lòng chọn dịch vụ liên tỉnh."*

---

## 3. LUỒNG CHI TIẾT 2: BÁO GIÁ ĐA HÃNG, GÁN SMART BADGES & ĐẾM NGƯỢC 5 PHÚT

### 3.1. Sơ đồ Luồng Báo Giá Đa Hãng

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as Bảng So Sánh Cước
    participant API as Pricing Gateway (/api/v1/quotes)
    participant CarrierEng as Multi-Carrier Engine
    participant Timer as Bộ Đếm Hiệu Lực (300s)

    User->>UI: Nhập đủ 2 điểm & Bấm "So sánh cước"
    UI->>UI: Bật trạng thái Skeleton Loading (5 thẻ cước shimmer)
    UI->>API: POST /api/v1/quotes {pickup, dropoff, packageWeight}
    
    CarrierEng->>CarrierEng: Gọi song song Grab, Shopee, Xanh SM, Be, Ahamove
    Note over CarrierEng: Thời gian phản hồi thực tế: 950ms - 1300ms (< 1.5s)
    
    CarrierEng->>CarrierEng: Thuật toán Ranking & Smart Badging:
    Note over CarrierEng: - Best Price: Hãng cước thấp nhất<br/>- Fastest: Hãng ETA ngắn nhất<br/>- Eco EV: Xanh SM xe điện
    
    CarrierEng-->>API: Danh sách Quotes + Smart Badges + quote_id
    API-->>UI: 200 OK (Danh sách gói cước)
    UI->>UI: Thay thế Skeleton bằng thẻ cước thật (Animation Fade-in)
    UI->>Timer: Khởi tạo đếm ngược từ 05:00
    
    loop Cập nhật mỗi giây
        Timer-->>UI: Hiển thị 04:59 ... 01:00 ... 00:00
    end

    alt Người dùng đặt đơn trước 05:00
        User->>UI: Chọn thẻ & Tiếp tục đặt đơn hợp lệ
    else Quá thời gian 05:00 (Quote Expired)
        Timer-->>UI: Kích hoạt trạng thái Hết Hạn
        UI->>UI: Phủ mờ danh sách thẻ, hiện banner: "Giá cước đã hết hạn"
        UI->>User: Cung cấp nút [Làm Mới Giá Cước Ngay]
    end
```

---

## 4. LUỒNG CHI TIẾT 3: ĐẶT ĐƠN 1-CLICK, THANH TOÁN VÍ & CỔNG VIETQR ĐỘNG

### 4.1. Sơ đồ Phân Nhánh Thanh Toán & Điều Phối

```mermaid
flowchart TD
    StartBooking([Bấm Nút Xác Nhận Đặt Đơn]) --> Idemp[Tạo Idempotency-Key UUID]
    Idemp --> LockBtn[Disable Nút, Hiển Thị Spinner Loading]
    LockBtn --> CheckMethod{Phương Thức Thanh Toán?}

    %% Nhánh Ví Trả Trước
    CheckMethod -->|Ví Merchant| CheckBal{Số Dư Khả Dụng >= Tổng Cước?}
    CheckBal -->|Đủ Tiền| WalletHold[Thực Hiện Giữ Tiền: HOLD_SHIPPING_FEE]
    CheckBal -->|Không Đủ| ModalTopup[Bật Modal Nạp Tiền VietQR Thiếu]
    ModalTopup --> PayQR[Người Dùng Quét QR Nạp Bổ Sung]
    PayQR --> WebhookIn[Ngân Hàng Gửi Webhook Cộng Tiền Ví]
    WebhookIn --> WalletHold

    %% Nhánh VietQR Khách Vãng Lai
    CheckMethod -->|VietQR 24/7| GenQR[Sinh Mã VietQR Động Theo Đơn Hàng]
    GenQR --> ShowQRScreen[Hiển Thị Mã QR Kèm Laser Scanner]
    ShowQRScreen --> Countdown3m[Bật Đếm Ngược Giữ Chỗ: 3 Phút]
    Countdown3m --> BankTransfer[Khách Quét App Ngân Hàng Chuyển Khoản]
    BankTransfer --> BankWebhook{Webhook Báo Có Tiền Trong 3 Phút?}
    BankWebhook -->|Thành Công| WalletHold
    BankWebhook -->|Hết Giờ| CancelQR[Hủy Giao Dịch, Thông Báo Hết Thời Gian]

    %% Điều Phối Hãng
    WalletHold --> DispatchCarrier[Gọi API Hãng Tạo Đơn Booking]
    DispatchCarrier --> CarrierRes{Hãng Phản Hồi?}
    CarrierRes -->|Thành Công| SuccessCapture[Quyết Toán Tiền Ví: CAPTURE]
    SuccessCapture --> NavigateTrack[Chuyển Hướng Sang Màn Hình Live Tracking]
    
    CarrierRes -->|Hết Xe / Từ Chối| FailRelease[Giải Phóng Tiền Giữ: RELEASE_HOLD]
    FailRelease --> SuggestNext[Mở Dialog Gợi Ý Chuyển Sang Hãng Rẻ Thứ 2]
```

---

## 5. LUỒNG CHI TIẾT 4: MỞ TRANG LIVE TRACKING & NHẬN SỰ KIỆN SSE

### 5.1. Sơ đồ Đồng Bộ Tọa Độ GPS & Trạng Thái 10 Bước

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Gửi / Người Nhận
    participant Browser as Trình Duyệt Web (/track/:token)
    participant SSE as SSE Stream Controller
    participant Webhook as Webhook Đối Tác Vận Chuyển
    participant Map as Bản Đồ Live Map

    User->>Browser: Mở liên kết /track/fsh_live_89a7df6b02a4
    Browser->>Browser: Khởi tạo kết nối new EventSource('/api/v1/tracking/.../stream')
    Browser->>SSE: Gửi HTTP GET (Accept: text/event-stream)
    SSE-->>Browser: 200 OK (Duy trì kết nối mở SSE)

    Browser->>Map: Render bản đồ tĩnh điểm A, điểm B và vị trí hiện tại của shipper
    
    Note over Webhook, SSE: Tài xế bắt đầu di chuyển trên đường
    Webhook->>SSE: Sự kiện GPS: {lat: 21.0089, lng: 105.8440, bearing: 45}
    SSE-->>Browser: Event: 'LOCATION_UPDATE'
    Browser->>Map: Animate Marker xe máy lướt mượt mà tới tọa độ mới (1000ms transition)
    Browser->>Browser: Cập nhật thời gian ETA còn lại: "11 phút nữa"

    Note over Webhook, SSE: Tài xế đã tới giao hàng thành công
    Webhook->>SSE: Sự kiện Trạng Thái: {status: 'DELIVERED', completedAt: '14:35'}
    SSE-->>Browser: Event: 'STATUS_UPDATE'
    Browser->>Browser: Chuyển Stepper sang màu xanh lá [ĐÃ GIAO THÀNH CÔNG]
    Browser->>Browser: Hiển thị hộp thoại Đánh giá dịch vụ 5 sao
```

---

## 6. LUỒNG XỬ LÝ SỰ CỐ & NGOẠI LỆ (EXCEPTION HANDLING FLOWS)

### 6.1. Khi Một Hãng Bị Sự Cố Hoặc Timeout (> 1.8 Giây)
- **Hành vi hệ thống**: Bộ ngắt mạch Circuit Breaker cô lập lỗi của hãng đó. Giao diện vẫn hiển thị các hãng còn lại.
- **Trải nghiệm thị giác**: Thẻ của hãng gặp lỗi được chuyển xuống đáy danh sách báo giá, chuyển sang tông màu xám nhạt (`bg-slate-50 opacity-70`) kèm nhãn `[TẠM GIÁN ĐOẠN]`.
- **Thông điệp hiển thị**: *"Hệ thống kết nối Grab đang quá tải. Bạn hãy chọn Xanh SM hoặc ShopeeFood để được phục vụ ngay."*

### 6.2. Khi Hãng Đối Tác Trả Về Lỗi "Không Tìm Thấy Tài Xế" (No Driver Found)
- Hệ thống lập tức hoàn trả tiền ví `RELEASE_HOLD` (trong 100ms).
- Màn hình hiển thị Modal gợi ý thông minh:
  ```
  +-------------------------------------------------------------+
  |  [!] RẤT TIẾC, XANH SM HIỆN ĐANG HẾT TÀI XẾ QUANH KHU VỰC   |
  |                                                             |
  |  Hệ thống đã tự động hoàn lại 26.000đ vào ví của bạn.      |
  |  Gợi ý thay thế tốt nhất:                                  |
  |  • ShopeeFood Instant: 28.000đ (Chỉ chênh lệch +2.000đ)    |
  |  • Có 3 tài xế sẵn sàng cách bạn 400m                       |
  |                                                             |
  |  [ Nút: Đổi Sang ShopeeFood Ngay ]   [ Nút: Về Bảng Giá ]   |
  +-------------------------------------------------------------+
  ```

---

> **Kết luận**: Các luồng người dùng trên đã bao phủ trọn vẹn cả kịch bản hoàn hảo (Happy Path) lẫn các kịch bản ngoại lệ (Exception Paths), tạo tiền đề vững chắc cho việc xây dựng logic State Machine trên giao diện Frontend.
