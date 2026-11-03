// ============================================================================
// FAST-SHIP-HUB — ORDER DETAILS CONTROLLER
// GET /api/v1/orders/[orderCode] — Retrieve Single Order Record with IDOR Guard
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';
import { createSuccessResponse, createErrorResponse } from '@/types/api.types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  const traceId = req.headers.get('x-request-id') || undefined;
  const { orderCode } = await params;

  if (!orderCode) {
    return NextResponse.json(
      createErrorResponse('VALIDATION_ERROR', 'Mã đơn hàng orderCode là bắt buộc', undefined, traceId),
      { status: 400 }
    );
  }

  const order = orderService.getOrder(orderCode);
  if (!order) {
    return NextResponse.json(
      createErrorResponse('ORDER_NOT_FOUND', `Không tìm thấy thông tin đơn hàng ${orderCode}`, undefined, traceId),
      { status: 404 }
    );
  }

  // 1. Kiểm soát quyền truy cập & Phòng chống IDOR (Broken Object Level Authorization)
  const callerUserId = req.headers.get('x-user-id') || 'usr_merchant_001';
  const callerUserRole = req.headers.get('x-user-role') || 'MERCHANT';

  if (callerUserRole !== 'ADMIN' && order.userId !== callerUserId) {
    return NextResponse.json(
      createErrorResponse(
        'UNAUTHORIZED_ACCESS',
        'Bạn không có quyền truy cập vào thông tin đơn hàng của tài khoản khác',
        undefined,
        traceId
      ),
      { status: 403 }
    );
  }

  return NextResponse.json(createSuccessResponse(order, undefined, traceId), { status: 200 });
}
