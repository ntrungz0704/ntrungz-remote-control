'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Clock,
  Sparkles,
  Trophy,
  Zap,
  Leaf,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  MapPin,
  Filter,
  CheckCircle2,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { RouteInputForm, PRESET_ROUTES } from '@/components/features/RouteInputForm';
import { QuotationCard } from '@/components/features/QuotationCard';
import { LiveTrackingMap } from '@/components/features/LiveTrackingMap';
import { apiClient } from '@/lib/api-client';
import type {
  CarrierQuoteRequest,
  AggregatedQuoteResult,
  CarrierQuoteItem,
  SmartBadge,
} from '@/types/carrier.types';
import { formatVND, formatMinutes, formatDistance } from '@/lib/formatters';
import { useToast } from '@/components/common/Toast';

export default function QuoteComparisonPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [quoteRequest, setQuoteRequest] = useState<CarrierQuoteRequest | null>(null);
  const [quoteResult, setQuoteResult] = useState<AggregatedQuoteResult | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<CarrierQuoteItem | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // TTL Countdown (5 phút = 300 giây)
  const [remainingTtlSeconds, setRemainingTtlSeconds] = useState<number>(300);
  const [isExpired, setIsExpired] = useState(false);

  // Bộ lọc sắp xếp: CHEAPEST (Mặc định) | FASTEST | RECOMMENDED
  const [sortBy, setSortBy] = useState<'CHEAPEST' | 'FASTEST' | 'RECOMMENDED'>('CHEAPEST');

  // Mobile Map Drawer toggle
  const [showMobileMap, setShowMobileMap] = useState(false);

  // Tự động kiểm tra xem có prefill request từ Trang Chủ hay không
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('fsh_prefill_quote');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          sessionStorage.removeItem('fsh_prefill_quote');
          handleFetchQuotes(parsed);
          return;
        } catch {
          // Ignored
        }
      }
      // Nếu chưa có, kích hoạt báo giá với lộ trình mẫu Hà Nội mặc định
      const defaultReq: CarrierQuoteRequest = {
        pickup: PRESET_ROUTES[0].pickup,
        dropoff: PRESET_ROUTES[0].dropoff,
        packageDetails: {
          name: 'Hộp quà thời trang cao cấp',
          weightInGrams: 1500,
          lengthCm: 25,
          widthCm: 20,
          heightCm: 10,
          packageType: 'FASHION',
          declaredValueVnd: 500000,
          codAmountVnd: 0,
          deliverToDoor: true,
        },
        serviceTier: 'BIKE_INSTANT',
      };
      handleFetchQuotes(defaultReq);
    }
  }, []);

  // Đếm ngược TTL 300s
  useEffect(() => {
    if (!quoteResult || isExpired) return;

    const timer = setInterval(() => {
      setRemainingTtlSeconds((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quoteResult, isExpired]);

  const handleFetchQuotes = async (req: CarrierQuoteRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsExpired(false);
    setRemainingTtlSeconds(300);
    setQuoteRequest(req);

    try {
      const result = await apiClient.getQuotes(req);
      setQuoteResult(result);

      // Tự động chọn gói rẻ nhất hoặc tốt nhất ban đầu
      if (result.quotes.length > 0) {
        const best =
          result.quotes.find((q) => q.badge === 'CHEAPEST') ||
          result.quotes.find((q) => q.badge === 'BEST_VALUE') ||
          result.quotes[0];
        setSelectedQuote(best);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Lỗi khi so sánh cước';
      setErrorMessage(msg);
      toastError('Không thể lấy báo giá', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Sắp xếp danh sách báo giá
  const sortedQuotes = React.useMemo(() => {
    if (!quoteResult) return [];
    const list = [...quoteResult.quotes];

    if (sortBy === 'CHEAPEST') {
      return list.sort((a, b) => a.finalTotalFee - b.finalTotalFee);
    }
    if (sortBy === 'FASTEST') {
      return list.sort((a, b) => a.totalEstimatedMinutes - b.totalEstimatedMinutes);
    }
    if (sortBy === 'RECOMMENDED') {
      return list.sort((a, b) => {
        if (a.badge === 'BEST_VALUE') return -1;
        if (b.badge === 'BEST_VALUE') return 1;
        if (a.badge === 'CHEAPEST') return -1;
        return a.finalTotalFee - b.finalTotalFee;
      });
    }
    return list;
  }, [quoteResult, sortBy]);

  // Điều hướng sang màn hình Đặt đơn 1-click
  const handleProceedToBooking = () => {
    if (!selectedQuote || !quoteRequest || !quoteResult) {
      toastError('Vui lòng chọn 1 gói cước để tiếp tục');
      return;
    }

    const bookingPayload = {
      quote: selectedQuote,
      request: quoteRequest,
      route: quoteResult.route,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fsh_booking_data', JSON.stringify(bookingPayload));
    }

    router.push('/orders/new');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-[calc(100vh-64px)]">
      {/* Top Bar Sub-header: Title & TTL Timer */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                So Sánh Giá Cước Thời Gian Thực
              </h1>
              <span className="text-xs text-slate-500">
                {quoteResult ? (
                  <>
                    Cự ly: <strong>{formatDistance(quoteResult.route.distanceMeters)}</strong> • Dự kiến:{' '}
                    <strong>{formatMinutes(quoteResult.route.durationSeconds / 60)}</strong>
                  </>
                ) : (
                  'Kết nối song song 6 hãng vận chuyển'
                )}
              </span>
            </div>
          </div>

          {/* Đồng hồ đếm ngược 5 phút (TTL) */}
          <div className="flex items-center gap-2">
            {quoteResult && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  isExpired
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : remainingTtlSeconds < 60
                    ? 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>
                  {isExpired
                    ? 'Giá cước đã hết hạn'
                    : `Giữ giá: ${Math.floor(remainingTtlSeconds / 60)}:${(remainingTtlSeconds % 60)
                        .toString()
                        .padStart(2, '0')}`}
                </span>
                {isExpired && (
                  <button
                    onClick={() => quoteRequest && handleFetchQuotes(quoteRequest)}
                    className="ml-1 text-[11px] underline font-bold"
                  >
                    Làm mới
                  </button>
                )}
              </div>
            )}

            {/* Mobile Toggle Map Button */}
            <button
              onClick={() => setShowMobileMap(!showMobileMap)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>{showMobileMap ? 'Ẩn Bản Đồ' : 'Xem Bản Đồ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Split-View Grid */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          {/* CỘT TRÁI (520px trên Desktop): Form & Danh sách thẻ cước */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-4 flex flex-col">
            {/* Form nhập lộ trình */}
            <RouteInputForm
              initialValues={quoteRequest || undefined}
              onSubmit={handleFetchQuotes}
              isLoading={isLoading}
            />

            {/* Thanh điều khiển lọc và sắp xếp */}
            {quoteResult && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-500 font-medium">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Sắp xếp theo:</span>
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { id: 'CHEAPEST', label: 'Rẻ Nhất' },
                    { id: 'FASTEST', label: 'Nhanh Nhất' },
                    { id: 'RECOMMENDED', label: 'Tối Ưu' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      role="radio"
                      aria-checked={sortBy === s.id}
                      onClick={() => setSortBy(s.id as 'CHEAPEST' | 'FASTEST' | 'RECOMMENDED')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        sortBy === s.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vùng hiển thị Danh sách thẻ cước */}
            <div role="radiogroup" aria-label="Danh sách các tùy chọn cước phí vận chuyển đa hãng" className="relative space-y-3 flex-1">
              {/* Trạng thái 1: Loading Skeleton Shimmer */}
              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full shimmer-card" />
                          <div className="w-28 h-4 rounded shimmer-card" />
                        </div>
                        <div className="w-20 h-5 rounded-full shimmer-card" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-2">
                        <div className="w-24 h-6 rounded shimmer-card" />
                        <div className="w-16 h-6 rounded shimmer-card" />
                        <div className="w-16 h-6 rounded shimmer-card" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Trạng thái 2: Error State */}
              {errorMessage && !isLoading && (
                <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                  <div className="font-bold text-sm">Không thể hoàn thành so sánh cước</div>
                  <div className="text-xs text-rose-700">{errorMessage}</div>
                  <button
                    onClick={() => quoteRequest && handleFetchQuotes(quoteRequest)}
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 transition"
                  >
                    Thử Lại Ngay
                  </button>
                </div>
              )}

              {/* Trạng thái 3: Expired State (Lớp phủ màng kính mờ) */}
              {isExpired && !isLoading && (
                <div className="absolute inset-0 z-20 bg-white/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-3 border border-slate-300">
                  <Clock className="w-10 h-10 text-amber-500 animate-bounce" />
                  <div className="font-bold text-base text-slate-800">
                    Báo giá đã hết hạn giữ chỗ (5 phút)
                  </div>
                  <div className="text-xs text-slate-500 max-w-xs">
                    Để đảm bảo tính chính xác của cước phí theo thời gian thực và thời tiết, vui lòng làm
                    mới giá.
                  </div>
                  <button
                    onClick={() => quoteRequest && handleFetchQuotes(quoteRequest)}
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Làm Mới Giá Cước Ngay</span>
                  </button>
                </div>
              )}

              {/* Trạng thái 4: Danh sách thẻ cước thành công */}
              {!isLoading &&
                !errorMessage &&
                quoteResult &&
                sortedQuotes.map((q) => (
                  <QuotationCard
                    key={`${q.carrierCode}-${q.quoteReferenceId}`}
                    quote={q}
                    isSelected={selectedQuote?.quoteReferenceId === q.quoteReferenceId}
                    onSelect={(quote) => setSelectedQuote(quote)}
                  />
                ))}

              {/* Thẻ hãng bị Timeout hoặc Circuit Open (nếu có) */}
              {!isLoading &&
                quoteResult &&
                quoteResult.failedCarriers.map((f) => (
                  <QuotationCard
                    key={f.carrierCode}
                    quote={
                      {
                        carrierCode: f.carrierCode,
                        carrierServiceName: f.errorMessage,
                        serviceTier: 'BIKE_INSTANT',
                        baseFee: 0,
                        surcharges: 0,
                        discountAmount: 0,
                        carrierOriginalTotal: 0,
                        platformFee: 0,
                        finalTotalFee: 0,
                        estimatedPickupMinutes: 0,
                        estimatedDeliveryMinutes: 0,
                        totalEstimatedMinutes: 0,
                        currency: 'VND',
                        expiredAt: new Date(),
                        quoteReferenceId: `failed_${f.carrierCode}`,
                      } as CarrierQuoteItem
                    }
                    isSelected={false}
                    onSelect={() => {}}
                    isTimeoutOrUnavailable={true}
                  />
                ))}
            </div>
          </div>

          {/* CỘT PHẢI: BẢN ĐỒ LỘ TRÌNH VECTO SVG (Chiếm toàn bộ không gian còn lại trên Desktop) */}
          <div
            className={`lg:col-span-6 xl:col-span-7 flex flex-col ${
              showMobileMap ? 'block' : 'hidden lg:flex'
            }`}
          >
            <div className="sticky top-28 h-[550px] lg:h-[calc(100vh-140px)] w-full">
              {quoteResult ? (
                <LiveTrackingMap
                  pickup={{
                    latitude: quoteResult.origin.latitude,
                    longitude: quoteResult.origin.longitude,
                    address: quoteResult.origin.address,
                  }}
                  dropoff={{
                    latitude: quoteResult.destination.latitude,
                    longitude: quoteResult.destination.longitude,
                    address: quoteResult.destination.address,
                  }}
                  distanceMeters={quoteResult.route.distanceMeters}
                  etaMinutes={Math.round(quoteResult.route.durationSeconds / 60)}
                  statusLabel="Lộ trình di chuyển dự kiến"
                  interactive={true}
                />
              ) : (
                <div className="w-full h-full bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
                  <span>Đang kết nối bản đồ lộ trình...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar trên Mobile & Desktop: Chốt đơn 1-click */}
      {selectedQuote && (
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:px-6 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
                {selectedQuote.carrierCode.slice(0, 3)}
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Hãng đã chọn:</div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedQuote.carrierServiceName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Tổng thanh toán</div>
                <div className="text-lg sm:text-xl font-black text-slate-900">
                  {formatVND(selectedQuote.finalTotalFee)}
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToBooking}
                disabled={isExpired}
                className={`py-3 px-5 sm:px-8 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md flex items-center gap-2 transition active:scale-95 ${
                  isExpired
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/25'
                }`}
              >
                <span>Xác Nhận Đặt Đơn</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
