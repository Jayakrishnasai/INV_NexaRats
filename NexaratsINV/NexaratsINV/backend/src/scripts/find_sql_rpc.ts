import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findExecSql() {
    console.log('--- Searching for SQL Execution RPC ---');
    
    // 1. Try common names
    const names = ['exec_sql', 'run_sql', 'execute_sql', 'sql'];
    for (const name of names) {
        const { error } = await supabase.rpc(name, { sql: 'SELECT 1' });
        if (!error || !error.message.includes('function "' + name + '" does not exist')) {
            console.log(`Potential match found: ${name}`);
            if (error) console.log(`Error (might be params): ${error.message}`);
            else console.log('Success! This RPC works.');
        }
    }

    // 2. Introspect functions if possible
    const { data: functions, error: funcError } = await supabase.from('pg_proc').select('proname').limit(10).catch(() => ({ data: null, error: 'no pg_proc access' }));
    console.log('pg_proc check:', functions || funcError);
}

findExecSql();
