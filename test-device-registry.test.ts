import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { CryptoUtil } from './services/api/src/utils/crypto';
import { DeviceService } from './services/api/src/services/device.service';
import { PairingService } from './services/api/src/services/pairing.service';
import { AuditService } from './services/api/src/services/audit.service';
import { 
  DeviceStatus, 
  PairingStatus, 
  AuditEventType 
} from './packages/shared/src/types';
import { 
  ForbiddenError, 
  ValidationError, 
  PairingExpiredError, 
  PairingLockedError, 
  DeviceRevokedError 
} from './packages/shared/src/errors';

describe('Ntrungz Remote Control — Phase 1 Test Suite', () => {
  let auditService: AuditService;
  let deviceService: DeviceService;
  let pairingService: PairingService;

  const OWNER_A = crypto.randomUUID();
  const OWNER_B = crypto.randomUUID();

  beforeEach(() => {
    auditService = new AuditService();
    deviceService = new DeviceService(auditService);
    pairingService = new PairingService(deviceService, auditService);
  });

  describe('1. Cryptographic Security Engine', () => {
    it('should generate secure 6-digit PIN', () => {
      const pin = CryptoUtil.generatePin();
      expect(pin).toMatch(/^\d{6}$/);
      expect(Number(pin)).toBeGreaterThanOrEqual(100000);
      expect(Number(pin)).toBeLessThan(1000000);
    });

    it('should hash and verify PIN with timing-safe comparison', () => {
      const pin = '811873';
      const salt = CryptoUtil.generateSalt();
      const hash = CryptoUtil.hashPin(pin, salt);

      expect(CryptoUtil.verifyPin('811873', salt, hash)).toBe(true);
      expect(CryptoUtil.verifyPin('123456', salt, hash)).toBe(false);
      expect(CryptoUtil.verifyPin('811874', salt, hash)).toBe(false);
    });

    it('should generate Ed25519 keypair and verify signatures', () => {
      const { publicKey, privateKey } = CryptoUtil.generateKeyPair();
      expect(publicKey).toContain('BEGIN PUBLIC KEY');
      expect(privateKey).toContain('BEGIN PRIVATE KEY');

      const data = 'MachineGuid:66ab020e-bed4-4494-869c-16ffcb138738';
      const signature = CryptoUtil.signData(privateKey, data);

      const isValid = CryptoUtil.verifySignature(publicKey, data, signature);
      expect(isValid).toBe(true);

      const isInvalid = CryptoUtil.verifySignature(publicKey, 'Forged Data', signature);
      expect(isInvalid).toBe(false);
    });
  });

  describe('2. Device Registry & Multi-Device Isolation', () => {
    it('should register a new Windows device with public key', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await deviceService.registerDevice({
        name: 'Work PC Ntrungz',
        hardwareIdentifier: '66ab020e-bed4-4494-869c-16ffcb138738',
        publicKey,
        osInfo: 'Windows 11 Pro 64-bit',
        ownerId: OWNER_A
      });

      expect(device.id).toBeDefined();
      expect(device.name).toBe('Work PC Ntrungz');
      expect(device.status).toBe(DeviceStatus.UNPAIRED);
      expect(device.ownerId).toBe(OWNER_A);
    });

    it('should enforce strict cross-user isolation (User B cannot access User A device)', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const deviceA = await deviceService.registerDevice({
        name: 'PC Owner A',
        hardwareIdentifier: 'HW-A-1234',
        publicKey,
        ownerId: OWNER_A
      });

      // User A can access own device
      const retrieved = await deviceService.getDevice(deviceA.id, OWNER_A);
      expect(retrieved.id).toBe(deviceA.id);

      // User B is forbidden from accessing User A device
      await expect(deviceService.getDevice(deviceA.id, OWNER_B))
        .rejects.toThrow(ForbiddenError);
    });

    it('should support key rotation / update on re-registration', async () => {
      const pair1 = CryptoUtil.generateKeyPair();
      const pair2 = CryptoUtil.generateKeyPair();

      const dev1 = await deviceService.registerDevice({
        name: 'My PC',
        hardwareIdentifier: 'HW-FIXED-ID',
        publicKey: pair1.publicKey,
        ownerId: OWNER_A
      });

      const dev2 = await deviceService.registerDevice({
        name: 'My PC Updated',
        hardwareIdentifier: 'HW-FIXED-ID',
        publicKey: pair2.publicKey,
        ownerId: OWNER_A
      });

      expect(dev1.id).toBe(dev2.id); // Same device ID maintained
      expect(dev2.publicKey).toBe(pair2.publicKey);
      expect(dev2.name).toBe('My PC Updated');
    });
  });

  describe('3. Zero-Trust Pairing Protocol & Security Controls', () => {
    it('should start pairing session and verify with correct PIN', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await deviceService.registerDevice({
        name: 'Living Room PC',
        hardwareIdentifier: 'HW-TEST-PAIR',
        publicKey,
        ownerId: OWNER_A
      });

      const pairSession = await pairingService.startPairing({
        deviceId: device.id,
        userId: OWNER_A
      });

      expect(pairSession.sessionId).toBeDefined();
      expect(pairSession.pin).toMatch(/^\d{6}$/);

      const verifyRes = await pairingService.verifyPairing({
        sessionId: pairSession.sessionId,
        pin: pairSession.pin,
        userId: OWNER_A
      });

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.deviceToken).toMatch(/^dev_tok_/);

      const updatedDevice = await deviceService.getDevice(device.id, OWNER_A);
      expect(updatedDevice.status).toBe(DeviceStatus.PAIRED);
    });

    it('should prevent replay attacks when attempting to use PIN a second time', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await deviceService.registerDevice({
        name: 'Office PC',
        hardwareIdentifier: 'HW-REPLAY-TEST',
        publicKey,
        ownerId: OWNER_A
      });

      const session = await pairingService.startPairing({
        deviceId: device.id,
        userId: OWNER_A
      });

      // First verification succeeds
      await pairingService.verifyPairing({
        sessionId: session.sessionId,
        pin: session.pin,
        userId: OWNER_A
      });

      // Second verification attempt MUST FAIL (Anti-replay guard)
      await expect(pairingService.verifyPairing({
        sessionId: session.sessionId,
        pin: session.pin,
        userId: OWNER_A
      })).rejects.toThrow(ValidationError);
    });

    it('should lockout session after 3 consecutive wrong PIN attempts (Brute-Force Guard)', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await deviceService.registerDevice({
        name: 'Secure Laptop',
        hardwareIdentifier: 'HW-BRUTE-TEST',
        publicKey,
        ownerId: OWNER_A
      });

      const session = await pairingService.startPairing({
        deviceId: device.id,
        userId: OWNER_A
      });

      // Attempt 1: wrong PIN
      await expect(pairingService.verifyPairing({
        sessionId: session.sessionId,
        pin: '000000',
        userId: OWNER_A
      })).rejects.toThrow('2 attempt(s) remaining');

      // Attempt 2: wrong PIN
      await expect(pairingService.verifyPairing({
        sessionId: session.sessionId,
        pin: '111111',
        userId: OWNER_A
      })).rejects.toThrow('1 attempt(s) remaining');

      // Attempt 3: wrong PIN -> Triggers LOCKOUT
      await expect(pairingService.verifyPairing({
        sessionId: session.sessionId,
        pin: '222222',
        userId: OWNER_A
      })).rejects.toThrow(PairingLockedError);

      // Attempt 4 even with correct PIN must be blocked because session is locked!
      await expect(pairingService.verifyPairing({
        sessionId: session.sessionId,
        pin: session.pin,
        userId: OWNER_A
      })).rejects.toThrow(PairingLockedError);
    });

    it('should reject expired PINs', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await deviceService.registerDevice({
        name: 'Expired Test PC',
        hardwareIdentifier: 'HW-EXPIRED-TEST',
        publicKey,
        ownerId: OWNER_A
      });

      const session = await pairingService.startPairing({
        deviceId: device.id,
        userId: OWNER_A,
        validityMinutes: 10
      });

      // Manually simulate expiration in past
      const rawSession = pairingService.getSession(session.sessionId)!;
      rawSession.expiresAt = new Date(Date.now() - 1000); // 1 sec ago

      await expect(pairingService.verifyPairing({
        sessionId: session.sessionId,
        pin: session.pin,
        userId: OWNER_A
      })).rejects.toThrow(PairingExpiredError);
    });

    it('should prevent pairing on revoked devices and allow manual revocation', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await deviceService.registerDevice({
        name: 'Revoke Test PC',
        hardwareIdentifier: 'HW-REVOKE-TEST',
        publicKey,
        ownerId: OWNER_A
      });

      // Revoke device
      await deviceService.revokeDevice(device.id, OWNER_A, 'Security compromise suspicion');

      const revoked = await deviceService.getDevice(device.id, OWNER_A);
      expect(revoked.status).toBe(DeviceStatus.REVOKED);

      // Attempt to start pairing on revoked device must fail
      await expect(pairingService.startPairing({
        deviceId: device.id,
        userId: OWNER_A
      })).rejects.toThrow(DeviceRevokedError);
    });
  });

  describe('4. Audit Trail & Incident Logging', () => {
    it('should record comprehensive audit events for all critical actions', async () => {
      const { publicKey } = CryptoUtil.generateKeyPair();
      const device = await deviceService.registerDevice({
        name: 'Audit PC',
        hardwareIdentifier: 'HW-AUDIT-TEST',
        publicKey,
        ownerId: OWNER_A
      });

      const session = await pairingService.startPairing({
        deviceId: device.id,
        userId: OWNER_A
      });

      await pairingService.verifyPairing({
        sessionId: session.sessionId,
        pin: session.pin,
        userId: OWNER_A
      });

      const logs = auditService.getLogs({ deviceId: device.id });
      expect(logs.length).toBeGreaterThanOrEqual(3);

      const eventTypes = logs.map(l => l.eventType);
      expect(eventTypes).toContain(AuditEventType.DEVICE_REGISTERED);
      expect(eventTypes).toContain(AuditEventType.PAIRING_REQUESTED);
      expect(eventTypes).toContain(AuditEventType.PAIRING_SUCCESSFUL);
    });
  });
});

