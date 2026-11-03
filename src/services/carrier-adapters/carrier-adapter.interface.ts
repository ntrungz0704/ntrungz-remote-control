// ============================================================================
// FAST-SHIP-HUB — CARRIER ADAPTER INTERFACE (PORTS & ADAPTERS)
// The Core First-Class Contract for All Integrated Delivery Carriers
// ============================================================================

import type {
  CarrierCode,
  CarrierQuoteRequest,
  CarrierQuoteResponse,
  CarrierBookingRequest,
  CarrierBookingResponse,
  CarrierCancelRequest,
  CarrierCancelResponse,
  CarrierTrackingRequest,
  CarrierTrackingResponse,
  WebhookNormalizedEvent,
} from '@/types/carrier.types';

/**
 * INTERFACE HẠNG NHẤT CỦA CÁC CARRIER ADAPTER
 * Mọi hãng vận chuyển (kể cả Mock Sandbox) đều bắt buộc triển khai đầy đủ 100%
 */
export interface ICarrierAdapter {
  /** Mã định danh duy nhất của hãng */
  readonly carrierCode: CarrierCode;

  /** Tên hiển thị đầy đủ của hãng */
  readonly displayName: string;

  /** Cờ cho biết đây có phải adapter mô phỏng thử nghiệm hay không */
  readonly isMock: boolean;

  /**
   * Yêu cầu báo giá cước thời gian thực
   * Bắt buộc hoàn tất trước thời hạn timeout 1.800ms
   */
  getQuote(
    request: CarrierQuoteRequest,
    abortSignal?: AbortSignal
  ): Promise<CarrierQuoteResponse>;

  /**
   * Tạo đơn hàng và yêu cầu tìm tài xế điều phối
   */
  createBooking(
    request: CarrierBookingRequest
  ): Promise<CarrierBookingResponse>;

  /**
   * Hủy đơn hàng đã đặt
   */
  cancelBooking(
    request: CarrierCancelRequest
  ): Promise<CarrierCancelResponse>;

  /**
   * Lấy thông tin tracking trực tiếp từ hãng
   */
  getTracking(
    request: CarrierTrackingRequest
  ): Promise<CarrierTrackingResponse>;

  /**
   * Thẩm định chữ ký số Webhook để chống giả mạo
   */
  verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>
  ): boolean;

  /**
   * Chuẩn hóa payload webhook của hãng về định dạng chuẩn hệ thống
   */
  parseWebhookPayload(
    payload: unknown
  ): WebhookNormalizedEvent;
}
