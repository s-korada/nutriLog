'use client';

import { useState, useEffect } from 'react';
import type { MealSummary } from '@/lib/types';

const categoryColors = {
  non_processed: 'bg-green-500',
  restaurant: 'bg-yellow-500',
  processed: 'bg-red-500',
};

export default function WeeklySummary() {
  const [summary, setSummary] = useState<MealSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/meals/summary?days=7');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSummary(data.summary);
      }
    } catch (err) {
      setError('Failed to load summary');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <p>{error}</p>
        <button
          onClick={fetchSummary}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary || summary.totalMeals === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <div className="text-4xl mb-4">📊</div>
        <p>No meals logged this week yet.</p>
        <p className="text-sm mt-2">Start tracking to see your weekly insights!</p>
      </div>
    );
  }

  const total = summary.totalMeals;
  const getPercentage = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Meals</p>
          <p className="text-3xl font-bold text-gray-800">{summary.totalMeals}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Avg Calories</p>
          <p className="text-3xl font-bold text-gray-800">
            {summary.averageCalories || '—'}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Meal Categories</h3>

        {/* Progress Bar */}
        <div className="h-4 rounded-full overflow-hidden flex mb-4">
          <div
            className={`${categoryColors.non_processed} transition-all`}
            style={{ width: `${getPercentage(summary.byCategory.non_processed)}%` }}
          />
          <div
            className={`${categoryColors.restaurant} transition-all`}
            style={{ width: `${getPercentage(summary.byCategory.restaurant)}%` }}
          />
          <div
            className={`${categoryColors.processed} transition-all`}
            style={{ width: `${getPercentage(summary.byCategory.processed)}%` }}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">
              Home ({summary.byCategory.non_processed})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600">
              Restaurant ({summary.byCategory.restaurant})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">
              Processed ({summary.byCategory.processed})
            </span>
          </div>
        </div>
      </div>

      {/* Rating Summary */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Your Ratings</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">👍</div>
            <p className="text-xl font-bold text-green-600">{summary.byRating.liked}</p>
            <p className="text-xs text-gray-500">Liked</p>
          </div>
          <div>
            <div className="text-2xl mb-1">👎</div>
            <p className="text-xl font-bold text-red-600">{summary.byRating.disliked}</p>
            <p className="text-xs text-gray-500">Disliked</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🤷</div>
            <p className="text-xl font-bold text-gray-600">{summary.byRating.unrated}</p>
            <p className="text-xs text-gray-500">Unrated</p>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>✨</span> AI Insights
        </h3>
        <ul className="space-y-2">
          {summary.insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-2 text-gray-700">
              <span className="text-green-500 mt-1">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Liked Meals */}
      {summary.likedMeals.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Your Favorites</h3>
          <div className="space-y-2">
            {summary.likedMeals.slice(0, 5).map((meal) => (
              <div
                key={meal.id}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <span>👍</span>
                <span>{meal.meal_description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
