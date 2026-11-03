// ============================================================================
// FAST-SHIP-HUB — PUBLIC LIVE TRACKING CONTROLLER
// GET /api/v1/tracking/[trackingNumber] — Guest-Safe Read-Only Tracking
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';
import { createSuccessResponse, createErrorResponse } from '@/types/api.types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const traceId = req.headers.get('x-request-id') || undefined;
  const { trackingNumber } = await params;

  if (!trackingNumber) {
    return NextResponse.json(
      createErrorResponse('VALIDATION_ERROR', 'Mã trackingNumber là bắt buộc', undefined, traceId),
      { status: 400 }
    );
  }

  // 1. Thử tìm theo trackingToken trước (an toàn cho guest)
  let trackingData = orderService.getPublicTracking(trackingNumber);

  // 2. Nếu không thấy, thử tìm theo orderCode nếu truyền mã đơn trực tiếp
  if (!trackingData) {
    const order = orderService.getOrder(trackingNumber);
    if (order) {
      trackingData = orderService.getPublicTracking(order.trackingToken);
    }
  }

  if (!trackingData) {
    return NextResponse.json(
      createErrorResponse(
        'TRACKING_TOKEN_INVALID',
        `Mã tra cứu ${trackingNumber} không tồn tại hoặc đã bị thu hồi`,
        undefined,
        traceId
      ),
      { status: 404 }
    );
  }

  return NextResponse.json(createSuccessResponse(trackingData, undefined, traceId), { status: 200 });
}
