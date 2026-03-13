import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { sendSuccess } from '../utils/response';

/**
 * GET /api/v1/saas/plans
 * Public endpoint consumed by the marketing pricing page.
 */
export const getPlans = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data: plans, error } = await supabaseAdmin
            .from('plans')
            .select('id, name, slug, price_monthly, price_annual, max_users, max_invoices_monthly, max_products, features')
            .eq('is_active', true)
            .order('price_monthly', { ascending: true });

        if (error) throw error;

        sendSuccess(res, { plans: plans ?? [] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/saas/plans/:id
 * Returns a single plan's full details.
 */
export const getPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data: plan, error } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('id', req.params.id)
            .eq('is_active', true)
            .single();

        if (error || !plan) {
            res.status(404).json({ success: false, error: 'Plan not found', code: 'NOT_FOUND' });
            return;
        }

        sendSuccess(res, { plan });
    } catch (err) {
        next(err);
    }
};
