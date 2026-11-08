import crypto from 'node:crypto';
import { 
  RemoteSession, 
  RemoteSessionStatus, 
  DeviceStatus, 
  AuditEventType 
} from '../../../../packages/shared/src/types';
import { 
  NotFoundError, 
  ForbiddenError, 
  ValidationError, 
  DeviceRevokedError 
} from '../../../../packages/shared/src/errors';
import { DeviceService } from './device.service';
import { AuditService } from './audit.service';

export class SessionService {
  private sessions = new Map<string, RemoteSession>();

  constructor(
    private deviceService: DeviceService,
    private auditService: AuditService
  ) {
    this.deviceService.onDeviceRevoked((deviceId) => {
      this.endAllSessionsForDevice(deviceId, 'Device revoked');
    });
  }

  /**
   * Tạo phiên điều khiển từ xa mới (RemoteSession)
   * Kiểm tra quyền sở hữu thiết bị, trạng thái revoked, cấp sessionToken
   */
  public async createRemoteSession(input: {
    deviceId: string;
    clientId: string;
    clientUserId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<RemoteSession> {
    const device = this.deviceService.getRawDevice(input.deviceId);
    if (!device) {
      throw new NotFoundError(`Device ${input.deviceId} not found`);
    }

    if (device.status === DeviceStatus.REVOKED) {
      throw new DeviceRevokedError('Cannot establish session to a revoked device');
    }

    // Kiểm tra quyền sở hữu thiết bị
    if (device.ownerId !== input.clientUserId) {
      throw new ForbiddenError('You do not have permission to connect to this device');
    }

    const sessionToken = `ses_tok_${crypto.randomBytes(32).toString('hex')}`;
    const now = new Date();

    const session: RemoteSession = {
      id: crypto.randomUUID(),
      deviceId: input.deviceId,
      clientId: input.clientId,
      clientUserId: input.clientUserId,
      status: RemoteSessionStatus.CONNECTING,
      sessionToken,
      bytesTransferred: 0,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      createdAt: now
    };

    this.sessions.set(session.id, session);

    await this.auditService.log({
      deviceId: input.deviceId,
      userId: input.clientUserId,
      eventType: AuditEventType.REMOTE_SESSION_CREATED,
      details: { sessionId: session.id, clientId: input.clientId },
      ipAddress: input.ipAddress
    });

    return session;
  }

  /**
   * Database-level atomic transition: CONNECTING -> ACTIVE
   * Tương đương SQL: UPDATE remote_sessions SET status = 'ACTIVE', started_at = now() WHERE id = $1 AND status = 'CONNECTING'
   */
  public async activateSession(sessionId: string): Promise<RemoteSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundError(`RemoteSession ${sessionId} not found`);
    }

    if (session.status !== RemoteSessionStatus.CONNECTING) {
      throw new ValidationError(`Cannot activate session with status ${session.status}`);
    }

    session.status = RemoteSessionStatus.ACTIVE;
    session.startedAt = new Date();

    await this.auditService.log({
      deviceId: session.deviceId,
      userId: session.clientUserId,
      eventType: AuditEventType.REMOTE_SESSION_ACTIVE,
      details: { sessionId: session.id }
    });

    return session;
  }

  /**
   * Database-level atomic transition: ACTIVE -> DISCONNECTED
   */
  public async endSession(sessionId: string, params?: {
    bytesTransferred?: number;
    latencyMs?: number;
    reason?: string;
  }): Promise<RemoteSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundError(`RemoteSession ${sessionId} not found`);
    }

    if (session.status === RemoteSessionStatus.DISCONNECTED) {
      return session; // idempotent
    }

    session.status = RemoteSessionStatus.DISCONNECTED;
    session.endedAt = new Date();
    if (params?.bytesTransferred !== undefined) {
      session.bytesTransferred = params.bytesTransferred;
    }
    if (params?.latencyMs !== undefined) {
      session.latencyMs = params.latencyMs;
    }

    await this.auditService.log({
      deviceId: session.deviceId,
      userId: session.clientUserId,
      eventType: AuditEventType.REMOTE_SESSION_ENDED,
      details: { 
        sessionId: session.id, 
        reason: params?.reason || 'Normal disconnect',
        bytesTransferred: session.bytesTransferred,
        latencyMs: session.latencyMs
      }
    });

    return session;
  }

  public async endAllSessionsForDevice(deviceId: string, reason?: string): Promise<RemoteSession[]> {
    const active = this.listActiveSessions(deviceId);
    const ended: RemoteSession[] = [];
    for (const session of active) {
      ended.push(await this.endSession(session.id, { reason: reason || 'Device revoked' }));
    }
    return ended;
  }

  public getSession(sessionId: string): RemoteSession | undefined {
    return this.sessions.get(sessionId);
  }

  public listActiveSessions(deviceId: string): RemoteSession[] {
    const results: RemoteSession[] = [];
    for (const s of this.sessions.values()) {
      if (s.deviceId === deviceId && (s.status === RemoteSessionStatus.CONNECTING || s.status === RemoteSessionStatus.ACTIVE)) {
        results.push(s);
      }
    }
    return results;
  }
}
