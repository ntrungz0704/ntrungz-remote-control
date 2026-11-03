# TIÊU CHÍ NGHIỆM THU HỆ THỐNG (ACCEPTANCE CRITERIA - GHERKIN FORMAT)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-AC-001` | **Phiên bản**: `1.0.0` | **Trạng thái**: `APPROVED_FOR_ARCHITECTURE`  
> **Tác giả**: `business-analyst` (Chuyên gia Phân tích Nghiệp vụ)  
> **Đối tượng sử dụng**: `qa-engineer`, `backend-engineer`, `frontend-engineer`, `code-reviewer`

---

## 1. TIÊU CHÍ NGHIỆM THU LUỒNG SO SÁNH GIÁ CƯỚC THỜI GIAN THỰC (QUOTATION SUITE)

### Kịch bản 1.1: [Happy Path] Người dùng nhập lộ trình hợp lệ và nhận bảng giá đa hãng dưới 1.5 giây
```gherkin
Feature: So Sánh Giá Cước Thời Gian Thực Đa Hãng

  Scenario: Lấy báo giá thành công từ tất cả đối tác cho lộ trình xe máy thông thường
    Given Người dùng đang ở màn hình Tạo đơn của FAST-SHIP-HUB
    And Địa chỉ lấy hàng là "Tòa nhà Keangnam Landmark 72, Nam Từ Liêm, Hà Nội" (21.0167, 105.7841)
    And Địa chỉ giao hàng là "Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội" (21.0285, 105.8542)
    And Khoảng cách tính toán giữa 2 điểm là 8.5 km
    And Kiện hàng là "Tài liệu văn phòng" có trọng lượng 0.5 kg (hợp lệ cho xe máy)
    When Người dùng nhấn nút "Xem So Sánh Giá Cước" hoặc hệ thống tự động kích hoạt tính cước
    Then Hệ thống phải gửi song song yêu cầu báo giá tới Grab, ShopeeFood, Xanh SM, Ahamove, Be và Mock Adapter
    And Thời gian phản hồi toàn bộ danh sách kết quả phải <= 1500 ms (1.5 giây)
    And Danh sách trả về hiển thị đầy đủ thẻ của 5 hãng và 1 Mock Adapter
    And Mỗi thẻ cước hiển thị đầy đủ:
      | Trường thông tin | Giá trị hiển thị |
      | Logo hãng | Rõ nét, đúng nhận diện thương hiệu |
      | Tên gói dịch vụ | Ví dụ: "Xanh SM Delivery - Xe máy điện" |
      | Giá cước cuối cùng | Số tiền VNĐ chính xác (đã cộng VAT và phí dịch vụ 1.000đ) |
      | Thời gian dự kiến | Thời gian tài xế đến lấy (phút) và thời gian giao tới nơi (phút) |
    And Gói có giá cước thấp nhất phải được gán nhãn huy hiệu "Rẻ nhất" viền xanh lá
    And Gói có tổng thời gian giao ngắn nhất phải được gán nhãn huy hiệu "Nhanh nhất" viền cam
    And Gói Xanh SM phải được gán nhãn huy hiệu "Xanh nhất" (100% Xe điện thân thiện môi trường)
    And Hệ thống khởi động đồng hồ đếm ngược thời hạn hiệu lực báo giá 300 giây (5 phút)
```

---

### Kịch bản 1.2: [Edge Case] Một hãng đối tác bị quá thời gian chờ (Timeout > 1.8s) hoặc lỗi nội bộ
```gherkin
  Scenario: Xử lý cô lập lỗi khi hãng Grab bị sự cố mạng nhưng các hãng khác vẫn phản hồi tốt
    Given Người dùng nhập lộ trình 5.2 km hợp lệ
    And Hệ thống gửi request song song tới các hãng
    And Adapter của "Grab" không phản hồi sau 1800 ms (Timeout)
    And Các Adapter của ShopeeFood, Xanh SM, Ahamove, Be trả về kết quả hợp lệ trong vòng 800 ms
    When Hệ thống tổng hợp kết quả báo giá
    Then Toàn bộ bảng giá của ShopeeFood, Xanh SM, Ahamove, Be vẫn được hiển thị bình thường
    And Thẻ của Grab hiển thị trạng thái "Tạm thời không kết nối được cước của hãng này"
    And Nút đặt đơn của thẻ Grab bị vô hiệu hóa (disabled)
    And Nhãn "Rẻ nhất" và "Nhanh nhất" được tính toán chính xác trên các hãng phản hồi thành công
    And Hệ thống không bị treo hoặc crash toàn bộ màn hình
```

