import { NextRequest, NextResponse } from 'next/server';
import { supabase, getDefaultUser } from '@/lib/supabase';
import { generateWeeklyInsights } from '@/lib/groq';
import type { Meal, MealComponent, WeeklySummaryV2, ComponentStats, MealStats, OverallCategory } from '@/lib/types';

// GET /api/meals/summary - Get weekly summary with component stats
export async function GET(request: NextRequest) {
  try {
    const user = await getDefaultUser();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 500 });
    }

    // Get date range from query params (default to last 7 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // Fetch meals with their components
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: false });

    if (mealsError) {
      console.error('Error fetching meals for summary:', mealsError);
      return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }

    const typedMeals = meals as Meal[];
    const mealIds = typedMeals.map((m) => m.id);

    // Fetch all components for these meals
    let components: MealComponent[] = [];
    if (mealIds.length > 0) {
      const { data: comps, error: compsError } = await supabase
        .from('meal_components')
        .select('*')
        .in('meal_id', mealIds);

      if (compsError) {
        console.error('Error fetching meal components:', compsError);
      } else {
        components = comps as MealComponent[];
      }
    }

    // Group components by meal
    const componentsByMeal = new Map<string, MealComponent[]>();
    for (const comp of components) {
      const existing = componentsByMeal.get(comp.meal_id) || [];
      existing.push(comp);
      componentsByMeal.set(comp.meal_id, existing);
    }

    // Attach components to meals
    const mealsWithComponents = typedMeals.map((meal) => ({
      ...meal,
      components: componentsByMeal.get(meal.id) || [],
    }));

    // Calculate component-level statistics
    const componentStats: ComponentStats = {
      total: components.length,
      byCategory: {
        non_processed: 0,
        restaurant: 0,
        processed: 0,
      },
      percentages: {
        non_processed: '0',
        restaurant: '0',
        processed: '0',
      },
    };

    for (const comp of components) {
      if (comp.category in componentStats.byCategory) {
        componentStats.byCategory[comp.category as keyof typeof componentStats.byCategory]++;
      }
    }

    // Calculate percentages
    if (componentStats.total > 0) {
      componentStats.percentages.non_processed = (
        (componentStats.byCategory.non_processed / componentStats.total) * 100
      ).toFixed(1);
      componentStats.percentages.restaurant = (
        (componentStats.byCategory.restaurant / componentStats.total) * 100
      ).toFixed(1);
      componentStats.percentages.processed = (
        (componentStats.byCategory.processed / componentStats.total) * 100
      ).toFixed(1);
    }

    // Calculate meal-level statistics (by overall_category)
    const mealStats: MealStats = {
      total: typedMeals.length,
      byCategory: {
        home_cooked: 0,
        mixed: 0,
        restaurant: 0,
        processed: 0,
      },
    };

    const byRating = {
      liked: 0,
      disliked: 0,
      unrated: 0,
    };

    let totalCalories = 0;
    let mealsWithCalories = 0;

    for (const meal of typedMeals) {
      // Count by overall_category (fallback to deriving from category)
      const overallCat: OverallCategory = meal.overall_category ||
        (meal.category === 'non_processed' ? 'home_cooked' : meal.category as OverallCategory);

      if (overallCat in mealStats.byCategory) {
        mealStats.byCategory[overallCat]++;
      }

      // Count by rating
      if (meal.rating === 'liked') {
        byRating.liked++;
      } else if (meal.rating === 'disliked') {
        byRating.disliked++;
      } else {
        byRating.unrated++;
      }

      // Sum calories
      if (meal.estimated_calories) {
        totalCalories += meal.estimated_calories;
        mealsWithCalories++;
      }
    }

    const averageCalories =
      mealsWithCalories > 0 ? Math.round(totalCalories / mealsWithCalories) : 0;

    // Generate personalized insights using LLM
    const likedMeals = typedMeals.filter((m) => m.rating === 'liked');
    const dislikedMeals = typedMeals.filter((m) => m.rating === 'disliked');

    const insights = await generateWeeklyInsights({
      totalMeals: typedMeals.length,
      byCategory: {
        non_processed: mealStats.byCategory.home_cooked,
        restaurant: mealStats.byCategory.restaurant,
        processed: mealStats.byCategory.processed + mealStats.byCategory.mixed,
      },
      byRating,
      likedMeals: likedMeals.map((m) => m.meal_description),
      dislikedMeals: dislikedMeals.map((m) => m.meal_description),
    });

    const summary: WeeklySummaryV2 = {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      componentStats,
      meals: mealsWithComponents,
      mealStats,
      byRating,
      averageCalories,
      insights,
    };

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
