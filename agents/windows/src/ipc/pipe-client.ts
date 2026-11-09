import net from 'node:net';
import crypto from 'node:crypto';
import { 
  IpcMessage, 
  IpcMessageType, 
  IpcFraming, 
  IpcChallengePayload,
  IpcHandshakeResponsePayload,
  IpcStatusPayload 
} from '../../../../packages/shared/src/ipc';

export interface PipeClientOptions {
  pipeName?: string;
  authToken: string;
  windowsSessionId?: number;
  autoReconnect?: boolean;
}

export class NamedPipeClient {
  private socket: net.Socket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private isAuthenticated = false;
  private pipeName: string;
  private authToken: string;
  private windowsSessionId: number;
  private autoReconnect: boolean;
  private isClosing = false;

  private messageHandlers: Array<(msg: IpcMessage) => void> = [];
  private connectHandlers: Array<() => void> = [];
  private disconnectHandlers: Array<() => void> = [];

  constructor(options: PipeClientOptions) {
    this.pipeName = options.pipeName || '\\\\.\\pipe\\ntrungz-remote-agent-ipc';
    this.authToken = options.authToken;
    this.windowsSessionId = options.windowsSessionId ?? 1;
    this.autoReconnect = options.autoReconnect ?? true;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isClosing = false;
      let isResolved = false;

      this.socket = net.connect(this.pipeName, () => {
        this.buffer = Buffer.alloc(0);
        // Đợi nhận HANDSHAKE_CHALLENGE từ server hoặc gửi proactive handshake nếu sau 500ms không có challenge
      });

      this.socket.on('data', (chunk) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        const { messages, remainingBuffer } = IpcFraming.decodeFrames(this.buffer);
        this.buffer = remainingBuffer;

        for (const msg of messages) {
          // 1. Nhận Challenge từ Server
          if (msg.type === IpcMessageType.HANDSHAKE_CHALLENGE) {
            const challengePayload = msg.payload as IpcChallengePayload;
            this.respondToChallenge(challengePayload.challenge);
          }
          // 2. Server xác nhận thành công
          else if (msg.type === IpcMessageType.HANDSHAKE_ACK) {
            this.isAuthenticated = true;
            if (!isResolved) {
              isResolved = true;
              resolve();
            }
            for (const h of this.connectHandlers) h();
          } 
          // 3. Server báo lỗi xác thực
          else if (msg.type === IpcMessageType.ERROR && !this.isAuthenticated) {
            if (!isResolved) {
              isResolved = true;
              reject(new Error(msg.payload?.message || 'Handshake rejected'));
            }
          } 
          // 4. Các thông điệp nghiệp vụ
          else {
            for (const handler of this.messageHandlers) {
              handler(msg);
            }
          }
        }
      });

      this.socket.on('close', () => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error('Connection closed before handshake completed'));
        }
        this.isAuthenticated = false;
        this.socket = null;
        for (const handler of this.disconnectHandlers) {
          handler();
        }

        if (this.autoReconnect && !this.isClosing) {
          setTimeout(() => {
            if (!this.isClosing) {
              this.connect().catch(() => {});
            }
          }, 1000);
        }
      });

      this.socket.on('error', (err) => {
        if (!this.isAuthenticated && !isResolved) {
          isResolved = true;
          reject(err);
        }
      });
    });
  }

  private respondToChallenge(challenge: string): void {
    const timestamp = Date.now();
    const version = '3.0.0-phase3a';
    const clientType = 'INTERACTIVE_AGENT';

    const signature = IpcFraming.computeHandshakeSignature(this.authToken, {
      challenge,
      timestamp,
      processId: process.pid,
      windowsSessionId: this.windowsSessionId,
      clientType,
      version
    });

    const responseMsg: IpcMessage<IpcHandshakeResponsePayload> = {
      id: crypto.randomUUID(),
      type: IpcMessageType.HANDSHAKE_RESPONSE,
      timestamp,
      payload: {
        signature,
        timestamp,
        processId: process.pid,
        windowsSessionId: this.windowsSessionId,
        clientType,
        version
      }
    };

    this.sendMessage(responseMsg);
  }

  public sendHeartbeat(): boolean {
    const msg: IpcMessage = {
      id: crypto.randomUUID(),
      type: IpcMessageType.HEARTBEAT,
      timestamp: Date.now(),
      payload: { processId: process.pid, memoryUsage: process.memoryUsage().rss }
    };
    return this.sendMessage(msg);
  }

  public sendStatusReport(report: IpcStatusPayload): boolean {
    const msg: IpcMessage<IpcStatusPayload> = {
      id: crypto.randomUUID(),
      type: IpcMessageType.STATUS_REPORT,
      timestamp: Date.now(),
      payload: report
    };
    return this.sendMessage(msg);
  }

  public sendMessage(msg: IpcMessage): boolean {
    if (!this.socket || this.socket.destroyed) {
      return false;
    }
    const frame = IpcFraming.encodeMessage(msg);
    this.socket.write(frame);
    return true;
  }

  public onMessage(handler: (msg: IpcMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  public onConnect(handler: () => void): void {
    this.connectHandlers.push(handler);
  }

  public onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  public isConnected(): boolean {
    return this.socket !== null && !this.socket.destroyed && this.isAuthenticated;
  }

  public disconnect(): Promise<void> {
    this.isClosing = true;
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.destroy();
        this.socket = null;
      }
      this.isAuthenticated = false;
      resolve();
    });
  }
}
