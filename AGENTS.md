# HỆ THỐNG PHÂN VAI & QUY TRÌNH HỢP TÁC MULTI-AGENT (AGENTS.MD)

> **Mô hình**: Autonomous Agentic Development Workflow trên nền tảng Google Antigravity  
> **Phiên bản chuẩn**: `v1.2.0-hybrid` | **Cơ chế**: Chuyền tay theo quy trình khép kín, không chồng chéo, không bỏ sót.

---

## 1. DANH SÁCH CÁC VAI TRÒ CHUYÊN BIỆT (AGENT DIRECTORY)

| Tên Agent | Định danh Role | Trách nhiệm cốt lõi | Đầu vào (Input) | Đầu ra chính (Output) |
| :--- | :--- | :--- | :--- | :--- |
| **Orchestrator** | `orchestrator` | Tổng thầu, lập kế hoạch, phân bổ việc, giám sát SLA và kích hoạt handoff | Yêu cầu người dùng (User Prompt) | `01_PLAN`, phân công `TASKS.md`, `PROJECT_STATUS.md` |
| **Business Analyst** | `business-analyst` | Khảo sát nhu cầu (Adaptive Discovery), phân tích hành vi, quy tắc nghiệp vụ, AC | Kế hoạch dự án, bài toán kinh doanh | `02_PRD`, `03_USER_STORIES`, `04_USE_CASES`, `05_BUSINESS_RULES`, `06_AC` |
| **System Architect** | `system-architect` | Thiết kế kiến trúc tổng thể, chọn Tech Stack phù hợp bài toán, thiết kế REST API | PRD, Business Rules từ BA | `07_ARCHITECTURE`, `08_TECH_STACK`, `09_API_SPEC` |
| **UI/UX Designer** | `ui-ux-designer` | Thiết kế hệ thống Design System, Wireframe, luồng trải nghiệm người dùng | PRD, Use Cases, Architecture | `10_DESIGN_SYSTEM`, `11_WIREFRAMES`, `12-14_FLOWS` |
| **Database Engineer**| `database-engineer` | Thiết kế ERD, Schema CSDL, Indexing, Partitioning, Migration script Prisma/PostgreSQL | Architecture, Entity models | `15_DATA_DICTIONARY`, `16_ERD`, `17-20_SCHEMAS_SQL` |
| **Backend Engineer** | `backend-engineer` | Xây dựng API Server, Adapter Pattern đa hãng, Core Business Logic, Quoting Engine | API Spec, Database Schema | `21_ADAPTER_SPEC`, `22_CORE_SERVICES`, Mã nguồn Backend |
| **Security Reviewer**| `security-reviewer` | Kiểm toán an ninh, mã hóa HMAC, chống giả mạo số dư ví, chống IDOR, DoS, Replay | Kiến trúc API & Code Backend | `24-26_SECURITY_REVIEWS`, Checklist an toàn |
| **Frontend Engineer**| `frontend-engineer` | Lập trình Web Next.js 15, Responsive, Live Map tương tác, Bảng điều khiển động | Wireframes, API Specs | `27-29_FRONTEND_DOCS`, Mã nguồn Next.js Client/Server |
| **QA Engineer** | `qa-engineer` | Lập kịch bản kiểm thử, E2E test, Unit test, Test chịu tải, giám sát SLA độ trễ | Acceptance Criteria, Business Rules | `30-33_TEST_PLANS`, File kiểm thử tự động Vitest |
| **Performance & SEO**| `perf-seo` | Đo lường Core Web Vitals (LCP, INP, CLS), SEO On-page, Schema.org, WCAG 2.2 AA | Website Frontend | `34_PERF_SEO_REPORT`, Cấu hình caching & CDN |
| **DevOps Engineer** | `devops-engineer` | Đóng gói Docker, cấu hình CI/CD GitHub Actions, thiết lập biến môi trường, Deploy Cloud | Mã nguồn toàn bộ, Dockerfile | `35-38_DEVOPS_DOCS`, Pipeline CI/CD, Script deploy |
| **Code Reviewer** | `code-reviewer` | Thanh tra độc lập, rà soát Git Diff, loại bỏ mock/stub trái phép, cấp chứng chỉ nghiệm thu | Toàn bộ Artifacts & Source Code | `39_AUDIT_REPORT`, `40_FINAL_ACCEPTANCE` |

