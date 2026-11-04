'use client';

import React, { useState } from 'react';
import { X, LogIn, UserCheck, Shield } from 'lucide-react';
import type { User } from '@/types/pet-social.types';

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const GuestModal: React.FC<GuestModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER' | 'FAST_SWITCH'>('FAST_SWITCH');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFastLogin = async (targetEmail: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: pass }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    handleFastLogin(email, password);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, fullName, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-orange-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-orange-50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <div>
              <h2 className="font-extrabold text-sm text-zinc-900">Gia Nhập PetSocial</h2>
              <p className="text-[11px] text-zinc-500">Thả Paw và kết nối cùng các bé cưng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-zinc-100 mx-4 mt-3 rounded-xl text-xs font-bold">
          <button
            onClick={() => setTab('FAST_SWITCH')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'FAST_SWITCH' ? 'bg-white text-rose-600 shadow-sm' : 'text-zinc-500'
            }`}
          >
            Chuyển nhanh
          </button>
          <button
            onClick={() => setTab('LOGIN')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'LOGIN' ? 'bg-white text-rose-600 shadow-sm' : 'text-zinc-500'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setTab('REGISTER')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'REGISTER' ? 'bg-white text-rose-600 shadow-sm' : 'text-zinc-500'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Body */}
        <div className="p-4 text-xs">
          {error && (
            <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          {tab === 'FAST_SWITCH' && (
            <div className="space-y-2.5">
              <p className="text-[11px] text-zinc-500 mb-2">
                Chọn tài khoản mẫu để trải nghiệm đầy đủ quyền năng ngay lập tức:
              </p>

              {/* User 1: Linh Corgi */}
              <button
                type="button"
                onClick={() => handleFastLogin('linh.corgi@gmail.com', 'User1Password2026!')}
                disabled={loading}
                className="w-full p-2.5 bg-orange-50/70 hover:bg-orange-100/70 border border-orange-200 rounded-2xl flex items-center gap-3 transition-colors text-left"
              >
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100"
                  alt="Linh"
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="font-bold text-zinc-900">Khánh Linh (Mẹ bé Lu Lu)</div>
                  <div className="text-[10px] text-orange-600 font-semibold">
                    🐶 Sở hữu: Bé Lu Lu (Corgi), Bim Bim
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-orange-500" />
              </button>

              {/* User 2: Tuấn Mèo */}
              <button
                type="button"
                onClick={() => handleFastLogin('tuan.meo@gmail.com', 'User2Password2026!')}
                disabled={loading}
                className="w-full p-2.5 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 rounded-2xl flex items-center gap-3 transition-colors text-left"
              >
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
                  alt="Tuấn"
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="font-bold text-zinc-900">Minh Tuấn (Ba bé Miu)</div>
                  <div className="text-[10px] text-rose-600 font-semibold">
                    🐱 Sở hữu: Bé Miu Miu (Mèo Mướp)
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-rose-500" />
              </button>

              {/* Admin */}
              <button
                type="button"
                onClick={() => handleFastLogin('admin@petsocial.vn', 'AdminPassword2026!')}
                disabled={loading}
                className="w-full p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-2xl flex items-center gap-3 transition-colors text-left"
              >
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"
                  alt="Admin"
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="font-bold text-zinc-900">Quản Trị Viên (Admin)</div>
                  <div className="text-[10px] text-zinc-500 font-semibold">
                    🛡️ Duyệt Báo Cáo & Khóa Bài Vi Phạm
                  </div>
                </div>
                <Shield className="w-4 h-4 text-zinc-600" />
              </button>
            </div>
          )}

          {tab === 'LOGIN' && (
            <form onSubmit={handleCustomLogin} className="space-y-3">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-md shadow-rose-200"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng Nhập Ngay'}
              </button>
            </form>
          )}

          {tab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-2.5">
              <div>
                <label className="block font-bold text-zinc-700 mb-0.5">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Nam"
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-0.5">Tên người dùng (username)</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="hoangnam_pet"
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-0.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nam@example.com"
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-0.5">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-md shadow-rose-200 mt-1"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Mới'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
