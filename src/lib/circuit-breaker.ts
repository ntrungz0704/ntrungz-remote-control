// ============================================================================
// FAST-SHIP-HUB — CIRCUIT BREAKER PATTERN
// Self-Healing Fault Tolerance Mechanism (Closed -> Open -> Half-Open)
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // Số lần lỗi liên tiếp trước khi ngắt mạch (mặc định 5)
  cooldownPeriodMs?: number; // Thời gian cách ly trước khi thử lại (mặc định 60,000ms)
  successThreshold?: number; // Số lần thành công ở HALF_OPEN để đóng mạch hoàn toàn (mặc định 2)
}

export class CircuitBreaker {
  readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private consecutiveSuccessCount = 0;
  private nextAttemptAt = 0;

  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;
  private readonly successThreshold: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownPeriodMs = options.cooldownPeriodMs ?? 60000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  /**
   * Kiểm tra xem request có được phép thực thi hay bị ngắt ngay lập tức
   */
  canExecute(): boolean {
    const now = Date.now();

    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (now >= this.nextAttemptAt) {
        // Hết thời gian cách ly, chuyển sang HALF_OPEN để thăm dò
        this.state = 'HALF_OPEN';
        this.consecutiveSuccessCount = 0;
        return true;
      }
      return false; // Ngắt mạch, từ chối tức thì (0ms)
    }

    // Đang ở HALF_OPEN: cho phép số ít request thăm dò
    return true;
  }

  /**
   * Ghi nhận một lượt gọi thành công
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccessCount++;
      if (this.consecutiveSuccessCount >= this.successThreshold) {
        // Phục hồi hoàn toàn
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.consecutiveSuccessCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  /**
   * Ghi nhận một lượt gọi thất bại hoặc timeout
   */
  recordFailure(): void {
    this.failureCount++;

    if (this.state === 'HALF_OPEN') {
      // Đang thăm dò mà vẫn lỗi -> Lập tức quay lại OPEN
      this.state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.cooldownPeriodMs;
      this.consecutiveSuccessCount = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      // Vượt ngưỡng lỗi -> Ngắt mạch OPEN
      this.state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.cooldownPeriodMs;
    }
  }

  /**
   * Bọc một Promise execution với Circuit Breaker
   */
  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(`CARRIER_CIRCUIT_OPEN: Mạch kết nối tới ${this.name} đang mở do lỗi liên tiếp`);
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /** Lấy trạng thái hiện tại */
  getState(): CircuitState {
    // Tự động kiểm tra chuyển tiếp từ OPEN -> HALF_OPEN nếu hết cooldown
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptAt) {
      this.state = 'HALF_OPEN';
      this.consecutiveSuccessCount = 0;
    }
    return this.state;
  }

  /** Reset trạng thái về CLOSED (phục vụ testing hoặc manual toggle) */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.consecutiveSuccessCount = 0;
    this.nextAttemptAt = 0;
  }
}

/**
 * Registry quản lý tập trung Circuit Breakers cho toàn bộ các hãng
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  getBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker({
        name,
        ...options,
      });
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
