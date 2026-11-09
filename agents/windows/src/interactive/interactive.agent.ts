import child_process from 'node:child_process';
import path from 'node:path';
import { NamedPipeClient } from '../ipc/pipe-client';
import { 
  IpcMessage, 
  IpcMessageType, 
  IpcStatusPayload,
  IpcCommandPayload,
  MonitorInfo 
} from '../../../../packages/shared/src/ipc';

export interface InteractiveAgentOptions {
  pipeName?: string;
  authToken?: string;
  windowsSessionId?: number;
  desktopName?: string;
  windowStationName?: string;
  isLocked?: boolean | null;
  screenWidth?: number;
  screenHeight?: number;
  dpi?: number;
}

export class WindowsInteractiveAgent {
  private client: NamedPipeClient;
  private windowsSessionId: number;
  private desktopName: string = 'UNKNOWN';
  private windowStationName: string = 'UNKNOWN';
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private dpi: number = 0;
  // BLOCKER R05: Không mặc định false, hỗ trợ trạng thái boolean | null và lockState
  private isLocked: boolean | null = null;
  private lockState: 'LOCKED' | 'UNLOCKED' | 'UNKNOWN' = 'UNKNOWN';
  private topologySignature: string | null = null;
  private monitors: MonitorInfo[] = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private prevCpuUsage: NodeJS.CpuUsage;
  private prevCpuTime: number;

  constructor(options?: InteractiveAgentOptions) {
    // Nhận auth token từ môi trường bảo mật nếu không truyền trực tiếp
    const token = options?.authToken || process.env.NTRUNGZ_IPC_SECRET || '';
    if (!token || token.length < 32) {
      throw new Error('Interactive Agent requires a valid 32-byte NTRUNGZ_IPC_SECRET token');
    }

    this.windowsSessionId = options?.windowsSessionId ?? 
      (process.env.NTRUNGZ_SESSION_ID ? parseInt(process.env.NTRUNGZ_SESSION_ID, 10) : this.queryNativeSessionId());

    // BLOCKER R05 / Condition 3: Truy vấn động thực tế từ Windows OS, không dùng hardcode
    this.queryActualDesktopAndDisplayContext(options);

    this.prevCpuUsage = process.cpuUsage();
    this.prevCpuTime = Date.now();

    this.client = new NamedPipeClient({
      pipeName: options?.pipeName || process.env.NTRUNGZ_PIPE_NAME || '\\\\.\\pipe\\ntrungz-remote-agent-ipc',
      authToken: token,
      windowsSessionId: this.windowsSessionId
    });

    this.setupHandlers();
  }

