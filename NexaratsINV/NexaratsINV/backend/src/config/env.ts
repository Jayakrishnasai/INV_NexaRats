import { z } from 'zod';

const envSchema = z.object({
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    // Supabase
    SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
    SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

    // JWT Secrets — CRITICAL: must never be plain defaults
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES: z.string().default('15m'),
    JWT_REFRESH_EXPIRES: z.string().default('7d'),

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

    // WhatsApp
    WA_API_KEY: z.string().optional(),
    WA_SESSION_DIR: z.string().default('.wwebjs_auth'),

    // OTP
    OTP_EXPIRES_MINUTES: z.string().default('5'),
    OTP_MAX_ATTEMPTS: z.string().default('3'),

    // Store sessions
    STORE_SESSION_EXPIRES_DAYS: z.string().default('30'),

    // Razorpay (optional — if absent, online payments show a setup guide)
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),

    // ─── SaaS Billing ───────────────────────────────────────────────────────
    // AES-256-GCM key for encrypting per-tenant Razorpay key_secrets
    // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    RAZORPAY_ENCRYPTION_KEY: z.string().length(64, 'RAZORPAY_ENCRYPTION_KEY must be a 64-char hex string').optional(),

    // Razorpay webhook secret (from Razorpay Dashboard → Webhooks)
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    // Admin access — comma-separated IPs allowed to hit /api/v1/admin/*
    // Example: "1.2.3.4,5.6.7.8"  — leave empty to skip check in dev
    ADMIN_IP_ALLOWLIST: z.string().optional(),

    // Public URL of the SaaS frontend app (used for post-payment redirect)
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

const _parsed = envSchema.safeParse(process.env);
if (!_parsed.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(_parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = _parsed.data;
export type Env = typeof env;
