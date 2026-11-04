'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { PostCard } from '@/components/PostCard';
import { CreatePostModal } from '@/components/CreatePostModal';
import { GuestModal } from '@/components/GuestModal';
import { PetModal } from '@/components/PetModal';
import { ReportModal } from '@/components/ReportModal';
import { Sparkles, TrendingUp, Heart, ShieldCheck, Plus } from 'lucide-react';
import type { PostDetail, User, Pet, PetSpecies } from '@/types/pet-social.types';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [posts, setPosts] = useState<PostDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecies, setSelectedSpecies] = useState<'ALL' | PetSpecies>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  // Check auth session
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        setUserPets(data.pets || []);
      } else {
        setCurrentUser(null);
        setUserPets([]);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  // Fetch chronological feed
  const fetchFeed = async () => {
    setLoading(true);
    try {
      let url = '/api/v1/feed?limit=20';
      if (selectedSpecies !== 'ALL') {
        url += `&species=${selectedSpecies}`;
      }
      if (searchQuery.trim()) {
        url += `&breed=${encodeURIComponent(searchQuery.trim())}`;
      }

      const headers: Record<string, string> = {};
      if (currentUser) {
        headers['x-user-id'] = currentUser.id;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Lỗi nạp feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [selectedSpecies, searchQuery, currentUser]);

  const handlePawToggle = async (postId: string) => {
    if (!currentUser) {
      setIsLoginOpen(true);
      return;
    }
    await fetch(`/api/v1/posts/${postId}/paw`, {
      method: 'POST',
      headers: {
        'x-user-id': currentUser.id,
      },
    });
  };

  const handleHidePost = async (postId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/v1/posts/${postId}/hide`, {
      method: 'POST',
      headers: { 'x-user-id': currentUser.id },
    });
    const data = await res.json();
    if (data.success) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;
    const res = await fetch(`/api/v1/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': currentUser.id },
    });
    const data = await res.json();
    if (data.success) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const handleLogout = () => {
    // Clear cookies / session
    document.cookie = 'auth_token=; Max-Age=0; path=/;';
    setCurrentUser(null);
    setUserPets([]);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fffbf7]">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        pets={userPets}
        onOpenCreatePost={() => (currentUser ? setIsCreatePostOpen(true) : setIsLoginOpen(true))}
        onOpenLoginModal={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Feed (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hero Banner for Guests */}
          {!currentUser && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300 text-white shadow-lg shadow-rose-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-2xl inline-block animate-bounce">🐶🐱✨</span>
                <h2 className="text-lg font-black tracking-tight">Chào mừng đến với PetSocial!</h2>
                <p className="text-xs text-rose-50 max-w-md leading-relaxed">
                  Cộng đồng chia sẻ hình ảnh và video ngắn về thú cưng. Thả Paw 🐾 và cùng ngắm những khoảnh khắc đáng yêu mỗi ngày!
                </p>
              </div>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="px-5 py-2.5 bg-white text-rose-600 font-extrabold text-xs rounded-full shadow-md hover:bg-orange-50 active:scale-95 transition-all whitespace-nowrap"
              >
                Gia Nhập Ngay 🐾
              </button>
            </div>
          )}

          {/* Species Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedSpecies('ALL')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedSpecies === 'ALL'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-orange-100 hover:bg-orange-50'
              }`}
            >
              🐾 Tất cả bài đăng
            </button>
            <button
              onClick={() => setSelectedSpecies('DOG')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedSpecies === 'DOG'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-orange-100 hover:bg-orange-50'
              }`}
            >
              🐶 Chó cưng
            </button>
            <button
              onClick={() => setSelectedSpecies('CAT')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedSpecies === 'CAT'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-orange-100 hover:bg-orange-50'
              }`}
            >
              🐱 Mèo yêu
            </button>
            <button
              onClick={() => setSelectedSpecies('OTHER')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedSpecies === 'OTHER'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-orange-100 hover:bg-orange-50'
              }`}
            >
              🐹 Thú nhỏ khác
            </button>
          </div>

          {/* Quick Create Box (When logged in) */}
          {currentUser && (
            <div className="p-4 bg-white rounded-3xl border border-orange-100/80 shadow-sm flex items-center gap-3">
              <Link href={`/profile/${currentUser.username}`}>
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={currentUser.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-orange-200"
                />
              </Link>
              <button
                onClick={() => setIsCreatePostOpen(true)}
                className="flex-1 text-left px-4 py-2.5 bg-orange-50/60 hover:bg-orange-100/60 border border-orange-100 rounded-full text-xs text-zinc-400 font-medium transition-colors"
              >
                Hôm nay bé cưng của bạn có gì vui? Đăng bài ngay... 🐾
              </button>
            </div>
          )}

          {/* Feed Stream */}
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <span className="text-3xl inline-block animate-spin">🐾</span>
              <p className="text-xs text-zinc-400 font-medium">Đang tải bảng tin thú cưng...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-orange-100 space-y-3">
              <span className="text-4xl">🐾</span>
              <h3 className="font-bold text-zinc-700 text-sm">Chưa có bài viết nào ở danh mục này</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Hãy là người đầu tiên chia sẻ khoảnh khắc của bé cưng đến mọi người!
              </p>
              {currentUser && (
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="px-4 py-2 bg-rose-500 text-white rounded-full text-xs font-bold shadow-md shadow-rose-200 hover:bg-rose-600 transition-all"
                >
                  Đăng Bài Ngay
                </button>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onPawToggle={handlePawToggle}
                onTriggerGuestModal={() => setIsLoginOpen(true)}
                onHidePost={handleHidePost}
                onDeletePost={handleDeletePost}
                onReportPost={(postId) => setReportingPostId(postId)}
              />
            ))
          )}
        </div>

        {/* Right Column: Widgets / Suggestions (Span 1) */}
        <aside className="space-y-6 hidden lg:block">
          {/* User Pet Card summary */}
          {currentUser && (
            <div className="p-5 bg-white rounded-3xl border border-orange-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <span>🐾 Bé cưng của tôi ({userPets.length})</span>
                </h3>
                <button
                  onClick={() => setIsPetModalOpen(true)}
                  className="text-xs text-rose-500 font-bold hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>

              {userPets.length === 0 ? (
                <div className="p-3 bg-orange-50/60 rounded-2xl text-center space-y-1.5">
                  <p className="text-xs text-zinc-500">Bạn chưa thêm hồ sơ bé cưng nào.</p>
                  <button
                    onClick={() => setIsPetModalOpen(true)}
                    className="px-3 py-1 bg-orange-500 text-white rounded-full text-[11px] font-bold"
                  >
                    + Thêm Bé Cưng Ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {userPets.map((pet) => (
                    <div
                      key={pet.id}
                      className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-orange-50/60 transition-colors"
                    >
                      <img
                        src={pet.avatarUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100'}
                        alt={pet.name}
                        className="w-9 h-9 rounded-full object-cover border border-orange-200"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-xs text-zinc-800">{pet.name}</div>
                        <div className="text-[10px] text-zinc-400">
                          {pet.species === 'DOG' ? '🐶' : pet.species === 'CAT' ? '🐱' : '🐾'}{' '}
                          {pet.breed}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trending Breeds */}
          <div className="p-5 bg-white rounded-3xl border border-orange-100 shadow-sm space-y-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
              <span>Giống thú cưng thịnh hành</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {['Corgi Pembroke', 'Mèo Mướp Ta', 'Poodle Toy', 'Golden Retriever', 'Mèo Anh Lông Ngắn'].map(
                (b) => (
                  <button
                    key={b}
                    onClick={() => setSearchQuery(b)}
                    className="px-2.5 py-1 bg-orange-50 hover:bg-rose-50 border border-orange-100 rounded-full text-[11px] font-semibold text-zinc-700 hover:text-rose-600 transition-colors"
                  >
                    #{b}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Community Guidelines */}
          <div className="p-4 bg-gradient-to-tr from-amber-50 to-orange-50 rounded-3xl border border-amber-100 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Tiêu chuẩn cộng đồng</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Tất cả bài viết có dấu hiệu bạo hành, ngược đãi hoặc buôn bán thú cưng trái phép sẽ bị Admin gỡ bỏ và khóa tài khoản vĩnh viễn.
            </p>
          </div>
        </aside>
      </main>

      {/* Modals */}
      {currentUser && (
        <>
          <CreatePostModal
            isOpen={isCreatePostOpen}
            onClose={() => setIsCreatePostOpen(false)}
            userPets={userPets}
            onPostCreated={() => {
              fetchFeed();
              checkAuth();
            }}
            userId={currentUser.id}
          />
          <PetModal
            isOpen={isPetModalOpen}
            onClose={() => setIsPetModalOpen(false)}
            onPetCreated={() => checkAuth()}
            userId={currentUser.id}
          />
        </>
      )}

      <GuestModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          checkAuth();
        }}
      />

      {reportingPostId && currentUser && (
        <ReportModal
          isOpen={!!reportingPostId}
          onClose={() => setReportingPostId(null)}
          postId={reportingPostId}
          userId={currentUser.id}
        />
      )}
    </div>
  );
}
