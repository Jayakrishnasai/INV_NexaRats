import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { sendSuccess } from '../utils/response';

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile, org, and subscription.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { sub: userId, org: orgId } = req.user!;

        const [userResult, orgResult, subResult] = await Promise.all([
            supabaseAdmin
                .from('saas_users')
                .select('id, email, name, role, email_verified, last_login, created_at')
                .eq('id', userId)
                .single(),
            supabaseAdmin
                .from('organizations')
                .select('id, name, slug, subscription_status, onboarding_step, onboarding_complete, created_at')
                .eq('id', orgId)
                .single(),
            supabaseAdmin
                .from('subscriptions')
                .select(`
                    id, status, billing_cycle,
                    current_period_start, current_period_end, trial_ends_at,
                    plans (id, name, slug, price_monthly, price_annual, features, max_users, max_invoices_monthly)
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

        sendSuccess(res, {
            user: userResult.data,
            org: orgResult.data,
            subscription: subResult.data,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/auth/forgot-password
 * Sends a password reset email (stubbed — integrate email service in Phase G).
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body as { email: string };

        // Always respond 200 even if email not found (prevents user enumeration)
        const { data: user } = await supabaseAdmin
            .from('saas_users')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

        if (user) {
            // TODO (Phase G): Queue password reset email via email worker
            // const token = crypto.randomBytes(32).toString('hex');
            // await emailQueue.add('password_reset', { userId: user.id, token, email });
            console.log(`[ForgotPassword] Reset requested for ${email}`);
        }

        sendSuccess(res, {
            message: 'If an account exists with that email, you will receive a reset link shortly.',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/auth/reset-password
 * Validates reset token and updates password hash.
 * Full implementation requires a password_reset_tokens table (Phase G).
 */
export const resetPassword = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // TODO (Phase G): Implement with password_reset_tokens table
        sendSuccess(res, { message: 'Password reset functionality coming soon.' });
    } catch (err) {
        next(err);
    }
};
