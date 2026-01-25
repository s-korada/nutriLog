'use client';

import { useState } from 'react';
import type { Meal, OverallCategory, MealComponent } from '@/lib/types';

interface MealCardProps {
  meal: Meal;
}

const categoryConfig: Record<OverallCategory, { label: string; icon: string; classes: string }> = {
  home_cooked: {
    label: 'Home Cooked',
    icon: '🏠',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  mixed: {
    label: 'Mixed',
    icon: '🔀',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  restaurant: {
    label: 'Restaurant',
    icon: '🍽️',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  processed: {
    label: 'Processed',
    icon: '📦',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
};

const componentCategoryColors: Record<string, string> = {
  non_processed: 'bg-green-100 text-green-700',
  restaurant: 'bg-yellow-100 text-yellow-700',
  processed: 'bg-red-100 text-red-700',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MealCard({ meal }: MealCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine overall category (use overall_category or derive from category)
  const overallCategory: OverallCategory =
    meal.overall_category ||
    (meal.category === 'non_processed' ? 'home_cooked' : (meal.category as OverallCategory));

  const config = categoryConfig[overallCategory];
  const components = meal.components || [];
  const hasComponents = components.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.classes}`}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </span>
              {meal.rating && (
                <span className="text-lg" title={meal.rating === 'liked' ? 'Liked' : 'Disliked'}>
                  {meal.rating === 'liked' ? '👍' : '👎'}
                </span>
              )}
              {hasComponents && (
                <span className="text-xs text-gray-400">
                  {components.length} item{components.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-gray-800 font-medium truncate">{meal.meal_description}</p>
            {meal.estimated_calories && (
              <p className="text-sm text-gray-500 mt-1">
                {meal.estimated_calories} cal | {meal.estimated_protein || 0}g protein
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatDate(meal.logged_at)}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
      </button>

      {isExpanded && hasComponents && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-600 mt-3 mb-2">Component Breakdown</h4>
          <div className="space-y-2">
            {components.map((comp: MealComponent) => (
              <div
                key={comp.id}
                className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{comp.component_name}</p>
                  {comp.reasoning && (
                    <p className="text-xs text-gray-500 mt-0.5">{comp.reasoning}</p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${componentCategoryColors[comp.category]}`}
                >
                  {comp.category === 'non_processed'
                    ? 'Home'
                    : comp.category === 'restaurant'
                    ? 'Restaurant'
                    : 'Processed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && !hasComponents && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <p className="text-sm text-gray-400 mt-3">
            No component breakdown available for this meal.
          </p>
        </div>
      )}
    </div>
  );
}
