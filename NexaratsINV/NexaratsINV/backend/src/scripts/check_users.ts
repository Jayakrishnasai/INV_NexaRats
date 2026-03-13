import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
    const { data, error } = await supabase
        .from('admin_users')
        .select('id, name, email, role, status');
    
    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('Current Admin Users:', JSON.stringify(data, null, 2));
    }
}

checkUsers();
