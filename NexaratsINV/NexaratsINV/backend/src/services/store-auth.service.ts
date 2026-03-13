import { supabaseAdmin } from '../supabase/client';
import { hashPassword, comparePassword } from '../utils/hash';
import { AuthError, ConflictError, NotFoundError, wrapDatabaseError } from '../utils/errors';
import { randomBytes, randomInt } from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const log = logger('StoreAuthService');

/**
 * StoreAuthService — FIX C3: Server-side session management.
 * Sessions are now stored in `store_sessions` table with expiry timestamps.
 * Logout deletes the session row — real server-side invalidation.
 * OTP codes are stored hashed with TTL and attempt limits.
 *
 * FIX B7: OTP now generated with crypto.randomInt() for cryptographic safety.
 * FIX B1: findOrCreateByPhone() now throws on insert failure instead of returning undefined.
 */

export class StoreAuthService {
    /** FIX B7: Cryptographically secure OTP generation */
    private generateOtp(): string {
        return randomInt(100000, 999999).toString();
    }

    private generateSessionToken(): string {
        return randomBytes(48).toString('hex');
    }

    async sendOtp(phone: string): Promise<{ message: string }> {
        // Check attempt limit (FIX for OTP brute-force — Risk table item)
        const windowStart = new Date(Date.now() - parseInt(env.OTP_EXPIRES_MINUTES) * 60 * 1000);
        const { count, error: countError } = await supabaseAdmin
            .from('otp_codes')
            .select('*', { count: 'exact', head: true })
            .eq('phone', phone)
            .gte('created_at', windowStart.toISOString());

        if (countError) {
            log.error('Failed to check OTP attempt count', countError);
            // Continue — don't block user if count check fails
        }

        if ((count ?? 0) >= parseInt(env.OTP_MAX_ATTEMPTS)) {
            throw new AuthError('Too many OTP requests. Please wait before requesting again.');
        }

        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + parseInt(env.OTP_EXPIRES_MINUTES) * 60 * 1000);
        const hashedOtp = await hashPassword(otp);

        const { error: insertError } = await supabaseAdmin.from('otp_codes').insert({
            phone,
            code: hashedOtp,
            expires_at: expiresAt.toISOString(),
        });

        if (insertError) {
            log.error('Failed to insert OTP record', insertError);
            throw wrapDatabaseError(insertError, 'StoreAuth.sendOtp');
        }

        // Always log in dev for debugging
        if (env.NODE_ENV === 'development') {
            log.debug(`OTP for ${phone}: ${otp}`);
        }

