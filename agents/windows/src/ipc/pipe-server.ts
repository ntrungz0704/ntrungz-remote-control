import net from 'node:net';
import crypto from 'node:crypto';
import child_process from 'node:child_process';
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
  expectedProcessId?: number;
  expectedSessionId?: number;
}

export interface AuthenticatedClientIdentity {
  processId: number;
  windowsSessionId: number;
  clientType: string;
  version: string;
  authenticatedAt: number;
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
  private expectedProcessId: number | null = null;
  private expectedSessionId: number | null = null;
  private authenticatedIdentity: AuthenticatedClientIdentity | null = null;

  private messageHandlers: Array<(msg: IpcMessage) => void> = [];
  private disconnectHandlers: Array<() => void> = [];

  constructor(options: PipeServerOptions) {
    this.pipeName = options.pipeName || '\\\\.\\pipe\\ntrungz-remote-agent-ipc';
    this.authToken = options.authToken;
    this.expectedProcessId = options.expectedProcessId ?? null;
    this.expectedSessionId = options.expectedSessionId ?? null;

    // Kiểm tra độ an toàn của auth token (tối thiểu 32 bytes entropy = 64 hex chars hoặc 32 chars)
    if (!this.authToken || this.authToken.length < 32) {
      throw new Error(`Insecure IPC authToken: requires at least 32 bytes of entropy (got ${this.authToken?.length || 0})`);
    }
  }

  public setExpectedClientIdentity(processId: number, sessionId?: number): void {
    this.expectedProcessId = processId;
    if (sessionId !== undefined) {
      this.expectedSessionId = sessionId;
    }
  }

  public getAuthenticatedIdentity(): AuthenticatedClientIdentity | null {
    return this.authenticatedIdentity;
  }

  /**
   * Thiết lập Windows Security Descriptor (DACL) tường minh cho Named Pipe
   * Cấm hoàn toàn truy cập từ Network và tài khoản không xác thực
   */
  private applyPipeAcl(): void {
    if (process.platform === 'win32') {
      try {
        const sddl = 'D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;GRGW;;;IU)';
        child_process.execSync(
          `py -c "import win32security; sd = win32security.ConvertStringSecurityDescriptorToSecurityDescriptor('${sddl}', win32security.SDDL_REVISION_1); win32security.SetNamedSecurityInfo('${this.pipeName}', win32security.SE_KERNEL_OBJECT, win32security.DACL_SECURITY_INFORMATION, None, None, sd.GetSecurityDescriptorDacl(), None)"`,
          { timeout: 3000, stdio: 'ignore' }
        );
      } catch (_) {
        // Môi trường không có quyền admin hoặc file đã có ACL bảo vệ
      }
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
        this.authenticatedIdentity = null;
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
          const wasAuthenticated = this.isAuthenticated;
          this.activeSocket = null;
          this.isAuthenticated = false;
          this.authenticatedIdentity = null;
          this.currentChallenge = null;

          // BLOCKER R03: Chỉ kích hoạt sự kiện ngắt kết nối khi client đó ĐÃ xác thực thành công.
          // Các kết nối không xác thực bị đóng TUYỆT ĐỐI KHÔNG làm Watchdog restart tiến trình.
          if (wasAuthenticated) {
            for (const handler of this.disconnectHandlers) {
              handler();
            }
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
        this.applyPipeAcl();
        resolve();
      });
    });
  }

  private handleIncomingMessage(msg: IpcMessage, socket: net.Socket): void {
    if (!this.isAuthenticated) {
      // BLOCKER R02: Cấm hoàn toàn Legacy Plaintext Handshake
      if (msg.type === IpcMessageType.HANDSHAKE) {
        this.rejectHandshake(socket, 'LEGACY_HANDSHAKE_DISABLED', 'Plaintext handshake is disabled. Challenge-response is mandatory.');
        return;
      }

      // 1. Xác thực bằng Challenge-Response Handshake bắt buộc
      if (msg.type === IpcMessageType.HANDSHAKE_RESPONSE) {
        const payload = msg.payload as IpcHandshakeResponsePayload;
        const now = Date.now();

        // 1.1. Kiểm tra tính hợp lệ của Challenge Nonce
        const challengeToVerify = this.currentChallenge;
        this.currentChallenge = null; // Tiêu thụ ngay lập tức (Single-Use Nonce)

        if (!challengeToVerify) {
          this.rejectHandshake(socket, 'NO_CHALLENGE', 'No active challenge pending or challenge already consumed');
          return;
        }

        // 1.2. Kiểm tra tính tươi mới (Freshness check trong vòng 60 giây)
        if (!payload || !payload.timestamp || Math.abs(now - payload.timestamp) > 60_000) {
          this.rejectHandshake(socket, 'STALE_HANDSHAKE', 'Handshake timestamp is stale or out of sync');
          return;
        }

        // 1.3. Kiểm tra các trường policy định danh tiến trình
        if (!payload.processId || payload.processId <= 0) {
          this.rejectHandshake(socket, 'INVALID_PROCESS_ID', 'Invalid client process ID in handshake response');
          return;
        }
        if (!payload.windowsSessionId || payload.windowsSessionId <= 0) {
          this.rejectHandshake(socket, 'INVALID_SESSION_ID', 'Invalid client Windows Session ID in handshake response');
          return;
        }
        if (payload.clientType !== 'INTERACTIVE_AGENT') {
          this.rejectHandshake(socket, 'INVALID_CLIENT_TYPE', 'Invalid client type in handshake response');
          return;
        }

        // BLOCKER R02: Bắt buộc trường version, cấm tuyệt đối dùng default fallback
        if (!payload.version || typeof payload.version !== 'string' || !payload.version.trim()) {
          this.rejectHandshake(socket, 'INVALID_VERSION', 'Client version is mandatory and cannot be empty');
          return;
        }
        if (!/^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$/.test(payload.version.trim())) {
          this.rejectHandshake(socket, 'MALFORMED_VERSION', 'Client version must follow SemVer format');
          return;
        }

        // Kiểm tra PID và Session ID ràng buộc với tiến trình Watchdog đã khởi chạy
        if (this.expectedProcessId !== null && payload.processId !== this.expectedProcessId) {
          this.rejectHandshake(socket, 'PROCESS_ID_MISMATCH', `Expected agent PID ${this.expectedProcessId}, received ${payload.processId}`);
          return;
        }
        if (this.expectedSessionId !== null && payload.windowsSessionId !== this.expectedSessionId) {
          this.rejectHandshake(socket, 'SESSION_ID_MISMATCH', `Expected session ID ${this.expectedSessionId}, received ${payload.windowsSessionId}`);
          return;
        }

        // 1.4. Xác thực chữ ký HMAC-SHA256 ràng buộc toàn bộ 6 trường định danh
        const isValid = IpcFraming.verifyHandshakeSignature(
          this.authToken,
          {
            challenge: challengeToVerify,
            timestamp: payload.timestamp,
            processId: payload.processId,
            windowsSessionId: payload.windowsSessionId,
            clientType: payload.clientType,
            version: payload.version.trim()
          },
          payload.signature
        );

        if (isValid) {
          this.isAuthenticated = true;
          this.authenticatedIdentity = {
            processId: payload.processId,
            windowsSessionId: payload.windowsSessionId,
            clientType: payload.clientType,
            version: payload.version.trim(),
            authenticatedAt: Date.now()
          };
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
