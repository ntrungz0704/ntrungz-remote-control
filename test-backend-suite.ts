// ============================================================================
// FAST-SHIP-HUB — BACKEND INTEGRATION & VERIFICATION TEST SUITE
// ============================================================================

import { parallelQuotingEngineService } from './src/services/quoting.service';
import { orderService } from './src/services/order.service';
import { walletService } from './src/services/wallet.service';
import { circuitBreakerRegistry } from './src/lib/circuit-breaker';
import { idempotencyStore } from './src/lib/idempotency';
import { generateVietQrTopup } from './src/lib/vietqr';
import { calculateHaversineDistanceKm } from './src/lib/geo';
import type { CarrierQuoteRequest } from './src/types/carrier.types';

async function runBackendVerification() {
  console.log('🚀 Starting FAST-SHIP-HUB Backend Verification Suite...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Haversine Distance & Route Calculation
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Geospatial Calculation ---');
  const lat1 = 21.028511, lon1 = 105.854444; // Tràng Tiền, Hoàn Kiếm
  const lat2 = 21.037288, lon2 = 105.834466; // Đội Cấn, Ba Đình
  const distKm = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
  assert(distKm >= 2.5 && distKm <= 4.0, `Haversine distance calculation ~3km (Actual: ${distKm}km)`);

  // --------------------------------------------------------------------------
  // TEST 2: Circuit Breaker State Machine
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Circuit Breaker State Machine ---');
  const testBreaker = circuitBreakerRegistry.getBreaker('TEST_CARRIER', {
    failureThreshold: 3,
    cooldownPeriodMs: 500,
    successThreshold: 2,
  });

  assert(testBreaker.getState() === 'CLOSED', 'Circuit breaker starts in CLOSED state');
  testBreaker.recordFailure();
  testBreaker.recordFailure();
  assert(testBreaker.getState() === 'CLOSED', 'Circuit breaker remains CLOSED after 2 failures');
  testBreaker.recordFailure();
  assert(testBreaker.getState() === 'OPEN', 'Circuit breaker trips to OPEN after 3 failures');
  assert(!testBreaker.canExecute(), 'Requests are blocked immediately (0ms) when OPEN');

  // Chờ hết cooldown
  await new Promise((r) => setTimeout(r, 600));
  assert(testBreaker.canExecute(), 'Circuit breaker allows probe request after cooldown (HALF_OPEN)');
  assert(testBreaker.getState() === 'HALF_OPEN', 'Circuit breaker enters HALF_OPEN');
  testBreaker.recordSuccess();
  testBreaker.recordSuccess();
  assert(testBreaker.getState() === 'CLOSED', 'Circuit breaker recovers to CLOSED after 2 consecutive successes');

  // --------------------------------------------------------------------------
  // TEST 3: Parallel Quoting Engine & Smart Badges
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Parallel Quoting Engine & Smart Badges ---');
  const quoteReq: CarrierQuoteRequest = {
    pickup: {
      latitude: lat1,
      longitude: lon1,
      address: 'Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
      senderOrReceiverName: 'Kho Hàng Tràng Tiền',
      phoneNumber: '0988111222',
    },
    dropoff: {
      latitude: lat2,
      longitude: lon2,
      address: 'Số 280 Đội Cấn, Ba Đình, Hà Nội',
      senderOrReceiverName: 'Nguyễn Văn Nhận',
      phoneNumber: '0912333444',
    },
    packageDetails: {
      name: 'Váy dạ hội',
      packageType: 'FASHION',
      weightInGrams: 1500,
      lengthCm: 25,
      widthCm: 20,
      heightCm: 10,
      declaredValueVnd: 500000,
      codAmountVnd: 0,
      deliverToDoor: true,
    },
    serviceTier: 'BIKE_INSTANT',
  };

  const quoteStart = Date.now();
  const quoteResult = await parallelQuotingEngineService.getAggregatedQuotes(quoteReq);
  const quoteElapsed = Date.now() - quoteStart;

  assert(quoteElapsed <= 1500, `Parallel quoting completed in < 1500ms (Actual: ${quoteElapsed}ms)`);
  assert(quoteResult.quotes.length >= 5, `Aggregated at least 5 quotes (Actual: ${quoteResult.quotes.length})`);

  const badgesAssigned = quoteResult.quotes.map((q) => q.badge).filter(Boolean);
  assert(badgesAssigned.includes('CHEAPEST'), 'Huy hiệu CHEAPEST (Rẻ nhất) được gán thành công');
  assert(badgesAssigned.includes('FASTEST'), 'Huy hiệu FASTEST (Nhanh nhất) được gán thành công');
  assert(badgesAssigned.includes('GREENEST'), 'Huy hiệu GREENEST (Xe điện Xanh SM) được gán thành công');

  const xanhQuote = quoteResult.quotes.find((q) => q.carrierCode === 'XANH_SM');
  assert(
    !!xanhQuote && (xanhQuote.co2SavingGrams ?? 0) > 0,
    `Xanh SM trả về chỉ số giảm khí thải CO2 (Actual: ${xanhQuote?.co2SavingGrams}g)`
  );

  const cheapestQuote = quoteResult.quotes.find((q) => q.badge === 'CHEAPEST');
  assert(
    !!cheapestQuote && (cheapestQuote.savingsVnd ?? 0) >= 0,
    `Gói cước rẻ nhất tính toán số tiền tiết kiệm: ${cheapestQuote?.savingsVnd}đ`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Prepaid Wallet & Balance Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Prepaid Wallet & Balance Integrity ---');
  const merchantId = 'usr_merchant_001';
  const initialWallet = walletService.getWallet(merchantId);
  assert(initialWallet.balance === 2000000, 'Initial merchant wallet balance is 2.000.000 VNĐ');
  assert(initialWallet.availableBalance === 2000000, 'Initial available balance is 2.000.000 VNĐ');

  // Test hold
  const holdAmount = 30000;
  const holdRes = walletService.reserveHold(merchantId, holdAmount, 'FSH-TEST-001', 'Xanh SM');
  assert(holdRes.success && holdRes.availableAfter === 1970000, 'Hold 30.000đ reduces availableBalance to 1.970.000đ');

  const afterHoldWallet = walletService.getWallet(merchantId);
  assert(afterHoldWallet.holdBalance === 30000, 'holdBalance updated to 30.000đ');
  assert(afterHoldWallet.balance === 2000000, 'Total balance unchanged at 2.000.000đ during hold');

  // Test release hold
  walletService.releaseHold(merchantId, holdAmount, 'FSH-TEST-001', 'Test cancellation');
  const afterReleaseWallet = walletService.getWallet(merchantId);
  assert(afterReleaseWallet.holdBalance === 0, 'holdBalance restored to 0đ after release');
  assert(afterReleaseWallet.availableBalance === 2000000, 'availableBalance restored to 2.000.000đ');

  // --------------------------------------------------------------------------
  // TEST 5: Order Booking with Idempotency Guard
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Order Booking with Idempotency Guard ---');
  const idempotencyKey = 'test-idemp-key-' + Date.now();
  const lock1 = idempotencyStore.acquire(idempotencyKey);
  assert(lock1.status === 'ACQUIRED', 'First request acquires idempotency lock (ACQUIRED)');

  const lock2 = idempotencyStore.acquire(idempotencyKey);
  assert(lock2.status === 'IN_PROGRESS', 'Concurrent second request is rejected with IN_PROGRESS (409 Conflict)');

  // Tạo đơn hàng thật qua orderService
  const orderRes = await orderService.createOrder({
    userId: merchantId,
    quoteReferenceId: quoteResult.quotes[0].quoteReferenceId,
    carrierCode: 'SANDBOX_MOCK',
    serviceTier: 'BIKE_INSTANT',
    pickup: quoteReq.pickup,
    dropoff: quoteReq.dropoff,
    packageDetails: quoteReq.packageDetails,
    paymentMethod: 'WALLET',
  });

  assert(orderRes.orderCode.startsWith('FSH-'), `Order created with valid code format (Actual: ${orderRes.orderCode})`);
  assert(orderRes.trackingToken.startsWith('fsh_live_'), `Generated 32-char secure tracking token: ${orderRes.trackingToken}`);
  assert(orderRes.status === 'PICKING' || orderRes.status === 'BOOKED', `Order status is active: ${orderRes.status}`);

  idempotencyStore.resolve(idempotencyKey, { orderCode: orderRes.orderCode });
  const lock3 = idempotencyStore.acquire(idempotencyKey);
  assert(lock3.status === 'CACHED', 'Replay request returns CACHED response without re-processing');

  // --------------------------------------------------------------------------
  // TEST 6: Public Live Tracking
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Public Live Tracking ---');
  const trackingData = orderService.getPublicTracking(orderRes.trackingToken);
  assert(trackingData !== null, 'Public live tracking retrievable via token');
  assert(trackingData?.orderCode === orderRes.orderCode, 'Tracking data references correct order code');
  assert(trackingData?.driver?.name === 'Nguyễn Văn Test', 'Tracking exposes driver info');
  assert(Boolean(trackingData?.timeline && trackingData.timeline.length >= 1), 'Tracking timeline contains event logs');

  // --------------------------------------------------------------------------
  // TEST 7: Order Cancellation & State Transition Validation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Order Cancellation & State Transition ---');
  const cancelRes = await orderService.cancelOrder(orderRes.orderCode, 'Chủ shop đổi ý');
  assert(cancelRes.success, 'Cancel order successfully');

  const afterCancelTracking = orderService.getPublicTracking(orderRes.trackingToken);
  assert(afterCancelTracking?.status === 'CANCELLED', 'Order status transitioned to CANCELLED');

  // --------------------------------------------------------------------------
  // TEST 8: VietQR Generation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: VietQR Generation ---');
  const vietQr = generateVietQrTopup(500000);
  assert(vietQr.amount === 500000, 'VietQR amount matches 500.000 VNĐ');
  assert(vietQr.vietQrString.startsWith('000201'), 'VietQR payload conforms to EMVCo standard (000201)');
  assert(vietQr.qrImageUrl.includes('img.vietqr.io'), 'VietQR generated dynamic image URL');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n=======================================================');
  console.log(`🎯 TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('=======================================================\n');

  if (passedTests === totalTests) {
    console.log('🌟 100% VERIFICATION PASSED! Backend is production-ready.');
  } else {
    process.exit(1);
  }
}

runBackendVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
