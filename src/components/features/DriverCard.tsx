'use client';

import React from 'react';
import {
  Phone,
  MessageSquare,
  Star,
  ShieldCheck,
  Leaf,
  Bike,
  Car,
  Truck,
  CheckCircle,
} from 'lucide-react';
import type { DriverInfo } from '@/types/carrier.types';

export interface DriverCardProps {
  driver?: DriverInfo;
  carrierName?: string;
  carrierCode?: string;
}

export function DriverCard({
  driver,
  carrierName = 'Xanh SM Delivery',
  carrierCode = 'XANH_SM',
}: DriverCardProps) {
  if (!driver) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3 text-slate-500 text-xs">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
          <Bike className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <div className="font-semibold text-slate-700">Đang điều phối tài xế gần nhất...</div>
          <div className="text-[11px] text-slate-400">Hệ thống đang phát đơn tới các shipper trong bán kính 2km</div>
        </div>
      </div>
    );
  }

  const isElectric =
    driver.vehicleType === 'ELECTRIC_BIKE' || carrierCode === 'XANH_SM';

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
      {/* Header Profile */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-0.5 shadow-md flex items-center justify-center text-white text-lg font-bold">
              {driver.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={driver.avatarUrl}
                  alt={driver.name}
                  className="w-full h-full rounded-[14px] object-cover"
                  onError={(e) => {
                    // Fallback to initials
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
              <span>{driver.name.split(' ').pop()?.slice(0, 2) || 'TX'}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
              <ShieldCheck className="w-3 h-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base text-slate-900">{driver.name}</h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Đã xác minh
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <div className="flex items-center gap-1 font-semibold text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>4.95</span>
                <span className="text-slate-400 font-normal">(1.420 chuyến)</span>
              </div>
              <span>•</span>
              <span className="font-medium text-slate-600">{carrierName}</span>
            </div>
          </div>
        </div>

        {/* Biển số xe thiết kế kiểu biển số xe máy */}
        <div className="bg-white border-2 border-slate-800 rounded-lg px-2.5 py-1 text-center shadow-xs">
          <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase leading-none">
            VIỆT NAM
          </div>
          <div className="text-xs sm:text-sm font-black tracking-wider text-slate-900 leading-tight">
            {driver.licensePlate}
          </div>
        </div>
      </div>

      {/* Thông tin Phương tiện & Dòng xe điện */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isElectric
                ? 'bg-teal-100 text-teal-700 border border-teal-200'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isElectric ? <Leaf className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-slate-800">
              {driver.vehicleModel || (isElectric ? 'VinFast Feliz S' : 'Honda Wave RSX')}
            </div>
            <div className="text-[11px] text-slate-500">
              {isElectric
                ? 'Xe máy điện 100% không mùi xăng khói bụi'
                : 'Xe máy đạt chuẩn an toàn kỹ thuật'}
            </div>
          </div>
        </div>

        {isElectric && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            🌿 VinFast EV
          </span>
        )}
      </div>

      {/* Nút Gọi & Nhắn Tin Tài Xế */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <a
          href={`tel:${driver.phone}`}
          aria-label={`Gọi điện thoại trực tiếp cho tài xế ${driver.name} qua số điện thoại ${driver.phone}`}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          <span>Gọi Tài Xế ({driver.phone})</span>
        </a>

        <a
          href={`sms:${driver.phone}`}
          aria-label={`Gửi tin nhắn SMS cho tài xế ${driver.name}`}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 font-bold text-xs border border-slate-300/80 transition focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <MessageSquare className="w-4 h-4 text-slate-600" aria-hidden="true" />
          <span>Nhắn Tin SMS</span>
        </a>
      </div>
    </div>
  );
}
