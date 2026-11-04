# ACCEPTANCE CRITERIA (TIÊU CHÍ NGHIỆM THU)
## DỰ ÁN: PET SOCIAL NETWORK (MẠNG XÃ HỘI THÚ CƯNG)

> **Mã tài liệu**: `AC-PETSOC-2026-V1`  
> **Dự án**: Pet Social Network  
> **Trạng thái**: `DISCOVERY COMPLETED — BASELINE DRAFT`  
> **Quy chuẩn**: Định dạng chuẩn Given / When / Then cho mọi kịch bản (Thành công, Thất bại, Biên và Bảo mật).

---

## 1. PHÂN HỆ ĐỊNH DANH & HỒ SƠ THÚ CƯNG (PET IDENTITY)

### Kịch bản 1: Tạo Hồ sơ Thú cưng thành công
- **Given**: Người dùng đã đăng nhập vào hệ thống với tài khoản hợp lệ.
- **When**: Người dùng vào trang cá nhân, bấm "Thêm bé cưng", điền Tên: "Bánh Bao", Loài: "Mèo", Giống: "Mèo Mướp", tải ảnh avatar và bấm "Lưu".
- **Then**: Hệ thống tạo bản ghi Pet Profile mới liên kết với tài khoản người dùng, hiển thị thẻ Bánh Bao trên trang cá nhân và trả về mã phản hồi `201 Created`.

### Kịch bản 2: Người dùng khác cố tình sửa Pet Profile (Bảo mật IDOR)
- **Given**: Người dùng A đã đăng nhập và sở hữu bé cưng có `petId = 101`. Người dùng B cũng đã đăng nhập nhưng không sở hữu `petId = 101`.
- **When**: Người dùng B gửi request `PUT /api/v1/pets/101` với thông tin thay đổi.
- **Then**: Hệ thống từ chối yêu cầu, ghi nhận sự kiện vi phạm phân quyền và trả về mã lỗi `403 Forbidden`.

### Kịch bản 3: Xóa Pet Profile bảo toàn bài viết lịch sử (Edge Case)
- **Given**: Bé cưng "Bánh Bao" (`petId = 101`) đã được gắn thẻ trong 5 bài viết trước đây của chủ nuôi.
- **When**: Chủ nuôi nhấn "Xóa hồ sơ bé cưng Bánh Bao" và xác nhận.
- **Then**: 
  * Hồ sơ bé cưng bị xóa khỏi danh sách thú cưng của người dùng.
  * Toàn bộ liên kết trong bảng `PostPetTag` của bé cưng bị gỡ bỏ.
  * Cả 5 bài viết gốc, hình ảnh, lượt Paw và bình luận vẫn hiển thị bình thường trên trang cá nhân của chủ nuôi, chỉ không còn hiển thị nhãn `#Bánh Bao`.

---

## 2. PHÂN HỆ ĐĂNG BÀI & KIỂM TRA MEDIA (POST & MEDIA)

### Kịch bản 4: Đăng bài viết kèm 4 ảnh hợp lệ
- **Given**: Người dùng đã đăng nhập, chọn 4 file ảnh JPEG dung lượng 5MB mỗi ảnh.
- **When**: Trình duyệt nén tự động 4 ảnh sang định dạng WebP (kích thước ~300KB/ảnh), người dùng nhập caption và bấm "Đăng bài".
- **Then**: Hệ thống tải 4 ảnh lên kho lưu trữ Cloudflare R2, lưu bản ghi bài viết ở trạng thái `PUBLIC`, bài viết xuất hiện trên đầu Bảng tin (Chronological Feed) và trả về `201 Created`.

### Kịch bản 5: Đăng bài vi phạm kết hợp cả Ảnh và Video (Thất bại)
- **Given**: Người dùng đang ở màn hình tạo bài viết.
- **When**: Người dùng cố tình chọn cả 1 file video và 2 file ảnh trong cùng 1 lần đăng.
- **Then**: Giao diện và API Backend ngay lập tức báo lỗi: "Một bài viết chỉ được chứa hoặc ảnh hoặc video trong giai đoạn này" và từ chối tải lên (`400 Bad Request`).

