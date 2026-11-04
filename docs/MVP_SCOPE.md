# MVP SCOPE MANAGEMENT (QUẢN LÝ PHẠM VI MVP)
## DỰ ÁN: PET SOCIAL NETWORK (MẠNG XÃ HỘI THÚ CƯNG)

> **Mã tài liệu**: `SCOPE-PETSOC-2026-V1`  
> **Dự án**: Pet Social Network  
> **Trạng thái**: `DISCOVERY COMPLETED — BASELINE DRAFT`  
> **Quy chuẩn**: Phân định rạch ròi P0 / P1 / P2 / Out of Scope kèm tiêu chí phát hành (Release Criteria).

---

## 1. MA TRẬN PHÂN BỔ PHẠM VI (SCOPE MATRIX)

```
                       ┌─────────────────────────────────────┐
                       │          TOÀN BỘ Ý TƯỞNG            │
                       └──────────────────┬──────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌────────────────────────┐                      ┌────────────────────────┐
     │      PHẠM VI MVP       │                      │   GIAI ĐOẠN TƯƠNG LAI  │
     │      (Giai đoạn 1)     │                      │      (Giai đoạn 2)     │
     └────────────┬───────────┘                      └────────────┬───────────┘
                  │                                               │
         ┌────────┴────────┐                                      │
         ▼                 ▼                                      ▼
   ┌───────────┐     ┌───────────┐                         ┌───────────┐
   │    P0     │     │    P1     │                         │    P2     │
   │ Bắt buộc  │     │  Nâng cao │                         │  Mở rộng  │
   │ hoàn chỉnh│     │trải nghiệm│                         │  tính năng│
   └───────────┘     └───────────┘                         └───────────┘
```

---

## 2. CHI TIẾT TỪNG PHÂN TẦNG TÍNH NĂNG

### 2.1. Phân tầng P0: Bắt buộc hoàn chỉnh (Core MVP - Release Blocker)
*Đây là những tính năng sống còn, thiếu bất kỳ tính năng nào trong nhóm này thì sản phẩm không thể đưa vào hoạt động thực tế.*

| Mã tính năng | Tên tính năng | Mô tả tóm tắt | Phụ thuộc |
| :--- | :--- | :--- | :--- |
| `FEAT-P0-01` | **Xác thực an toàn** | Đăng ký, đăng nhập Email/Password & Google Login; Quên mật khẩu; Đăng xuất. | Database, NextAuth |
| `FEAT-P0-02` | **Hồ sơ Chủ nuôi & Thú cưng** | Quản lý Profile chủ nuôi; Thêm/sửa/xóa nhiều Pet Profile (Tên, ảnh, giống, loài). | `FEAT-P0-01` |
| `FEAT-P0-03` | **Đăng bài Media đơn định dạng** | Đăng bài chứa 1-4 ảnh (WebP) HOẶC 1 video (MP4, <=60s, <=20MB); Gắn thẻ thú cưng. | Cloudflare R2 |
| `FEAT-P0-04` | **Bảng tin thời gian thực** | Chronological Feed (mới nhất lên đầu); Phân trang cuộn vô tận (Infinite Scroll). | `FEAT-P0-03` |
| `FEAT-P0-05` | **Tương tác Thả Paw 🐾** | Nút bấm Toggle Paw; Đảm bảo giao dịch nguyên tử, chống nhảy số trùng lặp. | `FEAT-P0-03` |
| `FEAT-P0-06` | **Bình luận 1 cấp lồng** | Bình luận gốc và trả lời trực tiếp; Quyền xóa của tác giả và chủ bài viết. | `FEAT-P0-03` |
| `FEAT-P0-07` | **Mạng lưới Follow một chiều** | Follow / Unfollow tài khoản khác; Độc lập tương tác cũ khi Unfollow. | `FEAT-P0-01` |
| `FEAT-P0-08` | **Khám phá & Bộ lọc** | Lọc bài viết theo Phân loài (Chó, Mèo, Khác) và Giống cụ thể. | `FEAT-P0-04` |
| `FEAT-P0-09` | **Quyền riêng tư & Khách xem** | Khách vãng lai xem Read-only; Chủ bài viết có quyền Ẩn hoặc Xóa bài viết. | `FEAT-P0-04` |
| `FEAT-P0-10` | **Bảo mật & Kiểm duyệt** | Lọc từ cấm cơ bản; Nút Báo cáo vi phạm (Report); Rate Limiting chống spam. | Toàn hệ thống |
| `FEAT-P0-11` | **Admin Dashboard cơ bản** | Trang quản trị xem danh sách Report, duyệt xóa bài hoặc khóa tài khoản vi phạm. | `FEAT-P0-10` |
| `FEAT-P0-12` | **Giao diện Responsive 100%** | Giao diện Tiếng Việt phong cách đáng yêu trên Mobile (360px+), Tablet, Desktop. | UI Components |

