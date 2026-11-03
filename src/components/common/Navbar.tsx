'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Search,
  Package,
  Wallet,
  PlusCircle,
  Menu,
  X,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatVND } from '@/lib/formatters';
import { WalletWidget } from '@/components/features/WalletWidget';

export function Navbar() {
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadWallet() {
      try {
        const data = await apiClient.getWallet();
        if (isMounted) {
          setBalance(data.availableBalance);
        }
      } catch (err) {
        // Fallback silently if offline or initial load
      }
    }
    loadWallet();
    const interval = setInterval(loadWallet, 15000); // 15s refresh
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { href: '/quote', label: 'So Sánh Cước', icon: TrendingUp },
    { href: '/track/FSH-20261103-8899', label: 'Theo Dõi Đơn Live', icon: Search },
    { href: '/dashboard/orders', label: 'Quản Lý Đơn', icon: Package },
    { href: '/dashboard/wallet', label: 'Ví & Đối Soát', icon: Wallet },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo Brand */}
          <Link href="/" aria-label="FAST-SHIP-HUB - Về trang chủ" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-amber-300 text-amber-300" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-900 bg-clip-text text-transparent">
                FAST-SHIP-HUB
              </span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase -mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" aria-hidden="true" /> Đa Hãng Tức Thì
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav aria-label="Điều hướng chính" className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Wallet Balance & Action */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/dashboard/wallet"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50/50 hover:border-blue-200 transition group text-xs"
              aria-label={`Ví trả trước, số dư khả dụng ${balance !== null ? formatVND(balance) : '2.000.000 đ'}`}
              title="Xem chi tiết ví"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold" aria-hidden="true">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-500 font-medium">Số dư khả dụng</span>
                <span className="font-bold text-slate-800 group-hover:text-blue-700 transition">
                  {balance !== null ? formatVND(balance) : '2.000.000 đ'}
                </span>
              </div>
            </Link>

            <button
              onClick={() => setIsTopupModalOpen(true)}
              aria-label="Nạp tiền ví bằng VietQR Napas 24/7"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-semibold shadow-sm shadow-orange-500/20 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Nạp VietQR</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div id="mobile-nav-menu" className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs">
                <Wallet className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span className="text-slate-500">Số dư:</span>
                <span className="font-bold text-slate-800">
                  {balance !== null ? formatVND(balance) : '2.000.000 đ'}
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsTopupModalOpen(true);
                }}
                aria-label="Nạp tiền ví VietQR"
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-500 text-white"
              >
                + Nạp VietQR
              </button>
            </div>

            <nav aria-label="Điều hướng trên thiết bị di động" className="flex flex-col gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Standalone VietQR Topup Modal */}
      {isTopupModalOpen && (
        <WalletWidget
          isOpenModal={isTopupModalOpen}
          onCloseModal={() => {
            setIsTopupModalOpen(false);
            // Refresh balance
            apiClient.getWallet().then((w) => setBalance(w.availableBalance)).catch(() => {});
          }}
        />
      )}
    </>
  );
}
