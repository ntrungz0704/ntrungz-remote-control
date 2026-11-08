import crypto from 'node:crypto';
import { AuditLog, AuditEventType } from '../../../../packages/shared/src/types';

export class AuditService {
  private logs: AuditLog[] = [];

  public async log(params: {
    userId?: string;
    deviceId?: string;
    eventType: AuditEventType;
    details: Record<string, any>;
    ipAddress?: string;
  }): Promise<AuditLog> {
    const entry: AuditLog = {
      id: crypto.randomUUID(),
      userId: params.userId,
      deviceId: params.deviceId,
      eventType: params.eventType,
      details: params.details,
      ipAddress: params.ipAddress,
      createdAt: new Date()
    };
    this.logs.push(entry);
    return entry;
  }

  public getLogs(filter?: { userId?: string; deviceId?: string }): AuditLog[] {
    return this.logs.filter(l => {
      if (filter?.userId && l.userId !== filter.userId) return false;
      if (filter?.deviceId && l.deviceId !== filter.deviceId) return false;
      return true;
    });
  }
}
