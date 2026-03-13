import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { ForbiddenError } from '../utils/errors';

const SUBSCRIPTION_ACTIVE_STATES = new Set(['active', 'trial']);

/**
 * Subscription Status Guard Middleware.
 * Blocks API access for tenants with lapsed subscriptions (past_due/cancelled/paused).
 * Attach this to all product routes that require an active subscription.
 *
 * Note: Does NOT apply to /api/v1/billing/* or /api/v1/auth/* routes.
 */
export const requireActiveSubscription = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { org: orgId } = req.user!;

        // Use JWT org status claim if available for fast-path check
        const claimStatus = (req.user as any).subscriptionStatus;
        if (claimStatus && SUBSCRIPTION_ACTIVE_STATES.has(claimStatus)) {
            return next();
        }

        // Fall back to DB check (slower but always accurate)
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('subscription_status')
            .eq('id', orgId)
            .single();

        if (!org || !SUBSCRIPTION_ACTIVE_STATES.has(org.subscription_status)) {
            throw new ForbiddenError(
                org?.subscription_status === 'past_due'
                    ? 'Payment required. Please update your billing information to continue.'
                    : 'Your subscription has ended. Please renew to regain access.'
            );
        }

        next();
    } catch (err) {
        next(err);
    }
};
