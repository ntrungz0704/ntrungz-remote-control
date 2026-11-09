import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import ctypes.wintypes
import json

u = ctypes.windll.user32
k = ctypes.windll.kernel32

UOI_NAME = 2
buf = ctypes.create_unicode_buffer(512)
needed = ctypes.wintypes.DWORD()

# 1. WindowStation
hWinSta = u.GetProcessWindowStation()
winsta = "Unknown"
if hWinSta and u.GetUserObjectInformationW(hWinSta, UOI_NAME, buf, ctypes.sizeof(buf), ctypes.byref(needed)):
    winsta = buf.value

# 2. Desktop
hDesk = u.GetThreadDesktop(k.GetCurrentThreadId())
desk = "Unknown"
if hDesk and u.GetUserObjectInformationW(hDesk, UOI_NAME, buf, ctypes.sizeof(buf), ctypes.byref(needed)):
    desk = buf.value

# 3. Lock detection via OpenInputDesktop
hInput = u.OpenInputDesktop(0, False, 0x0001)
is_locked = False
if hInput:
    input_buf = ctypes.create_unicode_buffer(512)
    if u.GetUserObjectInformationW(hInput, UOI_NAME, input_buf, ctypes.sizeof(input_buf), ctypes.byref(needed)):
        if "winlogon" in input_buf.value.lower():
            is_locked = True
    u.CloseDesktop(hInput)

# 4. Multi-monitor enumeration
class RECT(ctypes.Structure):
    _fields_ = [('left', ctypes.c_long), ('top', ctypes.c_long), ('right', ctypes.c_long), ('bottom', ctypes.c_long)]

class MONITORINFOEXW(ctypes.Structure):
    _fields_ = [
        ('cbSize', ctypes.wintypes.DWORD),
        ('rcMonitor', RECT),
        ('rcWork', RECT),
        ('dwFlags', ctypes.wintypes.DWORD),
        ('szDevice', ctypes.c_wchar * 32)
    ]

MonitorEnumProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HMONITOR, ctypes.wintypes.HDC, ctypes.POINTER(RECT), ctypes.wintypes.LPARAM)
monitors = []
def enum_cb(hMon, hdcMon, lprcMon, lParam):
    info = MONITORINFOEXW()
    info.cbSize = ctypes.sizeof(MONITORINFOEXW)
    u.GetMonitorInfoW(hMon, ctypes.byref(info))
    rc = info.rcMonitor
    is_primary = bool(info.dwFlags & 1)
    monitors.append({
        'index': len(monitors),
        'deviceName': info.szDevice,
        'isPrimary': is_primary,
        'width': rc.right - rc.left,
        'height': rc.bottom - rc.top
    })
    return True

u.EnumDisplayMonitors(None, None, MonitorEnumProc(enum_cb), 0)

dpi = u.GetDpiForSystem() if hasattr(u, 'GetDpiForSystem') else 96

print(json.dumps({
    'windowStation': winsta,
    'desktop': desk,
    'isLocked': is_locked,
    'dpi': dpi,
    'monitors': monitors
}))
