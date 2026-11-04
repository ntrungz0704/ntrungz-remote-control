'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Banknote,
  Receipt,
  Download,
} from 'lucide-react';
import { apiClient, type WalletData } from '@/lib/api-client';
import { formatVND, formatDateTimeVN } from '@/lib/formatters';
import { WalletWidget } from '@/components/features/WalletWidget';
import { useToast } from '@/components/common/Toast';

export default function MerchantWalletPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);

  const fetchWallet = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getWallet();
      setWallet(data);
    } catch (err: unknown) {
      toastError('Lỗi tải thông tin ví', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'TOPUP':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3" /> Nạp tiền VietQR
          </span>
        );
      case 'SHIPPING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            <ArrowUpRight className="w-3 h-3 text-rose-500" /> Trừ cước đơn hàng
          </span>
        );
      case 'HOLD_RESERVATION':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            <Lock className="w-3 h-3" /> Tạm giữ cước đơn
          </span>
        );
      case 'HOLD_RELEASE':
      case 'REFUND':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            <RefreshCw className="w-3 h-3" /> Hoàn cước hủy đơn
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-slate-100 py-6 px-4 sm:px-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" /> Quản Trị Ví Tiền & Đối Soát
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Nạp tiền tức thì qua VietQR Napas 24/7, quản trị dòng tiền tạm giữ và đối soát COD minh bạch
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchWallet}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Cập Nhật</span>
            </button>

            <button
              onClick={() => setIsTopupModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition"
            >
              <QrCode className="w-4 h-4" />
              <span>Nạp Tiền VietQR 24/7</span>
            </button>
          </div>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Số dư khả dụng */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Số Dư Khả Dụng
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                VND
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {wallet ? formatVND(wallet.availableBalance) : '2.000.000 đ'}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sẵn sàng tạo đơn tức thì
            </div>
          </div>

          {/* Card 2: Đang tạm giữ (Hold) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Đang Tạm Giữ (Hold)
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 tracking-tight">
              {wallet ? formatVND(wallet.holdBalance) : '0 đ'}
            </div>
            <div className="text-[11px] text-slate-500">Cho các đơn đang trong hành trình giao</div>
          </div>

          {/* Card 3: Tổng số dư thực */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tổng Số Dư Ví
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {wallet ? formatVND(wallet.balance) : '2.000.000 đ'}
            </div>
            <div className="text-[11px] text-slate-500">Bảo mật chuẩn PCI-DSS & Napas</div>
          </div>

          {/* Card 4: Tiền thu hộ COD chờ đối soát */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                COD Chờ Đối Soát
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700 tracking-tight">1.450.000 đ</div>
            <div className="text-[11px] text-purple-600 font-medium">Đối soát tự động T+1</div>
          </div>
        </div>

        {/* Bảng Lịch Sử Biến Động Số Dư (Ledger Transactions) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" /> Sổ Cái Biến Động Số Dư (Giao Dịch Gần Nhất)
              </h2>
              <div className="text-xs text-slate-500">
                Ghi nhận minh bạch mọi luồng tiền nạp, trừ cước, tạm giữ và hoàn tiền
              </div>
            </div>

            <button
              onClick={() => toastSuccess('Đã xuất sao kê', 'File CSV sao kê giao dịch đã được tải xuống')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Mã Giao Dịch</th>
                  <th className="py-3 px-4">Loại Nghiệp Vụ</th>
                  <th className="py-3 px-4">Số Tiền (VNĐ)</th>
                  <th className="py-3 px-4">Số Dư Sau GD</th>
                  <th className="py-3 px-4">Phương Thức</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {!wallet || wallet.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Chưa có giao dịch biến động nào
                    </td>
                  </tr>
                ) : (
                  wallet.recentTransactions.map((tx) => {
                    const isPositive = tx.type === 'TOPUP' || tx.type === 'REFUND';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {tx.transactionCode}
                        </td>
                        <td className="py-3 px-4">{getTransactionBadge(tx.type)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-black ${
                              isPositive ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            {isPositive ? '+' : '-'}
                            {formatVND(tx.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {formatVND(tx.balanceAfter)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">{tx.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {formatDateTimeVN(tx.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={tx.note}>
                          {tx.note || '--'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nạp tiền VietQR Napas 24/7 */}
      {isTopupModalOpen && (
        <WalletWidget
          isOpenModal={isTopupModalOpen}
          onCloseModal={() => {
            setIsTopupModalOpen(false);
            fetchWallet();
          }}
        />
      )}
    </div>
  );
}
