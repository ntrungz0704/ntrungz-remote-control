import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import json
import base64
import ctypes
import ctypes.wintypes

k = ctypes.windll.kernel32
a = ctypes.windll.advapi32
w = ctypes.windll.wtsapi32
u = ctypes.windll.userenv

class STARTUPINFOW(ctypes.Structure):
    _fields_ = [
        ('cb', ctypes.wintypes.DWORD),
        ('lpReserved', ctypes.c_wchar_p),
        ('lpDesktop', ctypes.c_wchar_p),
        ('lpTitle', ctypes.c_wchar_p),
        ('dwX', ctypes.wintypes.DWORD),
        ('dwY', ctypes.wintypes.DWORD),
        ('dwXSize', ctypes.wintypes.DWORD),
        ('dwYSize', ctypes.wintypes.DWORD),
        ('dwXCountChars', ctypes.wintypes.DWORD),
        ('dwYCountChars', ctypes.wintypes.DWORD),
        ('dwFillAttribute', ctypes.wintypes.DWORD),
        ('dwFlags', ctypes.wintypes.DWORD),
        ('wShowWindow', ctypes.wintypes.WORD),
        ('cbReserved2', ctypes.wintypes.WORD),
        ('lpReserved2', ctypes.c_char_p),
        ('hStdInput', ctypes.c_void_p),
        ('hStdOutput', ctypes.c_void_p),
        ('hStdError', ctypes.c_void_p),
    ]

class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [
        ('hProcess', ctypes.c_void_p),
        ('hThread', ctypes.c_void_p),
        ('dwProcessId', ctypes.wintypes.DWORD),
        ('dwThreadId', ctypes.wintypes.DWORD),
    ]

def launch_interactive_process(target_session_id, command_line, workdir=None, extra_env=None):
    if target_session_id <= 0 or target_session_id == 0xFFFFFFFF:
        raise ValueError(f"Invalid target interactive session ID: {target_session_id}")

    si = STARTUPINFOW()
    si.cb = ctypes.sizeof(STARTUPINFOW)
    si.lpDesktop = 'winsta0\\default'
    si.dwFlags = 0x00000100 # STARTF_USESTDHANDLES
    si.hStdInput = None
    si.hStdOutput = None
    si.hStdError = None
    pi = PROCESS_INFORMATION()

    # Determine current execution context
    cur_session = ctypes.wintypes.DWORD()
    k.ProcessIdToSessionId(os.getpid(), ctypes.byref(cur_session))

    hToken = ctypes.c_void_p()
    hPrimaryToken = ctypes.c_void_p()
    pEnv = ctypes.c_void_p()
    # DETACHED_PROCESS (0x00000008) + CREATE_NEW_PROCESS_GROUP (0x00000200)
    creation_flags = 0x00000008 | 0x00000200

    # Setup environment in both Python and Win32 kernel environment block
    if extra_env:
        for k_env, v_env in extra_env.items():
            os.environ[str(k_env)] = str(v_env)
            k.SetEnvironmentVariableW(str(k_env), str(v_env))

    launched = False

    # Path A: Session 0 Windows Service or LocalSystem process with SeTcbPrivilege
    if cur_session.value == 0:
        if w.WTSQueryUserToken(target_session_id, ctypes.byref(hToken)):
            if a.DuplicateTokenEx(hToken, 0x10000000, None, 2, 1, ctypes.byref(hPrimaryToken)):
                u.CreateEnvironmentBlock(ctypes.byref(pEnv), hPrimaryToken, False)
                res = a.CreateProcessAsUserW(
                    hPrimaryToken,
                    None,
                    ctypes.c_wchar_p(command_line),
                    None,
                    None,
                    False,
                    creation_flags | 0x00000400, # CREATE_UNICODE_ENVIRONMENT
                    pEnv,
                    workdir,
                    ctypes.byref(si),
                    ctypes.byref(pi)
                )
                if res:
                    launched = True
            if hToken:
                k.CloseHandle(hToken)
            if hPrimaryToken:
                k.CloseHandle(hPrimaryToken)

    # Path B: Running directly within the target interactive session
    if not launched and cur_session.value == target_session_id:
        res = k.CreateProcessW(
            None,
            ctypes.c_wchar_p(command_line),
            None,
            None,
            False,
            creation_flags,
            None,
            workdir,
            ctypes.byref(si),
            ctypes.byref(pi)
        )
        if res:
            launched = True

    if not launched:
        err = k.GetLastError()
        raise RuntimeError(f"Native process creation failed for session {target_session_id} (LastError={err})")

    pid = pi.dwProcessId

    # Post-creation mandatory verification (Fail-Closed)
    proc_sid = ctypes.wintypes.DWORD()
    if not k.ProcessIdToSessionId(pid, ctypes.byref(proc_sid)):
        k.TerminateProcess(pi.hProcess, 1)
        k.CloseHandle(pi.hProcess)
        k.CloseHandle(pi.hThread)
        raise RuntimeError("ProcessIdToSessionId failed on newly created process")

    if proc_sid.value != target_session_id:
        k.TerminateProcess(pi.hProcess, 1)
        k.CloseHandle(pi.hProcess)
        k.CloseHandle(pi.hThread)
        raise RuntimeError(f"Session mismatch: target={target_session_id}, actual={proc_sid.value}")

    # Verify Token Session ID (BLOCKER R01: Fail-Closed)
    hCreatedToken = ctypes.c_void_p()
    if not a.OpenProcessToken(pi.hProcess, 0x0008, ctypes.byref(hCreatedToken)):
        k.TerminateProcess(pi.hProcess, 1)
        k.CloseHandle(pi.hProcess)
        k.CloseHandle(pi.hThread)
        raise RuntimeError(f"OpenProcessToken failed on newly created process (PID {pid}, error={k.GetLastError()})")

    tok_sid = ctypes.wintypes.DWORD()
    ret_len = ctypes.wintypes.DWORD()
    ok = a.GetTokenInformation(hCreatedToken, 12, ctypes.byref(tok_sid), 4, ctypes.byref(ret_len))
    k.CloseHandle(hCreatedToken)
    if not ok:
        k.TerminateProcess(pi.hProcess, 1)
        k.CloseHandle(pi.hProcess)
        k.CloseHandle(pi.hThread)
        raise RuntimeError(f"GetTokenInformation(TokenSessionId) failed on PID {pid}")

    if tok_sid.value != target_session_id:
        k.TerminateProcess(pi.hProcess, 1)
        k.CloseHandle(pi.hProcess)
        k.CloseHandle(pi.hThread)
        raise RuntimeError(f"Token session mismatch on PID {pid}: target={target_session_id}, actual={tok_sid.value}")

    k.CloseHandle(pi.hProcess)
    k.CloseHandle(pi.hThread)

    return {
        'status': 'SUCCESS',
        'pid': pid,
        'targetSessionId': target_session_id,
        'actualSessionId': proc_sid.value,
        'desktop': 'winsta0\\default'
    }

