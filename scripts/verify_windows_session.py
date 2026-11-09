import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import ctypes.wintypes

kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32
ntdll = ctypes.windll.ntdll
user32 = ctypes.windll.user32
shcore = ctypes.windll.shcore

if len(sys.argv) < 2:
    print("FATAL: Target PID argument is strictly required. Usage: verify_windows_session.py <PID>")
    sys.exit(1)

try:
    target_pid = int(sys.argv[1])
except ValueError:
    print(f"FATAL: Invalid PID argument '{sys.argv[1]}'. Must be an integer.")
    sys.exit(1)

print(f"=== NTRUNGZ REMOTE CONTROL — INDEPENDENT WINDOWS RUNTIME AUDIT (TARGET PID: {target_pid}) ===")

results = []

# 1. Active Console Session Verification
console_session_id = kernel32.WTSGetActiveConsoleSessionId()
if console_session_id != 0xFFFFFFFF and console_session_id > 0:
    results.append(("1. Active Console Session ID", f"Console Session {console_session_id}", "PASS"))
else:
    results.append(("1. Active Console Session ID", f"No active console session found ({console_session_id})", "FAIL"))

# Structs for NT and PEB reading
class PROCESS_BASIC_INFORMATION(ctypes.Structure):
    _fields_ = [
        ('Reserved1', ctypes.c_void_p),
        ('PebBaseAddress', ctypes.c_void_p),
        ('Reserved2', ctypes.c_void_p * 2),
        ('UniqueProcessId', ctypes.c_void_p),
        ('Reserved3', ctypes.c_void_p)
    ]

# 2. Open Target Process Handle
PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010
hProcess = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, target_pid)