---

### Kịch bản 1.3: [Validation] Tuyến đường quá gần hoặc vượt quá bán kính phục vụ
```gherkin
  Scenario: Người dùng nhập điểm lấy và điểm giao trùng nhau
    Given Người dùng nhập địa chỉ lấy là "123 Cầu Giấy, Hà Nội"
    And Người dùng nhập địa chỉ giao là "123 Cầu Giấy, Hà Nội"
    And Khoảng cách giữa 2 điểm được xác định < 50 mét
    When Người dùng xác nhận địa chỉ
    Then Hệ thống phải hiển thị thông báo lỗi: "Địa chỉ lấy hàng và giao hàng không được trùng nhau"
    And Nút "Xem So Sánh Giá Cước" bị vô hiệu hóa
    And Không có request nào được gửi tới các API hãng

  Scenario: Người dùng nhập khoảng cách vượt quá cự ly giao tức thì nội thành
    Given Người dùng chọn điểm lấy tại "Hà Nội" và điểm giao tại "Hải Phòng"
    And Khoảng cách đường bộ được tính toán là 115 km (> 50 km)
    When Hệ thống kiểm tra điều kiện dịch vụ
    Then Hệ thống hiển thị thông báo: "Dịch vụ xe máy giao hỏa tốc chỉ hỗ trợ tối đa 50 km. Vui lòng chọn xe tải hoặc hình thức gửi liên tỉnh"
    And Ẩn các gói cước xe máy của Grab, ShopeeFood, Xanh SM Bike
```

---

### Kịch bản 1.4: [Edge Case] Kiện hàng vượt quá trọng lượng cho phép của xe máy
```gherkin
  Scenario: Khách hàng nhập kiện hàng nặng 35 kg
    Given Trọng lượng kiện hàng được nhập là 35 kg
    When Người dùng yêu cầu tính cước
    Then Hệ thống tự động lọc bỏ các dịch vụ xe máy (chỉ cho phép <= 30 kg)
    And Hệ thống hiển thị thông báo: "Kiện hàng trên 30kg vượt quá quy định xe máy. Đang hiển thị gói Xe Tải / Bán Tải (Ahamove / Xanh SM Car)"
    And Bảng so sánh chỉ hiển thị các dịch vụ ô tô/xe tải phù hợp
```

---

## 2. TIÊU CHÍ NGHIỆM THU LUỒNG ĐẶT ĐƠN VẬN CHUYỂN TÍCH HỢP (BOOKING SUITE)

### Kịch bản 2.1: [Happy Path] Chủ shop đặt đơn thành công bằng Ví trả trước (Merchant 1-Click Booking)
```gherkin
Feature: Đặt Đơn Giao Hàng Tích Hợp

  Scenario: Chủ shop có số dư ví đủ và đặt đơn thành công
    Given Tài khoản chủ shop "Shop Thời Trang Linh" đang đăng nhập
    And Số dư khả dụng trong ví là 500.000 VNĐ
    And Báo giá từ Xanh SM Delivery có giá 32.000 VNĐ đang còn hạn hiệu lực (còn 240s)
    When Chủ shop bấm nút "Đặt Giao Hàng" trên thẻ Xanh SM
    Then Hệ thống tạo mã Idempotency Key duy nhất cho phiên đặt đơn
    And Hệ thống kích hoạt Database Transaction tạm giữ (HOLD) 32.000 VNĐ từ ví
    And Số dư khả dụng của shop cập nhật ngay lập tức thành 468.000 VNĐ
    And Hệ thống gọi API sang Adapter Xanh SM để tạo đơn hàng
    And Adapter Xanh SM phản hồi thành công kèm "carrier_order_id = GSM-998822"
    And Hệ thống lưu đơn vào CSDL với mã "FSH-20261103-XXXX" ở trạng thái "BOOKED"
    And Thời gian xử lý từ lúc bấm Đặt đến khi nhận kết quả phải <= 3000 ms (3 giây)
    And Giao diện tự động điều hướng người dùng sang trang Live Tracking (/track/:token)
```

---

