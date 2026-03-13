// @ts-ignore - Module will be resolved when integrated into frontend
import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Frontend-safe client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
