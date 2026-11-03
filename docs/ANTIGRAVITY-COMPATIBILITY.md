# BÁO CÁO TƯƠNG THÍCH VÀ XÁC MINH CẤU HÌNH ANTIGRAVITY (ANTIGRAVITY-COMPATIBILITY.MD)

> **Mã báo cáo**: `COMPAT-AGY-20261104-V1`  
> **Nền tảng kiểm định**: Google Antigravity (IDE / Desktop Surface)  
> **Hệ điều hành**: Windows 11 Pro 64-bit | **Shell**: PowerShell 7+  
> **Trạng thái kết luận**: `INSTALLED_AND_VALIDATED` ✅

---

## 1. MÔI TRƯỜNG VÀ BỀ MẶT THỰC THI (ANTIGRAVITY SURFACE & ENVIRONMENT)

- **Surface**: Antigravity IDE / Antigravity 2.0 Desktop Workspace.
- **Thư mục làm việc (Workspace Root)**: `E:\Automations`
- **Thư mục cấu hình toàn cục (Global Config)**: `C:\Users\ntrun\.gemini\config\agents\`
- **Thư mục Artifacts & Logs**: `C:\Users\ntrun\.gemini\antigravity\brain\7ee5c7e2-1cd1-47ff-b666-6d3605a65bc3\`
- **Công cụ hỗ trợ gốc (Native Tools)**: `read_file`, `write_file`, `edit_file`, `run_command`, `invoke_subagent`, `send_message`, `schedule`, `manage_task`, `call_mcp_tool`.
- **MCP Servers tích hợp**: `chrome-devtools-mcp` (32 tools), `figma_figma`, `firebase-mcp-server`, `canva_canva`, `data-agent-kit-plugin`, `gemini-api`.

---

## 2. KẾT QUẢ KHẢO SÁT & ĐỊNH DANH TÁC TỬ (AGENTS DETECTED & INVOCATION)

### 2.1. Đội ngũ 12 Core Web Agents (Đã cài đặt & Xác minh)
Được đăng ký song song tại cả 2 vị trí:
1. **Cấu hình toàn cục (Global Custom Agents)**: `C:\Users\ntrun\.gemini\config\agents/<agent-id>.md` (hiển thị trực tiếp trên Sidebar Custom Agents của giao diện Antigravity).
2. **Cấu hình kho lưu trữ (Workspace Agents)**: `E:\Automations\.agents\agents/<agent-id>.md` và `.agents/agents/<agent-id>/agent.md`.

| STT | Agent ID | Tên hiển thị | Trách nhiệm chính | Phương thức kích hoạt |
| :---: | :--- | :--- | :--- | :--- |
| 01 | `orchestrator` | Orchestrator | Tổng thầu, lập kế hoạch, phân bổ Task, giám sát Handoff | Trực tiếp / Subagent |
| 02 | `business-analyst` | Business Analyst | Khảo sát nhu cầu (Adaptive Discovery), viết PRD, AC | Orchestrator / Subagent |
| 03 | `system-architect` | System Architect | Chốt MVP, chọn Tech Stack, thiết kế Hexagonal Architecture | Orchestrator / Subagent |
| 04 | `ui-ux-designer` | UI/UX Designer | Design System, Wireframes, User Flows, bản đồ Live Map | Orchestrator / Subagent |
| 05 | `database-engineer` | Database Engineer | ERD, Prisma Schema 3NF, phân quyền dữ liệu RLS | Orchestrator / Subagent |
| 06 | `backend-engineer` | Backend Engineer | API Next.js, Adapter Pattern đa hãng, Core Business Logic | Orchestrator / Subagent |
| 07 | `security-reviewer` | Security Reviewer | Kiểm toán an ninh, HMAC-SHA256, chống IDOR, DoS, Replay | Orchestrator / Subagent |
| 08 | `frontend-engineer` | Frontend Engineer | Next.js 15 App Router, Tailwind, Live Tracking Map SSE | Orchestrator / Subagent |
| 09 | `qa-engineer` | QA Engineer | Test Plan, tự động hóa Vitest (Unit/Integration), SLA đo độ trễ | Orchestrator / Subagent |
| 10 | `performance-seo-engineer` | Performance & SEO | Tối ưu Core Web Vitals (LCP < 1.2s), SEO JSON-LD, WCAG 2.2 | Orchestrator / Subagent |
| 11 | `devops-engineer` | DevOps Engineer | Docker Multi-stage, Docker Compose, GitHub Actions CI/CD | Orchestrator / Subagent |
| 12 | `code-reviewer` | Code Reviewer | Thanh tra độc lập 100% Git Diff, loại bỏ stub rỗng, nghiệm thu | Orchestrator / Subagent |

### 2.2. Tác tử độc lập ngoài luồng (Isolate Non-Web Agent)
- **`video-scriptwriter`**: Đã được **loại bỏ hoàn toàn** khỏi thư mục `.agents/agents/` của dự án web. File chỉ tồn tại độc lập tại cấu hình máy cục bộ để phục vụ biên kịch video ngắn khi người dùng yêu cầu riêng, tuyệt đối không bị auto-invoke vào các quy trình lập trình web.

---

## 3. KHẢO SÁT QUY TẮC DÙNG CHUNG (RULES DETECTED & SCOPE)

Các quy tắc dự án được lưu trữ tại `E:\Automations\.agents\rules/`:
1. `security.md`: Quy chuẩn an ninh bảo vệ số dư, chống IDOR, kiểm tra HMAC và chống Replay Attack.
2. `database.md`: Chuẩn hóa 3NF, khóa ngoại, ràng buộc kiểm tra số dư (`balance >= 0`), chỉ mục truy vấn.
3. `backend.md`: Triển khai Adapter Pattern tách biệt, Quoting song song với Circuit Breaker, RFC 7807 Error handling.
4. `frontend.md`: Next.js 15 Server Components mặc định, 6 trạng thái UI, chuẩn màu thương hiệu, Responsive 100%.
5. `testing.md`: Bắt buộc 100% test pass, kiểm thử công thức cước, kiểm tra độ trễ Latency SLA thực tế.
6. `documentation.md`: Đặt tên file tiếng Việt có đánh số thứ tự từ `01_` đến `40_`, không dùng stub `TODO`.

---

## 4. CƠ CHẾ CỘNG TÁC & PHÂN LẬP KHÔNG GIAN (NATIVE COLLABORATION & WORKTREE STATUS)

- **Cơ chế Handoff qua bộ nhớ chia sẻ**: Sử dụng giao thức tài liệu trung gian (`HANDOFFS.md`, `TASKS.md`, `PROJECT_STATUS.md`). Mỗi Agent khi hoàn thành phiên làm việc bắt buộc phải cập nhật nhật ký bàn giao, mã hóa deliverables và bàn giao cho Agent tiếp theo.
- **Cơ chế Phân lập mã nguồn (Branch / Worktree Isolation)**:
  - Hệ thống hỗ trợ phân lập nhánh Git thông qua `git checkout -b feature/<task-id>`.
  - Kiểm chứng độc lập được thực hiện bởi `code-reviewer` thông qua lệnh `git diff` trước khi merge vào nhánh chính (`master`).

---

## 5. BẰNG CHỨNG THỰC THI & LỆNH XÁC MINH (VALIDATION EVIDENCE)

1. **Kiểm tra phát hiện Agent toàn cục**:
   - Lệnh: `Get-ChildItem -Path "C:\Users\ntrun\.gemini\config\agents"`
   - Kết quả: Đầy đủ 13 files `.md` (12 Web Agents + 1 video-scriptwriter).
2. **Kiểm tra phát hiện Agent cục bộ dự án**:
   - Lệnh: `Get-ChildItem -Path "E:\Automations\.agents\agents"`
   - Kết quả: 12 Core Web Agents (không chứa video-scriptwriter).
3. **Kiểm tra Rules**:
   - Lệnh: `Get-ChildItem -Path "E:\Automations\.agents\rules"`
   - Kết quả: 6 bộ rules chuẩn đã sẵn sàng.
4. **Kiểm tra trạng thái Git**:
   - Lệnh: `git status`
   - Kết quả: Toàn bộ cấu hình đã được commit an toàn vào Git branch `master`.

---

## 6. DANH MỤC THAY ĐỔI TẬP TIN (FILE AUDIT LOG)

### 6.1. Tệp tin tạo mới & Cập nhật:
- `README.md`: Hướng dẫn toàn diện về workspace, đội ngũ 12 Agent và Adaptive Discovery.
- `AGENTS.md`: Quy chế hợp tác đa tác tử, loại bỏ cứng nhắc dự án cũ, bổ sung Adaptive Discovery Protocol.
- `docs/ANTIGRAVITY-COMPATIBILITY.md`: Tài liệu này (báo cáo kiểm định tương thích).
- `.agents/agents/*.md` & `.agents/rules/*.md`: Cấu hình 12 agent và 6 rule files.
- `C:\Users\ntrun\.gemini\config\agents/*.md`: 12 Global Custom Agents cho thanh bên Antigravity.

### 6.2. Tệp tin cố ý không chỉnh sửa (Preserved Files):
- Toàn bộ mã nguồn ứng dụng `FAST-SHIP-HUB` trong `src/` và `prisma/`.
- Toàn bộ 40 tài liệu kỹ thuật đã đánh số trong `docs/01_` đến `docs/40_`.
- Các file cá nhân của người dùng trên ổ E: `fb_audio.m4a`, `scratch_process_audio.py`, `summary_output.md`.

---

## 7. KẾT LUẬN & TRẠNG THÁI CUỐI CÙNG

- **Trạng thái**: **`INSTALLED_AND_VALIDATED`** ✅
- Đội ngũ 12 Custom Agents đã sẵn sàng nhận lệnh từ người dùng.
- Quy trình Discovery thích ứng (Adaptive Discovery) đã được kích hoạt, đảm bảo không áp đặt câu hỏi máy móc hay thiên kiến công nghệ lên bất kỳ dự án mới nào.
