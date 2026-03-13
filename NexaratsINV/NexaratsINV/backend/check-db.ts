import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProducts() {
    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('Error fetching count:', error);
    } else {
        console.log('Total products in database:', count);
    }
}

checkProducts();
