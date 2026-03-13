import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * Supabase Admin Client — uses service_role key.
 * This bypasses Row Level Security for all server-side operations.
 * NEVER expose this client or its key to the frontend.
 */
export const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
