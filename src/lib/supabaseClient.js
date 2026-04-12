import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Browser Supabase client (Vite exposes `import.meta.env.VITE_*`). */
export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;
