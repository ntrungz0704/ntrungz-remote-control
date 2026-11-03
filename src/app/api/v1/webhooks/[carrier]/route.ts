// ============================================================================
// FAST-SHIP-HUB — CARRIER WEBHOOK RECEIVER GATEWAY
// POST /api/v1/webhooks/[carrier] — Secure Ingest for Partner Event Webhooks
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { carrierAdapterRegistry } from '@/services/carrier-adapters/adapter-registry';
import { orderService } from '@/services/order.service';
import { idempotencyStore } from '@/lib/idempotency';
import type { CarrierCode } from '@/types/carrier.types';
import { createSuccessResponse, createErrorResponse } from '@/types/api.types';

// Ánh xạ chuỗi định danh slug sang CarrierCode chuẩn
const slugToCarrierCode: Record<string, CarrierCode> = {
  grab: 'GRAB',
  shopeefood: 'SHOPEE_FOOD',
  xanhsm: 'XANH_SM',
  ahamove: 'AHAMOVE',
  be: 'BE',
  sandbox: 'SANDBOX_MOCK',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ carrier: string }> }
) {
  const traceId = req.headers.get('x-request-id') || undefined;
  const { carrier: carrierSlug } = await params;
  const normalizedSlug = carrierSlug.toLowerCase();
  const carrierCode = slugToCarrierCode[normalizedSlug];

  if (!carrierCode || !carrierAdapterRegistry.hasAdapter(carrierCode)) {
    return NextResponse.json(
      createErrorResponse('NOT_FOUND', `Không hỗ trợ webhook cho đối tác ${carrierSlug}`, undefined, traceId),
      { status: 404 }
    );
  }

  const adapter = carrierAdapterRegistry.getAdapter(carrierCode);

  try {
    const rawBody = await req.text();
    const headersRecord: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    // 1. Thẩm định chữ ký số (Signature Verification HMAC-SHA256)
    const isSignatureValid = adapter.verifyWebhookSignature(rawBody, headersRecord);
    if (!isSignatureValid) {
      // Trong môi trường sandbox / local dev, kiểm tra xem có cờ bỏ qua hoặc header test không
      const isTestEnv = process.env.NODE_ENV !== 'production' && headersRecord['x-bypass-sign'] === 'true';
      if (!isTestEnv && !adapter.isMock) {
        return NextResponse.json(
          createErrorResponse('UNAUTHORIZED', 'Chữ ký số Webhook không hợp lệ hoặc đã bị can thiệp', undefined, traceId),
          { status: 401 }
        );
      }
    }

    // 2. Phân tích & Chuẩn hóa payload
    let jsonPayload: unknown = {};
    try {
      jsonPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Payload Webhook không phải JSON hợp lệ', undefined, traceId),
        { status: 400 }
      );
    }

    const event = adapter.parseWebhookPayload(jsonPayload);

    // 2.1. Chống phát lại sự kiện (Replay Attack Defense & Event Deduplication)
    const webhookDedupKey = `wh_evt_${carrierCode}_${event.eventId}`;
    const dedupLock = idempotencyStore.acquire(webhookDedupKey, 24 * 60 * 60 * 1000); // 24h TTL
    if (dedupLock.status === 'IN_PROGRESS' || dedupLock.status === 'CACHED') {
      return NextResponse.json(
        createSuccessResponse(
          {
            carrierCode,
            eventId: event.eventId,
            eventType: event.eventType,
            normalizedStatus: event.normalizedStatus,
            processed: false,
            duplicate: true,
            message: 'Sự kiện Webhook đã được ghi nhận và xử lý trước đó (Bỏ qua xử lý lặp)',
          },
          undefined,
          traceId
        ),
        { status: 200 }
      );
    }

    // 3. Cập nhật vị trí GPS tài xế nếu có
    if (event.driver?.currentLocation && event.carrierOrderId) {
      // Tìm đơn hàng tương ứng để cập nhật
      const allOrders = orderService.getOrders('usr_merchant_001', { limit: 100 });
      const matchingOrder = allOrders.orders.find(
        (o) => o.carrierOrderId === event.carrierOrderId || o.orderCode === event.carrierOrderId
      );
      if (matchingOrder) {
        orderService.updateDriverLocation(
          matchingOrder.orderCode,
          event.driver.currentLocation.latitude,
          event.driver.currentLocation.longitude
        );
      }
    }

    // Đánh dấu sự kiện đã xử lý thành công vào kho Idempotency
    idempotencyStore.resolve(webhookDedupKey, { processed: true });

    return NextResponse.json(
      createSuccessResponse(
        {
          carrierCode,
          eventId: event.eventId,
          eventType: event.eventType,
          normalizedStatus: event.normalizedStatus,
          processed: true,
        },
        undefined,
        traceId
      ),
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        err.message || 'Lỗi khi xử lý dữ liệu webhook đối tác',
        undefined,
        traceId
      ),
      { status: 500 }
    );
  }
}
