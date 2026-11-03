import React from 'react';
import Link from 'next/link';
import { Shield, Zap, RefreshCw, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';

export function Footer() {
  const carriers = [
    { name: 'GrabExpress', color: '#00B14F', badge: 'Giao tức thì', bg: 'hover:border-emerald-400' },
    { name: 'ShopeeFood Instant', color: '#EE4D2D', badge: 'Tối ưu nội thành', bg: 'hover:border-orange-400' },
    { name: 'Xanh SM Delivery', color: '#008B8B', badge: '100% Xe điện EV VinFast', bg: 'hover:border-teal-400' },
    { name: 'Ahamove', color: '#FF5722', badge: 'Chuyên hàng cồng kềnh', bg: 'hover:border-orange-500' },
    { name: 'beDelivery', color: '#F59E0B', badge: 'Giá cước linh hoạt', bg: 'hover:border-amber-400' },
  ];

  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Top Section: Carrier Partners */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Đối Tác Vận Chuyển Chính Thức
            </h3>
            <span className="text-xs text-slate-400">Kết nối API trực tiếp 24/7 với SLA 99.9%</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {carriers.map((c) => (
              <div
                key={c.name}
                className={`p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 transition-all duration-200 flex flex-col justify-between ${c.bg} group`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition">
                    API Active
                  </span>
                </div>
                <div className="font-semibold text-white text-sm group-hover:text-blue-300 transition">
                  {c.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{c.badge}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Section: 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-6 border-t border-slate-800">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
              </div>
              <span className="font-black text-lg text-white tracking-tight">FAST-SHIP-HUB</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Nền tảng tích hợp và so sánh giá cước giao hàng đa đơn vị hàng đầu Việt Nam. Giúp các chủ shop,
              doanh nghiệp TMĐT và cá nhân tìm kiếm hãng giao nhanh nhất, rẻ nhất và xanh nhất chỉ trong 1.5 giây.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Bảo mật chuẩn PCI-DSS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <span>Hoàn tiền tự động khi hủy đơn</span>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-slate-300">
              Chức Năng Nổi Bật
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <Link href="/quote" className="hover:text-white transition flex items-center gap-1">
                  So sánh giá cước đa hãng <ExternalLink className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/track/FSH-20261103-8899" className="hover:text-white transition">
                  Live Tracking thời gian thực (SSE)
                </Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className="hover:text-white transition">
                  Quản lý đơn hàng tập trung
                </Link>
              </li>
              <li>
                <Link href="/dashboard/wallet" className="hover:text-white transition">
                  Ví trả trước & Quét VietQR 24/7
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Support & Contact */}
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-slate-300">
              Tổng Đài Hỗ Trợ 24/7
            </h4>
            <div className="space-y-2 text-slate-400 text-xs">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-slate-200">1900 6868 (Phím 1)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>hotro@fastshiphub.vn</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                <span>Tòa nhà Innovation Hub, Phường Bách Khoa, Hai Bà Trưng, Hà Nội</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>© 2026 FAST-SHIP-HUB Platform. Bản quyền thuộc về Công ty Công nghệ Fast Ship Hub.</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Điều khoản sử dụng</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Chính sách bảo mật</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Quy chế hoạt động</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
