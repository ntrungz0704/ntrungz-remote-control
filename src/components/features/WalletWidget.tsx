'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  QrCode,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  X,
  ShieldCheck,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { apiClient, type WalletData } from '@/lib/api-client';
import type { GeneratedVietQrResult } from '@/lib/vietqr';
import { formatVND, formatDateTimeVN } from '@/lib/formatters';
import { useToast } from '@/components/common/Toast';

export interface WalletWidgetProps {
  isOpenModal?: boolean;
  onCloseModal?: () => void;
  showCardOnly?: boolean;
}

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000];

export function WalletWidget({
  isOpenModal = false,
  onCloseModal,
  showCardOnly = false,
}: WalletWidgetProps) {
  const { success, error: toastError } = useToast();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(isOpenModal);
  const [topupAmount, setTopupAmount] = useState<number>(500000);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrResult, setQrResult] = useState<GeneratedVietQrResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setIsModalOpen(isOpenModal);
  }, [isOpenModal]);

  const loadWalletData = async () => {
    setIsLoadingWallet(true);
    try {
      const data = await apiClient.getWallet();
      setWallet(data);
    } catch {
      // Handled silently
    } finally {
      setIsLoadingWallet(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const handleCreateTopup = async (amount: number) => {
    if (amount < 50000) {
      toastError('Số tiền nạp tối thiểu là 50.000 VNĐ');
      return;
    }
    setIsGeneratingQr(true);
    try {
      const result = await apiClient.createTopup(amount);
      setQrResult(result);
      success('Đã tạo mã VietQR Napas 24/7', 'Quét mã bằng app ngân hàng để cộng số dư tức thì');
    } catch (err: unknown) {
      toastError('Lỗi tạo mã QR', (err as Error).message);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    success(`Đã sao chép ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setQrResult(null);
    if (onCloseModal) onCloseModal();
  };

  return (
    <>
      {/* 1. Thẻ hiển thị số dư ví (Widget Card) */}
      {!showCardOnly ? null : (
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-5 text-white shadow-xl border border-blue-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Ví Cước Trả Trước
                </div>
                <div className="text-xs text-blue-300 font-medium">Merchant: Shop Bách Khoa</div>
              </div>
            </div>

            <button
              onClick={loadWalletData}
              disabled={isLoadingWallet}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Làm mới số dư"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWallet ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-medium">Số dư khả dụng</div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
              {wallet ? formatVND(wallet.availableBalance) : '2.000.000 đ'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Tổng số dư thực:</span>
              <span className="font-semibold text-slate-200">
                {wallet ? formatVND(wallet.balance) : '2.000.000 đ'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Đang tạm giữ (Hold):</span>
              <span className="font-semibold text-amber-300 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {wallet ? formatVND(wallet.holdBalance) : '0 đ'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsModalOpen(true);
              handleCreateTopup(topupAmount);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <QrCode className="w-4 h-4" />
            <span>Nạp Tiền VietQR Napas 24/7</span>
          </button>
        </div>
      )}

      {/* 2. Modal Nạp tiền VietQR Napas 24/7 */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vietqr-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <QrCode className="w-5 h-5 text-amber-300" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="vietqr-modal-title" className="font-bold text-base">Nạp Tiền Ví Tức Thì Qua VietQR</h3>
                  <div className="text-xs text-blue-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> Chuẩn Napas 24/7 • Miễn Phí Giao Dịch
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                aria-label="Đóng cửa sổ nạp tiền ví"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {!qrResult ? (
                /* Bước 1: Chọn số tiền nạp */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">
                      Chọn nhanh mệnh giá nạp (VNĐ):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESET_AMOUNTS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                            topupAmount === amt
                              ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {formatVND(amt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Hoặc nhập số tiền tùy ý:
                    </label>
                    <input
                      type="number"
                      step={50000}
                      min={50000}
                      max={20000000}
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Tối thiểu 50.000 VNĐ • Tối đa 20.000.000 VNĐ/giao dịch
                    </span>
                  </div>

                  <button
                    onClick={() => handleCreateTopup(topupAmount)}
                    disabled={isGeneratingQr}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    {isGeneratingQr ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>Tạo Mã QR Thanh Toán {formatVND(topupAmount)}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Bước 2: Hiển thị Mã QR và Hướng dẫn chuyển khoản */
                <div className="space-y-4 text-center">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                    <div className="text-xs font-semibold text-slate-500 mb-2">
                      Mở ứng dụng ngân hàng hoặc ví điện tử để quét mã:
                    </div>

                    {/* QR Code Image */}
                    <div className="p-2 bg-white rounded-2xl shadow-md border border-slate-200 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrResult.qrImageUrl}
                        alt="Mã QR Napas 247 chuyển khoản nạp ví tự động"
                        className="w-56 h-56 object-contain"
                      />
                    </div>

                    <div className="mt-2 text-sm font-black text-slate-900">
                      Số tiền: {formatVND(qrResult.amount)}
                    </div>
                  </div>

                  {/* Thông tin tài khoản nhận */}
                  <div className="text-left bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ngân hàng:</span>
                      <span className="font-bold text-slate-800">{qrResult.bankInfo.bankName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-700">
                          {qrResult.bankInfo.accountNumber}
                        </span>
                        <button
                          onClick={() => handleCopy(qrResult.bankInfo.accountNumber, 'Số tài khoản')}
                          className="p-1 text-slate-400 hover:text-blue-600 transition focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                          aria-label="Sao chép số tài khoản ngân hàng"
                          title="Sao chép STK"
                        >
                          {copiedField === 'Số tài khoản' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tên người thụ hưởng:</span>
                      <span className="font-bold text-slate-800">{qrResult.bankInfo.accountName}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Nội dung chuyển khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {qrResult.bankInfo.transferContent}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(qrResult.bankInfo.transferContent, 'Nội dung chuyển khoản')
                          }
                          className="p-1 text-slate-400 hover:text-amber-600 transition focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
                          aria-label="Sao chép nội dung chuyển khoản"
                          title="Sao chép nội dung"
                        >
                          {copiedField === 'Nội dung chuyển khoản' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQrResult(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Đổi Số Tiền Khác
                    </button>
                    <button
                      onClick={() => {
                        handleClose();
                        loadWalletData();
                        success('Đã lưu yêu cầu nạp ví', 'Hệ thống tự động cộng số dư khi nhận tiền');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
                    >
                      Tôi Đã Chuyển Khoản Xong
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
