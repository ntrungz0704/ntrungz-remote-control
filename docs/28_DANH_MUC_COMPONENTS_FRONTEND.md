# DANH MỤC THÀNH PHẦN GIAO DIỆN (FRONTEND COMPONENT CATALOG)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-FE-002` | **Phiên bản**: `1.0.0` | **Trạng thái**: `APPROVED_AND_IMPLEMENTED`  
> **Tác giả**: `frontend-engineer` (Kỹ sư Frontend Cấp Cao)  
> **Công nghệ áp dụng**: Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React

---

## 1. TỔNG QUAN HỆ THỐNG THÀNH PHẦN (COMPONENT TAXONOMY)

Hệ thống thành phần giao diện của FAST-SHIP-HUB được phân cấp thành 3 nhóm rõ rệt:
1. **Common Components (`src/components/common/`)**: Các khối giao diện dùng chung trong toàn bộ ứng dụng (Navbar, Footer, SmartBadge, Toast).
2. **Feature Components (`src/components/features/`)**: Các khối tính năng nghiệp vụ cốt lõi (RouteInputForm, QuotationCard, LiveTrackingMap, DriverCard, WalletWidget).
3. **Page Views (`src/app/`)**: Các màn hình hoàn chỉnh lắp ghép từ các khối tính năng theo triết lý Atomic & Modular Design.

---

## 2. CHI TIẾT CÁC THÀNH PHẦN DÙNG CHUNG (COMMON COMPONENTS)

### 2.1. `Navbar.tsx`
- **Đường dẫn**: `src/components/common/Navbar.tsx`
- **Mục đích**: Thanh điều hướng đầu trang hiển thị thương hiệu FAST-SHIP-HUB, menu điều hướng nhanh, và trạng thái số dư ví trả trước tức thời của người dùng.
- **Tính năng nổi bật**:
  - Logo FAST-SHIP-HUB với biểu tượng tia chớp tốc độ.
  - Link tra cứu cước (`/quote`), theo dõi đơn (`/track`), quản lý đơn (`/dashboard/orders`), và ví tiền (`/dashboard/wallet`).
  - Badge hiển thị số dư khả dụng cập nhật tự động (VD: `1.250.000 đ`).
  - Nút Nạp tiền nhanh mở trực tiếp Modal quét mã VietQR.
  - Responsive Mobile Navigation Drawer với hamburger button.

### 2.2. `Footer.tsx`
- **Đường dẫn**: `src/components/common/Footer.tsx`
- **Mục đích**: Chân trang chuyên nghiệp, tăng độ tin cậy và hiển thị đầy đủ logo nhận diện của 5 đối tác vận chuyển chính thức.
- **Tính năng nổi bật**:
  - Dải logo 5 hãng: GrabExpress, ShopeeFood, Xanh SM, Ahamove, beDelivery kèm nhãn định vị.
  - Thông tin công ty, giấy phép sàn TMĐT vận chuyển, cam kết bảo mật thanh toán chuẩn PCI-DSS & VietQR Napas.
  - Liên kết điều khoản sử dụng, chính sách bồi thường khi thất lạc, đường dây nóng hỗ trợ 24/7.

### 2.3. `SmartBadge.tsx`
- **Đường dẫn**: `src/components/common/SmartBadge.tsx`
- **Mục đích**: Hiển thị 4 huy hiệu thông minh định hướng quyết định của người gửi hàng:
  - 🏆 **CHEAPEST (Rẻ Nhất)**: Nền xanh lá nhạt `bg-emerald-50`, chữ `text-emerald-700`, viền `border-emerald-200`.
  - ⚡ **FASTEST (Nhanh Nhất)**: Nền vàng hổ phách `bg-amber-50`, chữ `text-amber-700`, viền `border-amber-200`.
  - 🌿 **GREENEST (Xanh Nhất)**: Nền xanh ngọc `bg-teal-50`, chữ `text-teal-700`, viền `border-teal-200` (hiển thị thêm gam CO2 tiết kiệm).
  - 🌟 **BEST_VALUE (Đề Xuất Tối Ưu)**: Nền tím indigo `bg-indigo-50`, chữ `text-indigo-700`, viền `border-indigo-200`.
- **Props**:
  ```typescript
  export interface SmartBadgeProps {
    type: 'CHEAPEST' | 'FASTEST' | 'GREENEST' | 'BEST_VALUE';
    extraText?: string;
    size?: 'sm' | 'md';
  }
  ```

