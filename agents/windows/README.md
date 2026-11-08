# Ntrungz Remote Control — Windows Endpoint Layer (agents/windows)

Module tác tử cài đặt trên máy tính Windows 11 mục tiêu:
- **Two-Process Model**:
  + **Watchdog Service (Session 0)**: Quản lý vòng đời tiến trình, tự phục hồi khi crash, chống Sleep, quản lý identity phần cứng.
  + **Interactive Session Agent (Session 1)**: Chụp màn hình qua DXGI Desktop Duplication / Windows Graphics Capture, tiếp nhận Input qua Win32 SendInput, thu âm thanh qua WASAPI.
- Kết nối IPC qua Windows Named Pipe có ACL bảo vệ và kiểm tra token HMAC.

*Trạng thái: Giữ chỗ cho Phase 3 & 4 (theo đúng yêu cầu của Architect: chưa code WebRTC/Agent ở Phase 1 để tập trung hoàn thiện bảo mật Pairing & Device Registry).*
