# REQUIREMENT BASELINE & TRACEABILITY MATRIX
## DỰ ÁN: PET SOCIAL NETWORK (MẠNG XÃ HỘI THÚ CƯNG)

> **Mã tài liệu**: `BASE-PETSOC-2026-V1`  
> **Dự án**: Pet Social Network  
> **Trạng thái**: `DISCOVERY COMPLETED — BASELINE DRAFT`  
> **Quy chuẩn**: Phân loại trạng thái (DECIDED, PROPOSED, UNRESOLVED) và Truy vết yêu cầu (Traceability Matrix).

---

## 1. BẢNG DANH MỤC YÊU CẦU CHUẨN HÓA (REQUIREMENT INVENTORY)

| Req ID | Tên yêu cầu nghiệp vụ | Mô tả tóm tắt | Trạng thái | Priority | Tiêu chí AC | Nguồn quyết định |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `REQ-ID-01` | Tài khoản Chủ nuôi duy nhất | 1 User = 1 Chủ nuôi, quản lý nhiều Pet Profiles | `DECIDED` | **P0** | `AC-01` | PO Final Decision 2.1 |
| `REQ-ID-02` | Hồ sơ Thú cưng (Pet Cards) | Pet Profile chứa tên, avatar, loài, giống, ngày sinh; không có tài khoản đăng nhập độc lập | `DECIDED` | **P0** | `AC-01` | PO Final Decision 2.1 |
| `REQ-ID-03` | Phân quyền Pet Profile | Chỉ chủ sở hữu mới có quyền sửa/xóa Pet Profile của mình | `DECIDED` | **P0** | `AC-02` | PO Final Decision 2.1 |
| `REQ-ID-04` | Bảo toàn bài viết khi xóa Pet | Xóa Pet Profile chỉ ngắt liên kết, không xóa bài viết gốc của chủ nuôi | `DECIDED` | **P0** | `AC-03` | PO Final Decision 2.1 |
| `REQ-POST-01`| Đơn định dạng Media | Một bài viết chỉ chứa hoặc Ảnh hoặc Video, không kết hợp cả hai trong MVP | `DECIDED` | **P0** | `AC-05` | PO Final Decision 2.5 |
| `REQ-POST-02`| Định mức Ảnh (1-4 ảnh) | Tối đa 4 ảnh/bài, file gốc <=10MB, nén sang WebP phía client (~300KB, max 1080px) | `DECIDED` | **P0** | `AC-04` | PO Final Decision 2.5 |
| `REQ-POST-03`| Định mức Video (<=60s, <=20MB)| 1 video/bài, MP4 H.264/AAC, <=60s, <=20MB, phát qua HTML5 native, không transcoding đa tầng | `DECIDED` | **P0** | `AC-06` | PO Final Decision 2.5 |
| `REQ-POST-04`| Gắn thẻ thú cưng vào bài | Bài viết có thể gắn 0, 1 hoặc nhiều Pet Profiles của chủ nuôi (tối đa 5 bé) | `PROPOSED` | **P0** | `AC-03` | Đề xuất kỹ thuật |
| `REQ-POST-05`| Trạng thái bài viết | Hỗ trợ 3 trạng thái: `PUBLIC`, `HIDDEN` (chỉ mình tôi thấy), `SOFT_DELETED` | `DECIDED` | **P0** | `AC-10` | PO Final Decision 2.4 |
| `REQ-FEED-01`| Bảng tin Thời gian thực | Chronological Feed: Bài mới nhất lên đầu, hỗ trợ Infinite Scroll/phân trang | `DECIDED` | **P0** | `AC-08` | PO Final Decision 2.3 |
| `REQ-FEED-02`| Lọc bài theo Loài & Giống | Khách vãng lai và thành viên lọc bài theo Phân loài (Chó/Mèo) và Giống cụ thể | `DECIDED` | **P0** | `AC-08` | PO Final Decision 2.4 |
| `REQ-PRIV-01`| Quyền riêng tư & Khách xem | Mặc định Public. Khách chưa đăng nhập xem Read-only. Phải đăng nhập khi ghi dữ liệu | `DECIDED` | **P0** | `AC-08, 09`| PO Final Decision 2.4 |
| `REQ-SOC-01` | Follow một chiều | Quan hệ Follow giữa User với User, không có Friend Request, không tự Follow chính mình | `DECIDED` | **P0** | `AC-15, 16`| PO Final Decision 2.2 |
| `REQ-SOC-02` | Độc lập tương tác khi Unfollow| Unfollow không làm xóa các lượt Paw và bình luận cũ của người dùng | `DECIDED` | **P0** | `AC-15` | PO Final Decision 2.2 |
| `REQ-PAW-01` | Cơ chế Toggle Paw 🐾 | 1 User tối đa 1 Paw/Post. Nhấn lần 1 thả Paw (+1), nhấn lần 2 gỡ Paw (-1). Atomic upsert | `DECIDED` | **P0** | `AC-11, 12`| PO Final Decision 2.6 |
| `REQ-COMM-01`| Bình luận 1 cấp lồng | Cấu trúc gồm Comment gốc và Reply trực tiếp. Không đệ quy vô hạn cấp | `DECIDED` | **P0** | `AC-13` | PO Final Decision 2.6 |
| `REQ-COMM-02`| Phân quyền xóa bình luận | Tác giả xóa comment của mình; Chủ bài viết xóa mọi comment trên bài của mình; Admin xóa vi phạm | `DECIDED` | **P0** | `AC-14` | PO Final Decision 2.6 |
| `REQ-MOD-01` | Bộ lọc từ cấm & Báo cáo | Tự động lọc từ ngữ thô tục cơ bản; Nút Báo cáo vi phạm (Report) kèm lý do | `DECIDED` | **P0** | `AC-17` | PO Final Decision 2.7 |
| `REQ-ADM-01` | Admin Dashboard cơ bản | Xem danh sách Report, duyệt ẩn/xóa bài viết, khóa tài khoản vi phạm | `DECIDED` | **P0** | `AC-18` | PO Final Decision 2.7 |
| `REQ-SEC-01` | Xác thực & An toàn Server | Mật khẩu bCrypt, JWT Cookie HttpOnly, Server-side Magic Bytes check, IDOR guard | `PROPOSED` | **P0** | `AC-07` | Chuẩn bảo mật OWASP |
| `REQ-SEC-02` | Rate Limiting chống spam | Giới hạn 30 paws/phút, 10 comments/phút, chặn bình luận trùng lặp trong 60s | `PROPOSED` | **P0** | `AC-12` | Đề xuất bảo vệ hệ thống |
| `REQ-P1-01`  | Bookmarks (Lưu bài viết) | Chủ nuôi lưu các bài viết yêu thích vào thư mục cá nhân | `DECIDED` | **P1** | Giai đoạn P1 | PO Final Decision 2.8 |
| `REQ-P1-02`  | Hashtags chủ đề | Tự động nhận diện `#hashtag` và trang xem bài theo hashtag | `DECIDED` | **P1** | Giai đoạn P1 | PO Final Decision 2.8 |
| `REQ-P1-03`  | Chia sẻ ngoài (Social Share)| Nút copy link kèm OpenGraph thumbnail hiển thị đẹp trên Facebook/Zalo | `DECIDED` | **P1** | Giai đoạn P1 | PO Final Decision 2.8 |
| `REQ-P1-04`  | Chế độ ban đêm (Dark Mode) | Chuyển đổi giao diện sáng/tối | `DECIDED` | **P1** | Giai đoạn P1 | PO Final Decision 2.8 |
| `REQ-P1-05`  | Trung tâm thông báo | Báo khi có người Paw/Comment bài viết hoặc Follow | `DECIDED` | **P1** | Giai đoạn P1 | PO Final Decision 2.8 |
| `REQ-P1-06`  | Chặn người dùng (Block User)| Chặn người dùng làm phiền, ẩn bài của nhau | `DECIDED` | **P1** | Giai đoạn P1 | PO Final Decision 2.8 |
| `REQ-P2-01`  | Friends 2 chiều & Chat 1-1 | Kết bạn xác nhận hai chiều và Nhắn tin trực tiếp thời gian thực | `DECIDED` | **P2** | Giai đoạn P2 | PO Final Decision 2.8 |
| `REQ-P2-02`  | Pet SOS GPS Alert | Phát cảnh báo tìm thú cưng thất lạc khẩn cấp theo bán kính GPS | `DECIDED` | **P2** | Giai đoạn P2 | PO Final Decision 2.8 |
| `REQ-P2-03`  | Stories 24 giờ tự hủy | Đăng khoảnh khắc ngắn tự biến mất sau 24h | `DECIDED` | **P2** | Giai đoạn P2 | PO Final Decision 2.8 |
| `REQ-P2-04`  | Video Transcoding HLS | Chuyển mã video đa độ phân giải thích ứng (1080p, 720p, 480p) | `DECIDED` | **P2** | Giai đoạn P2 | PO Final Decision 2.8 |

---

## 2. MA TRẬN TRUY VẾT YÊU CẦU (TRACEABILITY MATRIX)

```
Nhu cầu Người dùng (User Brief)
       │
       ▼
Yêu cầu Chuẩn hóa (Requirement ID: REQ-...)
       │
       ▼
Quy tắc Nghiệp vụ (Business Rules: BR-...)
       │
       ▼
Tiêu chí Nghiệm thu (Acceptance Criteria: AC-...)
       │
       ▼
Kiểm thử QA Tự động (QA Test Cases - Giai đoạn kiểm thử sau này)
```

- Mọi Requirement trong nhóm **P0** đều có quy tắc nghiệp vụ tương ứng trong `docs/BUSINESS_RULES.md` và kịch bản kiểm thử trong `docs/ACCEPTANCE_CRITERIA.md`.
- Tuyệt đối không có tính năng nào mồ côi (Orphan feature) hay yêu cầu không rõ nguồn gốc.
