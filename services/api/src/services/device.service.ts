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
  ValidationError 
} from '../../../../packages/shared/src/errors';
import { AuditService } from './audit.service';

export class DeviceService {
  // In-memory persistent store for fast testing & DB decoupling
  private devices = new Map<string, Device>();

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

    // Check if device with this hardwareIdentifier already exists for this owner
    let existing: Device | undefined;
    for (const d of this.devices.values()) {
      if (d.hardwareIdentifier === input.hardwareIdentifier && d.ownerId === input.ownerId) {
        existing = d;
        break;
      }
    }

    const now = new Date();
    if (existing) {
      // Key rotation / re-registration
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

    // Strict Cross-User Isolation Guard
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

  public async revokeDevice(deviceId: string, ownerId: string, reason?: string): Promise<Device> {
    const device = await this.getDevice(deviceId, ownerId);

    device.status = DeviceStatus.REVOKED;
    device.updatedAt = new Date();

    await this.auditService.log({
      deviceId: device.id,
      userId: ownerId,
      eventType: AuditEventType.DEVICE_REVOKED,
      details: { reason: reason || 'Manual user revocation' }
    });

    return device;
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
