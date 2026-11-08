import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import time
import ctypes
import win32gui
import win32con
import win32process
import pyautogui
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

chrome_hwnd = None
def enum_cb(h, _):
    global chrome_hwnd
    if win32gui.IsWindowVisible(h):
        t = win32gui.GetWindowText(h)
        if 'Chrome' in t or 'ChatGPT' in t or 'Cốc Cốc' in t:
            chrome_hwnd = h
            return False
    return True

win32gui.EnumWindows(enum_cb, None)
if not chrome_hwnd:
    print("Chrome window not found")
    sys.exit(1)

force_foreground_window(chrome_hwnd)
time.sleep(1.0)

# Scroll to bottom
rect = win32gui.GetWindowRect(chrome_hwnd)
cx = rect[0] + (rect[2] - rect[0]) // 2
cy = rect[1] + (rect[3] - rect[1]) // 2
pyautogui.click(cx, cy)
time.sleep(0.5)

pyautogui.press('end')
time.sleep(1.0)

bbox = (rect[0], rect[1], rect[2], rect[3])
shot = ImageGrab.grab(bbox=bbox)
shot_path = r'E:\Automations\scripts\chatgpt_phase2_verdict.png'
shot.save(shot_path)
print(f"Captured screenshot to: {shot_path}")
