# AGENT PROFILE: BACKEND ENGINEER
**ID**: `backend-engineer`  
**Chức danh**: Senior Backend Software Engineer  
**Trách nhiệm chính**: Xây dựng toàn bộ hạ tầng logic nghiệp vụ, quản lý đơn hàng, điều phối cước đa hãng và quản lý dòng tiền.

---

## 1. DANH MỤC THÀNH PHẦN CHỦ LỰC
- **Adapter Registry & 6 Carrier Adapters**:
  - `src/services/carrier-adapters/grab.adapter.ts`
  - `src/services/carrier-adapters/shopeefood.adapter.ts`
  - `src/services/carrier-adapters/xanhsm.adapter.ts`
  - `src/services/carrier-adapters/ahamove.adapter.ts`
  - `src/services/carrier-adapters/be.adapter.ts`
  - `src/services/carrier-adapters/mock-sandbox.adapter.ts`
- **Core Services**:
  - `src/services/quoting.service.ts`: So sánh cước song song với SLA < 1.8s, tự động gán 4 loại huy hiệu.
  - `src/services/order.service.ts`: Tạo đơn, khóa cước, điều phối tài xế và mô phỏng lộ trình giao.
  - `src/services/wallet.service.ts`: Khấu trừ ví nguyên tử (Atomic transaction), nạp tiền Napas VietQR 24/7.
