import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { WatchdogService, WatchdogState } from './agents/windows/src/watchdog/watchdog.service';
import { WindowsInteractiveAgent } from './agents/windows/src/interactive/interactive.agent';
import { NamedPipeServer } from './agents/windows/src/ipc/pipe-server';
import { NamedPipeClient } from './agents/windows/src/ipc/pipe-client';

describe('Ntrungz Remote Control — Phase 3A Windows Interactive Session Agent & IPC Suite', () => {
  const TEST_TOKEN = crypto.randomBytes(16).toString('hex');
  // Sử dụng pipe path riêng biệt cho từng test để tránh xung đột
  const getTestPipe = () => `\\\\.\\pipe\\ntrungz-test-pipe-${crypto.randomUUID()}`;

  describe('1. Secure Named Pipe IPC Framing & Handshake Protocol', () => {
    let server: NamedPipeServer;
    let client: NamedPipeClient;
    let pipeName: string;

    beforeEach(async () => {
      pipeName = getTestPipe();
      server = new NamedPipeServer({
        pipeName,
        authToken: TEST_TOKEN
      });
      await server.start();
    });

    afterEach(async () => {
      if (client) await client.disconnect();
      if (server) await server.close();
    });

    it('CRIT-3A-01: should authenticate client with valid auth token and acknowledge handshake', async () => {
      client = new NamedPipeClient({
        pipeName,
        authToken: TEST_TOKEN,
        windowsSessionId: 1
      });

      await client.connect();
      expect(client.isConnected()).toBe(true);
      expect(server.isClientConnected()).toBe(true);
    });

    it('CRIT-3A-02: should reject connection with invalid auth token', async () => {
      const rogueClient = new NamedPipeClient({
        pipeName,
        authToken: 'INVALID_ROGUE_TOKEN',
        windowsSessionId: 1,
        autoReconnect: false
      });

      await expect(rogueClient.connect()).rejects.toThrow();
      expect(rogueClient.isConnected()).toBe(false);
      expect(server.isClientConnected()).toBe(false);
      await rogueClient.disconnect();
    });
  });

  describe('2. Watchdog Service & Interactive Session Agent Lifecycle', () => {
    let watchdog: WatchdogService;
    let agent: WindowsInteractiveAgent;
    let pipeName: string;

    beforeEach(async () => {
      pipeName = getTestPipe();
      watchdog = new WatchdogService({
        pipeName,
        authToken: TEST_TOKEN,
        heartbeatTimeoutMs: 10_000
      });
      await watchdog.start();
    });

    afterEach(async () => {
      if (agent) await agent.stop();
      if (watchdog) await watchdog.stop();
    });

    it('CRIT-3A-03: Watchdog state transition & Session 0 vs Session 1 supervisor', async () => {
      expect(watchdog.getState()).toBe(WatchdogState.SUPERVISING);
      expect(watchdog.detectActiveConsoleSession()).toBeGreaterThanOrEqual(1);

      agent = new WindowsInteractiveAgent({
        pipeName,
        authToken: TEST_TOKEN,
        windowsSessionId: 1,
        desktopName: 'WinSta0\\Default',
        screenWidth: 2560,
        screenHeight: 1440,
        dpi: 144
      });

      await agent.start();
      // Chờ IPC message truyền qua pipe
      await new Promise(r => setTimeout(r, 200));

      expect(agent.isConnected()).toBe(true);
      expect(watchdog.isAgentConnected()).toBe(true);

      const status = watchdog.getLatestStatus();
      expect(status).not.toBeNull();
      expect(status?.desktopName).toBe('WinSta0\\Default');
      expect(status?.resolution.width).toBe(2560);
      expect(status?.resolution.height).toBe(1440);
      expect(status?.resolution.dpi).toBe(144);
    });

    it('CRIT-3A-04: Graceful shutdown of Interactive Agent and Watchdog', async () => {
      agent = new WindowsInteractiveAgent({
        pipeName,
        authToken: TEST_TOKEN,
        windowsSessionId: 1
      });

      await agent.start();
      expect(agent.isConnected()).toBe(true);

      await agent.stop();
      expect(agent.isConnected()).toBe(false);

      await watchdog.stop();
      expect(watchdog.getState()).toBe(WatchdogState.STOPPED);
    });
  });
});
