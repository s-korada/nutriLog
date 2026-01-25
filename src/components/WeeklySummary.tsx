'use client';

import { useState, useEffect } from 'react';
import type { WeeklySummaryV2 } from '@/lib/types';
import StatCard from './StatCard';
import ComponentPieChart from './ComponentPieChart';
import MealCard from './MealCard';

export default function WeeklySummary() {
  const [summary, setSummary] = useState<WeeklySummaryV2 | null>(null);
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

  if (!summary || summary.mealStats.total === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <div className="text-4xl mb-4">📊</div>
        <p>No meals logged this week yet.</p>
        <p className="text-sm mt-2">Start tracking to see your weekly insights!</p>
      </div>
    );
  }

  const { componentStats, mealStats, meals, byRating, averageCalories, insights } = summary;

  return (
    <div className="space-y-6">
      {/* Part 1: Component-Level Statistics */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Items Consumed This Week
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({componentStats.total} total items)
          </span>
        </h3>

        {componentStats.total > 0 ? (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatCard
                label="Home Cooked"
                count={componentStats.byCategory.non_processed}
                percentage={componentStats.percentages.non_processed}
                color="green"
                icon="🏠"
              />
              <StatCard
                label="Restaurant"
                count={componentStats.byCategory.restaurant}
                percentage={componentStats.percentages.restaurant}
                color="yellow"
                icon="🍽️"
              />
              <StatCard
                label="Processed"
                count={componentStats.byCategory.processed}
                percentage={componentStats.percentages.processed}
                color="red"
                icon="📦"
              />
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <ComponentPieChart stats={componentStats} />
            </div>
          </>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
            <p>No component data yet. Log meals with the new format to see breakdowns.</p>
          </div>
        )}
      </section>

      {/* Overview Stats */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Meals</p>
          <p className="text-3xl font-bold text-gray-800">{mealStats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Avg Calories</p>
          <p className="text-3xl font-bold text-gray-800">{averageCalories || '—'}</p>
        </div>
      </section>

      {/* Meal Category Breakdown */}
      <section className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Meal Categories</h3>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div>
            <div className="text-2xl mb-1">🏠</div>
            <p className="text-xl font-bold text-green-600">{mealStats.byCategory.home_cooked}</p>
            <p className="text-xs text-gray-500">Home</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🔀</div>
            <p className="text-xl font-bold text-blue-600">{mealStats.byCategory.mixed}</p>
            <p className="text-xs text-gray-500">Mixed</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🍽️</div>
            <p className="text-xl font-bold text-yellow-600">{mealStats.byCategory.restaurant}</p>
            <p className="text-xs text-gray-500">Restaurant</p>
          </div>
          <div>
            <div className="text-2xl mb-1">📦</div>
            <p className="text-xl font-bold text-red-600">{mealStats.byCategory.processed}</p>
            <p className="text-xs text-gray-500">Processed</p>
          </div>
        </div>
      </section>

      {/* Rating Summary */}
      <section className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Your Ratings</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">👍</div>
            <p className="text-xl font-bold text-green-600">{byRating.liked}</p>
            <p className="text-xs text-gray-500">Liked</p>
          </div>
          <div>
            <div className="text-2xl mb-1">👎</div>
            <p className="text-xl font-bold text-red-600">{byRating.disliked}</p>
            <p className="text-xs text-gray-500">Disliked</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🤷</div>
            <p className="text-xl font-bold text-gray-600">{byRating.unrated}</p>
            <p className="text-xs text-gray-500">Unrated</p>
          </div>
        </div>
      </section>

      {/* AI Insights */}
      <section className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>✨</span> AI Insights
        </h3>
        <ul className="space-y-2">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-2 text-gray-700">
              <span className="text-green-500 mt-1">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Part 2: Meal List with Labels */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Meals This Week</h3>
        <div className="space-y-3">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      </section>
    </div>
  );
}
