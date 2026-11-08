import net from 'node:net';
import crypto from 'node:crypto';
import { 
  IpcMessage, 
  IpcMessageType, 
  IpcFraming, 
  IpcHandshakePayload 
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

  private messageHandlers: Array<(msg: IpcMessage) => void> = [];
  private disconnectHandlers: Array<() => void> = [];

  constructor(options: PipeServerOptions) {
    this.pipeName = options.pipeName || '\\\\.\\pipe\\ntrungz-remote-agent-ipc';
    this.authToken = options.authToken;
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

        socket.on('data', (chunk) => {
          this.buffer = Buffer.concat([this.buffer, chunk]);
          const { messages, remainingBuffer } = IpcFraming.decodeFrames(this.buffer);
          this.buffer = remainingBuffer;

          for (const msg of messages) {
            this.handleIncomingMessage(msg, socket);
          }
        });

        socket.on('close', () => {
          this.activeSocket = null;
          this.isAuthenticated = false;
          for (const handler of this.disconnectHandlers) {
            handler();
          }
        });

        socket.on('error', (err) => {
          console.error('[NamedPipeServer] Socket error:', err.message);
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
      if (msg.type === IpcMessageType.HANDSHAKE) {
        const payload = msg.payload as IpcHandshakePayload;
        if (payload && payload.token === this.authToken) {
          this.isAuthenticated = true;
          this.sendMessage({
            id: crypto.randomUUID(),
            type: IpcMessageType.HANDSHAKE_ACK,
            timestamp: Date.now(),
            payload: { status: 'AUTHENTICATED', serverProcessId: process.pid }
          });
          return;
        } else {
          this.sendMessage({
            id: crypto.randomUUID(),
            type: IpcMessageType.ERROR,
            timestamp: Date.now(),
            payload: { code: 'UNAUTHORIZED', message: 'Invalid IPC handshake token' }
          });
          socket.destroy();
          return;
        }
      } else {
        socket.destroy();
        return;
      }
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