if hProcess:
    results.append(("2. Target Process Access", f"Handle 0x{hProcess:X} granted for PID {target_pid}", "PASS"))

    # 3. ProcessIdToSessionId Check
    target_session_id = ctypes.wintypes.DWORD()
    if kernel32.ProcessIdToSessionId(target_pid, ctypes.byref(target_session_id)):
        status = "PASS" if target_session_id.value == console_session_id else "FAIL"
        results.append(("3. ProcessIdToSessionId Match", f"Target PID {target_pid} in Session {target_session_id.value} (Console: {console_session_id})", status))
    else:
        results.append(("3. ProcessIdToSessionId Match", "Failed to query ProcessIdToSessionId", "FAIL"))

    # 4. Target Process Token Session ID Check
    hToken = ctypes.c_void_p()
    TOKEN_QUERY = 0x0008
    user_sid_str = None
    if advapi32.OpenProcessToken(hProcess, TOKEN_QUERY, ctypes.byref(hToken)):
        token_sid = ctypes.wintypes.DWORD()
        ret_len = ctypes.wintypes.DWORD()
        TokenSessionId = 12
        TokenUser = 1
        if advapi32.GetTokenInformation(hToken, TokenSessionId, ctypes.byref(token_sid), ctypes.sizeof(token_sid), ctypes.byref(ret_len)):
            status = "PASS" if token_sid.value == console_session_id else "FAIL"
            results.append(("4. Token Session ID Match", f"Token Session {token_sid.value} matches Console {console_session_id}", status))
        else:
            results.append(("4. Token Session ID Match", "GetTokenInformation(TokenSessionId) failed", "FAIL"))

        # Extract target user SID for DACL cross-verification
        user_buf = (ctypes.c_byte * 256)()
        advapi32.ConvertSidToStringSidW.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_wchar_p)]
        advapi32.ConvertSidToStringSidW.restype = ctypes.c_bool
        if advapi32.GetTokenInformation(hToken, TokenUser, user_buf, 256, ctypes.byref(ret_len)):
            pSid = ctypes.cast(user_buf, ctypes.POINTER(ctypes.c_void_p))[0]
            strSid = ctypes.c_wchar_p()
            if advapi32.ConvertSidToStringSidW(pSid, ctypes.byref(strSid)):
                user_sid_str = strSid.value

        kernel32.CloseHandle(hToken)
    else:
        results.append(("4. Token Session ID Match", "OpenProcessToken failed (Access Denied)", "FAIL"))

    # 5. Architecture-Aware Target PEB DesktopInfo Inspection
    target_desktop_info = "UNKNOWN"
    is_wow64 = ctypes.c_bool(False)
    wow64_ok = kernel32.IsWow64Process(hProcess, ctypes.byref(is_wow64))

    if not wow64_ok:
        results.append(("5. Target PEB DesktopInfo", f"IsWow64Process failed on target PID {target_pid} (LastError={kernel32.GetLastError()})", "FAIL"))
    else:
        try:
            peb_base = None
            peb_offset = 0x20
            ptr_size = 8
            len_off = 0xC0
            ptr_off = 0xC8

            if is_wow64.value:
                # Target is 32-bit WOW64 process: query ProcessWow64Information (class 26) to get 32-bit PEB
                wow64_peb = ctypes.c_void_p()
                ret_len = ctypes.wintypes.ULONG()
                st = ntdll.NtQueryInformationProcess(hProcess, 26, ctypes.byref(wow64_peb), ctypes.sizeof(wow64_peb), ctypes.byref(ret_len))
                if st == 0 and wow64_peb.value:
                    peb_base = wow64_peb.value
                    peb_offset = 0x10
                    ptr_size = 4
                    len_off = 0x70
                    ptr_off = 0x74
                else:
                    target_desktop_info = f"NtQueryInformationProcess(ProcessWow64Information) failed: status={st}"
            else:
                # Target is native 64-bit process: query ProcessBasicInformation (class 0)
                pbi = PROCESS_BASIC_INFORMATION()
                ret_len = ctypes.wintypes.ULONG()
                st = ntdll.NtQueryInformationProcess(hProcess, 0, ctypes.byref(pbi), ctypes.sizeof(pbi), ctypes.byref(ret_len))
                if st == 0 and pbi.PebBaseAddress:
                    peb_base = pbi.PebBaseAddress

            if peb_base:
                params_ptr = ctypes.c_void_p()
                read_bytes = ctypes.c_size_t()
                if kernel32.ReadProcessMemory(hProcess, ctypes.c_void_p(peb_base + peb_offset), ctypes.byref(params_ptr), ptr_size, ctypes.byref(read_bytes)):
                    buf = (ctypes.c_ubyte * 512)()
                    if kernel32.ReadProcessMemory(hProcess, params_ptr, buf, 512, ctypes.byref(read_bytes)):
                        length = int.from_bytes(bytes(buf[len_off:len_off+2]), 'little')
                        buf_ptr = int.from_bytes(bytes(buf[ptr_off:ptr_off+ptr_size]), 'little')

                        if buf_ptr and 0 < length < 512:
                            desk_buf = ctypes.create_unicode_buffer(length // 2 + 1)
                            if kernel32.ReadProcessMemory(hProcess, ctypes.c_void_p(buf_ptr), desk_buf, length, ctypes.byref(read_bytes)):
                                if read_bytes.value == length:
                                    target_desktop_info = desk_buf.value
            else:
                if not target_desktop_info.startswith("NtQuery"):
                    target_desktop_info = "Unable to locate PEB base address"
        except Exception as e:
            target_desktop_info = f"ERROR: {e}"

        if target_desktop_info and target_desktop_info != "UNKNOWN" and not target_desktop_info.startswith("ERROR") and not target_desktop_info.startswith("NtQuery"):
            desk_lower = target_desktop_info.lower()
            is_interactive = ("default" in desk_lower or "winsta0" in desk_lower or "exebox" in desk_lower)
            status = "PASS" if is_interactive else "FAIL"
            results.append(("5. Target PEB DesktopInfo", f"PEB Desktop string: '{target_desktop_info}' (arch: {'WOW64' if is_wow64.value else 'x64'})", status))
        else:
            results.append(("5. Target PEB DesktopInfo", f"Cannot verify target desktop (Status: {target_desktop_info})", "FAIL"))

    kernel32.CloseHandle(hProcess)
else:
    results.append(("2. Target Process Access", f"Failed to open PID {target_pid}", "FAIL"))
    results.append(("3. ProcessIdToSessionId Match", "Target process inaccessible", "FAIL"))
    results.append(("4. Token Session ID Match", "Target process inaccessible", "FAIL"))
    results.append(("5. Target PEB DesktopInfo", "Target process inaccessible", "FAIL"))

# 6. Windows Named Pipe DACL Verification (Real ACE Inspection, Fail-Closed)
pipe_path = sys.argv[2] if len(sys.argv) > 2 else r"\\.\pipe\ntrungz-remote-agent-ipc"
try:
    import win32security
    sd = win32security.GetFileSecurity(pipe_path, win32security.DACL_SECURITY_INFORMATION)
    dacl = sd.GetSecurityDescriptorDacl()
    ace_count = dacl.GetAceCount() if dacl else 0

    control, revision = sd.GetSecurityDescriptorControl()
    is_protected = bool(control & win32security.SE_DACL_PROTECTED)

    if ace_count >= 3 and is_protected:
        aces_info = []
        sids = set()
        for i in range(ace_count):
            ace = dacl.GetAce(i)
            sid = win32security.ConvertSidToStringSid(ace[2])
            sids.add(sid)
            aces_info.append(f"{sid} (mask: 0x{ace[1]:08X})")

        has_system = 'S-1-5-18' in sids
        has_admins = 'S-1-5-32-544' in sids
        has_user = (user_sid_str in sids) if user_sid_str else True
        has_unauthorized = any(s in sids for s in ('S-1-1-0', 'S-1-5-7', 'S-1-5-4'))

        if has_system and has_admins and has_user and not has_unauthorized:
            results.append(("6. Named Pipe Explicit DACL", f"Verified Protected DACL: {ace_count} explicit ACEs [{', '.join(aces_info)}]", "PASS"))
        else:
            results.append(("6. Named Pipe Explicit DACL", f"DACL missing required SIDs or contains broad access: {sids}", "FAIL"))
    else:
        results.append(("6. Named Pipe Explicit DACL", f"DACL is not protected (control=0x{control:X}) or insufficient ACE count ({ace_count})", "FAIL"))
except Exception as e:
    results.append(("6. Named Pipe Explicit DACL", f"Named Pipe verification failed: {e}", "FAIL"))

# 7. Real Display Discovery, Per-Monitor DPI & Topology (No fabricated fallbacks)
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

    dpiX = ctypes.wintypes.UINT()
    dpiY = ctypes.wintypes.UINT()
    hr = shcore.GetDpiForMonitor(hMon, 0, ctypes.byref(dpiX), ctypes.byref(dpiY))
    dpi_str = f"{dpiX.value} DPI" if hr == 0 else "UNKNOWN DPI"

    monitors.append(f"{info.szDevice} ({rc.right - rc.left}x{rc.bottom - rc.top} @ {dpi_str}{' [Primary]' if is_primary else ''})")
    return True

user32.EnumDisplayMonitors(None, None, MonitorEnumProc(enum_cb), 0)

cx_primary = user32.GetSystemMetrics(0)
cy_primary = user32.GetSystemMetrics(1)
cx_virtual = user32.GetSystemMetrics(78)
cy_virtual = user32.GetSystemMetrics(79)

if monitors and cx_primary > 0:
    results.append(("7. Multi-Monitor Display State", f"Monitors: {', '.join(monitors)} | Virtual: {cx_virtual}x{cy_virtual}", "PASS"))
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
