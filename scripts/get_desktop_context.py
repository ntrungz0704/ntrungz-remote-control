import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import ctypes.wintypes
import json

u = ctypes.windll.user32
k = ctypes.windll.kernel32
shcore = ctypes.windll.shcore

UOI_NAME = 2
buf = ctypes.create_unicode_buffer(512)
needed = ctypes.wintypes.DWORD()

# 1. WindowStation
hWinSta = u.GetProcessWindowStation()
winsta = "UNKNOWN"
if hWinSta and u.GetUserObjectInformationW(hWinSta, UOI_NAME, buf, ctypes.sizeof(buf), ctypes.byref(needed)):
    winsta = buf.value

# 2. Desktop
hDesk = u.GetThreadDesktop(k.GetCurrentThreadId())
desk = "UNKNOWN"
if hDesk and u.GetUserObjectInformationW(hDesk, UOI_NAME, buf, ctypes.sizeof(buf), ctypes.byref(needed)):
    desk = buf.value

# 3. Lock detection via OpenInputDesktop with access denial discrimination
is_locked = None
lock_reason = "UNKNOWN"
hInput = u.OpenInputDesktop(0, False, 0x0001) # DESKTOP_READOBJECTS
if hInput:
    input_buf = ctypes.create_unicode_buffer(512)
    if u.GetUserObjectInformationW(hInput, UOI_NAME, input_buf, ctypes.sizeof(input_buf), ctypes.byref(needed)):
        inp_name = input_buf.value.lower()
        if "winlogon" in inp_name or "screensaver" in inp_name:
            is_locked = True
            lock_reason = f"INPUT_DESKTOP_{input_buf.value.upper()}"
        elif "default" in inp_name:
            is_locked = False
            lock_reason = "INPUT_DESKTOP_DEFAULT_ACTIVE"
        else:
            is_locked = False
            lock_reason = f"INPUT_DESKTOP_{input_buf.value.upper()}"
    u.CloseDesktop(hInput)
else:
    err = k.GetLastError()
    if err == 5: # ERROR_ACCESS_DENIED: input desktop is secure (Winlogon / UAC / Lock Screen)
        is_locked = True
        lock_reason = "SECURE_DESKTOP_ACCESS_DENIED_LOCKED"
    else:
        is_locked = None
        lock_reason = f"OPEN_INPUT_DESKTOP_FAILED_ERR_{err}"

# 4. Per-Monitor Enumeration and Native Shcore Per-Monitor DPI
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
    
    dpiX = ctypes.wintypes.UINT()
    dpiY = ctypes.wintypes.UINT()
    # MDT_EFFECTIVE_DPI = 0
    hr = shcore.GetDpiForMonitor(hMon, 0, ctypes.byref(dpiX), ctypes.byref(dpiY))
    mon_dpi = dpiX.value if hr == 0 else None

    monitors.append({
        'index': len(monitors),
        'deviceName': info.szDevice,
        'isPrimary': is_primary,
        'bounds': {
            'left': rc.left,
            'top': rc.top,
            'right': rc.right,
            'bottom': rc.bottom
        },
        'width': rc.right - rc.left,
        'height': rc.bottom - rc.top,
        'dpi': mon_dpi
    })
    return True

u.EnumDisplayMonitors(None, None, MonitorEnumProc(enum_cb), 0)

sys_dpi = u.GetDpiForSystem() if hasattr(u, 'GetDpiForSystem') else None

print(json.dumps({
    'windowStation': winsta,
    'desktop': desk,
    'isLocked': is_locked,
    'lockReason': lock_reason,
    'systemDpi': sys_dpi,
    'monitors': monitors
}))
