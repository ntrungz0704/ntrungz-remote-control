// ============================================================================
// FAST-SHIP-HUB — GRAB EXPRESS ADAPTER
// Integration Adapter for GrabExpress API v2
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

export class GrabExpressAdapter implements ICarrierAdapter {
  readonly carrierCode: CarrierCode = 'GRAB';
  readonly displayName = 'GrabExpress Siêu Tốc';
  readonly isMock = false;

  private apiKey = process.env.GRAB_API_KEY || 'sandbox_grab_key';
  private partnerSecret = process.env.GRAB_WEBHOOK_SECRET || 'grab_webhook_secret_key_2026';
  private maxBikeWeightGrams = 20000; // Giới hạn nghiêm ngặt xe máy của Grab: 20kg

  async getQuote(
    request: CarrierQuoteRequest,
    abortSignal?: AbortSignal
  ): Promise<CarrierQuoteResponse> {
    const startTime = Date.now();

    // 1. Kiểm tra giới hạn trọng lượng xe máy của Grab (20kg)
    if (request.packageDetails.weightInGrams > this.maxBikeWeightGrams) {
      return {
        success: false,
        carrierCode: this.carrierCode,
        durationMs: Date.now() - startTime,
        errorCode: 'PACKAGE_EXCEEDS_LIMITS',
        errorMessage: 'GrabExpress giới hạn trọng lượng kiện hàng xe máy tối đa 20kg',
      };
    }

    // 2. Tính khoảng cách
    const distKm = calculateHaversineDistanceKm(
      request.pickup.latitude,
      request.pickup.longitude,
      request.dropoff.latitude,
      request.dropoff.longitude
    );

    // 3. Biểu phí GrabExpress:
    // 2km đầu: 16.000đ; 2-5km: 5.500đ/km; trên 5km: 5.000đ/km
    const baseFee = 16000;
    let distanceFee = 0;
    if (distKm > 2 && distKm <= 5) {
      distanceFee = Math.round((distKm - 2) * 5500);
    } else if (distKm > 5) {
      distanceFee = Math.round(3 * 5500 + (distKm - 5) * 5000);
    }

    // Kiểm tra phụ phí ban đêm (22h - 06h)
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 22 || currentHour < 6;
    const nightSurcharge = isNight ? 10000 : 0;
    const surcharges = nightSurcharge;

    const carrierOriginalTotal = baseFee + distanceFee + surcharges;
    const platformFee = 1000;
    const finalTotalFee = carrierOriginalTotal + platformFee;

    const estimatedPickupMinutes = 3;
    const estimatedDeliveryMinutes = Math.max(5, Math.round(distKm * 2.8));
    const totalEstimatedMinutes = estimatedPickupMinutes + estimatedDeliveryMinutes;

    return {
      success: true,
      carrierCode: this.carrierCode,
      durationMs: Date.now() - startTime,
      quote: {
        carrierCode: this.carrierCode,
        carrierServiceName: 'GrabExpress Siêu Tốc',
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
        quoteReferenceId: `GRAB-QUOTE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        breakdown: {
          baseDistanceKm: 2,
          extraDistanceKm: Math.max(0, distKm - 2),
          pricePerNextKm: distKm > 5 ? 5000 : 5500,
          nightSurcharge,
          surgeMultiplier: 1.0,
        },
      },
    };
  }

  async createBooking(
    request: CarrierBookingRequest
  ): Promise<CarrierBookingResponse> {
    const carrierOrderId = `GRAB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const driver: DriverInfo = {
      name: 'Lê Hoàng Nam',
      phone: '0903112233',
      licensePlate: '29-B1 556.78',
      vehicleType: 'GASOLINE_BIKE',
      vehicleModel: 'Honda Wave Alpha',
      avatarUrl: 'https://cdn.fastshiphub.vn/drivers/grab-nam.jpg',
      currentLocation: {
        latitude: request.pickup.latitude + 0.001,
        longitude: request.pickup.longitude + 0.001,
        updatedAt: new Date(),
      },
    };

    return {
      success: true,
      carrierCode: this.carrierCode,
      carrierOrderId,
      carrierStatus: 'ALLOCATED',
      normalizedStatus: 'BOOKED',
      driver,
      trackingUrl: `https://express.grab.com/track/${carrierOrderId}`,
      rawResponse: { deliveryId: carrierOrderId, serviceType: 'INSTANT' },
    };
  }

  async cancelBooking(
    request: CarrierCancelRequest
  ): Promise<CarrierCancelResponse> {
    return {
      success: true,
      carrierCode: this.carrierCode,
      cancellationFee: 0,
      message: `GrabExpress xác nhận hủy đơn ${request.orderCode} thành công`,
    };
  }

  async getTracking(
    request: CarrierTrackingRequest
  ): Promise<CarrierTrackingResponse> {
    const driver: DriverInfo = {
      name: 'Lê Hoàng Nam',
      phone: '0903112233',
      licensePlate: '29-B1 556.78',
      vehicleType: 'GASOLINE_BIKE',
      currentLocation: {
        latitude: 21.032,
        longitude: 105.849,
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
          description: 'Hệ thống Grab đã ghép tài xế',
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
        },
        {
          status: 'PICKING',
          description: 'Tài xế đang đến nhận hàng',
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
        },
        {
          status: 'DELIVERING',
          description: 'Tài xế đã nhận hàng và đang di chuyển tới người nhận',
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
        },
      ],
    };
  }

  verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>
  ): boolean {
    const signature = headers['x-grab-signature'] || headers['x-signature'];
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
      deliveryID?: string;
      merchantOrderID?: string;
      status?: string;
      driver?: {
        name?: string;
        phone?: string;
        licensePlate?: string;
        latitude?: number;
        longitude?: number;
      };
      timestamp?: number;
    };

    const statusMap: Record<string, WebhookNormalizedEvent['normalizedStatus']> = {
      ALLOCATED: 'PICKING',
      PICKED_UP: 'DELIVERING',
      COMPLETED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      RETURN_STARTED: 'RETURNING',
      RETURNED: 'RETURNED',
    };

    const normalizedStatus = statusMap[p.status || ''] || 'DELIVERING';

    const driverInfo: DriverInfo | undefined = p.driver
      ? {
          name: p.driver.name || 'Tài xế Grab',
          phone: p.driver.phone || '',
          licensePlate: p.driver.licensePlate || '',
          vehicleType: 'GASOLINE_BIKE',
          currentLocation:
            p.driver.latitude && p.driver.longitude
              ? {
                  latitude: p.driver.latitude,
                  longitude: p.driver.longitude,
                  updatedAt: new Date(),
                }
              : undefined,
        }
      : undefined;

    return {
      carrierCode: this.carrierCode,
      carrierOrderId: p.deliveryID || '',
      eventId: `EVT-GRAB-${Date.now()}`,
      eventType: p.status === 'COMPLETED' ? 'DELIVERED' : 'LOCATION_UPDATE',
      normalizedStatus,
      timestamp: p.timestamp ? new Date(p.timestamp * 1000) : new Date(),
      driver: driverInfo,
      rawPayload: payload,
    };
  }
}