  /**
   * Truy vấn Session ID của tiến trình hiện tại qua Win32 API ProcessIdToSessionId
   */
  private queryNativeSessionId(): number {
    if (process.platform === 'win32') {
      try {
        const out = child_process.execSync(
          `py -c "import ctypes; sid = ctypes.c_ulong(); ctypes.windll.kernel32.ProcessIdToSessionId(${process.pid}, ctypes.byref(sid)); print(sid.value)"`,
          { encoding: 'utf-8', timeout: 3000 }
        );
        const parsed = parseInt(out.trim(), 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      } catch (err: any) {
        throw new Error(`Failed to query native session ID for process ${process.pid}: ${err.message || err}`);
      }
    }
    throw new Error(`Platform ${process.platform} does not support native Windows session query`);
  }

  /**
   * Thu thập thông số WindowStation, Desktop, trạng thái Lock và Multi-monitor thực tế từ Windows OS
   */
  public queryActualDesktopAndDisplayContext(options?: InteractiveAgentOptions): void {
    if (options?.windowStationName && options?.desktopName && options?.screenWidth) {
      this.windowStationName = options.windowStationName;
      this.desktopName = options.desktopName;
      this.screenWidth = options.screenWidth;
      this.screenHeight = options.screenHeight || 1080;
      this.dpi = options.dpi ?? 0;
      // BLOCKER R05: Hỗ trợ boolean | null, không tự gán false
      this.isLocked = options.isLocked ?? null;
      this.lockState = options.isLocked === true ? 'LOCKED' : (options.isLocked === false ? 'UNLOCKED' : 'UNKNOWN');
      this.monitors = [{
        index: 0,
        deviceName: '\\\\.\\DISPLAY1',
        isPrimary: true,
        width: this.screenWidth,
        height: this.screenHeight,
        dpi: this.dpi
      }];
      return;
    }

    if (process.platform === 'win32') {
      try {
        const scriptPath = path.resolve(__dirname, '../../../../scripts/get_desktop_context.py');
        const out = child_process.execSync(`py "${scriptPath}"`, { encoding: 'utf-8', timeout: 4000 });
        const parsed = JSON.parse(out.trim());
        this.windowStationName = parsed.windowStation || 'UNKNOWN';
        this.desktopName = parsed.desktop || 'UNKNOWN';
        // BLOCKER R05: Đọc chính xác lockState và isLocked từ OS, không bao giờ ép về false
        this.isLocked = typeof parsed.isLocked === 'boolean' ? parsed.isLocked : null;
        this.lockState = parsed.lockState || (this.isLocked === true ? 'LOCKED' : (this.isLocked === false ? 'UNLOCKED' : 'UNKNOWN'));
        this.topologySignature = parsed.topologySignature || null;
        this.dpi = typeof parsed.systemDpi === 'number' ? parsed.systemDpi : 0;
        this.monitors = (parsed.monitors || []).map((m: any) => ({
          index: m.index,
          deviceName: m.deviceName,
          isPrimary: m.isPrimary,
          width: m.width,
          height: m.height,
          dpi: m.dpi || 0
        }));

        const primary = this.monitors.find(m => m.isPrimary) || this.monitors[0];
        if (primary) {
          this.screenWidth = primary.width;
          this.screenHeight = primary.height;
        } else {
          this.screenWidth = 0;
          this.screenHeight = 0;
        }
        return;
      } catch (err) {
        // Fallback an toàn không giả định số liệu
      }
    }

    this.windowStationName = 'UNKNOWN';
    this.desktopName = 'UNKNOWN';
    this.isLocked = null;
    this.lockState = 'UNKNOWN';
    this.topologySignature = null;
    this.screenWidth = 0;
    this.screenHeight = 0;
    this.dpi = 0;
    this.monitors = [];
  }

  /**
   * Đo lường CPU và Memory thực tế của tiến trình
   */
  public measureActualMetrics(): { cpuPercent: number; memoryMb: number } {
    const currentCpu = process.cpuUsage(this.prevCpuUsage);
    const currentTime = Date.now();
    const timeDeltaMs = (currentTime - this.prevCpuTime) || 1;

    const totalCpuMicros = currentCpu.user + currentCpu.system;
    const cpuPercent = Math.min(100, Math.round((totalCpuMicros / (timeDeltaMs * 1000)) * 100 * 10) / 10);

    this.prevCpuUsage = process.cpuUsage();
    this.prevCpuTime = currentTime;

    const memoryMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    return { cpuPercent, memoryMb };
  }

  public getDesktopContext(): {
    processId: number;
    windowsSessionId: number;
    windowStationName: string;
    desktopName: string;
    isLocked: boolean | null;
    lockState: 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';
    topologySignature: string | null;
    screenWidth: number;
    screenHeight: number;
    dpi: number;
    monitors: MonitorInfo[];
  } {
    return {
      processId: process.pid,
      windowsSessionId: this.windowsSessionId,
      windowStationName: this.windowStationName,
      desktopName: this.desktopName,
      isLocked: this.isLocked,
      lockState: this.lockState,
      topologySignature: this.topologySignature,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      dpi: this.dpi,
      monitors: this.monitors
    };
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    await this.client.connect();
  }

  public sendCurrentStatus(): boolean {
    const metrics = this.measureActualMetrics();
    const status: IpcStatusPayload = {
      windowsSessionId: this.windowsSessionId,
      targetProcessId: process.pid,
      windowStationName: this.windowStationName,
      desktopName: this.desktopName,
      isLocked: this.isLocked,
      lockState: this.lockState,
      topologySignature: this.topologySignature ?? undefined,
      monitors: this.monitors,
      resolution: {
        width: this.screenWidth,
        height: this.screenHeight,
        dpi: this.dpi
      },
      metrics
    };
    return this.client.sendStatusReport(status);
  }

  private startHeartbeatLoop(): void {
    this.stopHeartbeatLoop();
    this.heartbeatTimer = setInterval(() => {
      if (this.isRunning && this.client.isConnected()) {
        this.client.sendHeartbeat();
      }
    }, 5000);
  }

  private stopHeartbeatLoop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleCommand(cmd: IpcCommandPayload): void {
    if (cmd.command === 'TERMINATE') {
      this.stop();
    }
  }

  public isConnected(): boolean {
    return this.client.isConnected();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.stopHeartbeatLoop();
    await this.client.disconnect();
  }

  private setupHandlers(): void {
    this.client.onConnect(() => {
      this.sendCurrentStatus();
      this.startHeartbeatLoop();
    });

    this.client.onDisconnect(() => {
      this.stopHeartbeatLoop();
    });

    this.client.onMessage((msg: IpcMessage) => {
      if (msg.type === IpcMessageType.COMMAND) {
        this.handleCommand(msg.payload as IpcCommandPayload);
      }
    });
  }
}
