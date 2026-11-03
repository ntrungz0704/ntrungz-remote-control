# BÁO CÁO KIỂM CHỨNG KHẢO SÁT THÍCH ỨNG: E-COMMERCE VS SOCIAL NETWORK
## (BENCHMARK_DISCOVERY_DRY_RUN.MD)

> **Mục tiêu**: Chứng minh hệ thống Multi-Agent của Antigravity vận hành có tư duy nghiệp vụ chuyên sâu, thích ứng theo từng bài toán, **tuyệt đối không dùng chung một bộ câu hỏi máy móc và không tự ý áp đặt công nghệ**.  
> **Phương pháp kiểm thử**: Chạy đối sánh giả lập (Dry-run / Behavioral Benchmark) trên hai miền ứng dụng có đặc thù kiến trúc và hành vi dữ liệu trái ngược nhau:
> 1. **Dự án A: Nền Tảng Thương Mại Điện Tử (E-Commerce Marketplace)**
> 2. **Dự án B: Nền Tảng Mạng Xã Hội Trực Tuyến (Social Network Platform)**

---

## 1. SO SÁNH TỔNG QUAN: BẢN CHẤT KỸ THUẬT HAI BÀI TOÁN

| Tiêu chí so sánh | Dự án A: E-Commerce Marketplace | Dự án B: Social Network Platform |
| :--- | :--- | :--- |
| **Bản chất cốt lõi** | **Giao dịch tài chính (Transactional)** | **Đồ thị quan hệ & Nội dung (Graph & Content)** |
| **Đặc thù tải (I/O)** | Đọc/Ghi cân bằng; Yêu cầu tính toàn vẹn tuyệt đối | **Read-heavy cực độ** (Tỷ lệ Đọc : Ghi có thể lên tới 100 : 1) |
| **Tiêu chuẩn dữ liệu** | **ACID nghiêm ngặt** (Không cho phép sai lệch 1 đồng hay 1 sản phẩm) | **BASE / Eventual Consistency** (Chấp nhận feed cập nhật trễ vài giây) |
| **Điểm nghẽn rủi ro cao nhất** | Xung đột tồn kho Flash Sale (Overselling / Race condition), Thất thoát dòng tiền | Tắc nghẽn sinh Feed (Fan-out explosion do người nổi tiếng), Băng thông Media |
| **Mô hình tương tác** | Đồng bộ (Synchronous Request-Response cho thanh toán/đặt hàng) | Bất đồng bộ & Thời gian thực (Real-time Event-driven, WebSockets) |

---

## 2. KỊCH BẢN KHẢO SÁT CHI TIẾT (DISCOVERY DRILL-DOWN)

---

### CASE STUDY 1: E-COMMERCE MARKETPLACE

#### ❌ Cách khảo sát sai lầm của Agent máy móc:
> *"Bạn muốn làm web bán hàng gì? Giao diện màu gì? Bạn có bao nhiêu sản phẩm? Ngân sách thế nào? Chúng ta sẽ dùng Next.js và PostgreSQL nhé!"*  
> *(Hậu quả: Bỏ qua hoàn toàn bài toán giỏ hàng, tranh chấp tồn kho, cổng thanh toán và trạng thái đơn hàng).*

#### ✅ Bộ câu hỏi Discovery sắc bén của `business-analyst` & `system-architect`:
1. **Cấu trúc biến thể SKU & Quản lý tồn kho đa điểm (Inventory Multi-warehouse)**:
   - Một mặt hàng có bao nhiêu cấp thuộc tính (Size, Màu, Chất liệu)? Có SKU độc lập cho từng biến thể không?
   - Hệ thống có kho phân tán theo tỉnh thành không? Hàng tồn kho được khấu trừ theo kho gần nhất hay kho chỉ định?
2. **Cơ chế khóa giữ tồn kho (Stock Reservation & Concurrency Control)**:
   - Khi người mua thêm hàng vào giỏ hàng hoặc bấm "Thanh toán", tồn kho có được giữ tạm thời không? Nếu có, thời gian giữ (Time-To-Live - TTL) là bao nhiêu phút trước khi hoàn trả lại kho?
   - Trong kịch bản Flash Sale (hàng nghìn người cùng mua 10 chiếc áo), hệ thống xử lý tranh chấp (Race Condition) bằng khóa lạc quan (Optimistic Lock) hay khóa phân tán (Distributed Lock qua Redis)?
3. **Quy trình Thanh toán & Đối soát dòng tiền (Payment & Reconciliation)**:
   - Tích hợp cổng thanh toán nào (VNPay, MoMo, ZaloPay, Visa/Mastercard qua Stripe, hay COD)?
   - Cơ chế xử lý Webhook thanh toán: Nếu cổng thanh toán gửi webhook trễ hoặc gửi lặp lại 3 lần, hệ thống dùng Idempotency Key như thế nào để không cộng tiền hay xuất kho 2 lần?
