'use client';

import { useState } from 'react';
import type { MealRating as MealRatingType } from '@/lib/types';

interface MealRatingProps {
  mealId: string;
  currentRating?: MealRatingType | null;
  onRate: (mealId: string, rating: MealRatingType) => void;
}

export default function MealRating({ mealId, currentRating, onRate }: MealRatingProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRate = async (rating: MealRatingType) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onRate(mealId, rating);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Rate:</span>
      <button
        onClick={() => handleRate('liked')}
        disabled={isLoading}
        className={`p-2 rounded-full transition-all ${
          currentRating === 'liked'
            ? 'bg-green-100 text-green-600 scale-110'
            : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
        } disabled:opacity-50`}
        title="I liked this"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={currentRating === 'liked' ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m7.029-8.77c-.32 1.372-.91 2.656-1.729 3.785l-.11.145A6.735 6.735 0 005.904 14.45H3.75a.75.75 0 01-.75-.75v-7.5a.75.75 0 01.75-.75h2.154a4.5 4.5 0 001.423-.23l.014-.004a4.498 4.498 0 001.553-.745l.009-.007a4.497 4.497 0 011.031-.66c.11-.042.222-.078.336-.108z"
          />
        </svg>
      </button>

      <button
        onClick={() => handleRate('disliked')}
        disabled={isLoading}
        className={`p-2 rounded-full transition-all ${
          currentRating === 'disliked'
            ? 'bg-red-100 text-red-600 scale-110'
            : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'
        } disabled:opacity-50`}
        title="I didn't like this"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={currentRating === 'disliked' ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.134 12.134 0 01-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.75 2.25 2.25 0 009.75 22a.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.51.587.93 1.251 1.234 1.976a.894.894 0 01-.121.875 1.206 1.206 0 01-.871.474h-.61a2.75 2.75 0 00-2.75 2.75v.001"
          />
        </svg>
      </button>
    </div>
  );
}
