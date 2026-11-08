import sys
sys.stdout.reconfigure(encoding='utf-8')
import ctypes
import os

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

print("=== NTRUNGZ REMOTE CONTROL — WINDOWS OS RUNTIME INSPECTION ===")
console_session_id = kernel32.WTSGetActiveConsoleSessionId()
print(f"1. Active Console Session ID: {console_session_id} (Session 1+ = Interactive User Session)")

hWinSta = user32.GetProcessWindowStation()
print(f"2. Current Process WindowStation Handle: {hex(hWinSta) if hWinSta else 'None'}")

hDesk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
print(f"3. Current Thread Desktop Handle: {hex(hDesk) if hDesk else 'None'}")

# Screen metrics
sm_cxscreen = user32.GetSystemMetrics(0) # SM_CXSCREEN
sm_cyscreen = user32.GetSystemMetrics(1) # SM_CYSCREEN
sm_cxvirtual = user32.GetSystemMetrics(78) # SM_CXVIRTUALSCREEN
sm_cyvirtual = user32.GetSystemMetrics(79) # SM_CYVIRTUALSCREEN
print(f"4. Primary Monitor Resolution: {sm_cxscreen}x{sm_cyscreen}")
print(f"5. Virtual Desktop Resolution: {sm_cxvirtual}x{sm_cyvirtual}")

dpi = user32.GetDpiForSystem() if hasattr(user32, 'GetDpiForSystem') else 96
print(f"6. System DPI: {dpi}")
print("=== WINDOWS OS RUNTIME INSPECTION: READY FOR PHASE 3B DXGI CAPTURE ===")