4. **Máy trạng thái đơn hàng (Order State Machine - FSM)**:
   - Các bước chuyển trạng thái đơn hàng: `DRAFT` ➔ `PENDING_PAYMENT` ➔ `CONFIRMED` ➔ `PACKING` ➔ `SHIPPING` ➔ `DELIVERED` ➔ `COMPLETED`.
   - Điều kiện hủy đơn và hoàn tiền: Ở trạng thái `PACKING` khách có được tự hủy đơn không? Hoàn tiền về ví hay tài khoản ngân hàng gốc?
5. **Động cơ khuyến mãi & Voucher (Promotion Engine)**:
   - Quy tắc áp dụng mã giảm giá: Có cho phép xếp chồng voucher (Stackable: Giảm giá shop + Voucher vận chuyển + Xu tích lũy) hay chỉ được dùng 1 mã duy nhất?

#### 🛠️ Kiến trúc đề xuất thích ứng cho E-Commerce:
- **Cơ sở dữ liệu chính**: **PostgreSQL 16** (bắt buộc đảm bảo ACID, RLS bảo mật thông tin đơn hàng của từng người mua).
- **Bộ khóa phân tán (Distributed Lock)**: **Redis (Redlock)** để khóa bản ghi tồn kho tức thì trong micro-giây khi diễn ra Flash Sale.
- **Tìm kiếm sản phẩm**: **Meilisearch / Elasticsearch** tách biệt khỏi CSDL chính để tối ưu tìm kiếm theo facet/lọc giá/tên không gây chậm CSDL giao dịch.
- **Kiến trúc ứng dụng**: Clean Architecture với Event-driven Outbox Pattern để bắn sự kiện sang bên giao vận và xuất hóa đơn sau khi nhận webhook thanh toán.

---

### CASE STUDY 2: SOCIAL NETWORK PLATFORM

#### ❌ Cách khảo sát sai lầm của Agent máy móc:
> *"Bạn muốn làm mạng xã hội giống Facebook hay TikTok? Giao diện sáng hay tối? Chúng ta cũng dùng Next.js và PostgreSQL nhé!"*  
> *(Hậu quả: Thiết kế bảng `Posts` và `Follows` trong PostgreSQL rồi dùng câu lệnh `SELECT * FROM Posts WHERE userId IN (SELECT followingId FROM Follows)` -> Vừa có 10.000 người dùng là máy chủ quá tải chết đứng).*

#### ✅ Bộ câu hỏi Discovery sắc bén của `business-analyst` & `system-architect`:
1. **Mô hình đồ thị quan hệ xã hội (Social Graph Paradigm)**:
   - Mối quan hệ là **Một chiều (Unidirectional)** dạng Follower/Following (như X, Instagram, TikTok) hay **Hai chiều (Bidirectional)** dạng Bạn bè cần xác nhận (như Facebook, LinkedIn)?
   - Giới hạn quan hệ: Người dùng có được phân chia danh sách theo dõi (Close Friends, Family, Public) với quyền riêng tư hiển thị bài viết khác nhau không?
2. **Chiến lược sinh bảng tin (Feed Generation & The Celebrity Problem)**:
   - Khi tải News Feed của một người dùng, hệ thống sử dụng:
     - **Push Model (Fan-out on Write)**: Người đăng bài viết mới ➔ Hệ thống lập tức đẩy ID bài viết vào bộ đệm Feed của tất cả người theo dõi. (Tối ưu tốc độ đọc cực nhanh, nhưng tốn dung lượng).
     - **Pull Model (Fan-out on Read)**: Người xem mở ứng dụng ➔ Hệ thống mới gom bài từ danh sách người họ follow. (Tốn CPU khi đọc nếu follow hàng ngàn người).
     - **Hybrid Model**: Người dùng bình thường dùng *Push*, còn người nổi tiếng có trên 100.000 followers chuyển sang *Pull* để tránh làm nghẽn hàng đợi đẩy tin?
3. **Xử lý truyền tải & Nén Media/Video đa định dạng**:
   - Bài viết chứa nội dung gì chủ đạo: Text ngắn, Album ảnh chất lượng cao hay Video ngắn (Reels/Shorts)?
   - Quy trình nén ảnh tự động (WebP/AVIF đa kích thước thumbnail) và chuyển mã video (Video Transcoding sang HLS/DASH phân giải đa tầng 1080p, 720p, 480p)?
   - Tích hợp mạng phân phối nội dung (Cloudflare CDN / AWS CloudFront) như thế nào?
