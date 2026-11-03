// ============================================================================
// FAST-SHIP-HUB — QUOTATION CONTROLLER
// POST /api/v1/quotes — Parallel Multi-Carrier Quoting with 1.8s Timeout
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parallelQuotingEngineService } from '@/services/quoting.service';
import { createSuccessResponse, createErrorResponse } from '@/types/api.types';

// Zod Schema kiểm tra tính hợp lệ của dữ liệu đầu vào
const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Vĩ độ không hợp lệ'),
  longitude: z.number().min(-180).max(180, 'Kinh độ không hợp lệ'),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
  senderOrReceiverName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phoneNumber: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại không đúng định dạng VN'),
  note: z.string().optional(),
});

const packageDetailsSchema = z.object({
  name: z.string().default('Kiện hàng giao nhanh'),
  weightInGrams: z.number().int().positive().max(500000, 'Trọng lượng tối đa 500kg'),
  lengthCm: z.number().positive().max(300).default(20),
  widthCm: z.number().positive().max(300).default(15),
  heightCm: z.number().positive().max(300).default(10),
  packageType: z.enum(['DOCUMENT', 'FOOD', 'FASHION', 'FRAGILE', 'ELECTRONICS']).default('FASHION'),
  declaredValueVnd: z.number().min(0).default(0),
  codAmountVnd: z.number().min(0).default(0),
  isFragile: z.boolean().default(false),
  deliverToDoor: z.boolean().default(false),
  specialInstructions: z.string().optional(),
});

const quoteRequestSchema = z.object({
  pickup: geoPointSchema,
  dropoff: geoPointSchema,
  packageDetails: packageDetailsSchema,
  serviceTier: z.enum(['BIKE_INSTANT', 'BIKE_SAME_DAY', 'CAR_DELIVERY', 'TRUCK_500KG']).default('BIKE_INSTANT'),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const traceId = req.headers.get('x-request-id') || undefined;

  try {
    const rawBody = await req.json();
    const parseResult = quoteRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        issue: issue.message,
      }));
      return NextResponse.json(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Dữ liệu đầu vào không hợp lệ hoặc thiếu trường bắt buộc',
          details,
          traceId
        ),
        { status: 400 }
      );
    }

    const result = await parallelQuotingEngineService.getAggregatedQuotes(parseResult.data);
    const durationMs = Date.now() - startTime;

    return NextResponse.json(
      createSuccessResponse(result, { processingTimeMs: durationMs }, traceId),
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        err.message || 'Đã xảy ra lỗi khi tính toán báo giá đa hãng',
        undefined,
        traceId
      ),
      { status: 500 }
    );
  }
}
