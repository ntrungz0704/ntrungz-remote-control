// ============================================================================
// FAST-SHIP-HUB — ORDER BOOKING & DISPATCH ORCHESTRATOR
// Order Lifecycle State Machine, 1-Click Booking & Live Tracking Engine
// ============================================================================

import type {
  CarrierCode,
  ServiceTier,
  GeoPoint,
  PackageDetails,
  DriverInfo,
  TrackingTimelineEvent,
} from '@/types/carrier.types';
import { carrierAdapterRegistry } from './carrier-adapters/adapter-registry';
import { walletService } from './wallet.service';
import { calculateRouteInfo } from '@/lib/geo';
import crypto, { randomUUID } from 'node:crypto';

export type OrderStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'BOOKED'
  | 'PICKING'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'RETURNING'
  | 'RETURNED'
  | 'FAILED_DISPATCH'
  | 'CANCELLED';

export interface CreateOrderDto {
  userId?: string;
  quoteReferenceId: string;
  carrierCode: CarrierCode;
  serviceTier: ServiceTier;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  packageDetails: PackageDetails;
  paymentMethod?: 'WALLET' | 'COD';
  notesForDriver?: string;
}

export interface OrderRecord {
  id: string;
  orderCode: string;
  trackingToken: string;
  userId: string;
  carrierCode: CarrierCode;
  carrierOrderId?: string;
  serviceTier: ServiceTier;
  status: OrderStatus;
  paymentMethod: 'WALLET' | 'COD';
  pickup: GeoPoint;
  dropoff: GeoPoint;
  packageDetails: PackageDetails;
  notesForDriver?: string;
  distanceMeters: number;
  durationSeconds: number;
  baseFee: number;
  surcharges: number;
  platformFee: number;
  discountAmount: number;
  finalTotalFee: number;
  driver?: DriverInfo;
  timeline: TrackingTimelineEvent[];
  co2SavedGrams?: number;
  createdAt: Date;
  updatedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export class OrderService {
  private orders = new Map<string, OrderRecord>();
  private ordersByTrackingToken = new Map<string, string>(); // trackingToken -> orderCode

  constructor() {
    this.seedDefaultSampleOrder();
  }

  /**
   * Khởi tạo đơn hàng mẫu tương ứng với Prisma seed.ts để sẵn sàng test giao diện và API
   */
  private seedDefaultSampleOrder(): void {
    const orderCode = 'FSH-20261103-8899';
    const trackingToken = 'fsh_live_89a7df6b02a4b3c1d9e20011a8b9c0d1';

    const sampleOrder: OrderRecord = {
      id: randomUUID(),
      orderCode,
      trackingToken,
      userId: 'usr_merchant_001',
      carrierCode: 'XANH_SM',
      carrierOrderId: 'GSM-DELIVERY-99123',
      serviceTier: 'BIKE_INSTANT',
      status: 'DELIVERING',
      paymentMethod: 'WALLET',
      pickup: {
        latitude: 21.028511,
        longitude: 105.854444,
        address: 'Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
        senderOrReceiverName: 'Kho Hàng Tràng Tiền',
        phoneNumber: '0988111222',
      },
      dropoff: {
        latitude: 21.037288,
        longitude: 105.834466,
        address: 'Số 280 Đội Cấn, Ba Đình, Hà Nội',
        senderOrReceiverName: 'Nguyễn Văn Nhận',
        phoneNumber: '0912333444',
      },
      packageDetails: {
        name: 'Hộp quà thời trang',
        packageType: 'FASHION',
        weightInGrams: 1500,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 10,
        declaredValueVnd: 500000,
        codAmountVnd: 0,
        deliverToDoor: true,
      },
      distanceMeters: 4200,
      durationSeconds: 780,
      baseFee: 14000,
      surcharges: 0,
      platformFee: 1000,
      discountAmount: 0,
      finalTotalFee: 26440,
      co2SavedGrams: 178,
      driver: {
        name: 'Trần Văn Bình',
        phone: '0977889900',
        licensePlate: '29-E1 668.99',
        vehicleType: 'ELECTRIC_BIKE',
        vehicleModel: 'VinFast Feliz S',
        avatarUrl: 'https://cdn.fastshiphub.vn/drivers/xanhsm-binh.jpg',
        currentLocation: {
          latitude: 21.0335,
          longitude: 105.845,
          updatedAt: new Date(),
        },
      },
      timeline: [
        {
          status: 'BOOKED',
          description: 'Đơn hàng đã được tạo và chuyển tới hãng Xanh SM',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
        },
        {
          status: 'PICKING',
          description: 'Tài xế Trần Văn Bình đang di chuyển tới điểm lấy hàng',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          status: 'DELIVERING',
          description: 'Tài xế đã lấy hàng thành công và đang di chuyển tới người nhận',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
        },
      ],
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 60 * 1000),
      pickedUpAt: new Date(Date.now() - 5 * 60 * 1000),
    };

    this.orders.set(orderCode, sampleOrder);
    this.ordersByTrackingToken.set(trackingToken, orderCode);
  }

