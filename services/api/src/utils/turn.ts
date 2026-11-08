import crypto from 'node:crypto';
import { IceServerConfig } from '../../../../packages/shared/src/types';

export class TurnUtil {
  private static readonly SHARED_SECRET = process.env.COTURN_SECRET || 'NtrungzCoturnAuthSecret2026!';
  private static readonly TURN_HOST = process.env.COTURN_HOST || 'turn.ntrungz.dev';
  private static readonly TURN_PORT = Number(process.env.COTURN_PORT) || 3478;

  /**
   * Sinh danh sách ICE Servers gồm STUN công cộng và TURN Relay ephemeral credentials
   */
  public static generateIceServers(userId: string, ttlSeconds = 86400): IceServerConfig[] {
    const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = `${timestamp}:${userId}`;
    
    // HMAC-SHA1 signature cho coturn REST API auth
    const hmac = crypto.createHmac('sha1', this.SHARED_SECRET);
    hmac.update(username);
    const credential = hmac.digest('base64');

    return [
      // 1. Google Public STUN
      {
        urls: 'stun:stun.l.google.com:19302'
      },
      // 2. Global Backup STUN
      {
        urls: 'stun:global.stun.twilio.com:3478'
      },
      // 3. Ntrungz coturn TURN Relay (UDP)
      {
        urls: `turn:${this.TURN_HOST}:${this.TURN_PORT}?transport=udp`,
        username,
        credential
      },
      // 4. Ntrungz coturn TURN Relay (TCP Fallback khi bị chặn UDP)
      {
        urls: `turn:${this.TURN_HOST}:${this.TURN_PORT}?transport=tcp`,
        username,
        credential
      }
    ];
  }
}
