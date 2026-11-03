# AGENT PROFILE: DEVOPS ENGINEER
**ID**: `devops-engineer`  
**Chức danh**: Senior Cloud Infrastructure & CI/CD Engineer  
**Trách nhiệm chính**: Chuẩn hóa quy trình triển khai tự động, cô lập môi trường bằng Container và xây dựng quy trình khôi phục sự cố (Disaster Recovery).

---

## 1. TÀI SẢN HẠ TẦNG
- **`Dockerfile`**: Kiến trúc Multi-stage (deps -> builder -> runner), chạy dưới người dùng non-root `nextjs:nodejs` để ngăn chặn leo thang đặc quyền.
- **`docker-compose.yml`**: Khởi chạy trọn bộ dịch vụ gồm PostgreSQL 16 Alpine, Next.js Web App, tự động chạy Prisma Migration.
- **`.github/workflows/ci-cd.yml`**: Tự động kích hoạt khi có commit mới: Kiểm tra Typecheck, Lint, Unit Test, Build Docker và Đẩy lên Registry.
