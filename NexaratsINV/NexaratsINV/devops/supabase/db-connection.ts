// @ts-ignore - Module will be resolved when integrated into backend
import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = process.env.SUPABASE_URL!;
// @ts-ignore
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Backend-only client with elevated permissions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
