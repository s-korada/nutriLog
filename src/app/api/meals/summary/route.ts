import { NextRequest, NextResponse } from 'next/server';
import { supabase, getDefaultUser } from '@/lib/supabase';
import { generateWeeklyInsights } from '@/lib/groq';
import type { Meal, MealSummary } from '@/lib/types';

// GET /api/meals/summary - Get weekly summary with insights
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

    const { data: meals, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('Error fetching meals for summary:', error);
      return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }

    const typedMeals = meals as Meal[];

    // Calculate summary statistics
    const byCategory = {
      non_processed: 0,
      restaurant: 0,
      processed: 0,
    };

    const byRating = {
      liked: 0,
      disliked: 0,
      unrated: 0,
    };

    let totalCalories = 0;
    let mealsWithCalories = 0;
    const likedMeals: Meal[] = [];
    const dislikedMeals: Meal[] = [];

    typedMeals.forEach((meal) => {
      // Count by category
      if (meal.category in byCategory) {
        byCategory[meal.category]++;
      }

      // Count by rating
      if (meal.rating === 'liked') {
        byRating.liked++;
        likedMeals.push(meal);
      } else if (meal.rating === 'disliked') {
        byRating.disliked++;
        dislikedMeals.push(meal);
      } else {
        byRating.unrated++;
      }

      // Sum calories
      if (meal.estimated_calories) {
        totalCalories += meal.estimated_calories;
        mealsWithCalories++;
      }
    });

    const averageCalories =
      mealsWithCalories > 0 ? Math.round(totalCalories / mealsWithCalories) : 0;

    // Generate personalized insights using LLM
    const insights = await generateWeeklyInsights({
      totalMeals: typedMeals.length,
      byCategory,
      byRating,
      likedMeals: likedMeals.map((m) => m.meal_description),
      dislikedMeals: dislikedMeals.map((m) => m.meal_description),
    });

    const summary: MealSummary = {
      totalMeals: typedMeals.length,
      byCategory,
      byRating,
      averageCalories,
      insights,
      likedMeals,
      dislikedMeals,
    };

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
