import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to get the default user (single-user mode for Phase 1)
export async function getDefaultUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching default user:', error);
    return null;
  }

  return data;
}