def check_process_status(pid):
    h = k.OpenProcess(0x1000, False, pid) # PROCESS_QUERY_LIMITED_INFORMATION
    if not h:
        return {'running': False, 'exitCode': -1}
    exit_code = ctypes.wintypes.DWORD()
    k.GetExitCodeProcess(h, ctypes.byref(exit_code))
    k.CloseHandle(h)
    is_active = (exit_code.value == 259) # STILL_ACTIVE
    return {
        'running': is_active,
        'exitCode': None if is_active else exit_code.value
    }

def terminate_process_pid(pid):
    h = k.OpenProcess(0x0001, False, pid) # PROCESS_TERMINATE
    if not h:
        return {'status': 'ALREADY_TERMINATED'}
    res = k.TerminateProcess(h, 1)
    k.CloseHandle(h)
    return {'status': 'SUCCESS' if res else 'FAILED'}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'status': 'ERROR', 'error': 'Missing action'}))
        sys.exit(1)

    action = sys.argv[1]

    if action == 'status':
        pid = int(sys.argv[2])
        print(json.dumps(check_process_status(pid)))
        sys.exit(0)

    if action == 'kill':
        pid = int(sys.argv[2])
        print(json.dumps(terminate_process_pid(pid)))
        sys.exit(0)

    # Default action: spawn
    target_sid = int(sys.argv[1])
    raw_cmd = sys.argv[2]
    try:
        cmd = base64.b64decode(raw_cmd).decode('utf-8')
    except Exception:
        cmd = raw_cmd

    extra_env = {}
    if len(sys.argv) > 3:
        raw_env = sys.argv[3]
        try:
            extra_env = json.loads(base64.b64decode(raw_env).decode('utf-8'))
        except Exception:
            try:
                extra_env = json.loads(raw_env)
            except Exception:
                extra_env = {}

    try:
        res = launch_interactive_process(target_sid, cmd, extra_env=extra_env)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({'status': 'ERROR', 'error': str(e)}))
        sys.exit(1)
