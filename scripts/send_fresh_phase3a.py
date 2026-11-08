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

report = """TIẾP TỤC DỰ ÁN: NTRUNGZ REMOTE CONTROL (CHUYỂN TIẾP TỪ THREAD TRƯỚC VÌ ĐẦY NGỮ CẢNH)
Kính gửi Senior Technical Lead & Architect,

1. TÓM TẮT TIẾN ĐỘ ĐÃ NGHIỆM THU:
- Phase 0: Audit kiến trúc & Đánh giá năng lực PC Windows 11 (ACCEPTED).
- Phase 1: Monorepo, Database Schema, Pairing Protocol PIN & Ed25519 Challenge-Response (ACCEPTED - Commit 9ca6591).
- Phase 2: WebRTC Signaling Hub, Remote Session Manager, Presence 45s Sweeper, Coturn Relay (CONDITIONALLY ACCEPTED / PHASE 3 OFFICIALLY AUTHORIZED - Commit a5e4d0a).
- Tiêu chí NET-01 & NET-02 bảo lưu cho tích hợp mạng thực tế.

2. BÁO CÁO HOÀN THÀNH PHASE 3A — WINDOWS INTERACTIVE SESSION AGENT & NAMED PIPE IPC:
- Commit SHA: f423ba4
- Hai tiến trình (Two-Process Model):
  + Watchdog Service (Session 0) - agents/windows/src/watchdog/watchdog.service.ts: Quản lý pipe server, kiểm tra WTSGetActiveConsoleSessionId, quản lý vòng đời và chống crash loop (tối đa 5 lần/phút).
  + Interactive Session Agent (Session 1+) - agents/windows/src/interactive/interactive.agent.ts: Chạy trực tiếp trong phiên desktop WinSta0\\Default, gửi báo cáo thông số màn hình và heartbeat 5s/lần.
- Secure Named Pipe IPC:
  + packages/shared/src/ipc.ts, agents/windows/src/ipc/pipe-server.ts, pipe-client.ts.
  + Đóng gói 4-byte Big-Endian length prefix + JSON payload. Bắt buộc xác thực handshake token 32-byte (CRIT-3A-01/02).
- Xác minh thực tế trên hệ điều hành Windows 11 (scripts/verify_windows_session.py):
  + Active Console Session ID: 1
  + WindowStation Handle: 0x150 (WinSta0\\Default)
  + Màn hình chính: 1920x1080, Virtual Desktop: 3000x1920, DPI: 96.
- Toàn bộ Test Suite: 72/72 tests PASS 100% (Green).
- Bot Telegram nền vẫn hoạt động 200 OK.

Kính trình Architect thẩm định báo cáo Phase 3A và cấp phép triển khai Phase 3B: DXGI Desktop Duplication Screen Capture!"""

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
# The input box in the fresh chat is around x = rect[0] + 500, y = rect[1] + 570
x_prompt = rect[0] + 500
y_prompt = rect[1] + 570
pyautogui.click(x_prompt, y_prompt)
time.sleep(0.5)

pyperclip.copy(report)
time.sleep(0.3)
pyautogui.hotkey('ctrl', 'v')
time.sleep(0.8)
pyautogui.press('enter')
print("Successfully sent Phase 3A report in fresh ChatGPT chat!")
time.sleep(1.0)
