import crypto from 'node:crypto';
import child_process from 'node:child_process';
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
  agentScriptPath?: string;
  processLauncher?: (env: Record<string, string>) => child_process.ChildProcess;
}

export class WatchdogService {
  private state: WatchdogState = WatchdogState.STOPPED;
  private pipeServer: NamedPipeServer;
  private authToken: string;
  private lastAgentHeartbeatAt: number = 0;
  private activeWindowsSessionId: number = 1;
  private latestStatus: IpcStatusPayload | null = null;
  private restartTimestamps: number[] = [];
  private maxRestartsPerMinute: number;
  private heartbeatTimeoutMs: number;
  private supervisorInterval: NodeJS.Timeout | null = null;
  private agentProcess: child_process.ChildProcess | null = null;
  private customLauncher?: (env: Record<string, string>) => child_process.ChildProcess;
  private agentScriptPath?: string;

  constructor(options?: WatchdogOptions) {
    // Đảm bảo tối thiểu 32 bytes (64 hex characters) cryptographically secure entropy
    this.authToken = options?.authToken || crypto.randomBytes(32).toString('hex');
    this.maxRestartsPerMinute = options?.maxRestartsPerMinute ?? 5;
    this.heartbeatTimeoutMs = options?.heartbeatTimeoutMs ?? 15_000;
    this.customLauncher = options?.processLauncher;
    this.agentScriptPath = options?.agentScriptPath;

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

    // 1. Quét thực tế Windows Active Console Session ID
    this.activeWindowsSessionId = this.detectActiveConsoleSession();

    // 0xFFFFFFFF (4294967295) biểu thị không có console session nào gắn kết
    if (this.activeWindowsSessionId === 0xFFFFFFFF || this.activeWindowsSessionId <= 0) {
      this.state = WatchdogState.AWAITING_USER_LOGON;
      console.log('[Watchdog] No active interactive console session. Awaiting user logon.');
    } else {
      this.state = WatchdogState.SUPERVISING;
      this.spawnInteractiveAgent();
    }

    // 2. Chu kỳ giám sát nhịp tim và trạng thái phiên
    this.supervisorInterval = setInterval(() => {
      this.monitorInteractiveAgent();
    }, 3000);
  }

  /**
   * Truy vấn thực tế Windows Session ID bằng Win32 API WTSGetActiveConsoleSessionId
   */
  public detectActiveConsoleSession(): number {
    try {
      if (process.platform === 'win32') {
        const out = child_process.execSync(
          'py -c "import ctypes; print(ctypes.windll.kernel32.WTSGetActiveConsoleSessionId())"',
          { encoding: 'utf-8', timeout: 3000 }
        );
        const parsed = parseInt(out.trim(), 10);
        return isNaN(parsed) ? 1 : parsed;
      }
      return 1;
    } catch (err) {
      return 1;
    }
  }

  /**
   * Khởi động Interactive Session Agent với cơ chế bootstrap bí mật (không lộ trong CLI args)
   */
  public spawnInteractiveAgent(): child_process.ChildProcess | null {
    // Duplicate process prevention: Đóng tiến trình cũ nếu còn tồn tại
    if (this.agentProcess && !this.agentProcess.killed) {
      try {
        this.agentProcess.kill();
      } catch (_) {}
      this.agentProcess = null;
    }

    const secureEnv: Record<string, string> = {
      ...(process.env as Record<string, string>),
      NTRUNGZ_IPC_SECRET: this.authToken,
      NTRUNGZ_SESSION_ID: String(this.activeWindowsSessionId)
    };

    if (this.customLauncher) {
      this.agentProcess = this.customLauncher(secureEnv);
    } else if (this.agentScriptPath) {
      this.agentProcess = child_process.spawn(process.execPath, [this.agentScriptPath], {
        env: secureEnv,
        stdio: 'ignore',
        detached: true
      });
    }

    if (this.agentProcess) {
      this.agentProcess.on('exit', (code, signal) => {
        console.warn(`[Watchdog] Agent process exited with code ${code}, signal ${signal}`);
        if (this.state === WatchdogState.SUPERVISING) {
          this.handleAgentCrashOrExit();
        }
      });
    }

    return this.agentProcess;
  }

  /**
   * Xử lý crash hoặc ngắt kết nối với thuật toán Rolling 60s Window Anti-Crash-Loop
   */
  public handleAgentCrashOrExit(): boolean {
    const now = Date.now();
    // Lọc lại các lần restart chỉ trong cửa sổ 60 giây vừa qua
    this.restartTimestamps = this.restartTimestamps.filter(t => now - t <= 60_000);

    if (this.restartTimestamps.length >= this.maxRestartsPerMinute) {
      this.state = WatchdogState.DEGRADED;
      console.error(`[Watchdog] CRITICAL: Exceeded ${this.maxRestartsPerMinute} restarts in 60s. Entering DEGRADED state.`);
      return false;
    }

    this.restartTimestamps.push(now);
    console.log(`[Watchdog] Restarting agent (restart #${this.restartTimestamps.length} in rolling 60s)...`);
    
    // Khởi động lại agent
    this.spawnInteractiveAgent();
    return true;
  }

  private monitorInteractiveAgent(): void {
    if (this.state !== WatchdogState.SUPERVISING) return;

    // Kiểm tra xem user session có bị thay đổi hoặc logout không
    const currentConsoleSession = this.detectActiveConsoleSession();
    if (currentConsoleSession === 0xFFFFFFFF || currentConsoleSession <= 0) {
      this.state = WatchdogState.AWAITING_USER_LOGON;
      if (this.agentProcess) {
        try { this.agentProcess.kill(); } catch (_) {}
      }
      return;
    }

    // Giám sát nhịp tim khi pipe đang kết nối
    if (this.pipeServer.isClientConnected()) {
      const elapsed = Date.now() - this.lastAgentHeartbeatAt;
      if (this.lastAgentHeartbeatAt > 0 && elapsed > this.heartbeatTimeoutMs) {
        console.warn(`[Watchdog] Agent heartbeat timed out (${elapsed}ms > ${this.heartbeatTimeoutMs}ms). Restarting.`);
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

  public getRestartCountInWindow(): number {
    const now = Date.now();
    return this.restartTimestamps.filter(t => now - t <= 60_000).length;
  }

  public async stop(): Promise<void> {
    this.state = WatchdogState.SHUTTING_DOWN;
    if (this.supervisorInterval) {
      clearInterval(this.supervisorInterval);
      this.supervisorInterval = null;
    }
    if (this.agentProcess) {
      try {
        this.agentProcess.kill();
      } catch (_) {}
      this.agentProcess = null;
    }
    await this.pipeServer.close();
    this.state = WatchdogState.STOPPED;
  }
}
