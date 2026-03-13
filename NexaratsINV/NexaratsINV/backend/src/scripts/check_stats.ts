import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkStatsTable() {
    console.log('--- Checking performance_stats table ---');
    const { data, error } = await supabase
        .from('performance_stats')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching performance_stats:', error.message);
        if (error.message.includes('relation "performance_stats" does not exist')) {
            console.log('The table was never created because I could not run the SQL.');
        }
    } else {
        console.log('Stats table exists! Row count:', data.length);
        console.log('Sample rows:', data);
    }
}

checkStatsTable();
