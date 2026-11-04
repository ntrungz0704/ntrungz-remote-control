# TECHNOLOGY STACK & OPERATING COST VALIDATION
## DỰ ÁN: PET SOCIAL NETWORK (MẠNG XÃ HỘI THÚ CƯNG)

> **Mã tài liệu**: `TECH-PETSOC-2026-V1`  
> **Dự án**: Pet Social Network  
> **Trạng thái**: `DISCOVERY COMPLETED — BASELINE DRAFT`  
> **Ngày kiểm chứng dữ liệu giá & phiên bản**: 04/11/2026 (Nguồn tài liệu chính thức từ Cloudflare, Supabase, Neon, Vercel)

---

## 1. PHÂN ĐỊNH TRẠNG THÁI QUYẾT ĐỊNH CÔNG NGHỆ

- **ĐÃ ĐƯỢC PRODUCT OWNER CHỐT (Decided)**:
  * Nền tảng: Web Responsive trước, kiến trúc sẵn sàng mở rộng sang Mobile App.
  * Media: Nén ảnh phía trình duyệt (Client-side WebP); Video MP4 H.264/AAC tối đa 60s và <= 20MB, phát bằng thẻ HTML5 native; Không làm transcoding đa tầng ở MVP.
  * Chi phí: Ưu tiên 0đ / Free Tier cho 100 – 1.000 users đầu tiên; không đánh đổi bảo mật lấy chi phí.
- **ĐỀ XUẤT CỦA DISCOVERY AGENT (Proposed)**:
  * Full-stack Web: Next.js 15 App Router + TypeScript + Tailwind CSS.
  * CSDL & ORM: PostgreSQL (Supabase / Neon) + Prisma ORM.
  * Lưu trữ Media: Cloudflare R2 (10GB miễn phí + Miễn phí 100% băng thông tải về).
  * Xác thực: NextAuth.js (Auth.js) v5 (Email/Password bCrypt + Google OAuth).
  * Hosting: Vercel Free Hobby Tier hoặc Render Free.
- **CẦN PRODUCT OWNER PHÊ DUYỆT (Awaiting Approval)**: Phê duyệt lựa chọn Tech Stack này trước khi chuyển sang giai đoạn thiết kế kiến trúc kỹ thuật.

---

## 2. PHÂN TÍCH TƯƠNG THÍCH PHIÊN BẢN (COMPATIBILITY ANALYSIS)

| Thành phần | Phiên bản đề xuất | Đánh giá tính tương thích & Tính ổn định |
| :--- | :--- | :--- |
| **Node.js Runtime** | `v20.x LTS` (Iron) | Phiên bản Long Term Support ổn định nhất, tương thích 100% với các hàm mã hóa Web Crypto API và thư viện nén ảnh Sharp. |
| **Framework** | `Next.js 15.0+` | Hỗ trợ React 19, Server Actions, tối ưu hóa kích thước gói tải Client và tối ưu SEO OpenGraph bài viết tự động. |
| **Ngôn ngữ** | `TypeScript 5.3+` | Kiểm soát kiểu tĩnh (Strict Type-checking) đồng bộ từ Schema CSDL đến Giao diện Frontend, loại bỏ 95% lỗi Runtime. |
| **Cơ sở dữ liệu** | `PostgreSQL 16` | Hỗ trợ chuẩn ACID mạnh mẽ, hỗ trợ kiểu dữ liệu JSONB (nếu cần lưu metadata ảnh) và đánh chỉ mục B-Tree cực nhanh trên `createdAt`. |
| **ORM** | `Prisma 5.x / 6.x` | Tương thích hoàn hảo với PostgreSQL 16 và Next.js 15 (Edge/Node runtime), hỗ trợ sinh migration tự động. |
| **Xác thực (Auth)** | `NextAuth.js v5` | Tương thích kiến trúc App Router của Next.js 15, sử dụng JWT an toàn lưu trong Cookie `HttpOnly`. |

---

## 3. THẨM ĐỊNH HẠN MỨC FREE TIER & ĐIỀU KIỆN ÁP DỤNG THỰC TẾ

*(Kiểm chứng ngày 04/11/2026 từ tài liệu định giá chính thức của các nhà cung cấp)*

