import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { getTenantRazorpay } from './payment.controller';
import { verifyHmacSha256 } from '../utils/encryption';
import { env } from '../config/env';
import { sendSuccess } from '../utils/response';

type WebhookEvent =
    | 'subscription.activated'
    | 'subscription.charged'
    | 'payment.captured'
    | 'payment.failed'
    | 'subscription.cancelled'
    | 'subscription.paused'
    | 'subscription.resumed';

/**
 * POST /api/v1/billing/webhook
 *
 * Razorpay sends all subscription lifecycle events here.
 * CRITICAL: signature must be verified before any processing.
 * Raw body must be preserved (rawBody middleware applied via route config).
 *
 * Idempotent: checks razorpay_event_id before processing.
 */
export const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string;
        const rawBody: Buffer = (req as any).rawBody;

        // ── 1. Verify webhook signature ──────────────────────────────────────
        if (!env.RAZORPAY_WEBHOOK_SECRET) {
            // FIX B2: Hard-fail in production if secret is missing
            if (env.NODE_ENV === 'production') {
                console.error('[Webhook] FATAL: RAZORPAY_WEBHOOK_SECRET must be set in production. Rejecting request.');
                res.status(500).json({ error: 'Webhook not configured' });
                return;
            }
            console.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping sig verification in dev');
        } else if (!signature || !verifyHmacSha256(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
            res.status(400).json({ error: 'Invalid webhook signature' });
            return;
        }

        const payload = req.body;
        const eventType: WebhookEvent = payload.event;
        const razorpayEventId: string = payload.payload?.payment?.entity?.id
            || payload.payload?.subscription?.entity?.id
            || `${eventType}-${Date.now()}`;

        // ── 2. Idempotency check — skip if already processed ─────────────────
        const { data: existing } = await supabaseAdmin
            .from('subscription_events')
            .select('id')
            .eq('razorpay_event_id', razorpayEventId)
            .maybeSingle();

        if (existing) {
            res.status(200).json({ received: true, status: 'already_processed' });
            return;
        }

        // ── 3. Acknowledge immediately (Razorpay timeout = 5s) ───────────────
        // All processing below is fast DB work; queue it if it gets complex
        res.status(200).json({ received: true });

        // ── 4. Process event ─────────────────────────────────────────────────
        await processWebhookEvent(eventType, payload, razorpayEventId);

    } catch (err) {
        next(err);
    }
};

