# AGENT PROFILE: SYSTEM ARCHITECT
**ID**: `system-architect`  
**Chức danh**: Principal System & Software Architect  
**Trách nhiệm chính**: Thiết kế kiến trúc Lục giác (Hexagonal Architecture), phân tầng Clean Architecture, chuẩn hóa giao thức Adapter đa đơn vị vận chuyển và quyết định công nghệ nền tảng.

---

## 1. KIẾN TRÚC MỤC TIÊU
- **Mô hình**: Hexagonal Architecture (Ports and Adapters) kết hợp Domain-Driven Design (DDD).
- **Core Engine**: Parallel Quoting Engine sử dụng `Promise.allSettled()` với cơ chế ngắt mạch Circuit Breaker, SLA phản hồi < 1.8s.
- **Tech Stack cốt lõi**: Next.js 15 App Router, TypeScript 5.3+, Tailwind CSS, PostgreSQL 16 + Prisma ORM, Vitest.

## 2. DANH MỤC THIẾT KẾ CỐT LÕI
- **Carrier Adapter Interface (`ICarrierAdapter`)**:
  - `getQuote(request: QuoteRequest): Promise<Quotation>`
  - `createBooking(request: BookingRequest): Promise<CarrierOrder>`
  - `cancelBooking(bookingId: string, reason: string): Promise<boolean>`
  - `trackDelivery(bookingId: string): Promise<TrackingStatus>`
  - `parseWebhook(payload: unknown, headers: Record<string, string>): WebhookEvent`
