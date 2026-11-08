export enum IpcMessageType {
  HANDSHAKE = 'IPC_HANDSHAKE',
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

export interface IpcHandshakePayload {
  token: string;
  processId: number;
  windowsSessionId: number;
  clientType: 'INTERACTIVE_AGENT' | 'WATCHDOG';
  version: string;
}

export interface IpcStatusPayload {
  windowsSessionId: number;
  desktopName: string;
  isLocked: boolean;
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
  /**
   * Đóng gói payload JSON thành Buffer có header 4-byte độ dài (Big-Endian)
   */
  public static encodeMessage(message: IpcMessage): Buffer {
    const jsonStr = JSON.stringify(message);
    const bodyBuffer = Buffer.from(jsonStr, 'utf-8');
    const headerBuffer = Buffer.alloc(4);
    headerBuffer.writeUInt32BE(bodyBuffer.length, 0);
    return Buffer.concat([headerBuffer, bodyBuffer]);
  }

  /**
   * Tách và giải mã các thông điệp liên tiếp từ stream Buffer
   */
  public static decodeFrames(buffer: Buffer): { messages: IpcMessage[]; remainingBuffer: Buffer } {
    const messages: IpcMessage[] = [];
    let offset = 0;

    while (offset + 4 <= buffer.length) {
      const messageLength = buffer.readUInt32BE(offset);
      if (offset + 4 + messageLength > buffer.length) {
        break; // Chưa đủ cả packet, đợi chunk tiếp theo
      }

      const bodyBuffer = buffer.subarray(offset + 4, offset + 4 + messageLength);
      const jsonStr = bodyBuffer.toString('utf-8');
      try {
        const parsed = JSON.parse(jsonStr) as IpcMessage;
        messages.push(parsed);
      } catch (err) {
        console.error('Failed to parse IPC message JSON:', err);
      }
      offset += 4 + messageLength;
    }

    return {
      messages,
      remainingBuffer: buffer.subarray(offset)
    };
  }
}
