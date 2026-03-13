import crypto from 'crypto';
import { env } from '../config/env';
import { ServiceUnavailableError } from '../utils/errors';

/**
 * PaymentService — Razorpay Integration
 *
 * Graceful degradation: if RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not
 * configured in the environment, isConfigured() returns false and the
 * frontend shows the "Razorpay not connected" guide instead of attempting
 * to initiate a payment.
 */

interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    created_at: number;
}

export class PaymentService {
    private razorpay: any = null;

    constructor() {
        const keyId = (env as any).RAZORPAY_KEY_ID;
        const keySecret = (env as any).RAZORPAY_KEY_SECRET;

        if (keyId && keySecret) {
            // Dynamically require so server starts even without the package
            // (although we install it unconditionally now)
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const Razorpay = require('razorpay');
                this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
            } catch (e) {
                console.warn('⚠️  Razorpay package not found — online payments disabled.');
            }
        }
    }

    /** True when Razorpay credentials are set and the SDK loaded. */
    isConfigured(): boolean {
        return this.razorpay !== null;
    }

    /** Returns the publishable key for the frontend Checkout SDK. */
    getPublicKey(): string | null {
        return (env as any).RAZORPAY_KEY_ID || null;
    }

    /**
     * Create a Razorpay order.
     * @param amountInPaisa - Amount in the smallest currency unit (paise for INR)
     * @param receipt      - Short unique identifier for logging/reconciliation
     */
    async createOrder(amountInPaisa: number, receipt: string): Promise<RazorpayOrder> {
        if (!this.razorpay) {
            throw new ServiceUnavailableError('PaymentService', 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
        }

        const options = {
            amount: Math.round(amountInPaisa), // must be integer paise
            currency: 'INR',
            receipt,
            payment_capture: 1,
        };

        return await this.razorpay.orders.create(options);
    }

    /**
     * Verify Razorpay payment signature (webhook / checkout callback).
     * Throws an error if the signature is invalid.
     */
    verifySignature(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean {
        const keySecret = (env as any).RAZORPAY_KEY_SECRET;
        if (!keySecret) throw new ServiceUnavailableError('PaymentService', 'Razorpay secret not configured');

        const body = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        return expectedSignature === razorpaySignature;
    }
}

export const paymentService = new PaymentService();