### 2.4. `Toast.tsx`
- **Đường dẫn**: `src/components/common/Toast.tsx`
- **Mục đích**: Thông báo pop-up thông minh cho các thao tác thành công (đặt đơn thành công, sao chép mã tracking, nạp tiền ví) hoặc báo lỗi kết nối. Tự động đóng sau 4 giây.

---

## 3. CHI TIẾT CÁC THÀNH PHẦN NGHIỆP VỤ (FEATURE COMPONENTS)

### 3.1. `RouteInputForm.tsx`
- **Đường dẫn**: `src/components/features/RouteInputForm.tsx`
- **Mục đích**: Form thu thập thông tin lộ trình lấy hàng, giao hàng, thông số kiện hàng và tiền thu hộ COD.
- **Tính năng nổi bật**:
  - **Quick Address Select**: 4 nút chọn nhanh địa chỉ mẫu chuẩn tại Hà Nội (Bách Khoa, Hoàn Kiếm, Đội Cấn, Cầu Giấy) và TP.HCM (Quận 1, Landmark 81, Tân Bình, Bình Thạnh) giúp kiểm thử và thao tác tức thì chỉ với 1 cú click.
  - Phân loại gói hàng (Tài liệu, Đồ ăn, Thời trang, Dễ vỡ, Điện tử).
  - Khối lượng kiện hàng (gram), kích thước (Dài x Rộng x Cao cm).
  - Tiền thu hộ COD (VNĐ) và Giá trị khai giá bảo hiểm.
  - Tùy chọn dịch vụ: Giao tận tay (`deliverToDoor`), Kiện hàng dễ vỡ (`isFragile`).
  - Ghi chú giao hàng cho shipper.

### 3.2. `QuotationCard.tsx`
- **Đường dẫn**: `src/components/features/QuotationCard.tsx`
- **Mục đích**: Thẻ cước hiển thị từng lựa chọn vận chuyển từ 6 đơn vị đối tác.
- **Tính năng nổi bật**:
  - Logo chính hãng và màu sắc viền/header theo đúng nhận diện thương hiệu:
    - Grab: Xanh lá `#00B14F`
    - ShopeeFood: Cam đỏ `#EE4D2D`
    - Xanh SM: Xanh ngọc xe điện `#008B8B`
    - Ahamove: Cam đậm `#FF5722`
    - Be: Vàng tươi `#F59E0B`
    - Sandbox Mock: Tím Indigo `#6366F1`
  - Cước phí cuối cùng người gửi phải trả (VNĐ) in đậm, kèm số tiền tiết kiệm (`savingsVnd`) nếu là gói rẻ nhất.
  - Thời gian dự kiến: ETA lấy hàng và ETA giao hàng (phút).
  - Nhãn xe điện VinFast Feliz / Klara và số gam khí thải CO2 giảm thiểu đối với Xanh SM.
  - Huy hiệu thông minh gán tự động (Smart Badges).
  - Trạng thái Timeout / Gián đoạn (hiển thị mờ ở cuối nếu hãng gặp sự cố, không làm nghẽn các hãng khác).
  - Nút "Chọn Hãng Này" (`onSelect`) với hiệu ứng highlight viền xanh nổi bật khi active.

### 3.3. `LiveTrackingMap.tsx`
- **Đường dẫn**: `src/components/features/LiveTrackingMap.tsx`
- **Mục đích**: Bản đồ lộ trình tương tác trực quan hiển thị hành trình giao hàng và vị trí GPS của tài xế theo thời gian thực.
- **Công nghệ triển khai**:
  - Vector SVG Render Engine tối ưu hóa cực cao: Không phụ thuộc vào API key bên thứ ba (Google Maps/Mapbox), không gây rủi ro hết quota, tương thích 100% môi trường Web/Mobile.
  - Vẽ điểm lấy hàng (Pickup Marker - Xanh lá), điểm giao hàng (Dropoff Marker - Đỏ cam), và Polyline lộ trình di chuyển.
  - Marker Shipper (Biểu tượng xe máy điện / xe xăng) di chuyển mượt mà dựa theo tọa độ GPS nhận từ Server-Sent Events (SSE).
  - Vòng sóng radar phát sáng (Pulse Ripple Animation) tại vị trí tài xế.
  - Đồng hồ đếm ngược ETA còn lại và thanh tiến trình phần trăm quãng đường đã hoàn thành.

