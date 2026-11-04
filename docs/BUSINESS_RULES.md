# BUSINESS RULES (QUY TẮC NGHIỆP VỤ)
## DỰ ÁN: PET SOCIAL NETWORK (MẠNG XÃ HỘI THÚ CƯNG)

> **Mã tài liệu**: `BR-PETSOC-2026-V1`  
> **Dự án**: Pet Social Network  
> **Trạng thái**: `DISCOVERY COMPLETED — BASELINE DRAFT`  
> **Quy chuẩn**: Mã quy tắc `BR-[LĨNH_VỰC]-[SỐ]` kèm điều kiện và chế tài xử lý vi phạm.

---

## 1. QUY TẮC ĐỊNH DANH CHỦ NUÔI & THÚ CƯNG (USER & PET IDENTITY)

- **`BR-ID-001` (Tài khoản độc nhất)**:
  * Mỗi địa chỉ Email chỉ được đăng ký duy nhất 1 tài khoản User trên hệ thống.
  * Tên người dùng (`username`) là chuỗi ký tự duy nhất, viết liền không dấu, độ dài từ 3 đến 30 ký tự, chỉ chứa chữ cái, chữ số, dấu chấm `.` và gạch dưới `_`.
- **`BR-ID-002` (Bản chất Hồ sơ Thú cưng)**:
  * Pet Profile là một thực thể dữ liệu gắn liền với User sở hữu (`userId`), **không phải tài khoản đăng nhập độc lập**.
  * Pet Profile không có mật khẩu, không có email và không thể phát sinh phiên đăng nhập riêng.
- **`BR-ID-003` (Quyền thao tác Pet Profile)**:
  * Chỉ duy nhất User sở hữu Pet Profile (`currentUserId === pet.userId`) mới có quyền tạo, cập nhật hoặc xóa Pet Profile đó.
  * Mọi hành động sửa/xóa Pet Profile từ tài khoản khác phải bị chặn ngay tại tầng Backend và trả về mã lỗi `403 Forbidden`.
- **`BR-ID-004` (Bảo toàn dữ liệu khi xóa Pet Profile)**:
  * Khi User xóa một Pet Profile, hệ thống chỉ kích hoạt xóa các bản ghi liên kết trong bảng `PostPetTag`.
  * **Tuyệt đối không xóa** bài viết trong bảng `Post`. Toàn bộ bài viết, ảnh, video, lượt Paw và bình luận trước đây của chủ nuôi vẫn được bảo toàn nguyên vẹn 100%.

---

## 2. QUY TẮC BÀI VIẾT & TẢI LÊN PHƯƠNG TIỆN (POST & MEDIA RULES)

- **`BR-POST-001` (Đơn định dạng Media trong MVP)**:
  * Một bài viết trong giai đoạn MVP chỉ được phép chứa **hoặc ảnh hoặc video**, không được kết hợp cả ảnh và video trong cùng một bài đăng.
  * Bài viết có thể chỉ chứa văn bản thuần túy (Text-only) nếu người dùng không tải media lên.
- **`BR-POST-002` (Định mức Ảnh)**:
  * Số lượng ảnh tối đa trong 1 bài viết: **4 ảnh**.
  * Dung lượng tệp ảnh gốc tải lên: Tối đa **10MB / ảnh**.
  * Định dạng tệp ảnh được chấp nhận: `image/jpeg`, `image/png`, `image/webp`.
  * Ảnh phải được nén phía Client sang định dạng `.webp` với độ phân giải tối đa 1080px trước khi upload.
- **`BR-POST-003` (Định mức Video)**:
  * Số lượng video tối đa trong 1 bài viết: **1 video**.
  * Thời lượng video: Tối đa **60 giây** (`duration <= 60.0s`).
  * Dung lượng tệp video: Tối đa **20MB** (`size <= 20,971,520 bytes`).
  * Định dạng video bắt buộc: `video/mp4` với codec hình ảnh H.264 và codec âm thanh AAC.
- **`BR-POST-004` (Xác thực Server-side bắt buộc)**:
  * Backend bắt buộc phải kiểm tra `Content-Length` và kiểm tra `Magic Bytes` (chữ ký số tệp thực tế) trước khi cấp quyền lưu trữ.
  * Mọi hành vi cố tình đổi đuôi tệp (ví dụ đổi `.exe` hay `.sh` thành `.mp4` hoặc `.jpg`) phải bị từ chối ngay lập tức với lỗi `400 Bad Request`.
- **`BR-POST-005` (Gắn thẻ thú cưng)**:
  * Khi đăng bài, người dùng chỉ được phép chọn gắn thẻ (tag) các Pet Profile thuộc quyền sở hữu của chính mình. Không thể tự ý gắn thẻ Pet Profile của người khác vào bài viết khi chưa có sự đồng ý.
  * Đề xuất kỹ thuật: Số lượng Pet Profile tối đa được gắn trên 1 bài viết là **5 bé cưng**.

---

## 3. QUY TẮC DÒNG TIN & RIÊNG TƯ (FEED & PRIVACY RULES)

- **`BR-PRIV-001` (Mặc định công khai)**:
  * Tất cả tài khoản User và bài viết ở trạng thái mặc định đều là `PUBLIC`.
  * Khách vãng lai chưa đăng nhập có quyền xem toàn bộ nội dung công khai ở chế độ Read-only.
