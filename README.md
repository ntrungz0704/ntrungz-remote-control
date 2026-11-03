# FAST-SHIP-HUB & PROFESSIONAL MULTI-AGENT DEVELOPMENT WORKSPACE

> **Antigravity Multi-Agent Engineering Architecture**  
> Phiên bản hệ thống: `v1.2.0-hybrid` | Nền tảng: Google Antigravity

---

## 1. TỔNG QUAN HỆ THỐNG
Đây là workspace phát triển phần mềm chuẩn mực trên nền tảng **Google Antigravity**, tích hợp đội ngũ **12 AI Agents chuyên biệt** vận hành theo mô hình dây chuyền khép kín (Autonomous Agentic Workflow).

Hệ thống được thiết kế để giải quyết triệt để 2 vấn đề cốt tử trong AI Coding:
1. **Tránh hiểu sai yêu cầu ngay từ đầu (Discovery Blindness)**: Không dùng câu hỏi máy móc, không tự ý ấn định công nghệ trước khi hiểu rõ bài toán.
2. **Loại bỏ đứt gãy giữa các khâu (Handoff Gaps)**: Mọi quyết định và tiến độ đều được lưu giữ trong bộ nhớ chung (`AGENTS.md`, `TASKS.md`, `HANDOFFS.md`, `PROJECT_STATUS.md`).

---

## 2. DANH MỤC 12 VAI TRÒ CHUYÊN BIỆT (CORE WEB AGENTS)

| ID Agent | Chức danh | Nhiệm vụ chính |
| :--- | :--- | :--- |
| `orchestrator` | Lead Software Project Manager | Điều phối toàn bộ dự án, phân bổ Task, giám sát SLA và kích hoạt handoff |
| `business-analyst` | Senior Business Analyst | Khảo sát nhu cầu (Adaptive Discovery), viết PRD, User Stories, Business Rules, AC |
| `system-architect` | Principal System Architect | Lựa chọn Tech Stack phù hợp bài toán, thiết kế Kiến trúc hệ thống, ADR và REST API |
| `ui-ux-designer` | Senior UI/UX Designer | Thiết kế Design System, Wireframes, User Flows và trạng thái giao diện |
| `database-engineer` | Senior Database Engineer | Thiết kế ERD, Schema CSDL 3NF, phân quyền dữ liệu RLS và chỉ mục Index |
| `backend-engineer` | Senior Backend Engineer | Triển khai Core Services, Adapter Pattern, Quoting Engine và xử lý Webhooks |
| `security-reviewer` | Lead Security Reviewer | Kiểm toán an ninh, HMAC-SHA256, chống IDOR, bảo vệ số dư và chống Replay Attack |
| `frontend-engineer` | Senior Frontend Engineer | Xây dựng giao diện Next.js, Live Tracking Map SSE, Responsive 100% |
| `qa-engineer` | Lead QA & Test Automation | Lập Test Plan, viết test tự động Vitest (Unit/Integration) và đo độ trễ |
| `performance-seo-engineer` | Principal Perf & SEO | Tối ưu Core Web Vitals (LCP, INP, CLS), SEO On-page, JSON-LD và chuẩn WCAG 2.2 AA |
| `devops-engineer` | Senior DevOps Engineer | Đóng gói Docker Multi-stage, Docker Compose, CI/CD Pipeline và Runbook |
| `code-reviewer` | Independent Code Reviewer | Thanh tra độc lập 100% Git Diff, loại bỏ mock/stub rỗng, cấp chứng chỉ nghiệm thu |

> [!IMPORTANT]
> **Tác tử độc lập ngoài luồng**: `video-scriptwriter` là Agent chuyên sáng tạo kịch bản video ngắn (TikTok/Reels), nằm độc lập tại cấu hình máy cá nhân và **tuyệt đối không tham gia** vào luồng kỹ thuật lập trình web.

---

## 3. QUY TẮC KHẢO SÁT THÍCH ỨNG (ADAPTIVE DISCOVERY PROTOCOL)
Để tránh tình trạng "cả 14 Agent cùng hiểu sai yêu cầu ngay từ đầu", toàn bộ đội ngũ tuân thủ nghiêm ngặt 3 nguyên tắc:
1. **Không dùng bộ câu hỏi rập khuôn**: Khảo sát bài toán dựa trên bản chất kỹ thuật của từng loại sản phẩm (ví dụ: E-commerce tập trung vào tồn kho & thanh toán; Social Network tập trung vào đồ thị quan hệ & feed real-time).
2. **Không tự ý chọn trước công nghệ**: Không bao giờ mặc định áp đặt một công nghệ (như Next.js hay PostgreSQL) khi chưa xác định đặc thù tải (đọc nhiều hay ghi nhiều, quan hệ hay phi quan hệ).
3. **Plan Gate & Xác minh độc lập**: Kế hoạch phải được thẩm định và người dùng phê duyệt trước khi viết mã nguồn.

---

## 4. TÀI LIỆU VÀ CẤU HÌNH LIÊN QUAN
- Cấu hình Agent cục bộ: `.agents/agents/<agent-id>.md` và `.agents/agents/<agent-id>/agent.md`
- Quy tắc phát triển dùng chung: `.agents/rules/`
- Báo cáo tương thích Antigravity: `docs/ANTIGRAVITY-COMPATIBILITY.md`
- Nhật ký bàn giao dự án: `HANDOFFS.md`
- Trạng thái công việc: `TASKS.md` và `PROJECT_STATUS.md`
