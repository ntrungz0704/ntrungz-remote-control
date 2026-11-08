export interface LanDiscoveryPacket {
  magic: 'NTRUNGZ_DISCOVERY_V1';
  deviceId: string;
  deviceName: string;
  servicePort: number;
  hardwareFingerprint: string;
  protocolVersion: string;
  timestamp: number;
}

export class LanDiscoveryProtocol {
  public static readonly BROADCAST_PORT = 45824;
  public static readonly MAGIC = 'NTRUNGZ_DISCOVERY_V1';

  /**
   * Tạo gói tin Broadcast thông báo sự hiện diện trong mạng nội bộ
   */
  public static createAnnouncement(deviceId: string, deviceName: string, servicePort = 45825): LanDiscoveryPacket {
    return {
      magic: this.MAGIC,
      deviceId,
      deviceName,
      servicePort,
      hardwareFingerprint: Buffer.from(deviceId).toString('base64').slice(0, 12),
      protocolVersion: '1.0.0',
      timestamp: Date.now()
    };
  }

  /**
   * Kiểm tra gói tin nhận được qua UDP broadcast
   */
  public static parsePacket(rawJson: string): LanDiscoveryPacket | null {
    try {
      const data = JSON.parse(rawJson);
      if (data && data.magic === this.MAGIC && data.deviceId && data.servicePort) {
        return data as LanDiscoveryPacket;
      }
      return null;
    } catch {
      return null;
    }
  }
}