import { buildApp } from './services/api/src/app';

describe('5. Fastify REST API Integration Tests', () => {
  const app = buildApp();
  const USER_ID = crypto.randomUUID();
  let registeredDeviceId: string;
  let activeSessionId: string;
  let activePin: string;

  it('GET /api/v1/health should return UP status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('UP');
    expect(body.service).toBe('ntrungz-remote-control-api');
  });

  it('POST /api/v1/devices/register should validate and register device', async () => {
    const { publicKey } = CryptoUtil.generateKeyPair();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices/register',
      payload: {
        name: 'Windows 11 Machine',
        hardwareIdentifier: '66ab020e-bed4-4494-869c-16ffcb138738',
        publicKey,
        ownerId: USER_ID
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe('Windows 11 Machine');
    registeredDeviceId = body.data.id;
  });

  it('GET /api/v1/devices should return user devices', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: {
        'x-user-id': USER_ID
      }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/pairing/start should initiate pairing session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pairing/start',
      payload: {
        deviceId: registeredDeviceId,
        userId: USER_ID,
        validityMinutes: 10
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.sessionId).toBeDefined();
    expect(body.data.pin).toMatch(/^\d{6}$/);
    activeSessionId = body.data.sessionId;
    activePin = body.data.pin;
  });

  it('POST /api/v1/pairing/verify should verify valid PIN and issue token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pairing/verify',
      payload: {
        sessionId: activeSessionId,
        pin: activePin,
        userId: USER_ID
      }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.deviceToken).toMatch(/^dev_tok_/);
  });

  it('DELETE /api/v1/devices/:id/revoke should revoke device access', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/devices/${registeredDeviceId}/revoke`,
      headers: {
        'x-user-id': USER_ID
      },
      payload: {
        reason: 'Automated test revocation'
      }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('REVOKED');
  });
});

describe('6. Ed25519 Cryptographic Challenge-Response Protocol (Anti-Replay Verification)', () => {
  let auditService: AuditService;
  let deviceService: DeviceService;
  const USER_ID = crypto.randomUUID();

  beforeEach(() => {
    auditService = new AuditService();
    deviceService = new DeviceService(auditService);
  });

  it('should generate unpredictable random nonce challenge with 5-minute TTL', async () => {
    const { publicKey } = CryptoUtil.generateKeyPair();
    const device = await deviceService.registerDevice({
      name: 'Cryptographic Agent PC',
      hardwareIdentifier: 'HW-CHALLENGE-1',
      publicKey,
      ownerId: USER_ID
    });

    const nonce1 = deviceService.createAuthChallenge(device.id);
    const nonce2 = deviceService.createAuthChallenge(device.id);

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2); // Unpredictable
    expect(nonce1.length).toBe(64);  // 32-byte hex
  });

  it('should verify valid challenge signature signed with device Ed25519 private key', async () => {
    const { publicKey, privateKey } = CryptoUtil.generateKeyPair();
    const device = await deviceService.registerDevice({
      name: 'Ed25519 PC',
      hardwareIdentifier: 'HW-ED25519-AUTH',
      publicKey,
      ownerId: USER_ID
    });

    const nonce = deviceService.createAuthChallenge(device.id);
    const signature = CryptoUtil.signData(privateKey, nonce);

    const isValid = deviceService.verifyAuthChallenge(device.id, nonce, signature);
    expect(isValid).toBe(true);
  });

  it('should reject consumed challenge on second attempt (Anti-Replay Challenge Guard)', async () => {
    const { publicKey, privateKey } = CryptoUtil.generateKeyPair();
    const device = await deviceService.registerDevice({
      name: 'Ed25519 PC',
      hardwareIdentifier: 'HW-REPLAY-CHALLENGE',
      publicKey,
      ownerId: USER_ID
    });

    const nonce = deviceService.createAuthChallenge(device.id);
    const signature = CryptoUtil.signData(privateKey, nonce);

    // First attempt succeeds
    expect(deviceService.verifyAuthChallenge(device.id, nonce, signature)).toBe(true);

    // Second attempt MUST FAIL (Anti-replay nonce consumption)
    expect(() => deviceService.verifyAuthChallenge(device.id, nonce, signature))
      .toThrow('Challenge already consumed');
  });

  it('should reject invalid or forged cryptographic signatures', async () => {
    const pairA = CryptoUtil.generateKeyPair();
    const pairB = CryptoUtil.generateKeyPair();

    const device = await deviceService.registerDevice({
      name: 'Target PC',
      hardwareIdentifier: 'HW-FORGERY-TEST',
      publicKey: pairA.publicKey,
      ownerId: USER_ID
    });

    const nonce = deviceService.createAuthChallenge(device.id);
    // Attacker signs with a different private key (Pair B)
    const forgedSignature = CryptoUtil.signData(pairB.privateKey, nonce);

    expect(() => deviceService.verifyAuthChallenge(device.id, nonce, forgedSignature))
      .toThrow('signature verification failed');
  });
});

describe('7. Device Token Storage, Expiration & Revocation Verification', () => {
  let auditService: AuditService;
  let deviceService: DeviceService;
  let pairingService: PairingService;
  const USER_ID = crypto.randomUUID();

  beforeEach(() => {
    auditService = new AuditService();
    deviceService = new DeviceService(auditService);
    pairingService = new PairingService(deviceService, auditService);
  });

  it('should issue valid token, hash before storing, and validate active token', async () => {
    const { publicKey } = CryptoUtil.generateKeyPair();
    const device = await deviceService.registerDevice({
      name: 'Token PC',
      hardwareIdentifier: 'HW-TOKEN-TEST',
      publicKey,
      ownerId: USER_ID
    });

    const pair = await pairingService.startPairing({ deviceId: device.id, userId: USER_ID });
    const verifyRes = await pairingService.verifyPairing({
      sessionId: pair.sessionId,
      pin: pair.pin,
      userId: USER_ID
    });

    expect(verifyRes.deviceToken).toBeDefined();

    // Validate token against backend
    const validated = deviceService.validateDeviceToken(verifyRes.deviceToken);
    expect(validated.deviceId).toBe(device.id);
    expect(validated.userId).toBe(USER_ID);
  });

  it('should IMMEDIATELY invalidate device token when device is revoked', async () => {
    const { publicKey } = CryptoUtil.generateKeyPair();
    const device = await deviceService.registerDevice({
      name: 'Revocable PC',
      hardwareIdentifier: 'HW-TOKEN-REVOKE-TEST',
      publicKey,
      ownerId: USER_ID
    });

    const pair = await pairingService.startPairing({ deviceId: device.id, userId: USER_ID });
    const verifyRes = await pairingService.verifyPairing({
      sessionId: pair.sessionId,
      pin: pair.pin,
      userId: USER_ID
    });

    // Verify token works initially
    expect(deviceService.validateDeviceToken(verifyRes.deviceToken).deviceId).toBe(device.id);

    // Revoke device
    await deviceService.revokeDevice(device.id, USER_ID, 'Suspected leak');

    // Subsequent token validation MUST BE REJECTED immediately!
    expect(() => deviceService.validateDeviceToken(verifyRes.deviceToken))
      .toThrow('token has been revoked');
  });
});

describe('8. Pairing Concurrency & Atomic Race Condition Verification', () => {
  let auditService: AuditService;
  let deviceService: DeviceService;
  let pairingService: PairingService;
  const USER_ID = crypto.randomUUID();

  beforeEach(() => {
    auditService = new AuditService();
    deviceService = new DeviceService(auditService);
    pairingService = new PairingService(deviceService, auditService);
  });

  it('should handle simultaneous concurrent pairing verification attempts (only 1 succeeds, concurrent is blocked)', async () => {
    const { publicKey } = CryptoUtil.generateKeyPair();
    const device = await deviceService.registerDevice({
      name: 'Concurrent PC',
      hardwareIdentifier: 'HW-CONCURRENT-TEST',
      publicKey,
      ownerId: USER_ID
    });

    const session = await pairingService.startPairing({
      deviceId: device.id,
      userId: USER_ID
    });

    // Simulate two simultaneous requests firing with the exact same PIN
    const results = await Promise.allSettled([
      pairingService.verifyPairing({ sessionId: session.sessionId, pin: session.pin, userId: USER_ID }),
      pairingService.verifyPairing({ sessionId: session.sessionId, pin: session.pin, userId: USER_ID })
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // EXACTLY 1 MUST SUCCEED, and 1 MUST BE REJECTED (Atomic Guarantee)
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });
});
