'use client';

import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { PetSpecies, PetGender } from '@/types/pet-social.types';

interface PetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPetCreated: () => void;
  userId: string;
}

export const PetModal: React.FC<PetModalProps> = ({ isOpen, onClose, onPetCreated, userId }) => {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<PetSpecies>('DOG');
  const [breed, setBreed] = useState('Corgi');
  const [gender, setGender] = useState<PetGender>('MALE');
  const [birthDate, setBirthDate] = useState('2023-05-10');
  const [bio, setBio] = useState('Bé rất ngoan và thích đi dạo.');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !breed.trim()) {
      setError('Vui lòng nhập tên và giống của bé cưng');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          name: name.trim(),
          species,
          breed: breed.trim(),
          gender,
          birthDate,
          bio,
          avatarUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onPetCreated();
        onClose();
      } else {
        setError(data.error || 'Tạo hồ sơ thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-orange-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐶🐱</span>
            <h2 className="font-extrabold text-base text-zinc-800">Thêm Hồ Sơ Bé Cưng Mới</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Tên bé cưng *</label>
            <input
              type="text"
              placeholder="Ví dụ: Lu Lu, Miu Miu, Cà Phê..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-orange-50/40 border border-orange-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">Phân loài *</label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value as PetSpecies)}
                className="w-full p-2.5 bg-orange-50/40 border border-orange-200 rounded-xl text-zinc-800 focus:outline-none"
              >
                <option value="DOG">🐶 Chó</option>
                <option value="CAT">🐱 Mèo</option>
                <option value="OTHER">🐾 Thú nhỏ khác</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-zinc-700 mb-1">Giới tính</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as PetGender)}
                className="w-full p-2.5 bg-orange-50/40 border border-orange-200 rounded-xl text-zinc-800 focus:outline-none"
              >
                <option value="MALE">Đực</option>
                <option value="FEMALE">Cái</option>
                <option value="UNKNOWN">Chưa rõ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Giống cụ thể *</label>
            <input
              type="text"
              placeholder="Ví dụ: Corgi, Golden, Mèo Mướp, Poodle..."
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full p-2.5 bg-orange-50/40 border border-orange-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Ngày sinh (ước lượng)</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full p-2.5 bg-orange-50/40 border border-orange-200 rounded-xl text-zinc-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Giới thiệu ngắn về bé</label>
            <textarea
              rows={2}
              placeholder="Tính cách, sở thích ăn uống, tật xấu đáng yêu..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-2.5 bg-orange-50/40 border border-orange-200 rounded-xl text-zinc-800 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-orange-200 transition-all mt-2"
          >
            {submitting ? 'Đang tạo hồ sơ...' : 'Lưu Thẻ Bé Cưng 🐾'}
          </button>
        </form>
      </div>
    </div>
  );
};
