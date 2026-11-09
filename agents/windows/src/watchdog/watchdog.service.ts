import crypto from 'node:crypto';
import child_process from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';
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
  processLauncher?: (env: NodeJS.ProcessEnv) => child_process.ChildProcess;
}

export class RealAgentProcess extends EventEmitter {
  public pid: number;
  public killed = false;
  private monitorTimer: NodeJS.Timeout | null = null;
  private launcherScript: string;

  constructor(pid: number, launcherScript: string) {
    super();
    this.pid = pid;
    this.launcherScript = launcherScript;

    // BLOCKER R01: Quản lý vòng đời tiến trình thực tế bằng non-blocking kernel signal probe
    this.monitorTimer = setInterval(() => {
      try {
        process.kill(this.pid, 0);
      } catch (err: any) {
        if (err.code === 'ESRCH') {
          this.cleanup();
          this.emit('exit', 0, null);
        }
      }
    }, 1000);
  }

  public kill(): boolean {
    this.killed = true;
    this.cleanup();
    try {
      child_process.execSync(
        `py "${this.launcherScript}" kill ${this.pid}`,
        { encoding: 'utf-8', timeout: 3000 }
      );
      return true;
    } catch (_) {
      try {
        process.kill(this.pid);
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  private cleanup(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }
}

export class WatchdogService {
  private state: WatchdogState = WatchdogState.STOPPED;
  private pipeServer: NamedPipeServer;
  private authToken: string;
  private lastAgentHeartbeatAt: number = 0;
  private activeWindowsSessionId: number = 0;
  private latestStatus: IpcStatusPayload | null = null;
  private restartTimestamps: number[] = [];
  private maxRestartsPerMinute: number;
  private heartbeatTimeoutMs: number;
  private supervisorInterval: NodeJS.Timeout | null = null;
  private agentProcess: RealAgentProcess | child_process.ChildProcess | null = null;
  private customLauncher?: (env: NodeJS.ProcessEnv) => child_process.ChildProcess;
  private agentScriptPath?: string;
  private pipeName: string;

  constructor(options?: WatchdogOptions) {
    // Đảm bảo tối thiểu 32 bytes (64 hex characters) cryptographically secure entropy
    this.authToken = options?.authToken || crypto.randomBytes(32).toString('hex');
    this.maxRestartsPerMinute = options?.maxRestartsPerMinute ?? 5;
    this.heartbeatTimeoutMs = options?.heartbeatTimeoutMs ?? 15_000;
    this.customLauncher = options?.processLauncher;
    this.agentScriptPath = options?.agentScriptPath || path.resolve(__dirname, '../interactive/entry.ts');
    this.pipeName = options?.pipeName || '\\\\.\\pipe\\ntrungz-remote-agent-ipc';

    this.pipeServer = new NamedPipeServer({
      pipeName: this.pipeName,
      authToken: this.authToken
    });

    this.setupIpcHandlers();
  }

  public getPipeServer(): NamedPipeServer {
    return this.pipeServer;
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
      const child = this.spawnInteractiveAgent();
      if (child) {
        this.state = WatchdogState.SUPERVISING;
      } else {
        this.state = WatchdogState.DEGRADED;
        console.error('[Watchdog] Failed to launch verified interactive agent process.');
      }
    }

    // 2. Chu kỳ giám sát nhịp tim và trạng thái phiên
    this.supervisorInterval = setInterval(() => {
      this.monitorInteractiveAgent();
    }, 3000);
  }

  /**
   * Truy vấn thực tế Windows Session ID bằng Win32 API WTSGetActiveConsoleSessionId
   * Tuyệt đối không fallback về 1 khi API thất bại (Fail-Closed).
   */
  public detectActiveConsoleSession(): number {
    try {
      if (process.platform === 'win32') {
        const out = child_process.execSync(
          'py -c "import ctypes; print(ctypes.windll.kernel32.WTSGetActiveConsoleSessionId())"',
          { encoding: 'utf-8', timeout: 3000 }
        );
        const parsed = parseInt(out.trim(), 10);
        if (!isNaN(parsed) && parsed > 0 && parsed !== 0xFFFFFFFF) {
          return parsed;
        }
        return 0xFFFFFFFF;
      }
      return 0xFFFFFFFF;
    } catch (err) {
      return 0xFFFFFFFF;
    }
  }

  /**
   * Khởi động Interactive Session Agent với cơ chế bootstrap bí mật và xác minh quyền tương tác (Fail-Closed)
   */
  public spawnInteractiveAgent(): RealAgentProcess | child_process.ChildProcess | null {
    // Duplicate process prevention: Đóng tiến trình cũ nếu còn tồn tại
    if (this.agentProcess && !this.agentProcess.killed) {
      try {
        this.agentProcess.kill();
      } catch (_) {}
      this.agentProcess = null;
    }

    if (this.activeWindowsSessionId <= 0 || this.activeWindowsSessionId === 0xFFFFFFFF) {
      this.activeWindowsSessionId = this.detectActiveConsoleSession();
    }

    const secureEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NTRUNGZ_IPC_SECRET: this.authToken,
      NTRUNGZ_SESSION_ID: String(this.activeWindowsSessionId),
      NTRUNGZ_PIPE_NAME: this.pipeName
    };

    if (this.customLauncher) {
      this.agentProcess = this.customLauncher(secureEnv);
    } else if (this.agentScriptPath && process.platform === 'win32') {
      const launcherScript = path.resolve(__dirname, 'process_launcher.py');
      const isTs = this.agentScriptPath.endsWith('.ts');
      const tsxLoaderUrl = pathToFileURL(require.resolve('tsx')).href;
      // BLOCKER R01: Khởi chạy trực tiếp node.exe, cấm tuyệt đối npx.cmd hay cmd.exe
      const cmd = isTs
        ? `"${process.execPath}" --import "${tsxLoaderUrl}" "${this.agentScriptPath}"`
        : `"${process.execPath}" "${this.agentScriptPath}"`;

      const b64Cmd = Buffer.from(cmd).toString('base64');
      const b64Env = Buffer.from(JSON.stringify({
        SystemRoot: process.env.SystemRoot || 'C:\\WINDOWS',
        PATH: process.env.PATH || '',
        SystemDrive: process.env.SystemDrive || 'C:',
        TEMP: process.env.TEMP || 'C:\\Windows\\Temp',
        TMP: process.env.TMP || 'C:\\Windows\\Temp',
        NTRUNGZ_IPC_SECRET: this.authToken,
        NTRUNGZ_SESSION_ID: String(this.activeWindowsSessionId),
        NTRUNGZ_PIPE_NAME: this.pipeName
      })).toString('base64');

      try {
        const out = child_process.execSync(
          `py "${launcherScript}" ${this.activeWindowsSessionId} ${b64Cmd} ${b64Env}`,
          { encoding: 'utf-8', timeout: 8000 }
        );
        const jsonLine = out.split('\n').map(l => l.trim()).find(l => l.startsWith('{') && l.endsWith('}'));
        if (!jsonLine) {
          throw new Error(`Invalid launcher output: ${out}`);
        }
        const parsed = JSON.parse(jsonLine);
        if (parsed.status === 'SUCCESS' && parsed.pid) {
          this.pipeServer.setExpectedClientIdentity(parsed.pid, this.activeWindowsSessionId);
          // BLOCKER R01: Quản lý trực tiếp Real PID bằng RealAgentProcess, không dùng wrapper cmd.exe
          this.agentProcess = new RealAgentProcess(parsed.pid, launcherScript);
        } else {
          console.error('[Watchdog] Native process launcher returned failure:', parsed);
          this.agentProcess = null;
        }
      } catch (err) {
        console.error('[Watchdog] Failed to launch interactive agent via native launcher:', err);
        this.agentProcess = null;
      }
    } else if (this.agentScriptPath) {
      const isTs = this.agentScriptPath.endsWith('.ts');
      const tsxLoaderUrl = pathToFileURL(require.resolve('tsx')).href;
      const cmd = process.execPath;
      const args = isTs ? ['--import', tsxLoaderUrl, this.agentScriptPath] : [this.agentScriptPath];

      this.agentProcess = child_process.spawn(cmd, args, {
        env: secureEnv,
        stdio: 'ignore',
        detached: true
      });
    }

    if (this.agentProcess && this.agentProcess.pid) {
      this.pipeServer.setExpectedClientIdentity(this.agentProcess.pid, this.activeWindowsSessionId);

      (this.agentProcess as any).on('exit', (code: any, signal: any) => {
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

    if (currentConsoleSession !== this.activeWindowsSessionId) {
      console.warn(`[Watchdog] Session switch detected: ${this.activeWindowsSessionId} -> ${currentConsoleSession}`);
      this.activeWindowsSessionId = currentConsoleSession;
      this.handleAgentCrashOrExit();
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

  public getAgentProcess(): RealAgentProcess | child_process.ChildProcess | null {
    return this.agentProcess;
  }

  public getAgentPid(): number | null {
    return this.agentProcess?.pid ?? null;
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
