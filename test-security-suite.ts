// ============================================================================
// FAST-SHIP-HUB — SECURITY VERIFICATION & AUDIT TEST SUITE
// Automated checks for HMAC Webhook, Idempotency, Wallet ACID, and IDOR Defense
// ============================================================================

import { carrierAdapterRegistry } from './src/services/carrier-adapters/adapter-registry';
import { idempotencyStore } from './src/lib/idempotency';
import { walletService } from './src/services/wallet.service';
import { orderService } from './src/services/order.service';
import crypto from 'node:crypto';

async function runSecurityAudit() {
  console.log('🔒 Starting FAST-SHIP-HUB Security Audit Suite...\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [SEC-PASS] ${testName}`);
    } else {
      console.error(`❌ [SEC-FAIL] ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Webhook HMAC-SHA256 Signature Verification & Timing-Safe Defense
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Webhook HMAC-SHA256 Signatures ---');
  const carriers = [
    { code: 'GRAB', header: 'x-grab-signature' },
    { code: 'SHOPEE_FOOD', header: 'x-shopee-signature' },
    { code: 'XANH_SM', header: 'x-xanhsm-signature' },
    { code: 'AHAMOVE', header: 'x-ahamove-signature' },
    { code: 'BE', header: 'x-be-signature' },
  ];

  for (const c of carriers) {
    const adapter = carrierAdapterRegistry.getAdapter(c.code as any);
    const rawPayload = JSON.stringify({
      orderId: `ORD-${c.code}-123`,
      status: 'DELIVERED',
      timestamp: Date.now(),
    });

    // Extract secret (private property for testing)
    const secret = (adapter as any).partnerSecret || (adapter as any).webhookSecret;
    const validHmac = crypto.createHmac('sha256', secret).update(rawPayload, 'utf8').digest('hex');

    // 1. Valid signature passes
    const resValid = adapter.verifyWebhookSignature(rawPayload, { [c.header]: validHmac });
    assert(resValid === true, `${c.code}: Valid HMAC-SHA256 signature accepted`);

    // 2. Generic 'x-signature' fallback header passes
    const resGeneric = adapter.verifyWebhookSignature(rawPayload, { 'x-signature': validHmac });
    assert(resGeneric === true, `${c.code}: Generic 'x-signature' fallback header accepted`);

    // 3. Tampered payload is rejected
    const tamperedPayload = rawPayload + ' ';
    const resTampered = adapter.verifyWebhookSignature(tamperedPayload, { [c.header]: validHmac });
    assert(resTampered === false, `${c.code}: Tampered payload rejected`);

    // 4. Forged signature is rejected
    const forgedHmac = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const resForged = adapter.verifyWebhookSignature(rawPayload, { [c.header]: forgedHmac });
    assert(resForged === false, `${c.code}: Forged HMAC signature rejected`);

    // 5. Malformed / odd-length signature doesn't throw unhandled exception
    const resMalformed = adapter.verifyWebhookSignature(rawPayload, { [c.header]: 'invalid_length_hex' });
    assert(resMalformed === false, `${c.code}: Malformed signature safely rejected without crash`);

    // 6. Missing signature is rejected
    const resMissing = adapter.verifyWebhookSignature(rawPayload, {});
    assert(resMissing === false, `${c.code}: Missing signature header rejected`);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Financial Integrity & Double-Spending Protection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Financial Integrity & Double-Spending ---');
  const testIdempKey = 'idemp-audit-' + crypto.randomUUID();

  // Step 1: Initial request locks the key
  const step1 = idempotencyStore.acquire(testIdempKey);
  assert(step1.status === 'ACQUIRED', 'Idempotency key acquired for first request');

  // Step 2: Concurrent duplicate request while processing gets 409 Conflict
  const step2 = idempotencyStore.acquire(testIdempKey);
  assert(step2.status === 'IN_PROGRESS', 'Concurrent duplicate request rejected with IN_PROGRESS (409 Conflict)');

  // Step 3: Resolve key with response data
  const mockResponse = { orderCode: 'FSH-AUDIT-001', finalFare: 28000 };
  idempotencyStore.resolve(testIdempKey, mockResponse);

  // Step 4: Replay request returns cached payload without re-executing
  const step4 = idempotencyStore.acquire(testIdempKey);
  assert(
    step4.status === 'CACHED' && (step4 as any).cachedResponse?.orderCode === 'FSH-AUDIT-001',
    'Replayed request receives cached response without double charging'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Prepaid Wallet Hold / Capture / Release Mechanics
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Prepaid Wallet Hold / Capture / Release ---');
  const userId = 'usr_merchant_001';
  const initialWallet = walletService.getWallet(userId);
  const baselineAvail = initialWallet.availableBalance;

  // 1. Hold reservation
  const holdAmt = 50000;
  const holdRes = walletService.reserveHold(userId, holdAmt, 'FSH-HOLD-AUDIT', 'Audit Carrier');
  assert(holdRes.success, 'Wallet hold reservation succeeded');
  assert(
    walletService.getWallet(userId).availableBalance === baselineAvail - holdAmt,
    'Available balance reduced by exact hold amount'
  );

  // 2. Overdraft rejection
  const hugeAmt = 999999999;
  let overdraftBlocked = false;
  try {
    walletService.reserveHold(userId, hugeAmt, 'FSH-OVERDRAFT', 'Audit Carrier');
  } catch (err: any) {
    overdraftBlocked = err.message.includes('không đủ');
  }
  assert(overdraftBlocked, 'Overdraft attempt blocked: cannot hold more than available balance');

  // 3. Release hold
  walletService.releaseHold(userId, holdAmt, 'FSH-HOLD-AUDIT', 'Audit test cancellation');
  assert(
    walletService.getWallet(userId).availableBalance === baselineAvail,
    'Hold release restores exact available balance'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Guest Tracking Token Entropy & IDOR Protection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Guest Tracking Token Entropy & IDOR ---');
  const sampleOrder = orderService.getOrder('FSH-20261103-8899');
  assert(Boolean(sampleOrder), 'Sample seeded order exists');

  if (sampleOrder) {
    // Check tracking token length and prefix
    assert(
      sampleOrder.trackingToken.startsWith('fsh_live_'),
      'Tracking token has standard secure prefix "fsh_live_"'
    );
    const hexPart = sampleOrder.trackingToken.replace('fsh_live_', '');
    assert(
      hexPart.length >= 32,
      `Tracking token has 128+ bits entropy (Hex length: ${hexPart.length} chars >= 32)`
    );

    // Verify public tracking sanitization (no internal financial / merchant details leaked)
    const publicTrack = orderService.getPublicTracking(sampleOrder.trackingToken);
    assert(Boolean(publicTrack), 'Public tracking retrievable by secure token');
    assert((publicTrack as any).userId === undefined, 'Public tracking sanitizes and does NOT expose userId');
    assert((publicTrack as any).walletBalanceBefore === undefined, 'Public tracking does NOT leak wallet balances');
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n=======================================================');
  console.log(`🛡️ TOTAL AUDIT CHECKS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('=======================================================\n');

  if (passed === total) {
    console.log('🏆 ALL SECURITY CHECKS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error('Fatal Security Audit error:', err);
  process.exit(1);
});
