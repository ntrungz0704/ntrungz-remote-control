# NHẬT KÝ BÀN GIAO CÔNG VIỆC (HANDOFFS.MD)
## DỰ ÁN: PET SOCIAL NETWORK (MẠNG XÃ HỘI THÚ CƯNG)

> **Cơ chế**: Chuyền tay theo quy trình khép kín, ghi nhận đầy đủ người gửi, người nhận, deliverables và cảnh báo rủi ro.

---

### BÀN GIAO 01: TỪ PRODUCT OWNER & DISCOVERY AGENT ➔ ORCHESTRATOR & TOÀN ĐỘI NGŨ
- **Thời gian**: 04/11/2026 09:41
- **Người gửi**: `business-analyst` (Discovery Agent)
- **Người nhận**: `orchestrator`, `system-architect`, `database-engineer`, `ui-ux-designer`
- **Danh sách bàn giao (Deliverables)**:
  1. `docs/PRD.md` — Đặc tả yêu cầu sản phẩm hoàn chỉnh
  2. `docs/USER_STORIES.md` — 28 User Stories phân tầng P0/P1/P2
  3. `docs/BUSINESS_RULES.md` — 18 Quy tắc nghiệp vụ bắt buộc
  4. `docs/ACCEPTANCE_CRITERIA.md` — 18 Kịch bản nghiệm thu Given/When/Then
  5. `docs/MVP_SCOPE.md` — Ma trận phân bổ phạm vi P0, tiêu chí phát hành
  6. `docs/TECH_STACK_DECISION.md` — Thẩm định công nghệ và phân tích chi phí 0đ
  7. `docs/REQUIREMENT_BASELINE.md` — Baseline mã hóa `REQ-...` và Traceability
  8. `docs/DISCOVERY_FINAL_REPORT.md` — Biên bản kiểm toán tính nhất quán
- **Các quyết định bất di bất dịch**:
  - 1 User = 1 Chủ nuôi; 1 User quản lý nhiều Pet Profiles.
  - Follow một chiều trong MVP. Không làm Friends 2 chiều hay Chat 1-1.
  - Đơn định dạng Media: Hoặc ảnh (tối đa 4 ảnh nén WebP) hoặc video (MP4, <=60s, <=20MB). Không kết hợp ảnh + video trong 1 bài.
  - Chronological Feed (mới nhất lên đầu).
  - Paw 🐾 Toggle (tối đa 1 Paw/User/Post).
  - Comment 1 cấp lồng (Bình luận gốc + Trả lời trực tiếp).
  - Khách vãng lai xem Read-only; Bắt buộc đăng nhập khi ghi dữ liệu.
- **Cảnh báo rủi ro**:
  - Không làm Video Transcoding đa tầng trên cloud ở MVP để giữ chi phí 0đ.
  - Phải kiểm tra Magic Bytes ở server-side để chống tải file mã độc.
  - Xóa Pet Profile chỉ xóa liên kết tag, tuyệt đối không làm mất bài viết gốc của chủ nuôi.
