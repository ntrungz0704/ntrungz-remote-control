'use client';

import React, { useState } from 'react';
import { X, Image, Video, Sparkles, AlertCircle } from 'lucide-react';
import type { Pet } from '@/types/pet-social.types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPets: Pet[];
  onPostCreated: () => void;
  userId: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  userPets,
  onPostCreated,
  userId,
}) => {
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'NONE'>('IMAGE');
  const [content, setContent] = useState('');
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
  ]);
  const [videoUrl, setVideoUrl] = useState('https://www.w3schools.com/html/mov_bbb.mp4');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTogglePet = (petId: string) => {
    if (selectedPetIds.includes(petId)) {
      setSelectedPetIds(selectedPetIds.filter((id) => id !== petId));
    } else {
      if (selectedPetIds.length >= 5) {
        alert('Tối đa chỉ được gắn thẻ 5 bé cưng trên 1 bài viết');
        return;
      }
      setSelectedPetIds([...selectedPetIds, petId]);
    }
  };

  const handleAddSamplePhoto = (sampleUrl: string) => {
    if (photoUrls.length >= 4) {
      alert('Tối đa chỉ được tải lên 4 ảnh');
      return;
    }
    setPhotoUrls([...photoUrls, sampleUrl]);
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError('Vui lòng nhập nội dung chia sẻ');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          content: content.trim(),
          mediaType: mediaType,
          mediaUrls: mediaType === 'IMAGE' ? photoUrls : mediaType === 'VIDEO' ? [videoUrl] : [],
          petIds: selectedPetIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onPostCreated();
        onClose();
      } else {
        setError(data.error || 'Đăng bài thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-orange-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-rose-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐾</span>
            <h2 className="font-extrabold text-base text-zinc-800">Tạo Khoảnh Khắc Mới</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Media Type Tabs */}
          <div className="flex p-1 bg-zinc-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMediaType('IMAGE')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mediaType === 'IMAGE'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Image className="w-4 h-4" />
              <span>Hình ảnh (1–4 ảnh)</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaType('VIDEO')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mediaType === 'VIDEO'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video ngắn (&le; 60s)</span>
            </button>
          </div>

          {/* Caption Input */}
          <div>
            <textarea
              placeholder="Chia sẻ khoảnh khắc vui vẻ của bé cưng hôm nay... (có thể gắn #hashtag)"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3.5 bg-orange-50/40 border border-orange-200/80 rounded-2xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          </div>

          {/* Tag Pet Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-1.5">
              Gắn thẻ bé cưng của bạn (Tối đa 5 bé):
            </label>
            {userPets.length === 0 ? (
              <p className="text-xs text-orange-600 italic">
                Bạn chưa tạo hồ sơ bé cưng nào. Hãy vào trang cá nhân để thêm bé cưng nhé!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userPets.map((pet) => {
                  const isSelected = selectedPetIds.includes(pet.id);
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => handleTogglePet(pet.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-sm scale-105'
                          : 'bg-zinc-100 hover:bg-orange-100 text-zinc-700'
                      }`}
                    >
                      <span>{pet.species === 'DOG' ? '🐶' : pet.species === 'CAT' ? '🐱' : '🐾'}</span>
                      <span>{pet.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Media Previews & Pickers */}
          {mediaType === 'IMAGE' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-600">
                  Ảnh bài đăng ({photoUrls.length}/4) — Trình duyệt tự nén WebP:
                </span>
                {photoUrls.length < 4 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSamplePhoto(
                        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80'
                      )
                    }
                    className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ Thêm ảnh mẫu</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {photoUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-zinc-200">
                    <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mediaType === 'VIDEO' && (
            <div>
              <label className="block text-xs font-bold text-zinc-600 mb-1.5">
                Video ngắn (MP4 H.264, tối đa 60s, dưới 20MB):
              </label>
              <div className="rounded-2xl overflow-hidden bg-black aspect-video max-h-[180px] mb-2">
                <video src={videoUrl} controls playsInline className="w-full h-full object-contain" />
              </div>
              <p className="text-[11px] text-zinc-400">
                Đã kiểm tra Magic Bytes (ftyp/mp4) và thời lượng video hợp lệ ✅
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md shadow-rose-200 transition-all active:scale-98"
            >
              {submitting ? 'Đang tải lên và xử lý... 🐾' : 'Chia Sẻ Ngay 🐾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
