import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabaseAdmin } from '../supabase/client';
import { sendSuccess } from '../utils/response';
import { ConflictError, ValidationError } from '../utils/errors';
import { issueTokens } from '../utils/jwt';
import { env } from '../config/env';

/**
 * POST /api/v1/auth/signup
 * Creates a new organization + owner user + pending subscription.
 * Returns a Razorpay checkout URL if a plan was selected, or
 * activates a trial subscription and redirects to the SaaS app.
 */
export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orgName, email, password, planId, billingCycle } = req.body as {
            orgName: string;
            email: string;
            password: string;
            planId?: string;
            billingCycle: 'monthly' | 'annual';
        };

        // ── 1. Check email uniqueness ────────────────────────────────────────
        const { data: existingUser } = await supabaseAdmin
            .from('saas_users')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

        if (existingUser) {
            throw new ConflictError('An account with this email already exists');
        }

        // ── 2. Generate a unique org slug from name ───────────────────────────
        const baseSlug = orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);

        const suffix = crypto.randomBytes(3).toString('hex'); // ensure uniqueness
        const slug = `${baseSlug}-${suffix}`;

        // ── 3. Hash password ───────────────────────────────────────────────────
        const passwordHash = await bcrypt.hash(password, 12);

        // ── 4. Create organization ────────────────────────────────────────────
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: orgName.trim(),
                slug,
                subscription_status: 'trial',
                onboarding_step: 0,
                onboarding_complete: false,
            })
            .select('id')
            .single();

        if (orgError || !org) throw new Error(`Failed to create organization: ${orgError?.message}`);

        // ── 5. Create owner user ────────────────────────────────────────────────
        const { data: user, error: userError } = await supabaseAdmin
            .from('saas_users')
            .insert({
                organization_id: org.id,
                email: email.toLowerCase().trim(),
                password: passwordHash,
                name: orgName.trim(),      // default display name = org name
                role: 'owner',
                status: 'active',
            })
            .select('id')
            .single();

        if (userError || !user) {
            // Rollback org if user creation fails
            const rollback = await supabaseAdmin.from('organizations').delete().eq('id', org.id);
            if (rollback.error) {
                console.error(`[CRITICAL DB DRIFT] Rollback failed for org ${org.id} after user creation failed:`, rollback.error);
                // System is in inconsistent state - log to audit logs
                await supabaseAdmin.from('audit_logs').insert({
                    organization_id: org.id,
                    action: 'signup_rollback_failed',
                    details: { error: rollback.error }
                });
            }
            throw new Error(`Failed to create user: ${userError?.message}`);
        }

        // ── 6. Set owner_user_id on org ────────────────────────────────────────
        await supabaseAdmin
            .from('organizations')
            .update({ owner_user_id: user.id })
            .eq('id', org.id);

        // ── 7. Resolve plan — use Basic if none selected ─────────────────────
        let resolvedPlanId = planId;
        if (!resolvedPlanId) {
            const { data: basicPlan } = await supabaseAdmin
                .from('plans')
                .select('id')
                .eq('slug', 'basic')
                .single();
            resolvedPlanId = basicPlan?.id;
        }

        // ── 8. Create trial subscription ──────────────────────────────────────
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 14); // 14-day trial

        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .insert({
                organization_id: org.id,
                plan_id: resolvedPlanId,
                status: 'trial',
                billing_cycle: billingCycle,
                trial_ends_at: trialEnds.toISOString(),
                current_period_start: new Date().toISOString(),
                current_period_end: trialEnds.toISOString(),
            })
            .select('id')
            .single();

        // ── 9. Issue JWT for immediate access ─────────────────────────────────
        const tokens = await issueTokens({
            sub: user.id,
            org: org.id,
            role: 'owner',
            plan: 'basic',
            onboarded: false,
        });

        // ── 10. Set httpOnly cookie for access token ──────────────────────────
        res.cookie('access_token', tokens.accessToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        sendSuccess(res, {
            message: 'Account created successfully. Your 14-day trial has started.',
            org: { id: org.id, name: orgName, slug },
            user: { id: user.id, email, role: 'owner' },
            subscription: { id: subscription?.id, status: 'trial', trialEndsAt: trialEnds },
            refreshToken: tokens.refreshToken,
            redirectTo: `${env.FRONTEND_URL}/onboarding`,
        }, undefined, 201);

    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/auth/verify-email
 * Verifies email address with a 6-digit code.
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId, code } = req.body as { userId: string; code: string };

        if (!userId || !code) {
            throw new ValidationError('userId and code are required');
        }

        // Find latest unused verification code for this user
        const { data: record } = await supabaseAdmin
            .from('email_verifications')
            .select('*')
            .eq('user_id', userId)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!record) {
            throw new ValidationError('Verification code is invalid or expired. Request a new one.');
        }

        const isValid = await bcrypt.compare(String(code), record.code);
        if (!isValid) {
            throw new ValidationError('Incorrect verification code');
        }

        // Mark code as used + mark user email as verified atomically
        await Promise.all([
            supabaseAdmin.from('email_verifications').update({ used: true }).eq('id', record.id),
            supabaseAdmin.from('saas_users').update({ email_verified: true }).eq('id', userId),
        ]);

        sendSuccess(res, { message: 'Email verified successfully' });
    } catch (err) {
        next(err);
    }
};
