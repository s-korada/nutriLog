import { NextRequest, NextResponse } from 'next/server';
import { supabase, getDefaultUser } from '@/lib/supabase';
import type { Meal } from '@/lib/types';

// GET /api/meals - Get all meals for the user
export async function GET(request: NextRequest) {
  try {
    const user = await getDefaultUser();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte('logged_at', startDate);
    }
    if (endDate) {
      query = query.lte('logged_at', endDate);
    }

    const { data: meals, error } = await query;

    if (error) {
      console.error('Error fetching meals:', error);
      return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }

    return NextResponse.json({ meals: meals as Meal[] });
  } catch (error) {
    console.error('Meals API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
