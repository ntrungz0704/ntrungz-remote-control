'use client';

import React, { useMemo, useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Clock,
  Layers,
  Bike,
} from 'lucide-react';
import { formatDistance, formatMinutes } from '@/lib/formatters';

export interface LiveTrackingMapProps {
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff: {
    latitude: number;
    longitude: number;
    address: string;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    updatedAt?: Date | string;
  };
  driverName?: string;
  driverPhone?: string;
  vehicleType?: string;
  distanceMeters?: number;
  etaMinutes?: number;
  statusLabel?: string;
  interactive?: boolean;
}

export function LiveTrackingMap({
  pickup,
  dropoff,
  driverLocation,
  driverName = 'Tài xế đối tác',
  vehicleType = 'ELECTRIC_BIKE',
  distanceMeters = 4200,
  etaMinutes = 15,
  statusLabel = 'Đang di chuyển giao hàng',
  interactive = true,
}: LiveTrackingMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  // Tính toán khung tọa độ chuẩn (Bounding Box) để fit vào SVG ViewBox (800 x 500)
  const mapProjection = useMemo(() => {
    const lats = [pickup.latitude, dropoff.latitude];
    const lngs = [pickup.longitude, dropoff.longitude];

    if (driverLocation) {
      lats.push(driverLocation.latitude);
      lngs.push(driverLocation.longitude);
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Padding thêm để các marker không bị chạm viền
    const latSpan = Math.max(0.005, maxLat - minLat);
    const lngSpan = Math.max(0.005, maxLng - minLng);

    const padLat = latSpan * 0.25;
    const padLng = lngSpan * 0.25;

    const bMinLat = minLat - padLat;
    const bMaxLat = maxLat + padLat;
    const bMinLng = minLng - padLng;
    const bMaxLng = maxLng + padLng;

    // Chuyển lat/lng sang tọa độ SVG viewBox 800 x 500
    const project = (lat: number, lng: number) => {
      const x = ((lng - bMinLng) / (bMaxLng - bMinLng)) * 800;
      // Trục Y của SVG ngược chiều so với vĩ độ
      const y = (1 - (lat - bMinLat) / (bMaxLat - bMinLat)) * 500;
      return { x, y };
    };

    const pPickup = project(pickup.latitude, pickup.longitude);
    const pDropoff = project(dropoff.latitude, dropoff.longitude);

    let pDriver = null;
    if (driverLocation) {
      pDriver = project(driverLocation.latitude, driverLocation.longitude);
    } else {
      // Nếu chưa có vị trí shipper, giả định tài xế đang ở 40% hành trình
      pDriver = {
        x: pPickup.x + (pDropoff.x - pPickup.x) * 0.45,
        y: pPickup.y + (pDropoff.y - pPickup.y) * 0.45,
      };
    }

    // Tạo đường cong lộ trình mượt mà (Bézier Curve)
    const midX = (pPickup.x + pDropoff.x) / 2 + (pDropoff.y - pPickup.y) * 0.15;
    const midY = (pPickup.y + pDropoff.y) / 2 - (pDropoff.x - pPickup.x) * 0.15;
    const pathD = `M ${pPickup.x} ${pPickup.y} Q ${midX} ${midY} ${pDropoff.x} ${pDropoff.y}`;

    return {
      pPickup,
      pDropoff,
      pDriver,
      pathD,
    };
  }, [pickup, dropoff, driverLocation]);

  return (
    <div className="relative w-full h-full min-h-[340px] sm:min-h-[440px] rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-900 shadow-inner flex flex-col select-none">
      {/* HUD Header Bar: Status & ETA */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{statusLabel}</span>
              <span className="text-[10px] text-slate-400 font-normal">• {formatDistance(distanceMeters)}</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">
              Vị trí GPS cập nhật tự động mỗi 3 giây
            </div>
          </div>
        </div>

        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-right">
          <Clock className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Dự kiến tới</div>
            <div className="text-xs font-black text-amber-300">~{formatMinutes(etaMinutes)}</div>
          </div>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative flex-1 w-full h-full bg-[#0B132B] overflow-hidden flex items-center justify-center">
        {/* Lưới giả lập bản đồ không gian số (Cyber Grid Pattern) */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #4f46e5 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Bản đồ Vector SVG tương tác */}
        <svg
          role="img"
          aria-label={`Bản đồ lộ trình giao hàng thời gian thực từ ${pickup.address} tới ${dropoff.address}`}
          viewBox="0 0 800 500"
          className="w-full h-full max-h-full object-contain transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <title>Bản đồ lộ trình và vị trí tài xế giao hàng live</title>
          <defs>
            {/* Gradient cho đường lộ trình */}
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>

            {/* Bộ lọc ánh sáng phát quang Glow */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Đường bóng mờ hào quang phía sau (Glow Aura) */}
          <path
            d={mapProjection.pathD}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="10"
            strokeOpacity="0.25"
            filter="url(#glow)"
          />

          {/* Đường Polyline lộ trình di chuyển chính */}
          <path
            d={mapProjection.pathD}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="6 4"
            className="animate-pulse"
          />

          {/* Marker 1: ĐIỂM LẤY HÀNG (PICKUP - Xanh lá) */}
          <g transform={`translate(${mapProjection.pPickup.x}, ${mapProjection.pPickup.y})`}>
            <circle r="14" fill="#10B981" fillOpacity="0.25" className="animate-ping" />
            <circle r="9" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle r="3.5" fill="#FFFFFF" />
            {/* Nhãn điểm lấy hàng */}
            <g transform="translate(0, -18)">
              <rect
                x="-45"
                y="-18"
                width="90"
                height="18"
                rx="5"
                fill="#0F172A"
                fillOpacity="0.9"
                stroke="#10B981"
                strokeWidth="1"
              />
              <text
                x="0"
                y="-6"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                📦 ĐIỂM LẤY HÀNG
              </text>
            </g>
          </g>

          {/* Marker 2: ĐIỂM GIAO HÀNG (DROPOFF - Cam đỏ) */}
          <g transform={`translate(${mapProjection.pDropoff.x}, ${mapProjection.pDropoff.y})`}>
            <circle r="14" fill="#F43F5E" fillOpacity="0.25" className="animate-ping" />
            <circle r="9" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle r="3.5" fill="#FFFFFF" />
            {/* Nhãn điểm giao hàng */}
            <g transform="translate(0, -18)">
              <rect
                x="-45"
                y="-18"
                width="90"
                height="18"
                rx="5"
                fill="#0F172A"
                fillOpacity="0.9"
                stroke="#F43F5E"
                strokeWidth="1"
              />
              <text
                x="0"
                y="-6"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                🚩 ĐIỂM GIAO HÀNG
              </text>
            </g>
          </g>

          {/* Marker 3: VỊ TRÍ TÀI XẾ SHIPPER DI CHUYỂN LIVE */}
          {mapProjection.pDriver && (
            <g
              transform={`translate(${mapProjection.pDriver.x}, ${mapProjection.pDriver.y})`}
              className="transition-all duration-1000 ease-linear"
            >
              {/* Radar pulse phát sóng */}
              <circle r="26" fill="#38BDF8" fillOpacity="0.18" className="animate-ping" />
              <circle r="17" fill="#0284C7" fillOpacity="0.4" />

              {/* Vòng tròn định vị tài xế */}
              <circle r="12" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" filter="url(#glow)" />

              {/* Icon phương tiện */}
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fontSize="12"
                fill="#FFFFFF"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                🛵
              </text>

              {/* Tooltip tên tài xế */}
              <g transform="translate(0, 24)">
                <rect
                  x="-60"
                  y="0"
                  width="120"
                  height="22"
                  rx="6"
                  fill="#0F172A"
                  fillOpacity="0.95"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="14"
                  textAnchor="middle"
                  fill="#BAE6FD"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  ⚡ {driverName}
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Nút điều khiển tương tác Bản đồ (Zoom In/Out, Reset View) */}
        {interactive && (
          <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none focus:ring-1 focus:ring-sky-400"
              aria-label="Phóng to bản đồ"
              title="Phóng to bản đồ"
            >
              <ZoomIn className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none focus:ring-1 focus:ring-sky-400"
              aria-label="Thu nhỏ bản đồ"
              title="Thu nhỏ bản đồ"
            >
              <ZoomOut className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none focus:ring-1 focus:ring-sky-400"
              aria-label="Khôi phục góc nhìn ban đầu"
              title="Khôi phục góc nhìn"
            >
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Chú giải góc dưới bản đồ (Legend) */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Kho lấy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Nơi giao</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>Tài xế GPS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
