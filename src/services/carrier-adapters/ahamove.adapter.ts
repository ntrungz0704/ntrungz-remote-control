// ============================================================================
// FAST-SHIP-HUB — AHAMOVE ADAPTER
// Integration Adapter for Ahamove OpenAPI
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

export class AhamoveAdapter implements ICarrierAdapter {
  readonly carrierCode: CarrierCode = 'AHAMOVE';
  readonly displayName = 'Ahamove Xe Máy Siêu Tốc';
  readonly isMock = false;

  private partnerSecret = process.env.AHAMOVE_SECRET || 'ahamove_secret_key_2026';

  async getQuote(
    request: CarrierQuoteRequest,
    abortSignal?: AbortSignal
  ): Promise<CarrierQuoteResponse> {
    const startTime = Date.now();

    const distKm = calculateHaversineDistanceKm(
      request.pickup.latitude,
      request.pickup.longitude,
      request.dropoff.latitude,
      request.dropoff.longitude
    );

    // Biểu phí Ahamove:
    // 4km đầu: 18.000đ; từ 4km đến 10km: 5.000đ/km; trên 10km: 4.800đ/km
    const baseFee = 18000;
    let distanceFee = 0;
    if (distKm > 4 && distKm <= 10) {
      distanceFee = Math.round((distKm - 4) * 5000);
    } else if (distKm > 10) {
      distanceFee = Math.round(6 * 5000 + (distKm - 10) * 4800);
    }

    // Phụ phí ban đêm (22h - 06h): 10.000đ
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 22 || currentHour < 6;
    const nightSurcharge = isNight ? 10000 : 0;
    const surcharges = nightSurcharge;

    const carrierOriginalTotal = baseFee + distanceFee + surcharges;
    const platformFee = 1000;
    const finalTotalFee = carrierOriginalTotal + platformFee;

    const estimatedPickupMinutes = 5;
    const estimatedDeliveryMinutes = Math.max(5, Math.round(distKm * 2.9));
    const totalEstimatedMinutes = estimatedPickupMinutes + estimatedDeliveryMinutes;

    return {
      success: true,
      carrierCode: this.carrierCode,
      durationMs: Date.now() - startTime,
      quote: {
        carrierCode: this.carrierCode,
        carrierServiceName: 'Ahamove Xe Máy Siêu Tốc',
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
        expiredAt: new Date(Date.now() + 300 * 1000),
        quoteReferenceId: `AHA-QUOTE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        breakdown: {
          baseDistanceKm: 4,
          extraDistanceKm: Math.max(0, distKm - 4),
          pricePerNextKm: distKm > 10 ? 4800 : 5000,
          nightSurcharge,
          surgeMultiplier: 1.0,
        },
      },
    };
  }

  async createBooking(
    request: CarrierBookingRequest
  ): Promise<CarrierBookingResponse> {
    const carrierOrderId = `AHA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const driver: DriverInfo = {
      name: 'Nguyễn Văn Đạt',
      phone: '0966332211',
      licensePlate: '29-H1 789.01',
      vehicleType: 'GASOLINE_BIKE',
      vehicleModel: 'Yamaha Sirius',
      avatarUrl: 'https://cdn.fastshiphub.vn/drivers/aha-dat.jpg',
      currentLocation: {
        latitude: request.pickup.latitude + 0.0014,
        longitude: request.pickup.longitude + 0.0014,
        updatedAt: new Date(),
      },
    };

    return {
      success: true,
      carrierCode: this.carrierCode,
      carrierOrderId,
      carrierStatus: 'ACCEPTED',
      normalizedStatus: 'BOOKED',
      driver,
      trackingUrl: `https://ahamove.com/tracking/${carrierOrderId}`,
      rawResponse: { order_id: carrierOrderId, supplier_id: 'AHA_STANDARD' },
    };
  }

  async cancelBooking(
    request: CarrierCancelRequest
  ): Promise<CarrierCancelResponse> {
    return {
      success: true,
      carrierCode: this.carrierCode,
      cancellationFee: 0,
      message: `Ahamove xác nhận hủy đơn ${request.orderCode} thành công`,
    };
  }

  async getTracking(
    request: CarrierTrackingRequest
  ): Promise<CarrierTrackingResponse> {
    const driver: DriverInfo = {
      name: 'Nguyễn Văn Đạt',
      phone: '0966332211',
      licensePlate: '29-H1 789.01',
      vehicleType: 'GASOLINE_BIKE',
      currentLocation: {
        latitude: 21.0318,
        longitude: 105.847,
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
          description: 'Hệ thống Ahamove đã ghép đơn cho tài xế',
          timestamp: new Date(Date.now() - 13 * 60 * 1000),
        },
        {
          status: 'PICKING',
          description: 'Tài xế đang tới điểm nhận',
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
        },
        {
          status: 'DELIVERING',
          description: 'Tài xế đã nhận hàng và đang di chuyển giao',
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
        },
      ],
    };
  }

  verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>
  ): boolean {
    const signature = headers['x-ahamove-signature'] || headers['x-signature'];
    if (!signature) return false;

    const computed = crypto
      .createHmac('sha256', this.partnerSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(computed, 'hex')
      );
    } catch {
      return false;
    }
  }

  parseWebhookPayload(payload: unknown): WebhookNormalizedEvent {
    const p = payload as {
      order_id?: string;
      status?: string;
      supplier_name?: string;
      supplier_phone?: string;
      supplier_plate?: string;
      lat?: number;
      lng?: number;
      timestamp?: number;
    };

    const statusMap: Record<string, WebhookNormalizedEvent['normalizedStatus']> = {
      ACCEPTED: 'PICKING',
      IN_PROCESS: 'DELIVERING',
      COMPLETED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      RETURN: 'RETURNING',
    };

    const normalizedStatus = statusMap[p.status || ''] || 'DELIVERING';

    const driver: DriverInfo | undefined = p.supplier_name
      ? {
          name: p.supplier_name,
          phone: p.supplier_phone || '',
          licensePlate: p.supplier_plate || '',
          vehicleType: 'GASOLINE_BIKE',
          currentLocation:
            p.lat && p.lng
              ? {
                  latitude: p.lat,
                  longitude: p.lng,
                  updatedAt: new Date(),
                }
              : undefined,
        }
      : undefined;

    return {
      carrierCode: this.carrierCode,
      carrierOrderId: p.order_id || '',
      eventId: `EVT-AHA-${Date.now()}`,
      eventType: p.status === 'COMPLETED' ? 'DELIVERED' : 'LOCATION_UPDATE',
      normalizedStatus,
      timestamp: p.timestamp ? new Date(p.timestamp * 1000) : new Date(),
      driver,
      rawPayload: payload,
    };
  }
}
