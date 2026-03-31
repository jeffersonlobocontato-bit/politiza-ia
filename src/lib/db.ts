// Central Supabase client — use this everywhere in the app
import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } }
);
