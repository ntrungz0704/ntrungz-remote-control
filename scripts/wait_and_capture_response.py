import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import time
import ctypes
import win32gui
import win32process
import psutil
from PIL import Image, ImageGrab

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

print("Monitoring ChatGPT generation...")
max_wait = 60
start_time = time.time()

def is_generating(img):
    # Check bottom right for square stop button (it has a white square in green circle)
    # The green circle is at around x: 950-1010, y: 880-925
    for y in range(880, 925):
        for x in range(950, 1010):
            r, g, b = img.getpixel((x, y))[:3]
            # White square inside stop button: r > 240, g > 240, b > 240
            if r > 240 and g > 240 and b > 240 and x in range(970, 995) and y in range(890, 915):
                # Check if surrounded by green
                px_left = img.getpixel((x - 20, y))[:3]
                if px_left[1] > 160: # green
                    return True
    return False

while time.time() - start_time < max_wait:
    time.sleep(4)
    rect = win32gui.GetWindowRect(chrome_hwnd)
    img = ImageGrab.grab(bbox=rect, all_screens=True)
    if not is_generating(img):
        print("ChatGPT finished generating!")
        break
    print(f"Still generating... ({int(time.time() - start_time)}s)")

rect = win32gui.GetWindowRect(chrome_hwnd)
img = ImageGrab.grab(bbox=rect, all_screens=True)
img.save(r'E:\Automations\chatgpt_architect_reply.png')
print("Saved final reply screenshot to E:\\Automations\\chatgpt_architect_reply.png")
