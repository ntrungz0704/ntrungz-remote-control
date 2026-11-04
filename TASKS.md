# DANH MỤC CÔNG VIỆC DỰ ÁN (TASKS.MD)
## DỰ ÁN: PET SOCIAL NETWORK (MẠNG XÃ HỘI THÚ CƯNG)

> **Mô hình**: Task-ID driven, 1 Agent chịu trách nhiệm / 1 Task.  
> **Trạng thái**: `BACKLOG` | `READY` | `IN_PROGRESS` | `DONE` | `IN_REVIEW`

---

| Task ID | Tên công việc | Agent chịu trách nhiệm | Trạng thái | Đầu ra chính |
| :--- | :--- | :---: | :---: | :--- |
| `TASK-01` | Khảo sát nhu cầu thích ứng (Discovery) | `business-analyst` | **DONE** | 8 tài liệu trong `docs/` |
| `TASK-02` | Thiết kế Kiến trúc & Chuẩn hóa API RESTful | `system-architect` | **DONE** | 18 API RESTful Endpoints |
| `TASK-03` | Thiết kế Design System phong cách pastel cưng | `ui-ux-designer` | **DONE** | `globals.css`, UI theme, Paw animations |
| `TASK-04` | Thiết kế CSDL Prisma Schema 3NF & Seed Data | `database-engineer` | **DONE** | `prisma/schema.prisma`, `prisma/seed.ts` |
| `TASK-05` | Hiện thực hóa Core Domain Store Services | `backend-engineer` | **DONE** | `src/services/pet-social.store.ts` |
| `TASK-06` | Xây dựng 18 API Route Handlers đầy đủ | `backend-engineer` | **DONE** | `src/app/api/v1/*` |
| `TASK-07` | Lập trình Frontend Next.js 15 App Router | `frontend-engineer` | **DONE** | Trang chủ Feed, Trang cá nhân Profile, Trang Admin |
| `TASK-08` | Kiểm thử tự động hóa 100% kịch bản AC | `qa-engineer` | **DONE** | `test-pet-social-suite.ts` (18/18 PASS 100%) |
| `TASK-09` | Kiểm toán An ninh mạng & Chống IDOR, Magic Bytes | `security-reviewer` | **DONE** | Chống IDOR Pet, chặn Magic Bytes file giả, Rate Limit |
| `TASK-10` | Tối ưu Hiệu năng Core Web Vitals & SEO | `performance-seo-engineer` | **DONE** | Next.js 15 build tĩnh/động tối ưu, sitemap, robots |
| `TASK-11` | Đóng gói & Xác thực Build Production | `devops-engineer` | **DONE** | `npm run build` thành công 100% |
| `TASK-12` | Thanh tra độc lập 100% Git Diff & Nghiệm thu | `code-reviewer` | **DONE** | Nghiệm thu toàn bộ codebase đạt chuẩn xuất xưởng |
