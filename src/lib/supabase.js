import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jitkwbatwymqtlzxiyil.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug logging (remove in production if needed)
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase Config:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length || 0,
    keyPreview: supabaseAnonKey ? supabaseAnonKey.substring(0, 30) + '...' : 'MISSING'
  });
}

// Only create client if we have a key (prevents errors in production if env var is missing)
export const supabase = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase && typeof window !== 'undefined') {
  console.error('❌ Supabase client NOT created - missing VITE_SUPABASE_ANON_KEY');
  console.error('Set VITE_SUPABASE_ANON_KEY in Netlify environment variables');
}