  /**
   * Tạo đơn hàng mới & điều phối tới API đối tác
   */
  async createOrder(dto: CreateOrderDto) {
    const userId = dto.userId || 'usr_merchant_001';
    const adapter = carrierAdapterRegistry.getAdapter(dto.carrierCode);

    // 1. Tính toán lộ trình
    const route = calculateRouteInfo(
      dto.pickup.latitude,
      dto.pickup.longitude,
      dto.dropoff.latitude,
      dto.dropoff.longitude
    );

    // 2. Tính toán cước phí ước tính qua Adapter
    const quoteRes = await adapter.getQuote({
      pickup: dto.pickup,
      dropoff: dto.dropoff,
      packageDetails: dto.packageDetails,
      serviceTier: dto.serviceTier,
    });

    if (!quoteRes.success || !quoteRes.quote) {
      throw new Error(quoteRes.errorMessage || 'Không thể tính cước với hãng đối tác');
    }

    const quote = quoteRes.quote;
    const finalFee = quote.finalTotalFee;

    // 3. Sinh mã đơn hàng chuẩn hệ thống: FSH-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `FSH-${dateStr}-${randomSeq}`;

    // 4. Sinh Guest Tracking Token 32 ký tự URL-safe
    const tokenHex = crypto.randomBytes(16).toString('hex');
    const trackingToken = `fsh_live_${tokenHex}`;

    // 5. Trừ / Tạm giữ ví nếu thanh toán qua WALLET
    let walletSummary = {
      paymentMethod: dto.paymentMethod || 'WALLET',
      walletBalanceBefore: 0,
      holdAmount: finalFee,
      walletAvailableAfter: 0,
    };

    if (dto.paymentMethod !== 'COD') {
      const userWallet = walletService.getWallet(userId);
      walletSummary.walletBalanceBefore = userWallet.balance;

      const holdResult = walletService.reserveHold(
        userId,
        finalFee,
        orderCode,
        adapter.displayName
      );
      walletSummary.walletAvailableAfter = holdResult.availableAfter;
    }

    // 6. Gọi lệnh dispatch sang API hãng đối tác
    let bookingRes;
    try {
      bookingRes = await adapter.createBooking({
        orderCode,
        pickup: dto.pickup,
        dropoff: dto.dropoff,
        packageDetails: dto.packageDetails,
        serviceTier: dto.serviceTier,
        quoteReferenceId: dto.quoteReferenceId,
        notesForDriver: dto.notesForDriver,
      });
    } catch (err: unknown) {
      // Nếu hãng lỗi, hoàn tiền ví ngay lập tức
      if (dto.paymentMethod !== 'COD') {
        walletService.releaseHold(userId, finalFee, orderCode, 'Hãng lỗi kết nối');
      }
      throw err;
    }

    if (!bookingRes.success) {
      // Hoàn lại tiền tạm giữ nếu không điều phối được tài xế
      if (dto.paymentMethod !== 'COD') {
        walletService.releaseHold(
          userId,
          finalFee,
          orderCode,
          bookingRes.errorMessage || 'Hãng hết tài xế'
        );
      }
      const error = new Error(bookingRes.errorMessage || 'Không tìm thấy tài xế trong khu vực');
      (error as unknown as Record<string, unknown>).code = 'CARRIER_DISPATCH_FAILED';
      throw error;
    }

    // 7. Tạo bản ghi đơn hàng
    const newOrder: OrderRecord = {
      id: randomUUID(),
      orderCode,
      trackingToken,
      userId,
      carrierCode: dto.carrierCode,
      carrierOrderId: bookingRes.carrierOrderId,
      serviceTier: dto.serviceTier,
      status: bookingRes.driver ? 'PICKING' : 'BOOKED',
      paymentMethod: dto.paymentMethod || 'WALLET',
      pickup: dto.pickup,
      dropoff: dto.dropoff,
      packageDetails: dto.packageDetails,
      notesForDriver: dto.notesForDriver,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      baseFee: quote.baseFee,
      surcharges: quote.surcharges,
      platformFee: quote.platformFee,
      discountAmount: quote.discountAmount,
      finalTotalFee: quote.finalTotalFee,
      driver: bookingRes.driver,
      co2SavedGrams: quote.co2SavingGrams,
      timeline: [
        {
          status: 'BOOKED',
          description: `Đơn hàng đã được tạo và chuyển tới ${adapter.displayName}`,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (bookingRes.driver) {
      newOrder.timeline.push({
        status: 'PICKING',
        description: `Tài xế ${bookingRes.driver.name} đang đến lấy hàng`,
        timestamp: new Date(),
      });
    }

    this.orders.set(orderCode, newOrder);
    this.ordersByTrackingToken.set(trackingToken, orderCode);

    return {
      orderCode,
      trackingToken,
      trackingUrl: `/track/${trackingToken}`,
      carrierCode: dto.carrierCode,
      carrierOrderId: bookingRes.carrierOrderId,
      status: newOrder.status,
      fare: {
        baseFee: quote.baseFee,
        surcharges: quote.surcharges,
        platformFee: quote.platformFee,
        discountAmount: quote.discountAmount,
        finalTotalFee: quote.finalTotalFee,
      },
      paymentSummary: walletSummary,
      driver: bookingRes.driver,
      estimatedPickupMinutes: quote.estimatedPickupMinutes,
      createdAt: newOrder.createdAt,
    };
  }

  /**
   * Tra cứu đơn hàng nội bộ
   */
  getOrder(orderCode: string): OrderRecord | undefined {
    return this.orders.get(orderCode);
  }

  /**
   * Danh sách đơn hàng có bộ lọc và phân trang
   */
  getOrders(
    userId: string,
    filter?: { status?: OrderStatus; carrierCode?: CarrierCode; page?: number; limit?: number }
  ) {
    const page = filter?.page || 1;
    const limit = filter?.limit || 20;

    let all = Array.from(this.orders.values()).filter((o) => o.userId === userId);

    if (filter?.status) {
      all = all.filter((o) => o.status === filter.status);
    }
    if (filter?.carrierCode) {
      all = all.filter((o) => o.carrierCode === filter.carrierCode);
    }

    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totalCount = all.length;
    const paginated = all.slice((page - 1) * limit, page * limit);

    return {
      orders: paginated,
      totalCount,
      page,
      limit,
    };
  }

  /**
   * Hủy đơn hàng và tự động hoàn tiền ví
   */
  async cancelOrder(orderCode: string, reason: string) {
    const order = this.orders.get(orderCode);
    if (!order) {
      throw new Error('Không tìm thấy thông tin đơn hàng');
    }

    // Kiểm tra ma trận trạng thái: Cấm hủy khi đang giao (DELIVERING) hoặc đã giao (DELIVERED)
    if (order.status === 'DELIVERING' || order.status === 'DELIVERED') {
      const err = new Error('Không thể hủy đơn khi tài xế đã lấy hàng hoặc đã giao xong');
      (err as unknown as Record<string, unknown>).code = 'INVALID_STATE_TRANSITION';
      throw err;
    }

    if (order.status === 'CANCELLED') {
      return { success: true, message: 'Đơn hàng đã được hủy trước đó' };
    }

    const adapter = carrierAdapterRegistry.getAdapter(order.carrierCode);
    if (order.carrierOrderId) {
      await adapter.cancelBooking({
        carrierOrderId: order.carrierOrderId,
        orderCode,
        reason,
      });
    }

    // Hoàn trả số dư tạm giữ
    if (order.paymentMethod === 'WALLET') {
      walletService.releaseHold(order.userId, order.finalTotalFee, orderCode, reason);
    }

    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    order.cancellationReason = reason;
    order.updatedAt = new Date();
    order.timeline.push({
      status: 'CANCELLED',
      description: `Đơn hàng đã bị hủy. Lý do: ${reason}`,
      timestamp: new Date(),
    });

    return {
      success: true,
      orderCode,
      status: order.status,
      message: 'Hủy đơn hàng thành công, tiền tạm giữ đã hoàn lại ví',
    };
  }

  /**
   * Tra cứu Live Tracking công khai (Guest)
   */
  getPublicTracking(trackingToken: string) {
    const orderCode = this.ordersByTrackingToken.get(trackingToken);
    if (!orderCode) {
      return null;
    }

    const order = this.orders.get(orderCode);
    if (!order) return null;

    const carrier = carrierAdapterRegistry.getAdapter(order.carrierCode);

    return {
      orderCode: order.orderCode,
      trackingToken: order.trackingToken,
      status: order.status,
      statusLabel: this.getStatusLabel(order.status),
      carrier: {
        code: order.carrierCode,
        name: carrier.displayName,
        logoUrl: `https://cdn.fastshiphub.vn/logos/${order.carrierCode.toLowerCase()}.svg`,
      },
      driver: order.driver,
      route: {
        pickupAddress: order.pickup.address,
        dropoffAddress: order.dropoff.address,
        pickupLatitude: order.pickup.latitude,
        pickupLongitude: order.pickup.longitude,
        dropoffLatitude: order.dropoff.latitude,
        dropoffLongitude: order.dropoff.longitude,
        distanceMeters: order.distanceMeters,
        durationSeconds: order.durationSeconds,
      },
      timeline: order.timeline,
      etaMinutes: Math.max(3, Math.round(order.durationSeconds / 60)),
      co2SavedGrams: order.co2SavedGrams,
      createdAt: order.createdAt,
      pickedUpAt: order.pickedUpAt,
      deliveredAt: order.deliveredAt,
    };
  }

  /**
   * Cập nhật tọa độ GPS tài xế từ Webhook
   */
  updateDriverLocation(orderCode: string, lat: number, lng: number): void {
    const order = this.orders.get(orderCode);
    if (!order || !order.driver) return;

    order.driver.currentLocation = {
      latitude: lat,
      longitude: lng,
      updatedAt: new Date(),
    };
    order.updatedAt = new Date();
  }

  private getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      DRAFT: 'Đang soạn đơn',
      QUOTED: 'Đã báo giá',
      BOOKED: 'Đã đặt đơn',
      PICKING: 'Tài xế đang đến lấy',
      DELIVERING: 'Đang giao hàng',
      DELIVERED: 'Giao thành công',
      RETURNING: 'Đang hoàn trả hàng',
      RETURNED: 'Đã trả về điểm gửi',
      FAILED_DISPATCH: 'Điều xe thất bại',
      CANCELLED: 'Đã hủy đơn',
    };
    return labels[status] || status;
  }
}

export const orderService = new OrderService();
