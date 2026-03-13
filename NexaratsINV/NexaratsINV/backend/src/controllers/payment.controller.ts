import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import Razorpay from 'razorpay';
import { sendSuccess } from '../utils/response';
import { decryptSecret } from '../utils/encryption';
import { ValidationError } from '../utils/errors';

/**
 * GET /api/v1/payment/config
 * Returns whether Razorpay is configured for the tenant + the publishable key.
 * D12: Uses the TENANT's own Razorpay keys from razorpay_keys table.
 * Falls back to env-level keys for legacy admin users (no org context).
 */
export const getPaymentConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const orgId = req.user?.org;

        if (orgId) {
            // SaaS tenant — use their own keys
            const { data: keyRow } = await supabaseAdmin
                .from('razorpay_keys')
                .select('key_id, is_verified')
                .eq('organization_id', orgId)
                .maybeSingle();

            sendSuccess(res, {
                enabled: !!keyRow?.is_verified,
                keyId: keyRow?.key_id ?? null,
                isVerified: keyRow?.is_verified ?? false,
                message: keyRow
                    ? keyRow.is_verified
                        ? 'Razorpay is active'
                        : 'Keys saved but not yet verified. Run validation first.'
                    : 'No Razorpay keys configured. Add your keys in Settings → Payments.',
            });
        } else {
            // Legacy admin — use global env keys
            const keyId = (process.env as any).RAZORPAY_KEY_ID;
            sendSuccess(res, {
                enabled: !!keyId,
                keyId: keyId ?? null,
                isVerified: !!keyId,
            });
        }
    } catch (err) { next(err); }
};

/**
 * POST /api/v1/payment/create-order
 * D12: Creates a Razorpay order using the TENANT's own keys.
 */
export const createPaymentOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { amount, receipt } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new ValidationError('amount must be a positive number (in rupees)');
        }

        const orgId = req.user?.org;
        const rzp = await getTenantRazorpay(orgId);

        if (!rzp) {
            res.status(503).json({
                success: false,
                error: 'Razorpay is not configured. Go to Settings → Payments to add your keys.',
                code: 'RAZORPAY_NOT_CONFIGURED',
            });
            return;
        }

        const amountInPaisa = Math.round(amount * 100);
        const rxReceipt = receipt || `NX-${Date.now()}`;
        const order = await rzp.orders.create({
            amount: amountInPaisa,
            currency: 'INR',
            receipt: rxReceipt,
            payment_capture: 1,
        });

        sendSuccess(res, order);
    } catch (err) { next(err); }
};

/**
 * POST /api/v1/payment/verify
 * D12: Verifies payment signature using the TENANT's own key secret.
 */
export const verifyAndProcessPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, saleData } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new ValidationError('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required');
        }
        if (!saleData) throw new ValidationError('saleData is required');

        const orgId = req.user?.org;
        const keySecret = await getTenantKeySecret(orgId);
        if (!keySecret) {
            res.status(503).json({ success: false, error: 'Payment keys not configured', code: 'RAZORPAY_NOT_CONFIGURED' });
            return;
        }

        // Verify HMAC signature
        const crypto = await import('crypto');
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');

        if (expected !== razorpay_signature) {
            res.status(422).json({ success: false, error: 'Payment verification failed: invalid signature' });
            return;
        }

        // Import sale service lazily to avoid circular deps
        const { saleService } = await import('../services/sale.service');
        const result = await saleService.processSale({
            ...saleData,
            organizationId: orgId,          // B12: scope sale to tenant
            method: saleData.method || 'upi',
            source: saleData.source || 'offline',
            paidAmount: saleData.total,
        });

        sendSuccess(res, {
            ...result,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
        });
    } catch (err) { next(err); }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns an authenticated Razorpay SDK instance using the tenant's keys.
 * Falls back to env keys for legacy admin users.
 */
export const getTenantRazorpay = async (orgId?: string): Promise<any | null> => {
    const keySecret = await getTenantKeySecret(orgId);
    const keyId = orgId
        ? (await supabaseAdmin.from('razorpay_keys').select('key_id').eq('organization_id', orgId).maybeSingle())?.data?.key_id
        : (process.env as any).RAZORPAY_KEY_ID;

    if (!keyId || !keySecret) return null;

    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function getTenantKeySecret(orgId?: string): Promise<string | null> {
    if (orgId) {
        const { data: keyRow } = await supabaseAdmin
            .from('razorpay_keys')
            .select('key_secret_enc, iv, auth_tag, is_verified')
            .eq('organization_id', orgId)
            .maybeSingle();

        if (!keyRow?.is_verified) return null;
        return decryptSecret({ encrypted: keyRow.key_secret_enc, iv: keyRow.iv, authTag: keyRow.auth_tag });
    }
    return (process.env as any).RAZORPAY_KEY_SECRET ?? null;
}
