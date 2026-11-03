# KIẾN TRÚC QUYẾT ĐỊNH (ADR-001): LỰA CHỌN BỘ CÔNG NGHỆ CỐT LÕI (CORE TECH STACK)

- **Mã tài liệu**: `ADR-001`
- **Tiêu đề**: Lựa chọn Next.js 15 App Router, TypeScript, Tailwind CSS, PostgreSQL và Prisma ORM làm nền tảng cốt lõi cho FAST-SHIP-HUB
- **Trạng thái**: **ACCEPTED (ĐÃ PHÊ DUYỆT)**
- **Ngày quyết định**: 2026-11-03
- **Tác giả**: `system-architect` (Chuyên gia Kiến trúc Hệ thống)
- **Các bên liên quan**: `backend-engineer`, `frontend-engineer`, `database-engineer`, `devops-engineer`

---

## 1. BỐI CẢNH VÀ VẤN ĐỀ (CONTEXT & PROBLEM STATEMENT)

Dự án `FAST-SHIP-HUB` là nền tảng so sánh cước phí và điều phối giao hàng tức thì đa hãng chặng cuối (Last-Mile Delivery Aggregator). Các thách thức kỹ thuật then chốt đặt ra cho đội ngũ kỹ thuật gồm:
1. **Thời gian đưa sản phẩm ra thị trường (Time-to-Market)**: Cần ra mắt phiên bản MVP hoàn chỉnh trong vòng dưới 4 tuần với đội ngũ kỹ sư tinh gọn.
2. **Yêu cầu độ trễ cực thấp (Ultra-Low Latency)**: Người dùng nhập địa chỉ và cần nhìn thấy bảng so sánh cước đa hãng trong vòng dưới **1.5 giây**.
3. **An toàn dữ liệu tài chính (Financial Integrity)**: Hệ thống quản lý ví nạp tiền của chủ shop, giao dịch tạm giữ cước phí (`hold_balance`), tiền thu hộ COD. Tuyệt đối không được xảy ra tình trạng trừ tiền trùng lặp (Race condition) hoặc thất thoát số dư.
4. **Tối ưu chi phí hạ tầng ban đầu**: Tận dụng các tầng miễn phí (Free-tier) để vận hành với chi phí **$0/tháng** ở giai đoạn khởi đầu nhưng sẵn sàng mở rộng tuyến tính khi đạt 100.000 đơn/tháng.

Chúng tôi cần quyết định kiến trúc tổng thể (Monolith vs Microservices), Framework ứng dụng, Cơ sở dữ liệu và Công cụ ORM.

---

## 2. CÁC PHƯƠNG ÁN ĐÃ XEM XÉT (CONSIDERED OPTIONS)

### Phương án 1: Microservices (Tách biệt NestJS Backend + React Vite SPA Frontend)
- *Ưu điểm*: Phân tách độc lập hoàn toàn giữa Frontend và Backend, dễ mở rộng độc lập từng service.
- *Nhược điểm*: Chi phí vận hành hạ tầng ban đầu cao (cần duy trì nhiều container/pod), tốn kém thời gian cấu hình CI/CD, phân mảnh mã nguồn, phải duy trì 2 bộ Typescript schemas riêng biệt, thời gian phát triển kéo dài tối thiểu 8-10 tuần.

### Phương án 2: Ruby on Rails hoặc Laravel Monolith
- *Ưu điểm*: Phát triển rất nhanh, có sẵn hệ thống Auth, ORM và Job queue mạnh mẽ.
- *Nhược điểm*: Xây dựng giao diện Single-Page Application thời gian thực (Live Map, Live Pricing reactive) phức tạp, khó chia sẻ Typescript type cho client di động sau này.

### Phương án 3 (Được chọn): Monolithic First Hiện Đại — Next.js 15 (App Router) + TypeScript + PostgreSQL + Prisma ORM
- Sử dụng mô hình **Modular Monolith** viết hoàn toàn bằng TypeScript trên nền Next.js 15.
- Cơ sở dữ liệu PostgreSQL chuẩn quan hệ, quản lý qua Prisma ORM.

---

## 3. QUYẾT ĐỊNH KỸ THUẬT (DECISION OUTCOME)

Chúng tôi quyết định chọn **Phương án 3**:
1. **Framework**: **Next.js 15 (React 19, App Router)**.
   - Sử dụng Server Components cho các trang tĩnh (Landing page, Tra cứu đơn).
   - Sử dụng Route Handlers cho toàn bộ RESTful API (`/api/v1/...`).
   - Sử dụng Server Actions cho các thao tác form nội bộ.
2. **Ngôn ngữ**: **TypeScript 5.6+** với cấu hình `strict: true`. Đồng bộ kiểu dữ liệu từ Schema CSDL đến Giao diện Client.
3. **Giao diện & Styling**: **Tailwind CSS + shadcn/ui (Radix UI)**.
4. **Cơ sở dữ liệu**: **PostgreSQL 16** (Hosting qua Supabase / Neon hoặc Self-hosted).
5. **ORM & Migration**: **Prisma ORM v6**.
6. **Kiểm thử**: **Vitest** (Unit & Integration) và **Playwright** (End-to-End browser test).

---

## 4. HỆ QUẢ VÀ ĐÁNH GIÁ (CONSEQUENCES)

### 4.1. Tác động Tích cực (Positive Impacts)
- **Tốc độ phát triển vượt trội**: Tận dụng chung một ngôn ngữ TypeScript và một kho mã nguồn duy nhất (Single Repository). Chia sẻ trực tiếp các Interface DTO, Zod validation schemas giữa Client và Server.
- **Bảo mật tuyệt đối**: Thông tin nhạy cảm (API Keys của Grab, Xanh SM, ShopeeFood) chỉ tồn tại trên Server Environment, không bao giờ bị lộ lọt vào JavaScript bundle của trình duyệt.
- **Toàn vẹn dữ liệu (ACID)**: PostgreSQL cung cấp khả năng xử lý giao dịch với độ tin cậy tuyệt đối, hỗ trợ `SELECT FOR UPDATE` ngăn chặn tình trạng thấu chi ví nạp tiền.
- **Chi phí hạ tầng $0 ở giai đoạn MVP**: Triển khai trực tiếp lên Vercel Hobby kết hợp Supabase Free Tier và Upstash Redis Free.

### 4.2. Thách thức và Biện pháp Giảm thiểu (Mitigation Strategies)
- *Thách thức*: Next.js Serverless Route Handlers có giới hạn thời gian thực thi (Execution Timeout 10s - 15s trên gói Free).
  - *Biện pháp*: Toàn bộ các tác vụ gọi API hãng vận chuyển đều bị giới hạn bởi `AbortController(1800ms)` nên tổng thời gian xử lý luôn dưới 2 giây, không bao giờ chạm trần timeout của serverless.
- *Thách thức*: Prisma Client có thể gây tăng kích thước hàm serverless.
  - *Biện pháp*: Kích hoạt tính năng `output: "standalone"` trong `next.config.js` và sử dụng Prisma accelerate / pooled connection (`DIRECT_URL`).
