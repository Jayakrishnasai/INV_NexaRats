import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * GET /api/v1/onboarding/status
 * Returns current onboarding step and completion state for the authenticated org.
 * Frontend uses this to resume onboarding after a page refresh.
 */
export const getOnboardingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId } = req.user!;

        const { data: org, error } = await supabaseAdmin
            .from('organizations')
            .select('onboarding_step, onboarding_complete')
            .eq('id', orgId)
            .single();

        if (error || !org) throw new Error('Organization not found');

        // Check key status for step 3/4 validation
        const { data: keys } = await supabaseAdmin
            .from('razorpay_keys')
            .select('is_verified')
            .eq('organization_id', orgId)
            .maybeSingle();

        sendSuccess(res, {
            currentStep: org.onboarding_step as OnboardingStep,
            onboardingComplete: org.onboarding_complete,
            razorpayKeysConfigured: !!keys,
            razorpayKeysVerified: keys?.is_verified ?? false,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/v1/onboarding/step
 * Advances the onboarding step. Steps only move forward.
 * Body: { step: number } — the step the user just COMPLETED
 */
export const advanceOnboardingStep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId } = req.user!;
        const { step } = req.body as { step: number };

        if (typeof step !== 'number' || step < 1 || step > 5) {
            throw new ValidationError('step must be a number between 1 and 5');
        }

        const nextStep = step as OnboardingStep;

        // Only advance — never go backwards
        const { error } = await supabaseAdmin
            .from('organizations')
            .update({ onboarding_step: nextStep })
            .eq('id', orgId)
            .lt('onboarding_step', nextStep);  // update only if current < new step

        if (error) throw error;

        sendSuccess(res, {
            currentStep: nextStep,
            message: `Onboarding step ${nextStep} recorded`,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/v1/onboarding/complete
 * Marks onboarding as fully complete.
 * After this, the app routes to the main dashboard.
 */
export const completeOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId, sub: userId } = req.user!;

        await Promise.all([
            supabaseAdmin.from('organizations').update({
                onboarding_step: 6,
                onboarding_complete: true,
            }).eq('id', orgId),
            // Log the onboarding completion event
            supabaseAdmin.from('audit_logs').insert({
                organization_id: orgId,
                user_id: userId,
                action: 'onboarding.completed',
                resource_type: 'organization',
                resource_id: orgId,
            }),
        ]);

        // TODO (Phase G): Queue "Getting Started Guide" welcome email

        sendSuccess(res, {
            onboardingComplete: true,
            message: "You're all set! Welcome to Nexarats.",
        });
    } catch (err) {
        next(err);
    }
};
