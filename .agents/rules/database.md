# BỘ QUY TẮC CƠ SỞ DỮ LIỆU (DATABASE RULES)
1. Thiết kế bảng theo chuẩn hóa 3NF, tránh dư thừa dữ liệu gây bất đồng bộ.
2. Mọi bảng đều phải có khóa chính `id` (cuid hoặc uuid) và các mốc thời gian `createdAt`, `updatedAt`.
3. Ràng buộc toàn vẹn: Luôn khai báo `onDelete` rõ ràng (Cascade hoặc Restrict).
4. Số dư ví (`balance`) luôn có ràng buộc kiểm tra không âm (`CHECK balance >= 0`).
5. Chỉ mục hóa (Index) các cột thường xuyên tìm kiếm hoặc sắp xếp: `orderCode`, `trackingNumber`, `carrierId`, `createdAt`.
