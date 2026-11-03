# HẠ TẦNG VÀ ĐÓNG GÓI DOCKER CONTAINER

> **Dự án**: Nền Tảng Tích Hợp Giao Hàng Đa Đơn Vị (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-OPS-035` | **Phiên bản**: `1.0.0` | **Trạng thái**: `PRODUCTION_READY`  
> **Tác giả**: `devops-engineer` (Kỹ Sư Hạ Tầng & Vận Hành)  
> **Người thẩm định**: `code-reviewer` (Thanh Tra Mã Nguồn Cấp Cao)

---

## 1. TỔNG QUAN HẠ TẦNG CONTAINER HÓA

FAST-SHIP-HUB được đóng gói theo mô hình Docker Container chuẩn công nghiệp, tối ưu hóa cho môi trường MicroVM / Kubernetes / Docker Compose:
- **Base OS**: Alpine Linux (`node:20-alpine`) nhằm giảm thiểu diện tích tấn công (Attack Surface) và dung lượng ảnh (< 160MB).
- **Multi-Stage Build**: Tách biệt 3 tầng độc lập:
  1. `deps`: Tải và cài đặt phụ thuộc (`npm ci`) với layer cache.
  2. `builder`: Sinh Prisma Client (`prisma generate`), biên dịch Next.js 15 App Router ở chế độ `standalone`.
  3. `runner`: Chạy môi trường Production tối giản, chỉ sao chép file thực thi `.next/standalone`, `.next/static` và `public`.
- **Bảo mật Non-root**: Sử dụng người dùng hệ thống `nextjs:nodejs` (UID/GID 1001), ngăn chặn triệt để nguy cơ vượt quyền container (Container Breakout).

---

## 2. ĐẶC TẢ DOCKERFILE CHUẨN NEXT.JS 15 STANDALONE

```dockerfile
# STAGE 1: Base Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# STAGE 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# STAGE 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/robots.txt || exit 1

CMD ["node", "server.js"]
```

---

## 3. TRIỂN KHAI CỤM DỊCH VỤ DOCKER COMPOSE

File `docker-compose.yml` thiết lập cụm hạ tầng 3 tầng:

| Tên Dịch Vụ | Image / Build | Cổng Expose | Trách Nhiệm | Cơ Chế Healthcheck |
| :--- | :--- | :--- | :--- | :--- |
| `fast-ship-app` | Dockerfile (Standalone) | `3000:3000` | Web Frontend & API Gateway | HTTP 200 trên `/robots.txt` |
| `fast-ship-db` | `postgres:16-alpine` | `5432:5432` | CSDL Quan Hệ PostgreSQL 16 | `pg_isready -U fastship` |
| `fast-ship-redis`| `redis:7-alpine` | `6379:6379` | Quản lý khóa Idempotency & Cache | Ping pong phản hồi |

---

## 4. LỆNH VẬN HÀNH DOCKER THỰC TẾ

```bash
# 1. Khởi động toàn bộ cụm hạ tầng
docker compose up -d --build

# 2. Kiểm tra trạng thái sức khỏe các containers
docker compose ps

# 3. Xem log thời gian thực của ứng dụng Next.js
docker compose logs -f fast-ship-app

# 4. Chạy migration và seed dữ liệu vào CSDL container
docker compose exec fast-ship-app npx prisma migrate deploy
docker compose exec fast-ship-app npx tsx prisma/seed.ts

# 5. Dừng và giải phóng tài nguyên
docker compose down
```
