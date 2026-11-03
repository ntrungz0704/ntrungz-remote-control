'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Search,
  TrendingDown,
  ShieldCheck,
  Leaf,
  Clock,
  ArrowRight,
  Package,
  Layers,
  MapPin,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { RouteInputForm } from '@/components/features/RouteInputForm';
import type { CarrierQuoteRequest } from '@/types/carrier.types';
import { formatVND } from '@/lib/formatters';

export default function HomePage() {
  const router = useRouter();
  const [trackingInput, setTrackingInput] = useState('FSH-20261103-8899');

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) return;
    router.push(`/track/${encodeURIComponent(trackingInput.trim())}`);
  };

  const handleQuickQuote = (req: CarrierQuoteRequest) => {
    // Lưu vào sessionStorage để /quote tự động đọc và gọi ngay
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fsh_prefill_quote', JSON.stringify(req));
    }
    router.push('/quote');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-slate-900 to-slate-900 text-white pt-14 pb-20 sm:pt-20 sm:pb-28">
        {/* Decorative Grid Effect */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #3B82F6 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Col Left: Headline & Quick Tracking */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Badge Pillar */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-md">
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Nền tảng so sánh cước giao hàng đầu tiên tại Việt Nam</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                So Sánh Giá Cước{' '}
                <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
                  5 Hãng Vận Chuyển
                </span>{' '}
                Chỉ Trong 1.5 Giây
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Kết nối trực tiếp API với <strong>GrabExpress, ShopeeFood, Xanh SM, Ahamove, Be</strong>.
                Tự động tìm kiếm gói cước <strong>Rẻ nhất</strong>, <strong>Nhanh nhất</strong> và{' '}
                <strong>Xanh nhất</strong> với bảo vệ ma trận chống trừ tiền kép.
              </p>

              {/* Ô Tra Cứu Đơn Hàng Nhanh (Guest Live Tracking) */}
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl max-w-xl mx-auto lg:mx-0">
                <form onSubmit={handleTrackSubmit} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-300 absolute left-3.5 top-3" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Nhập mã đơn hàng hoặc token (VD: FSH-20261103-8899)..."
                      aria-label="Nhập mã đơn hàng hoặc token theo dõi hành trình"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-transparent text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label="Tra cứu hành trình đơn hàng trực tiếp trên bản đồ"
                    className="py-2.5 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <span>Tra Cứu Live</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </form>
              </div>

              {/* Highlight Metrics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-center lg:text-left">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-white">&lt; 1.5s</div>
                  <div className="text-[11px] text-slate-400">Tốc độ báo giá 6 hãng</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">28% - 35%</div>
                  <div className="text-[11px] text-slate-400">Tiết kiệm cước bình quân</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-teal-300">100% EV</div>
                  <div className="text-[11px] text-slate-400">Xe máy điện Xanh SM</div>
                </div>
              </div>
            </div>

            {/* Col Right: Route Input Form Widget */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-teal-500 rounded-3xl blur-xl opacity-30" />
                <div className="relative">
                  <RouteInputForm onSubmit={handleQuickQuote} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Dải Logo Đối Tác Chính Hãng */}
      <section className="py-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Đối tác vận chuyển tích hợp API trực tiếp:
            </span>
            <div className="flex items-center gap-6 sm:gap-8 flex-wrap justify-center">
              <span className="font-extrabold text-slate-800 hover:text-[#00B14F] transition text-sm flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00B14F]" /> GrabExpress
              </span>
              <span className="font-extrabold text-slate-800 hover:text-[#EE4D2D] transition text-sm flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EE4D2D]" /> ShopeeFood
              </span>
              <span className="font-extrabold text-slate-800 hover:text-[#008B8B] transition text-sm flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#008B8B]" /> Xanh SM EV
              </span>
              <span className="font-extrabold text-slate-800 hover:text-[#FF5722] transition text-sm flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" /> Ahamove
              </span>
              <span className="font-extrabold text-slate-800 hover:text-[#F59E0B] transition text-sm flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> beDelivery
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 4 Trụ Cột Đột Phá (Core Value Propositions) */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Tại Sao Chọn FAST-SHIP-HUB?
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Trải Nghiệm Vận Chuyển Vượt Trội Cho Mọi Đơn Hàng
            </h3>
            <p className="text-sm text-slate-600">
              Không còn cảnh mở cùng lúc 4 ứng dụng di động để xem app nào có mã giảm giá hay shipper gần hơn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Báo Giá Siêu Tốc &lt; 1.5 Giây</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Động cơ xử lý song song phân tán (Parallel Quoting Engine) kết nối 6 hãng đồng thời với cơ chế
                ngắt mạch Circuit Breaker chống gián đoạn.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900">4 Smart Badges Thông Minh</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tự động định vị và dán nhãn 🏆 <strong>Rẻ nhất</strong>, ⚡ <strong>Nhanh nhất</strong>, 🌿{' '}
                <strong>Xanh nhất</strong>, giúp bạn ra quyết định trong 0.3 giây.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Leaf className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Giao Hàng Xanh Với VinFast EV</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ưu tiên kết nối đội ngũ tài xế Xanh SM xe máy điện VinFast Feliz / Klara, tính toán minh bạch chỉ
                số giảm phát thải CO2 cho mỗi chuyến.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Live Tracking SSE Thời Gian Thực</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bản đồ lộ trình tương tác cập nhật vị trí shipper mỗi 3 giây qua luồng Server-Sent Events không
                cần tải lại trang.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Call-to-action Section */}
      <section className="py-14 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Sẵn Sàng Tối Ưu Hóa Chi Phí Vận Chuyển?
          </h2>
          <p className="text-sm sm:text-base text-blue-200 max-w-xl mx-auto">
            Không cần thủ tục phức tạp. Trải nghiệm ngay bảng so sánh cước thời gian thực hoặc quản trị đơn hàng
            tập trung với ví trả trước VietQR 24/7.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <Link
              href="/quote"
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg transition active:scale-95"
            >
              Vào Bảng So Sánh Cước Ngay
            </Link>
            <Link
              href="/dashboard/orders"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition"
            >
              Xem Bảng Quản Lý Đơn Hàng
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
