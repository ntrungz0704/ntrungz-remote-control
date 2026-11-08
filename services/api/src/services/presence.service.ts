import { 
  DevicePresence, 
  DeviceStatus, 
  AuditEventType 
} from '../../../../packages/shared/src/types';
import { NotFoundError, DeviceRevokedError } from '../../../../packages/shared/src/errors';
import { DeviceService } from './device.service';
import { SessionService } from './session.service';
import { AuditService } from './audit.service';

export class PresenceService {
  private presences = new Map<string, DevicePresence>();
  private readonly HEARTBEAT_TIMEOUT_MS = 45 * 1000; // 45s timeout
  private readonly MAX_CONCURRENT_SESSIONS_PER_PC = 2;

  constructor(
    private deviceService: DeviceService,
    private sessionService: SessionService,
    private auditService: AuditService
  ) {}

  /**
   * Cập nhật nhịp tim (Heartbeat) từ Windows Agent
   */
  public async recordHeartbeat(deviceId: string, ipAddress?: string): Promise<DevicePresence> {
    const device = this.deviceService.getRawDevice(deviceId);
    if (!device) {
      throw new NotFoundError(`Device ${deviceId} not found`);
    }

    if (device.status === DeviceStatus.REVOKED) {
      throw new DeviceRevokedError('Revoked device cannot send heartbeat');
    }

    const now = new Date();
    await this.deviceService.updateStatus(deviceId, DeviceStatus.ONLINE);

    const activeSessions = this.sessionService.listActiveSessions(deviceId);

    const presence: DevicePresence = {
      deviceId,
      status: DeviceStatus.ONLINE,
      lastSeenAt: now,
      ipAddress: ipAddress || device.ipAddress,
      activeSessionCount: activeSessions.length,
      isReachable: true,
      isAvailableForNewSession: activeSessions.length < this.MAX_CONCURRENT_SESSIONS_PER_PC
    };

    this.presences.set(deviceId, presence);

    await this.auditService.log({
      deviceId,
      userId: device.ownerId,
      eventType: AuditEventType.DEVICE_HEARTBEAT,
      details: { ipAddress, activeSessions: activeSessions.length },
      ipAddress
    });

    return presence;
  }

  /**
   * Kiểm tra và cập nhật trạng thái Offline cho các thiết bị quá hạn heartbeat
   */
  public sweepTimeouts(): string[] {
    const now = Date.now();
    const timedOutDevices: string[] = [];

    for (const [deviceId, presence] of this.presences.entries()) {
      if (presence.status === DeviceStatus.ONLINE) {
        const elapsed = now - presence.lastSeenAt.getTime();
        if (elapsed > this.HEARTBEAT_TIMEOUT_MS) {
          presence.status = DeviceStatus.OFFLINE;
          presence.isReachable = false;
          presence.isAvailableForNewSession = false;
          this.deviceService.updateStatus(deviceId, DeviceStatus.OFFLINE);
          timedOutDevices.push(deviceId);
        }
      }
    }

    return timedOutDevices;
  }

  /**
   * Truy vấn trạng thái Presence của thiết bị
   */
  public getPresence(deviceId: string): DevicePresence {
    const cached = this.presences.get(deviceId);
    const device = this.deviceService.getRawDevice(deviceId);

    if (!device) {
      throw new NotFoundError(`Device ${deviceId} not found`);
    }

    if (device.status === DeviceStatus.REVOKED) {
      return {
        deviceId,
        status: DeviceStatus.REVOKED,
        lastSeenAt: device.lastSeenAt || device.updatedAt,
        activeSessionCount: 0,
        isReachable: false,
        isAvailableForNewSession: false
      };
    }

    const activeSessions = this.sessionService.listActiveSessions(deviceId);
    const now = Date.now();
    const isOnline = cached?.status === DeviceStatus.ONLINE && 
      (now - (cached.lastSeenAt?.getTime() || 0)) <= this.HEARTBEAT_TIMEOUT_MS;

    return {
      deviceId,
      status: isOnline ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
      lastSeenAt: cached?.lastSeenAt || device.lastSeenAt || device.createdAt,
      ipAddress: cached?.ipAddress || device.ipAddress,
      activeSessionCount: activeSessions.length,
      isReachable: isOnline,
      isAvailableForNewSession: isOnline && activeSessions.length < this.MAX_CONCURRENT_SESSIONS_PER_PC
    };
  }
}
