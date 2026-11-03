'use client';

import React from 'react';
import { Trophy, Zap, Leaf, Sparkles } from 'lucide-react';
import type { SmartBadge as SmartBadgeType } from '@/types/carrier.types';

export interface SmartBadgeProps {
  type: SmartBadgeType;
  extraText?: string;
  size?: 'sm' | 'md';
}

export function SmartBadge({ type, extraText, size = 'sm' }: SmartBadgeProps) {
  const isSm = size === 'sm';

  switch (type) {
    case 'CHEAPEST':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${
            isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
          } bg-emerald-100 text-emerald-800 border-emerald-300`}
        >
          <Trophy className={isSm ? 'w-3.5 h-3.5 text-emerald-600' : 'w-4 h-4 text-emerald-600'} />
          <span>Rẻ nhất</span>
          {extraText && <span className="opacity-80 font-normal">({extraText})</span>}
        </span>
      );

    case 'FASTEST':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${
            isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
          } bg-amber-100 text-amber-800 border-amber-300`}
        >
          <Zap className={isSm ? 'w-3.5 h-3.5 text-amber-600' : 'w-4 h-4 text-amber-600'} />
          <span>Nhanh nhất</span>
          {extraText && <span className="opacity-80 font-normal">({extraText})</span>}
        </span>
      );

    case 'GREENEST':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${
            isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
          } bg-teal-100 text-teal-800 border-teal-300`}
        >
          <Leaf className={isSm ? 'w-3.5 h-3.5 text-teal-600' : 'w-4 h-4 text-teal-600'} />
          <span>Xanh nhất EV</span>
          {extraText && <span className="font-semibold text-teal-900">{extraText}</span>}
        </span>
      );

    case 'BEST_VALUE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${
            isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
          } bg-indigo-100 text-indigo-800 border-indigo-300`}
        >
          <Sparkles className={isSm ? 'w-3.5 h-3.5 text-indigo-600' : 'w-4 h-4 text-indigo-600'} />
          <span>Đề xuất tối ưu</span>
          {extraText && <span className="opacity-80 font-normal">({extraText})</span>}
        </span>
      );

    default:
      return null;
  }
}
