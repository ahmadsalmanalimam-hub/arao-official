import { createClient } from '@supabase/supabase-js';

// Supabase Configuration loaded from environment variables
export const SUPABASE_URL: string =
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) ||
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://voynwjawhoopoklunwbo.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY: string =
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_rX2ux0qWMl5XbbDourX61g_ldxTm2eD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log('[Supabase Client Initialized]:', SUPABASE_URL);
