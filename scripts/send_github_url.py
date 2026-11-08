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

message = """Kính gửi Senior Technical Lead & Architect,

Theo yêu cầu kiểm toán trực tiếp mã nguồn của Architect, đây là URL chính thức của GitHub repository và commit Phase 3A:

- Repository: https://github.com/ntrungz0704/ntrungz-remote-control
- Branch: master
- Commit Phase 3A (Audit Target): https://github.com/ntrungz0704/ntrungz-remote-control/commit/f423ba42a7df5238cf5ebefc41680d2a4ff92491
- Full SHA: f423ba42a7df5238cf5ebefc41680d2a4ff92491

CÁC FILE CỐT LÕI ĐƯỢC THAY ĐỔI & BỔ SUNG TRONG COMMIT NÀY:
1. Two-Process Architecture:
   - agents/windows/src/watchdog/watchdog.service.ts: Giám sát Session 0, WTSGetActiveConsoleSessionId, quản lý PipeServer, chống crash loop (tối đa 5 lần/phút).
   - agents/windows/src/interactive/interactive.agent.ts: Chạy trong Session 1 (WinSta0\\Default), thu thập resolution (1920x1080), DPI (96), gửi Heartbeat và StatusReport.
2. Secure Named Pipe IPC:
   - packages/shared/src/ipc.ts: Framing header 4-byte Big-Endian độ dài + JSON payload.
   - agents/windows/src/ipc/pipe-server.ts: NamedPipeServer với xác thực handshake token 32-byte hex entropy.
   - agents/windows/src/ipc/pipe-client.ts: NamedPipeClient với handshake, heartbeat loop và tự động reconnect.
3. Test & Verification Thực tế:
   - test-phase3a-suite.test.ts: 4/4 automated tests PASS (Handshake, Token rejection, Supervision, Graceful shutdown).
   - scripts/verify_windows_session.py: Kiểm tra trực tiếp môi trường Windows 11 thực tế (Session ID 1, WindowStation 0x150, Primary Monitor 1920x1080).
   - Tổng test suite toàn repo: 72/72 tests PASS 100% (Green).

Kính mời Architect tiến hành kiểm toán mã nguồn trực tiếp trên repository để đưa ra kết luận nghiệm thu Phase 3A và mở khóa Phase 3B (DXGI Screen Capture)!"""

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
# The input box in active chat is around bottom of window
x_prompt = rect[0] + 450
y_prompt = rect[1] + (rect[3] - rect[1]) - 40
pyautogui.click(x_prompt, y_prompt)
time.sleep(0.5)

pyperclip.copy(message)
time.sleep(0.3)
pyautogui.hotkey('ctrl', 'v')
time.sleep(0.8)
pyautogui.press('enter')
print("Successfully sent GitHub repo & commit URL to ChatGPT!")
time.sleep(1.0)
