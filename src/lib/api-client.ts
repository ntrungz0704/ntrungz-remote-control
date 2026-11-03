import type {
  CarrierQuoteRequest,
  AggregatedQuoteResult,
  CarrierCode,
  DriverInfo,
  TrackingTimelineEvent,
} from '@/types/carrier.types';
import type { ApiSuccessResponse, ApiErrorResponse } from '@/types/api.types';
import type { CreateOrderDto, OrderRecord, OrderStatus } from '@/services/order.service';
import type { GeneratedVietQrResult } from '@/lib/vietqr';
import type { WalletTransactionRecord } from '@/services/wallet.service';

export interface WalletData {
  balance: number;
  holdBalance: number;
  availableBalance: number;
  currency: 'VND';
  recentTransactions: WalletTransactionRecord[];
}

export interface PublicTrackingData {
  orderCode: string;
  trackingToken: string;
  status: OrderStatus;
  statusLabel: string;
  carrier: {
    code: CarrierCode;
    name: string;
    logoUrl: string;
  };
  driver?: DriverInfo;
  route: {
    pickupAddress: string;
    dropoffAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffLatitude: number;
    dropoffLongitude: number;
    distanceMeters: number;
    durationSeconds: number;
  };
  timeline: TrackingTimelineEvent[];
  etaMinutes: number;
  co2SavedGrams?: number;
  createdAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

/**
 * Trợ giúp sinh UUIDv4 ngẫu nhiên an toàn cho trình duyệt
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Lớp điều khiển gọi API phía Frontend
 */
export const apiClient = {
  /**
   * So sánh cước đa hãng đồng thời
   */
  async getQuotes(request: CarrierQuoteRequest): Promise<AggregatedQuoteResult> {
    const traceId = generateUUID();
    const res = await fetch('/api/v1/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': traceId,
      },
      body: JSON.stringify(request),
    });

    const json = (await res.json()) as ApiSuccessResponse<AggregatedQuoteResult> | ApiErrorResponse;
    if (!res.ok || !json.success) {
      const err = (json as ApiErrorResponse).error;
      throw new Error(err?.message || 'Không thể lấy báo giá đa hãng');
    }

    return (json as ApiSuccessResponse<AggregatedQuoteResult>).data;
  },

  /**
   * Đặt đơn hàng 1-click có chống click đúp Idempotency
   */
  async createOrder(data: CreateOrderDto, idempotencyKey?: string): Promise<OrderRecord> {
    const key = idempotencyKey || generateUUID();
    const traceId = generateUUID();

    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        'x-request-id': traceId,
      },
      body: JSON.stringify(data),
    });

    const json = (await res.json()) as ApiSuccessResponse<OrderRecord> | ApiErrorResponse;
    if (!res.ok || !json.success) {
      const err = (json as ApiErrorResponse).error;
      throw new Error(err?.message || 'Không thể tạo đơn hàng');
    }

    return (json as ApiSuccessResponse<OrderRecord>).data;
  },

  /**
   * Lấy chi tiết đơn hàng theo orderCode
   */
  async getOrder(orderCode: string): Promise<OrderRecord> {
    const res = await fetch(`/api/v1/orders/${encodeURIComponent(orderCode)}`);
    const json = (await res.json()) as ApiSuccessResponse<OrderRecord> | ApiErrorResponse;
    if (!res.ok || !json.success) {
      throw new Error((json as ApiErrorResponse).error?.message || 'Không tìm thấy đơn hàng');
    }
    return (json as ApiSuccessResponse<OrderRecord>).data;
  },

  /**
   * Hủy đơn hàng và hoàn tiền ví
   */
  async cancelOrder(orderCode: string, reason: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/v1/orders/${encodeURIComponent(orderCode)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    const json = (await res.json()) as ApiSuccessResponse<{ success: boolean; message: string }> | ApiErrorResponse;
    if (!res.ok || !json.success) {
      throw new Error((json as ApiErrorResponse).error?.message || 'Không thể hủy đơn hàng');
    }
    return (json as ApiSuccessResponse<{ success: boolean; message: string }>).data;
  },

  /**
   * Lấy danh sách đơn hàng có lọc và phân trang
   */
  async getOrders(params?: {
    status?: OrderStatus;
    carrierCode?: CarrierCode;
    page?: number;
    limit?: number;
  }): Promise<{ orders: OrderRecord[]; totalCount: number; page: number; limit: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.carrierCode) query.set('carrierCode', params.carrierCode);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`/api/v1/orders?${query.toString()}`);
    const json = (await res.json()) as ApiSuccessResponse<OrderRecord[]> | ApiErrorResponse;
    if (!res.ok || !json.success) {
      throw new Error((json as ApiErrorResponse).error?.message || 'Lỗi khi tải danh sách đơn');
    }

    const metadata = (json as ApiSuccessResponse<OrderRecord[]>).metadata || {};
    return {
      orders: (json as ApiSuccessResponse<OrderRecord[]>).data,
      totalCount: Number(metadata.totalCount || 0),
      page: Number(metadata.page || 1),
      limit: Number(metadata.limit || 20),
    };
  },

  /**
   * Tra cứu Live Tracking công khai
   */
  async getPublicTracking(trackingNumber: string): Promise<PublicTrackingData> {
    const res = await fetch(`/api/v1/tracking/${encodeURIComponent(trackingNumber)}`);
    const json = (await res.json()) as ApiSuccessResponse<PublicTrackingData> | ApiErrorResponse;
    if (!res.ok || !json.success) {
      throw new Error((json as ApiErrorResponse).error?.message || 'Không tìm thấy thông tin tra cứu');
    }
    return (json as ApiSuccessResponse<PublicTrackingData>).data;
  },

  /**
   * Lấy thông tin ví và số dư khả dụng
   */
  async getWallet(): Promise<WalletData> {
    const res = await fetch('/api/v1/wallet');
    const json = (await res.json()) as ApiSuccessResponse<WalletData> | ApiErrorResponse;
    if (!res.ok || !json.success) {
      throw new Error((json as ApiErrorResponse).error?.message || 'Không thể lấy thông tin ví');
    }
    return (json as ApiSuccessResponse<WalletData>).data;
  },

  /**
   * Tạo yêu cầu nạp ví VietQR Napas 24/7
   */
  async createTopup(amount: number): Promise<GeneratedVietQrResult> {
    const res = await fetch('/api/v1/wallet/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paymentMethod: 'VIETQR' }),
    });

    const json = (await res.json()) as ApiSuccessResponse<GeneratedVietQrResult> | ApiErrorResponse;
    if (!res.ok || !json.success) {
      throw new Error((json as ApiErrorResponse).error?.message || 'Lỗi khi tạo mã nạp VietQR');
    }
    return (json as ApiSuccessResponse<GeneratedVietQrResult>).data;
  },
};
