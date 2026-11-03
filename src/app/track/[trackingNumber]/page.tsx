'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Clock,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  Bike,
  Leaf,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Navigation,
} from 'lucide-react';
import { apiClient, type PublicTrackingData } from '@/lib/api-client';
import { LiveTrackingMap } from '@/components/features/LiveTrackingMap';
import { DriverCard } from '@/components/features/DriverCard';
import { formatDateTimeVN, formatDistance, formatMinutes } from '@/lib/formatters';
import { useToast } from '@/components/common/Toast';
import type { DriverLocation } from '@/types/carrier.types';

export default function LiveTrackingPage() {
  const params = useParams();
  const trackingNumber = (params?.trackingNumber as string) || 'FSH-20261103-8899';
  const { success: toastSuccess, error: toastError } = useToast();

  const [trackingData, setTrackingData] = useState<PublicTrackingData | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | undefined>(undefined);
  const [currentEtaMinutes, setCurrentEtaMinutes] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Nạp dữ liệu tracking ban đầu
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.getPublicTracking(trackingNumber);
        if (isMounted) {
          setTrackingData(data);
          setCurrentEtaMinutes(data.etaMinutes || 15);
          if (data.driver?.currentLocation) {
            setDriverLocation({
              latitude: data.driver.currentLocation.latitude,
              longitude: data.driver.currentLocation.longitude,
              updatedAt: new Date(data.driver.currentLocation.updatedAt),
            });
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError((err as Error).message || 'Không tìm thấy thông tin đơn hàng');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [trackingNumber]);

  // 2. Kết nối Server-Sent Events (SSE) stream để nhận tọa độ GPS và trạng thái thời gian thực
  useEffect(() => {
    if (!trackingData) return;

    const sseUrl = `/api/v1/tracking/${encodeURIComponent(trackingNumber)}/stream`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('status', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setTrackingData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.status,
            statusLabel: payload.statusLabel || prev.statusLabel,
          };
        });
      } catch {
        // Ignored
      }
    });

    eventSource.addEventListener('location', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setDriverLocation({
          latitude: payload.latitude,
          longitude: payload.longitude,
          updatedAt: new Date(payload.updatedAt),
        });
        if (payload.etaMinutes) {
          setCurrentEtaMinutes(payload.etaMinutes);
        }
      } catch {
        // Ignored
      }
    });

    eventSource.onerror = () => {
      // EventSource tự động reconnect khi gián đoạn mạng
    };

    return () => {
      eventSource.close();
    };
  }, [trackingData?.orderCode, trackingNumber]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toastSuccess('Đã sao chép liên kết theo dõi', 'Gửi link này cho người nhận để xem vị trí tài xế');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 space-y-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs font-semibold text-slate-600">
          Đang kết nối tín hiệu vệ tinh và GPS shipper...
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-slate-200 shadow-lg text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Không Tìm Thấy Đơn Hàng</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mã tra cứu <strong>{trackingNumber}</strong> không tồn tại hoặc đã bị thu hồi. Vui lòng kiểm
            tra lại liên kết theo dõi hoặc mã đơn.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
            >
              <ChevronLeft className="w-4 h-4" /> Về Trang Chủ Tra Cứu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 5 Mốc tiến trình trạng thái chuẩn
  const STATUS_STEPS = [
    { key: 'BOOKED', label: 'Tiếp nhận đơn' },
    { key: 'PICKING', label: 'Đang lấy hàng' },
    { key: 'DELIVERING', label: 'Đang giao hàng' },
    { key: 'DELIVERED', label: 'Đã giao xong' },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 0;
      case 'PICKING':
        return 1;
      case 'DELIVERING':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 2;
    }
  };

  const currentStep = getStepIndex(trackingData.status);

  return (
    <div className="flex-1 bg-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card: Order Code, Carrier & Share */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-lg text-slate-900">
                  Đơn Hàng {trackingData.orderCode}
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {trackingData.statusLabel}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Vận chuyển bởi <strong>{trackingData.carrier.name}</strong> • Khởi tạo lúc{' '}
                {formatDateTimeVN(trackingData.createdAt)}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            aria-label="Sao chép liên kết theo dõi gửi cho người nhận"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span className="text-emerald-700">Đã Sao Chép Link</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span>Chia Sẻ Cho Người Nhận</span>
              </>
            )}
          </button>
        </div>

        {/* 5-Stage Stepper Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-4 gap-2 relative">
            {STATUS_STEPS.map((step, idx) => {
              const isPastOrCurrent = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110'
                        : isPastOrCurrent
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPastOrCurrent && !isCurrent ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <div
                    className={`mt-2 text-xs font-semibold leading-tight ${
                      isCurrent ? 'text-blue-700' : isPastOrCurrent ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Split Live Tracking Map & Driver Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (7/12): Live Tracking Map */}
          <div className="lg:col-span-7 space-y-4">
            <div className="h-[420px] sm:h-[480px]">
              <LiveTrackingMap
                pickup={{
                  latitude: trackingData.route.pickupLatitude,
                  longitude: trackingData.route.pickupLongitude,
                  address: trackingData.route.pickupAddress,
                }}
                dropoff={{
                  latitude: trackingData.route.dropoffLatitude,
                  longitude: trackingData.route.dropoffLongitude,
                  address: trackingData.route.dropoffAddress,
                }}
                driverLocation={driverLocation}
                driverName={trackingData.driver?.name || 'Tài xế giao hàng'}
                distanceMeters={trackingData.route.distanceMeters}
                etaMinutes={currentEtaMinutes}
                statusLabel={trackingData.statusLabel}
                interactive={true}
              />
            </div>

            {/* Chi tiết lộ trình lấy và giao */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Địa Chỉ Chi Tiết
              </span>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] mt-0.5">
                    A
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500 text-[11px]">Nơi lấy hàng:</div>
                    <div className="font-bold text-slate-800">{trackingData.route.pickupAddress}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px] mt-0.5">
                    B
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500 text-[11px]">Nơi giao hàng:</div>
                    <div className="font-bold text-slate-800">{trackingData.route.dropoffAddress}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (5/12): Thẻ tài xế & Timeline lịch sử */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Driver Card */}
            <DriverCard
              driver={trackingData.driver}
              carrierName={trackingData.carrier.name}
              carrierCode={trackingData.carrier.code}
            />

            {/* 2. Timeline sự kiện */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Nhật Ký Hành Trình
              </h3>

              <div className="relative border-l-2 border-slate-200 ml-3.5 space-y-4 text-xs">
                {trackingData.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-5">
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                    <div className="font-bold text-slate-900">{event.description}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {formatDateTimeVN(event.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Tác động môi trường xanh */}
            {trackingData.co2SavedGrams && trackingData.co2SavedGrams > 0 && (
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold">Đóng Góp Xanh Cho Trái Đất</div>
                  <div className="text-[11px] text-teal-700">
                    Chuyến đi này giảm phát thải <strong>{trackingData.co2SavedGrams}g CO2</strong> so với xe máy chạy xăng.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
