import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logAgentActivity } from '@/lib/logger';
import type { MealRating } from '@/lib/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/meals/[id] - Get a specific meal
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data: meal, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Also get conversation history for this meal
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('meal_id', id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ meal, conversations: conversations || [] });
  } catch (error) {
    console.error('Get meal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/meals/[id] - Update a meal (primarily for rating)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rating } = body;

    // Validate rating
    if (rating !== undefined && !['liked', 'disliked', null].includes(rating)) {
      return NextResponse.json(
        { error: 'Invalid rating. Must be "liked", "disliked", or null' },
        { status: 400 }
      );
    }

    const { data: meal, error } = await supabase
      .from('meals')
      .update({ rating: rating as MealRating })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      await logAgentActivity(
        'database-error',
        { operation: 'update meal rating', error: error.message },
        id,
        'error'
      );
      return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 });
    }

    // Log the rating
    await logAgentActivity(
      'rating-submitted',
      {
        rating,
        mealDescription: meal.meal_description,
        category: meal.category,
        learningNote:
          '🎓 User feedback: Ratings are valuable signals for personalizing insights. We store this to generate better recommendations.',
      },
      id
    );

    return NextResponse.json({ meal });
  } catch (error) {
    console.error('Update meal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