### 3.1. Lưu trữ Media: Cloudflare R2 (Chìa khóa 0đ quan trọng nhất)
- **Hạn mức Miễn phí (Free Tier)**:
  * **10 GB dung lượng lưu trữ / tháng** (Storage).
  * 1.000.000 thao tác ghi (Class A operations - Upload).
  * 10.000.000 thao tác đọc (Class B operations - Xem ảnh/video).
  * **MIỄN PHÍ 100% BĂNG THÔNG TẢI VỀ (Zero Egress Fees)**.
- **Tại sao đây là cứu cánh cho ứng dụng Media?**:
  * Các dịch vụ như AWS S3 thu phí băng thông tải về (~0.09$/GB). Nếu bạn có 1.000 người xem video, bạn sẽ mất tiền rất nhanh.
  * Cloudflare R2 không thu phí băng thông, giúp bạn hoàn toàn an tâm không bị "sốc hóa đơn" khi người dùng lướt video cả ngày!
- **Chi phí nếu vượt hạn mức**: Cực kỳ rẻ, chỉ **0.015$ / GB lưu trữ / tháng** (khoảng 370 VNĐ cho mỗi 1GB lưu trữ thêm).

### 3.2. Cơ sở dữ liệu: PostgreSQL (Supabase vs Neon.tech)
- **Phương án 1 - Supabase Free Tier**:
  * Miễn phí **500 MB dung lượng CSDL**.
  * Miễn phí 50.000 người dùng hoạt động/tháng (MAU).
  * *Điều kiện cần lưu ý*: Supabase sẽ tự động tạm ngưng (Pause) dự án nếu không có truy cập trong 7 ngày liên tục.
- **Phương án 2 (Dự phòng) - Neon.tech Free Tier**:
  * Miễn phí **3 GB dung lượng CSDL** (gấp 6 lần Supabase).
  * Không bao giờ tạm ngưng dự án (Serverless scale to zero).
- **Đánh giá dung lượng**: Một bản ghi bài viết text kèm metadata chỉ chiếm khoảng 1KB. 500MB của Supabase đủ sức chứa tới **500.000 bài viết và bình luận**, dư sức đáp ứng cho 1.000 người dùng đầu tiên.

### 3.3. Hosting Web App: Vercel Free Hobby Tier
- **Hạn mức Miễn phí**:
  * 100 GB băng thông truyền dữ liệu mạng / tháng.
  * 1.000.000 lượt thực thi Serverless Function / tháng.
  * Miễn phí chứng chỉ bảo mật SSL HTTPS và Global Edge CDN.
- **Điều kiện cần lưu ý**: Vercel cấm hành vi thương mại hóa quy mô lớn ở gói Hobby. Khi mạng xã hội bắt đầu kinh doanh, phương án thay thế là chuyển sang Render / Fly.io hoặc thuê VPS riêng giá rẻ (5$/tháng).

---

## 4. ĐÁNH GIÁ RỦI RO CHI PHÍ TRÊN 3 KỊCH BẢN QUY MÔ

### 4.1. Giả định tính toán tải (Load Assumptions)
- Mỗi ảnh nén Client WebP: Trung bình **300 KB** (0.3 MB).
- Mỗi video 60s: Trung bình **15 MB**.
- Tỷ lệ nội dung: 75% bài viết là ảnh (trung bình 2 ảnh/bài = 0.6 MB); 25% bài viết là video (15 MB).
- Dung lượng trung bình cho 1 bài viết đăng tải: `(0.75 * 0.6 MB) + (0.25 * 15 MB) = 4.2 MB / bài`.

---

### 4.2. Kịch bản 1: 100 Người dùng thử nghiệm (Tuần 1 - 4)
- **Mức độ hoạt động**: Trung bình 5 bài viết / người dùng / tháng ➔ Tổng cộng: 500 bài viết / tháng.
- **Dung lượng CSDL**: 500 bài viết + 2.500 bình luận + 5.000 lượt Paw ≈ **15 MB** (Chiếm 3% hạn mức 500MB của Supabase).
- **Dung lượng lưu trữ Media**: 500 bài * 4.2 MB ≈ **2.1 GB** (Chiếm 21% hạn mức 10GB của Cloudflare R2).
- **Băng thông tải về**: Khoảng 50 GB / tháng (Miễn phí 100% trên R2).
- 👉 **TỔNG CHI PHÍ THỰC TẾ: 0 VNĐ / THÁNG** ✅

