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
from PIL import ImageGrab

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

message = """BÁO CÁO KIỂM TOÁN PHASE 0 & ĐỀ XUẤT KIẾN TRÚC NTRUNGZ REMOTE CONTROL
Dự án: Nền tảng Điều khiển Máy tính Windows Đa thiết bị qua Internet
Người gửi: AI Lead Technical Architect & Systems Auditor (Antigravity)
Môi trường kiểm toán: Windows 11 Pro 64-bit | Intel 24-core | NVIDIA RTX 3060 12GB | Node.js 22.23.4 | Docker 29.9.2 | Python 3.14.4

1. THỰC TRẠNG CODEBASE & TÀI SẢN BẢO TOÀN (PRESERVED ASSETS):
- Thư mục E:\\Automations hiện có mã nguồn Web cũ (Next.js 15, Prisma) và thư mục telegram_bot/ (bot.py 2.470 dòng).
- Đã kiểm chứng 100% tính năng hoạt động thực tế trên máy thật:
  + Chụp ảnh Desktop qua WinSta0\\Default, đo phần cứng RTX 3060/CPU/RAM qua nvidia-smi & psutil.
  + Điều khiển chuột/phím Win32, tự động hóa mở tab YouTube trên Cốc Cốc/Chrome qua AttachThreadInput.
  + Chụp ảnh an ninh qua USB Webcam bằng OpenCV.
  + Module Zero-Trust Device Manager (device_manager.py): Hardware ID PC-66AB-8738 (MachineGuid), mã PIN OTP 6 số trên màn hình máy tính, ghim Owner ID 9272450386, chống brute-force.
  + Đã fix lỗi 429 Quota: Tách toàn bộ lệnh quản trị (/pair, /device, /newpin, /remote) chạy cục bộ < 50ms, không tốn quota Gemini.

2. CÁC PHÁT HIỆN KIẾN TRÚC & RỦI RO BẮT BUỘC GIẢI QUYẾT:
- Nút thắt Data Plane: Truyền ảnh JPEG qua Telegram bị nghẽn và trễ (1-3s). Bắt buộc chuyển sang WebRTC MediaStream 30 FPS (< 150ms).
- Ranh giới Session 0 vs Session 1 của Windows 11: Dịch vụ nền chạy Session 0 không thể chụp Desktop hay can thiệp giao diện người dùng Session 1. Bắt buộc mô hình 2 tiến trình (Watchdog Service + Interactive Session Agent) liên lạc qua Named Pipe có xác thực token.
- Mạng: Máy chủ nằm sau NAT gia đình (192.168.2.3). Áp dụng LAN Direct P2P khi cùng Wi-Fi; khi ra ngoài đường kết nối qua STUN / coturn TURN Relay (DTLS-SRTP).

3. 4 QUYẾT ĐỊNH KIẾN TRÚC CỐT LÕI (ADRs):
- ADR-001 (WebRTC): Chuyển đổi sang luồng Video WebRTC H.264/VP8. Telegram giữ vai trò trung tâm thông báo, cảnh báo khẩn cấp và giao lệnh AI.
- ADR-002 (Two-Process Model): Tách Windows Agent thành Service nền (quản trị, cập nhật) và Interactive Agent (chụp DXGI, SendInput chuột phím).
- ADR-003 (Engine Reuse): Tận dụng kiến trúc truyền tải chuẩn của RustDesk Core / WebRTC Native để rút ngắn thời gian phát triển, bảo mật chuẩn DTLS-SRTP.
- ADR-004 (Monorepo): Thiết lập cấu trúc Monorepo ntrungz-remote-control/ chuẩn mực (apps/, services/, agents/, packages/, infrastructure/).

4. ĐỀ XUẤT KẾ HOẠCH TRIỂN KHAI PHASE 1:
- Thiết lập cấu trúc thư mục Monorepo ntrungz-remote-control/.
- Thiết kế Database Schema PostgreSQL (users, computers, pairing_sessions, remote_sessions, audit_logs) bằng Prisma/Docker.
- Viết Device Registry Service (Fastify TypeScript) xử lý đăng ký phần cứng và xác thực PIN OTP.

Báo cáo chi tiết đầy đủ 260 dòng đã được lưu tại file E:\\Automations\\docs\\PHASE_0_AUDIT_REPORT.md.
Xin mời Architect đánh giá, phê duyệt nghiệm thu Phase 0 và cho ý kiến chỉ đạo để Agent bắt đầu code Phase 1!"""

pyperclip.copy(message)
print("Copied message to clipboard. Length:", len(message))

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
    print("Error: Chrome window not found!")
    sys.exit(1)

force_foreground_window(chrome_hwnd)
time.sleep(0.5)

rect = win32gui.GetWindowRect(chrome_hwnd)
target_x = rect[0] + (rect[2] - rect[0]) // 2
target_y = rect[3] - 70

print(f"Clicking input box at ({target_x}, {target_y})...")
pyautogui.click(target_x, target_y)
time.sleep(0.4)

pyautogui.hotkey('ctrl', 'a')
time.sleep(0.2)
pyautogui.press('backspace')
time.sleep(0.3)

print("Pasting message via Ctrl+V...")
pyautogui.hotkey('ctrl', 'v')
time.sleep(1.0)

print("Pressing Enter to submit...")
pyautogui.press('enter')
time.sleep(1.5)

img = ImageGrab.grab(bbox=rect, all_screens=True)
img.save(r'E:\Automations\chrome_submitted_direct.png')
print("Submitted! Saved screenshot to E:\\Automations\\chrome_submitted_direct.png")
