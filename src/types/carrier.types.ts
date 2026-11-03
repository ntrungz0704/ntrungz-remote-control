// ============================================================================
// FAST-SHIP-HUB — CARRIER DOMAIN TYPES
// Standardized Types & Interfaces for Multi-Carrier Adapters
// ============================================================================

/** Danh sách mã hãng hợp lệ trong toàn hệ thống */
export type CarrierCode =
  | 'GRAB'
  | 'SHOPEE_FOOD'
  | 'XANH_SM'
  | 'AHAMOVE'
  | 'BE'
  | 'SANDBOX_MOCK';

/** Phân hạng phương tiện & dịch vụ vận chuyển */
export type ServiceTier =
  | 'BIKE_INSTANT'
  | 'BIKE_SAME_DAY'
  | 'CAR_DELIVERY'
  | 'TRUCK_500KG';

/** Phân loại gói hàng hóa */
export type PackageType =
  | 'DOCUMENT'
  | 'FOOD'
  | 'FASHION'
  | 'FRAGILE'
  | 'ELECTRONICS';

/** 4 Huy hiệu thông minh gán tự động */
export type SmartBadge =
  | 'CHEAPEST'
  | 'FASTEST'
  | 'GREENEST'
  | 'BEST_VALUE';

/** Loại phương tiện tài xế điều khiển */
export type VehicleType =
  | 'GASOLINE_BIKE'
  | 'ELECTRIC_BIKE'
  | 'CAR'
  | 'TRUCK';

/** Tọa độ địa lý chuẩn WGS84 kèm thông tin liên lạc */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  address: string;
  senderOrReceiverName: string;
  phoneNumber: string;
  note?: string;
}

/** Thông số chi tiết kiện hàng */
export interface PackageDetails {
  name: string;
  weightInGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageType: PackageType;
  declaredValueVnd: number;
  codAmountVnd: number;
  isFragile?: boolean;
  deliverToDoor?: boolean;
  specialInstructions?: string;
}

/** Dữ liệu yêu cầu lấy báo giá */
export interface CarrierQuoteRequest {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  packageDetails: PackageDetails;
  serviceTier: ServiceTier;
}

/** Chi tiết bóc tách thành phần cước */
export interface FareBreakdown {
  baseDistanceKm: number;
  extraDistanceKm: number;
  pricePerNextKm: number;
  nightSurcharge: number;
  rainSurcharge?: number;
  surgeMultiplier: number;
}

/** Gói cước báo giá chuẩn hóa trả về từ Adapter */
export interface CarrierQuoteItem {
  carrierCode: CarrierCode;
  carrierServiceName: string;
  serviceTier: ServiceTier;
  baseFee: number;
  surcharges: number;
  discountAmount: number;
  carrierOriginalTotal: number;
  platformFee: number;
  finalTotalFee: number;
  estimatedPickupMinutes: number;
  estimatedDeliveryMinutes: number;
  totalEstimatedMinutes: number;
  currency: 'VND';
  expiredAt: Date;
  quoteReferenceId: string;
  badge?: SmartBadge | null;
  co2SavingGrams?: number;
  savingsVnd?: number;
  breakdown?: FareBreakdown;
}

/** Kết quả lấy báo giá từ Adapter */
export interface CarrierQuoteResponse {
  success: boolean;
  carrierCode: CarrierCode;
  quote?: CarrierQuoteItem;
  errorMessage?: string;
  errorCode?: string;
  durationMs: number;
}

/** Thông tin vị trí GPS thời gian thực của tài xế */
export interface DriverLocation {
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

/** Thông tin tài xế do hãng cung cấp */
export interface DriverInfo {
  name: string;
  phone: string;
  licensePlate: string;
  vehicleType: VehicleType;
  vehicleModel?: string;
  avatarUrl?: string;
  currentLocation?: DriverLocation;
}

/** Dữ liệu yêu cầu đặt đơn */
export interface CarrierBookingRequest {
  orderCode: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  packageDetails: PackageDetails;
  serviceTier: ServiceTier;
  quoteReferenceId: string;
  notesForDriver?: string;
}

/** Kết quả đặt đơn từ Adapter */
export interface CarrierBookingResponse {
  success: boolean;
  carrierCode: CarrierCode;
  carrierOrderId: string;
  carrierStatus: string;
  normalizedStatus: 'BOOKED' | 'PICKING' | 'FAILED_DISPATCH';
  driver?: DriverInfo;
  trackingUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  rawResponse?: unknown;
}

/** Dữ liệu yêu cầu hủy đơn */
export interface CarrierCancelRequest {
  carrierOrderId: string;
  orderCode: string;
  reason: string;
}

/** Kết quả hủy đơn từ Adapter */
export interface CarrierCancelResponse {
  success: boolean;
  carrierCode: CarrierCode;
  cancellationFee: number;
  message: string;
  errorMessage?: string;
}

/** Dữ liệu tra cứu tracking từ hãng */
export interface CarrierTrackingRequest {
  carrierOrderId: string;
  orderCode: string;
}

/** Mốc sự kiện lịch sử đơn hàng */
export interface TrackingTimelineEvent {
  status: string;
  description: string;
  timestamp: Date;
}

/** Kết quả tra cứu tracking từ Adapter */
export interface CarrierTrackingResponse {
  carrierCode: CarrierCode;
  carrierOrderId: string;
  normalizedStatus:
    | 'BOOKED'
    | 'PICKING'
    | 'DELIVERING'
    | 'DELIVERED'
    | 'RETURNING'
    | 'RETURNED'
    | 'CANCELLED';
  driver?: DriverInfo;
  timeline: TrackingTimelineEvent[];
}

/** Sự kiện Webhook chuẩn hóa từ các hãng */
export interface WebhookNormalizedEvent {
  carrierCode: CarrierCode;
  carrierOrderId: string;
  eventId: string;
  eventType:
    | 'DRIVER_ASSIGNED'
    | 'DRIVER_ARRIVING'
    | 'PICKED_UP'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'LOCATION_UPDATE';
  normalizedStatus:
    | 'PICKING'
    | 'DELIVERING'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'RETURNING'
    | 'RETURNED';
  timestamp: Date;
  driver?: DriverInfo;
  cancellationReason?: string;
  rawPayload: unknown;
}

/** Thất bại của một hãng trong phiên báo giá song song */
export interface FailedCarrierQuote {
  carrierCode: CarrierCode;
  errorCode: string;
  errorMessage: string;
  durationMs: number;
}

/** Tóm tắt thống kê phiên báo giá */
export interface QuoteSummary {
  totalCarriersQueried: number;
  successfulQuotes: number;
  failedCount: number;
  cheapestCarrier?: CarrierCode;
  fastestCarrier?: CarrierCode;
  recommendedCarrier?: CarrierCode;
  ttlSeconds: number;
  expiresAt: Date;
}

/** Kết quả tổng hợp trả về cho Frontend */
export interface AggregatedQuoteResult {
  origin: GeoPoint;
  destination: GeoPoint;
  route: {
    distanceMeters: number;
    durationSeconds: number;
    polyline: string;
  };
  quotes: CarrierQuoteItem[];
  failedCarriers: FailedCarrierQuote[];
  summary: QuoteSummary;
}
