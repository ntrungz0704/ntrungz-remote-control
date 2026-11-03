// ============================================================================
// FAST-SHIP-HUB — IDEMPOTENCY GUARD
// Double-Click Protection & Request Deduplication Store
// ============================================================================

export type IdempotencyStatus = 'PROCESSING' | 'RESOLVED';

export interface IdempotencyRecord {
  key: string;
  status: IdempotencyStatus;
  createdAt: number;
  expiresAt: number;
  cachedResponse?: unknown;
}

class IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();
  private readonly defaultTtlMs = 120000; // 120 giây (2 phút)

  /**
   * Kiểm tra và khóa một Idempotency-Key
   * @returns 'ACQUIRED' nếu thành công nhận quyền xử lý
   * @returns 'IN_PROGRESS' nếu đang có request khác xử lý
   * @returns 'CACHED' nếu đã giải quyết xong và có sẵn kết quả lưu đệm
   */
  acquire(
    key: string,
    ttlMs: number = this.defaultTtlMs
  ): { status: 'ACQUIRED' } | { status: 'IN_PROGRESS' } | { status: 'CACHED'; cachedResponse: unknown } {
    this.cleanExpired();

    const existing = this.records.get(key);

    if (existing) {
      if (existing.status === 'PROCESSING') {
        return { status: 'IN_PROGRESS' };
      }
      if (existing.status === 'RESOLVED' && existing.cachedResponse !== undefined) {
        return { status: 'CACHED', cachedResponse: existing.cachedResponse };
      }
    }

    // Khóa mới
    const now = Date.now();
    this.records.set(key, {
      key,
      status: 'PROCESSING',
      createdAt: now,
      expiresAt: now + ttlMs,
    });

    return { status: 'ACQUIRED' };
  }

  /**
   * Lưu kết quả phản hồi sau khi xử lý thành công
   */
  resolve(key: string, response: unknown): void {
    const record = this.records.get(key);
    if (record) {
      record.status = 'RESOLVED';
      record.cachedResponse = response;
    }
  }

  /**
   * Giải phóng khóa nếu xử lý gặp lỗi nghiêm trọng (để người dùng có thể thử lại)
   */
  release(key: string): void {
    this.records.delete(key);
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.expiresAt) {
        this.records.delete(key);
      }
    }
  }
}

export const idempotencyStore = new IdempotencyStore();
