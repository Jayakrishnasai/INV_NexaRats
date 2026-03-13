import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../supabase/client';
import { sendSuccess } from '../../utils/response';
import { AuthError, ValidationError } from '../../utils/errors';
import { getTenantRazorpay, getTenantKeySecret } from '../payment.controller';
import { saleService } from '../../services/sale.service';
import crypto from 'crypto';

/**
 * GET /api/v1/store/payment/config
 * Returns Razorpay config (keyId) for the customer's organization.
 */
export const getStorePaymentConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        // Get organization_id from store_customers
        const { data: customer, error: custError } = await supabaseAdmin
            .from('store_customers')
            .select('organization_id')
            .eq('id', req.storeCustomer.id)
            .single();

        if (custError || !customer?.organization_id) {
            sendSuccess(res, { enabled: false, keyId: null, message: 'Store not configured for payments' });
            return;
        }

        const orgId = customer.organization_id;

        const { data: keyRow } = await supabaseAdmin
            .from('razorpay_keys')
            .select('key_id, is_verified')
            .eq('organization_id', orgId)
            .maybeSingle();

        sendSuccess(res, {
            enabled: !!keyRow?.is_verified,
            keyId: keyRow?.key_id ?? null,
        });
    } catch (err) { next(err); }
};

/**
 * POST /api/v1/store/payment/create-order
 * Creates a Razorpay order using the organization's keys.
 */
export const createStorePaymentOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        const { amount, receipt } = req.body;
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new ValidationError('amount must be a positive number');
        }

        // Get organization_id
        const { data: customer } = await supabaseAdmin
            .from('store_customers')
            .select('organization_id')
            .eq('id', req.storeCustomer.id)
            .single();

        if (!customer?.organization_id) {
            res.status(503).json({ success: false, error: 'Store not configured for payments', code: 'RAZORPAY_NOT_CONFIGURED' });
            return;
        }

        const rzp = await getTenantRazorpay(customer.organization_id);
        if (!rzp) {
            res.status(503).json({ success: false, error: 'Payment gateway unavailable', code: 'RAZORPAY_NOT_CONFIGURED' });
            return;
        }

        const amountInPaisa = Math.round(amount * 100);
        const order = await rzp.orders.create({
            amount: amountInPaisa,
            currency: 'INR',
            receipt: receipt || `STO-${Date.now()}`,
            payment_capture: 1,
        });

        sendSuccess(res, order);
    } catch (err) { next(err); }
};

/**
 * POST /api/v1/store/payment/verify
 * Verifies signature and processes the online order.
 */
export const verifyStorePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, saleData } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !saleData) {
            throw new ValidationError('Missing required payment verification fields');
        }

        // Get organization_id
        const { data: customer } = await supabaseAdmin
            .from('store_customers')
            .select('organization_id')
            .eq('id', req.storeCustomer.id)
            .single();

        if (!customer?.organization_id) {
            throw new ValidationError('Organization context lost');
        }

        const keySecret = await getTenantKeySecret(customer.organization_id);
        if (!keySecret) {
            throw new ValidationError('Payment configuration invalid');
        }

        // Verify signature
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            res.status(422).json({ success: false, error: 'Payment verification failed' });
            return;
        }

        // Process the sale
        const result = await saleService.processSale({
            ...saleData,
            customerId: req.storeCustomer.id,
            source: 'online',
            paidAmount: saleData.total,
        });

        sendSuccess(res, result, 'Payment verified and order processed successfully');
    } catch (err) { next(err); }
};
