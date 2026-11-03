// ============================================================================
// FAST-SHIP-HUB — MOCK SANDBOX CARRIER ADAPTER
// First-Class Citizen Simulation Adapter for Dev, CI/CD & E2E Testing
// ============================================================================

import type { ICarrierAdapter } from './carrier-adapter.interface';
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
  DriverInfo,
} from '@/types/carrier.types';
import { calculateHaversineDistanceKm } from '@/lib/geo';
import crypto from 'node:crypto';

export class MockSandboxCarrierAdapter implements ICarrierAdapter {
  readonly carrierCode: CarrierCode = 'SANDBOX_MOCK';
  readonly displayName = 'FAST-SHIP Sandbox Express (Mô phỏng)';
  readonly isMock = true;

  /** Cờ kiểm soát hành vi mô phỏng (dành cho QA kịch bản lỗi) */
  public simulateDelayMs = 250;
  public shouldFailTimeout = false;
  public shouldFailNoDriver = false;

  private webhookSecret = process.env.SANDBOX_WEBHOOK_SECRET || 'fastship-sandbox-secret-2026';

  /**
   * Tính cước mô phỏng theo biểu phí chuẩn Sandbox:
   * - 2km đầu: 14.500 VNĐ
   * - Sau 2km: 5.000 VNĐ / km
   * - Phí sàn: 1.000 VNĐ
   */
  async getQuote(
    request: CarrierQuoteRequest,
    abortSignal?: AbortSignal
  ): Promise<CarrierQuoteResponse> {
    const startTime = Date.now();

    // Mô phỏng độ trễ hoặc lỗi Timeout nếu được cấu hình
    const delay = this.shouldFailTimeout ? 2500 : this.simulateDelayMs;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('CARRIER_TIMEOUT: Sandbox timeout'));
        });
      }
    });

    const distKm = calculateHaversineDistanceKm(
      request.pickup.latitude,
      request.pickup.longitude,
      request.dropoff.latitude,
      request.dropoff.longitude
    );

    // Tính cước lũy tiến
    const baseFee = 14500;
    const extraKm = Math.max(0, distKm - 2);
    const distanceFee = Math.round(extraKm * 5000);
    const surcharges = 0;
    const platformFee = 1000;
    const carrierOriginalTotal = baseFee + distanceFee;
    const finalTotalFee = carrierOriginalTotal + platformFee;

    const estimatedPickupMinutes = 5;
    const estimatedDeliveryMinutes = Math.max(5, Math.round(distKm * 3.2));
    const totalEstimatedMinutes = estimatedPickupMinutes + estimatedDeliveryMinutes;

    return {
      success: true,
      carrierCode: this.carrierCode,
      durationMs: Date.now() - startTime,
      quote: {
        carrierCode: this.carrierCode,
        carrierServiceName: 'FAST-SHIP Sandbox Siêu Tốc (Mô phỏng)',
        serviceTier: request.serviceTier,
        baseFee,
        surcharges,
        discountAmount: 0,
        carrierOriginalTotal,
        platformFee,
        finalTotalFee,
        estimatedPickupMinutes,
        estimatedDeliveryMinutes,
        totalEstimatedMinutes,
        currency: 'VND',
        expiredAt: new Date(Date.now() + 300 * 1000), // 300 giây (5 phút)
        quoteReferenceId: `MOCK-QUOTE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        breakdown: {
          baseDistanceKm: 2,
          extraDistanceKm: extraKm,
          pricePerNextKm: 5000,
          nightSurcharge: 0,
          surgeMultiplier: 1.0,
        },
      },
    };
  }

  /**
   * Tạo đơn hàng mô phỏng và giả lập ghép tài xế ngay lập tức
   */
  async createBooking(
    request: CarrierBookingRequest
  ): Promise<CarrierBookingResponse> {
    if (this.shouldFailNoDriver) {
      return {
        success: false,
        carrierCode: this.carrierCode,
        carrierOrderId: '',
        carrierStatus: 'NO_DRIVER_AVAILABLE',
        normalizedStatus: 'FAILED_DISPATCH',
        errorMessage: 'Sandbox mô phỏng: Không có tài xế trong khu vực',
        errorCode: 'CARRIER_DISPATCH_FAILED',
      };
    }

    const carrierOrderId = `MOCK-ORD-${Date.now()}`;
    const driver: DriverInfo = {
      name: 'Nguyễn Văn Test',
      phone: '0988776655',
      licensePlate: '29-M1 999.88',
      vehicleType: 'ELECTRIC_BIKE',
      vehicleModel: 'VinFast Feliz S Sandbox',
      avatarUrl: 'https://cdn.fastshiphub.vn/drivers/mock-driver.jpg',
      currentLocation: {
        latitude: request.pickup.latitude + 0.0015,
        longitude: request.pickup.longitude + 0.0015,
        updatedAt: new Date(),
      },
    };

    return {
      success: true,
      carrierCode: this.carrierCode,
      carrierOrderId,
      carrierStatus: 'DRIVER_ALLOCATED',
      normalizedStatus: 'BOOKED',
      driver,
      trackingUrl: `/track/sandbox/${carrierOrderId}`,
      rawResponse: { simulated: true, allocatedAt: new Date().toISOString() },
    };
  }

  /**
   * Hủy đơn hàng mô phỏng
   */
  async cancelBooking(
    request: CarrierCancelRequest
  ): Promise<CarrierCancelResponse> {
    return {
      success: true,
      carrierCode: this.carrierCode,
      cancellationFee: 0,
      message: `Hủy đơn mô phỏng ${request.orderCode} thành công. Lý do: ${request.reason}`,
    };
  }

  /**
   * Tra cứu lộ trình tracking mô phỏng
   */
  async getTracking(
    request: CarrierTrackingRequest
  ): Promise<CarrierTrackingResponse> {
    const driver: DriverInfo = {
      name: 'Nguyễn Văn Test',
      phone: '0988776655',
      licensePlate: '29-M1 999.88',
      vehicleType: 'ELECTRIC_BIKE',
      vehicleModel: 'VinFast Feliz S Sandbox',
      avatarUrl: 'https://cdn.fastshiphub.vn/drivers/mock-driver.jpg',
      currentLocation: {
        latitude: 21.0315,
        longitude: 105.8485,
        updatedAt: new Date(),
      },
    };

    return {
      carrierCode: this.carrierCode,
      carrierOrderId: request.carrierOrderId,
      normalizedStatus: 'DELIVERING',
      driver,
      timeline: [
        {
          status: 'BOOKED',
          description: 'Đơn hàng mô phỏng đã tiếp nhận thành công',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          status: 'PICKING',
          description: 'Tài xế Nguyễn Văn Test đang đến điểm lấy hàng',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
        },
        {
          status: 'DELIVERING',
          description: 'Tài xế đã lấy hàng và đang trên đường giao',
          timestamp: new Date(Date.now() - 3 * 60 * 1000),
        },
      ],
    };
  }

  /**
   * Thẩm định chữ ký số Webhook mô phỏng
   */
  verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>
  ): boolean {
    const signature = headers['x-sandbox-signature'] || headers['x-signature'];
    if (!signature) {
      // Trong môi trường development / local test, cho phép chữ ký đặc biệt 'mock-valid-signature'
      return headers['x-mock-test'] === 'true';
    }

    const computed = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    return signature === computed;
  }

  /**
   * Chuẩn hóa payload Webhook mô phỏng
   */
  parseWebhookPayload(payload: unknown): WebhookNormalizedEvent {
    const p = payload as {
      eventId?: string;
      carrierOrderId?: string;
      orderCode?: string;
      eventType?: string;
      status?: string;
      driver?: DriverInfo;
      reason?: string;
    };

    const statusMap: Record<string, WebhookNormalizedEvent['normalizedStatus']> = {
      DRIVER_ARRIVING: 'PICKING',
      PICKED_UP: 'DELIVERING',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      RETURNING: 'RETURNING',
      RETURNED: 'RETURNED',
    };

    const normalizedStatus = statusMap[p.status || ''] || 'DELIVERING';

    return {
      carrierCode: this.carrierCode,
      carrierOrderId: p.carrierOrderId || `MOCK-${Date.now()}`,
      eventId: p.eventId || `EVT-MOCK-${Date.now()}`,
      eventType: (p.eventType as WebhookNormalizedEvent['eventType']) || 'LOCATION_UPDATE',
      normalizedStatus,
      timestamp: new Date(),
      driver: p.driver,
      cancellationReason: p.reason,
      rawPayload: payload,
    };
  }
}
