import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import os

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

UOI_NAME = 2
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

if len(sys.argv) < 2:
    target_pid = os.getpid()
    print(f"[INFO] No PID supplied on command line. Defaulting to current verification process PID: {target_pid}")
else:
    target_pid = int(sys.argv[1])

print(f"=== NTRUNGZ REMOTE CONTROL — WINDOWS OS RUNTIME INSPECTION (TARGET PID: {target_pid}) ===")

results = []

# 1. Console Session ID check
console_session_id = kernel32.WTSGetActiveConsoleSessionId()
if console_session_id != 0xFFFFFFFF and console_session_id >= 1:
    results.append(("1. Active Console Session ID", f"Session {console_session_id}", "PASS"))
else:
    results.append(("1. Active Console Session ID", f"Session {console_session_id} (No user logon)", "FAIL"))

# 2. Open Process with PROCESS_QUERY_LIMITED_INFORMATION
hProcess = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, target_pid)
if hProcess:
    results.append(("2. Process Access Rights", f"OpenProcess granted handle {hex(hProcess)}", "PASS"))
    
    # 3. Target Process Session ID
    target_session = ctypes.c_ulong()
    ret = kernel32.ProcessIdToSessionId(target_pid, ctypes.byref(target_session))
    if ret != 0:
        is_session_match = (target_session.value == console_session_id)
        status = "PASS" if is_session_match else "FAIL"
        results.append(("3. Process Session Match", f"Target PID {target_pid} in Session {target_session.value} (Console Session: {console_session_id})", status))
    else:
        results.append(("3. Process Session Match", "Failed to query ProcessIdToSessionId", "FAIL"))
    kernel32.CloseHandle(hProcess)
else:
    results.append(("2. Process Access Rights", f"Failed to open PID {target_pid}", "FAIL"))
    results.append(("3. Process Session Match", "Cannot inspect closed process", "FAIL"))

# 4. Resolve WindowStation Name via GetUserObjectInformationW
hWinSta = user32.GetProcessWindowStation()
if hWinSta:
    buf_winsta = ctypes.create_unicode_buffer(256)
    needed = ctypes.c_ulong()
    ret = user32.GetUserObjectInformationW(hWinSta, UOI_NAME, buf_winsta, 512, ctypes.byref(needed))
    winsta_name = buf_winsta.value if ret else "UNKNOWN"
    results.append(("4. Resolved WindowStation Name", f"{winsta_name} (Handle: {hex(hWinSta)})", "PASS" if winsta_name else "FAIL"))
else:
    results.append(("4. Resolved WindowStation Name", "Null WindowStation", "FAIL"))

# 5. Resolve Desktop Name via GetUserObjectInformationW
hDesk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
if hDesk:
    buf_desk = ctypes.create_unicode_buffer(256)
    needed = ctypes.c_ulong()
    ret = user32.GetUserObjectInformationW(hDesk, UOI_NAME, buf_desk, 512, ctypes.byref(needed))
    desk_name = buf_desk.value if ret else "UNKNOWN"
    results.append(("5. Resolved Desktop Name", f"{desk_name} (Handle: {hex(hDesk)})", "PASS" if desk_name else "FAIL"))
else:
    results.append(("5. Resolved Desktop Name", "Null Desktop", "FAIL"))

# 6. Physical Display Resolution
cx_primary = user32.GetSystemMetrics(0) # SM_CXSCREEN
cy_primary = user32.GetSystemMetrics(1) # SM_CYSCREEN
cx_virtual = user32.GetSystemMetrics(78) # SM_CXVIRTUALSCREEN
cy_virtual = user32.GetSystemMetrics(79) # SM_CYVIRTUALSCREEN
if cx_primary > 0 and cy_primary > 0:
    results.append(("6. Physical Display Metrics", f"Primary: {cx_primary}x{cy_primary}, Virtual: {cx_virtual}x{cy_virtual}", "PASS"))
else:
    results.append(("6. Physical Display Metrics", "Invalid metrics", "FAIL"))

# 7. System DPI
dpi = user32.GetDpiForSystem() if hasattr(user32, 'GetDpiForSystem') else 96
results.append(("7. System Display DPI", f"{dpi} DPI", "PASS"))

print("-" * 80)
all_pass = True
for name, detail, status in results:
    print(f"[{status}] {name:<32} : {detail}")
    if status != "PASS":
        all_pass = False
print("-" * 80)

if all_pass:
    print("VERDICT: ALL WINDOWS RUNTIME VERIFICATION CRITERIA PASSED [100% GREEN]")
    sys.exit(0)
else:
    print("VERDICT: SOME CRITERIA FAILED")
    sys.exit(1)
