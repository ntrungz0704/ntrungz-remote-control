import crypto from 'node:crypto';
import { 
  Device, 
  DeviceStatus, 
  DeviceType, 
  AuditEventType 
} from '../../../../packages/shared/src/types';
import { 
  NotFoundError, 
  ForbiddenError, 
  ValidationError,
  AuthenticationError,
  DeviceRevokedError
} from '../../../../packages/shared/src/errors';
import { CryptoUtil } from '../utils/crypto';
import { AuditService } from './audit.service';

export interface DeviceChallenge {
  nonce: string;
  deviceId: string;
  expiresAt: Date;
  used: boolean;
}

export interface StoredDeviceToken {
  tokenHash: string;
  deviceId: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export class DeviceService {
  private devices = new Map<string, Device>();
  private challenges = new Map<string, DeviceChallenge>();
  private tokens = new Map<string, StoredDeviceToken>(); // key: tokenHash

  constructor(private auditService: AuditService) {}

  public async registerDevice(input: {
    name: string;
    deviceType?: DeviceType;
    hardwareIdentifier: string;
    publicKey: string;
    osInfo?: string;
    ownerId: string;
    ipAddress?: string;
  }): Promise<Device> {
    if (!input.name || !input.hardwareIdentifier || !input.publicKey || !input.ownerId) {
      throw new ValidationError('Missing required device registration fields');
    }

    let existing: Device | undefined;
    for (const d of this.devices.values()) {
      if (d.hardwareIdentifier === input.hardwareIdentifier && d.ownerId === input.ownerId) {
        existing = d;
        break;
      }
    }

    const now = new Date();
    if (existing) {
      existing.name = input.name;
      existing.publicKey = input.publicKey;
      existing.osInfo = input.osInfo || existing.osInfo;
      existing.ipAddress = input.ipAddress || existing.ipAddress;
      existing.status = DeviceStatus.UNPAIRED;
      existing.updatedAt = now;
      existing.lastSeenAt = now;

      await this.auditService.log({
        deviceId: existing.id,
        userId: input.ownerId,
        eventType: AuditEventType.DEVICE_REGISTERED,
        details: { action: 'UPDATE_KEY', hardwareIdentifier: input.hardwareIdentifier },
        ipAddress: input.ipAddress
      });

      return existing;
    }

    const newDevice: Device = {
      id: crypto.randomUUID(),
      name: input.name,
      deviceType: input.deviceType || DeviceType.WINDOWS_PC,
      hardwareIdentifier: input.hardwareIdentifier,
      publicKey: input.publicKey,
      ownerId: input.ownerId,
      status: DeviceStatus.UNPAIRED,
      osInfo: input.osInfo,
      ipAddress: input.ipAddress,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now
    };

    this.devices.set(newDevice.id, newDevice);

    await this.auditService.log({
      deviceId: newDevice.id,
      userId: input.ownerId,
      eventType: AuditEventType.DEVICE_REGISTERED,
      details: { action: 'INITIAL_REGISTRATION', hardwareIdentifier: input.hardwareIdentifier },
      ipAddress: input.ipAddress
    });

    return newDevice;
  }

  public async getDevice(deviceId: string, requesterUserId: string): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new NotFoundError(`Device ${deviceId} not found`);
    }

    // Backend-enforced cross-user authorization
    if (device.ownerId !== requesterUserId) {
      throw new ForbiddenError('You do not have permission to access this device');
    }

    return device;
  }

  public async listDevices(ownerId: string): Promise<Device[]> {
    const results: Device[] = [];
    for (const d of this.devices.values()) {
      if (d.ownerId === ownerId) {
        results.push(d);
      }
    }
    return results;
  }

  /**
   * Thu hồi thiết bị và vô hiệu hóa TOÀN BỘ token đã cấp ngay lập tức
   */
  public async revokeDevice(deviceId: string, ownerId: string, reason?: string): Promise<Device> {
    const device = await this.getDevice(deviceId, ownerId);

    device.status = DeviceStatus.REVOKED;
    device.updatedAt = new Date();

    // Vô hiệu hóa toàn bộ active tokens của thiết bị này
    for (const token of this.tokens.values()) {
      if (token.deviceId === deviceId) {
        token.revoked = true;
      }
    }

    await this.auditService.log({
      deviceId: device.id,
      userId: ownerId,
      eventType: AuditEventType.DEVICE_REVOKED,
      details: { reason: reason || 'Manual user revocation' }
    });

    return device;
  }

  /**
   * Tạo challenge xác thực ngẫu nhiên (chống replay) cho thiết bị
   */
  public createAuthChallenge(deviceId: string): string {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new NotFoundError(`Device ${deviceId} not found`);
    }
    if (device.status === DeviceStatus.REVOKED) {
      throw new DeviceRevokedError('Device is revoked');
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const challenge: DeviceChallenge = {
      nonce,
      deviceId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 phút TTL
      used: false
    };

    this.challenges.set(nonce, challenge);
    return nonce;
  }

  /**
   * Xác thực chữ ký Ed25519 đối với challenge
   * Chống replay: Challenge chỉ dùng 1 lần, từ chối challenge cũ
   */
  public verifyAuthChallenge(deviceId: string, nonce: string, signatureBase64: string): boolean {
    const challenge = this.challenges.get(nonce);
    if (!challenge) {
      throw new AuthenticationError('Invalid or unknown challenge');
    }

    if (challenge.deviceId !== deviceId) {
      throw new AuthenticationError('Challenge device mismatch');
    }

    if (challenge.used) {
      throw new ValidationError('Challenge already consumed (Replay attack blocked)');
    }

    if (new Date() > challenge.expiresAt) {
      throw new ValidationError('Challenge expired');
    }

    // Đánh dấu used ngay lập tức (Atomic consumption)
    challenge.used = true;

    const device = this.devices.get(deviceId);
    if (!device || device.status === DeviceStatus.REVOKED) {
      throw new DeviceRevokedError('Device is revoked');
    }

    const isValid = CryptoUtil.verifySignature(device.publicKey, nonce, signatureBase64);
    if (!isValid) {
      throw new AuthenticationError('Cryptographic signature verification failed');
    }

    return true;
  }

  /**
   * Lưu trữ Device Token an toàn dưới dạng SHA-256 hash
   */
  public storeDeviceToken(rawToken: string, deviceId: string, userId: string, validityDays = 30): void {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    this.tokens.set(tokenHash, {
      tokenHash,
      deviceId,
      userId,
      expiresAt: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
      revoked: false,
      createdAt: new Date()
    });
  }

  /**
   * Xác thực Device Token: Kiểm tra token hash, expiration, revoked và device status
   */
  public validateDeviceToken(rawToken: string): { deviceId: string; userId: string } {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const token = this.tokens.get(tokenHash);
    if (!token) {
      throw new AuthenticationError('Invalid device token');
    }

    if (token.revoked) {
      throw new AuthenticationError('Device token has been revoked');
    }

    if (new Date() > token.expiresAt) {
      throw new AuthenticationError('Device token expired');
    }

    const device = this.devices.get(token.deviceId);
    if (!device || device.status === DeviceStatus.REVOKED) {
      throw new DeviceRevokedError('Device access has been revoked');
    }

    return { deviceId: token.deviceId, userId: token.userId };
  }

  public async updateStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = status;
      device.updatedAt = new Date();
      device.lastSeenAt = new Date();
    }
  }

  public getRawDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }
}
