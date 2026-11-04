# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## DỰ ÁN: PET SOCIAL NETWORK (MẠNG XÃ HỘI THÚ CƯNG)

> **Mã tài liệu**: `PRD-PETSOC-2026-V1`  
> **Trạng thái**: `DISCOVERY COMPLETED — BASELINE DRAFT`  
> **Phiên bản**: `1.0.0` | **Tác giả**: Discovery Agent (BA & Requirements Engineer)  
> **Phê duyệt**: Đang chờ Product Owner duyệt

---

## 1. TỔNG QUAN SẢN PHẨM (PRODUCT OVERVIEW)

### 1.1. Bối cảnh & Tầm nhìn
**Pet Social Network** là nền tảng mạng xã hội chuyên biệt dành cho cộng đồng những người nuôi và yêu thú cưng tại Việt Nam. Nền tảng cho phép các chủ nuôi chia sẻ hình ảnh, video ngắn (tối đa 60 giây) về những khoảnh khắc đời thường, tính cách và câu chuyện của các bé cưng, đồng thời kết nối, theo dõi và học hỏi kinh nghiệm chăm sóc thú cưng lẫn nhau.

### 1.2. Mục tiêu sản phẩm (Product Goals)
1. **MVP Tinh gọn & Khả thi cao**: Xây dựng một mạng xã hội thực tế, vận hành ổn định trên Web Responsive (Mobile, Tablet, Desktop), có khả năng mở rộng sang Mobile App trong tương lai.
2. **Trải nghiệm Pet-Centric**: Tôn vinh hình ảnh thú cưng với định danh rõ ràng theo Loài (Species) và Giống (Breed), kết hợp hành động tương tác đặc trưng nút thả Paw 🐾.
3. **An toàn & Văn minh**: Bảo vệ dữ liệu cá nhân chủ nuôi, kiểm duyệt từ khóa thô tục cơ bản và tiếp nhận báo cáo vi phạm (Report) kịp thời.
4. **Chi phí tối ưu**: Tận dụng tối đa Free Tier (0đ ban đầu) nhưng đảm bảo kiến trúc chịu tải từ 100 đến 1.000 người dùng đầu tiên mà không bị rò rỉ dữ liệu hay phát sinh chi phí bất ngờ.

---

## 2. CHÂN DUNG NGƯỜI DÙNG & VAI TRÒ HỆ THỐNG (USER ROLES & PERSONAS)

### 2.1. Danh sách các vai trò (User Roles)
1. **Khách vãng lai (Guest / Unauthenticated User)**:
   - Người chưa đăng ký hoặc chưa đăng nhập.
   - Quyền hạn: Chỉ đọc (Read-only). Được xem Bảng tin (Feed), xem bài viết chi tiết, xem trang cá nhân công khai, tìm kiếm và lọc bài viết theo Loài/Giống.
   - Bị chặn: Không thể thực hiện bất kỳ hành động ghi nào (Không được Paw, Comment, Follow, Đăng bài, Report).
2. **Thành viên / Chủ nuôi (Registered User / Pet Owner)**:
   - Đã xác thực qua Email/Password hoặc Google OAuth.
   - Quyền hạn: Quản lý hồ sơ cá nhân, tạo và quản lý nhiều Pet Profiles, đăng bài (ảnh hoặc video ngắn), thả Paw (toggle), bình luận (1 cấp lồng), theo dõi (Follow/Unfollow) chủ nuôi khác, ẩn/xóa bài viết của chính mình, xóa bình luận trên bài viết của mình, gửi báo cáo vi phạm (Report).
3. **Quản trị viên (Admin)**:
   - Tài khoản có quyền quản trị hệ thống.
   - Quyền hạn: Xem danh sách báo cáo vi phạm (Reports), duyệt xử lý báo cáo, ẩn hoặc xóa bài viết vi phạm, khóa hoặc tạm ngưng tài khoản người dùng vi phạm quy tắc cộng đồng.

---

## 3. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

### 3.1. Phân hệ Định danh & Quản lý Thú cưng (Pet Identity & Profiles)
- `FR-ID-01`: Một tài khoản User đại diện cho một chủ nuôi duy nhất.
- `FR-ID-02`: Một User có thể tạo không giới hạn các Hồ sơ thú cưng (Pet Profiles) thuộc quyền sở hữu của mình.
- `FR-ID-03`: Mỗi Pet Profile bao gồm: Tên bé, Ảnh đại diện (Avatar), Phân loài (Chó, Mèo, Khác), Giống cụ thể (ví dụ: Corgi, Golden, Mèo Mướp, Mèo Anh lông ngắn...), Ngày sinh (hoặc ngày nhận nuôi), Giới tính (Đực/Cái), Mô tả ngắn.
- `FR-ID-04`: Pet Profile **không có** tài khoản đăng nhập độc lập. Mọi hành động đều do User (Chủ nuôi) thực hiện.
- `FR-ID-05`: Chỉ chủ sở hữu mới có quyền chỉnh sửa thông tin hoặc xóa Pet Profile của mình.
- `FR-ID-06`: Khi xóa Pet Profile, hệ thống **không xóa bài viết gốc**. Chỉ xóa liên kết giữa bài viết và Pet Profile đó (thông qua bảng liên kết).

