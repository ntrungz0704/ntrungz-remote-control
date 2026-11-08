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

describe('Ntrungz Remote Control — Phase 2 Final Acceptance Verification Suite', () => {
  let context: ReturnType<typeof buildApp>;
  const USER_A = crypto.randomUUID();
  const USER_B = crypto.randomUUID();

  beforeEach(() => {
    context = buildApp();
  });

  describe('1. Security Verification: Isolation, Revocation & Concurrency', () => {
    it('CRIT-SEC-01: Peer Isolation — Outsider peer cannot send messages to foreign session', async () => {
      const { publicKey: pkA } = CryptoUtil.generateKeyPair();
      const deviceA = await context.deviceService.registerDevice({
        name: 'Target PC',
        hardwareIdentifier: 'HW-ISOLATION-1',
        publicKey: pkA,
        ownerId: USER_A
      });

      const { token: agentToken } = await context.deviceService.issueDeviceToken(deviceA.id, USER_A);
      const agentMessages: SignalingMessage[] = [];
      context.signalingHub.registerPeer({
        peerId: 'agent-peer-1',
        peerType: 'AGENT',
        deviceId: deviceA.id,
        token: agentToken,
        send: (msg) => agentMessages.push(msg)
      });

      // Authorized Client
      const authSession = await context.sessionService.createRemoteSession({
        deviceId: deviceA.id,
        clientId: 'client-legit',
        clientUserId: USER_A
      });

      // Rogue / Outsider Peer
      const outsiderMessages: SignalingMessage[] = [];
      const { publicKey: pkB } = CryptoUtil.generateKeyPair();
      const deviceB = await context.deviceService.registerDevice({
        name: 'Rogue PC',
        hardwareIdentifier: 'HW-ROGUE-1',
        publicKey: pkB,
        ownerId: USER_B
      });
      const { token: rogueToken } = await context.deviceService.issueDeviceToken(deviceB.id, USER_B);

      context.signalingHub.registerPeer({
        peerId: 'client-rogue',
        peerType: 'CLIENT',
        deviceId: deviceB.id,
        token: rogueToken,
        send: (msg) => outsiderMessages.push(msg)
      });

      // Rogue peer attempts to inject an OFFER into authSession
      await context.signalingHub.handleMessage('client-rogue', {
        type: SignalingMessageType.OFFER,
        sessionId: authSession.id,
        senderId: 'client-rogue',
        targetId: 'agent-peer-1',
        payload: { sdp: 'fake-sdp-hijack' }
      });

      // Verify Rogue peer is rejected with error message
      const lastOutsiderMsg = outsiderMessages[outsiderMessages.length - 1];
      expect(lastOutsiderMsg.type).toBe(SignalingMessageType.ERROR);
      expect(lastOutsiderMsg.error).toContain('Unauthorized: Peer does not belong to this session');

      // Verify legitimate agent NEVER received the hijacked offer
      const receivedOffer = agentMessages.find(m => m.type === SignalingMessageType.OFFER);
      expect(receivedOffer).toBeUndefined();
    });

    it('CRIT-SEC-02: Instant Revocation — WebSocket connection immediately terminated upon device revocation', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Revoke-Target PC',
        hardwareIdentifier: 'HW-REVOKE-WS',
        publicKey,
        ownerId: USER_A
      });

      const { token } = await context.deviceService.issueDeviceToken(device.id, USER_A);
      const agentMessages: SignalingMessage[] = [];
      context.signalingHub.registerPeer({
        peerId: 'ws-agent-active',
        peerType: 'AGENT',
        deviceId: device.id,
        token,
        send: (msg) => agentMessages.push(msg)
      });

      expect(context.signalingHub.getPeer('ws-agent-active')).toBeDefined();

      // Active session also running
      const session = await context.sessionService.createRemoteSession({
        deviceId: device.id,
        clientId: 'client-session-1',
        clientUserId: USER_A
      });
      await context.sessionService.activateSession(session.id);

      // Trigger revocation
      await context.deviceService.revokeDevice(device.id, USER_A, 'Security breach reported');

      // 1. WebSocket peer must be disconnected from hub
      expect(context.signalingHub.getPeer('ws-agent-active')).toBeUndefined();

      // 2. Peer received DEVICE_REVOKED error message
      const errorMsg = agentMessages.find(m => m.payload?.code === 'DEVICE_REVOKED');
      expect(errorMsg).toBeDefined();

      // 3. Active session must be forcefully terminated
      const currentSession = context.sessionService.getSession(session.id);
      expect(currentSession?.status).toBe(RemoteSessionStatus.DISCONNECTED);
    });

    it('CRIT-SEC-03: Concurrency — 10 simultaneous session requests execute safely with atomic unique tokens', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Concurrent PC',
        hardwareIdentifier: 'HW-CONCURRENCY-1',
        publicKey,
        ownerId: USER_A
      });

      const promises = Array.from({ length: 10 }).map((_, i) =>
        context.sessionService.createRemoteSession({
          deviceId: device.id,
          clientId: `concurrent-client-${i}`,
          clientUserId: USER_A
        })
      );

      const sessions = await Promise.all(promises);
      expect(sessions.length).toBe(10);

      const tokens = sessions.map(s => s.sessionToken);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(10); // All unique tokens
    });
  });

  describe('2. Network Verification: LAN Discovery, P2P & TURN Relay', () => {
    it('CRIT-NET-01: LAN UDP Discovery Packet Protocol roundtrip encoding/decoding', () => {
      const probe = LanDiscoveryProtocol.createDiscoveryProbe();
      expect(probe.toString('utf-8')).toBe(LanDiscoveryProtocol.DISCOVERY_MAGIC);

      const isProbe = LanDiscoveryProtocol.isDiscoveryProbe(probe);
      expect(isProbe).toBe(true);

      const packetPayload = {
        deviceId: 'dev-1234',
        name: 'Living Room PC',
        port: 8989,
        publicKeyHash: 'sha256:abc12345',
        version: '2.0.0-phase2'
      };

      const encoded = LanDiscoveryProtocol.createAnnouncement(packetPayload);
      const decoded = LanDiscoveryProtocol.parseAnnouncement(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.deviceId).toBe('dev-1234');
      expect(decoded?.name).toBe('Living Room PC');
      expect(decoded?.port).toBe(8989);
    });

    it('CRIT-NET-02: Zero-Trust Post-LAN Discovery Gate — Discovery does NOT grant access without crypto verification', async () => {
      const { publicKey, privateKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'LAN Discovered PC',
        hardwareIdentifier: 'HW-LAN-AUTH',
        publicKey,
        ownerId: USER_A
      });

      // Android Client discovers IP:port via UDP broadcast, but has NO token yet
      // Client cannot create session directly with an invalid user
      await expect(
        context.sessionService.createRemoteSession({
          deviceId: device.id,
          clientId: 'client-lan',
          clientUserId: USER_B // Wrong user
        })
      ).rejects.toThrow(ForbiddenError);

      // Client must perform cryptographic challenge-response authentication with PC's private key
      const challenge = context.deviceService.createAuthChallenge(device.id);
      const signature = CryptoUtil.signData(privateKey, challenge);

      const verified = await context.deviceService.verifyAuthChallenge(device.id, challenge, signature);
      expect(verified).toBe(true);
    });

    it('CRIT-NET-03: Coturn Ephemeral Credentials & Relay Fallback Configuration', () => {
      const servers = TurnUtil.generateIceServers('client-test-id');
      expect(servers.length).toBeGreaterThanOrEqual(2);

      // STUN Server presence
      const stunServer = servers.find(s => s.urls.includes('stun:stun.l.google.com:19302'));
      expect(stunServer).toBeDefined();

      // Coturn Relay presence
      const turnServer = servers.find(s => s.urls.includes('turn:turn.ntrungz.dev:3478?transport=udp'));
      expect(turnServer).toBeDefined();
      expect(turnServer?.username).toBeDefined();
      expect(turnServer?.credential).toBeDefined();
    });
  });

  describe('3. Presence & Multi-PC Resiliency Verification', () => {
    it('CRIT-RES-01: Heartbeat Timeout Detection — Sweeper marks offline after 45s inactivity', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Sweeper Test PC',
        hardwareIdentifier: 'HW-SWEEP-1',
        publicKey,
        ownerId: USER_A
      });

      // Send initial heartbeat
      await context.presenceService.recordHeartbeat(device.id, '192.168.1.100');

      const presenceInitial = context.presenceService.getPresence(device.id);
      expect(presenceInitial.status).toBe(DeviceStatus.ONLINE);

      // Simulate 50 seconds passing (beyond 45s threshold)
      const pastTime = new Date(Date.now() - 50_000);
      context.presenceService.setLastSeen(device.id, pastTime);

      // Run sweeper
      const offlineDevices = context.presenceService.sweepTimeouts();
      expect(offlineDevices).toContain(device.id);

      const presenceAfterSweep = context.presenceService.getPresence(device.id);
      expect(presenceAfterSweep.status).toBe(DeviceStatus.OFFLINE);
      expect(presenceAfterSweep.isReachable).toBe(false);
    });

    it('CRIT-RES-02: Temporary Network Loss & Auto-Reconnect Recovery', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await context.deviceService.registerDevice({
        name: 'Reconnect PC',
        hardwareIdentifier: 'HW-RECONNECT-1',
        publicKey,
        ownerId: USER_A
      });

      // Mark offline
      await context.presenceService.handleDisconnect(device.id);
      expect(context.presenceService.getPresence(device.id).status).toBe(DeviceStatus.OFFLINE);

      // PC recovers connection and sends heartbeat with new DHCP IP
      const recovered = await context.presenceService.recordHeartbeat(device.id, '192.168.1.155');

      expect(recovered.status).toBe(DeviceStatus.ONLINE);
      expect(recovered.ipAddress).toBe('192.168.1.155');
      expect(recovered.isReachable).toBe(true);
    });

    it('CRIT-RES-03: Multi-PC Management — User manages multiple PCs independently', async () => {
      const { publicKey: pk1 } = CryptoUtil.generateKeyPair();
      const { publicKey: pk2 } = CryptoUtil.generateKeyPair();
      const { publicKey: pk3 } = CryptoUtil.generateKeyPair();

      const dev1 = await context.deviceService.registerDevice({ name: 'Workstation', hardwareIdentifier: 'HW-1', publicKey: pk1, ownerId: USER_A });
      const dev2 = await context.deviceService.registerDevice({ name: 'Gaming Rig', hardwareIdentifier: 'HW-2', publicKey: pk2, ownerId: USER_A });
      const dev3 = await context.deviceService.registerDevice({ name: 'Home Server', hardwareIdentifier: 'HW-3', publicKey: pk3, ownerId: USER_A });

      await context.presenceService.recordHeartbeat(dev1.id, '10.0.0.1');
      await context.presenceService.recordHeartbeat(dev2.id, '10.0.0.2');
      // dev3 has not sent heartbeat

      const userDevices = await context.presenceService.listUserDevicesWithPresence(USER_A);
      expect(userDevices.length).toBe(3);

      const d1 = userDevices.find(d => d.id === dev1.id);
      const d2 = userDevices.find(d => d.id === dev2.id);
      const d3 = userDevices.find(d => d.id === dev3.id);

      expect(d1?.status).toBe(DeviceStatus.ONLINE);
      expect(d2?.status).toBe(DeviceStatus.ONLINE);
      expect(d3?.status).toBe(DeviceStatus.OFFLINE);
    });
  });
});
