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

rect = win32gui.GetWindowRect(chrome_hwnd)
cx = rect[0] + (rect[2] - rect[0]) // 2
cy = rect[1] + (rect[3] - rect[1]) // 2
pyautogui.click(cx, cy)
time.sleep(0.3)

for p in range(1, 6):
    pyautogui.press('pageup')
    time.sleep(0.4)
    img = ImageGrab.grab(bbox=rect, all_screens=True)
    img.save(f'E:\\Automations\\scripts\\github_audit_page_{p}.png')
    print(f'Saved page {p}')
