# BẢNG MA TRẬN MỐI QUAN HỆ & RÀNG BUỘC TOÀN VẸN (RELATIONSHIPS & REFERENTIAL INTEGRITY)

> **Tên sản phẩm**: Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng (`FAST-SHIP-HUB`)  
> **Mã tài liệu**: `DOC-DB-004` | **Phiên bản**: `1.0.0` | **Trạng thái**: `APPROVED_FOR_MIGRATION`  
> **Tác giả**: `database-engineer` (Kỹ sư Cơ sở Dữ liệu & Data Modeling)  
> **Người tiếp nhận**: `backend-engineer`, `security-reviewer`, `qa-engineer`

---

## 1. MA TRẬN KHÓA NGOẠI VÀ HÀNH VI TOÀN VẸN DỮ LIỆU (FOREIGN KEY MATRIX)

Dưới đây là bảng đặc tả chi tiết toàn bộ các mối quan hệ khóa ngoại (Foreign Keys) trong hệ thống `FAST-SHIP-HUB`, bao gồm phân tích bản số (Cardinality) và hành vi bắt buộc khi xảy ra thao tác `ON DELETE` và `ON UPDATE`:

| STT | Bảng Chứa Khóa Ngoại (Child Table) | Cột Khóa Ngoại (FK Column) | Bảng Tham Chiếu (Parent Table) | Cột Khóa Chính (PK Column) | Bản Số (Cardinality) | Hành Vi `ON DELETE` | Hành Vi `ON UPDATE` |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **1** | `wallets` | `user_id` | `users` | `id` | **1 : 0..1** | `RESTRICT` | `CASCADE` |
| **2** | `wallet_transactions` | `wallet_id` | `wallets` | `id` | **1 : N** | `RESTRICT` | `CASCADE` |
| **3** | `wallet_transactions` | `order_id` | `orders` | `id` | **0..1 : N** | `RESTRICT` | `CASCADE` |
| **4** | `carrier_service_tiers`| `carrier_id` | `carriers` | `id` | **1 : N** | `CASCADE` | `CASCADE` |
| **5** | `orders` | `user_id` | `users` | `id` | **1 : N** | `RESTRICT` | `CASCADE` |
| **6** | `orders` | `carrier_id` | `carriers` | `id` | **0..1 : N** | `RESTRICT` | `CASCADE` |
| **7** | `orders` | `service_tier_id` | `carrier_service_tiers`| `id` | **0..1 : N** | `RESTRICT` | `CASCADE` |
| **8** | `orders` | `selected_quote_id`| `carrier_quotes` | `id` | **0..1 : 1** | `SET NULL` | `CASCADE` |
| **9** | `packages` | `order_id` | `orders` | `id` | **1 : 1** | `CASCADE` | `CASCADE` |
| **10**| `carrier_quotes` | `order_id` | `orders` | `id` | **0..1 : N** | `CASCADE` | `CASCADE` |
| **11**| `carrier_quotes` | `carrier_id` | `carriers` | `id` | **1 : N** | `RESTRICT` | `CASCADE` |
| **12**| `carrier_quotes` | `service_tier_id` | `carrier_service_tiers`| `id` | **1 : N** | `RESTRICT` | `CASCADE` |
| **13**| `order_status_logs` | `order_id` | `orders` | `id` | **1 : N** | `CASCADE` | `CASCADE` |
| **14**| `webhook_logs` | `carrier_id` | `carriers` | `id` | **1 : N** | `RESTRICT` | `CASCADE` |
| **15**| `webhook_logs` | `order_id` | `orders` | `id` | **0..1 : N** | `SET NULL` | `CASCADE` |

---

## 2. NGUYÊN TẮC THIẾT KẾ & BẢO TOÀN DỮ LIỆU TÀI CHÍNH

### 2.1. Tại sao TUYỆT ĐỐI KHÔNG DÙNG `CASCADE` cho các thực thể Tài chính và Đơn hàng?
1. **Ví và Giao dịch (`wallets`, `wallet_transactions`)**:
   - `ON DELETE RESTRICT` được áp dụng cho mọi khóa ngoại trỏ vào `wallets`. Nếu một người dùng yêu cầu xóa tài khoản, hệ thống **tuyệt đối không được xóa ví** nếu trong ví còn số dư hoặc đã từng phát sinh giao dịch. Điều này đảm bảo tính toàn vẹn của sổ cái kế toán (Audit Ledger) theo tiêu chuẩn kiểm toán tài chính nhà nước. Thay vào đó, tài khoản người dùng chỉ được chuyển trạng thái `status = 'DELETED'` (Soft Delete).
2. **Đơn hàng (`orders`)**:
   - Khóa ngoại từ `users` sang `orders` là `RESTRICT`: Cấm xóa người dùng nếu người đó đã từng tạo đơn hàng trong lịch sử.
   - Khóa ngoại từ `orders` sang `wallet_transactions` là `RESTRICT`: Bất kỳ giao dịch nạp tiền, trừ cước hoặc hoàn tiền nào đã gắn với mã đơn thì đơn hàng đó không bao giờ được phép xóa cứng khỏi DB.
