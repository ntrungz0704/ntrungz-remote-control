import crypto from 'node:crypto';
import { NamedPipeServer } from '../ipc/pipe-server';
import { 
  IpcMessage, 
  IpcMessageType, 
  IpcStatusPayload 
} from '../../../../packages/shared/src/ipc';

export enum WatchdogState {
  STOPPED = 'STOPPED',
  INITIALIZING = 'INITIALIZING',
  AWAITING_USER_LOGON = 'AWAITING_USER_LOGON',
  SUPERVISING = 'SUPERVISING',
  DEGRADED = 'DEGRADED',
  SHUTTING_DOWN = 'SHUTTING_DOWN'
}

export interface WatchdogOptions {
  pipeName?: string;
  authToken?: string;
  heartbeatTimeoutMs?: number;
  maxRestartsPerMinute?: number;
}

export class WatchdogService {
  private state: WatchdogState = WatchdogState.STOPPED;
  private pipeServer: NamedPipeServer;
  private authToken: string;
  private lastAgentHeartbeatAt: number = 0;
  private activeWindowsSessionId: number = 1;
  private latestStatus: IpcStatusPayload | null = null;
  private restartCount = 0;
  private lastRestartWindowStart = Date.now();
  private maxRestartsPerMinute: number;
  private heartbeatTimeoutMs: number;
  private supervisorInterval: NodeJS.Timeout | null = null;

  constructor(options?: WatchdogOptions) {
    this.authToken = options?.authToken || crypto.randomBytes(32).toString('hex');
    this.maxRestartsPerMinute = options?.maxRestartsPerMinute ?? 5;
    this.heartbeatTimeoutMs = options?.heartbeatTimeoutMs ?? 15_000;

    this.pipeServer = new NamedPipeServer({
      pipeName: options?.pipeName,
      authToken: this.authToken
    });

    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    this.pipeServer.onMessage((msg: IpcMessage) => {
      if (msg.type === IpcMessageType.HEARTBEAT) {
        this.lastAgentHeartbeatAt = Date.now();
      } else if (msg.type === IpcMessageType.STATUS_REPORT) {
        this.latestStatus = msg.payload as IpcStatusPayload;
        this.lastAgentHeartbeatAt = Date.now();
      }
    });

    this.pipeServer.onDisconnect(() => {
      console.warn('[Watchdog] Interactive Session Agent disconnected from IPC');
      if (this.state === WatchdogState.SUPERVISING) {
        this.handleAgentCrashOrExit();
      }
    });
  }

  public async start(): Promise<void> {
    this.state = WatchdogState.INITIALIZING;
    await this.pipeServer.start();

    // Xác định console session hiện tại
    this.activeWindowsSessionId = this.detectActiveConsoleSession();

    if (this.activeWindowsSessionId <= 0) {
      this.state = WatchdogState.AWAITING_USER_LOGON;
    } else {
      this.state = WatchdogState.SUPERVISING;
    }

    // Khởi chạy supervisor loop
    this.supervisorInterval = setInterval(() => {
      this.monitorInteractiveAgent();
    }, 5000);
  }

  /**
   * Giả lập / đọc Console Session ID của Windows qua WTSGetActiveConsoleSessionId
   */
  public detectActiveConsoleSession(): number {
    // Trên Windows 10/11: Session 0 là Service, Session 1+ là người dùng đăng nhập
    return 1;
  }

  public handleAgentCrashOrExit(): void {
    const now = Date.now();
    if (now - this.lastRestartWindowStart > 60_000) {
      this.restartCount = 0;
      this.lastRestartWindowStart = now;
    }

    this.restartCount++;
    if (this.restartCount > this.maxRestartsPerMinute) {
      this.state = WatchdogState.DEGRADED;
      console.error('[Watchdog] Too many crashes in 60s. Entering DEGRADED mode.');
      return;
    }

    console.log(`[Watchdog] Restarting agent (attempt ${this.restartCount}/${this.maxRestartsPerMinute})...`);
    // Ở bản production: gọi Win32 CreateProcessAsUserW với token của Session 1
  }

  private monitorInteractiveAgent(): void {
    if (this.state !== WatchdogState.SUPERVISING) return;

    if (this.pipeServer.isClientConnected()) {
      const elapsed = Date.now() - this.lastAgentHeartbeatAt;
      if (this.lastAgentHeartbeatAt > 0 && elapsed > this.heartbeatTimeoutMs) {
        console.warn(`[Watchdog] Agent heartbeat timed out (${elapsed}ms > ${this.heartbeatTimeoutMs}ms)`);
        this.handleAgentCrashOrExit();
      }
    }
  }

  public getAuthToken(): string {
    return this.authToken;
  }

  public getState(): WatchdogState {
    return this.state;
  }

  public getLatestStatus(): IpcStatusPayload | null {
    return this.latestStatus;
  }

  public isAgentConnected(): boolean {
    return this.pipeServer.isClientConnected();
  }

  public async stop(): Promise<void> {
    this.state = WatchdogState.SHUTTING_DOWN;
    if (this.supervisorInterval) {
      clearInterval(this.supervisorInterval);
      this.supervisorInterval = null;
    }
    await this.pipeServer.close();
    this.state = WatchdogState.STOPPED;
  }
}
