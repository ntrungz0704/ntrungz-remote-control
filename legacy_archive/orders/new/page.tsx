'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Package,
  MapPin,
  Clock,
  Wallet,
  QrCode,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronLeft,
  FileText,
  User,
  Phone,
  Banknote,
  Leaf,
} from 'lucide-react';
import { apiClient, generateUUID, type WalletData } from '@/lib/api-client';
import type { CarrierQuoteItem, CarrierQuoteRequest } from '@/types/carrier.types';
import { formatVND, formatDistance, formatMinutes } from '@/lib/formatters';
import { useToast } from '@/components/common/Toast';
import { WalletWidget } from '@/components/features/WalletWidget';

export default function OrderBookingPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [bookingData, setBookingData] = useState<{
    quote: CarrierQuoteItem;
    request: CarrierQuoteRequest;
    route: { distanceMeters: number; durationSeconds: number };
  } | null>(null);

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'COD'>('WALLET');
  const [notesForDriver, setNotesForDriver] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);

  // Đọc dữ liệu đã chọn từ sessionStorage
  useEffect(() => {
    setIdempotencyKey(generateUUID());

    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('fsh_booking_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setBookingData(parsed);
          setNotesForDriver(parsed.request.dropoff.note || '');
        } catch {
          // Fallback
        }
      } else {
        // Chưa chọn cước, quay về /quote
        router.push('/quote');
      }
    }

    // Nạp thông tin ví
    apiClient.getWallet().then(setWallet).catch(() => {});
  }, [router]);

  if (!bookingData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-xs">
        <span>Đang kiểm tra gói cước đặt đơn...</span>
      </div>
    );
  }

  const { quote, request, route } = bookingData;
  const isBalanceEnough = wallet ? wallet.availableBalance >= quote.finalTotalFee : true;

  const handleConfirmOrder = async () => {
    if (paymentMethod === 'WALLET' && wallet && wallet.availableBalance < quote.finalTotalFee) {
      toastError(
        'Số dư ví không đủ',
        `Ví của bạn còn ${formatVND(wallet.availableBalance)}, cần nạp thêm ${formatVND(
          quote.finalTotalFee - wallet.availableBalance
        )}`
      );
      setIsTopupModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await apiClient.createOrder(
        {
          quoteReferenceId: quote.quoteReferenceId,
          carrierCode: quote.carrierCode,
          serviceTier: quote.serviceTier,
          pickup: request.pickup,
          dropoff: request.dropoff,
          packageDetails: request.packageDetails,
          paymentMethod,
          notesForDriver,
        },
        idempotencyKey
      );

      toastSuccess(
        'Đặt đơn thành công!',
        `Mã đơn: ${order.orderCode} • Đã kết nối tới hãng ${quote.carrierServiceName}`
      );

      // Xóa session booking tạm
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fsh_booking_data');
      }

      // Điều hướng ngay tới màn hình Live Tracking công khai
      router.push(`/track/${encodeURIComponent(order.trackingToken)}`);
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Không thể tạo đơn hàng';
      toastError('Lỗi đặt đơn', msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/quote"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại danh sách so sánh cước
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            Idempotency-Key: {idempotencyKey.slice(0, 8)}...
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* CỘT TRÁI (8/12): Chi tiết đơn hàng & Thanh toán */}
          <div className="md:col-span-8 space-y-5">
            {/* 1. Hãng vận chuyển đã chọn */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Dịch Vụ Vận Chuyển Đã Chọn
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ⚡ Điều phối tức thì
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-sm text-blue-700">
                    {quote.carrierCode.slice(0, 3)}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900">
                      {quote.carrierServiceName}
                    </h2>
                    <div className="text-xs text-slate-500">
                      Cự ly: {formatDistance(route.distanceMeters)} • Dự kiến lấy:{' '}
                      <strong>{formatMinutes(quote.estimatedPickupMinutes)}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">
                    {formatVND(quote.finalTotalFee)}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold">Đã gồm VAT & Phí sàn</div>
                </div>
              </div>

              {quote.co2SavingGrams && quote.co2SavingGrams > 0 && (
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>
                    Chuyến xe sử dụng 100% xe máy điện VinFast, tiết kiệm <strong>{quote.co2SavingGrams}g CO2</strong> cho môi trường.
                  </span>
                </div>
              )}
            </div>

            {/* 2. Địa chỉ lấy và giao */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Lộ Trình Giao Nhận
              </span>

              {/* Điểm lấy */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  A
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="font-bold text-slate-800">
                    {request.pickup.senderOrReceiverName} ({request.pickup.phoneNumber})
                  </div>
                  <div className="text-slate-600">{request.pickup.address}</div>
                  {request.pickup.note && (
                    <div className="text-slate-400 italic">Ghi chú: {request.pickup.note}</div>
                  )}
                </div>
              </div>

              <div className="border-l-2 border-dashed border-slate-200 ml-3 h-4" />

              {/* Điểm giao */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  B
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="font-bold text-slate-800">
                    {request.dropoff.senderOrReceiverName} ({request.dropoff.phoneNumber})
                  </div>
                  <div className="text-slate-600">{request.dropoff.address}</div>
                  {request.dropoff.note && (
                    <div className="text-slate-400 italic">Ghi chú: {request.dropoff.note}</div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Kiện hàng & Ghi chú cho tài xế */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Thông Tin Kiện Hàng & Ghi Chú
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 block">Kiện hàng:</span>
                  <span className="font-bold text-slate-800">{request.packageDetails.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Khối lượng:</span>
                  <span className="font-bold text-slate-800">
                    {request.packageDetails.weightInGrams} gram
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Tiền thu hộ COD:</span>
                  <span className="font-bold text-amber-700">
                    {request.packageDetails.codAmountVnd > 0
                      ? formatVND(request.packageDetails.codAmountVnd)
                      : 'Không thu COD'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Lời nhắn thêm cho tài xế khi giao:
                </label>
                <input
                  type="text"
                  placeholder="VD: Cho kiểm tra hàng trước khi nhận, gọi trước 10 phút..."
                  value={notesForDriver}
                  onChange={(e) => setNotesForDriver(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (4/12): Phương thức thanh toán & Nút Xác nhận */}
          <div className="md:col-span-4 space-y-5">
            {/* Thẻ Chọn Phương thức Thanh toán */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" /> Phương Thức Thanh Toán
              </h3>

              <div className="space-y-2.5">
                {/* Lựa chọn 1: Ví Trả Trước (WALLET) */}
                <div
                  onClick={() => setPaymentMethod('WALLET')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'WALLET'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-blue-600" /> Ví Trả Trước Của Shop
                    </span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'WALLET'}
                      onChange={() => setPaymentMethod('WALLET')}
                      className="text-blue-600"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Số dư khả dụng:</span>
                    <span
                      className={`font-bold ${
                        isBalanceEnough ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {wallet ? formatVND(wallet.availableBalance) : '2.000.000 đ'}
                    </span>
                  </div>

                  {!isBalanceEnough && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTopupModalOpen(true);
                      }}
                      className="mt-2 w-full py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1"
                    >
                      <QrCode className="w-3 h-3" /> Nạp Thêm Tiền VietQR
                    </button>
                  )}
                </div>

                {/* Lựa chọn 2: Người nhận thanh toán tiền mặt (COD) */}
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'COD'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-amber-600" /> Người Nhận Trả Tiền Mặt
                    </span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="text-blue-600"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tài xế thu cước trực tiếp từ người nhận khi giao
                  </div>
                </div>
              </div>

              {/* Chi tiết cước thanh toán */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Cước vận chuyển:</span>
                  <span>{formatVND(quote.baseFee)}</span>
                </div>
                {quote.surcharges > 0 && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Phụ phí cao điểm / mưa:</span>
                    <span>{formatVND(quote.surcharges)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-500">
                  <span>Phí sàn FAST-SHIP-HUB:</span>
                  <span>{formatVND(quote.platformFee)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-black text-sm text-slate-900">
                  <span>Tổng thanh toán:</span>
                  <span className="text-base text-blue-700">{formatVND(quote.finalTotalFee)}</span>
                </div>
              </div>

              {/* Nút bấm Đặt Đơn */}
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition active:scale-98 ${
                  isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/25'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang điều phối shipper...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận Đặt Đơn 1-Click</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Bảo vệ chống trừ tiền lặp lại (Idempotent)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal nạp tiền VietQR dự phòng nếu số dư không đủ */}
      {isTopupModalOpen && (
        <WalletWidget
          isOpenModal={isTopupModalOpen}
          onCloseModal={() => {
            setIsTopupModalOpen(false);
            apiClient.getWallet().then(setWallet).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
