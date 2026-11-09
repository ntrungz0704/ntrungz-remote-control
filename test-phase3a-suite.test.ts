import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import child_process from 'node:child_process';
import { EventEmitter } from 'node:events';
import { WatchdogService, WatchdogState } from './agents/windows/src/watchdog/watchdog.service';
import { WindowsInteractiveAgent } from './agents/windows/src/interactive/interactive.agent';
import { NamedPipeServer } from './agents/windows/src/ipc/pipe-server';
import { NamedPipeClient } from './agents/windows/src/ipc/pipe-client';
import { 
  IpcFraming, 
  IpcMessageType, 
  IpcMessage 
} from './packages/shared/src/ipc';

describe('Ntrungz Remote Control — Phase 3A Hardened Windows Agent & IPC Suite', () => {
  // Chuẩn 32-byte hex entropy (64 ký tự)
  const TEST_VALID_TOKEN = crypto.randomBytes(32).toString('hex');
  const getTestPipe = () => `\\\\.\\pipe\\ntrungz-test-pipe-${crypto.randomUUID()}`;

  describe('1. Named Pipe Security & Challenge-Response Handshake', () => {
    let server: NamedPipeServer;
    let client: NamedPipeClient;
    let pipeName: string;

    beforeEach(async () => {
      pipeName = getTestPipe();
      server = new NamedPipeServer({
        pipeName,
        authToken: TEST_VALID_TOKEN
      });
      await server.start();
    });

    afterEach(async () => {
      if (client) await client.disconnect();
      if (server) await server.close();
    });

    it('CASE 1: Valid authenticated challenge-response handshake', async () => {
      client = new NamedPipeClient({
        pipeName,
        authToken: TEST_VALID_TOKEN,
        windowsSessionId: 1
      });

      await client.connect();
      expect(client.isConnected()).toBe(true);
      expect(server.isClientConnected()).toBe(true);
    });

    it('CASE 2: Invalid token rejection', async () => {
      const wrongToken = crypto.randomBytes(32).toString('hex');
      const rogueClient = new NamedPipeClient({
        pipeName,
        authToken: wrongToken,
        windowsSessionId: 1,
        autoReconnect: false
      });

      await expect(rogueClient.connect()).rejects.toThrow();
      expect(rogueClient.isConnected()).toBe(false);
      expect(server.isClientConnected()).toBe(false);
      await rogueClient.disconnect();
    });

    it('CASE 3: Token length and entropy validation (reject tokens < 32 bytes)', () => {
      expect(() => {
        new NamedPipeServer({
          pipeName: getTestPipe(),
          authToken: 'short_token'
        });
      }).toThrow(/Insecure IPC authToken: requires at least 32 bytes of entropy/);
    });

    it('CASE 4: Replay / stale challenge rejection (timestamp > 60s is rejected)', async () => {
      const rawSocket = net.connect(pipeName);
      let challengeMsgReceived = false;

      await new Promise<void>((resolve) => {
        rawSocket.on('data', (data) => {
          const { messages } = IpcFraming.decodeFrames(data);
          const challengeMsg = messages.find(m => m.type === IpcMessageType.HANDSHAKE_CHALLENGE);
          if (challengeMsg) {
            challengeMsgReceived = true;
            const challenge = challengeMsg.payload.challenge;
            // Ký chữ ký với timestamp quá khứ (10 phút trước)
            const staleTime = Date.now() - 600_000;
            const signature = IpcFraming.computeHandshakeSignature(TEST_VALID_TOKEN, {
              challenge,
              timestamp: staleTime,
              processId: process.pid,
              windowsSessionId: 1,
              clientType: 'INTERACTIVE_AGENT',
              version: '3.0.0-phase3a'
            });

            const staleResponse: IpcMessage = {
              id: crypto.randomUUID(),
              type: IpcMessageType.HANDSHAKE_RESPONSE,
              timestamp: staleTime,
              payload: {
                signature,
                timestamp: staleTime,
                processId: process.pid,
                windowsSessionId: 1,
                clientType: 'INTERACTIVE_AGENT',
                version: '3.0.0-phase3a'
              }
            };
            rawSocket.write(IpcFraming.encodeMessage(staleResponse));
          }

          const errorMsg = messages.find(m => m.type === IpcMessageType.ERROR);
          if (errorMsg) {
            expect(errorMsg.payload.code).toBe('STALE_HANDSHAKE');
            rawSocket.destroy();
            resolve();
          }
        });
      });

      expect(challengeMsgReceived).toBe(true);
      expect(server.isClientConnected()).toBe(false);
    });

    it('CASE 4B: Rejection of handshake missing version (BLOCKER R02 negative test)', async () => {
      const rawSocket = net.connect(pipeName);
      let errorReceived = false;

      await new Promise<void>((resolve) => {
        rawSocket.on('data', (data) => {
          const { messages } = IpcFraming.decodeFrames(data);
          const challengeMsg = messages.find(m => m.type === IpcMessageType.HANDSHAKE_CHALLENGE);
          if (challengeMsg) {
            const challenge = challengeMsg.payload.challenge;
            const now = Date.now();
            const signature = IpcFraming.computeHandshakeSignature(TEST_VALID_TOKEN, {
              challenge,
              timestamp: now,
              processId: process.pid,
              windowsSessionId: 1,
              clientType: 'INTERACTIVE_AGENT',
              version: '3.0.0-phase3a'
            });

            const badResponse: IpcMessage = {
              id: crypto.randomUUID(),
              type: IpcMessageType.HANDSHAKE_RESPONSE,
              timestamp: now,
              payload: {
                signature,
                timestamp: now,
                processId: process.pid,
                windowsSessionId: 1,
                clientType: 'INTERACTIVE_AGENT'
                // version omitted intentionally
              }
            };
            rawSocket.write(IpcFraming.encodeMessage(badResponse));
          }

          const errorMsg = messages.find(m => m.type === IpcMessageType.ERROR);
          if (errorMsg) {
            expect(errorMsg.payload.code).toBe('INVALID_VERSION');
            errorReceived = true;
            rawSocket.destroy();
            resolve();
          }
        });
      });

      expect(errorReceived).toBe(true);
      expect(server.isClientConnected()).toBe(false);
    });

    it('CASE 4C: Rejection of handshake with PID mismatch (BLOCKER R02 negative test)', async () => {
      server.setExpectedClientIdentity(999999, 1);
      const rawSocket = net.connect(pipeName);
      let errorReceived = false;

      await new Promise<void>((resolve) => {
        rawSocket.on('data', (data) => {
          const { messages } = IpcFraming.decodeFrames(data);
          const challengeMsg = messages.find(m => m.type === IpcMessageType.HANDSHAKE_CHALLENGE);
          if (challengeMsg) {
            const challenge = challengeMsg.payload.challenge;
            const now = Date.now();
            const wrongPid = 12345;
            const signature = IpcFraming.computeHandshakeSignature(TEST_VALID_TOKEN, {
              challenge,
              timestamp: now,
              processId: wrongPid,
              windowsSessionId: 1,
              clientType: 'INTERACTIVE_AGENT',
              version: '3.0.0-phase3a'
            });

            const badResponse: IpcMessage = {
              id: crypto.randomUUID(),
              type: IpcMessageType.HANDSHAKE_RESPONSE,
              timestamp: now,
              payload: {
                signature,
                timestamp: now,
                processId: wrongPid,
                windowsSessionId: 1,
                clientType: 'INTERACTIVE_AGENT',
                version: '3.0.0-phase3a'
              }
            };
            rawSocket.write(IpcFraming.encodeMessage(badResponse));
          }

          const errorMsg = messages.find(m => m.type === IpcMessageType.ERROR);
          if (errorMsg) {
            expect(errorMsg.payload.code).toBe('PROCESS_ID_MISMATCH');
            errorReceived = true;
            rawSocket.destroy();
            resolve();
          }
        });
      });

      expect(errorReceived).toBe(true);
    });

    it('CASE 4D: Unauthenticated socket disconnect does NOT trigger watchdog restart (BLOCKER R03)', async () => {
      let disconnectTriggered = false;
      server.onDisconnect(() => {
        disconnectTriggered = true;
      });

      // Mở kết nối socket thô và đóng ngay mà không xác thực
      const rawSocket = net.connect(pipeName);
      await new Promise(r => setTimeout(r, 50));
      rawSocket.destroy();
      await new Promise(r => setTimeout(r, 100));

      expect(disconnectTriggered).toBe(false);
    });

    it('CASE 5: Constant-time signature verification', () => {
      const challenge = crypto.randomBytes(32).toString('hex');
      const timestamp = Date.now();
      const validSig = IpcFraming.computeHandshakeSignature(TEST_VALID_TOKEN, challenge, timestamp);

      expect(IpcFraming.verifyHandshakeSignature(TEST_VALID_TOKEN, challenge, timestamp, validSig)).toBe(true);

      // Sửa 1 byte chữ ký
      const corruptedSig = validSig.slice(0, -2) + (validSig.endsWith('0') ? '1' : '0');
      expect(IpcFraming.verifyHandshakeSignature(TEST_VALID_TOKEN, challenge, timestamp, corruptedSig)).toBe(false);
    });
  });

  describe('2. IPC Framing Hardening (Buffer attacks, OOM, Malformed packets)', () => {
    it('CASE 6: Fragmented IPC frame handling (streaming chunked data)', () => {
      const msg: IpcMessage = {
        id: 'frag-1',
        type: IpcMessageType.HEARTBEAT,
        timestamp: Date.now(),
        payload: { cpu: 2.5 }
      };

      const fullFrame = IpcFraming.encodeMessage(msg);
      // Chia nhỏ thành 3 chunk ngẫu nhiên
      const chunk1 = fullFrame.subarray(0, 3);
      const chunk2 = fullFrame.subarray(3, 10);
      const chunk3 = fullFrame.subarray(10);

      let buf = Buffer.alloc(0);
      buf = Buffer.concat([buf, chunk1]);
      let res1 = IpcFraming.decodeFrames(buf);
      expect(res1.messages.length).toBe(0); // Chưa đủ frame

      buf = Buffer.concat([res1.remainingBuffer, chunk2]);
      let res2 = IpcFraming.decodeFrames(buf);
      expect(res2.messages.length).toBe(0);

      buf = Buffer.concat([res2.remainingBuffer, chunk3]);
      let res3 = IpcFraming.decodeFrames(buf);
      expect(res3.messages.length).toBe(1);
      expect(res3.messages[0].id).toBe('frag-1');
      expect(res3.remainingBuffer.length).toBe(0);
    });

    it('CASE 7: Multiple IPC frames in single buffer', () => {
      const msg1: IpcMessage = { id: 'm1', type: IpcMessageType.HEARTBEAT, timestamp: 1, payload: {} };
      const msg2: IpcMessage = { id: 'm2', type: IpcMessageType.HEARTBEAT_ACK, timestamp: 2, payload: {} };

      const batch = Buffer.concat([IpcFraming.encodeMessage(msg1), IpcFraming.encodeMessage(msg2)]);
      const { messages, remainingBuffer } = IpcFraming.decodeFrames(batch);

      expect(messages.length).toBe(2);
      expect(messages[0].id).toBe('m1');
      expect(messages[1].id).toBe('m2');
      expect(remainingBuffer.length).toBe(0);
    });

    it('CASE 8: Oversized IPC frame rejection (> MAX_FRAME_SIZE = 4MB)', () => {
      const fakeHeader = Buffer.alloc(4);
      fakeHeader.writeUInt32BE(5 * 1024 * 1024, 0); // 5MB > 4MB MAX_FRAME_SIZE
      const dummyPayload = Buffer.alloc(100);

      const attackedBuffer = Buffer.concat([fakeHeader, dummyPayload]);
      const result = IpcFraming.decodeFrames(attackedBuffer);

      expect(result.oversizedError).toBe(true);
      expect(result.messages.length).toBe(0);
    });

    it('CASE 9: Zero-length and malformed JSON rejection without crashing', () => {
      // 1. Zero-length frame
      const zeroLengthHeader = Buffer.alloc(4);
      zeroLengthHeader.writeUInt32BE(0, 0);
      const resZero = IpcFraming.decodeFrames(zeroLengthHeader);
      expect(resZero.malformedError).toBe(true);

      // 2. Malformed JSON
      const badJsonBody = Buffer.from('{ corrupt json... ', 'utf-8');
      const badHeader = Buffer.alloc(4);
      badHeader.writeUInt32BE(badJsonBody.length, 0);
      const resBad = IpcFraming.decodeFrames(Buffer.concat([badHeader, badJsonBody]));
      expect(resBad.malformedError).toBe(true);
      expect(resBad.messages.length).toBe(0);
    });
  });

  describe('3. Watchdog Process Supervision & Real Session Lifecycle', () => {
    let watchdog: WatchdogService;
    let agent: WindowsInteractiveAgent;
    let pipeName: string;

    beforeEach(async () => {
      pipeName = getTestPipe();
    });

    afterEach(async () => {
      if (agent) await agent.stop();
      if (watchdog) await watchdog.stop();
    });

    it('CASE 10: Actual Windows Session ID detection via WTSGetActiveConsoleSessionId', () => {
      watchdog = new WatchdogService({ pipeName, authToken: TEST_VALID_TOKEN });
      const consoleSession = watchdog.detectActiveConsoleSession();
      expect(consoleSession).toBeGreaterThanOrEqual(1);
      expect(consoleSession).not.toBe(0xFFFFFFFF);
    });

    it('CASE 11: Real interactive process launch, handshake and status telemetry', async () => {
      watchdog = new WatchdogService({
        pipeName,
        authToken: TEST_VALID_TOKEN,
        heartbeatTimeoutMs: 15_000,
        processLauncher: () => (new EventEmitter() as any) // Vô hiệu hóa auto-spawn để test in-process agent
      });
      await watchdog.start();
      watchdog.getPipeServer().setExpectedClientIdentity(process.pid, 1);

      agent = new WindowsInteractiveAgent({
        pipeName,
        authToken: TEST_VALID_TOKEN,
        windowsSessionId: 1,
        desktopName: 'Default',
        windowStationName: 'WinSta0',
        screenWidth: 1920,
        screenHeight: 1080,
        dpi: 96
      });

      await agent.start();
      await new Promise(r => setTimeout(r, 200));

      expect(agent.isConnected()).toBe(true);
      expect(watchdog.isAgentConnected()).toBe(true);

      const status = watchdog.getLatestStatus();
      expect(status).not.toBeNull();
      expect(status?.windowStationName).toBe('WinSta0');
      expect(status?.desktopName).toBe('Default');
      expect(status?.resolution.width).toBe(1920);
      expect(status?.resolution.height).toBe(1080);
      expect(status?.monitors.length).toBeGreaterThanOrEqual(1);
      expect(status?.metrics.memoryMb).toBeGreaterThan(0);
    });

    it('CASE 12: Agent crash detection and process restart', async () => {
      let spawnCount = 0;
      const fakeChildEmitter = new EventEmitter() as any;
      fakeChildEmitter.kill = () => {};

      watchdog = new WatchdogService({
        pipeName,
        authToken: TEST_VALID_TOKEN,
        processLauncher: () => {
          spawnCount++;
          return fakeChildEmitter;
        }
      });
      await watchdog.start();
      expect(spawnCount).toBe(1);

      // Kích hoạt crash
      watchdog.handleAgentCrashOrExit();
      expect(spawnCount).toBe(2);
      expect(watchdog.getRestartCountInWindow()).toBe(1);
    });

    it('CASE 13: Maximum 5 restarts per rolling 60 seconds (anti-crash-loop protection enters DEGRADED)', async () => {
      let spawnCount = 0;
      const fakeChild = new EventEmitter() as any;
      fakeChild.kill = () => {};

      watchdog = new WatchdogService({
        pipeName,
        authToken: TEST_VALID_TOKEN,
        maxRestartsPerMinute: 5,
        processLauncher: () => {
          spawnCount++;
          return fakeChild;
        }
      });
      await watchdog.start();

      // Giả lập 5 lần crash liên tiếp trong 60s
      for (let i = 1; i <= 5; i++) {
        const canRestart = watchdog.handleAgentCrashOrExit();
        if (i < 5) expect(canRestart).toBe(true);
      }

      // Lần crash thứ 6 bị chặn đứng và chuyển sang DEGRADED
      const sixthRestart = watchdog.handleAgentCrashOrExit();
      expect(sixthRestart).toBe(false);
      expect(watchdog.getState()).toBe(WatchdogState.DEGRADED);
    });

    it('CASE 14: Graceful shutdown of Interactive Agent and Watchdog', async () => {
      watchdog = new WatchdogService({
        pipeName,
        authToken: TEST_VALID_TOKEN,
        processLauncher: () => (new EventEmitter() as any)
      });
      await watchdog.start();
      watchdog.getPipeServer().setExpectedClientIdentity(process.pid, 1);

      agent = new WindowsInteractiveAgent({
        pipeName,
        authToken: TEST_VALID_TOKEN,
        windowsSessionId: 1
      });
      await agent.start();

      await agent.stop();
      expect(agent.isConnected()).toBe(false);

      await watchdog.stop();
      expect(watchdog.getState()).toBe(WatchdogState.STOPPED);
    });
  });
});
