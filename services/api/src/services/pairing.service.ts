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
  // Mutex lock map để đảm bảo tính nguyên tử (Atomic Lock) chống race condition
  private sessionLocks = new Map<string, boolean>();

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
   * Xác thực mã PIN với Atomic Lock chống Concurrency & Race Condition
   */
  public async verifyPairing(input: {
    sessionId: string;
    pin: string;
    userId: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; deviceToken: string }> {
    // 1. Atomic Concurrency Lock Guard
    if (this.sessionLocks.get(input.sessionId)) {
      throw new ValidationError('A verification request is already in progress for this session (Concurrent access blocked)');
    }

    // Đặt khóa xử lý nguyên tử
    this.sessionLocks.set(input.sessionId, true);

    try {
      const session = this.sessions.get(input.sessionId);
      if (!session) {
        throw new NotFoundError('Pairing session not found or invalid');
      }

      // 2. Chống Replay: Đã verify thì từ chối ngay
      if (session.status === PairingStatus.VERIFIED) {
        throw new ValidationError('This pairing session has already been used (Replay attack prevented)');
      }

      // 3. Kiểm tra Revoked
      if (session.status === PairingStatus.REVOKED) {
        throw new ValidationError('This pairing session has been revoked');
      }

      // 4. Kiểm tra Brute-Force Lockout
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

      // 5. Kiểm tra Expiration
      if (now > session.expiresAt) {
        session.status = PairingStatus.EXPIRED;
        throw new PairingExpiredError('Pairing PIN has expired. Please request a new PIN.');
      }

      // 6. Kiểm tra Device Status
      const device = this.deviceService.getRawDevice(session.deviceId);
      if (!device || device.status === DeviceStatus.REVOKED) {
        throw new DeviceRevokedError('Associated device has been revoked');
      }

      // 7. So khớp hash PIN an toàn (Timing-Safe scrypt)
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

      // 8. Đánh dấu VERIFIED ngay lập tức
      session.status = PairingStatus.VERIFIED;
      await this.deviceService.updateStatus(session.deviceId, DeviceStatus.PAIRED);

      // 9. Cấp Device Token an toàn và lưu trữ hash
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
    } finally {
      // Giải phóng khóa nguyên tử
      this.sessionLocks.delete(input.sessionId);
    }
  }

  public getSession(sessionId: string): PairingSession | undefined {
    return this.sessions.get(sessionId);
  }
}
