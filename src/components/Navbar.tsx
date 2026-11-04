'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, Search, ShieldAlert, User as UserIcon, LogIn, LogOut } from 'lucide-react';
import type { User, Pet } from '@/types/pet-social.types';

interface NavbarProps {
  currentUser: User | null;
  pets?: Pet[];
  onOpenCreatePost?: () => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  pets = [],
  onOpenCreatePost = () => {},
  onOpenLoginModal = () => {},
  onLogout = () => {},
  searchQuery = '',
  onSearchChange = () => {},
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-orange-400 to-amber-300 flex items-center justify-center shadow-md shadow-rose-200 group-hover:scale-105 transition-transform">
            <span className="text-xl select-none">🐾</span>
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              PetSocial
            </span>
            <span className="hidden sm:inline-block ml-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
              Cộng Đồng Thú Cưng
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-xs sm:max-w-md relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Tìm theo giống (Corgi, Mèo Mướp, Poodle...)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-orange-50/60 border border-orange-100 rounded-full text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <>
              {/* Post Button */}
              <button
                onClick={onOpenCreatePost}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-full font-semibold text-sm shadow-md shadow-rose-200 hover:shadow-lg transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng Bài</span>
              </button>

              {/* Admin shortcut if admin */}
              {currentUser.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-full transition-colors title='Trang quản trị Admin'"
                >
                  <ShieldAlert className="w-5 h-5" />
                </Link>
              )}

              {/* Profile Link */}
              <Link
                href={`/profile/${currentUser.username}`}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-zinc-50 hover:bg-orange-50 border border-zinc-200 rounded-full transition-colors"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={currentUser.fullName}
                  className="w-7 h-7 rounded-full object-cover border border-rose-200"
                />
                <span className="text-xs font-bold text-zinc-700 hidden lg:inline max-w-[100px] truncate">
                  {currentUser.fullName}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-semibold text-sm shadow-md shadow-rose-200 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
