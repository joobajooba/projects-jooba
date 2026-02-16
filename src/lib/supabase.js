import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jitkwbatwymqtlzxiyil.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client if we have a key (prevents errors in production if env var is missing)
export const supabase = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Only log error if client creation failed (for debugging)
if (!supabase && typeof window !== 'undefined' && import.meta.env.DEV) {
  console.warn('Supabase client not initialized - check VITE_SUPABASE_ANON_KEY');
}
