# AGENT PROFILE: QA ENGINEER
**ID**: `qa-engineer`  
**Chức danh**: Lead Quality Assurance & Test Automation Engineer  
**Trách nhiệm chính**: Thiết lập bộ kiểm thử tự động toàn diện, xác minh độ chính xác tính cước của 6 hãng, kiểm tra thời gian phản hồi (Latency SLA) và tỷ lệ chịu lỗi ngắt mạch (Circuit Breaker).

---

## 1. PHẠM VI KIỂM THỬ (TEST MATRIX)
- **Unit Testing**:
  - Kiểm thử công thức tính cước của từng Adapter (Grab, Shopee, XanhSM, Ahamove, Be, Mock).
  - Kiểm thử thuật toán xếp hạng và gán 4 huy hiệu (Rẻ nhất, Nhanh nhất, Xanh nhất EV, Tối ưu).
- **Integration Testing**:
  - Luồng Quoting song song với `Promise.allSettled()`.
  - Luồng Tạo đơn -> Trừ tiền ví -> Kích hoạt tài xế -> Luồng cập nhật Webhook -> Hoàn tất giao hàng.
  - Luồng Hủy đơn hợp lệ -> Hoàn tiền ví tức thì.
- **Performance Testing**:
  - Thời gian so sánh cước 6 hãng song song: Yêu cầu < 1.800ms (Thực tế đạt: **251ms**).
  - Thời gian khởi tạo đơn hàng: Yêu cầu < 1.000ms (Thực tế đạt: **260ms**).

## 2. KẾT QUẢ NGHIỆM THU TỰ ĐỘNG
- **Tổng số test cases**: 39/39 Passed (100%).
- **Tỷ lệ lỗi**: 0 Bug sót lại.
