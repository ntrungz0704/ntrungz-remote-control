import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import time
import ctypes
import win32gui
import win32con
import win32process
import psutil
import pyautogui
import pyperclip

user32 = ctypes.windll.user32
WINSTA_ALL = 0x37F
DESKTOP_ALL = 0x1FF
hWinSta = user32.OpenWindowStationW('WinSta0', False, WINSTA_ALL)
if hWinSta:
    user32.SetProcessWindowStation(hWinSta)
hDesk = user32.OpenDesktopW('Default', 0, False, DESKTOP_ALL)
if hDesk:
    user32.SetThreadDesktop(hDesk)

def force_foreground_window(hwnd):
    fg_hwnd = user32.GetForegroundWindow()
    fg_tid, _ = win32process.GetWindowThreadProcessId(fg_hwnd)
    cur_tid = ctypes.windll.kernel32.GetCurrentThreadId()
    if fg_tid != cur_tid:
        user32.AttachThreadInput(cur_tid, fg_tid, True)
    VK_MENU = 0x12
    KEYEVENTF_KEYUP = 0x0002
    user32.keybd_event(VK_MENU, 0, 0, 0)
    user32.ShowWindow(hwnd, win32con.SW_RESTORE)
    user32.SetForegroundWindow(hwnd)
    user32.keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0)
    if fg_tid != cur_tid:
        user32.AttachThreadInput(cur_tid, fg_tid, False)

report = """BÁO CÁO XÁC MINH NGHIỆM THU CUỐI CÙNG: PHASE 2 — FINAL ACCEPTANCE VERIFICATION
Dự án: Ntrungz Remote Control
Commit SHA: a5e4d0a
Trạng thái đề xuất: ACCEPTED (Cấp phép mở Phase 3)

Kính gửi Senior Technical Lead & Architect, AI Agent gửi báo cáo xác minh độc lập giải quyết trọn vẹn 3 vấn đề và bộ tiêu chí kiểm định:

1. SECURITY VERIFICATION:
- Peer Isolation (CRIT-SEC-01): SignalingHub áp đặt Session Guard. Peer từ session khác hoặc người dùng khác không thể inject OFFER/ANSWER/CANDIDATE vào phiên hợp lệ; trả về lỗi: 'Unauthorized: Peer does not belong to this session' và drop gói tin.
- Instant Revocation (CRIT-SEC-02): Khi gọi deviceService.revokeDevice(), SignalingHub lập tức gửi thông điệp DEVICE_REVOKED, ngắt kết nối WebSocket peer trong hub, và SessionService ép kết thúc tất cả active sessions sang DISCONNECTED.
- Concurrency (CRIT-SEC-03): 10 request tạo phiên song song sinh 10 sessionToken 32-byte hex hoàn toàn duy nhất, không race condition.

2. NETWORK VERIFICATION:
- LAN UDP Discovery (CRIT-NET-01): Chuẩn hóa probe NTRUNGZ_DISCOVERY_PROBE_V1 và announcement NTRUNGZ_DISCOVERY_V1 (port 45824/45825), roundtrip parse chính xác deviceId, name, port, fingerprint.
- Post-LAN Discovery Authentication Gate (CRIT-NET-02): Khẳng định việc phát hiện thiết bị qua LAN KHÔNG cấp quyền điều khiển. Client bắt buộc phải có deviceToken hoặc vượt qua ký số Ed25519 Challenge-Response thì mới được tạo RemoteSession.
- Coturn Ephemeral Credentials (CRIT-NET-03): Sinh thông tin xác thực động qua HMAC-SHA1 timestamp, hỗ trợ cả UDP và TCP relay fallback.
- Báo cáo môi trường mạng thực tế theo nguyên tắc trung thực:
  + LAN Discovery & Signaling: PASS (Kiểm chứng qua automated suite & local sockets)
  + STUN/TURN Coturn Config: PASS (Cấu hình chuẩn hóa trong infrastructure/turnserver.conf)
  + Multi-machine Physical Testbed (mạng 4G/5G độc lập): NOT VERIFIED (Yêu cầu thiết bị Android thực địa ở các Phase sau)

3. PRESENCE & MULTI-PC RESILIENCY:
- Heartbeat Timeout Sweeper (CRIT-RES-01): Quét định kỳ 15s; sau 45s không có heartbeat, máy tính tự động bị đánh dấu OFFLINE và unreachable.
- Temporary Disconnect & Reconnect (CRIT-RES-02): Khi máy tính rớt mạng và kết nối lại, gửi heartbeat kèm IP mới, trạng thái tự động chuyển lại ONLINE mà không cần re-pair.
- Multi-PC Management (CRIT-RES-03): Kiểm chứng 1 user quản lý độc lập 3 PC (Workstation, Gaming Rig, Home Server) với trạng thái riêng biệt.

4. TEST ACCOUNTING (GIẢI TRÌNH SỐ LƯỢNG 68 TESTS):
- 25 tests: test-device-registry.test.ts (Phase 1 Registry, Pairing, Ed25519 & DB Concurrency)
- 12 tests: test-phase2-suite.test.ts (Phase 2 Session, Signaling, Presence, Turn)
- 9 tests: test-phase2-final-verification.test.ts (Phase 2 Final Verification các tiêu chí CRIT)
- 22 tests: src/__tests__/qa-suite.test.ts (Test suite của repo gốc FAST-SHIP-HUB)
-> Tổng cộng: 68/68 automated tests PASS 100%. Không có mock rỗng.

Kính trình Architect xem xét phê chuẩn ACCEPTED Phase 2 và mở cấp phép triển khai Phase 3!"""

chrome_pids = set(p.pid for p in psutil.process_iter(['name']) if p.info['name'] and 'chrome' in p.info['name'].lower())
hwnd = user32.GetTopWindow(None)
chrome_hwnd = None
while hwnd:
    if user32.IsWindowVisible(hwnd):
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        if pid in chrome_pids and 'Google Chrome' in win32gui.GetWindowText(hwnd):
            chrome_hwnd = hwnd
            break
    hwnd = user32.GetWindow(hwnd, 2)

if not chrome_hwnd:
    print("Error: Chrome window not found")
    sys.exit(1)

force_foreground_window(chrome_hwnd)
time.sleep(1.0)

rect = win32gui.GetWindowRect(chrome_hwnd)
x_prompt = rect[0] + 450
y_prompt = rect[1] + 930
pyautogui.click(x_prompt, y_prompt)
time.sleep(0.5)

pyperclip.copy(report)
time.sleep(0.3)
pyautogui.hotkey('ctrl', 'v')
time.sleep(0.8)
pyautogui.press('enter')
print("Successfully sent Phase 2 Final Acceptance Verification to ChatGPT!")
time.sleep(1.0)