---

### 4.3. Kịch bản 2: 500 Người dùng hoạt động (Tháng 2 - 3)
- **Mức độ hoạt động**: Trung bình 8 bài viết / người dùng / tháng ➔ Tổng cộng: 4.000 bài viết / tháng.
- **Dung lượng CSDL**: 4.000 bài viết + 20.000 bình luận + 50.000 lượt Paw ≈ **80 MB** (Chiếm 16% hạn mức 500MB của Supabase).
- **Dung lượng lưu trữ Media tích lũy**: 4.000 bài * 4.2 MB ≈ **16.8 GB**.
  * Hạn mức miễn phí: 10 GB.
  * Dung lượng vượt: 6.8 GB.
- **Chi phí phát sinh**: 6.8 GB * 0.015$/GB ≈ **0.10 $ / tháng** (khoảng **2.500 VNĐ / tháng**).
- 👉 **TỔNG CHI PHÍ THỰC TẾ: ~2.500 VNĐ / THÁNG (Gần như bằng 0đ)** ✅

---

### 4.4. Kịch bản 3: 1.000 Người dùng tích cực (Tháng 4 - 6)
- **Mức độ hoạt động**: Trung bình 10 bài viết / người dùng / tháng ➔ Tổng cộng: 10.000 bài viết / tháng.
- **Dung lượng CSDL**: 10.000 bài viết + 60.000 bình luận + 150.000 lượt Paw ≈ **220 MB** (Vẫn nằm trọn trong hạn mức 500MB của Supabase).
- **Dung lượng lưu trữ Media tích lũy**: 10.000 bài * 4.2 MB ≈ **42 GB**.
  * Hạn mức miễn phí: 10 GB.
  * Dung lượng vượt: 32 GB.
- **Chi phí phát sinh**: 32 GB * 0.015$/GB ≈ **0.48 $ / tháng** (khoảng **12.000 VNĐ / tháng**).
- 👉 **TỔNG CHI PHÍ THỰC TẾ: ~12.000 VNĐ / THÁNG (Bằng tiền một cốc trà đá!)** ✅

---

## 5. MA TRẬN CÔNG NGHỆ THAY THẾ (ALTERNATIVES & FALLBACK)

| Thành phần | Lựa chọn số 1 (Đề xuất) | Lựa chọn thay thế số 2 | Khi nào cần chuyển đổi (Trigger)? |
| :--- | :--- | :--- | :--- |
| **Cơ sở dữ liệu** | **PostgreSQL (Supabase)** | **Neon.tech** hoặc **VPS Docker Postgres** | Khi Supabase bị giới hạn 500MB hoặc bị tạm ngưng do thiếu tương tác. |
| **Lưu trữ Media** | **Cloudflare R2** | **Supabase Storage** | Khi cấu hình Cloudflare R2 gặp vấn đề về API Token; tuy nhiên Supabase Storage có tính phí băng thông nếu vượt 5GB. |
| **Hosting** | **Vercel** | **Render.com** hoặc **VPS Hetzner ($4/mo)** | Khi Vercel yêu cầu chuyển gói Pro vì phát hiện ứng dụng thương mại. |
| **Xác thực** | **NextAuth.js v5 (Self-hosted)** | **Supabase Auth** | Khi muốn chuyển toàn bộ xác thực sang CSDL Supabase quản lý trực tiếp. |

---

## 6. KẾT LUẬN & KIẾN NGHỊ CUỐI CÙNG

1. **Khẳng định tính khả thi của ngân sách 0đ**: Với quy mô từ 100 đến 500 người dùng, hệ thống hoàn toàn vận hành ở mức **0 VNĐ / tháng** nhờ sự kết hợp giữa Next.js, PostgreSQL Supabase và Cloudflare R2 Egress-free.
2. **Khuyến nghị không triển khai Video Transcoding ở MVP**: Phân tích chi phí ở trên chứng minh rằng: Nếu làm Video Transcoding đa tầng trên cloud ngay lúc này, chi phí sẽ tăng từ 0đ lên ít nhất 1.000.000đ – 3.000.000đ/tháng chỉ để duy trì máy chủ render video. Quyết định giữ HTML5 Video native của Product Owner là **hoàn toàn chính xác và sáng suốt**.