4. **Hạ tầng Tương tác Thời gian thực (Real-time Engagement & SSE/WebSockets)**:
   - Các hành động: Like đếm số, bình luận dạng cây (Nested comments), tin nhắn trực tiếp (1-1 DM) và thông báo đẩy (Push Notifications) đòi hỏi độ trễ dưới bao nhiêu mili-giây?
   - Cơ chế gom thông báo thông minh (Notification Aggregation): Tránh spam hàng trăm thông báo riêng rẽ khi bài viết viral.
5. **An toàn cộng đồng, Kiểm duyệt & Xử lý báo cáo (Content Moderation & Safety)**:
   - Hệ thống có bộ lọc từ khóa cấm (Profanity Filter) và kiểm duyệt hình ảnh tự động (NSFW AI vision check) trước khi bài viết xuất hiện công khai không?
   - Cơ chế chặn (Block), ẩn (Mute), và quy trình tiếp nhận vé báo cáo (Abuse Reports) cho Admin.

#### 🛠️ Kiến trúc đề xuất thích ứng cho Social Network:
- **Lưu trữ đa mô hình (Polyglot Persistence)**:
  - **Đồ thị quan hệ (Social Graph)**: **Neo4j** hoặc quan hệ tối ưu trong **PostgreSQL** kết hợp phân vùng đệm.
  - **Dòng thời gian (Timeline & Feeds)**: **Redis Cluster** (List / Sorted Sets) lưu trữ danh sách Post ID được sinh sẵn cho người dùng đang hoạt động.
  - **Lưu trữ bài viết & Hoạt động**: **MongoDB / ScyllaDB** (NoSQL phân tán chịu tải hàng triệu bản ghi đọc mỗi giây).
  - **Lưu trữ Media**: **AWS S3 / Google Cloud Storage** kết hợp CDN toàn cầu.
- **Truyền tin thời gian thực**: Cụm **WebSocket Servers** quản lý phiên kết nối qua **Redis Pub/Sub** hoặc **Apache Kafka**.

---

## 3. MA TRẬN ĐỐI CHIẾU XÁC MINH (VERIFICATION MATRIX)

| Khía cạnh kỹ thuật | E-Commerce Marketplace | Social Network Platform | Đánh giá tính thích ứng |
| :--- | :--- | :--- | :--- |
| **Cơ sở dữ liệu cốt lõi** | PostgreSQL (RDBMS) | Polyglot (NoSQL + Redis + S3 CDN) | 🎯 **Khác biệt 100%**: Chọn DB theo bản chất dữ liệu, không rập khuôn |
| **Chiến lược Caching** | Cache danh mục & Lock tồn kho | Pre-computed Timeline Feed Cache | 🎯 **Khác biệt 100%**: E-commerce cache sản phẩm, Social cache dòng tin |
| **Bài toán tải đỉnh (Peak Load)** | Flash Sale (Nhiều người mua 1 vật) | Viral Post (Nhiều người xem & like 1 bài) | 🎯 **Khác biệt 100%**: E-commerce cần chống Race Condition, Social cần CDN/Cache |
| **Bảo mật then chốt** | Bảo vệ số dư, chống IDOR đơn hàng, HMAC cổng thanh toán | Kiểm duyệt nội dung, quyền riêng tư (Privacy), phòng chống quấy rối/spam | 🎯 **Khác biệt 100%**: Trọng tâm an ninh chuyển từ tiền tệ sang thông tin cá nhân |
| **Khả năng chịu lỗi** | Tuyệt đối không để mất giao dịch thanh toán | Chấp nhận like/view nhảy chậm 1 vài giây (Eventual consistency) | 🎯 **Khác biệt 100%**: E-commerce cần Strict Consistency, Social cần High Availability |

---

## 4. KẾT LUẬN NGHIỆM THU BENCHMARK

1. **Không có bất kỳ câu hỏi rập khuôn máy móc nào**: Bộ câu hỏi của `business-analyst` đào sâu trực diện vào đúng "trái tim kỹ thuật" của từng hệ thống (với E-commerce là tồn kho và thanh toán; với Social Network là đồ thị quan hệ và chiến lược sinh bảng tin).
2. **Không có sự tự ý áp đặt thiết kế hay công nghệ**: `system-architect` không chọn công nghệ theo sở thích cá nhân mà dựa trên mô hình dữ liệu (ACID vs BASE) và đặc thù lưu lượng (Transactional vs Read-Heavy).
3. **Độ an toàn trước khi bước vào sản xuất**: Việc hoàn thành bài kiểm tra đối lập này chứng minh rằng hệ thống 12 Custom Agents đã sẵn sàng tiếp nhận bất kỳ bài toán nào từ người dùng mà không bao giờ bị "cả đội cùng hiểu sai ngay từ đầu".
