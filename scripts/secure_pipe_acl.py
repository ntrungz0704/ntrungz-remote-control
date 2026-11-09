import sys
sys.stdout.reconfigure(encoding='utf-8')
import win32security
import win32file
import win32api
import json

def get_current_user_sid():
    token = win32security.OpenProcessToken(win32api.GetCurrentProcess(), win32security.TOKEN_QUERY)
    user_sid, _ = win32security.GetTokenInformation(token, win32security.TokenUser)
    return win32security.ConvertSidToStringSid(user_sid)

def apply_and_verify_pipe_dacl(pipe_name, user_sid=None):
    if not user_sid:
        user_sid = get_current_user_sid()

    # D:P prevents inheritance; gives GA to SYSTEM (SY) and Admins (BA), GRGW to specific user
    sddl = f"D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;GRGW;;;{user_sid})"
    sd = win32security.ConvertStringSecurityDescriptorToSecurityDescriptor(sddl, win32security.SDDL_REVISION_1)

    # Open pipe handle with WRITE_DAC | READ_CONTROL
    hPipe = win32file.CreateFile(
        pipe_name,
        0x00040000 | 0x00020000, # WRITE_DAC | READ_CONTROL
        0, None, win32file.OPEN_EXISTING, 0, None
    )

    # Set DACL
    win32security.SetKernelObjectSecurity(hPipe, win32security.DACL_SECURITY_INFORMATION, sd)

    # Immediately verify DACL
    sec = win32security.GetKernelObjectSecurity(hPipe, win32security.DACL_SECURITY_INFORMATION)
    dacl = sec.GetSecurityDescriptorDacl()
    ace_count = dacl.GetAceCount()

    aces = []
    for i in range(ace_count):
        ace = dacl.GetAce(i)
        sid_str = win32security.ConvertSidToStringSid(ace[2])
        aces.append({
            'index': i,
            'type': ace[0][0],
            'mask': f"0x{ace[1]:08X}",
            'sid': sid_str
        })

    win32file.CloseHandle(hPipe)

    # Validate that exactly 3 ACEs exist and correspond to SY, BA, and user_sid
    expected_sids = {'S-1-5-18', 'S-1-5-32-544', user_sid}
    actual_sids = {a['sid'] for a in aces}

    if not expected_sids.issubset(actual_sids) or ace_count != 3:
        raise ValueError(f"DACL verification failed: expected {expected_sids}, got {actual_sids} (count={ace_count})")

    return {
        'status': 'SUCCESS',
        'sddl': sddl,
        'userSid': user_sid,
        'aceCount': ace_count,
        'aces': aces
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'status': 'ERROR', 'error': 'Missing pipe_name argument'}))
        sys.exit(1)

    p_name = sys.argv[1]
    u_sid = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        res = apply_and_verify_pipe_dacl(p_name, u_sid)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({'status': 'ERROR', 'error': str(e)}))
        sys.exit(1)