---

### 2.2. Phân tầng P1: Nâng cao trải nghiệm (Triển khai ngay khi P0 vận hành ổn định)
*Nhóm tính năng giúp tăng độ gắn kết (retention) và sự tiện lợi cho người dùng.*

1. **`FEAT-P1-01` (Bookmarks / Lưu bài viết)**: Cho phép chủ nuôi lưu các bài viết mẹo nuôi dạy, dinh dưỡng để xem lại sau.
2. **`FEAT-P1-02` (Trang chủ đề Hashtag)**: Tự động nhận diện `#hashtag` trong caption và tạo trang xem các bài viết cùng chủ đề.
3. **`FEAT-P1-03` (Nút Chia sẻ ngoài)**: Nút copy link bài viết và cấu hình thẻ OpenGraph/Twitter Card để khi gửi link sang Facebook/Zalo có ảnh thumbnail đẹp.
4. **`FEAT-P1-04` (Chế độ giao diện tối - Dark Mode)**: Chuyển đổi giao diện sáng/tối bảo vệ mắt người dùng ban đêm.
5. **`FEAT-P1-05` (Trung tâm Thông báo - In-app Notifications)**: Danh sách thông báo khi có người thả Paw vào bài viết, bình luận hoặc bắt đầu theo dõi.
6. **`FEAT-P1-06` (Chặn người dùng - Block User)**: Người dùng có thể chặn tài khoản khác để không thấy nội dung của nhau.

---

### 2.3. Phân tầng P2: Mở rộng quy mô (Giai đoạn 2 theo đúng Brief)
*Nhóm tính năng quy mô lớn, đòi hỏi hạ tầng máy chủ mạnh hơn hoặc dịch vụ có tính phí.*

1. **`FEAT-P2-01` (Quan hệ Kết bạn 2 chiều - Friends)**: Gửi lời mời kết bạn và tính năng bài viết "Chỉ bạn bè mới xem được".
2. **`FEAT-P2-02` (Tin nhắn trực tiếp - Chat 1-1 Real-time)**: Nhắn tin riêng tư thời gian thực giữa 2 chủ nuôi.
3. **`FEAT-P2-03` (Pet SOS Alert)**: Báo mất tích thú cưng khẩn cấp phát thông báo GPS theo bán kính 3km.
4. **`FEAT-P2-04` (Stories 24 giờ)**: Tính năng chia sẻ khoảnh khắc ngắn tự hủy sau 24h.
5. **`FEAT-P2-05` (Thư viện âm thanh lồng tiếng)**: Thư viện tiếng kêu động vật (SFX) và nhạc nền cho video.
6. **`FEAT-P2-06` (Video Transcoding đa độ phân giải)**: Tự động chuyển đổi video sang nhiều độ phân giải HLS (1080p, 720p, 480p).

---

### 2.4. Ngoài phạm vi dự án (Out of Scope)
- Sàn thương mại điện tử mua bán thú cưng sống hoặc các dịch vụ cá cược động vật.
- Dịch vụ gọi xe vận chuyển thú cưng chuyên dụng (nằm ngoài phạm vi của mạng xã hội).

---

## 3. TIÊU CHÍ PHÁT HÀNH MVP (RELEASE CRITERIA CHO P0)

Để phiên bản MVP được phép xuất xưởng (Production Ready), bắt buộc phải thỏa mãn 5 tiêu chí cứng:

1. **Tiêu chí Nghiệp vụ**: 100% các tính năng trong nhóm P0 hoàn thành và vượt qua toàn bộ kịch bản trong `docs/ACCEPTANCE_CRITERIA.md`.
2. **Tiêu chí Ổn định & Lỗi**: 0 lỗi nghiêm trọng (Critical Bug), 0 lỗi bảo mật rò rỉ IDOR hoặc hở API.
3. **Tiêu chí Tốc độ**: Tốc độ tải trang đầu tiên trên thiết bị di động (LCP) dưới 2.0 giây; API phản hồi dưới 250ms.
4. **Tiêu chí Tương thích**: Giao diện hiển thị hoàn hảo trên màn hình từ 360px (iPhone SE) đến 1920px (Desktop), không bị tràn ngang, không vỡ layout.
5. **Tiêu chí Vận hành 0đ**: Kiểm tra thực tế hệ thống lưu trữ Cloudflare R2 và CSDL PostgreSQL hoạt động ổn định trong hạn mức miễn phí ban đầu.
