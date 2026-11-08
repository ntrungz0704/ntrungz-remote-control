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

  /**
   * Khởi tạo phiên ghép cặp mới
   * Trả về session ID và PIN 6 số hiển thị cục bộ trên màn hình máy tính (One-time)
   */
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

    // Sinh PIN 6 số an toàn
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

    // Chỉ trả PIN 1 lần duy nhất này để Windows Agent hiển thị lên màn hình desktop
    return {
      sessionId: session.id,
      pin,
      expiresAt
    };
  }

  /**
   * Xác thực mã PIN từ thiết bị điều khiển (Client / Android)
   * Kiểm tra nghiêm ngặt: Hết hạn, Quá số lần thử, Chống Replay, Khóa Brute-force
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

    // 1. Chống Replay: Phiên đã xác thực rồi không được dùng lại
    if (session.status === PairingStatus.VERIFIED) {
      throw new ValidationError('This pairing session has already been used (Replay attack prevented)');
    }

    // 2. Kiểm tra nếu phiên đã bị thu hồi
    if (session.status === PairingStatus.REVOKED) {
      throw new ValidationError('This pairing session has been revoked');
    }

    // 3. Kiểm tra khóa Brute-force (Locked)
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

    // 4. Kiểm tra thời hạn hết hạn (Expiration)
    if (now > session.expiresAt) {
      session.status = PairingStatus.EXPIRED;
      throw new PairingExpiredError('Pairing PIN has expired. Please request a new PIN.');
    }

    // 5. Kiểm tra thiết bị có bị Revoke ở mức Device không
    const device = this.deviceService.getRawDevice(session.deviceId);
    if (!device || device.status === DeviceStatus.REVOKED) {
      throw new DeviceRevokedError('Associated device has been revoked');
    }

    // 6. Kiểm tra mã PIN (Timing-Safe scrypt hash comparison)
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
        // Khóa brute-force 15 phút
        session.status = PairingStatus.LOCKED;
        session.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        throw new PairingLockedError('Too many failed attempts. Session locked for 15 minutes.');
      }

      throw new ValidationError(`Invalid PIN. You have ${remainingAttempts} attempt(s) remaining.`);
    }

    // 7. Xác thực thành công: Đánh dấu VERIFIED (One-time use consumption)
    session.status = PairingStatus.VERIFIED;
    await this.deviceService.updateStatus(session.deviceId, DeviceStatus.PAIRED);

    // Cấp Device Token ngẫu nhiên (Session Token cho Client)
    const deviceToken = `dev_tok_${crypto.randomBytes(32).toString('hex')}`;

    await this.auditService.log({
      deviceId: session.deviceId,
      userId: input.userId,
      eventType: AuditEventType.PAIRING_SUCCESSFUL,
      details: { sessionId: session.id },
      ipAddress: input.ipAddress
    });

    return {
      success: true,
      deviceToken
    };
  }

  public getSession(sessionId: string): PairingSession | undefined {
    return this.sessions.get(sessionId);
  }
}
