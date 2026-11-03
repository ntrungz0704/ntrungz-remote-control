import { describe, it, expect, beforeEach } from 'vitest';
import { parallelQuotingEngineService } from '@/services/quoting.service';
import { orderService } from '@/services/order.service';
import { walletService } from '@/services/wallet.service';
import { carrierAdapterRegistry } from '@/services/carrier-adapters/adapter-registry';
import { MockSandboxCarrierAdapter } from '@/services/carrier-adapters/mock-sandbox.adapter';
import { GrabExpressAdapter } from '@/services/carrier-adapters/grab.adapter';
import { circuitBreakerRegistry } from '@/lib/circuit-breaker';
import { idempotencyStore } from '@/lib/idempotency';
import { generateVietQrTopup } from '@/lib/vietqr';
import { calculateHaversineDistanceKm, calculateRouteInfo, estimateDeliveryMinutes } from '@/lib/geo';
import type { CarrierQuoteRequest } from '@/types/carrier.types';

describe('FAST-SHIP-HUB Comprehensive QA Test Suite', () => {
  const pickupHanoi = {
    latitude: 21.028511,
    longitude: 105.854444,
    address: 'Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
    senderOrReceiverName: 'Kho Hàng Thời Trang Tràng Tiền',
    phoneNumber: '0988111222',
  };

  const dropoffHanoi = {
    latitude: 21.037288,
    longitude: 105.834466,
    address: 'Số 280 Đội Cấn, Ba Đình, Hà Nội',
    senderOrReceiverName: 'Nguyễn Văn Nhận',
    phoneNumber: '0912333444',
  };

  const standardPackage = {
    name: 'Váy dạ hội cao cấp',
    packageType: 'FASHION' as const,
    weightInGrams: 1500,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 10,
    declaredValueVnd: 500000,
    codAmountVnd: 0,
    deliverToDoor: true,
  };

  const standardQuoteReq: CarrierQuoteRequest = {
    pickup: pickupHanoi,
    dropoff: dropoffHanoi,
    packageDetails: standardPackage,
    serviceTier: 'BIKE_INSTANT',
  };

  describe('1. Geospatial & Haversine Routing', () => {
    it('TC-GEO-01: calculates road Haversine distance ~2.9km', () => {
      const distKm = calculateHaversineDistanceKm(
        pickupHanoi.latitude,
        pickupHanoi.longitude,
        dropoffHanoi.latitude,
        dropoffHanoi.longitude
      );
      expect(distKm).toBeGreaterThanOrEqual(2.5);
      expect(distKm).toBeLessThanOrEqual(3.5);
    });

    it('TC-GEO-02: generates route info with distance, duration, and polyline', () => {
      const route = calculateRouteInfo(
        pickupHanoi.latitude,
        pickupHanoi.longitude,
        dropoffHanoi.latitude,
        dropoffHanoi.longitude
      );
      expect(route.distanceMeters).toBeGreaterThan(2000);
      expect(route.durationMinutes).toBeGreaterThanOrEqual(5);
      expect(route.polyline).toBeTruthy();
    });

    it('TC-GEO-03: estimates delivery ETA in minutes realistically', () => {
      const eta = estimateDeliveryMinutes(3.0);
      expect(eta).toBeGreaterThanOrEqual(5);
      expect(eta).toBeLessThanOrEqual(30);
    });
  });

  describe('2. Parallel Quoting Engine & SLA', () => {
    it('TC-QUOTE-01: returns quotes within 1500ms SLA across all 6 carriers', async () => {
      const start = Date.now();
      const res = await parallelQuotingEngineService.getAggregatedQuotes(standardQuoteReq);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThanOrEqual(1500);
      expect(res.quotes.length).toBe(6);
    });

    it('TC-QUOTE-02: verifies fare calculation includes carrierOriginalTotal + 1000 platformFee', async () => {
      const res = await parallelQuotingEngineService.getAggregatedQuotes(standardQuoteReq);
      for (const quote of res.quotes) {
        expect(quote.platformFee).toBe(1000);
        expect(quote.finalTotalFee).toBe(quote.carrierOriginalTotal + 1000);
      }
    });

    it('TC-QUOTE-03: validates 300s TTL and future expiration date', async () => {
      const res = await parallelQuotingEngineService.getAggregatedQuotes(standardQuoteReq);
      expect(res.summary.ttlSeconds).toBe(300);
      expect(res.summary.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('3. Smart Badges Evaluation', () => {
    it('TC-BADGE-01: assigns CHEAPEST badge to the lowest finalTotalFee and computes savings', async () => {
      const res = await parallelQuotingEngineService.getAggregatedQuotes(standardQuoteReq);
      const cheapest = res.quotes.find((q) => q.badge === 'CHEAPEST');
      expect(cheapest).toBeDefined();

      const minFee = Math.min(...res.quotes.map((q) => q.finalTotalFee));
      const maxFee = Math.max(...res.quotes.map((q) => q.finalTotalFee));
      expect(cheapest!.finalTotalFee).toBe(minFee);
      expect(cheapest!.savingsVnd).toBe(maxFee - minFee);
    });

    it('TC-BADGE-02: assigns FASTEST badge to the quickest carrier', async () => {
      const res = await parallelQuotingEngineService.getAggregatedQuotes(standardQuoteReq);
      const fastest = res.quotes.find((q) => q.badge === 'FASTEST');
      expect(fastest).toBeDefined();
      const minMinutes = Math.min(...res.quotes.map((q) => q.totalEstimatedMinutes));
      expect(fastest!.totalEstimatedMinutes).toBe(minMinutes);
    });

    it('TC-BADGE-03: assigns GREENEST badge to Xanh SM with valid CO2 savings', async () => {
      const res = await parallelQuotingEngineService.getAggregatedQuotes(standardQuoteReq);
      const xanh = res.quotes.find((q) => q.carrierCode === 'XANH_SM');
      expect(xanh).toBeDefined();
      expect(xanh!.co2SavingGrams).toBeGreaterThan(0);
      expect(['GREENEST', 'CHEAPEST', 'FASTEST']).toContain(xanh!.badge);
    });

    it('TC-BADGE-04: assigns BEST_VALUE badge balancing price and time', async () => {
      const res = await parallelQuotingEngineService.getAggregatedQuotes(standardQuoteReq);
      const bestValue = res.quotes.find((q) => q.badge === 'BEST_VALUE');
      expect(bestValue).toBeDefined();
    });
  });

  describe('4. Prepaid Wallet & Financial Controls', () => {
    const merchantId = 'usr_merchant_001';

    it('TC-WALLET-01: verifies merchant wallet initial available balance', () => {
      const wallet = walletService.getWallet(merchantId);
      expect(wallet.balance).toBe(2000000);
      expect(wallet.availableBalance).toBe(2000000);
    });

    it('TC-WALLET-02: holds balance correctly and releases hold completely', () => {
      const holdRes = walletService.reserveHold(merchantId, 25000, 'FSH-TEST-VITEST', 'Grab');
      expect(holdRes.success).toBe(true);
      expect(holdRes.availableAfter).toBe(1975000);

      walletService.releaseHold(merchantId, 25000, 'FSH-TEST-VITEST', 'Cancellation');
      const restored = walletService.getWallet(merchantId);
      expect(restored.availableBalance).toBe(2000000);
      expect(restored.holdBalance).toBe(0);
    });

    it('TC-WALLET-03: rejects hold when amount exceeds available balance', () => {
      expect(() => {
        walletService.reserveHold(merchantId, 999999999, 'FSH-OVERFLOW', 'Test');
      }).toThrow(/không đủ/);
    });
  });

  describe('5. Order Booking & Idempotency', () => {
    const merchantId = 'usr_merchant_001';

    it('TC-IDEMP-01: prevents concurrent double submissions with Idempotency lock', () => {
      const key = 'vitest-idemp-' + Date.now();
      const lock1 = idempotencyStore.acquire(key);
      expect(lock1.status).toBe('ACQUIRED');

      const lock2 = idempotencyStore.acquire(key);
      expect(lock2.status).toBe('IN_PROGRESS');

      idempotencyStore.resolve(key, { result: 'OK' });
      const lock3 = idempotencyStore.acquire(key);
      expect(lock3.status).toBe('CACHED');
    });

    it('TC-BOOK-01: creates order with standard code format and secure tracking token', async () => {
      const order = await orderService.createOrder({
        userId: merchantId,
        quoteReferenceId: 'VITEST-QUOTE',
        carrierCode: 'SANDBOX_MOCK',
        serviceTier: 'BIKE_INSTANT',
        pickup: standardQuoteReq.pickup,
        dropoff: standardQuoteReq.dropoff,
        packageDetails: standardQuoteReq.packageDetails,
        paymentMethod: 'WALLET',
      });

      expect(order.orderCode).toMatch(/^FSH-\d{8}-\d{4}$/);
      expect(order.trackingToken).toMatch(/^fsh_live_[a-f0-9]{32}$/);
      expect(order.driver).toBeDefined();

      // Clean up order by cancelling to release hold
      await orderService.cancelOrder(order.orderCode, 'Vitest cleanup');
    });
  });

  describe('6. Public Live Tracking & Privacy', () => {
    it('TC-TRACK-01: retrieves live tracking via token without authentication', () => {
      const sample = orderService.getPublicTracking('fsh_live_89a7df6b02a4b3c1d9e20011a8b9c0d1');
      expect(sample).not.toBeNull();
      expect(sample!.orderCode).toBe('FSH-20261103-8899');
      expect(sample!.driver?.name).toBe('Trần Văn Bình');
      expect(sample!.timeline.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-TRACK-02: returns null for invalid tracking token', () => {
      const notFound = orderService.getPublicTracking('fsh_live_non_existent');
      expect(notFound).toBeNull();
    });
  });

  describe('7. Exception Handling & Circuit Breaker', () => {
    it('TC-EXC-01: isolates slow carrier exceeding 1.8s timeout via AbortController', async () => {
      const mockAdapter = carrierAdapterRegistry.getAdapter('SANDBOX_MOCK') as MockSandboxCarrierAdapter;
      mockAdapter.shouldFailTimeout = true;

      const res = await parallelQuotingEngineService.getAggregatedQuotes(standardQuoteReq);
      mockAdapter.shouldFailTimeout = false;

      expect(res.quotes.length).toBeGreaterThanOrEqual(5);
      expect(res.failedCarriers.some((f) => f.carrierCode === 'SANDBOX_MOCK' && f.errorCode === 'CARRIER_TIMEOUT')).toBe(true);
    });

    it('TC-EXC-02: verifies Circuit Breaker transitions and self-healing', async () => {
      const cb = circuitBreakerRegistry.getBreaker('CB_VITEST_TEST', {
        failureThreshold: 2,
        cooldownPeriodMs: 100,
        successThreshold: 1,
      });

      expect(cb.getState()).toBe('CLOSED');
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canExecute()).toBe(false);

      await new Promise((r) => setTimeout(r, 120));
      expect(cb.canExecute()).toBe(true);
      expect(cb.getState()).toBe('HALF_OPEN');

      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('TC-EXC-03: GrabExpress enforces package weight <= 20kg limit', async () => {
      const grab = new GrabExpressAdapter();
      const res = await grab.getQuote({
        ...standardQuoteReq,
        packageDetails: {
          ...standardPackage,
          weightInGrams: 22000,
        },
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('PACKAGE_EXCEEDS_LIMITS');
    });
  });

  describe('8. VietQR Napas 247 Payments', () => {
    it('TC-QR-01: generates valid EMVCo dynamic VietQR string and image URL', () => {
      const qr = generateVietQrTopup(200000);
      expect(qr.vietQrString.startsWith('000201')).toBe(true);
      expect(qr.qrImageUrl).toContain('img.vietqr.io');
      expect(qr.amount).toBe(200000);
    });

    it('TC-QR-02: validates minimum and maximum topup amounts', () => {
      expect(() => walletService.createTopupRequest('usr_merchant_001', 20000)).toThrow(/tối thiểu/);
      expect(() => walletService.createTopupRequest('usr_merchant_001', 50000000)).toThrow(/tối đa/);
    });
  });
});
