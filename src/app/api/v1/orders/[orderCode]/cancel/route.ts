// ============================================================================
// FAST-SHIP-HUB — ORDER CANCELLATION CONTROLLER
// POST /api/v1/orders/[orderCode]/cancel — Cancel In-Flight Order & Refund Hold with IDOR Guard
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { orderService } from '@/services/order.service';
import { createSuccessResponse, createErrorResponse } from '@/types/api.types';

const cancelSchema = z.object({
  reason: z.string().min(3, 'Lý do hủy đơn phải có ít nhất 3 ký tự').default('Người gửi yêu cầu hủy đơn'),
});

export async function POST(
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

  // 1. Kiểm soát quyền hủy đơn & Phòng chống IDOR
  const callerUserId = req.headers.get('x-user-id') || 'usr_merchant_001';
  const callerUserRole = req.headers.get('x-user-role') || 'MERCHANT';

  if (callerUserRole !== 'ADMIN' && order.userId !== callerUserId) {
    return NextResponse.json(
      createErrorResponse(
        'UNAUTHORIZED_ACCESS',
        'Bạn không có quyền hủy đơn hàng của tài khoản khác',
        undefined,
        traceId
      ),
      { status: 403 }
    );
  }

  try {
    let reason = 'Người gửi yêu cầu hủy đơn';
    try {
      const rawBody = await req.json();
      const parseResult = cancelSchema.safeParse(rawBody);
      if (parseResult.success) {
        reason = parseResult.data.reason;
      }
    } catch {
      // Body rỗng -> dùng lý do mặc định
    }

    const cancelResult = await orderService.cancelOrder(orderCode, reason);

    return NextResponse.json(
      createSuccessResponse(cancelResult, undefined, traceId),
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error & { code?: string };

    if (err.code === 'INVALID_STATE_TRANSITION') {
      return NextResponse.json(
        createErrorResponse('INVALID_STATE_TRANSITION', err.message, undefined, traceId),
        { status: 409 }
      );
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'Lỗi khi hủy đơn hàng', undefined, traceId),
      { status: 500 }
    );
  }
}
