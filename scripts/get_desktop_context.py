import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import ctypes.wintypes
import json
import hashlib

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

# 3. Lock detection via OpenInputDesktop (BLOCKER R05: Fail-Closed, no assumptions)
is_locked = None
lock_state = "UNKNOWN"
lock_reason = "UNKNOWN"
hInput = u.OpenInputDesktop(0, False, 0x0001) # DESKTOP_READOBJECTS

if hInput:
    input_buf = ctypes.create_unicode_buffer(512)
    if u.GetUserObjectInformationW(hInput, UOI_NAME, input_buf, ctypes.sizeof(input_buf), ctypes.byref(needed)):
        inp_name = input_buf.value.lower()
        if "winlogon" in inp_name or "screensaver" in inp_name:
            is_locked = True
            lock_state = "LOCKED"
            lock_reason = f"INPUT_DESKTOP_{input_buf.value.upper()}"
        elif "default" in inp_name:
            is_locked = False
            lock_state = "UNLOCKED"
            lock_reason = "INPUT_DESKTOP_DEFAULT_ACTIVE"
        else:
            is_locked = None
            lock_state = "UNKNOWN"
            lock_reason = f"INPUT_DESKTOP_OTHER_{input_buf.value.upper()}"
    u.CloseDesktop(hInput)
else:
    err = k.GetLastError()
    # BLOCKER R05: ERROR_ACCESS_DENIED (5) can be UAC or secure desktop, never assume locked without conclusive evidence
    is_locked = None
    lock_state = "UNKNOWN"
    lock_reason = f"OPEN_INPUT_DESKTOP_DENIED_OR_FAILED_ERR_{err}"

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

# Virtual screen metrics
cx_virtual = u.GetSystemMetrics(78)
cy_virtual = u.GetSystemMetrics(79)

# BLOCKER R05: Compute dynamic topology signature to detect display topology / DPI changes
monitors_json = json.dumps(monitors, sort_keys=True)
topology_sig = hashlib.sha256(monitors_json.encode('utf-8')).hexdigest()[:16]

# Primary display DPI
primary_dpi = None
for m in monitors:
    if m.get('isPrimary') and m.get('dpi'):
        primary_dpi = m['dpi']
        break
if not primary_dpi and monitors and monitors[0].get('dpi'):
    primary_dpi = monitors[0]['dpi']

out = {
    'windowStation': winsta,
    'desktop': desk,
    'isLocked': is_locked,
    'lockState': lock_state,
    'lockReason': lock_reason,
    'monitors': monitors,
    'systemDpi': primary_dpi or 96,
    'topologySignature': topology_sig,
    'virtualScreen': {
        'width': cx_virtual,
        'height': cy_virtual
    }
}

print(json.dumps(out))