### 3.2. Phân hệ Đăng bài & Quản lý Media (Post & Media Management)
- `FR-POST-01`: Một bài viết chỉ chứa **hoặc ảnh hoặc video**, không kết hợp ảnh và video trong cùng một bài viết (ở giai đoạn MVP).
- `FR-POST-02`: Đăng bài dạng ảnh: Cho phép tải lên từ 1 đến 4 ảnh. Kích thước file gốc tối đa 10MB/ảnh. Hỗ trợ định dạng JPEG, PNG, WebP.
- `FR-POST-03`: Tự động nén ảnh phía Client (trình duyệt) sang định dạng WebP với cạnh dài tối đa 1080px, dung lượng mục tiêu 200–500KB/ảnh. Có cơ chế fallback tải file gốc nếu trình duyệt không hỗ trợ nén (kèm điều kiện kích thước <= 3MB).
- `FR-POST-04`: Đăng bài dạng video: Tối đa 1 video / bài viết. Định dạng MP4 (H.264/AAC), thời lượng tối đa 60 giây, dung lượng tối đa 20MB. Phát video qua thẻ HTML5 native.
- `FR-POST-05`: Gắn thẻ thú cưng: Một bài viết có thể gắn 0, 1 hoặc nhiều Pet Profiles của chủ nuôi đó (đề xuất kỹ thuật: tối đa 5 Pet Profiles).
- `FR-POST-06`: Trạng thái bài viết:
  * `PUBLIC` (Công khai): Hiển thị trên Feed và trang cá nhân.
  * `HIDDEN` (Ẩn bài): Chủ bài viết chọn ẩn. Bài viết không xuất hiện trên Feed công khai, Explore hay trang cá nhân công khai, chỉ hiển thị trong mục lưu trữ cá nhân của chính chủ nuôi.
  * `SOFT_DELETED` (Xóa mềm): Bài viết bị chủ sở hữu hoặc Admin xóa, ẩn khỏi mọi giao diện, dữ liệu được đánh dấu xóa và lưu trong CSDL phục vụ đối soát/audit log.

### 3.3. Phân hệ Bảng tin & Khám phá (Feed & Timeline)
- `FR-FEED-01`: Chronological Feed: Hiển thị các bài viết công khai sắp xếp theo thời gian mới nhất lên đầu (`createdAt DESC`).
- `FR-FEED-02`: Cơ chế tải trang: Hỗ trợ phân trang theo con trỏ (Cursor-based pagination) hoặc Infinite Scroll mượt mà.
- `FR-FEED-03`: Bộ lọc bài viết: Cho phép người dùng lọc bài viết theo Phân loài (Chó, Mèo, Khác) và theo Giống cụ thể.

### 3.4. Phân hệ Mạng lưới & Tương tác (Social Graph & Interaction)
- `FR-SOC-01`: Follow một chiều: Người dùng có thể nhấn Follow hoặc Unfollow tài khoản chủ nuôi khác.
- `FR-SOC-02`: Ràng buộc Follow: Quan hệ Follow được thiết lập giữa User với User (không phải giữa Pet với Pet). Không cho phép tự Follow chính mình. Một cặp User chỉ có 1 trạng thái Follow duy nhất.
- `FR-SOC-03`: Hành động Unfollow không làm xóa các tương tác cũ (Paw, Comment) của người dùng đó trên bài viết của đối phương.
- `FR-SOC-04`: Tương tác Paw 🐾:
  * Mỗi User chỉ được thả tối đa 1 Paw trên 1 bài viết.
  * Cơ chế Toggle: Bấm lần 1 = Thả Paw (số lượng +1); Bấm lần 2 = Gỡ Paw (số lượng -1).
  * Bảo đảm không bị tăng/giảm trùng lặp khi có nhiều request đồng thời.
- `FR-SOC-05`: Bình luận (Comments):
  * Chỉ hỗ trợ đúng **1 cấp lồng** (1-level nesting): Gồm Bình luận gốc (Root comment) và Phản hồi trực tiếp (Direct reply). Tuyệt đối không đệ quy vô hạn cấp.
  * Quyền xóa bình luận: Tác giả bình luận có quyền xóa bình luận của mình; Chủ bài viết có quyền xóa bất kỳ bình luận nào trên bài viết của mình; Admin có quyền xóa bình luận vi phạm.

### 3.5. Phân hệ Kiểm duyệt & Báo cáo Vi phạm (Moderation & Safety)
- `FR-MOD-01`: Bộ lọc từ khóa thô tục cơ bản: Tự động chặn hoặc gắn cờ các bài đăng/bình luận chứa từ ngữ bạo hành, thô tục, spam.
- `FR-MOD-02`: Báo cáo vi phạm (Report): Người dùng đã đăng nhập có thể nhấn nút "Báo cáo bài viết" và chọn lý do (Ngược đãi động vật, Spam buôn bán, Lừa đảo, Nội dung thù địch).
- `FR-MOD-03`: Bảng điều khiển Admin (Admin Dashboard): Cho phép Admin xem danh sách báo cáo, xem bài viết bị báo cáo, thực hiện hành động: Bỏ qua báo cáo, Ẩn bài viết, Xóa bài viết, hoặc Khóa tài khoản vi phạm.

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