### 3.4. `DriverCard.tsx`
- **Đường dẫn**: `src/components/features/DriverCard.tsx`
- **Mục đích**: Hiển thị hồ sơ tài xế phụ trách đơn hàng và phương tiện di chuyển.
- **Thông tin hiển thị**:
  - Ảnh đại diện tài xế, Họ tên, Đánh giá sao (VD: ⭐ 4.9/5).
  - Nút gọi điện trực tiếp (`tel:...`) và nút gửi tin nhắn SMS nhanh.
  - Biển số xe (VD: `29-E1 668.99`) hiển thị theo kiểu dáng biển số xe máy tiêu chuẩn.
  - Loại phương tiện & Dòng xe: Phân biệt rõ xe máy điện VinFast (Feliz S, Klara S, VF e34) đối với Xanh SM, mang lại trải nghiệm thân thiện với môi trường.

### 3.5. `WalletWidget.tsx`
- **Đường dẫn**: `src/components/features/WalletWidget.tsx`
- **Mục đích**: Quản lý số dư ví trả trước của Merchant và kích hoạt nạp tiền tức thì qua mã VietQR Napas 24/7.
- **Tính năng nổi bật**:
  - Hiển thị Số dư tổng cộng, Số dư đang tạm giữ (Hold) cho các đơn đang giao, và Số dư khả dụng.
  - Modal Nạp tiền nhanh: Cho phép chọn các mức nạp phổ biến (100.000đ, 200.000đ, 500.000đ, 1.000.000đ, 2.000.000đ) hoặc nhập số tiền tùy ý (tối thiểu 50.000đ).
  - Tạo động mã VietQR chuẩn Napas 24/7 có ảnh QR Code quét bằng mọi App ngân hàng (Vietcombank, MBBank, Techcombank, VPBank, Momo, ZaloPay).
  - Hướng dẫn chuyển khoản, số tài khoản nhận, và nội dung chuyển khoản tự động kèm nút sao chép tiện lợi.

---

## 4. CHI TIẾT CÁC TRANG ỨNG DỤNG (PAGE SCREENS)

1. **Trang Chủ (`src/app/page.tsx`)**:
   - Hero Section truyền tải giá trị cốt lõi: *"So sánh giá cước 5 hãng giao hàng trong 1.5 giây"*.
   - Widget tra cước nhanh (Quick Quote Widget) đưa người dùng ngay vào luồng so sánh.
   - Thống kê thời gian thực: 99.8% giao đúng giờ, tiết kiệm trung bình 28% cước phí.
   - Thanh đối tác chính hãng: Grab, Xanh SM, ShopeeFood, Be, Ahamove.
2. **Màn Hình So Sánh Cước (`src/app/quote/page.tsx`)**:
   - Kiến trúc Split-View: Form bên trái, Bản đồ lộ trình bên phải.
   - Bộ lọc và sắp xếp thẻ cước (Giá rẻ nhất, Giao nhanh nhất, Điểm đề xuất).
   - Đồng hồ đếm ngược 5 phút bảo vệ cước phí (TTL countdown).
3. **Màn Hình Đặt Đơn 1-Click (`src/app/orders/new/page.tsx`)**:
   - Tóm tắt chi tiết gói cước và hãng đã chọn.
   - Tùy chọn thanh toán: Trừ số dư Ví trả trước (ngay lập tức) hoặc Quét VietQR.
   - Cơ chế bảo vệ Idempotency chống trừ tiền 2 lần khi click đúp.
   - Chuyển hướng ngay tới màn hình Live Tracking sau khi đơn tạo thành công.
4. **Màn Hình Live Tracking Công Khai (`src/app/track/[trackingNumber]/page.tsx`)**:
   - Truy cập công khai không cần đăng nhập cho người nhận hoặc người gửi.
   - Kết nối Server-Sent Events (SSE) cập nhật vị trí GPS tài xế liên tục mỗi 3 giây.
   - Stepper tiến trình 5 giai đoạn: Đã tiếp nhận -> Đang tìm tài xế -> Đang lấy hàng -> Đang giao hàng -> Giao thành công.
5. **Màn Hình Quản Lý Đơn Hàng (`src/app/dashboard/orders/page.tsx`)**:
   - Bảng quản lý đơn hàng đa hãng tập trung (DataTable).
   - Bộ lọc trạng thái (Tất cả, Đang lấy hàng, Đang giao, Đã giao, Đã hủy).
   - Nút tra cứu nhanh và Nút Hủy đơn có cảnh báo ma trận trạng thái.
6. **Màn Hình Quản Trị Ví Tiền (`src/app/dashboard/wallet/page.tsx`)**:
   - Bảng biến động số dư chi tiết: Nạp tiền, Thanh toán cước, Tạm giữ, Hoàn tiền hủy đơn.
   - Quản trị đối soát dòng tiền thu hộ COD.

---
*Tài liệu xác nhận danh mục thành phần hoàn chỉnh và phục vụ kiểm thử tích hợp.*
