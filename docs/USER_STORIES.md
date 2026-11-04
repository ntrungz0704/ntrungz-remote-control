# USER STORIES — PET SOCIAL NETWORK

> **Mã tài liệu**: `US-PETSOC-2026-V1`  
> **Dự án**: Pet Social Network  
> **Trạng thái**: `DISCOVERY COMPLETED — BASELINE DRAFT`  
> **Quy chuẩn**: As a [role], I want to [action], So that [benefit].

---

## 1. NHÓM TÍNH NĂNG P0 (CORE MVP — BẮT BUỘC)

### 1.1. Khách Vãng Lai (Guest / Unauthenticated User)
- **`US-P0-01`**:
  * **As a** Khách vãng lai,
  * **I want to** lướt xem Bảng tin (Feed) các bài đăng thú cưng mới nhất mà không cần đăng ký tài khoản,
  * **So that** tôi có thể trải nghiệm xem hình ảnh/video các bé cưng trước khi quyết định tạo tài khoản.
- **`US-P0-02`**:
  * **As a** Khách vãng lai,
  * **I want to** lọc bài viết theo Phân loài (Chó/Mèo) hoặc Giống cụ thể (Corgi, Mèo Mướp...),
  * **So that** tôi nhanh chóng tìm thấy giống thú cưng mà mình yêu thích.
- **`US-P0-03`**:
  * **As a** Khách vãng lai,
  * **I want to** nhận được thông báo yêu cầu Đăng nhập/Đăng ký khi nhấn Thả Paw, Bình luận hoặc Follow,
  * **So that** tôi biết lý do vì sao thao tác không thành công và dễ dàng chuyển hướng sang màn hình đăng nhập.

### 1.2. Chủ Nuôi (Pet Owner / Registered User)
- **`US-P0-04` (Xác thực)**:
  * **As a** Chủ nuôi mới,
  * **I want to** đăng ký tài khoản bằng Email/Mật khẩu hoặc Đăng nhập nhanh bằng Google,
  * **So that** tôi bắt đầu tham gia vào cộng đồng thú cưng an toàn và tiện lợi.
- **`US-P0-05` (Hồ sơ Thú cưng)**:
  * **As a** Chủ nuôi,
  * **I want to** tạo một hoặc nhiều Hồ sơ Thú cưng (Pet Profiles) với tên, ảnh đại diện, giống loài và ngày sinh,
  * **So that** các bé cưng của tôi có danh tính riêng trên trang cá nhân của tôi.
- **`US-P0-06` (Chỉnh sửa / Xóa Thú cưng)**:
  * **As a** Chủ nuôi,
  * **I want to** cập nhật thông tin hoặc xóa Hồ sơ Thú cưng mà không làm mất các bài viết đã đăng trước đây,
  * **So that** tôi có toàn quyền kiểm soát dữ liệu của bé cưng mà vẫn giữ được kỷ niệm bài đăng.
- **`US-P0-07` (Đăng bài dạng ảnh)**:
  * **As a** Chủ nuôi,
  * **I want to** đăng từ 1 đến 4 ảnh của bé cưng kèm lời mô tả và gắn thẻ bé cưng liên quan,
  * **So that** tôi khoe những khoảnh khắc đáng yêu của bé với cộng đồng.
- **`US-P0-08` (Đăng bài dạng video)**:
  * **As a** Chủ nuôi,
  * **I want to** tải lên 1 video ngắn (tối đa 60 giây, dưới 20MB) của bé cưng,
  * **So that** mọi người có thể xem những hành động tinh nghịch, vui nhộn của bé.
- **`US-P0-09` (Thả Paw 🐾)**:
  * **As a** Chủ nuôi,
  * **I want to** nhấn thả Paw 🐾 để bày tỏ sự yêu thích bài viết và có thể nhấn lại để hủy Paw nếu đổi ý,
  * **So that** tôi thể hiện cảm xúc với các bé cưng một cách tự nhiên và chính xác.
- **`US-P0-10` (Bình luận & Trả lời)**:
  * **As a** Chủ nuôi,
  * **I want to** viết bình luận hoặc trả lời trực tiếp bình luận của người khác (1 cấp lồng),
  * **So that** tôi có thể giao lưu, trò chuyện và hỏi thăm kinh nghiệm chăm sóc bé cưng.
- **`US-P0-11` (Xóa Bình luận)**:
  * **As a** Chủ nuôi / Tác giả bình luận,
  * **I want to** xóa bình luận của chính mình, hoặc xóa bình luận của người khác nằm trên bài viết của tôi,
  * **So that** tôi bảo vệ không gian bài viết của mình khỏi các bình luận tiêu cực, spam.
- **`US-P0-12` (Follow một chiều)**:
  * **As a** Chủ nuôi,
  * **I want to** nhấn Follow chủ nuôi khác để cập nhật bài viết của họ, và có thể Unfollow khi không muốn theo dõi nữa,
  * **So that** tôi xây dựng danh sách theo dõi những bé cưng mà tôi quan tâm.