### Kịch bản 6: Tải lên video vượt quá thời lượng 60 giây (Thất bại)
- **Given**: Người dùng chọn một file video MP4 có thời lượng 75 giây.
- **When**: Người dùng bấm tải video lên.
- **Then**: Trình duyệt phát hiện `video.duration > 60s`, chặn ngay tại máy khách và hiển thị thông báo: "Video tối đa chỉ được dài 60 giây. Vui lòng cắt ngắn video". Nếu cố tình gọi thẳng vào API, Backend kiểm tra metadata video và từ chối với lỗi `400 Bad Request`.

### Kịch bản 7: Cố tình đổi đuôi file độc hại thành `.jpg` (Bảo mật Magic Bytes)
- **Given**: Kẻ xấu đổi tên file mã độc `shell.php` thành `cute_cat.jpg` và gửi request tải lên.
- **When**: API nhận stream tệp tin và kiểm tra Magic Bytes (File Signature).
- **Then**: Hệ thống phát hiện Magic Bytes không khớp với tiêu chuẩn `FF D8 FF` của JPEG, lập tức hủy luồng upload, ghi log cảnh báo bảo mật và trả về `400 Bad Request (Invalid file signature)`.

---

## 3. PHÂN HỆ QUYỀN RIÊNG TƯ & KHÁCH VÃNG LAI (GUEST & PRIVACY)

### Kịch bản 8: Khách vãng lai xem Bảng tin (Thành công)
- **Given**: Người dùng chưa đăng nhập, mở trình duyệt truy cập trang chủ.
- **When**: Trang web tải dữ liệu.
- **Then**: Hệ thống hiển thị Bảng tin các bài viết công khai mới nhất, hiển thị số lượt Paw và danh sách bình luận đầy đủ mà không bắt buộc người dùng phải đăng nhập trước.

### Kịch bản 9: Khách vãng lai cố tình bấm nút Thả Paw hoặc Viết bình luận
- **Given**: Khách vãng lai đang xem một bài viết công khai.
- **When**: Khách nhấn vào nút biểu tượng Paw 🐾 hoặc bấm vào ô nhập bình luận.
- **Then**: Hệ thống hiển thị Modal thông báo thân thiện: "Bạn cần đăng nhập để thả Paw và trò chuyện cùng các bé cưng!" kèm nút chuyển hướng sang trang Đăng nhập/Đăng ký.

### Kịch bản 10: Chủ bài viết ẩn bài viết khỏi công chúng
- **Given**: Chủ bài viết có bài viết A đang hiển thị ở trạng thái `PUBLIC` trên Feed.
- **When**: Chủ bài viết bấm menu `[...]` trên bài viết A và chọn "Ẩn bài viết".
- **Then**:
  * Trạng thái bài viết chuyển thành `HIDDEN`.
  * Bài viết A biến mất ngay lập tức khỏi Bảng tin chung của tất cả người dùng khác.
  * Khách vãng lai hoặc người khác truy cập trang cá nhân của chủ bài viết không thể thấy bài viết A.
  * Chỉ duy nhất chủ bài viết khi vào trang cá nhân của mình, mở tab "Bài viết đã ẩn" mới thấy được bài này.

---

## 4. PHÂN HỆ TƯƠNG TÁC THẢ PAW 🐾 & BÌNH LUẬN (PAW & COMMENT)

### Kịch bản 11: Thao tác Toggle Thả Paw và Gỡ Paw
- **Given**: Người dùng A đang xem bài viết B có 10 lượt Paw và người dùng A chưa thả Paw vào bài này.
- **When (Lần 1)**: Người dùng A nhấn vào nút Paw.
- **Then (Lần 1)**: Nút Paw chuyển sang trạng thái đã kích hoạt (sáng màu), số đếm hiển thị `11 Paw`.
- **When (Lần 2)**: Người dùng A nhấn tiếp vào nút Paw lần nữa.
- **Then (Lần 2)**: Nút Paw trở về trạng thái bình thường, số đếm giảm về `10 Paw`.