1. **Hiệu năng (Performance)**:
   - Tốc độ tải trang đầu tiên (First Load): FCP < 1.2s, LCP < 2.0s trên mạng 4G tiêu chuẩn.
   - Thời gian phản hồi API (API Latency): P95 < 250ms cho các truy vấn Feed và tương tác Paw/Comment.
2. **Bảo mật (Security)**:
   - Mật khẩu lưu trữ bắt buộc mã hóa bCrypt với salt rounds >= 10.
   - Xác thực phiên làm việc qua JWT / Session Cookie an toàn (`HttpOnly`, `SameSite=Lax`, `Secure`).
   - Kiểm tra phân quyền Server-side nghiêm ngặt: Tuyệt đối không để xảy ra lỗ hổng IDOR (Insecure Direct Object References).
   - Kiểm tra an toàn file tải lên: Xác thực Magic Bytes phía máy chủ, từ chối file giả mạo đuôi.
3. **Tính sẵn sàng & Khả năng tương thích (Compatibility & Responsive)**:
   - Giao diện Responsive 100% trên Mobile (360px - 430px), Tablet (768px - 1024px) và Desktop (1280px+).
   - Tương thích tốt trên các trình duyệt hiện đại: Safari (iOS 15+), Chrome (Android & Windows), Firefox, Edge.
4. **Giới hạn vận hành (Operating Constraints)**:
   - Hệ thống vận hành trong giới hạn Free Tier: Dung lượng CSDL ban đầu < 500MB, Dung lượng lưu trữ Media ban đầu < 10GB.

---

## 5. PHẠM VI DỰ ÁN (SCOPE MANAGEMENT)

### 5.1. Thuộc phạm vi MVP (In-Scope - P0)
- Xác thực: Đăng ký, Đăng nhập (Email/Password & Google OAuth), Đăng xuất.
- Quản lý hồ sơ Chủ nuôi & Hồ sơ Thú cưng (Pet Cards).
- Đăng bài: Hoặc ảnh (tối đa 4 ảnh nén WebP) hoặc video (MP4 tối đa 60s, <= 20MB).
- Bảng tin thời gian thực (Chronological Feed) có Infinite Scroll/Phân trang.
- Follow một chiều giữa các tài khoản User.
- Thả Paw 🐾 (Toggle) và Bình luận 1 cấp lồng.
- Bộ lọc bài viết theo Loài và Giống cụ thể.
- Trang cá nhân: Lưới bài viết, danh sách Pet Profile, các bài đã Paw.
- Báo cáo vi phạm (Report button) và Bộ lọc từ khóa cơ bản.
- Admin Dashboard tối giản xử lý bài vi phạm.
- Giao diện Tiếng Việt đáng yêu, Responsive 100%.

### 5.2. Chuyển sang giai đoạn sau (Out-of-Scope cho MVP)
- **Giai đoạn P1**: Lưu bài viết yêu thích (Bookmarks), Chủ đề Hashtag, Chia sẻ mạng xã hội ngoài, Chế độ ban đêm (Dark Mode), Trung tâm thông báo (Notification Center), Chặn người dùng (Block User).
- **Giai đoạn P2**: Kết bạn 2 chiều (Friends), Nhắn tin riêng (Chat 1-1), Báo mất thú cưng khẩn cấp (Pet SOS GPS), Stories 24h tự hủy, Thư viện âm thanh lồng tiếng, Video Transcoding đa độ phân giải (HLS/DASH).
- **Không bao giờ làm trong khuôn khổ dự án**: Thương mại điện tử buôn bán thú cưng không rõ nguồn gốc, dịch vụ cá cược chọi chó mèo.

---

## 6. RỦI RO & GIẢ ĐỊNH (ASSUMPTIONS & RISKS)

1. **Giả định**:
   - Trình duyệt di động của người dùng hỗ trợ HTML5 Video và Canvas API để nén WebP phía client.
   - Người dùng tải video lên là video đã được quay sẵn bằng điện thoại thông minh ở định dạng MP4 tiêu chuẩn.
2. **Rủi ro kỹ thuật & Chi phí**:
   - *Rủi ro vượt ngưỡng Free Tier của kho lưu trữ*: Nếu người dùng đăng quá nhiều video 20MB, Cloudflare R2 sẽ nhanh chóng vượt mốc 10GB miễn phí.
     👉 *Biện pháp giảm thiểu*: Đặt giới hạn mỗi người dùng chỉ được đăng tối đa 2 video / ngày trong giai đoạn thử nghiệm; áp dụng chính sách xóa cache hoặc mua thêm gói lưu trữ giá rẻ (chỉ 0.015$/GB).
