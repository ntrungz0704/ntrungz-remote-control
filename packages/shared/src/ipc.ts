import crypto from 'node:crypto';

export enum IpcMessageType {
  HANDSHAKE_CHALLENGE = 'IPC_HANDSHAKE_CHALLENGE',
  HANDSHAKE_RESPONSE = 'IPC_HANDSHAKE_RESPONSE',
  HANDSHAKE = 'IPC_HANDSHAKE', // Legacy compatibility
  HANDSHAKE_ACK = 'IPC_HANDSHAKE_ACK',
  HEARTBEAT = 'IPC_HEARTBEAT',
  HEARTBEAT_ACK = 'IPC_HEARTBEAT_ACK',
  STATUS_REPORT = 'IPC_STATUS_REPORT',
  COMMAND = 'IPC_COMMAND',
  SESSION_EVENT = 'IPC_SESSION_EVENT',
  ERROR = 'IPC_ERROR',
  SHUTDOWN = 'IPC_SHUTDOWN'
}

export interface IpcMessage<T = any> {
  id: string;
  type: IpcMessageType;
  timestamp: number;
  payload: T;
}

export interface IpcChallengePayload {
  challenge: string;
  serverProcessId: number;
  serverSessionId: number;
}

export interface IpcHandshakeResponsePayload {
  signature: string;
  timestamp: number;
  processId: number;
  windowsSessionId: number;
  clientType: 'INTERACTIVE_AGENT' | 'WATCHDOG';
  version: string;
}

export interface IpcHandshakePayload {
  token: string;
  processId: number;
  windowsSessionId: number;
  clientType: 'INTERACTIVE_AGENT' | 'WATCHDOG';
  version: string;
}

export interface MonitorInfo {
  index: number;
  deviceName: string;
  isPrimary: boolean;
  width: number;
  height: number;
  dpi: number;
}

export interface IpcStatusPayload {
  windowsSessionId: number;
  targetProcessId: number;
  windowStationName: string;
  desktopName: string;
  isLocked: boolean;
  monitors: MonitorInfo[];
  resolution: {
    width: number;
    height: number;
    dpi: number;
  };
  metrics: {
    cpuPercent: number;
    memoryMb: number;
  };
}

export interface IpcCommandPayload {
  command: 'START_STREAM' | 'STOP_STREAM' | 'RESTART_AGENT' | 'TERMINATE';
  params?: Record<string, any>;
}

export class IpcFraming {
  public static readonly MAX_FRAME_SIZE = 4 * 1024 * 1024; // 4MB maximum frame size

  /**
   * Đóng gói payload JSON thành Buffer có header 4-byte độ dài (Big-Endian)
   */
  public static encodeMessage(message: IpcMessage): Buffer {
    const jsonStr = JSON.stringify(message);
    const bodyBuffer = Buffer.from(jsonStr, 'utf-8');
    
    if (bodyBuffer.length > this.MAX_FRAME_SIZE) {
      throw new Error(`Frame payload exceeds MAX_FRAME_SIZE (${bodyBuffer.length} > ${this.MAX_FRAME_SIZE})`);
    }

    const headerBuffer = Buffer.alloc(4);
    headerBuffer.writeUInt32BE(bodyBuffer.length, 0);
    return Buffer.concat([headerBuffer, bodyBuffer]);
  }