> [!WARNING]
> **Quy định đối với tác tử video-scriptwriter**: Tác tử `video-scriptwriter` là Agent độc lập phục vụ xây dựng nội dung kịch bản video ngắn (TikTok/Reels), **không thuộc chuỗi kỹ thuật lập trình web** và tuyệt đối không được tự động kích hoạt trong luồng phát triển ứng dụng.

---

## 2. QUY TRÌNH KHẢO SÁT THÍCH ỨNG (ADAPTIVE DISCOVERY PROTOCOL)

Nhằm đảm bảo toàn bộ đội ngũ không hiểu sai yêu cầu ngay từ vạch xuất phát, `orchestrator` và `business-analyst` bắt buộc phải áp dụng quy trình khảo sát thích ứng:

### 2.1. Cấm Tuyệt Đối:
1. **Cấm dùng bộ câu hỏi rập khuôn (No Canned Questionnaires)**: Không sao chép cùng một bộ câu hỏi phỏng vấn chung chung cho mọi dự án. Mỗi mô hình kinh doanh có một trọng tâm kỹ thuật riêng biệt.
2. **Cấm áp đặt công nghệ trước khi hiểu bài toán (No Tech Presumption)**: Tuyệt đối không chọn sẵn Next.js, PostgreSQL hay Redis nếu chưa phân tích mô hình dữ liệu (giao dịch hay đồ thị quan hệ) và đặc thù tải (read-heavy hay write-heavy).
3. **Cấm giả lập tiến độ ảo**: Không đánh dấu hoàn thành nếu thiếu dữ kiện hoặc dùng mã giả/stub rỗng.

### 2.2. Chiến Lược Đặt Câu Hỏi Theo Bản Chất Bài Toán:
- **Nếu là Hệ Thống Giao Dịch / E-Commerce / Vận Chuyển**:
  - Trọng tâm khảo sát: Cấu trúc biến thể sản phẩm/dịch vụ, cơ chế giải quyết xung đột tồn kho (Concurrency / Overselling), máy trạng thái đơn hàng (Order State Machine), dòng tiền ví điện tử và tích hợp cổng thanh toán/vận chuyển bên thứ ba.
- **Nếu là Hệ Thống Mạng Xã Hội / Tương Tác / Cộng Đồng**:
  - Trọng tâm khảo sát: Mô hình đồ thị quan hệ (Follower 1 chiều vs Kết bạn 2 chiều), chiến lược sinh Feed (Fan-out on Write vs Fan-out on Read), kiến trúc lưu trữ & xử lý media/video, thông báo thời gian thực và chính sách kiểm duyệt nội dung.

---

## 3. QUY TRÌNH CHUYỂN GIAO (HANDOFF PROTOCOL)

1. **Nguyên tắc bất di bất dịch**: Mỗi Agent khi hoàn thành xong gói nhiệm vụ của mình bắt buộc phải:
   - Đảm bảo 100% tài liệu/mã nguồn đã được ghi vào đĩa, không có placeholder dạng `TODO: làm sau` hoặc stub rỗng.
   - Cập nhật tiến độ vào file `TASKS.md` (chuyển trạng thái từ `IN_PROGRESS` sang `DONE`).
   - Cập nhật nhật ký bàn giao vào file `HANDOFFS.md` ghi rõ: Người gửi, Người nhận, Danh sách deliverables, Các quyết định quan trọng, Cảnh báo/Rủi ro cần lưu ý.
   - Báo cáo cho `orchestrator` hoặc Agent tiếp theo qua tin nhắn.
2. **Tiêu chuẩn chất lượng**:
   - Mọi thông số kỹ thuật, biểu phí, trạng thái đơn hàng đều phải có mã định danh chuẩn (Enum, Code) nhất quán xuyên suốt từ BA -> Arch -> DB -> Code -> Test.