async function processWebhookEvent(
    eventType: WebhookEvent,
    payload: any,
    razorpayEventId: string
): Promise<void> {
    const subscription = payload.payload?.subscription?.entity;
    const payment = payload.payload?.payment?.entity;
    const razorpaySubId = subscription?.id;

    try {
        switch (eventType) {
            case 'subscription.activated': {
                if (!razorpaySubId) break;
                const { data: sub } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id, organization_id')
                    .eq('razorpay_subscription_id', razorpaySubId)
                    .maybeSingle();

                if (sub) {
                    const periodStart = new Date(subscription.current_start * 1000);
                    const periodEnd = new Date(subscription.current_end * 1000);
                    await Promise.all([
                        supabaseAdmin.from('subscriptions').update({
                            status: 'active',
                            current_period_start: periodStart.toISOString(),
                            current_period_end: periodEnd.toISOString(),
                        }).eq('id', sub.id),
                        supabaseAdmin.from('organizations').update({
                            subscription_status: 'active',
                        }).eq('id', sub.organization_id),
                    ]);
                }
                break;
            }

            case 'payment.captured': {
                if (!payment) break;
                // Find subscription for this payment
                const { data: sub } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id, organization_id')
                    .eq('razorpay_subscription_id', payment.subscription_id)
                    .maybeSingle();

                if (sub) {
                    await supabaseAdmin.from('saas_payments').insert({
                        organization_id: sub.organization_id,
                        subscription_id: sub.id,
                        razorpay_payment_id: payment.id,
                        razorpay_order_id: payment.order_id,
                        amount: payment.amount / 100,  // paise → rupees
                        currency: payment.currency,
                        status: 'captured',
                        payment_method: payment.method,
                    });
                }
                break;
            }

            case 'subscription.charged': {
                if (!subscription || !razorpaySubId) break;
                const periodStart = new Date(subscription.current_start * 1000);
                const periodEnd = new Date(subscription.current_end * 1000);
                await supabaseAdmin.from('subscriptions').update({
                    status: 'active',
                    current_period_start: periodStart.toISOString(),
                    current_period_end: periodEnd.toISOString(),
                }).eq('razorpay_subscription_id', razorpaySubId);
                break;
            }

            case 'payment.failed': {
                if (!payment?.subscription_id) break;
                const { data: sub } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id, organization_id')
                    .eq('razorpay_subscription_id', payment.subscription_id)
                    .maybeSingle();

                if (sub) {
                    await Promise.all([
                        supabaseAdmin.from('subscriptions').update({ status: 'past_due' }).eq('id', sub.id),
                        supabaseAdmin.from('organizations').update({ subscription_status: 'past_due' }).eq('id', sub.organization_id),
                        supabaseAdmin.from('saas_payments').insert({
                            organization_id: sub.organization_id,
                            subscription_id: sub.id,
                            razorpay_payment_id: payment.id,
                            amount: payment.amount / 100,
                            currency: payment.currency,
                            status: 'failed',
                            payment_method: payment.method,
                            failure_reason: payment.error_description,
                        }),
                        // TODO (Phase G): Queue payment_failed email alert
                    ]);
                }
                break;
            }

            case 'subscription.cancelled': {
                if (!razorpaySubId) break;
                const { data: sub } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id, organization_id')
                    .eq('razorpay_subscription_id', razorpaySubId)
                    .maybeSingle();

                if (sub) {
                    await Promise.all([
                        supabaseAdmin.from('subscriptions').update({
                            status: 'cancelled',
                            cancelled_at: new Date().toISOString(),
                        }).eq('id', sub.id),
                        supabaseAdmin.from('organizations').update({
                            subscription_status: 'cancelled',
                        }).eq('id', sub.organization_id),
                    ]);
                }
                break;
            }

            case 'subscription.paused': {
                // FIX B7: Handle subscription.paused event
                if (!razorpaySubId) break;
                const { data: sub } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id, organization_id')
                    .eq('razorpay_subscription_id', razorpaySubId)
                    .maybeSingle();

                if (sub) {
                    await Promise.all([
                        supabaseAdmin.from('subscriptions').update({ status: 'paused' }).eq('id', sub.id),
                        supabaseAdmin.from('organizations').update({ subscription_status: 'paused' }).eq('id', sub.organization_id),
                    ]);
                }
                break;
            }

            case 'subscription.resumed': {
                // FIX B7: Handle subscription.resumed event
                if (!razorpaySubId) break;
                const { data: sub } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id, organization_id')
                    .eq('razorpay_subscription_id', razorpaySubId)
                    .maybeSingle();

                if (sub) {
                    await Promise.all([
                        supabaseAdmin.from('subscriptions').update({ status: 'active' }).eq('id', sub.id),
                        supabaseAdmin.from('organizations').update({ subscription_status: 'active' }).eq('id', sub.organization_id),
                    ]);
                }
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event type: ${eventType}`);
        }

        // ── 5. Log the event ─────────────────────────────────────────────────
        const subRecord = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('razorpay_subscription_id', subscription?.id || '')
            .maybeSingle();

        if (subRecord.data) {
            await supabaseAdmin.from('subscription_events').insert({
                subscription_id: subRecord.data.id,
                event_type: eventType,
                razorpay_event_id: razorpayEventId,
                payload,
                processed: true,
            });
        }

    } catch (err) {
        console.error(`[Webhook] Error processing ${eventType}:`, err);
        // Write event record with processed: false to block Razorpay retries if the error is a local processing error
        const subId = payload?.subscription?.entity?.id;
        if (subId) {
            const { data: subRecord } = await supabaseAdmin
                .from('subscriptions')
                .select('id')
                .eq('razorpay_subscription_id', subId)
                .maybeSingle();

            if (subRecord?.id) {
                try {
                    await supabaseAdmin.from('subscription_events').insert({
                        subscription_id: subRecord.id,
                        event_type: eventType,
                        razorpay_event_id: razorpayEventId,
                        payload,
                        processed: false,
                    });
                } catch (e: any) {
                    console.error('[Webhook] Failed to log failed event:', e.message || e);
                }
            }
        }
    }
}

/**
 * GET /api/v1/billing/subscription
 * Returns the authenticated org's current subscription and plan.
 */
export const getSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId } = req.user!;

        const { data, error } = await supabaseAdmin
            .from('subscriptions')
            .select(`
                id, status, billing_cycle,
                current_period_start, current_period_end, trial_ends_at, cancelled_at,
                plans (id, name, slug, price_monthly, price_annual, features,
                       max_users, max_invoices_monthly, max_products)
            `)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        sendSuccess(res, { subscription: data });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/billing/cancel
 * Cancels the active Razorpay subscription at period end.
 */
export const cancelSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId } = req.user!;

        const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('id, razorpay_subscription_id')
            .eq('organization_id', orgId)
            .single();

        if (!sub) {
            res.status(404).json({ success: false, error: 'No active subscription found' });
            return;
        }

        // Call Razorpay API to cancel at period end when razorpay_subscription_id exists
        if (sub.razorpay_subscription_id) {
            const rzp = await getTenantRazorpay(orgId);
            if (rzp) {
                await rzp.subscriptions.cancel(sub.razorpay_subscription_id, { cancel_at_cycle_end: 1 });
            }
        }

        // Mark as cancelled_at_period_end in our DB
        await supabaseAdmin.from('subscriptions').update({
            cancelled_at: new Date().toISOString(),
        }).eq('id', sub.id);

        sendSuccess(res, { message: 'Subscription will be cancelled at the end of the current billing period.' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/billing/upgrade  — C11
 * Upgrades or downgrades the active subscription to a different plan.
 * Body: { planId: string, billingCycle?: 'monthly' | 'annual' }
 *
 * IMPORTANT: Razorpay plan change API call is a stub (plan activation is
 * handled by the next billing cycle or webhook). Phase G will complete
 * the actual Razorpay API call.
 */
export const upgradeSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId } = req.user!;
        const { planId, billingCycle } = req.body as { planId: string; billingCycle?: string };

        if (!planId) {
            res.status(400).json({ success: false, error: 'planId is required' });
            return;
        }

        // ── Validate plan exists ──────────────────────────────────────────────
        const { data: plan, error: planErr } = await supabaseAdmin
            .from('plans')
            .select('id, name, slug')
            .eq('id', planId)
            .eq('is_active', true)
            .maybeSingle();

        if (planErr || !plan) {
            res.status(404).json({ success: false, error: 'Plan not found or inactive' });
            return;
        }

        // ── Get current subscription ──────────────────────────────────────────
        const { data: sub, error: subErr } = await supabaseAdmin
            .from('subscriptions')
            .select('id, plan_id, status, razorpay_subscription_id')
            .eq('organization_id', orgId)
            .in('status', ['active', 'trial', 'past_due'])
            .limit(1)
            .maybeSingle();

        if (subErr || !sub) {
            res.status(404).json({ success: false, error: 'No active subscription found' });
            return;
        }

        if (sub.plan_id === planId) {
            res.status(400).json({ success: false, error: 'Already on this plan' });
            return;
        }

        // ── Update local record ───────────────────────────────────────────────
        const updateData: Record<string, any> = { plan_id: planId };
        if (billingCycle) updateData.billing_cycle = billingCycle;

        await Promise.all([
            supabaseAdmin.from('subscriptions').update(updateData).eq('id', sub.id),
            supabaseAdmin.from('organizations').update({ subscription_status: 'active' }).eq('id', orgId),
        ]);

        // Call Razorpay API to change the plan immediately
        if (sub.razorpay_subscription_id) {
            const rzp = await getTenantRazorpay(orgId);
            if (rzp) {
                await rzp.subscriptions.update(sub.razorpay_subscription_id, { plan_id: planId });
            }
        }

        sendSuccess(res, {
            message: `Successfully upgraded to ${plan.name}. Changes take effect at the next billing cycle.`,
            plan: { id: plan.id, name: plan.name, slug: plan.slug },
        });
    } catch (err) {
        next(err);
    }
};

