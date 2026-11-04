'use client';

import React, { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import type { ReportReason } from '@/types/pet-social.types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  userId: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, postId, userId }) => {
  const [reason, setReason] = useState<ReportReason>('CRUELTY');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          postId,
          reason,
          details: details.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 2000);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-zinc-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-amber-50">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-600" />
            <h2 className="font-extrabold text-sm text-zinc-800">Báo Cáo Vi Phạm</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {successMsg ? (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl text-center font-bold">
              {successMsg}
            </div>
          ) : (
            <>
              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-700 mb-1.5">Lý do báo cáo:</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 hover:bg-orange-50 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value="CRUELTY"
                      checked={reason === 'CRUELTY'}
                      onChange={() => setReason('CRUELTY')}
                    />
                    <span className="font-medium text-zinc-800">🐾 Dấu hiệu ngược đãi / bạo hành động vật</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 hover:bg-orange-50 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value="SPAM"
                      checked={reason === 'SPAM'}
                      onChange={() => setReason('SPAM')}
                    />
                    <span className="font-medium text-zinc-800">📢 Spam / Buôn bán trái phép</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 hover:bg-orange-50 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value="OFFENSIVE"
                      checked={reason === 'OFFENSIVE'}
                      onChange={() => setReason('OFFENSIVE')}
                    />
                    <span className="font-medium text-zinc-800">⚠️ Ngôn từ thù địch, xúc phạm</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 hover:bg-orange-50 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value="FRAUD"
                      checked={reason === 'FRAUD'}
                      onChange={() => setReason('FRAUD')}
                    />
                    <span className="font-medium text-zinc-800">🚫 Lừa đảo / Giả mạo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Mô tả thêm (tùy chọn):</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú chi tiết nếu có..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-amber-200"
              >
                {submitting ? 'Đang gửi báo cáo...' : 'Gửi Báo Cáo Cho Admin'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
