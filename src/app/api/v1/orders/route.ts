// ============================================================================
// FAST-SHIP-HUB — ORDER CONTROLLER
// POST /api/v1/orders — 1-Click Order Booking with Idempotency Protection
// GET /api/v1/orders — List Merchant Orders
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { orderService, type OrderStatus } from '@/services/order.service';
import { idempotencyStore } from '@/lib/idempotency';
import { createSuccessResponse, createErrorResponse } from '@/types/api.types';
import type { CarrierCode } from '@/types/carrier.types';

const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5),
  senderOrReceiverName: z.string().min(2),
  phoneNumber: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/),
  note: z.string().optional(),
});

const packageDetailsSchema = z.object({
  name: z.string().default('Kiện hàng giao nhanh'),
  weightInGrams: z.number().int().positive(),
  lengthCm: z.number().positive().default(20),
  widthCm: z.number().positive().default(15),
  heightCm: z.number().positive().default(10),
  packageType: z.enum(['DOCUMENT', 'FOOD', 'FASHION', 'FRAGILE', 'ELECTRONICS']).default('FASHION'),
  declaredValueVnd: z.number().min(0).default(0),
  codAmountVnd: z.number().min(0).default(0),
  isFragile: z.boolean().default(false),
  deliverToDoor: z.boolean().default(false),
  specialInstructions: z.string().optional(),
});

const createOrderSchema = z.object({
  quoteReferenceId: z.string().min(1, 'Mã báo giá quoteReferenceId là bắt buộc'),
  carrierCode: z.enum(['GRAB', 'SHOPEE_FOOD', 'XANH_SM', 'AHAMOVE', 'BE', 'SANDBOX_MOCK']),
  serviceTier: z.enum(['BIKE_INSTANT', 'BIKE_SAME_DAY', 'CAR_DELIVERY', 'TRUCK_500KG']).default('BIKE_INSTANT'),
  pickup: geoPointSchema,
  dropoff: geoPointSchema,
  packageDetails: packageDetailsSchema,
  paymentMethod: z.enum(['WALLET', 'COD']).default('WALLET'),
  notesForDriver: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const traceId = req.headers.get('x-request-id') || undefined;

  // 1. Kiểm tra bắt buộc Header Idempotency-Key
  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey) {
    return NextResponse.json(
      createErrorResponse(
        'VALIDATION_ERROR',
        'Header "Idempotency-Key" (UUIDv4) là bắt buộc đối với thao tác tạo đơn hàng',
        undefined,
        traceId
      ),
      { status: 400 }
    );
  }

  // 2. Kiểm tra trạng thái khóa chống click đúp
  const lock = idempotencyStore.acquire(idempotencyKey);
  if (lock.status === 'IN_PROGRESS') {
    return NextResponse.json(
      createErrorResponse(
        'IDEMPOTENCY_CONFLICT',
        'Yêu cầu tạo đơn hàng với Idempotency-Key này đang được xử lý, vui lòng không bấm lặp lại',
        undefined,
        traceId
      ),
      { status: 409 }
    );
  }

  if (lock.status === 'CACHED') {
    return NextResponse.json(lock.cachedResponse, { status: 200 });
  }

  try {
    const rawBody = await req.json();
    const parseResult = createOrderSchema.safeParse(rawBody);

    if (!parseResult.success) {
      idempotencyStore.release(idempotencyKey);
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        issue: i.message,
      }));
      return NextResponse.json(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Dữ liệu đặt đơn không hợp lệ',
          details,
          traceId
        ),
        { status: 400 }
      );
    }

    // 3. Tiến hành tạo đơn hàng và dispatch hãng
    const orderData = await orderService.createOrder({
      ...parseResult.data,
      userId: 'usr_merchant_001', // Trong phiên bản MVP, liên kết với merchant mặc định
    });

    const durationMs = Date.now() - startTime;
    const responsePayload = createSuccessResponse(
      orderData,
      { processingTimeMs: durationMs },
      traceId
    );

    // 4. Lưu cache Idempotency để trả lại ngay nếu người dùng gửi lại request cùng key
    idempotencyStore.resolve(idempotencyKey, responsePayload);

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: unknown) {
    idempotencyStore.release(idempotencyKey);
    const err = error as Error & { code?: string };

    if (err.message && err.message.includes('Số dư khả dụng')) {
      return NextResponse.json(
        createErrorResponse('INSUFFICIENT_WALLET_BALANCE', err.message, undefined, traceId),
        { status: 422 }
      );
    }

    if (err.code === 'CARRIER_DISPATCH_FAILED') {
      return NextResponse.json(
        createErrorResponse('CARRIER_DISPATCH_FAILED', err.message, undefined, traceId),
        { status: 502 }
      );
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'Lỗi khi tạo đơn hàng', undefined, traceId),
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const traceId = req.headers.get('x-request-id') || undefined;
  const { searchParams } = new URL(req.url);

  const status = searchParams.get('status') as OrderStatus | undefined;
  const carrierCode = searchParams.get('carrierCode') as CarrierCode | undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const userId = 'usr_merchant_001';
  const result = orderService.getOrders(userId, { status, carrierCode, page, limit });

  return NextResponse.json(
    createSuccessResponse(
      result.orders,
      {
        page: result.page,
        limit: result.limit,
        totalCount: result.totalCount,
      },
      traceId
    ),
    { status: 200 }
  );
}
