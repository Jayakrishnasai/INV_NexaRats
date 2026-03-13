import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { sendSuccess } from '../utils/response';

/**
 * GET /api/v1/admin/dashboard
 * Returns all KPI metrics for the admin intelligence dashboard.
 * This is the single most important admin endpoint.
 */
export const getDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            totalCustomers,
            activeSubscriptions,
            mrrData,
            failedPayments,
            planDistribution,
            cancelledThisMonth,
            totalLastMonth,
        ] = await Promise.all([
            // Total organizations (SaaS customers)
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true }),

            // Active subscriptions
            supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true })
                .eq('status', 'active'),

            // MRR — sum of plan prices for active monthly subscriptions
            supabaseAdmin.from('subscriptions')
                .select('billing_cycle, plans!inner(price_monthly, price_annual)')
                .eq('status', 'active'),

            // Failed payments in last 30 days
            supabaseAdmin.from('saas_payments').select('id', { count: 'exact', head: true })
                .eq('status', 'failed')
                .gte('created_at', thirtyDaysAgo.toISOString()),

            // Plan distribution
            supabaseAdmin.from('subscriptions')
                .select('plan_id, plans!inner(name)')
                .eq('status', 'active'),

            // Cancelled this calendar month
            supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true })
                .eq('status', 'cancelled')
                .gte('cancelled_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

            // Total at start of last month (approx)
            supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true })
                .lte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        ]);

        // Calculate MRR
        let mrr = 0;
        if (mrrData.data) {
            mrr = mrrData.data.reduce((sum: number, sub: any) => {
                const plan = sub.plans as any;
                const price = sub.billing_cycle === 'annual'
                    ? plan.price_annual / 12
                    : plan.price_monthly;
                return sum + (price ?? 0);
            }, 0);
        }

        // Calculate churn rate
        const cancelledCount = cancelledThisMonth.count ?? 0;
        const totalCount = totalLastMonth.count ?? 1;
        const churnRate = parseFloat(((cancelledCount / totalCount) * 100).toFixed(2));

        // Aggregate plan distribution
        const planCounts: Record<string, number> = {};
        if (planDistribution.data) {
            for (const row of planDistribution.data) {
                const planName = (row.plans as any)?.name ?? 'Unknown';
                planCounts[planName] = (planCounts[planName] || 0) + 1;
            }
        }

        sendSuccess(res, {
            totalCustomers: totalCustomers.count ?? 0,
            activeSubscriptions: activeSubscriptions.count ?? 0,
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(mrr * 12 * 100) / 100,
            churnRate,
            failedPaymentsLast30d: failedPayments.count ?? 0,
            planDistribution: Object.entries(planCounts).map(([plan, count]) => ({ plan, count })),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/admin/organizations
 * Paginated list of all tenant organizations.
 */
export const getOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string ?? '1', 10);
        const limit = Math.min(parseInt(req.query.limit as string ?? '20', 10), 100);
        const offset = (page - 1) * limit;
        const status = req.query.status as string | undefined;

        let query = supabaseAdmin.from('organizations')
            .select(`
                id, name, slug, subscription_status, onboarding_complete, created_at,
                subscriptions (status, billing_cycle, plans (name))
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq('subscription_status', status);

        const { data, count, error } = await query;
        if (error) throw error;

        sendSuccess(res, {
            organizations: data ?? [],
            pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/admin/organizations/:id
 * Single organization detail with users and subscription history.
 */
export const getOrganizationDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const [orgResult, usersResult, subResult, paymentsResult] = await Promise.all([
            supabaseAdmin.from('organizations').select('*').eq('id', id).single(),
            supabaseAdmin.from('saas_users').select('id, name, email, role, status, last_login, created_at').eq('organization_id', id),
            supabaseAdmin.from('subscriptions').select('*, plans(*)').eq('organization_id', id).order('created_at', { ascending: false }),
            supabaseAdmin.from('saas_payments').select('*').eq('organization_id', id).order('created_at', { ascending: false }).limit(10),
        ]);

        if (!orgResult.data) {
            res.status(404).json({ success: false, error: 'Organization not found' });
            return;
        }

        sendSuccess(res, {
            organization: orgResult.data,
            users: usersResult.data ?? [],
            subscriptions: subResult.data ?? [],
            recentPayments: paymentsResult.data ?? [],
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/admin/subscriptions
 * Paginated list of all subscriptions across all tenants.
 */
export const getSubscriptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string ?? '1', 10);
        const limit = Math.min(parseInt(req.query.limit as string ?? '20', 10), 100);
        const offset = (page - 1) * limit;

        const { data, count, error } = await supabaseAdmin
            .from('subscriptions')
            .select(`
                id, status, billing_cycle, current_period_end, trial_ends_at, cancelled_at, created_at,
                organizations (id, name, slug),
                plans (id, name, slug, price_monthly)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        sendSuccess(res, {
            subscriptions: data ?? [],
            pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/admin/payments
 * All SaaS billing payments with optional failure filter.
 */
export const getPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string ?? '1', 10);
        const limit = Math.min(parseInt(req.query.limit as string ?? '20', 10), 100);
        const offset = (page - 1) * limit;
        const failedOnly = req.query.failed === 'true';

        let query = supabaseAdmin
            .from('saas_payments')
            .select('*, organizations (name, slug)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (failedOnly) query = query.eq('status', 'failed');

        const { data, count, error } = await query;
        if (error) throw error;

        sendSuccess(res, {
            payments: data ?? [],
            pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/admin/logs
 * Paginated audit log viewer with action filter.
 */
export const getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string ?? '1', 10);
        const limit = Math.min(parseInt(req.query.limit as string ?? '50', 10), 200);
        const offset = (page - 1) * limit;
        const action = req.query.action as string | undefined;

        let query = supabaseAdmin
            .from('audit_logs')
            .select('*, organizations (name), saas_users (name, email)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (action) query = query.ilike('action', `%${action}%`);

        const { data, count, error } = await query;
        if (error) throw error;

        sendSuccess(res, {
            logs: data ?? [],
            pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/admin/organizations/:id/suspend
 * Suspends a tenant's access by setting their subscription to paused.
 */
export const suspendOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        await Promise.all([
            supabaseAdmin.from('organizations').update({ subscription_status: 'paused' }).eq('id', id),
            supabaseAdmin.from('subscriptions').update({ status: 'paused' }).eq('organization_id', id),
        ]);
        sendSuccess(res, { message: 'Organization suspended. Users will see a billing wall on next login.' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/admin/organizations/:id/activate
 * Re-activates a suspended tenant.
 */
export const activateOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        await Promise.all([
            supabaseAdmin.from('organizations').update({ subscription_status: 'active' }).eq('id', id),
            supabaseAdmin.from('subscriptions').update({ status: 'active' }).eq('organization_id', id).eq('status', 'paused'),
        ]);
        sendSuccess(res, { message: 'Organization re-activated successfully.' });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/admin/users  — F15
 * Paginated list of all SaaS users across all tenants.
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string ?? '1', 10);
        const limit = Math.min(parseInt(req.query.limit as string ?? '20', 10), 100);
        const offset = (page - 1) * limit;
        const search = req.query.search as string | undefined;

        let query = supabaseAdmin
            .from('saas_users')
            .select('id, name, email, role, status, created_at, last_login, organizations (id, name, slug)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        sendSuccess(res, {
            users: data ?? [],
            pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
        });
    } catch (err) {
        next(err);
    }
};


/**
 * GET /api/v1/admin/revenue  — F12
 * Returns MRR, ARR, and 6-month MRR history for the revenue chart.
 */
export const getRevenue = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // ── Active subscriptions with plan prices ─────────────────────────────
        const { data: subs } = await supabaseAdmin
            .from('subscriptions')
            .select('billing_cycle, created_at, plans!inner(price_monthly, price_annual)')
            .eq('status', 'active');

        // Calculate current MRR
        let currentMrr = 0;
        if (subs) {
            currentMrr = subs.reduce((sum: number, sub: any) => {
                const plan = sub.plans as any;
                const price = sub.billing_cycle === 'annual' ? plan.price_annual / 12 : plan.price_monthly;
                return sum + (price ?? 0);
            }, 0);
        }

        // ── Build 6-month MRR history from saas_payments ─────────────────────
        const months: { label: string; mrr: number }[] = [];

        const dStart = new Date();
        dStart.setMonth(dStart.getMonth() - 5);
        const sixMonthsAgoStart = new Date(dStart.getFullYear(), dStart.getMonth(), 1).toISOString();

        const { data: allPayments } = await supabaseAdmin
            .from('saas_payments')
            .select('amount, created_at')
            .eq('status', 'captured')
            .gte('created_at', sixMonthsAgoStart);

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

            const monthPayments = (allPayments || []).filter(p => {
                const t = new Date(p.created_at).getTime();
                return t >= monthStart && t <= monthEnd;
            });

            const revenue = monthPayments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
            months.push({
                label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                mrr: Math.round(revenue * 100) / 100,
            });
        }

        sendSuccess(res, {
            mrr: Math.round(currentMrr * 100) / 100,
            arr: Math.round(currentMrr * 12 * 100) / 100,
            history: months,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/v1/admin/plans/:id  — F18
 * Edit a plan's price or feature list.
 * Body: { price_monthly?, price_annual?, features?, max_users?, max_invoices_monthly?, max_products?, is_active? }
 */
export const updatePlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const allowed = ['price_monthly', 'price_annual', 'features', 'max_users', 'max_invoices_monthly', 'max_products', 'is_active', 'description', 'razorpay_plan_id_monthly', 'razorpay_plan_id_annual'];
        const updateData: Record<string, any> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updateData[key] = req.body[key];
        }

        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ success: false, error: 'No valid fields provided to update' });
            return;
        }

        const { data, error } = await supabaseAdmin
            .from('plans')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            res.status(404).json({ success: false, error: 'Plan not found' });
            return;
        }

        sendSuccess(res, { plan: data });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/admin/auth/login  — F19
 * Admin-specific login. Returns a JWT with role='nexarats_admin'.
 * Protected: only for Nexarats internal team. IP check happens at route level.
 */
export const adminLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body as { email: string; password: string };

        if (!email || !password) {
            res.status(400).json({ success: false, error: 'email and password are required' });
            return;
        }

        // ── Fetch from admin_users with role check ────────────────────────────
        const { supabaseAdmin: db } = await import('../supabase/client');
        const { data: user, error } = await db
            .from('admin_users')
            .select('id, name, email, password, role, status, permissions')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user || user.status !== 'Active') {
            res.status(401).json({ success: false, error: 'Invalid credentials or account inactive' });
            return;
        }

        const { comparePassword } = await import('../utils/hash');
        const valid = await comparePassword(password, user.password);
        if (!valid) {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }

        const { signAccessToken, signRefreshToken } = await import('../utils/jwt');
        const accessToken = signAccessToken({
            sub: user.id,
            userId: user.id,
            org: '',
            role: 'nexarats_admin',      // always override to admin role
            email: user.email,
            permissions: user.permissions || {},
        });
        const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: 1 });

        await db.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

        sendSuccess(res, {
            user: { id: user.id, name: user.name, email: user.email, role: 'nexarats_admin' },
            token: accessToken,
            refreshToken,
        });
    } catch (err) {
        next(err);
    }
};