        // ─── Send OTP via WhatsApp ───────────────────────────────────────────
        // Uses /send-direct (bypasses queue) because OTPs are time-sensitive
        let cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.length === 10) cleaned = '91' + cleaned;
        const chatId = `${cleaned}@c.us`;

        const otpMessage =
            `🔐 *NEXA POS — Verification Code*\n\n` +
            `Your OTP is: *${otp}*\n\n` +
            `⏰ Expires in ${env.OTP_EXPIRES_MINUTES} minutes.\n` +
            `Do not share this code with anyone.`;

        try {
            const WA_BASE = 'http://127.0.0.1:5005/api/whatsapp';
            const waRes = await fetch(`${WA_BASE}/send-direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, message: otpMessage }),
            });
            const waData = await waRes.json();
            if (!waData.success) {
                log.warn(`WhatsApp OTP delivery failed for ${phone}: ${waData.error}`);
                // Don't throw — OTP is stored, user can see it in dev logs or retry
            } else {
                log.info(`OTP sent via WhatsApp to ${phone.slice(-4)}`);
            }
        } catch (waErr: any) {
            log.warn(`WhatsApp service unreachable for OTP delivery: ${waErr.message}`);
            // Don't throw — OTP is stored, fall back to dev console log
        }

        return { message: 'OTP sent successfully' };
    }

    async verifyOtp(phone: string, otp: string): Promise<{ token: string; customer: any }> {
        const now = new Date().toISOString();

        // Get latest unused, unexpired OTP for this phone
        const { data: otpRecord } = await supabaseAdmin
            .from('otp_codes')
            .select('code, expires_at, used')
            .eq('phone', phone)
            .eq('used', false)
            .gte('expires_at', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!otpRecord) {
            throw new AuthError('OTP expired or not found. Please request a new OTP.');
        }

        const valid = await comparePassword(otp, otpRecord.code);
        if (!valid) {
            throw new AuthError('Invalid OTP');
        }

        // Mark OTP as used
        await supabaseAdmin
            .from('otp_codes')
            .update({ used: true })
            .eq('phone', phone)
            .eq('used', false);

        // Find or create store customer
        let customer = await this.findOrCreateByPhone(phone);

        // Create server-side session (FIX C3)
        const token = this.generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(env.STORE_SESSION_EXPIRES_DAYS));

        const { error: sessError } = await supabaseAdmin.from('store_sessions').insert({
            token,
            customer_id: customer.id,
            phone,
            expires_at: expiresAt.toISOString(),
        });

        if (sessError) {
            log.error('Failed to create store session', sessError);
            throw wrapDatabaseError(sessError, 'StoreAuth.verifyOtp.session');
        }

        return {
            token,
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                hasPassword: !!customer.password,
            },
        };
    }

    async loginWithPassword(phone: string, password: string): Promise<{ token: string; customer: any }> {
        const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (!customer) {
            throw new AuthError('No account found with this phone number');
        }
        if (!customer.password) {
            throw new AuthError('Account exists but no password is set. Please login with OTP first.');
        }

        const valid = await comparePassword(password, customer.password);
        if (!valid) {
            throw new AuthError('Invalid password');
        }

        const token = this.generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(env.STORE_SESSION_EXPIRES_DAYS));

        const { error: sessError } = await supabaseAdmin.from('store_sessions').insert({
            token,
            customer_id: customer.id,
            phone,
            expires_at: expiresAt.toISOString(),
        });

        if (sessError) {
            log.error('Failed to create login session', sessError);
            throw wrapDatabaseError(sessError, 'StoreAuth.loginWithPassword');
        }

        log.info(`Store login successful for phone ${phone.slice(-4)}`);
        return {
            token,
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                hasPassword: true,
            },
        };
    }

    async signup(phone: string, name: string, password: string): Promise<{ token: string; customer: any }> {
        const { data: existing } = await supabaseAdmin
            .from('customers')
            .select('id, password')
            .eq('phone', phone)
            .single();

        let newCustomerId = existing?.id;
        const hashedPw = await hashPassword(password);

        if (existing) {
            if (existing.password) {
                throw new ConflictError('An account with this phone number already exists with a password configured. Please login.');
            }
            // Existing customer from POS, let's upgrade their account to online by setting name & password
            const { data: updatedCustomer, error } = await supabaseAdmin
                .from('customers')
                .update({ name, password: hashedPw, channel: 'both' })
                .eq('id', existing.id)
                .select('*')
                .single();

            if (error || !updatedCustomer) throw wrapDatabaseError(error || 'Failed to update account', 'StoreAuth.signup');
        } else {
            // Totally new customer
            const { data: newCustomer, error } = await supabaseAdmin
                .from('customers')
                .insert({ name, phone, password: hashedPw, channel: 'online' })
                .select('*')
                .single();

            if (error || !newCustomer) {
                log.error('Signup insert failed', error);
                throw wrapDatabaseError(error || 'Failed to create account', 'StoreAuth.signup');
            }
            newCustomerId = newCustomer.id;
        }

        const token = this.generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(env.STORE_SESSION_EXPIRES_DAYS));

        await supabaseAdmin.from('store_sessions').insert({
            token,
            customer_id: newCustomerId,
            phone,
            expires_at: expiresAt.toISOString(),
        });

        log.info(`New store customer signup: ${phone.slice(-4)}`);
        return {
            token,
            customer: { id: newCustomerId, name, phone, hasPassword: true },
        };
    }

    async register(phone: string, name: string, email?: string): Promise<any> {
        const { data: existing } = await supabaseAdmin
            .from('customers')
            .select('id')
            .eq('phone', phone)
            .single();

        if (existing) {
            throw new ConflictError('Account already exists');
        }

        const { data, error } = await supabaseAdmin
            .from('customers')
            .insert({ name, phone, email: email || null, channel: 'online' })
            .select('id, name, phone, email')
            .single();

        if (error) throw wrapDatabaseError(error, 'StoreAuth.register');
        return data;
    }

    async setPassword(customerId: string, password: string): Promise<void> {
        const hashedPw = await hashPassword(password);
        const { error } = await supabaseAdmin
            .from('customers')
            .update({ password: hashedPw, updated_at: new Date().toISOString() })
            .eq('id', customerId);

        if (error) {
            log.error('Failed to set password', error);
            throw wrapDatabaseError(error, 'StoreAuth.setPassword');
        }
    }

    async getSession(token: string): Promise<any> {
        const { data: session } = await supabaseAdmin
            .from('store_sessions')
            .select('customer_id, phone, expires_at')
            .eq('token', token)
            .single();

        if (!session || new Date(session.expires_at) < new Date()) {
            return { loggedIn: false };
        }

        const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('id, name, phone, email, addresses, wishlist')
            .eq('id', session.customer_id)
            .single();

        return { loggedIn: true, phone: session.phone, customer };
    }

    async logout(token: string): Promise<void> {
        // FIX C3: Real server-side session deletion
        await supabaseAdmin.from('store_sessions').delete().eq('token', token);
    }

    /**
     * FIX B1: Now throws an error if both select and insert fail,
     * preventing undefined from being returned upstream.
     */
    private async findOrCreateByPhone(phone: string): Promise<any> {
        const { data: existing } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (existing) return existing;

        const { data: newCustomer, error } = await supabaseAdmin
            .from('customers')
            .insert({ name: phone, phone, channel: 'online' })
            .select('*')
            .single();

        if (error || !newCustomer) {
            log.error('Failed to create store customer by phone', error);
            throw wrapDatabaseError(
                error || 'Failed to create customer record',
                'StoreAuth.findOrCreateByPhone'
            );
        }

        return newCustomer;
    }
}

export const storeAuthService = new StoreAuthService();
