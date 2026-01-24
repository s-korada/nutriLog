import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AgentLog } from '@/lib/types';

// GET /api/logs - Get agent logs with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const logType = searchParams.get('logType');
    const logLevel = searchParams.get('logLevel');
    const mealId = searchParams.get('mealId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('agent_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (logType) {
      query = query.eq('log_type', logType);
    }
    if (logLevel) {
      query = query.eq('log_level', logLevel);
    }
    if (mealId) {
      query = query.eq('meal_id', mealId);
    }
    if (search) {
      query = query.ilike('message', `%${search}%`);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Get unique log types for filter dropdown
    const { data: logTypes } = await supabase
      .from('agent_logs')
      .select('log_type')
      .order('log_type');

    const uniqueLogTypes = [...new Set(logTypes?.map((l) => l.log_type) || [])];

    return NextResponse.json({
      logs: logs as AgentLog[],
      total: count,
      logTypes: uniqueLogTypes,
    });
  } catch (error) {
    console.error('Logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