3. **Đối tác vận chuyển (`carriers`)**:
   - `ON DELETE RESTRICT` ngăn chặn sai lầm của Admin nếu vô tình xóa hãng Grab hoặc Xanh SM trong bảng quản trị khi hãng đó đang có hàng nghìn đơn hàng đang vận chuyển hoặc đã hoàn tất.

### 2.2. Khi nào `CASCADE` được phép sử dụng?
1. **Kiện hàng hóa (`packages`) trỏ tới `orders`**:
   - Kiện hàng là một thành phần sở hữu phụ thuộc (Composite Dependent Entity) của đơn hàng. Khi một đơn nháp (`DRAFT`) hoặc đơn rác bị xóa dọn dẹp, bản ghi gói hàng liên kết sẽ tự động bị xóa theo để giải phóng dung lượng đĩa.
2. **Nhật ký trạng thái (`order_status_logs`) trỏ tới `orders`**:
   - Log trạng thái gắn chặt với vòng đời của đơn. Nếu đơn bị xóa dọn dẹp khỏi bảng chính, toàn bộ log đi kèm sẽ được thu hồi tự động.
3. **Danh mục gói cước (`carrier_quotes`) trỏ tới `orders`**:
   - Các báo giá tạm thời có thời hạn 300 giây. Khi xóa đơn hàng, các báo giá đi kèm sẽ tự động bị dọn dẹp.
4. **Gói dịch vụ hãng (`carrier_service_tiers`) trỏ tới `carriers`**:
   - Khi xóa một hãng ở môi trường Sandbox/Dev, các gói cước xe máy/xe tải của hãng đó sẽ tự động xóa sạch.

### 2.3. Tại sao áp dụng `SET NULL`?
1. **`orders.selected_quote_id` ➔ `carrier_quotes.id` (`ON DELETE SET NULL`)**:
   - Tránh hiện tượng khóa vòng (Circular Dependency Deadlock). Sau khi đơn hàng hoàn tất nhiều tháng, bảng `carrier_quotes` có thể được phân vùng (partition) hoặc dọn dẹp các quote hết hạn cũ. Thiết lập `SET NULL` đảm bảo đơn hàng vẫn tồn tại nguyên vẹn ngay cả khi bản ghi quote tạm thời được dọn dẹp.
2. **`webhook_logs.order_id` ➔ `orders.id` (`ON DELETE SET NULL`)**:
   - Webhook log là dữ liệu truy vết thô (Raw Integration Audit). Kể cả khi đơn hàng liên quan không còn hoặc bị xóa, bản ghi webhook gốc từ đối tác vẫn được bảo tồn để phục vụ điều tra an ninh mạng.

---

## 3. KỊCH BẢN KIỂM THỬ RÀNG BUỘC TOÀN VẸN (REFERENTIAL INTEGRITY TEST SCENARIOS)

| Mã Test | Thao Tác Kích Hoạt | Kết Quả Kỳ Vọng Từ PostgreSQL Engine | Cơ Chế Bảo Vệ Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| **TC-RI-01** | `DELETE FROM users WHERE id = :user_with_wallet;` | ❌ Lỗi `23503: foreign_key_violation` (RESTRICT) | Không cho phép xóa người dùng khi đã sở hữu ví tài chính. |
| **TC-RI-02** | `DELETE FROM users WHERE id = :user_with_orders;` | ❌ Lỗi `23503: foreign_key_violation` (RESTRICT) | Không cho phép xóa người dùng khi đã từng tạo đơn hàng. |
| **TC-RI-03** | `DELETE FROM carriers WHERE code = 'GRAB';` | ❌ Lỗi `23503: foreign_key_violation` (RESTRICT) | Không cho phép xóa hãng vận chuyển khi đã có đơn hàng sử dụng hãng. |
| **TC-RI-04** | `DELETE FROM orders WHERE id = :draft_order_id;` | ✅ Thành công: Tự động xóa sạch bản ghi `packages`, `carrier_quotes`, `order_status_logs`. | Dọn dẹp sạch sẽ tài nguyên phụ thuộc của đơn hàng nháp. |
| **TC-RI-05** | `DELETE FROM carrier_quotes WHERE id = :selected_quote;`| ✅ Thành công: Cột `orders.selected_quote_id` tự động chuyển thành `NULL`. | Giữ vững đơn hàng khi xóa dữ liệu báo giá tạm thời hết hạn. |
| **TC-RI-06** | `UPDATE users SET id = :new_uuid WHERE id = :old_uuid;` | ✅ Thành công: Toàn bộ khóa ngoại trên `wallets`, `orders` tự động cập nhật ID mới. | Cơ chế `ON UPDATE CASCADE` đồng bộ tự động. |
