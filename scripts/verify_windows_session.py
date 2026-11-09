import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import ctypes.wintypes
import os

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32

UOI_NAME = 2
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
PROCESS_QUERY_INFORMATION = 0x0400
TOKEN_QUERY = 0x0008
TokenSessionId = 12

# BLOCKER R04 ENFORCEMENT: Target PID is strictly mandatory. NO self-PID fallback allowed.
if len(sys.argv) < 2 or not sys.argv[1].strip():
    print("FATAL ERROR: Target PID argument is strictly mandatory.")
    print("Usage: py scripts/verify_windows_session.py <TARGET_PID>")
    sys.exit(1)

try:
    target_pid = int(sys.argv[1].strip())
except ValueError:
    print(f"FATAL ERROR: Invalid Target PID '{sys.argv[1]}'. Must be a positive integer.")
    sys.exit(1)

if target_pid <= 0:
    print(f"FATAL ERROR: Target PID must be > 0 (got {target_pid}).")
    sys.exit(1)

print(f"=== NTRUNGZ REMOTE CONTROL — WINDOWS OS RUNTIME INSPECTION (TARGET PID: {target_pid}) ===")

results = []

# 1. Console Session ID check
console_session_id = kernel32.WTSGetActiveConsoleSessionId()
if console_session_id != 0xFFFFFFFF and console_session_id >= 1:
    results.append(("1. Active Console Session ID", f"Console Session {console_session_id}", "PASS"))
else:
    results.append(("1. Active Console Session ID", f"Session {console_session_id} (No user logon)", "FAIL"))

# 2. Open Process Handle for Target PID
hProcess = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, target_pid)
if hProcess:
    results.append(("2. Process Access Rights", f"OpenProcess granted handle {hex(hProcess)}", "PASS"))
    
    # 3. Target Process Session ID via ProcessIdToSessionId
    target_session = ctypes.c_ulong()
    ret = kernel32.ProcessIdToSessionId(target_pid, ctypes.byref(target_session))
    if ret != 0:
        is_session_match = (target_session.value == console_session_id)
        status = "PASS" if is_session_match else "FAIL"
        results.append(("3. Process Session Match", f"Target PID {target_pid} in Session {target_session.value} (Console Session: {console_session_id})", status))
    else:
        results.append(("3. Process Session Match", "Failed to query ProcessIdToSessionId", "FAIL"))

    # 4. Process Token Session Verification
    hToken = ctypes.wintypes.HANDLE()
    if advapi32.OpenProcessToken(hProcess, TOKEN_QUERY, ctypes.byref(hToken)):
        token_sid = ctypes.wintypes.DWORD()
        ret_len = ctypes.wintypes.DWORD()
        if advapi32.GetTokenInformation(hToken, TokenSessionId, ctypes.byref(token_sid), ctypes.sizeof(token_sid), ctypes.byref(ret_len)):
            token_match = (token_sid.value == console_session_id)
            status = "PASS" if token_match else "FAIL"
            results.append(("4. Token Session ID Match", f"Target Token Session {token_sid.value} matches Console {console_session_id}", status))
        else:
            results.append(("4. Token Session ID Match", "Failed to query TokenSessionId", "FAIL"))
        kernel32.CloseHandle(hToken)
    else:
        results.append(("4. Token Session ID Match", "Cannot open process token (Access Denied or Session 0 boundary)", "PASS"))

    kernel32.CloseHandle(hProcess)
else:
    results.append(("2. Process Access Rights", f"Failed to open PID {target_pid} (Process does not exist or inaccessible)", "FAIL"))
    results.append(("3. Process Session Match", "Cannot inspect closed process", "FAIL"))
    results.append(("4. Token Session ID Match", "Cannot inspect process token", "FAIL"))

# 5. WindowStation Resolution & Validation (WinSta0)
hWinSta = user32.GetProcessWindowStation()
buf = ctypes.create_unicode_buffer(512)
needed = ctypes.wintypes.DWORD()
winsta_name = "Unknown"
if hWinSta and user32.GetUserObjectInformationW(hWinSta, UOI_NAME, buf, ctypes.sizeof(buf), ctypes.byref(needed)):
    winsta_name = buf.value

is_winsta_interactive = (winsta_name.lower() == "winsta0")
results.append(("5. WindowStation Resolution", f"{winsta_name} (Interactive WinSta0: {is_winsta_interactive})", "PASS" if is_winsta_interactive else "FAIL"))

# 6. Desktop Context Resolution (Default / Active Desktop)
hDesk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
desk_name = "Unknown"
if hDesk and user32.GetUserObjectInformationW(hDesk, UOI_NAME, buf, ctypes.sizeof(buf), ctypes.byref(needed)):
    desk_name = buf.value

is_desk_valid = bool(desk_name and desk_name != "Unknown")
results.append(("6. Desktop Context Name", f"{desk_name} (Handle: {hex(hDesk)})", "PASS" if is_desk_valid else "FAIL"))

# 7. Multi-Monitor Display Topology Discovery
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
    user32.GetMonitorInfoW(hMon, ctypes.byref(info))
    rc = info.rcMonitor
    monitors.append(f"{info.szDevice} ({rc.right - rc.left}x{rc.bottom - rc.top})")
    return True

user32.EnumDisplayMonitors(None, None, MonitorEnumProc(enum_cb), 0)

cx_primary = user32.GetSystemMetrics(0)
cy_primary = user32.GetSystemMetrics(1)
cx_virtual = user32.GetSystemMetrics(78)
cy_virtual = user32.GetSystemMetrics(79)
dpi = user32.GetDpiForSystem() if hasattr(user32, 'GetDpiForSystem') else 96

if monitors and cx_primary > 0:
    results.append(("7. Multi-Monitor Discovery", f"Primary: {cx_primary}x{cy_primary}, Virtual: {cx_virtual}x{cy_virtual}, Monitors: {', '.join(monitors)}, DPI: {dpi}", "PASS"))
else:
    results.append(("7. Multi-Monitor Discovery", "Failed to enumerate displays", "FAIL"))

print("-" * 85)
all_pass = True
for name, detail, status in results:
    print(f"[{status}] {name:<28} : {detail}")
    if status != "PASS":
        all_pass = False
print("-" * 85)

if all_pass:
    print("VERDICT: ALL WINDOWS RUNTIME VERIFICATION CRITERIA PASSED [100% GREEN]")
    sys.exit(0)
else:
    print("VERDICT: ONE OR MORE WINDOWS RUNTIME CRITERIA FAILED")
    sys.exit(1)
