// ============================================================================
// FAST-SHIP-HUB — UNIFIED API TYPES & ENVELOPES
// Standard JSON Envelope and Error Codes
// ============================================================================

import { randomUUID } from 'node:crypto';

/** Danh mục mã lỗi hệ thống chuẩn hóa toàn sàn */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'TRACKING_TOKEN_INVALID'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'INSUFFICIENT_WALLET_BALANCE'
  | 'PACKAGE_EXCEEDS_LIMITS'
  | 'DISTANCE_EXCEEDS_LIMIT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CARRIER_TIMEOUT'
  | 'CARRIER_CIRCUIT_OPEN'
  | 'CARRIER_DISPATCH_FAILED'
  | 'INTERNAL_SERVER_ERROR';

/** Cấu trúc chi tiết lỗi validation */
export interface ValidationErrorDetail {
  field: string;
  issue: string;
}

/** Phong bì phản hồi thành công */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  metadata?: {
    page?: number;
    limit?: number;
    totalCount?: number;
    processingTimeMs?: number;
    [key: string]: unknown;
  };
  timestamp: string; // ISO 8601 UTC
  traceId: string;   // UUIDv4
}

/** Phong bì phản hồi thất bại */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: ValidationErrorDetail[] | unknown;
  };
  timestamp: string;
  traceId: string;
}

/** Phong bì phản hồi chung của hệ thống */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Hàm trợ giúp sinh phản hồi thành công chuẩn */
export function createSuccessResponse<T>(
  data: T,
  metadata?: Record<string, unknown>,
  traceId?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data: sanitizeBigInt(data),
    metadata,
    timestamp: new Date().toISOString(),
    traceId: traceId || randomUUID(),
  };
}

/** Hàm trợ giúp sinh phản hồi thất bại chuẩn */
export function createErrorResponse(
  code: ErrorCode | string,
  message: string,
  details?: unknown,
  traceId?: string
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    traceId: traceId || randomUUID(),
  };
}

/**
 * Trợ giúp chuyển đổi các trường kiểu BigInt sang Number hoặc String
 * để tránh lỗi "TypeError: Do not know how to serialize a BigInt" trong Next.js JSON response
 */
export function sanitizeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'bigint') {
    // Nếu trong khoảng an toàn của JavaScript, đổi sang number
    if (obj <= BigInt(Number.MAX_SAFE_INTEGER) && obj >= BigInt(Number.MIN_SAFE_INTEGER)) {
      return Number(obj) as unknown as T;
    }
    return obj.toString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeBigInt(item)) as unknown as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeBigInt(value);
    }
    return sanitized as T;
  }

  return obj;
}
