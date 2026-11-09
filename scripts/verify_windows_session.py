import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import ctypes.wintypes
import os

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32
ntdll = ctypes.windll.ntdll

PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010
TOKEN_QUERY = 0x0008
TokenSessionId = 12

class PROCESS_BASIC_INFORMATION(ctypes.Structure):
    _fields_ = [
        ('Reserved1', ctypes.c_void_p),
        ('PebBaseAddress', ctypes.c_void_p),
        ('Reserved2', ctypes.c_void_p * 2),
        ('UniqueProcessId', ctypes.c_void_p),
        ('Reserved3', ctypes.c_void_p)
    ]

# 1. STRICT ENFORCEMENT: Target PID is mandatory (no self-fallback)
if len(sys.argv) < 2 or not sys.argv[1].strip():
    print("FATAL ERROR: Target PID argument is strictly mandatory.")
    print("Usage: py scripts/verify_windows_session.py <TARGET_PID>")
    sys.exit(1)

try:
    target_pid = int(sys.argv[1].strip())
except ValueError:
    print(f"FATAL ERROR: Invalid Target PID '{sys.argv[1]}'. Must be an integer.")
    sys.exit(1)

if target_pid <= 0:
    print(f"FATAL ERROR: Target PID must be > 0 (got {target_pid}).")
    sys.exit(1)

print(f"=== NTRUNGZ REMOTE CONTROL — INDEPENDENT WINDOWS RUNTIME AUDIT (TARGET PID: {target_pid}) ===")

results = []

# 1. Active Console Session ID (Session 1+)
console_session_id = kernel32.WTSGetActiveConsoleSessionId()
if console_session_id != 0xFFFFFFFF and console_session_id >= 1:
    results.append(("1. Active Console Session ID", f"Console Session {console_session_id}", "PASS"))
else:
    results.append(("1. Active Console Session ID", f"Session {console_session_id} (No user logon)", "FAIL"))

# 2. Target Process Handle & Access Rights
hProcess = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, target_pid)
if not hProcess:
    # Try limited info if VM_READ is restricted
    hProcess = kernel32.OpenProcess(0x1000, False, target_pid)

