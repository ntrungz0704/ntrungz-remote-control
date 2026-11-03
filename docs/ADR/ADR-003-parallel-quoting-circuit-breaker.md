# KIẾN TRÚC QUYẾT ĐỊNH (ADR-003): PARALLEL QUOTING VÀ CIRCUIT BREAKER

- **Mã tài liệu**: `ADR-003`
- **Tiêu đề**: Triển khai Cơ chế Báo Giá Song Song với Promise.allSettled, Ngưỡng Timeout Cứng 1800ms và Bộ Ngắt Mạch Circuit Breaker
- **Trạng thái**: **ACCEPTED (ĐÃ PHÊ DUYỆT)**
- **Ngày quyết định**: 2026-11-03
- **Tác giả**: `system-architect` (Chuyên gia Kiến trúc Hệ thống)
- **Các bên liên quan**: `backend-engineer`, `frontend-engineer`, `performance-seo-engineer`, `qa-engineer`

---

## 1. BỐI CẢNH VÀ VẤN ĐỀ (CONTEXT & PROBLEM STATEMENT)

Trải nghiệm "so sánh cước trong chớp mắt" là giá trị sống còn quyết định thành bại của `FAST-SHIP-HUB`. Theo tài liệu PRD (`DOC-PRD-001`), hệ thống phải đạt chỉ số **Quotation Latency P95 ≤ 1.5 giây**.

Tuy nhiên, trong môi trường sản xuất thực tế:
1. **Các hãng vận chuyển là hệ thống bên ngoài không thể kiểm soát**: Thời gian phản hồi của Grab, ShopeeFood, Xanh SM, Ahamove, Be dao động từ 250ms trong điều kiện lý tưởng lên tới 5000ms - 10000ms khi hệ thống của họ bị quá tải, giờ cao điểm hoặc sự cố mạng viễn thông.
2. **Nguy cơ sụp đổ dây chuyền (Cascading Failure)**: Nếu sử dụng cơ chế gọi tuần tự (Sequential calling: Grab -> Shopee -> Xanh SM -> Ahamove -> Be), tổng thời gian người dùng phải chờ đợi sẽ là:
   $$\text{Total Wait Time} = \sum_{i=1}^{5} \text{Latency}_i \approx 5 \times 600\text{ms} = 3000\text{ms} \text{ (3.0 giây - Vi phạm nghiêm trọng SLA)}$$
3. **Hiểm họa của `Promise.all()`**: `Promise.all()` có cơ chế "Fail-fast". Chỉ cần 1 trong 5 hãng bị lỗi mạng hoặc trả mã lỗi HTTP 500, toàn bộ lời hứa sẽ bị reject ngay lập tức, khiến người dùng không nhận được giá của bất kỳ hãng nào, dù 4 hãng còn lại đã tính cước thành công.

---

## 2. CÁC PHƯƠNG ÁN ĐÃ XEM XÉT (CONSIDERED OPTIONS)

### Phương án 1: Gọi tuần tự từng hãng (Sequential Execution)
- *Đánh giá*: Loại bỏ ngay từ đầu vì độ trễ cộng dồn vi phạm tiêu chuẩn P95 ≤ 1.5s.

### Phương án 2: Gọi đồng thời bằng `Promise.all()` không giới hạn Timeout
- *Đánh giá*: Dễ gây crash giao diện khi 1 hãng bị lỗi; nếu 1 hãng bị treo kết nối (hung connection), toàn bộ request của người dùng sẽ bị treo theo tới 30 giây (mặc định HTTP timeout).

### Phương án 3 (Được chọn): Gọi đồng thời với `Promise.allSettled()` + AbortController(1800ms) + Circuit Breaker
- Bắn đồng thời các request sang tất cả Adapter thông qua `Promise.allSettled()`.
- Gắn cho mỗi request một tín hiệu hủy `AbortSignal` với ngưỡng Timeout cứng **1800ms**.
- Quản lý trạng thái sẵn sàng của từng hãng qua mô hình ngắt mạch **Circuit Breaker** (Closed, Open, Half-Open).

