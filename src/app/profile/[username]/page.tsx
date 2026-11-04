'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { PostCard } from '@/components/PostCard';
import { PetModal } from '@/components/PetModal';
import { CreatePostModal } from '@/components/CreatePostModal';
import { GuestModal } from '@/components/GuestModal';
import { ReportModal } from '@/components/ReportModal';
import {
  PawPrint,
  Calendar,
  Grid,
  Image as ImageIcon,
  Video,
  EyeOff,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserPlus,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import type { User, Pet, PostDetail } from '@/types/pet-social.types';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [posts, setPosts] = useState<PostDetail[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'IMAGE' | 'VIDEO' | 'HIDDEN'>('ALL');

  // Modals
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  // Check auth
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  // Fetch profile details
  const fetchProfile = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/users/${username}`);
      if (!res.ok) {
        setProfileUser(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProfileUser(data.user);
      setPets(data.pets || []);
      setPosts(data.posts || []);
      setIsFollowing(Boolean(data.isFollowing));
      setFollowersCount(data.user?.followersCount || 0);
      setFollowingCount(data.user?.followingCount || 0);
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchProfile();
  }, [username]);

  const isOwner = currentUser && profileUser && currentUser.id === profileUser.id;

  // Toggle follow
  const handleFollowToggle = async () => {
    if (!currentUser) {
      setIsLoginOpen(true);
      return;
    }
    if (!profileUser || isOwner) return;

    try {
      const res = await fetch(`/api/v1/users/${profileUser.username}/follow`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowing(data.following);
        setFollowersCount((prev) => (data.following ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    }
  };

  // Delete pet
  const handleDeletePet = async (petId: string, petName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa hồ sơ bé "${petName}"? Các bài viết đã đăng vẫn sẽ được bảo toàn nguyên vẹn.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/pets/${petId}`, { method: 'DELETE' });
      if (res.ok) {
        setPets((prev) => prev.filter((p) => p.id !== petId));
        // Refresh feed/posts to update pet tags
        fetchProfile();
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể xóa hồ sơ thú cưng');
      }
    } catch (err) {
      console.error('Delete pet error:', err);
    }
  };

  // Filter posts by active tab
  const filteredPosts = posts.filter((p) => {
    if (activeTab === 'HIDDEN') return p.status === 'HIDDEN';
    if (p.status === 'HIDDEN') return false; // Don't show hidden posts in standard tabs
    if (activeTab === 'IMAGE') return p.mediaType === 'IMAGE';
    if (activeTab === 'VIDEO') return p.mediaType === 'VIDEO';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-zinc-900 pb-16">
      <Navbar
        currentUser={currentUser}
        pets={pets}
        onOpenCreatePost={() => (currentUser ? setIsCreatePostOpen(true) : setIsLoginOpen(true))}
        onOpenLoginModal={() => setIsLoginOpen(true)}
      />

      <main className="max-w-4xl mx-auto px-4 pt-6">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-rose-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang chủ</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <PawPrint className="w-10 h-10 animate-bounce text-rose-400 mb-3" />
            <p className="text-sm font-medium">Đang tải hồ sơ trang cá nhân...</p>
          </div>
        ) : !profileUser ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-orange-100 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-800 mb-2">Không tìm thấy người dùng</h2>
            <p className="text-sm text-zinc-500 mb-6">Tài khoản @{username} không tồn tại hoặc đã bị đổi tên.</p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition"
            >
              Về Trang chủ
            </Link>
          </div>
        ) : (
          <>
            {/* Profile Header Banner */}
            <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden mb-6">
              {/* Cover Gradient */}
              <div className="h-36 sm:h-48 bg-gradient-to-r from-orange-200 via-rose-200 to-amber-200 relative">
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
              </div>

              {/* User Bio & Meta Section */}
              <div className="px-6 pb-6 pt-0 relative">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={profileUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={profileUser.fullName}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white shadow-md bg-white"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5">
                    {isOwner ? (
                      <button
                        onClick={() => {
                          setEditingPet(null);
                          setIsPetModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-orange-400 text-white text-sm font-bold rounded-2xl shadow-sm hover:opacity-95 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Thêm bé cưng</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleFollowToggle}
                        className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-2xl transition shadow-sm ${
                          isFollowing
                            ? 'bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-600'
                            : 'bg-rose-500 text-white hover:bg-rose-600'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>Đang theo dõi</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Theo dõi</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Name & Bio */}
                <div>
                  <h1 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
                    {profileUser.fullName}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">
                      Chủ nuôi
                    </span>
                  </h1>
                  <p className="text-sm text-zinc-500 font-medium mb-3">@{profileUser.username}</p>
                  {profileUser.bio && (
                    <p className="text-sm text-zinc-700 max-w-xl mb-4 leading-relaxed whitespace-pre-line">
                      {profileUser.bio}
                    </p>
                  )}

                  {/* Followers & Following Stats */}
                  <div className="flex items-center gap-6 pt-2 border-t border-zinc-100 text-sm">
                    <div>
                      <span className="font-extrabold text-zinc-900">{followersCount}</span>{' '}
                      <span className="text-zinc-500">Người theo dõi</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-900">{followingCount}</span>{' '}
                      <span className="text-zinc-500">Đang theo dõi</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-900">{pets.length}</span>{' '}
                      <span className="text-zinc-500">Bé cưng</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-900">{posts.length}</span>{' '}
                      <span className="text-zinc-500">Bài viết</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pet Profiles Section */}
            <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🐾</span>
                  <h2 className="text-lg font-black text-zinc-900">
                    Bé cưng của {profileUser.fullName} ({pets.length})
                  </h2>
                </div>
                {isOwner && (
                  <button
                    onClick={() => {
                      setEditingPet(null);
                      setIsPetModalOpen(true);
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm mới</span>
                  </button>
                )}
              </div>

              {pets.length === 0 ? (
                <div className="py-8 text-center bg-orange-50/40 rounded-2xl border border-dashed border-orange-200">
                  <PawPrint className="w-8 h-8 mx-auto text-orange-300 mb-2" />
                  <p className="text-sm font-semibold text-zinc-600">Chưa có hồ sơ thú cưng nào</p>
                  {isOwner && (
                    <button
                      onClick={() => setIsPetModalOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo hồ sơ cho bé ngay</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pets.map((pet) => (
                    <div
                      key={pet.id}
                      className="p-4 rounded-2xl bg-orange-50/30 border border-orange-100 hover:border-orange-200 transition relative flex gap-3.5 items-center group"
                    >
                      <img
                        src={pet.avatarUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=200&q=80'}
                        alt={pet.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-orange-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-extrabold text-zinc-900 truncate">{pet.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-orange-200 text-zinc-700 font-semibold shrink-0">
                            {pet.species === 'DOG' ? 'Chó 🐶' : pet.species === 'CAT' ? 'Mèo 🐱' : 'Khác 🐾'}
                          </span>
                        </div>
                        {pet.breed && <p className="text-xs text-zinc-600 font-medium truncate mb-1">Giống: {pet.breed}</p>}
                        {pet.bio && <p className="text-xs text-zinc-500 line-clamp-1">{pet.bio}</p>}
                      </div>

                      {/* Owner actions */}
                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingPet(pet);
                              setIsPetModalOpen(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-white transition"
                            title="Chỉnh sửa bé"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePet(pet.id, pet.name)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="Xóa hồ sơ bé (bảo toàn bài viết)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Posts Tabs Header */}
            <div className="flex items-center gap-2 border-b border-orange-200/60 mb-6 px-1">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex items-center gap-1.5 py-3 px-4 font-bold text-sm border-b-2 transition ${
                  activeTab === 'ALL'
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Tất cả bài ({posts.filter((p) => p.status !== 'HIDDEN').length})</span>
              </button>

              <button
                onClick={() => setActiveTab('IMAGE')}
                className={`flex items-center gap-1.5 py-3 px-4 font-bold text-sm border-b-2 transition ${
                  activeTab === 'IMAGE'
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Hình ảnh</span>
              </button>

              <button
                onClick={() => setActiveTab('VIDEO')}
                className={`flex items-center gap-1.5 py-3 px-4 font-bold text-sm border-b-2 transition ${
                  activeTab === 'VIDEO'
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video ngắn</span>
              </button>

              {isOwner && (
                <button
                  onClick={() => setActiveTab('HIDDEN')}
                  className={`flex items-center gap-1.5 py-3 px-4 font-bold text-sm border-b-2 transition ${
                    activeTab === 'HIDDEN'
                      ? 'border-zinc-800 text-zinc-900'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Bài đã ẩn ({posts.filter((p) => p.status === 'HIDDEN').length})</span>
                </button>
              )}
            </div>

            {/* Posts List */}
            {filteredPosts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-orange-100 shadow-sm">
                <Sparkles className="w-8 h-8 mx-auto text-orange-300 mb-2" />
                <p className="text-base font-bold text-zinc-700">Chưa có bài viết nào trong mục này</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {isOwner ? 'Hãy bấm nút "Đăng bài" để chia sẻ khoảnh khắc đầu tiên của bé nhé!' : 'Người dùng chưa có bài viết nào.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onTriggerGuestModal={() => setIsLoginOpen(true)}
                    onReportPost={(postId) => setReportingPostId(postId)}
                    onHidePost={async () => { fetchProfile(); }}
                    onDeletePost={async () => { fetchProfile(); }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {isCreatePostOpen && currentUser && (
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          userPets={pets}
          onPostCreated={() => {
            setIsCreatePostOpen(false);
            fetchProfile();
          }}
          userId={currentUser.id}
        />
      )}

      {isPetModalOpen && currentUser && (
        <PetModal
          isOpen={isPetModalOpen}
          onClose={() => {
            setIsPetModalOpen(false);
            setEditingPet(null);
          }}
          onPetCreated={() => {
            setIsPetModalOpen(false);
            setEditingPet(null);
            fetchProfile();
          }}
          userId={currentUser.id}
        />
      )}

      {isLoginOpen && (
        <GuestModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={() => {
            setIsLoginOpen(false);
            checkAuth();
            fetchProfile();
          }}
        />
      )}

      {reportingPostId && currentUser && (
        <ReportModal
          isOpen={Boolean(reportingPostId)}
          onClose={() => setReportingPostId(null)}
          postId={reportingPostId}
          userId={currentUser.id}
        />
      )}
    </div>
  );
}
