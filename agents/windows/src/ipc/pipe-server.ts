import net from 'node:net';
import crypto from 'node:crypto';
import { 
  IpcMessage, 
  IpcMessageType, 
  IpcFraming, 
  IpcHandshakePayload,
  IpcHandshakeResponsePayload,
  IpcChallengePayload 
} from '../../../../packages/shared/src/ipc';

export interface PipeServerOptions {
  pipeName?: string;
  authToken: string;
}

export class NamedPipeServer {
  private server: net.Server | null = null;
  private activeSocket: net.Socket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private isAuthenticated = false;
  private pipeName: string;
  private authToken: string;
  private currentChallenge: string | null = null;
  private challengeIssuedAt = 0;

  private messageHandlers: Array<(msg: IpcMessage) => void> = [];
  private disconnectHandlers: Array<() => void> = [];

  constructor(options: PipeServerOptions) {
    this.pipeName = options.pipeName || '\\\\.\\pipe\\ntrungz-remote-agent-ipc';
    this.authToken = options.authToken;

    // Kiểm tra độ an toàn của auth token (tối thiểu 32 bytes entropy = 64 hex chars hoặc 32 chars)
    if (!this.authToken || this.authToken.length < 32) {
      throw new Error(`Insecure IPC authToken: requires at least 32 bytes of entropy (got ${this.authToken?.length || 0})`);
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        // Chỉ chấp nhận 1 interactive agent kết nối tại một thời điểm
        if (this.activeSocket && !this.activeSocket.destroyed) {
          socket.destroy();
          return;
        }

        this.activeSocket = socket;
        this.isAuthenticated = false;
        this.buffer = Buffer.alloc(0);

        // Sinh challenge ngẫu nhiên để chống tấn công replay / stale
        this.currentChallenge = crypto.randomBytes(32).toString('hex');
        this.challengeIssuedAt = Date.now();

        const challengeMsg: IpcMessage<IpcChallengePayload> = {
          id: crypto.randomUUID(),
          type: IpcMessageType.HANDSHAKE_CHALLENGE,
          timestamp: this.challengeIssuedAt,
          payload: {
            challenge: this.currentChallenge,
            serverProcessId: process.pid,
            serverSessionId: 0
          }
        };

        const frame = IpcFraming.encodeMessage(challengeMsg);
        socket.write(frame);

        socket.on('data', (chunk) => {
          this.buffer = Buffer.concat([this.buffer, chunk]);
          const { messages, remainingBuffer, oversizedError, malformedError } = IpcFraming.decodeFrames(this.buffer);
          this.buffer = remainingBuffer;

          if (oversizedError) {
            console.error('[NamedPipeServer] Oversized frame detected, closing connection');
            socket.destroy();
            return;
          }

          for (const msg of messages) {
            this.handleIncomingMessage(msg, socket);
          }
        });

        socket.on('close', () => {
          this.activeSocket = null;
          this.isAuthenticated = false;
          this.currentChallenge = null;
          for (const handler of this.disconnectHandlers) {
            handler();
          }
        });

        socket.on('error', (err) => {
          // Socket error gracefully handled
        });
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.pipeName, () => {
        resolve();
      });
    });
  }

  private handleIncomingMessage(msg: IpcMessage, socket: net.Socket): void {
    if (!this.isAuthenticated) {
      // 1. Xác thực bằng Challenge-Response Handshake
      if (msg.type === IpcMessageType.HANDSHAKE_RESPONSE) {
        const payload = msg.payload as IpcHandshakeResponsePayload;
        const now = Date.now();

        // Kiểm tra tính tươi mới (Freshness check trong vòng 60 giây)
        if (!payload || !payload.timestamp || Math.abs(now - payload.timestamp) > 60_000) {
          this.rejectHandshake(socket, 'STALE_HANDSHAKE', 'Handshake timestamp is stale or out of sync');
          return;
        }

        if (!this.currentChallenge) {
          this.rejectHandshake(socket, 'NO_CHALLENGE', 'No active challenge pending');
          return;
        }

        const isValid = IpcFraming.verifyHandshakeSignature(
          this.authToken,
          this.currentChallenge,
          payload.timestamp,
          payload.signature
        );

        if (isValid) {
          this.isAuthenticated = true;
          this.currentChallenge = null; // Tiêu thụ challenge nonce
          this.sendMessage({
            id: crypto.randomUUID(),
            type: IpcMessageType.HANDSHAKE_ACK,
            timestamp: Date.now(),
            payload: { status: 'AUTHENTICATED', serverProcessId: process.pid }
          });
          return;
        } else {
          this.rejectHandshake(socket, 'INVALID_SIGNATURE', 'Cryptographic signature mismatch');
          return;
        }
      }

      // 2. Tương thích trực tiếp bằng Legacy Handshake (có so sánh constant-time)
      if (msg.type === IpcMessageType.HANDSHAKE) {
        const payload = msg.payload as IpcHandshakePayload;
        if (payload && payload.token && payload.token.length === this.authToken.length) {
          const isTokenEqual = crypto.timingSafeEqual(
            Buffer.from(payload.token, 'utf-8'),
            Buffer.from(this.authToken, 'utf-8')
          );
          if (isTokenEqual) {
            this.isAuthenticated = true;
            this.sendMessage({
              id: crypto.randomUUID(),
              type: IpcMessageType.HANDSHAKE_ACK,
              timestamp: Date.now(),
              payload: { status: 'AUTHENTICATED', serverProcessId: process.pid }
            });
            return;
          }
        }
        this.rejectHandshake(socket, 'UNAUTHORIZED', 'Invalid IPC handshake token');
        return;
      }

      socket.destroy();
      return;
    }

    // Xử lý các thông điệp khi đã xác thực
    if (msg.type === IpcMessageType.HEARTBEAT) {
      this.sendMessage({
        id: crypto.randomUUID(),
        type: IpcMessageType.HEARTBEAT_ACK,
        timestamp: Date.now(),
        payload: { receivedAt: Date.now() }
      });
    }

    for (const handler of this.messageHandlers) {
      handler(msg);
    }
  }

  private rejectHandshake(socket: net.Socket, code: string, message: string): void {
    this.sendMessage({
      id: crypto.randomUUID(),
      type: IpcMessageType.ERROR,
      timestamp: Date.now(),
      payload: { code, message }
    });
    socket.destroy();
  }

  public sendMessage(msg: IpcMessage): boolean {
    if (!this.activeSocket || this.activeSocket.destroyed) {
      return false;
    }
    const frame = IpcFraming.encodeMessage(msg);
    this.activeSocket.write(frame);
    return true;
  }

  public onMessage(handler: (msg: IpcMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  public onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  public isClientConnected(): boolean {
    return this.activeSocket !== null && !this.activeSocket.destroyed && this.isAuthenticated;
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.activeSocket) {
        this.activeSocket.destroy();
        this.activeSocket = null;
      }
      if (this.server) {
        this.server.close(() => resolve());
        this.server = null;
      } else {
        resolve();
      }
    });
  }
}