---

## 3. QUYẾT ĐỊNH KỸ THUẬT (DECISION OUTCOME)

Chúng tôi quyết định áp dụng **Phương án 3**:

1. **Cơ chế Thu thập Báo giá Không Chặn (Non-Blocking Promise.allSettled)**:
   - Hệ thống chờ đợi tất cả các Promise kết thúc (dù thành công hay thất bại).
   - Lọc các kết quả có `status === 'fulfilled'` để đưa vào danh sách so sánh và gán nhãn huy hiệu (🏆 Rẻ nhất, ⚡ Nhanh nhất, 🌿 Xanh nhất).
   - Các kết quả `status === 'rejected'` hoặc bị Abort được gom vào mảng `unresponsiveCarriers` và hiển thị dưới dạng cảnh báo thân thiện trên giao diện ("Tạm thời không lấy được cước của [Tên hãng]").
2. **Khống Chế Timeout Nghiêm Ngặt (Strict 1800ms Boundary)**:
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 1800);
   // Truyền controller.signal vào fetch/axios request của Adapter
   ```
   Ngưỡng 1800ms đảm bảo tổng thời gian xử lý API tổng hợp (bao gồm thời gian mạng nội bộ) luôn khống chế dưới **2000ms**, ngăn chặn rò rỉ bộ nhớ (Memory leak) do các kết nối treo.
3. **Bộ Ngắt Mạch Thông Minh (Circuit Breaker Specification)**:
   - **CLOSED**: Trạng thái bình thường, cho phép lưu thông 100% request.
   - **OPEN (Ngắt mạch)**: Kích hoạt khi một hãng gặp **5 lỗi liên tiếp** hoặc **tỷ lệ lỗi > 50% trong 5 phút**. Khi ở trạng thái này, mọi yêu cầu báo giá tới hãng đó bị từ chối ngay lập tức tại tầng ứng dụng với độ trễ **0ms** (mã lỗi `CARRIER_CIRCUIT_OPEN`), không tốn tài nguyên mạng.
   - **HALF-OPEN**: Sau thời gian làm nguội (**Cool-down 60 giây**), hệ thống cho phép 1 luồng gọi thăm dò. Nếu phản hồi thành công < 1000ms, tự động chuyển về CLOSED. Nếu thất bại, quay lại trạng thái OPEN thêm 60 giây nữa.

---

## 4. HỆ QUẢ VÀ ĐÁNH GIÁ (CONSEQUENCES)

### 4.1. Tác động Tích cực (Positive Impacts)
- **Độ tin cậy và Uptime tuyệt đối (High Availability)**: Người dùng luôn nhận được kết quả so sánh của ít nhất các hãng đang hoạt động tốt. Hệ thống không bao giờ bị "sập toàn diện" chỉ vì một bên thứ ba gặp sự cố.
- **Tuân thủ Cam kết Hiệu năng (SLA Guarantee)**: Thời gian phản hồi báo giá trung bình đạt từ **600ms - 1100ms**; trường hợp xấu nhất (khi có hãng timeout) bị chặn cứng ở mốc **1800ms**.
- **Tự động Phục hồi Hệ thống (Self-Healing)**: Nhờ cơ chế Half-Open của Circuit Breaker, hệ thống tự động nhận biết khi đối tác đã khắc phục xong sự cố và mở lại luồng tính cước mà không cần quản trị viên phải can thiệp thủ công.

### 4.2. Thách thức và Biện pháp Giảm thiểu (Mitigation Strategies)
- *Thách thức*: Khi một hãng rẻ nhất tạm thời bị ngắt mạch (Circuit OPEN), người dùng có thể không nhìn thấy mức giá tốt nhất của hãng đó.
  - *Biện pháp*: Giao diện hiển thị rõ nhãn thông báo: *"Đối tác X đang bảo trì kết nối, giá rẻ nhất hiện tại thuộc về đối tác Y"*, giữ vững sự minh bạch đối với khách hàng.