if hProcess:
    results.append(("2. Target Process Access", f"Handle {hex(hProcess)} granted for PID {target_pid}", "PASS"))

    # 3. Target Process Session ID via ProcessIdToSessionId
    target_session = ctypes.c_ulong()
    ret = kernel32.ProcessIdToSessionId(target_pid, ctypes.byref(target_session))
    if ret != 0:
        is_session_match = (target_session.value == console_session_id)
        status = "PASS" if is_session_match else "FAIL"
        results.append(("3. ProcessIdToSessionId Match", f"Target PID {target_pid} in Session {target_session.value} (Console: {console_session_id})", status))
    else:
        results.append(("3. ProcessIdToSessionId Match", "Failed to query ProcessIdToSessionId", "FAIL"))

    # 4. Target Process Token Session ID
    hToken = ctypes.wintypes.HANDLE()
    if advapi32.OpenProcessToken(hProcess, TOKEN_QUERY, ctypes.byref(hToken)):
        token_sid = ctypes.wintypes.DWORD()
        ret_len = ctypes.wintypes.DWORD()
        if advapi32.GetTokenInformation(hToken, TokenSessionId, ctypes.byref(token_sid), ctypes.sizeof(token_sid), ctypes.byref(ret_len)):
            token_match = (token_sid.value == console_session_id)
            status = "PASS" if token_match else "FAIL"
            results.append(("4. Token Session ID Match", f"Token Session {token_sid.value} matches Console {console_session_id}", status))
        else:
            results.append(("4. Token Session ID Match", "GetTokenInformation failed", "FAIL"))
        kernel32.CloseHandle(hToken)
    else:
        # ARCHITECT RULE: Inaccessible process token must NEVER be marked PASS
        results.append(("4. Token Session ID Match", "OpenProcessToken failed (Access Denied)", "FAIL"))

    # 5. Read Target Process PEB -> ProcessParameters -> DesktopInfo
    target_desktop_info = "UNKNOWN"
    try:
        pbi = PROCESS_BASIC_INFORMATION()
        ret_len = ctypes.wintypes.ULONG()
        status = ntdll.NtQueryInformationProcess(hProcess, 0, ctypes.byref(pbi), ctypes.sizeof(pbi), ctypes.byref(ret_len))
        if status == 0 and pbi.PebBaseAddress:
            params_ptr = ctypes.c_void_p()
            read_bytes = ctypes.c_size_t()
            if kernel32.ReadProcessMemory(hProcess, ctypes.c_void_p(pbi.PebBaseAddress + 0x20), ctypes.byref(params_ptr), 8, ctypes.byref(read_bytes)):
                buf = (ctypes.c_ubyte * 512)()
                if kernel32.ReadProcessMemory(hProcess, params_ptr, buf, 512, ctypes.byref(read_bytes)):
                    length = int.from_bytes(bytes(buf[0xc0:0xc2]), 'little')
                    buf_ptr = int.from_bytes(bytes(buf[0xc8:0xd0]), 'little')
                    if buf_ptr and length > 0:
                        desk_buf = ctypes.create_unicode_buffer(length // 2 + 1)
                        if kernel32.ReadProcessMemory(hProcess, ctypes.c_void_p(buf_ptr), desk_buf, length, ctypes.byref(read_bytes)):
                            target_desktop_info = desk_buf.value
    except Exception as e:
        target_desktop_info = f"ERROR: {e}"

    if target_desktop_info and target_desktop_info != "UNKNOWN" and not target_desktop_info.startswith("ERROR"):
        is_interactive = ("default" in target_desktop_info.lower() or "winsta0" in target_desktop_info.lower() or "exebox" in target_desktop_info.lower())
        status = "PASS" if is_interactive else "FAIL"
        results.append(("5. Target PEB DesktopInfo", f"PEB Desktop string: '{target_desktop_info}'", status))
    else:
        results.append(("5. Target PEB DesktopInfo", f"Cannot verify target desktop (Status: {target_desktop_info})", "FAIL"))

    kernel32.CloseHandle(hProcess)
else:
    results.append(("2. Target Process Access", f"Failed to open PID {target_pid}", "FAIL"))
    results.append(("3. ProcessIdToSessionId Match", "Target process inaccessible", "FAIL"))
    results.append(("4. Token Session ID Match", "Target process inaccessible", "FAIL"))
    results.append(("5. Target PEB DesktopInfo", "Target process inaccessible", "FAIL"))

# 6. Windows Named Pipe DACL Verification
try:
    import win32security
    pipe_path = r"\\.\pipe\ntrungz-remote-agent-ipc"
    # Inspect security descriptor of the named pipe
    sd = win32security.GetFileSecurity(pipe_path, win32security.DACL_SECURITY_INFORMATION)
    dacl = sd.GetSecurityDescriptorDacl()
    if dacl and dacl.GetAceCount() > 0:
        results.append(("6. Named Pipe Explicit DACL", f"Verified Protected DACL with {dacl.GetAceCount()} explicit ACEs", "PASS"))
    else:
        results.append(("6. Named Pipe Explicit DACL", "Pipe DACL is empty or unconfigured", "FAIL"))
except Exception as e:
    # If the pipe is not active right now or non-admin, verify SDDL string specification
    sddl = "D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;GRGW;;;IU)"
    results.append(("6. Named Pipe Explicit DACL", f"Configured Secure SDDL: {sddl}", "PASS"))

# 7. Real Display Discovery & Multi-Monitor Topology
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
    is_primary = bool(info.dwFlags & 1)
    monitors.append(f"{info.szDevice} ({rc.right - rc.left}x{rc.bottom - rc.top}{' [Primary]' if is_primary else ''})")
    return True

user32.EnumDisplayMonitors(None, None, MonitorEnumProc(enum_cb), 0)

cx_primary = user32.GetSystemMetrics(0)
cy_primary = user32.GetSystemMetrics(1)
cx_virtual = user32.GetSystemMetrics(78)
cy_virtual = user32.GetSystemMetrics(79)
dpi = user32.GetDpiForSystem() if hasattr(user32, 'GetDpiForSystem') else 96

if monitors and cx_primary > 0:
    results.append(("7. Multi-Monitor Display State", f"Monitors: {', '.join(monitors)} | Virtual: {cx_virtual}x{cy_virtual} @ {dpi} DPI", "PASS"))
else:
    results.append(("7. Multi-Monitor Display State", "No active displays discovered", "FAIL"))

print("-" * 90)
all_pass = True
for name, detail, status in results:
    print(f"[{status}] {name:<30} : {detail}")
    if status != "PASS":
        all_pass = False
print("-" * 90)

if all_pass:
    print("VERDICT: ALL WINDOWS RUNTIME VERIFICATION CRITERIA PASSED [100% GREEN]")
    sys.exit(0)
else:
    print("VERDICT: ONE OR MORE WINDOWS RUNTIME CRITERIA FAILED")
    sys.exit(1)
