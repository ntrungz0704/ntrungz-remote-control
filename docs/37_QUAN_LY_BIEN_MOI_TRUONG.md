# QUẢN LÝ BIẾN MÔI TRƯỜNG VÀ BẢO VỆ SECRETS ĐỐI TÁC

> **Dự án**: Nền Tảng Tích Hợp Giao Hàng Đa Đơn Vị (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-OPS-037` | **Phiên bản**: `1.0.0` | **Trạng thái**: `PRODUCTION_READY`  
> **Tác giả**: `devops-engineer` (Kỹ Sư Hạ Tầng & Vận Hành)  
> **Người thẩm định**: `code-reviewer` (Thanh Tra Mã Nguồn Cấp Cao)

---

## 1. NGUYÊN TẮC BẢO MẬT BIẾN MÔI TRƯỜNG (ZERO-LEAK POLICY)

1. **Tuyệt đối không commit file chứa secret vào Git**:
   - File `.env`, `.env.local`, `.env.production` đã được đưa vào `.gitignore` và `.dockerignore`.
   - File mẫu an toàn `.env.example` chỉ chứa khóa định danh và chuỗi mẫu vô hại (placeholder).
2. **Phân rã phạm vi truy cập (Scope Separation)**:
   - Các biến bảo mật (API Secret, Webhook HMAC Secret, Database Password, JWT Secret) không bao giờ có tiền tố `NEXT_PUBLIC_`, bảo đảm 100% không bị rò rỉ vào Client Bundle.
   - Chỉ có biến công khai như `NEXT_PUBLIC_APP_URL` mới được phơi bày ra trình duyệt.
3. **Cơ chế nạp Secret trên môi trường Cloud (AWS Secrets Manager / Infisical / Docker Secrets)**:
   - Khóa bí mật được inject trực tiếp vào tiến trình Node.js dưới dạng biến môi trường runtime trong lúc container khởi động.

---

## 2. BẢNG TRA CỨU DANH MỤC BIẾN MÔI TRƯỜNG

| Biến Môi Trường | Kiểu / Độ Dài | Mô Tả Nghiệp Vụ | Môi Trường Bắt Buộc |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `production` / `development` | Môi trường thực thi của Node.js | Tất cả |
| `DATABASE_URL` | PostgreSQL URI | Chuỗi kết nối CSDL PostgreSQL 16 có SSL mode | Production, Staging |
| `REDIS_URL` | Redis URI | Kết nối Redis quản lý khóa Idempotency | Production, Staging |
| `NEXTAUTH_SECRET` | Chuỗi 32+ chars | Khóa giải mã phiên đăng nhập JWT | Production |
| `VIETQR_BANK_ID` | `970422` (MB Bank) | Mã định danh ngân hàng Napas 24/7 | Production |
| `VIETQR_ACCOUNT_NO` | Số tài khoản | Số tài khoản công ty thụ hưởng | Production |
| `GRAB_CLIENT_SECRET` | Khóa bí mật API | Secret xác thực OAuth2 với GrabExpress | Production |
| `GRAB_WEBHOOK_SECRET`| Chuỗi bí mật HMAC | Khóa tạo chữ ký HMAC-SHA256 Webhook Grab | Production |
| `SHOPEEFOOD_PARTNER_KEY` | Khóa đối tác | Xác thực API ShopeeFood | Production |
| `SHOPEEFOOD_WEBHOOK_SECRET` | Khóa HMAC | Xác thực Webhook trạng thái đơn ShopeeFood | Production |
| `XANH_SM_API_KEY` | API Key GSM | Xác thực giao vận xe điện VinFast GSM | Production |
| `XANH_SM_WEBHOOK_SECRET` | Khóa HMAC | Xác thực Webhook trạng thái cuốc Xanh SM | Production |
| `AHAMOVE_API_KEY` | API Key Ahamove | Xác thực dịch vụ giao hàng Ahamove | Production |
| `AHAMOVE_WEBHOOK_SECRET` | Khóa HMAC | Xác thực Webhook điều phối tài xế Ahamove | Production |
| `BE_CLIENT_SECRET` | Khóa bí mật API | Xác thực dịch vụ BeDelivery (Be Group) | Production |
| `BE_WEBHOOK_SECRET` | Khóa HMAC | Xác thực Webhook định vị tài xế Be | Production |
| `MOCK_SANDBOX_ENABLED` | `true` / `false` | Bật/tắt cổng Mock Sandbox trong môi trường test | Test / Development |
