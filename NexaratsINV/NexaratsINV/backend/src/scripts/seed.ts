/**
 * Seed Script — Creates the initial Super Admin user with a hashed password.
 * Run: npm run seed
 *
 * IMPORTANT: Set SEED_ADMIN_PASSWORD in your .env before running.
 * NEVER hardcode passwords in source code (FIX C1).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@nexarats.com';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Super Admin';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
}

if (!SEED_ADMIN_PASSWORD || SEED_ADMIN_PASSWORD.length < 8) {
    console.error('❌ SEED_ADMIN_PASSWORD must be at least 8 characters in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SUPER_ADMIN_PERMISSIONS = {
    dashboard: 'manage', billing: 'manage', inventory: 'manage',
    customers: 'manage', vendors: 'manage', analytics: 'manage',
    settings: 'manage', 'online-store': 'manage', admin: 'manage',
};

async function seed() {
    console.log('🌱 Seeding initial Super Admin...');

    // Check if user already exists
    const { data: existing } = await supabase
        .from('admin_users')
        .select('id, email')
        .eq('email', SEED_ADMIN_EMAIL)
        .single();

    if (existing) {
        console.log(`✅ Admin user already exists: ${SEED_ADMIN_EMAIL}`);
        process.exit(0);
    }

    // Hash password — FIX C1: never store plain text
    const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD!, 12);

    const { data, error } = await supabase
        .from('admin_users')
        .insert({
            name: SEED_ADMIN_NAME,
            email: SEED_ADMIN_EMAIL,
            password: hashedPassword,
            role: 'Super Admin',
            status: 'Active',
            permissions: SUPER_ADMIN_PERMISSIONS,
        })
        .select('id, name, email, role')
        .single();

    if (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }

    console.log(`✅ Super Admin created:`);
    console.log(`   ID:    ${data.id}`);
    console.log(`   Name:  ${data.name}`);
    console.log(`   Email: ${data.email}`);
    console.log(`   Role:  ${data.role}`);
    console.log(`\n⚠️  Login with: ${SEED_ADMIN_EMAIL} and your SEED_ADMIN_PASSWORD`);
    console.log('   Remove SEED_ADMIN_PASSWORD from .env after first login!\n');

    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Unexpected seed error:', err);
    process.exit(1);
});
