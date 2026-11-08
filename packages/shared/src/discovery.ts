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
  public static readonly DISCOVERY_MAGIC = 'NTRUNGZ_DISCOVERY_PROBE_V1';

  /**
   * Tạo gói tin probe từ Android Client để quét tìm máy tính trong mạng LAN
   */
  public static createDiscoveryProbe(): Buffer {
    return Buffer.from(this.DISCOVERY_MAGIC, 'utf-8');
  }

  /**
   * Kiểm tra gói tin có phải là probe quét tìm hay không
   */
  public static isDiscoveryProbe(bufferOrString: Buffer | string): boolean {
    const str = Buffer.isBuffer(bufferOrString) ? bufferOrString.toString('utf-8') : bufferOrString;
    return str.trim() === this.DISCOVERY_MAGIC;
  }

  /**
   * Tạo gói tin Broadcast thông báo sự hiện diện trong mạng nội bộ
   */
  public static createAnnouncement(
    paramOrDeviceId: string | { deviceId: string; name?: string; deviceName?: string; port?: number; servicePort?: number; publicKeyHash?: string; version?: string },
    deviceName = 'Windows PC',
    servicePort = 45825
  ): LanDiscoveryPacket {
    if (typeof paramOrDeviceId === 'object') {
      const devId = paramOrDeviceId.deviceId;
      const name = paramOrDeviceId.name || paramOrDeviceId.deviceName || 'Windows PC';
      const port = paramOrDeviceId.port || paramOrDeviceId.servicePort || 45825;
      const fp = paramOrDeviceId.publicKeyHash || Buffer.from(devId).toString('base64').slice(0, 12);
      return {
        magic: this.MAGIC,
        deviceId: devId,
        deviceName: name,
        servicePort: port,
        hardwareFingerprint: fp,
        protocolVersion: paramOrDeviceId.version || '2.0.0-phase2',
        timestamp: Date.now()
      };
    }

    return {
      magic: this.MAGIC,
      deviceId: paramOrDeviceId,
      deviceName,
      servicePort,
      hardwareFingerprint: Buffer.from(paramOrDeviceId).toString('base64').slice(0, 12),
      protocolVersion: '2.0.0-phase2',
      timestamp: Date.now()
    };
  }

  /**
   * Parse gói tin announcement từ UDP
   */
  public static parseAnnouncement(data: string | object | Buffer): (LanDiscoveryPacket & { name: string; port: number }) | null {
    try {
      let parsed: any;
      if (typeof data === 'string') {
        parsed = JSON.parse(data);
      } else if (Buffer.isBuffer(data)) {
        parsed = JSON.parse(data.toString('utf-8'));
      } else {
        parsed = data;
      }

      if (parsed && parsed.magic === this.MAGIC && parsed.deviceId && parsed.servicePort) {
        return {
          ...parsed,
          name: parsed.deviceName,
          port: parsed.servicePort
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Kiểm tra gói tin nhận được qua UDP broadcast
   */
  public static parsePacket(rawJson: string): LanDiscoveryPacket | null {
    return this.parseAnnouncement(rawJson);
  }
}
