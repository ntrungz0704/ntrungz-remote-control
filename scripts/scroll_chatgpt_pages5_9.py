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

if not chrome_hwnd:
    print("Error: Chrome window not found")
    sys.exit(1)

rect = win32gui.GetWindowRect(chrome_hwnd)
pyautogui.click(rect[0] + 500, rect[1] + 400)
time.sleep(0.3)

for page in range(5, 10):
    pyautogui.press('pagedown')
    time.sleep(0.6)
    img = ImageGrab.grab(bbox=rect, all_screens=True)
    out_path = f'E:\\Automations\\chatgpt_page_{page}.png'
    img.save(out_path)
    print(f'Captured {out_path}')
