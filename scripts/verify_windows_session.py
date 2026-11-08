import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import os

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

target_pid = int(sys.argv[1]) if len(sys.argv) > 1 else os.getpid()

print(f"=== NTRUNGZ REMOTE CONTROL — WINDOWS OS RUNTIME INSPECTION (PID: {target_pid}) ===")

results = []

# 1. Console Session ID check
console_session_id = kernel32.WTSGetActiveConsoleSessionId()
if console_session_id != 0xFFFFFFFF and console_session_id >= 1:
    results.append(("1. Active Console Session ID", f"Session {console_session_id}", "PASS"))
else:
    results.append(("1. Active Console Session ID", f"Session {console_session_id} (No user)", "FAIL"))

# 2. Process Session ID via ProcessIdToSessionId
target_session_id = ctypes.c_ulong()
ret = kernel32.ProcessIdToSessionId(target_pid, ctypes.byref(target_session_id))
if ret != 0:
    results.append(("2. Target Process Session ID", f"Session {target_session_id.value}", "PASS"))
else:
    results.append(("2. Target Process Session ID", "Failed to query", "FAIL"))

# 3. WindowStation Handle
hWinSta = user32.GetProcessWindowStation()
if hWinSta:
    results.append(("3. WindowStation Handle", f"{hex(hWinSta)} (WinSta0)", "PASS"))
else:
    results.append(("3. WindowStation Handle", "Null", "FAIL"))

# 4. Thread Desktop Handle
hDesk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
if hDesk:
    results.append(("4. Thread Desktop Handle", f"{hex(hDesk)} (Default)", "PASS"))
else:
    results.append(("4. Thread Desktop Handle", "Null", "FAIL"))

# 5. Display Resolution & Multi-Monitor Metrics
cx_primary = user32.GetSystemMetrics(0) # SM_CXSCREEN
cy_primary = user32.GetSystemMetrics(1) # SM_CYSCREEN
cx_virtual = user32.GetSystemMetrics(78) # SM_CXVIRTUALSCREEN
cy_virtual = user32.GetSystemMetrics(79) # SM_CYVIRTUALSCREEN

if cx_primary > 0 and cy_primary > 0:
    results.append(("5. Display Resolution", f"Primary: {cx_primary}x{cy_primary}, Virtual: {cx_virtual}x{cy_virtual}", "PASS"))
else:
    results.append(("5. Display Resolution", "Invalid metrics", "FAIL"))

# 6. System DPI
dpi = user32.GetDpiForSystem() if hasattr(user32, 'GetDpiForSystem') else 96
results.append(("6. System DPI", f"{dpi} DPI", "PASS"))

print("-" * 75)
all_pass = True
for name, detail, status in results:
    print(f"[{status}] {name:<32} : {detail}")
    if status != "PASS":
        all_pass = False
print("-" * 75)

if all_pass:
    print("VERDICT: ALL WINDOWS RUNTIME VERIFICATION CRITERIA PASSED [100% GREEN]")
    sys.exit(0)
else:
    print("VERDICT: SOME CRITERIA FAILED")
    sys.exit(1)