### Kịch bản 2.2: [Happy Path] Khách vãng lai đặt đơn và thanh toán nhanh qua mã VietQR Napas
```gherkin
  Scenario: Khách vãng lai thanh toán cước bằng quét mã QR ngân hàng 24/7
    Given Người dùng là Khách vãng lai (không đăng nhập)
    And Đã nhập số điện thoại "0987654321" và tên người gửi "Anh Tuấn"
    And Đã chọn gói GrabExpress Siêu Tốc với giá 28.000 VNĐ
    When Khách bấm "Thanh Toán & Đặt Đơn"
    Then Hệ thống hiển thị Modal mã VietQR chứa:
      | Thông tin VietQR | Giá trị |
      | Ngân hàng thụ hưởng | MB Bank / Vietcombank |
      | Số tài khoản | Số tài khoản công ty sàn |
      | Số tiền chuyển | Đúng 28.000 VNĐ |
      | Nội dung chuyển khoản | "FSH1002" (Mã định danh duy nhất) |
    And Hệ thống thiết lập cổng chờ Webhook/Polling biến động số dư ngân hàng
    When Khách hàng thực hiện chuyển khoản thành công từ app ngân hàng
    And Ngân hàng gửi Webhook xác nhận thanh toán hợp lệ
    Then Hệ thống tự động đóng Modal VietQR trong vòng 3 giây
    And Giao diện hiển thị thông báo "Thanh toán thành công! Đang điều phối tài xế..."
    And Kích hoạt lệnh dispatch đơn sang Grab và chuyển trạng thái sang "BOOKED"
```

---

### Kịch bản 2.3: [Exception Flow] Hãng đối tác từ chối nhận đơn do không có tài xế
```gherkin
  Scenario: Hãng Xanh SM hết tài xế xung quanh khu vực lấy hàng
    Given Đơn hàng đã được tạm giữ cước 35.000 VNĐ từ ví của Shop
    When Hệ thống gửi request tạo đơn sang Xanh SM
    And Xanh SM trả mã lỗi "ERR_NO_DRIVER_AVAILABLE" (Không có xe trong bán kính 5km)
    Then Hệ thống tự động kích hoạt hủy lệnh tạm giữ ví (RELEASE_HOLD)
    And Số dư khả dụng của Shop được hoàn trả đầy đủ 35.000 VNĐ ngay lập tức
    And Trạng thái đơn được chuyển thành "FAILED_DISPATCH"
    And Màn hình hiển thị thông báo thân thiện: "Hãng Xanh SM hiện đang hết xe gần bạn. Bạn có muốn chuyển sang BeDelivery (giá 36.000đ) không?" kèm nút "Đổi Sang Hãng Khác"
```

---

### Kịch bản 2.4: [Edge Case] Báo giá đã quá thời hạn 5 phút (Expired Quote)
```gherkin
  Scenario: Người dùng để giao diện báo giá quá 300 giây rồi mới bấm Đặt đơn
    Given Báo giá được tạo lúc 14:00:00 (TTL = 300 giây)
    And Thời điểm hiện tại là 14:05:30 (Đã quá hạn 330 giây)
    When Người dùng nhấn nút "Đặt Giao Hàng"
    Then Hệ thống ngăn chặn việc tạo đơn hàng
    And Hiển thị thông báo: "Biểu phí đã hết hạn 5 phút do giá cước thị trường có thể đã thay đổi. Hệ thống đang tự động cập nhật giá mới..."
    And Hệ thống tự động gửi yêu cầu tính lại giá cước (Re-quote)
    And Hiển thị bảng giá mới nhất để người dùng xác nhận lại
```

---

### Kịch bản 2.5: [Security & Anti-Fraud] Chống click đúp (Double-Click) và bảo vệ giao dịch ví
```gherkin
  Scenario: Người dùng nhấn nút Đặt đơn 3 lần liên tiếp trong 1 giây
    Given Người dùng ở màn hình xác nhận đơn
    When Người dùng nhấp chuột liên tục 3 lần vào nút "Đặt Giao Hàng"
    Then Nút bấm ngay lập tức chuyển sang trạng thái "Đang xử lý..." và bị khóa (disabled)
    And Hệ thống chỉ sinh duy nhất 1 Idempotency-Key cho phiên giao dịch đó
    And Chỉ có đúng 1 lệnh trừ ví và 1 đơn hàng được tạo trên CSDL
    And Tuyệt đối không xảy ra tình trạng trừ tiền trùng lặp (Double-Spending)
```

---

## 3. TIÊU CHÍ NGHIỆM THU LUỒNG LIVE TRACKING VÀ ĐỒNG BỘ TRẠNG THÁI (TRACKING SUITE)

