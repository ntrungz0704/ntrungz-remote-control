import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { buildApp } from './services/api/src/app';
import { CryptoUtil } from './services/api/src/utils/crypto';
import { TurnUtil } from './services/api/src/utils/turn';
import { LanDiscoveryProtocol } from './packages/shared/src/discovery';
import { 
  DeviceStatus, 
  RemoteSessionStatus, 
  SignalingMessageType, 
  SignalingMessage 
} from './packages/shared/src/types';
import { ForbiddenError, DeviceRevokedError } from './packages/shared/src/errors';

describe('Ntrungz Remote Control — Phase 2 Test Suite', () => {
  let context: ReturnType<typeof buildApp>;
  const USER_A = crypto.randomUUID();
  const USER_B = crypto.randomUUID();

  beforeEach(() => {
    context = buildApp();
  });

  describe('1. Module A — Remote Session Manager (Đợt 2A)', () => {
    it('should create RemoteSession with CONNECTING status and issue sessionToken', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Office PC',
        hardwareIdentifier: 'HW-SESSION-1',
        publicKey,
        ownerId: USER_A
      });

      const session = await context.sessionService.createRemoteSession({
        deviceId: device.id,
        clientId: 'android-client-uuid-1',
        clientUserId: USER_A
      });

      expect(session.id).toBeDefined();
      expect(session.status).toBe(RemoteSessionStatus.CONNECTING);
      expect(session.sessionToken).toMatch(/^ses_tok_/);
      expect(session.bytesTransferred).toBe(0);
    });

    it('should reject session creation on another user device (403 Forbidden)', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Private PC',
        hardwareIdentifier: 'HW-PRIVATE-1',
        publicKey,
        ownerId: USER_A
      });

      // User B tries to create session on User A's PC
      await expect(context.sessionService.createRemoteSession({
        deviceId: device.id,
        clientId: 'intruder-client',
        clientUserId: USER_B
      })).rejects.toThrow(ForbiddenError);
    });

    it('should reject session creation on revoked device', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Stolen PC',
        hardwareIdentifier: 'HW-STOLEN-1',
        publicKey,
        ownerId: USER_A
      });

      await context.deviceService.revokeDevice(device.id, USER_A, 'Stolen');

      await expect(context.sessionService.createRemoteSession({
        deviceId: device.id,
        clientId: 'client-1',
        clientUserId: USER_A
      })).rejects.toThrow(DeviceRevokedError);
    });

    it('should transition session lifecycle CONNECTING -> ACTIVE -> DISCONNECTED with stats', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Workstation',
        hardwareIdentifier: 'HW-LIFECYCLE-1',
        publicKey,
        ownerId: USER_A
      });

      const session = await context.sessionService.createRemoteSession({
        deviceId: device.id,
        clientId: 'android-client-1',
        clientUserId: USER_A
      });

      // Activate
      const active = await context.sessionService.activateSession(session.id);
      expect(active.status).toBe(RemoteSessionStatus.ACTIVE);
      expect(active.startedAt).toBeDefined();

      // End session
      const ended = await context.sessionService.endSession(session.id, {
        bytesTransferred: 10485760, // 10MB
        latencyMs: 42,
        reason: 'User logged out'
      });

      expect(ended.status).toBe(RemoteSessionStatus.DISCONNECTED);
      expect(ended.endedAt).toBeDefined();
      expect(ended.bytesTransferred).toBe(10485760);
      expect(ended.latencyMs).toBe(42);
    });
  });

  describe('2. Module B — WebRTC Signaling Hub & Authentication (Đợt 2B)', () => {
    it('should register Windows Agent and Android Client peers with token verification', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Ntrungz PC',
        hardwareIdentifier: 'HW-SIGNAL-1',
        publicKey,
        ownerId: USER_A
      });

      // Pair to get token
      const pair = await context.pairingService.startPairing({ deviceId: device.id, userId: USER_A });
      const verifyRes = await context.pairingService.verifyPairing({
        sessionId: pair.sessionId,
        pin: pair.pin,
        userId: USER_A
      });

      const agentMessages: SignalingMessage[] = [];
      const clientMessages: SignalingMessage[] = [];

      // Register Windows Agent
      const regAgent = context.signalingHub.registerPeer({
        peerId: 'agent-peer-1',
        peerType: 'AGENT',
        deviceId: device.id,
        token: verifyRes.deviceToken,
        send: msg => agentMessages.push(msg)
      });
      expect(regAgent.success).toBe(true);
      expect(agentMessages[0].type).toBe(SignalingMessageType.REGISTERED);

      // Register Android Client
      const regClient = context.signalingHub.registerPeer({
        peerId: 'client-peer-1',
        peerType: 'CLIENT',
        deviceId: device.id,
        token: verifyRes.deviceToken,
        send: msg => clientMessages.push(msg)
      });
      expect(regClient.success).toBe(true);
      expect(clientMessages[0].type).toBe(SignalingMessageType.REGISTERED);
    });

    it('should reject peer registration with invalid or revoked token', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Reject PC',
        hardwareIdentifier: 'HW-REJECT-1',
        publicKey,
        ownerId: USER_A
      });

      const res = context.signalingHub.registerPeer({
        peerId: 'unauthorized-peer',
        peerType: 'AGENT',
        deviceId: device.id,
        token: 'dev_tok_invalid_fake_token',
        send: () => {}
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('should exchange WebRTC OFFER, ANSWER, and CANDIDATES between peers', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Peer PC',
        hardwareIdentifier: 'HW-PEER-1',
        publicKey,
        ownerId: USER_A
      });

      const pair = await context.pairingService.startPairing({ deviceId: device.id, userId: USER_A });
      const { deviceToken } = await context.pairingService.verifyPairing({
        sessionId: pair.sessionId,
        pin: pair.pin,
        userId: USER_A
      });

      const session = await context.sessionService.createRemoteSession({
        deviceId: device.id,
        clientId: 'client-peer-1',
        clientUserId: USER_A
      });

      const agentReceived: SignalingMessage[] = [];
      const clientReceived: SignalingMessage[] = [];

      context.signalingHub.registerPeer({
        peerId: 'agent-peer-1',
        peerType: 'AGENT',
        deviceId: device.id,
        token: deviceToken,
        send: msg => agentReceived.push(msg)
      });

      context.signalingHub.registerPeer({
        peerId: 'client-peer-1',
        peerType: 'CLIENT',
        deviceId: device.id,
        token: deviceToken,
        send: msg => clientReceived.push(msg)
      });

      // 1. Client sends OFFER to Agent
      await context.signalingHub.handleMessage('client-peer-1', {
        type: SignalingMessageType.OFFER,
        sessionId: session.id,
        targetId: 'agent-peer-1',
        sdp: 'v=0\r\no=client 12345 2 IN IP4 127.0.0.1...'
      });

      expect(agentReceived.some(m => m.type === SignalingMessageType.OFFER)).toBe(true);
      expect(context.sessionService.getSession(session.id)!.status).toBe(RemoteSessionStatus.ACTIVE);

      // 2. Agent responds with ANSWER to Client
      await context.signalingHub.handleMessage('agent-peer-1', {
        type: SignalingMessageType.ANSWER,
        sessionId: session.id,
        targetId: 'client-peer-1',
        sdp: 'v=0\r\no=agent 67890 2 IN IP4 127.0.0.1...'
      });

      expect(clientReceived.some(m => m.type === SignalingMessageType.ANSWER)).toBe(true);

      // 3. Exchange ICE Candidates
      await context.signalingHub.handleMessage('client-peer-1', {
        type: SignalingMessageType.CANDIDATE,
        sessionId: session.id,
        targetId: 'agent-peer-1',
        candidate: { candidate: 'candidate:1 1 UDP 2130706431 192.168.2.3 54321 typ host' }
      });

      expect(agentReceived.some(m => m.type === SignalingMessageType.CANDIDATE)).toBe(true);
    });
  });

  describe('3. Module C — Device Presence & Multiple Windows PCs (Đợt 2C)', () => {
    it('should manage presence for at least 3 Windows PCs simultaneously', async () => {
      const pcNames = ['Gaming PC', 'Work Laptop', 'Home Server'];
      const devices = [];

      for (const name of pcNames) {
        const { publicKey } = CryptoUtil.generateKeyPair();
        const d = await context.deviceService.registerDevice({
          name,
          hardwareIdentifier: `HW-${name.toUpperCase().replace(/\s/g, '-')}`,
          publicKey,
          ownerId: USER_A
        });
        devices.push(d);
      }

      expect(devices.length).toBe(3);

      // All 3 PCs send heartbeat
      for (const d of devices) {
        const presence = await context.presenceService.recordHeartbeat(d.id, '192.168.2.10');
        expect(presence.status).toBe(DeviceStatus.ONLINE);
        expect(presence.isReachable).toBe(true);
        expect(presence.isAvailableForNewSession).toBe(true);
      }

      // Query presences
      for (const d of devices) {
        const p = context.presenceService.getPresence(d.id);
        expect(p.status).toBe(DeviceStatus.ONLINE);
        expect(p.isReachable).toBe(true);
      }
    });

    it('should detect heartbeat timeout and mark device OFFLINE after timeout window', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Timeout PC',
        hardwareIdentifier: 'HW-TIMEOUT-1',
        publicKey,
        ownerId: USER_A
      });

      await context.presenceService.recordHeartbeat(device.id);
      expect(context.presenceService.getPresence(device.id).status).toBe(DeviceStatus.ONLINE);

      // Manually simulate passage of 50 seconds in lastSeenAt
      const cached = (context.presenceService as any).presences.get(device.id);
      cached.lastSeenAt = new Date(Date.now() - 50 * 1000);

      // Trigger sweep
      const timedOut = context.presenceService.sweepTimeouts();
      expect(timedOut).toContain(device.id);

      const pAfter = context.presenceService.getPresence(device.id);
      expect(pAfter.status).toBe(DeviceStatus.OFFLINE);
      expect(pAfter.isReachable).toBe(false);

      // Reconnect: when heartbeat resumes, device returns ONLINE
      await context.presenceService.recordHeartbeat(device.id);
      expect(context.presenceService.getPresence(device.id).status).toBe(DeviceStatus.ONLINE);
    });
  });

  describe('4. Module D — STUN / TURN Infrastructure (Đợt 2D)', () => {
    it('should generate STUN & TURN credentials with HMAC-SHA1 signature and TTL', () => {
      const iceServers = TurnUtil.generateIceServers(USER_A, 86400);
      expect(iceServers.length).toBe(4);

      // Public STUN
      expect(iceServers[0].urls).toContain('stun.l.google.com');
      expect(iceServers[1].urls).toContain('stun.twilio.com');

      // coturn TURN (UDP and TCP)
      const turnUdp = iceServers[2];
      expect(turnUdp.urls).toContain('transport=udp');
      expect(turnUdp.username).toContain(`:${USER_A}`);
      expect(turnUdp.credential).toBeDefined();

      const turnTcp = iceServers[3];
      expect(turnTcp.urls).toContain('transport=tcp');
      expect(turnTcp.username).toBe(turnUdp.username);
    });
  });

  describe('5. Module E — LAN Discovery Protocol (Đợt 2E)', () => {
    it('should format and parse valid UDP broadcast discovery packet', () => {
      const packet = LanDiscoveryProtocol.createAnnouncement(
        'PC-66AB-8738',
        'Ntrungz Desktop PC',
        45825
      );

      expect(packet.magic).toBe(LanDiscoveryProtocol.MAGIC);
      expect(packet.deviceId).toBe('PC-66AB-8738');
      expect(packet.deviceName).toBe('Ntrungz Desktop PC');
      expect(packet.servicePort).toBe(45825);

      const parsed = LanDiscoveryProtocol.parsePacket(JSON.stringify(packet));
      expect(parsed).not.toBeNull();
      expect(parsed?.deviceId).toBe('PC-66AB-8738');

      // Invalid packet
      expect(LanDiscoveryProtocol.parsePacket('{"magic": "WRONG"}')).toBeNull();
    });
  });

  describe('6. Fastify REST API Integration for Phase 2 Endpoints', () => {
    it('should support full RemoteSession lifecycle via REST API', async () => {
      const { app, deviceService } = context;

      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await deviceService.registerDevice({
        name: 'API Controlled PC',
        hardwareIdentifier: 'HW-REST-SESSION-1',
        publicKey,
        ownerId: USER_A
      });

      // 1. Create session via POST /api/v1/sessions
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        headers: { 'x-user-id': USER_A },
        payload: {
          deviceId: device.id,
          clientId: 'android-phone-test'
        }
      });

      expect(createRes.statusCode).toBe(201);
      const sessionData = JSON.parse(createRes.payload).data;
      expect(sessionData.id).toBeDefined();
      expect(sessionData.status).toBe(RemoteSessionStatus.CONNECTING);

      // 2. Query session via GET /api/v1/sessions/:id
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/sessions/${sessionData.id}`
      });
      expect(getRes.statusCode).toBe(200);

      // 3. End session via POST /api/v1/sessions/:id/end
      const endRes = await app.inject({
        method: 'POST',
        url: `/api/v1/sessions/${sessionData.id}/end`,
        payload: {
          bytesTransferred: 5242880,
          latencyMs: 38,
          reason: 'Normal test termination'
        }
      });
      expect(endRes.statusCode).toBe(200);
      expect(JSON.parse(endRes.payload).data.status).toBe(RemoteSessionStatus.DISCONNECTED);

      // 4. Query ICE Servers via GET /api/v1/ice-servers
      const iceRes = await app.inject({
        method: 'GET',
        url: '/api/v1/ice-servers',
        headers: { 'x-user-id': USER_A }
      });
      expect(iceRes.statusCode).toBe(200);
      expect(JSON.parse(iceRes.payload).data.iceServers.length).toBeGreaterThanOrEqual(2);

      // 5. Post Heartbeat via POST /api/v1/presence/heartbeat
      const hbRes = await app.inject({
        method: 'POST',
        url: '/api/v1/presence/heartbeat',
        payload: { deviceId: device.id }
      });
      expect(hbRes.statusCode).toBe(200);
      expect(JSON.parse(hbRes.payload).data.status).toBe(DeviceStatus.ONLINE);

      // 6. Query Presence via GET /api/v1/presence/:deviceId
      const pRes = await app.inject({
        method: 'GET',
        url: `/api/v1/presence/${device.id}`
      });
      expect(pRes.statusCode).toBe(200);
      expect(JSON.parse(pRes.payload).data.isReachable).toBe(true);
    });
  });
});
