'use client';

import { useState, useEffect } from 'react';
import MealRating from './MealRating';
import type { Meal, MealRating as MealRatingType } from '@/lib/types';

const categoryColors = {
  non_processed: 'bg-green-100 text-green-700 border-green-200',
  restaurant: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  processed: 'bg-red-100 text-red-700 border-red-200',
};

const categoryLabels = {
  non_processed: 'Home-cooked',
  restaurant: 'Restaurant',
  processed: 'Processed',
};

export default function MealHistory() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await fetch('/api/meals?limit=20');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setMeals(data.meals || []);
      }
    } catch (err) {
      setError('Failed to load meals');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (mealId: string, rating: MealRatingType) => {
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });

      if (response.ok) {
        setMeals((prev) =>
          prev.map((m) => (m.id === mealId ? { ...m, rating } : m))
        );
      }
    } catch (err) {
      console.error('Failed to rate meal:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
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
          onClick={fetchMeals}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <p>No meals logged yet. Start by logging your first meal!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-700">Recent Meals</h3>
      <div className="space-y-3">
        {meals.map((meal) => (
          <div
            key={meal.id}
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-gray-800">{meal.meal_description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full border ${
                      categoryColors[meal.category]
                    }`}
                  >
                    {categoryLabels[meal.category]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(meal.logged_at)}
                  </span>
                </div>
                {meal.estimated_calories && (
                  <p className="text-sm text-gray-500 mt-1">
                    ~{meal.estimated_calories} cal
                    {meal.estimated_protein && ` | ${meal.estimated_protein}g protein`}
                  </p>
                )}
              </div>
              <MealRating
                mealId={meal.id}
                currentRating={meal.rating}
                onRate={handleRate}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
