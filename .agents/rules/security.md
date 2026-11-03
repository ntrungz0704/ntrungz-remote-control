# BỘ QUY TẮC AN NINH HỆ THỐNG (SECURITY RULES)
1. Tuyệt đối không commit API Key, secret tokens vào Git. Sử dụng biến môi trường qua `.env`.
2. Mọi Webhook đến từ đối tác (Grab, Shopee, Xanh SM) bắt buộc phải kiểm tra chữ ký HMAC thời gian thực bằng `crypto.timingSafeEqual`.
3. Kiểm tra độ lệch thời gian (Timestamp skew) trong phạm vi 300 giây (5 phút) để phòng chống Replay Attack.
4. Mọi giao dịch trừ tiền ví phải đi kèm Idempotency-Key để chống thanh toán hai lần (Double Spend).
5. Mã hóa dữ liệu người dùng nhạy cảm (SĐT, địa chỉ chi tiết) ở tầng lưu trữ.