- **`US-P0-13` (Ẩn bài / Xóa bài viết)**:
  * **As a** Chủ bài viết,
  * **I want to** chuyển trạng thái bài viết của mình sang "Ẩn" hoặc "Xóa",
  * **So that** bài viết không còn xuất hiện trên bảng tin công khai.
- **`US-P0-14` (Báo cáo vi phạm)**:
  * **As a** Chủ nuôi văn minh,
  * **I want to** nhấn nút Báo cáo bài viết có dấu hiệu ngược đãi động vật hoặc nội dung phản cảm,
  * **So that** đội ngũ quản trị có thể kịp thời can thiệp bảo vệ cộng đồng.

### 1.3. Quản Trị Viên (Admin)
- **`US-P0-15` (Duyệt báo cáo vi phạm)**:
  * **As an** Admin hệ thống,
  * **I want to** truy cập danh sách các bài viết bị người dùng báo cáo vi phạm,
  * **So that** tôi xem xét và đưa ra quyết định xử lý khách quan.
- **`US-P0-16` (Xử lý bài viết & Tài khoản vi phạm)**:
  * **As an** Admin hệ thống,
  * **I want to** có quyền ẩn/xóa bài viết độc hại và khóa tạm thời/vĩnh viễn tài khoản vi phạm,
  * **So that** tôi duy trì một môi trường mạng xã hội thú cưng an toàn và văn minh.

---

## 2. NHÓM TÍNH NĂNG P1 (NÂNG CAO TRẢI NGHIỆM — TRIỂN KHAI SAU KHI P0 ỔN ĐỊNH)

- **`US-P1-01` (Bookmarks)**:
  * **As a** Chủ nuôi,
  * **I want to** lưu các bài viết hữu ích (mẹo chăm sóc, quán cafe thú cưng) vào mục "Đã lưu",
  * **So that** tôi có thể xem lại dễ dàng bất cứ khi nào cần.
- **`US-P1-02` (Hashtags)**:
  * **As a** Chủ nuôi,
  * **I want to** bấm vào các hashtag (ví dụ `#corgilonton`, `#meomup`) để xem các bài viết cùng chủ đề,
  * **So that** tôi khám phá nhiều nội dung thú vị xoay quanh một chủ đề cụ thể.
- **`US-P1-03` (Chia sẻ mạng xã hội)**:
  * **As a** Chủ nuôi,
  * **I want to** bấm nút Chia sẻ để copy link bài viết hoặc chia sẻ lên Facebook/Zalo với ảnh đại diện bài viết hiển thị chuẩn đẹp,
  * **So that** tôi lan tỏa khoảnh khắc đáng yêu của bé cưng đến bạn bè ngoài nền tảng.
- **`US-P1-04` (Dark Mode)**:
  * **As a** Chủ nuôi lướt web ban đêm,
  * **I want to** bật chế độ nền tối (Dark Mode),
  * **So that** mắt tôi không bị mỏi khi xem video và ảnh lúc tối muộn.
- **`US-P1-05` (Trung tâm Thông báo)**:
  * **As a** Chủ nuôi,
  * **I want to** nhận thông báo khi có người thả Paw vào bài viết, bình luận hoặc bắt đầu Follow tôi,
  * **So that** tôi biết được ai đang tương tác với mình và vào phản hồi kịp thời.
- **`US-P1-06` (Chặn người dùng - Block User)**:
  * **As a** Chủ nuôi,
  * **I want to** chặn một tài khoản gây phiền toái hoặc quấy rối,
  * **So that** người đó không thể xem trang cá nhân hoặc bình luận trên bài viết của tôi nữa.

---

## 3. NHÓM TÍNH NĂNG P2 (GIAI ĐOẠN MỞ RỘNG — CHƯA THỰC HIỆN TRONG MVP)

- **`US-P2-01` (Kết bạn 2 chiều)**: Người dùng gửi lời mời kết bạn và xác nhận làm bạn bè thân thiết.
- **`US-P2-02` (Nhắn tin trực tiếp Chat 1-1)**: Chủ nuôi trò chuyện riêng tư thời gian thực để hỏi kinh nghiệm hoặc phối giống.
- **`US-P2-03` (Pet SOS GPS Alert)**: Phát cảnh báo tìm thú cưng thất lạc khẩn cấp đến các chủ nuôi trong bán kính 3km kèm định vị GPS.
- **`US-P2-04` (Stories 24 giờ)**: Đăng khoảnh khắc ngắn tự động biến mất sau 24 giờ.
- **`US-P2-05` (Thư viện âm thanh lồng tiếng)**: Kho âm thanh tiếng kêu và nhạc nền ngắn để lồng vào video.
- **`US-P2-06` (Adaptive Video Transcoding)**: Tự động chuyển đổi video sang nhiều độ phân giải HLS (1080p, 720p, 480p).
