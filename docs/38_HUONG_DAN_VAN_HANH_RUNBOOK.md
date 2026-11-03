# SỔ TAY VẬN HÀNH & ỨNG PHÓ SỰ CỐ HỆ THỐNG (OPERATIONAL RUNBOOK)

> **Dự án**: Nền Tảng Tích Hợp Giao Hàng Đa Đơn Vị (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-OPS-038` | **Phiên bản**: `1.0.0` | **Trạng thái**: `PRODUCTION_READY`  
> **Tác giả**: `devops-engineer` (Kỹ Sư Hạ Tầng & Vận Hành)  
> **Người thẩm định**: `code-reviewer` (Thanh Tra Mã Nguồn Cấp Cao)

---

## 1. QUY TRÌNH GIÁM SÁT VẬN HÀNH 24/7 (MONITORING & ALERTING)

### 1.1. Các Chỉ Số Cốt Lõi Cần Theo Dõi (Golden Signals)
- **Quoting SLA (Latency)**: Thời gian phản hồi tổng hợp báo giá P95 phải < 1.500ms. Cảnh báo vàng (Warning) nếu > 1.200ms; cảnh báo đỏ (Critical) nếu > 1.800ms.
- **Circuit Breaker Status**: Giám sát trạng thái ngắt mạch của 6 Adapter. Nếu một hãng chuyển sang `OPEN`, phát thông báo ngay cho đội hỗ trợ kỹ thuật đối tác.
- **Tỷ lệ thất bại Webhook**: Nếu tỷ lệ chữ ký HMAC không hợp lệ hoặc lỗi 500 khi nhận webhook đối tác > 2% trong 5 phút, lập tức kiểm tra lại khóa đối tác.
- **Số dư tài khoản ví tổng sàn**: Giám sát dòng tiền ký quỹ đảm bảo tính thanh khoản tức thì cho đối tác vận chuyển.

---

## 2. QUY TRÌNH ỨNG PHÓ SỰ CỐ KHẨN CẤP (INCIDENT RESPONSE PLAYBOOKS)

### Sự Cố 1: Một Hãng Vận Chuyển Bị Sập API Hoặc Tắc Nghẽn Mạng
- **Triệu chứng**: Circuit Breaker của hãng đó (ví dụ: `GRAB` hoặc `SHOPEE_FOOD`) chuyển từ `CLOSED` sang `OPEN` sau 3 lần timeout liên tiếp.
- **Hành động tự động của hệ thống**:
  - Tự động ngắt cứng gọi API đối tác sau 0ms để không ảnh hưởng đến độ trễ chung của các hãng khác.
  - Vẫn hiển thị báo giá của các hãng còn lại (Xanh SM, Ahamove, Be, Sandbox).
  - Tự động thăm dò sau thời gian làm nguội (`cooldownPeriod = 400ms - 10s`) để đưa về `HALF_OPEN`.
- **Hành động thủ công của On-call Engineer**:
  - Kiểm tra kênh Status Page của đối tác (ví dụ: Grab Developer Portal).
  - Nếu sự cố kéo dài trên 30 phút, bật cờ bảo trì hiển thị thông báo trên UI: `"Hãng Grab đang tạm bảo trì hệ thống"`.

### Sự Cố 2: Phát Hiện Tấn Công Click Đúp Hoặc Giả Mạo Giao Dịch Ví
- **Triệu chứng**: Ghi nhận nhiều request `POST /api/v1/orders` từ cùng một IP/User trong vòng 100ms.
- **Hành động tự động của hệ thống**:
  - `idempotencyStore` khóa phiên xử lý đầu tiên bằng trạng thái `IN_PROGRESS`.
  - Các request đồng thời kế tiếp bị chặn đứng với mã lỗi HTTP `409 Conflict` (`DOUBLE_CLICK_DETECTED`).
  - Giao dịch ví đảm bảo nguyên tắc ACID và kiểm tra `availableBalance >= holdFee`, ngăn chặn tuyệt đối tình trạng thấu chi hoặc Double-Spending.

### Sự Cố 3: CSDL PostgreSQL Quá Tải Kết Nối (Connection Pool Exhaustion)
- **Triệu chứng**: Log báo lỗi `PrismaClientInitializationError: Can't reach database server`.
- **Cách khắc phục**:
  1. Kiểm tra số lượng kết nối đang mở:
     ```sql
     SELECT count(*), state FROM pg_stat_activity GROUP BY state;
     ```
  2. Bật kết nối qua PgBouncer hoặc Prisma Accelerate connection pooler.
  3. Khởi động lại container CSDL nếu cần:
     ```bash
     docker compose restart fast-ship-db
     ```

---

## 3. QUY TRÌNH SAO LƯU VÀ KHÔI PHỤC DỮ LIỆU (BACKUP & DISASTER RECOVERY)

```bash
# 1. Tạo bản sao lưu định kỳ CSDL PostgreSQL (chạy tự động qua cron 02:00 sáng)
docker compose exec fast-ship-db pg_dump -U fastship -d fast_ship_hub -F c -b -v -f /var/lib/postgresql/data/backup_$(date +%Y%m%d).dump

# 2. Khôi phục dữ liệu từ bản sao lưu
docker compose exec fast-ship-db pg_restore -U fastship -d fast_ship_hub -v /var/lib/postgresql/data/backup_20261104.dump
```
