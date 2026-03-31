import { supabase } from '@/integrations/supabase/client';

// Shared Supabase client — avoid creating a second auth client instance
export const db = supabase;
