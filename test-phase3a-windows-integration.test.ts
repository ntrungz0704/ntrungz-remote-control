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
  });

  it('INTEG-03: Independent Target Process Desktop Verification via PEB and verify_windows_session.py', async () => {
    watchdog = new WatchdogService({ pipeName, authToken: TEST_VALID_TOKEN });
    await watchdog.start();

    const verifyOutput = child_process.execSync(`py scripts/verify_windows_session.py ${process.pid} "${pipeName}"`, {
      encoding: 'utf-8',
      timeout: 5000
    });

    expect(verifyOutput).toContain(`TARGET PID: ${process.pid}`);
    expect(verifyOutput).toContain('[PASS] 1. Active Console Session ID');
    expect(verifyOutput).toContain('[PASS] 2. Target Process Access');
    expect(verifyOutput).toContain('[PASS] 3. ProcessIdToSessionId Match');
    expect(verifyOutput).toContain('[PASS] 4. Token Session ID Match');
    expect(verifyOutput).toContain('[PASS] 5. Target PEB DesktopInfo');
    expect(verifyOutput).toContain('[PASS] 6. Named Pipe Explicit DACL');
    expect(verifyOutput).toContain('[PASS] 7. Multi-Monitor Display State');
    expect(verifyOutput).toContain('VERDICT: ALL WINDOWS RUNTIME VERIFICATION CRITERIA PASSED [100% GREEN]');
  });

  it('INTEG-04: Watchdog launches real child process (entry.ts) with genuine PID in Session 1', async () => {
    watchdog = new WatchdogService({
      pipeName,
      authToken: TEST_VALID_TOKEN,
      agentScriptPath: path.resolve(__dirname, 'agents/windows/src/interactive/entry.ts')
    });
    await watchdog.start();

    const child = watchdog.getAgentProcess();
    expect(child).not.toBeNull();
    expect(child?.pid).toBeGreaterThan(0);

    const targetPid = child!.pid!;

    const inspectOut = child_process.execSync(`py scripts/verify_windows_session.py ${targetPid} "${pipeName}"`, {
      encoding: 'utf-8',
      timeout: 5000
    });

    expect(inspectOut).toContain(`TARGET PID: ${targetPid}`);
    expect(inspectOut).toContain('[PASS] 1. Active Console Session ID');
    expect(inspectOut).toContain('[PASS] 2. Target Process Access');
    expect(inspectOut).toContain('[PASS] 3. ProcessIdToSessionId Match');
    expect(inspectOut).toContain('[PASS] 4. Token Session ID Match');
    expect(inspectOut).toContain('[PASS] 5. Target PEB DesktopInfo');
    expect(inspectOut).toContain('[PASS] 6. Named Pipe Explicit DACL');
    expect(inspectOut).toContain('[PASS] 7. Multi-Monitor Display State');
    expect(inspectOut).toContain('VERDICT: ALL WINDOWS RUNTIME VERIFICATION CRITERIA PASSED [100% GREEN]');

    try {
      process.kill(targetPid);
    } catch (_) {}
  });
});