  /**
   * Tách và giải mã các thông điệp liên tiếp từ stream Buffer với khả năng chống OOM và gói tin hỏng
   */
  public static decodeFrames(buffer: Buffer): { 
    messages: IpcMessage[]; 
    remainingBuffer: Buffer;
    oversizedError?: boolean;
    malformedError?: boolean;
  } {
    const messages: IpcMessage[] = [];
    let offset = 0;
    let oversizedError = false;
    let malformedError = false;

    while (offset + 4 <= buffer.length) {
      const messageLength = buffer.readUInt32BE(offset);

      // 1. Kiểm tra độ dài khung hợp lệ (> 0)
      if (messageLength === 0) {
        malformedError = true;
        offset += 4;
        continue;
      }

      // 2. Chống tấn công cạn kiệt bộ nhớ OOM
      if (messageLength > this.MAX_FRAME_SIZE) {
        oversizedError = true;
        // Bỏ qua buffer hỏng
        return {
          messages,
          remainingBuffer: Buffer.alloc(0),
          oversizedError: true
        };
      }

      // Chưa đủ dữ liệu cho trọn vẹn packet, giữ lại buffer cho chunk tiếp theo
      if (offset + 4 + messageLength > buffer.length) {
        break;
      }

      const bodyBuffer = buffer.subarray(offset + 4, offset + 4 + messageLength);
      const jsonStr = bodyBuffer.toString('utf-8');
      try {
        const parsed = JSON.parse(jsonStr) as IpcMessage;
        if (parsed && typeof parsed.type === 'string') {
          messages.push(parsed);
        } else {
          malformedError = true;
        }
      } catch (err) {
        malformedError = true;
      }
      offset += 4 + messageLength;
    }

    return {
      messages,
      remainingBuffer: buffer.subarray(offset),
      oversizedError,
      malformedError
    };
  }

  /**
   * Tính toán chữ ký HMAC-SHA256 cho Challenge Handshake ràng buộc chặt chẽ mọi trường định danh
   * (challenge, timestamp, processId, windowsSessionId, clientType, version)
   */
  public static computeHandshakeSignature(
    token: string, 
    paramsOrChallenge: {
      challenge: string;
      timestamp: number;
      processId?: number;
      windowsSessionId?: number;
      clientType?: string;
      version?: string;
    } | string,
    legacyTimestamp?: number,
    legacyProcessId?: number,
    legacySessionId?: number,
    legacyClientType?: string,
    legacyVersion?: string
  ): string {
    let payloadToSign: string;
    if (typeof paramsOrChallenge === 'string') {
      const ts = legacyTimestamp ?? 0;
      const pid = legacyProcessId ?? process.pid;
      const sid = legacySessionId ?? 1;
      const cType = legacyClientType ?? 'INTERACTIVE_AGENT';
      const ver = legacyVersion ?? '3.0.0-phase3a';
      payloadToSign = `${paramsOrChallenge}:${ts}:${pid}:${sid}:${cType}:${ver}`;
    } else {
      const pid = paramsOrChallenge.processId ?? process.pid;
      const sid = paramsOrChallenge.windowsSessionId ?? 1;
      const cType = paramsOrChallenge.clientType ?? 'INTERACTIVE_AGENT';
      const ver = paramsOrChallenge.version ?? '3.0.0-phase3a';
      payloadToSign = `${paramsOrChallenge.challenge}:${paramsOrChallenge.timestamp}:${pid}:${sid}:${cType}:${ver}`;
    }
    const hmac = crypto.createHmac('sha256', token);
    hmac.update(payloadToSign);
    return hmac.digest('hex');
  }

  /**
   * Xác thực chữ ký bằng constant-time so sánh an toàn mật mã học
   */
  public static verifyHandshakeSignature(
    token: string,
    paramsOrChallenge: {
      challenge: string;
      timestamp: number;
      processId?: number;
      windowsSessionId?: number;
      clientType?: string;
      version?: string;
    } | string,
    signatureOrTimestamp: string | number,
    optionalSignature?: string
  ): boolean {
    let signature: string;
    let expected: string;

    if (typeof paramsOrChallenge === 'string') {
      const challenge = paramsOrChallenge;
      const timestamp = signatureOrTimestamp as number;
      signature = optionalSignature || '';
      expected = this.computeHandshakeSignature(token, challenge, timestamp);
    } else {
      signature = signatureOrTimestamp as string;
      expected = this.computeHandshakeSignature(token, paramsOrChallenge);
    }

    // 1. Kiểm tra format chữ ký (phải là 64 ký tự hex hợp lệ)
    if (!signature || typeof signature !== 'string' || signature.length !== 64 || !/^[0-9a-f]{64}$/i.test(signature)) {
      return false;
    }

    if (expected.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  }
}
