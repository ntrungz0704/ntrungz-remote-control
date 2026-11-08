import { NamedPipeClient } from '../ipc/pipe-client';
import { 
  IpcMessage, 
  IpcMessageType, 
  IpcStatusPayload,
  IpcCommandPayload 
} from '../../../../packages/shared/src/ipc';

export interface InteractiveAgentOptions {
  pipeName?: string;
  authToken: string;
  windowsSessionId?: number;
  desktopName?: string;
  screenWidth?: number;
  screenHeight?: number;
  dpi?: number;
}

export class WindowsInteractiveAgent {
  private client: NamedPipeClient;
  private windowsSessionId: number;
  private desktopName: string;
  private screenWidth: number;
  private screenHeight: number;
  private dpi: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(options: InteractiveAgentOptions) {
    this.windowsSessionId = options.windowsSessionId ?? 1;
    this.desktopName = options.desktopName || 'WinSta0\\Default';
    this.screenWidth = options.screenWidth ?? 1920;
    this.screenHeight = options.screenHeight ?? 1080;
    this.dpi = options.dpi ?? 96;

    this.client = new NamedPipeClient({
      pipeName: options.pipeName,
      authToken: options.authToken,
      windowsSessionId: this.windowsSessionId
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.client.onConnect(() => {
      // Gửi báo cáo thông số màn hình ngay sau khi bắt tay thành công
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

  public async start(): Promise<void> {
    this.isRunning = true;
    await this.client.connect();
  }

  public sendCurrentStatus(): boolean {
    const status: IpcStatusPayload = {
      windowsSessionId: this.windowsSessionId,
      desktopName: this.desktopName,
      isLocked: false,
      resolution: {
        width: this.screenWidth,
        height: this.screenHeight,
        dpi: this.dpi
      },
      metrics: {
        cpuPercent: 1.5,
        memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024))
      }
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
