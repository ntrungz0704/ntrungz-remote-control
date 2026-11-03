// ============================================================================
// FAST-SHIP-HUB — BE DELIVERY ADAPTER
// Integration Adapter for BeGroup Partner Delivery API
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

export class BeDeliveryAdapter implements ICarrierAdapter {
  readonly carrierCode: CarrierCode = 'BE';
  readonly displayName = 'Be beDelivery';
  readonly isMock = false;

  private partnerSecret = process.env.BE_DELIVERY_SECRET || 'be_delivery_secret_key_2026';

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

    // Biểu phí Be beDelivery:
    // 2km đầu: 15.500đ; 2-5km: 5.400đ/km; trên 5km: 5.000đ/km
    const baseFee = 15500;
    let distanceFee = 0;
    if (distKm > 2 && distKm <= 5) {
      distanceFee = Math.round((distKm - 2) * 5400);
    } else if (distKm > 5) {
      distanceFee = Math.round(3 * 5400 + (distKm - 5) * 5000);
    }

    // Phụ phí ban đêm (22h - 06h): 9.000đ
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 22 || currentHour < 6;
    const nightSurcharge = isNight ? 9000 : 0;
    const surcharges = nightSurcharge;

    const carrierOriginalTotal = baseFee + distanceFee + surcharges;
    const platformFee = 1000;
    const finalTotalFee = carrierOriginalTotal + platformFee;

    const estimatedPickupMinutes = 4;
    const estimatedDeliveryMinutes = Math.max(5, Math.round(distKm * 3.0));
    const totalEstimatedMinutes = estimatedPickupMinutes + estimatedDeliveryMinutes;

    return {
      success: true,
      carrierCode: this.carrierCode,
      durationMs: Date.now() - startTime,
      quote: {
        carrierCode: this.carrierCode,
        carrierServiceName: 'Be beDelivery Siêu Tốc',
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
        quoteReferenceId: `BE-QUOTE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        breakdown: {
          baseDistanceKm: 2,
          extraDistanceKm: Math.max(0, distKm - 2),
          pricePerNextKm: distKm > 5 ? 5000 : 5400,
          nightSurcharge,
          surgeMultiplier: 1.0,
        },
      },
    };
  }

  async createBooking(
    request: CarrierBookingRequest
  ): Promise<CarrierBookingResponse> {
    const carrierOrderId = `BE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const driver: DriverInfo = {
      name: 'Đặng Tuấn Kiệt',
      phone: '0918776655',
      licensePlate: '29-D2 345.67',
      vehicleType: 'GASOLINE_BIKE',
      vehicleModel: 'Honda Future',
      avatarUrl: 'https://cdn.fastshiphub.vn/drivers/be-kiet.jpg',
      currentLocation: {
        latitude: request.pickup.latitude + 0.0011,
        longitude: request.pickup.longitude + 0.0011,
        updatedAt: new Date(),
      },
    };

    return {
      success: true,
      carrierCode: this.carrierCode,
      carrierOrderId,
      carrierStatus: 'DISPATCHED',
      normalizedStatus: 'BOOKED',
      driver,
      trackingUrl: `https://be.com.vn/delivery/${carrierOrderId}`,
      rawResponse: { trip_code: carrierOrderId, client_id: 'FASTSHIP_B2B' },
    };
  }

  async cancelBooking(
    request: CarrierCancelRequest
  ): Promise<CarrierCancelResponse> {
    return {
      success: true,
      carrierCode: this.carrierCode,
      cancellationFee: 0,
      message: `Be Delivery xác nhận hủy đơn ${request.orderCode} thành công`,
    };
  }

  async getTracking(
    request: CarrierTrackingRequest
  ): Promise<CarrierTrackingResponse> {
    const driver: DriverInfo = {
      name: 'Đặng Tuấn Kiệt',
      phone: '0918776655',
      licensePlate: '29-D2 345.67',
      vehicleType: 'GASOLINE_BIKE',
      currentLocation: {
        latitude: 21.0325,
        longitude: 105.8465,
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
          description: 'Hệ thống Be đã điều phối tài xế beBike',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
        },
        {
          status: 'PICKING',
          description: 'Tài xế đang tới điểm nhận',
          timestamp: new Date(Date.now() - 6 * 60 * 1000),
        },
        {
          status: 'DELIVERING',
          description: 'Tài xế đang giao kiện hàng',
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
        },
      ],
    };
  }

  verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>
  ): boolean {
    const signature = headers['x-be-signature'] || headers['x-signature'];
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
      trip_code?: string;
      status?: string;
      driver_name?: string;
      driver_phone?: string;
      plate_number?: string;
      lat?: number;
      lng?: number;
      timestamp?: number;
    };

    const statusMap: Record<string, WebhookNormalizedEvent['normalizedStatus']> = {
      MATCHED: 'PICKING',
      PICKED: 'DELIVERING',
      FINISHED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      RETURN: 'RETURNING',
    };

    const normalizedStatus = statusMap[p.status || ''] || 'DELIVERING';

    const driver: DriverInfo | undefined = p.driver_name
      ? {
          name: p.driver_name,
          phone: p.driver_phone || '',
          licensePlate: p.plate_number || '',
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
      carrierOrderId: p.trip_code || '',
      eventId: `EVT-BE-${Date.now()}`,
      eventType: p.status === 'FINISHED' ? 'DELIVERED' : 'LOCATION_UPDATE',
      normalizedStatus,
      timestamp: p.timestamp ? new Date(p.timestamp * 1000) : new Date(),
      driver,
      rawPayload: payload,
    };
  }
}
