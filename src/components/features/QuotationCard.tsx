'use client';

import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Leaf,
  Sparkles,
  TrendingDown,
  Shield,
  Zap,
} from 'lucide-react';
import type { CarrierQuoteItem, CarrierCode } from '@/types/carrier.types';
import { SmartBadge } from '@/components/common/SmartBadge';
import { formatVND, formatMinutes } from '@/lib/formatters';

export interface QuotationCardProps {
  quote: CarrierQuoteItem;
  isSelected: boolean;
  onSelect: (quote: CarrierQuoteItem) => void;
  isTimeoutOrUnavailable?: boolean;
}

// Bảng màu & logo đại diện cho từng hãng
const CARRIER_CONFIG: Record<
  CarrierCode,
  {
    name: string;
    brandColor: string;
    lightBg: string;
    borderActive: string;
    tagline: string;
    evPowered?: boolean;
  }
> = {
  GRAB: {
    name: 'GrabExpress',
    brandColor: '#00B14F',
    lightBg: 'bg-[#E8F8F0]',
    borderActive: 'border-[#00B14F] ring-[#00B14F]',
    tagline: 'Mạng lưới shipper đông đảo nhất',
  },
  SHOPEE_FOOD: {
    name: 'ShopeeFood Instant',
    brandColor: '#EE4D2D',
    lightBg: 'bg-[#FEEFEA]',
    borderActive: 'border-[#EE4D2D] ring-[#EE4D2D]',
    tagline: 'Tối ưu cho giao đồ ăn & quà tặng',
  },
  XANH_SM: {
    name: 'Xanh SM Delivery',
    brandColor: '#008B8B',
    lightBg: 'bg-[#E6F7F7]',
    borderActive: 'border-[#008B8B] ring-[#008B8B]',
    tagline: '100% Xe điện VinFast không khói bụi',
    evPowered: true,
  },
  AHAMOVE: {
    name: 'Ahamove',
    brandColor: '#FF5722',
    lightBg: 'bg-[#FFF0EB]',
    borderActive: 'border-[#FF5722] ring-[#FF5722]',
    tagline: 'Giao hàng chuyên nghiệp cho chủ shop',
  },
  BE: {
    name: 'beDelivery',
    brandColor: '#F59E0B',
    lightBg: 'bg-[#FEF9E7]',
    borderActive: 'border-[#F59E0B] ring-[#F59E0B]',
    tagline: 'Cước phí cạnh tranh mọi khung giờ',
  },
  SANDBOX_MOCK: {
    name: 'Sandbox Mock Express',
    brandColor: '#6366F1',
    lightBg: 'bg-[#EEF2FF]',
    borderActive: 'border-[#6366F1] ring-[#6366F1]',
    tagline: 'Cổng thử nghiệm mô phỏng lập trình viên',
  },
};

export function QuotationCard({
  quote,
  isSelected,
  onSelect,
  isTimeoutOrUnavailable = false,
}: QuotationCardProps) {
  const config = CARRIER_CONFIG[quote.carrierCode] || {
    name: quote.carrierServiceName || quote.carrierCode,
    brandColor: '#2563EB',
    lightBg: 'bg-blue-50',
    borderActive: 'border-blue-600 ring-blue-600',
    tagline: 'Dịch vụ giao hàng',
  };

  if (isTimeoutOrUnavailable) {
    return (
      <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-100/70 opacity-60 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: config.brandColor }}
          />
          <div>
            <span className="font-semibold text-slate-700">{config.name}</span>
            <span className="ml-2 text-[11px] text-slate-400">
              (Hệ thống đối tác tạm gián đoạn hoặc quá tải)
            </span>
          </div>
        </div>
        <span className="text-[11px] font-medium bg-slate-200 px-2 py-0.5 rounded text-slate-600">
          Tạm ngắt
        </span>
      </div>
    );
  }

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      aria-label={`Chọn hãng ${config.name}, gói ${quote.carrierServiceName}, cước phí ${formatVND(quote.finalTotalFee)}, tài xế tới lấy khoảng ${formatMinutes(quote.estimatedPickupMinutes)}, dự kiến giao trong ${formatMinutes(quote.totalEstimatedMinutes)}`}
      onClick={() => onSelect(quote)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(quote);
        }
      }}
      className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isSelected
          ? `bg-white border-2 shadow-md ring-2 ring-opacity-20 ${config.borderActive}`
          : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-xs hover:border-slate-300'
      }`}
    >
      {/* Top Bar: Carrier Brand + Badges */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          {/* Logo Dot with Brand Color */}
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white shadow-xs flex-shrink-0"
            style={{ backgroundColor: config.brandColor }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition">
                {config.name}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                • {quote.carrierServiceName}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">{config.tagline}</div>
          </div>
        </div>

        {/* Smart Badge nếu có */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {quote.badge && (
            <SmartBadge
              type={quote.badge}
              extraText={
                quote.badge === 'GREENEST' && quote.co2SavingGrams
                  ? `-${quote.co2SavingGrams}g CO2`
                  : undefined
              }
            />
          )}

          {/* Icon Checkmark khi được chọn */}
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-blue-600 text-white scale-110 shadow-xs'
                : 'border border-slate-300 text-transparent group-hover:border-slate-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Middle Section: Price & Time */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2.5 border-y border-slate-100 my-2 text-xs">
        {/* Cước phí */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Cước Phí Trọn Gói</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-slate-900 tracking-tight">
              {formatVND(quote.finalTotalFee)}
            </span>
            {quote.discountAmount > 0 && (
              <span className="text-xs text-slate-400 line-through">
                {formatVND(quote.carrierOriginalTotal)}
              </span>
            )}
          </div>
          {quote.savingsVnd && quote.savingsVnd > 0 ? (
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
              <TrendingDown className="w-3 h-3" /> Tiết kiệm {formatVND(quote.savingsVnd)}
            </span>
          ) : null}
        </div>

        {/* Thời gian lấy hàng */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Tài Xế Tới Lấy</span>
          <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>~{formatMinutes(quote.estimatedPickupMinutes)}</span>
          </div>
          <span className="text-[10px] text-slate-400">Shipper gần điểm nhận</span>
        </div>

        {/* Tổng thời gian giao */}
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Dự Kiến Giao Xong</span>
          <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>~{formatMinutes(quote.totalEstimatedMinutes)}</span>
          </div>
          <span className="text-[10px] text-slate-400">Từ lúc đặt đơn</span>
        </div>
      </div>

      {/* Footer Card: Green Impact & Select Action */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="flex items-center gap-2">
          {config.evPowered && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              <Leaf className="w-3 h-3 text-teal-600" /> Xe máy điện VinFast Feliz / Klara
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(quote);
          }}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
            isSelected
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700'
          }`}
        >
          {isSelected ? 'Đã Chọn' : 'Chọn Hãng Này'}
        </button>
      </div>
    </div>
  );
}
