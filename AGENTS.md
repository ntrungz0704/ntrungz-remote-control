# HỆ THỐNG PHÂN VAI & QUY TRÌNH HỢP TÁC MULTI-AGENT (AGENTS.MD)

> **Dự án**: Nền Tảng Tích Hợp Giao Hàng Đa Đơn Vị (`FAST-SHIP-HUB`)  
> **Cơ chế vận hành**: Autonomous Agentic Workflow — Chuyền tay theo quy trình khép kín, không chồng chéo, không bỏ sót.

---

## 1. DANH SÁCH CÁC VAI TRÒ CHUYÊN BIỆT (AGENT DIRECTORY)

| Tên Agent | Định danh Role | Trách nhiệm cốt lõi | Đầu vào (Input) | Đầu ra chính (Output) |
| :--- | :--- | :--- | :--- | :--- |
| **Orchestrator** | `orchestrator` | Tổng thầu, lập kế hoạch, phân bổ việc, giám sát SLA và kích hoạt handoff | Yêu cầu người dùng (User Prompt) | `01_PLAN`, phân công `TASKS.md`, `PROJECT_STATUS.md` |
| **Business Analyst** | `business-analyst` | Phân tích nghiệp vụ, hành vi người dùng, biểu phí hãng, quy tắc nghiệp vụ, AC | Kế hoạch dự án, bài toán kinh doanh | `02_PRD`, `03_USER_STORIES`, `04_USE_CASES`, `05_BUSINESS_RULES`, `06_AC` |
| **System Architect** | `system-architect` | Thiết kế kiến trúc tổng thể, pattern Adapter đa hãng, chọn Tech Stack, thiết kế REST API | PRD, Business Rules từ BA | `07_ARCHITECTURE`, `08_TECH_STACK`, `09_API_SPEC` |
| **UI/UX Designer** | `ui-ux-designer` | Thiết kế hệ thống Design System, Wireframe, luồng trải nghiệm so sánh & đặt hàng | PRD, Use Cases, Architecture | `10_DESIGN_SYSTEM`, `11_WIREFRAMES`, `12-14_FLOWS` |
| **Database Engineer**| `database-engineer` | Thiết kế ERD, Schema CSDL, Indexing, Partitioning, Migration script Prisma/PostgreSQL | Architecture, Entity models | `15_DATA_DICTIONARY`, `16_ERD`, `17-20_SCHEMAS_SQL` |
| **Backend Engineer** | `backend-engineer` | Xây dựng API Server, Adapter Pattern cho Grab/Shopee/XanhSM/Ahamove/Be, Engine so sánh cước | API Spec, Database Schema | `21_ADAPTER_SPEC`, `22_CORE_SERVICES`, Mã nguồn Backend |
| **Security Reviewer**| `security-reviewer` | Kiểm toán an ninh, mã hóa API Key hãng, chống giả mạo số dư ví, chống Rate Limit/DDoS | Kiến trúc API & Code Backend | `24-26_SECURITY_REVIEWS`, Checklist an toàn |
| **Frontend Engineer**| `frontend-engineer` | Lập trình Web Next.js 15, Responsive, Live Map Mapbox/Leaflet, Bảng so sánh động | Wireframes, API Specs | `27-29_FRONTEND_DOCS`, Mã nguồn Next.js Client/Server |
| **QA Engineer** | `qa-engineer` | Lập kịch bản kiểm thử, E2E test, Unit test, Test tính cước đa hãng & mock sandbox | Acceptance Criteria, Business Rules | `30-33_TEST_PLANS`, File kiểm thử tự động Jest/Playwright |
| **Performance & SEO**| `perf-seo` | Đo lường Core Web Vitals (LCP, FID, CLS), tối ưu tốc độ so sánh cước (< 1.5s), SEO On-page | Website Frontend | `34_PERF_SEO_REPORT`, Cấu hình caching & CDN |
| **DevOps Engineer** | `devops-engineer` | Đóng gói Docker, cấu hình CI/CD GitHub Actions, thiết lập biến môi trường, Deploy Cloud | Mã nguồn toàn bộ, Dockerfile | `35-38_DEVOPS_DOCS`, Pipeline CI/CD, Script deploy |
| **Code Reviewer** | `code-reviewer` | Thanh tra độc lập, rà soát Git Diff, loại bỏ mock/stub trái phép, cấp chứng chỉ nghiệm thu | Toàn bộ Artifacts & Source Code | `39_AUDIT_REPORT`, `40_FINAL_ACCEPTANCE` |

---

## 2. QUY TRÌNH CHUYỂN GIAO (HANDOFF PROTOCOL)

1. **Nguyên tắc bất di bất dịch**: Mỗi Agent khi hoàn thành xong gói nhiệm vụ của mình bắt buộc phải:
   - Đảm bảo 100% tài liệu/mã nguồn đã được ghi vào đĩa, không có placeholder dạng `TODO: làm sau` hoặc stub rỗng.
   - Cập nhật tiến độ vào file `TASKS.md` (chuyển trạng thái từ `IN_PROGRESS` sang `DONE`).
   - Cập nhật nhật ký bàn giao vào file `HANDOFFS.md` ghi rõ: Người gửi, Người nhận, Danh sách deliverables, Các quyết định quan trọng, Cảnh báo/Rủi ro cần lưu ý.
   - Báo cáo cho `orchestrator` hoặc Agent tiếp theo qua tin nhắn.
2. **Tiêu chuẩn chất lượng**:
   - Mọi thông số kỹ thuật, biểu phí, trạng thái đơn hàng đều phải có mã định danh chuẩn (Enum, Code) nhất quán xuyên suốt từ BA -> Arch -> DB -> Code -> Test.
