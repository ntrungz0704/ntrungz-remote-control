// ============================================================================
// FAST-SHIP-HUB — WALLET TOPUP CONTROLLER
// POST /api/v1/wallet/topup — Dedicated Topup Route via VietQR Napas 247
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { walletService } from '@/services/wallet.service';
import { createSuccessResponse, createErrorResponse } from '@/types/api.types';

const topupSchema = z.object({
  amount: z
    .number()
    .int('Số tiền nạp phải là số nguyên')
    .min(50000, 'Số tiền nạp tối thiểu là 50.000 VNĐ')
    .max(20000000, 'Số tiền nạp tối đa là 20.000.000 VNĐ'),
  paymentMethod: z.enum(['VIETQR']).default('VIETQR'),
});

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-request-id') || undefined;
  const userId = 'usr_merchant_001';

  try {
    const rawBody = await req.json();
    const parseResult = topupSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        issue: i.message,
      }));
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Thông tin nạp tiền không hợp lệ', details, traceId),
        { status: 400 }
      );
    }

    const qrResult = walletService.createTopupRequest(userId, parseResult.data.amount);

    return NextResponse.json(createSuccessResponse(qrResult, undefined, traceId), { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      createErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'Lỗi khi tạo yêu cầu nạp tiền', undefined, traceId),
      { status: 500 }
    );
  }
}
