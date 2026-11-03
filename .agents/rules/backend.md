# BỘ QUY TẮC PHÁT TRIỂN BACKEND (BACKEND RULES)
1. Triển khai theo mẫu kiến trúc Adapter Pattern: Tách biệt rõ giao diện `ICarrierAdapter` và triển khai cụ thể của từng hãng.
2. Quoting song song bằng `Promise.allSettled()` với Timeout trần 1.8 giây, tránh làm nghẽn luồng người dùng nếu một hãng bị chậm.
3. Sử dụng Circuit Breaker: Tự động ngắt kết nối với hãng liên tục báo lỗi để bảo vệ hệ thống.
4. Trả về định dạng lỗi chuẩn hóa RFC 7807 (Problem Details).
