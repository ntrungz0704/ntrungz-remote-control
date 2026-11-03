// ============================================================================
// FAST-SHIP-HUB — LIVE TRACKING SSE STREAM CONTROLLER
// GET /api/v1/tracking/[trackingNumber]/stream — Server-Sent Events (SSE)
// ============================================================================

import { NextRequest } from 'next/server';
import { orderService } from '@/services/order.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const { trackingNumber } = await params;

  let trackingData = orderService.getPublicTracking(trackingNumber);
  if (!trackingData) {
    const order = orderService.getOrder(trackingNumber);
    if (order) {
      trackingData = orderService.getPublicTracking(order.trackingToken);
    }
  }

  if (!trackingData) {
    return new Response('Tracking token not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  // Khởi tạo luồng Server-Sent Events (SSE)
  const stream = new ReadableStream({
    start(controller) {
      // 1. Gửi trạng thái ban đầu ngay khi kết nối
      const initialPayload = JSON.stringify({
        status: trackingData.status,
        statusLabel: trackingData.statusLabel,
        driver: trackingData.driver,
        etaMinutes: trackingData.etaMinutes,
      });
      controller.enqueue(encoder.encode(`event: status\ndata: ${initialPayload}\n\n`));

      // 2. Thiết lập định kỳ gửi cập nhật tọa độ GPS tài xế mô phỏng di chuyển mượt mà
      let step = 0;
      const totalSteps = 20;
      const pickupLat = trackingData.route.pickupLatitude;
      const pickupLng = trackingData.route.pickupLongitude;
      const dropoffLat = trackingData.route.dropoffLatitude;
      const dropoffLng = trackingData.route.dropoffLongitude;

      const intervalId = setInterval(() => {
        step = (step + 1) % totalSteps;
        const fraction = step / totalSteps;

        // Mô phỏng tọa độ di chuyển giữa điểm nhận và điểm giao
        const currentLat = pickupLat + (dropoffLat - pickupLat) * fraction;
        const currentLng = pickupLng + (dropoffLng - pickupLng) * fraction;

        const locationEvent = JSON.stringify({
          latitude: currentLat,
          longitude: currentLng,
          updatedAt: new Date().toISOString(),
          etaMinutes: Math.max(1, Math.round(trackingData.etaMinutes * (1 - fraction))),
        });

        try {
          controller.enqueue(encoder.encode(`event: location\ndata: ${locationEvent}\n\n`));
        } catch {
          clearInterval(intervalId);
        }
      }, 3000); // 3 giây gửi 1 ping GPS

      // Lắng nghe khi client đóng kết nối
      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Tắt bộ đệm của Nginx
    },
  });
}
