import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import path from 'node:path';
import child_process from 'node:child_process';
import { WatchdogService, WatchdogState } from './agents/windows/src/watchdog/watchdog.service';
import { WindowsInteractiveAgent } from './agents/windows/src/interactive/interactive.agent';

describe('Ntrungz Remote Control — Phase 3A Real Windows 11 Integration Suite', () => {
  const TEST_VALID_TOKEN = crypto.randomBytes(32).toString('hex');
  const getTestPipe = () => `\\\\.\\pipe\\ntrungz-integration-pipe-${crypto.randomUUID()}`;

  let watchdog: WatchdogService | undefined;
  let agent: WindowsInteractiveAgent | undefined;
  let pipeName: string;

  beforeEach(() => {
    pipeName = getTestPipe();
  });

  afterEach(async () => {
    if (agent) await agent.stop();
    if (watchdog) await watchdog.stop();
  });

  it('INTEG-01: Real Windows Session ID detection via WTSGetActiveConsoleSessionId', () => {
    watchdog = new WatchdogService({ pipeName, authToken: TEST_VALID_TOKEN });
    const consoleSession = watchdog.detectActiveConsoleSession();
    expect(consoleSession).toBeGreaterThanOrEqual(1);
    expect(consoleSession).not.toBe(0xFFFFFFFF);
  });

  it('INTEG-02: Real Windows OS Native Discovery & Zero Fabricated Fallbacks', () => {
    // Không truyền mock desktopName, windowStationName hay monitors
    const realAgent = new WindowsInteractiveAgent({
      pipeName,
      authToken: TEST_VALID_TOKEN
    });

    const ctx = realAgent.getDesktopContext();
    expect(ctx.windowStationName).toBe('WinSta0');
    expect(ctx.desktopName.length).toBeGreaterThan(0);
    expect(ctx.monitors.length).toBeGreaterThanOrEqual(1);
    expect(ctx.screenWidth).toBeGreaterThanOrEqual(1024);
    expect(ctx.screenHeight).toBeGreaterThanOrEqual(768);
    expect(ctx.dpi).toBeGreaterThanOrEqual(96);
    expect(ctx.lockState).toBeDefined();
    expect(['LOCKED', 'UNLOCKED', 'UNKNOWN']).toContain(ctx.lockState);
  });

  it('INTEG-03: Watchdog launches real Interactive Agent process directly via node.exe with Genuine PID and Session Verification', async () => {
    watchdog = new WatchdogService({
      pipeName,
      authToken: TEST_VALID_TOKEN,
      agentScriptPath: path.resolve(__dirname, 'agents/windows/src/interactive/entry.ts')
    });
    await watchdog.start();

    const targetPid = watchdog.getAgentPid();
    expect(targetPid).not.toBeNull();
    expect(targetPid).toBeGreaterThan(0);
    // BẮT BUỘC: Target PID phải là tiến trình riêng biệt do Watchdog khởi chạy, KHÔNG PHẢI tiến trình Vitest
    expect(targetPid).not.toBe(process.pid);

    const launcherScript = path.resolve(__dirname, 'agents/windows/src/watchdog/process_launcher.py');
    const statusOut = child_process.execSync(`py "${launcherScript}" status ${targetPid}`, { encoding: 'utf-8' });
    const statusParsed = JSON.parse(statusOut.trim());
    expect(statusParsed.running).toBe(true);

    // Kiểm định toàn diện runtime bằng scripts/verify_windows_session.py đối với PID của chính Agent
    const verifyOutput = child_process.execSync(`py scripts/verify_windows_session.py ${targetPid} "${pipeName}"`, {
      encoding: 'utf-8',
      timeout: 6000
    });

    expect(verifyOutput).toContain(`TARGET PID: ${targetPid}`);
    expect(verifyOutput).toContain('[PASS] 1. Active Console Session ID');
    expect(verifyOutput).toContain('[PASS] 2. Target Process Access');
    expect(verifyOutput).toContain('[PASS] 3. ProcessIdToSessionId Match');
    expect(verifyOutput).toContain('[PASS] 4. Token Session ID Match');
    expect(verifyOutput).toContain('[PASS] 5. Target PEB DesktopInfo');
    expect(verifyOutput).toContain('[PASS] 6. Named Pipe Explicit DACL');
    expect(verifyOutput).toContain('[PASS] 7. Multi-Monitor Display State');
    expect(verifyOutput).toContain('VERDICT: ALL WINDOWS RUNTIME VERIFICATION CRITERIA PASSED [100% GREEN]');
  });

  it('INTEG-04: End-to-End Process Lifecycle: Real PID Supervision, Telemetry, and Termination on Watchdog Stop', async () => {
    watchdog = new WatchdogService({
      pipeName,
      authToken: TEST_VALID_TOKEN,
      agentScriptPath: path.resolve(__dirname, 'agents/windows/src/interactive/entry.ts')
    });
    await watchdog.start();

    const targetPid = watchdog.getAgentPid()!;
    expect(targetPid).toBeGreaterThan(0);

    // Đợi kết nối IPC và bắt tay thành công (trong tối đa 5 giây)
    const startTime = Date.now();
    while (!watchdog.isAgentConnected() && Date.now() - startTime < 5000) {
      await new Promise(r => setTimeout(r, 100));
    }

    expect(watchdog.isAgentConnected()).toBe(true);

    // Dừng Watchdog và kiểm chứng tiến trình con thực tế đã được giải phóng
    await watchdog.stop();
    expect(watchdog.getState()).toBe(WatchdogState.STOPPED);

    // Kiểm chứng tiến trình targetPid đã dừng thực sự bằng Win32 GetExitCodeProcess
    const launcherScript = path.resolve(__dirname, 'agents/windows/src/watchdog/process_launcher.py');
    const checkOut = child_process.execSync(`py "${launcherScript}" status ${targetPid}`, { encoding: 'utf-8' });
    const checkParsed = JSON.parse(checkOut.trim());
    expect(checkParsed.running).toBe(false);
  });
});
