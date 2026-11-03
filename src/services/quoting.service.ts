// ============================================================================
// FAST-SHIP-HUB — PARALLEL QUOTING ENGINE SERVICE
// High-Speed Multi-Carrier Quotation Aggregator with Circuit Breaker & Badges
// ============================================================================

import type {
  CarrierQuoteRequest,
  CarrierQuoteItem,
  CarrierCode,
  AggregatedQuoteResult,
  FailedCarrierQuote,
  QuoteSummary,
} from '@/types/carrier.types';
import { carrierAdapterRegistry } from './carrier-adapters/adapter-registry';
import { circuitBreakerRegistry } from '@/lib/circuit-breaker';
import { calculateRouteInfo } from '@/lib/geo';

export class ParallelQuotingEngineService {
  private readonly adapterTimeoutMs = 1800; // Timeout cứng 1.800ms cho mỗi Adapter
  private readonly quoteTtlSeconds = 300;   // Thời hạn giữ giá 300 giây (5 phút)

  /**
   * Gọi song song toàn bộ 6 Adapter và tổng hợp kết quả
   */
  async getAggregatedQuotes(
    request: CarrierQuoteRequest
  ): Promise<AggregatedQuoteResult> {
    const route = calculateRouteInfo(
      request.pickup.latitude,
      request.pickup.longitude,
      request.dropoff.latitude,
      request.dropoff.longitude
    );

    const adapters = carrierAdapterRegistry.getAllAdapters();
    const successfulQuotes: CarrierQuoteItem[] = [];
    const failedCarriers: FailedCarrierQuote[] = [];

    // Bắn request đồng thời tới tất cả các hãng qua Promise.allSettled()
    const quotePromises = adapters.map(async (adapter) => {
      const breaker = circuitBreakerRegistry.getBreaker(adapter.carrierCode);

      // 1. Kiểm tra Circuit Breaker trước khi gọi
      if (!breaker.canExecute()) {
        failedCarriers.push({
          carrierCode: adapter.carrierCode,
          errorCode: 'CARRIER_CIRCUIT_OPEN',
          errorMessage: `Cổng kết nối tới ${adapter.displayName} đang tạm ngắt để bảo vệ hệ thống`,
          durationMs: 0,
        });
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.adapterTimeoutMs);

      const callStart = Date.now();

      try {
        const response = await adapter.getQuote(request, controller.signal);
        clearTimeout(timeoutId);

        if (response.success && response.quote) {
          breaker.recordSuccess();
          successfulQuotes.push(response.quote);
        } else {
          breaker.recordFailure();
          failedCarriers.push({
            carrierCode: adapter.carrierCode,
            errorCode: response.errorCode || 'CARRIER_ERROR',
            errorMessage: response.errorMessage || 'Không thể lấy báo giá từ đối tác',
            durationMs: Date.now() - callStart,
          });
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        breaker.recordFailure();

        const durationMs = Date.now() - callStart;
        const err = error as Error;

        if (err.name === 'AbortError' || durationMs >= this.adapterTimeoutMs) {
          failedCarriers.push({
            carrierCode: adapter.carrierCode,
            errorCode: 'CARRIER_TIMEOUT',
            errorMessage: `Đối tác ${adapter.displayName} phản hồi quá thời gian cho phép (1.8s)`,
            durationMs,
          });
        } else {
          failedCarriers.push({
            carrierCode: adapter.carrierCode,
            errorCode: 'CARRIER_UNAVAILABLE',
            errorMessage: err.message || 'Lỗi không xác định khi kết nối tới hãng',
            durationMs,
          });
        }
      }
    });

    await Promise.allSettled(quotePromises);

    // 2. Thuật toán phân loại & Gán 4 Smart Badges
    this.assignSmartBadges(successfulQuotes);

    // 3. Xây dựng tóm tắt kết quả
    const summary = this.buildSummary(
      adapters.length,
      successfulQuotes,
      failedCarriers.length
    );

    return {
      origin: request.pickup,
      destination: request.dropoff,
      route: {
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        polyline: route.polyline,
      },
      quotes: successfulQuotes,
      failedCarriers,
      summary,
    };
  }

  /**
   * Thuật toán gán 4 Smart Badges tự động:
   * 1. CHEAPEST: Giá finalTotalFee thấp nhất (+ tính số tiền tiết kiệm)
   * 2. FASTEST: Tổng thời gian dự kiến (Pickup + Delivery) ngắn nhất
   * 3. GREENEST: Dành riêng cho Xanh SM (100% xe điện)
   * 4. BEST_VALUE: Điểm cân bằng tối ưu giữa giá và thời gian
   */
  private assignSmartBadges(quotes: CarrierQuoteItem[]): void {
    if (quotes.length === 0) return;

    // Reset badge
    quotes.forEach((q) => {
      if (q.carrierCode !== 'XANH_SM') {
        q.badge = null;
      }
    });

    // 1. Tìm CHEAPEST
    let minFee = Infinity;
    let maxFee = -Infinity;
    let cheapestQuote: CarrierQuoteItem | null = null;

    for (const q of quotes) {
      if (q.finalTotalFee < minFee) {
        minFee = q.finalTotalFee;
        cheapestQuote = q;
      }
      if (q.finalTotalFee > maxFee) {
        maxFee = q.finalTotalFee;
      }
    }

    if (cheapestQuote) {
      cheapestQuote.badge = 'CHEAPEST';
      cheapestQuote.savingsVnd = Math.max(0, maxFee - minFee);
    }

    // 2. Tìm FASTEST
    let minMinutes = Infinity;
    let fastestQuote: CarrierQuoteItem | null = null;

    for (const q of quotes) {
      if (q.totalEstimatedMinutes < minMinutes) {
        minMinutes = q.totalEstimatedMinutes;
        fastestQuote = q;
      }
    }

    if (fastestQuote && fastestQuote !== cheapestQuote) {
      fastestQuote.badge = 'FASTEST';
    }

    // 3. GREENEST cho Xanh SM
    const xanhQuote = quotes.find((q) => q.carrierCode === 'XANH_SM');
    if (xanhQuote) {
      // Nếu Xanh SM không phải Cheapest hay Fastest thì giữ GREENEST
      if (!xanhQuote.badge) {
        xanhQuote.badge = 'GREENEST';
      }
    }

    // 4. Tìm BEST_VALUE (Điểm tối ưu S = 0.6 * Giá_chuẩn_hóa + 0.4 * Thời_gian_chuẩn_hóa)
    if (quotes.length >= 3) {
      let minScore = Infinity;
      let bestValueQuote: CarrierQuoteItem | null = null;

      const feeRange = Math.max(1, maxFee - minFee);
      let maxMinutes = -Infinity;
      quotes.forEach((q) => {
        if (q.totalEstimatedMinutes > maxMinutes) maxMinutes = q.totalEstimatedMinutes;
      });
      const timeRange = Math.max(1, maxMinutes - minMinutes);

      for (const q of quotes) {
        if (q.badge) continue; // Đã có badge khác

        const priceNorm = (q.finalTotalFee - minFee) / feeRange;
        const timeNorm = (q.totalEstimatedMinutes - minMinutes) / timeRange;
        const score = 0.6 * priceNorm + 0.4 * timeNorm;

        if (score < minScore) {
          minScore = score;
          bestValueQuote = q;
        }
      }

      if (bestValueQuote) {
        bestValueQuote.badge = 'BEST_VALUE';
      }
    }
  }

  private buildSummary(
    totalQueried: number,
    successfulQuotes: CarrierQuoteItem[],
    failedCount: number
  ): QuoteSummary {
    const expiresAt = new Date(Date.now() + this.quoteTtlSeconds * 1000);

    const cheapest = successfulQuotes.find((q) => q.badge === 'CHEAPEST')?.carrierCode;
    const fastest = successfulQuotes.find((q) => q.badge === 'FASTEST')?.carrierCode;
    const recommended =
      successfulQuotes.find((q) => q.badge === 'BEST_VALUE')?.carrierCode ||
      cheapest ||
      successfulQuotes[0]?.carrierCode;

    return {
      totalCarriersQueried: totalQueried,
      successfulQuotes: successfulQuotes.length,
      failedCount,
      cheapestCarrier: cheapest,
      fastestCarrier: fastest,
      recommendedCarrier: recommended,
      ttlSeconds: this.quoteTtlSeconds,
      expiresAt,
    };
  }
}

export const parallelQuotingEngineService = new ParallelQuotingEngineService();
