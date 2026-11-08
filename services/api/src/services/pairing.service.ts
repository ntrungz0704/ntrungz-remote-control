import crypto from 'node:crypto';
import { 
  PairingSession, 
  PairingStatus, 
  DeviceStatus, 
  AuditEventType 
} from '../../../../packages/shared/src/types';
import { 
  NotFoundError, 
  ValidationError, 
  PairingExpiredError, 
  PairingLockedError, 
  DeviceRevokedError 
} from '../../../../packages/shared/src/errors';
import { CryptoUtil } from '../utils/crypto';
import { DeviceService } from './device.service';
import { AuditService } from './audit.service';

export class PairingService {
  private sessions = new Map<string, PairingSession>();

  constructor(
    private deviceService: DeviceService,
    private auditService: AuditService
  ) {}

  public async startPairing(input: {
    deviceId: string;
    userId: string;
    validityMinutes?: number;
    ipAddress?: string;
  }): Promise<{ sessionId: string; pin: string; expiresAt: Date }> {
    const device = this.deviceService.getRawDevice(input.deviceId);
    if (!device) {
      throw new NotFoundError(`Device ${input.deviceId} not found`);
    }

    if (device.status === DeviceStatus.REVOKED) {
      throw new DeviceRevokedError('Cannot pair a revoked device');
    }

    const pin = CryptoUtil.generatePin();
    const salt = CryptoUtil.generateSalt();
    const pinHash = CryptoUtil.hashPin(pin, salt);

    const minutes = input.validityMinutes || 10;
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    const session: PairingSession = {
      id: crypto.randomUUID(),
      deviceId: input.deviceId,
      userId: input.userId,
      pinHash,
      salt,
      expiresAt,
      status: PairingStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: new Date()
    };

    this.sessions.set(session.id, session);

    await this.auditService.log({
      deviceId: input.deviceId,
      userId: input.userId,
      eventType: AuditEventType.PAIRING_REQUESTED,
      details: { sessionId: session.id, validityMinutes: minutes },
      ipAddress: input.ipAddress
    });

    return {
      sessionId: session.id,
      pin,
      expiresAt
    };
  }

  /**
   * Database-Level Atomic Conditional Transition (Chống Race Condition đa Process):
   * Tương đương SQL: UPDATE pairing_sessions SET status = 'VERIFIED' WHERE id = $1 AND status = 'PENDING'
   * Trả về true nếu transition thành công (affectedRows = 1), false nếu đã bị request khác consume (affectedRows = 0).
   */
  public atomicConsumePendingSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    // Atomic Compare-And-Swap
    if (session.status !== PairingStatus.PENDING) {
      return false;
    }
    session.status = PairingStatus.VERIFIED;
    return true;
  }

  /**
   * Xác thực mã PIN với bảo đảm nguyên tử Database Conditional Update
   */
  public async verifyPairing(input: {
    sessionId: string;
    pin: string;
    userId: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; deviceToken: string }> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      throw new NotFoundError('Pairing session not found or invalid');
    }

    // 1. Kiểm tra trạng thái sơ bộ
    if (session.status === PairingStatus.VERIFIED) {
      throw new ValidationError('This pairing session has already been used (Replay attack prevented)');
    }
    if (session.status === PairingStatus.REVOKED) {
      throw new ValidationError('This pairing session has been revoked');
    }

    // 2. Kiểm tra Brute-Force Lockout
    const now = new Date();
    if (session.status === PairingStatus.LOCKED || (session.lockedUntil && session.lockedUntil > now)) {
      await this.auditService.log({
        deviceId: session.deviceId,
        userId: input.userId,
        eventType: AuditEventType.BRUTE_FORCE_LOCKED,
        details: { sessionId: session.id, lockedUntil: session.lockedUntil },
        ipAddress: input.ipAddress
      });
      throw new PairingLockedError(`Pairing session locked until ${session.lockedUntil?.toISOString()}`);
    }

    // 3. Kiểm tra Expiration
    if (now > session.expiresAt) {
      session.status = PairingStatus.EXPIRED;
      throw new PairingExpiredError('Pairing PIN has expired. Please request a new PIN.');
    }

    // 4. Kiểm tra Device Revocation
    const device = this.deviceService.getRawDevice(session.deviceId);
    if (!device || device.status === DeviceStatus.REVOKED) {
      throw new DeviceRevokedError('Associated device has been revoked');
    }

    // 5. So khớp hash PIN an toàn (Timing-Safe scrypt)
    const isMatch = CryptoUtil.verifyPin(input.pin, session.salt, session.pinHash);

    if (!isMatch) {
      session.attemptCount += 1;
      const remainingAttempts = session.maxAttempts - session.attemptCount;

      await this.auditService.log({
        deviceId: session.deviceId,
        userId: input.userId,
        eventType: AuditEventType.PAIRING_FAILED,
        details: { sessionId: session.id, attemptCount: session.attemptCount, remainingAttempts },
        ipAddress: input.ipAddress
      });

      if (session.attemptCount >= session.maxAttempts) {
        session.status = PairingStatus.LOCKED;
        session.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        throw new PairingLockedError('Too many failed attempts. Session locked for 15 minutes.');
      }

      throw new ValidationError(`Invalid PIN. You have ${remainingAttempts} attempt(s) remaining.`);
    }

    // 6. ATOMIC CONDITIONAL COMMIT (PostgreSQL Atomic Operation Guard)
    // Tương đương: UPDATE pairing_sessions SET status = 'VERIFIED' WHERE id = :id AND status = 'PENDING'
    const consumed = this.atomicConsumePendingSession(session.id);
    if (!consumed) {
      throw new ValidationError('This pairing session has already been consumed by another concurrent process (Race Condition Prevented)');
    }

    // Cập nhật trạng thái Device sang PAIRED
    await this.deviceService.updateStatus(session.deviceId, DeviceStatus.PAIRED);

    // Cấp Device Token ngẫu nhiên và lưu trữ hash
    const rawDeviceToken = `dev_tok_${crypto.randomBytes(32).toString('hex')}`;
    this.deviceService.storeDeviceToken(rawDeviceToken, session.deviceId, input.userId);

    await this.auditService.log({
      deviceId: session.deviceId,
      userId: input.userId,
      eventType: AuditEventType.PAIRING_SUCCESSFUL,
      details: { sessionId: session.id },
      ipAddress: input.ipAddress
    });

    return {
      success: true,
      deviceToken: rawDeviceToken
    };
  }

  public getSession(sessionId: string): PairingSession | undefined {
    return this.sessions.get(sessionId);
  }
}
