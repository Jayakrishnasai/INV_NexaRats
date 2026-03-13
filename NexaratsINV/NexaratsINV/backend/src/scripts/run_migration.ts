import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(url, key);

async function runMigration() {
    try {
        console.log('Running SQL query to alter tables...');
        // Note: Supabase JS client does not natively run raw SQL without an RPC function
        // However, we can use the backend pg driver if available, but it's not.
        // Let's create an RPC or just use an approach to migrate data manually

        // Since we can't reliably run raw SQL through the @supabase/supabase-js client
        // Let's try to fetch old store_customers and insert them into customers
        const { data: storeCustomers, error: fetchError } = await supabase
            .from('store_customers')
            .select('*');

        if (fetchError) {
            console.error('Error fetching old store_customers:', fetchError.message);
        } else if (storeCustomers && storeCustomers.length > 0) {
            console.log(`Found ${storeCustomers.length} old store_customers. Converting to customers...`);

            let insertedCount = 0;
            for (const sc of storeCustomers) {
                // Check if a customer with the same phone already exists
                const { data: existing } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('phone', sc.phone)
                    .single();

                if (existing) {
                    // Update existing to have channel 'both' 
                    await supabase
                        .from('customers')
                        .update({ channel: 'both', password: sc.password })
                        .eq('id', existing.id);
                } else {
                    // Create new
                    await supabase
                        .from('customers')
                        .insert({
                            id: sc.id, // maintain ID
                            name: sc.name,
                            phone: sc.phone,
                            email: sc.email,
                            password: sc.password,
                            channel: 'online',
                            total_invoices: sc.total_orders || 0,
                            total_paid: sc.total_spent || 0,
                            created_at: sc.created_at
                        });
                }
                insertedCount++;
            }
            console.log(`Successfully migrated ${insertedCount} old store_customers.`);
        } else {
            console.log('No old store_customers to migrate.');
        }

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

runMigration();