### Kịch bản 12: Nhấp đúp chuột Thả Paw cực nhanh (Chống Race Condition)
- **Given**: Bài viết có 5 lượt Paw.
- **When**: Người dùng A click liên tục 5 lần vào nút Paw trong vòng 500 mili-giây.
- **Then**: CSDL xử lý giao dịch nguyên tử (Atomic upsert), số lượt Paw chỉ dao động chính xác giữa 5 (khi gỡ) và 6 (khi thả), tuyệt đối không xảy ra tình trạng số Paw bị nhảy thành 7, 8 hay 9.

### Kịch bản 13: Bình luận và Trả lời giới hạn đúng 1 cấp lồng
- **Given**: Bài viết có một bình luận gốc C1 từ User B.
- **When**: User A bấm "Trả lời" dưới bình luận C1 và nhập nội dung: "Bé đáng yêu quá!".
- **Then**: Bình luận của User A được lưu với `parentId = C1.id`, hiển thị thụt vào 1 bậc bên dưới bình luận C1. Nút "Trả lời" trên bình luận của User A khi được bấm tiếp sẽ tự động trỏ `parentId` về C1 (không tạo thêm cấp thụt lề thứ 2).

### Kịch bản 14: Chủ bài viết xóa bình luận rác của người khác
- **Given**: Bài viết thuộc quyền sở hữu của User A. User B viết một bình luận quảng cáo spam vào bài viết của User A.
- **When**: User A mở menu bình luận của User B và chọn "Xóa bình luận".
- **Then**: Hệ thống kiểm tra User A là chủ bài viết (`post.userId === currentUserId`), cho phép xóa bình luận đó khỏi bài viết và trả về mã `200 OK`.

---

## 5. PHÂN HỆ THEO DÕI (FOLLOW ONE-WAY)

### Kịch bản 15: Follow một chiều thành công
- **Given**: User A chưa theo dõi User B.
- **When**: User A vào trang cá nhân của User B và bấm nút "Theo dõi".
- **Then**: 
  * Nút chuyển sang trạng thái "Đang theo dõi".
  * Số người theo dõi (Followers) của User B tăng thêm 1.
  * Số người đang theo dõi (Following) của User A tăng thêm 1.
  * Không phát sinh bất kỳ thông báo chờ duyệt hay lời mời kết bạn nào.

### Kịch bản 16: Cố tình Follow chính mình (Thất bại)
- **Given**: User A đang ở trang cá nhân của chính mình.
- **When**: Giao diện hiển thị nút "Chỉnh sửa hồ sơ" thay vì nút "Theo dõi". Nếu User A dùng tool gọi API `POST /api/v1/users/{userA_id}/follow`.
- **Then**: Backend kiểm tra `followerId === followingId` và từ chối yêu cầu với mã lỗi `400 Bad Request (Cannot follow yourself)`.

---

## 6. PHÂN HỆ BÁO CÁO VI PHẠM & QUẢN TRỊ ADMIN (MODERATION & ADMIN)

### Kịch bản 17: Người dùng gửi Báo cáo bài viết vi phạm
- **Given**: Người dùng A phát hiện một bài viết có dấu hiệu bạo lực ngược đãi động vật.
- **When**: Người dùng A bấm "Báo cáo bài viết", chọn lý do "Ngược đãi động vật" và bấm Gửi.
- **Then**: Hệ thống ghi nhận một bản ghi Report vào CSDL, hiển thị thông báo: "Cảm ơn bạn đã báo cáo. Đội ngũ quản trị sẽ xem xét xử lý trong thời gian sớm nhất" và trả về `201 Created`.

### Kịch bản 18: Admin khóa tài khoản vi phạm tiêu chuẩn cộng đồng
- **Given**: Admin đăng nhập vào trang quản trị `/admin/reports`, thấy người dùng X liên tục đăng bài spam lừa đảo.
- **When**: Admin bấm nút "Khóa tài khoản người dùng X" với lý do vi phạm điều khoản.
- **Then**:
  * Trạng thái tài khoản người dùng X chuyển thành `BANNED`.
  * Toàn bộ phiên làm việc của người dùng X bị thu hồi tức thì.
  * Khi người dùng X cố tình thực hiện thao tác tiếp theo, hệ thống trả về thông báo lỗi: "Tài khoản của bạn đã bị khóa do vi phạm tiêu chuẩn cộng đồng".