- **`BR-PRIV-002` (Trạng thái hiển thị bài viết)**:
  * `PUBLIC`: Hiển thị trên Bảng tin chung, trang Khám phá và trang cá nhân.
  * `HIDDEN`: Bài viết bị chủ sở hữu chọn ẩn. Bài viết ngay lập tức bị loại khỏi Bảng tin chung và trang cá nhân đối với người khác. Chỉ có chính chủ bài viết mới thấy bài này trong tab "Đã ẩn".
  * `SOFT_DELETED`: Bài viết bị chủ sở hữu hoặc Admin xóa. Bài viết bị ẩn hoàn toàn khỏi mọi giao diện người dùng, nhưng giữ lại trong CSDL để phục vụ kiểm toán và xử lý tranh chấp.
- **`BR-FEED-001` (Thứ tự Bảng tin)**:
  * Bảng tin được sắp xếp theo thời gian tạo mới nhất: `ORDER BY createdAt DESC`.
  * Không áp dụng bất kỳ thuật toán bóp tương tác hoặc xáo trộn thứ tự hiển thị nào trong MVP.

---

## 4. QUY TẮC THEO DÕI (FOLLOW RULES)

- **`BR-FOL-001` (Follow một chiều)**:
  * Quan hệ Follow được thiết lập từ `followerId` (người theo dõi) tới `followingId` (người được theo dõi).
  * Không yêu cầu đối phương phải bấm "Đồng ý" (Không có Friend Request).
- **`BR-FOL-002` (Chống tự theo dõi)**:
  * Hệ thống cấm tuyệt đối hành động tự Follow chính mình (`followerId !== followingId`).
- **`BR-FOL-003` (Tính duy nhất của cặp Follow)**:
  * Giữa hai tài khoản `(followerId, followingId)` chỉ tồn tại tối đa một quan hệ Follow đang hoạt động. Áp dụng ràng buộc Unique trên CSDL.
- **`BR-FOL-004` (Độc lập tương tác khi Unfollow)**:
  * Khi User A bấm Unfollow User B, toàn bộ lượt Paw và bình luận trước đây của User A trên các bài viết của User B vẫn được giữ nguyên vẹn.

---

## 5. QUY TẮC THẢ PAW 🐾 & BÌNH LUẬN (PAW & COMMENT RULES)

- **`BR-PAW-001` (Tính duy nhất của lượt Paw)**:
  * Mỗi User chỉ được phép thả tối đa 1 Paw trên 1 bài viết. Ràng buộc Unique `(userId, postId)`.
  * Hành động là Toggle: Nếu bản ghi Paw đã tồn tại ➔ Xóa bản ghi (Gỡ Paw, đếm -1); Nếu bản ghi chưa tồn tại ➔ Tạo bản ghi (Thả Paw, đếm +1).
- **`BR-PAW-002` (Chống gian lận Race Condition)**:
  * Khi có nhiều request Thả Paw gửi đến đồng thời từ cùng 1 user (click đúp nhanh), CSDL phải sử dụng giao dịch nguyên tử (Atomic Upsert hoặc Transaction) để đảm bảo số đếm `pawCount` không bị sai lệch.
- **`BR-COMM-001` (Giới hạn cấp độ bình luận)**:
  * Hệ thống chỉ hỗ trợ đúng 1 cấp phản hồi:
    * `parentId === null`: Bình luận gốc (Root comment).
    * `parentId !== null`: Bình luận phản hồi (Reply).
  * Một bình luận phản hồi **không thể** làm cha của một bình luận khác (nếu cố tình gửi `parentId` trỏ vào 1 reply, hệ thống tự động gán trỏ về Root comment gốc của nhánh đó).
- **`BR-COMM-002` (Phân quyền xóa bình luận)**:
  * User chỉ có quyền xóa bình luận do chính mình viết (`comment.userId === currentUserId`).
  * Chủ bài viết (`post.userId === currentUserId`) có đặc quyền xóa **bất kỳ bình luận nào** nằm trong bài viết của mình nhằm mục đích dọn dẹp nội dung tiêu cực.
  * Admin hệ thống có quyền xóa bất kỳ bình luận nào vi phạm tiêu chuẩn cộng đồng.
- **`BR-COMM-003` (Chống Spam Bình luận)**:
  * Một người dùng không được gửi 2 bình luận có nội dung giống nhau trong vòng 60 giây.
  * Áp dụng Rate Limiting: Tối đa 10 bình luận / phút / user.

---

## 6. QUY TẮC KIỂM DUYỆT & QUẢN TRỊ ADMIN (MODERATION & ADMIN RULES)

- **`BR-MOD-001` (Bộ lọc từ khóa cấm)**:
  * Hệ thống duy trì danh mục từ khóa thô tục, bạo lực và ngược đãi thú cưng.
  * Mọi bài viết hoặc bình luận chứa từ khóa trong danh sách cấm sẽ bị tự động từ chối đăng tải hoặc tự động gắn cờ cảnh báo cho Admin.
- **`BR-MOD-002` (Quy trình Báo cáo Vi phạm)**:
  * Một người dùng chỉ được gửi 1 báo cáo vi phạm trên 1 bài viết cụ thể.
  * Báo cáo phải kèm theo lý do bắt buộc: `CRUELTY` (Ngược đãi động vật), `SPAM` (Rác/Quảng cáo), `OFFENSIVE` (Nội dung thô tục), `FRAUD` (Lừa đảo), `OTHER` (Khác).
- **`BR-ADM-001` (Đặc quyền Quản trị viên)**:
  * Chỉ tài khoản có `role === 'ADMIN'` mới có quyền truy cập các API và trang `/admin`.
  * Admin có quyền: Chuyển trạng thái bài viết sang `HIDDEN` hoặc `SOFT_DELETED`, và chuyển trạng thái tài khoản người dùng sang `BANNED`.
  * Tài khoản ở trạng thái `BANNED` sẽ bị thu hồi toàn bộ phiên đăng nhập lập tức và không thể thực hiện bất kỳ thao tác nào trên hệ thống.
