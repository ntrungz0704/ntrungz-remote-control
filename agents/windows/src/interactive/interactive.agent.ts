import child_process from 'node:child_process';
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
  screenWidth?: number;
  screenHeight?: number;
  dpi?: number;
}

export class WindowsInteractiveAgent {
  private client: NamedPipeClient;
  private windowsSessionId: number;
  private desktopName: string;
  private windowStationName: string;
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private dpi: number = 96;
  private isLocked: boolean = false;
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

    this.windowStationName = options?.windowStationName || 'WinSta0';
    this.desktopName = options?.desktopName || 'Default';

    // Đọc thông số màn hình thực tế từ Windows API
    this.queryActualDisplayMetrics(options);

    this.prevCpuUsage = process.cpuUsage();
    this.prevCpuTime = Date.now();

    this.client = new NamedPipeClient({
      pipeName: options?.pipeName,
      authToken: token,
      windowsSessionId: this.windowsSessionId
    });

    this.setupHandlers();
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

  /**
   * Truy vấn Session ID của tiến trình hiện tại qua Win32 API ProcessIdToSessionId
   */
  private queryNativeSessionId(): number {
    try {
      if (process.platform === 'win32') {
        const out = child_process.execSync(
          `py -c "import ctypes; sid = ctypes.c_ulong(); ctypes.windll.kernel32.ProcessIdToSessionId(${process.pid}, ctypes.byref(sid)); print(sid.value)"`,
          { encoding: 'utf-8', timeout: 3000 }
        );
        const parsed = parseInt(out.trim(), 10);
        return isNaN(parsed) ? 1 : parsed;
      }
      return 1;
    } catch {
      return 1;
    }
  }

  /**
   * Thu thập thông số màn hình và đa màn hình thực tế từ Windows OS
   */
  public queryActualDisplayMetrics(options?: InteractiveAgentOptions): void {
    if (options?.screenWidth && options?.screenHeight) {
      this.screenWidth = options.screenWidth;
      this.screenHeight = options.screenHeight;
      this.dpi = options.dpi ?? 96;
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

    try {
      if (process.platform === 'win32') {
        const script = `import ctypes
u = ctypes.windll.user32
cx = u.GetSystemMetrics(0)
cy = u.GetSystemMetrics(1)
dpi = u.GetDpiForSystem() if hasattr(u, 'GetDpiForSystem') else 96
print(f"{cx},{cy},{dpi}")`;
        const out = child_process.execSync(`py -c "${script}"`, { encoding: 'utf-8', timeout: 3000 });
        const [w, h, d] = out.trim().split(',').map(Number);
        this.screenWidth = w || 1920;
        this.screenHeight = h || 1080;
        this.dpi = d || 96;
      } else {
        this.screenWidth = 1920;
        this.screenHeight = 1080;
        this.dpi = 96;
      }
    } catch {
      this.screenWidth = 1920;
      this.screenHeight = 1080;
      this.dpi = 96;
    }

    this.monitors = [{
      index: 0,
      deviceName: '\\\\.\\DISPLAY1',
      isPrimary: true,
      width: this.screenWidth,
      height: this.screenHeight,
      dpi: this.dpi
    }];
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
}