### Kịch bản 3.1: [Happy Path] Theo dõi đơn hàng qua đường link công khai không cần đăng nhập
```gherkin
Feature: Theo Dõi Đơn Hàng Thời Gian Thực

  Scenario: Người nhận mở đường link theo dõi đơn hàng
    Given Đơn hàng "FSH-20261103-009" đã được tạo thành công
    And Có token bí mật "tk_98a7sd8f7a6sdf78a6sd"
    When Người nhận mở đường dẫn "https://fastshiphub.vn/track/tk_98a7sd8f7a6sdf78a6sd"
    Then Trang hiển thị mà không đòi hỏi đăng nhập hoặc nhập mật khẩu
    And Trang hiển thị thanh tiến trình 4 bước: "Đã đặt -> Tài xế đang đến -> Đang giao -> Hoàn tất"
    And Hiển thị đầy đủ thông tin:
      | Thông tin | Yêu cầu hiển thị |
      | Hãng vận chuyển | Logo Grab / Xanh SM / ShopeeFood |
      | Tài xế | Họ tên và số điện thoại bị che nhẹ (098****321) |
      | Nút gọi điện | Bấm vào sẽ mở ứng dụng gọi điện thoại trên thiết bị |
      | Biển số xe | Hiển thị rõ ràng (ví dụ: 29A-123.45) |
      | Bản đồ | Ghim vị trí tài xế, ghim điểm nhận và đường lộ trình |
```

---

### Kịch bản 3.2: [Webhook Sync] Cập nhật vị trí và trạng thái khi tài xế bấm lấy hàng
```gherkin
  Scenario: Shipper bấm xác nhận "Đã lấy hàng" trên ứng dụng của hãng
    Given Đơn hàng đang ở trạng thái "PICKING"
    When Đối tác vận chuyển gửi Webhook POST /api/v1/webhooks/:carrier với payload:
      """json
      {
        "carrier_order_id": "GSM-998822",
        "status": "IN_TRANSIT",
        "driver_lat": 21.0200,
        "driver_lng": 105.8000
      }
      """
    Then FAST-SHIP-HUB xác thực chữ ký Webhook (HMAC Signature) hợp lệ
    And Cập nhật trạng thái đơn trong CSDL thành "DELIVERING"
    And Phát sự kiện SSE (Server-Sent Events) tới giao diện Tracking đang mở của khách
    And Thanh tiến trình trên màn hình tự động chuyển sang bước "Đang Giao Hàng" mà không cần F5
    And Biểu tượng xe máy trên bản đồ dịch chuyển mượt mà tới tọa độ mới
```

---

## 4. TIÊU CHÍ NGHIỆM THU LUỒNG HỦY ĐƠN & HOÀN TIỀN (CANCELLATION SUITE)

### Kịch bản 4.1: [Happy Path] Hủy đơn khi chưa có tài xế nhận cuốc
```gherkin
Feature: Hủy Đơn & Hoàn Tiền Vận Chuyển

  Scenario: Người dùng bấm hủy đơn khi hệ thống đang tìm xe
    Given Đơn hàng đang ở trạng thái "BOOKED" (Chưa có tài xế nào nhận)
    When Người dùng nhấn nút "Hủy Đơn Hàng"
    And Xác nhận lý do hủy: "Tôi đổi ý không gửi nữa"
    Then Hệ thống hủy lệnh tìm xe sang hãng đối tác
    And Cập nhật trạng thái đơn thành "CANCELLED"
    And Toàn bộ 100% số tiền cước (kể cả phí sàn 1.000đ) được hoàn trả vào Ví khả dụng của người gửi
    And Lịch sử giao dịch ví ghi nhận dòng hoàn tiền "REFUND - Hoàn tiền cước đơn FSH-XXXX"
```

---

### Kịch bản 4.2: [Penalty Rule] Hủy đơn sau khi tài xế đã nhận cuốc quá 2 phút
```gherkin
  Scenario: Khách hủy đơn khi tài xế đang di chuyển tới sau 4 phút kể từ khi nhận cuốc
    Given Đơn hàng ở trạng thái "PICKING"
    And Thời gian kể từ lúc tài xế bấm nhận đơn là 4 phút 15 giây (> 2 phút)
    When Người dùng bấm "Hủy Đơn Hàng"
    Then Hệ thống hiển thị hộp thoại cảnh báo: "Tài xế đã di chuyển hơn 2 phút. Theo quy định của hãng, việc hủy đơn lúc này sẽ áp dụng phí phạt bồi thường xăng xe là 10.000 VNĐ. Bạn có chắc chắn muốn hủy?"
    When Người dùng bấm "Đồng Ý Hủy"
    Then Hệ thống gửi yêu cầu hủy sang hãng
    And Trừ phí phạt 10.000 VNĐ chuyển cho tài xế
    And Hoàn trả số tiền còn lại: (Tổng cước - 10.000 VNĐ) vào Ví của người dùng
    And Trạng thái đơn chuyển thành "CANCELLED"
```
