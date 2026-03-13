import { Request, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '../supabase/client';
import { encryptSecret, decryptSecret } from '../utils/encryption';
import { sendSuccess } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';
import { env } from '../config/env';

/**
 * POST /api/v1/keys/razorpay
 * Saves and encrypts the tenant's own Razorpay API keys.
 * The key_secret is NEVER returned in any API response.
 */
export const saveRazorpayKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!env.RAZORPAY_ENCRYPTION_KEY) {
            throw new Error('RAZORPAY_ENCRYPTION_KEY env var is not set. Cannot encrypt keys.');
        }

        const { keyId, keySecret } = req.body as { keyId: string; keySecret: string };
        const { org: orgId } = req.user!;

        // ── Encrypt the secret before storing ────────────────────────────────
        const { encrypted, iv, authTag } = encryptSecret(keySecret);

        // ── Upsert into razorpay_keys (one row per org) ───────────────────────
        const { error } = await supabaseAdmin
            .from('razorpay_keys')
            .upsert(
                {
                    organization_id: orgId,
                    key_id: keyId.trim(),
                    key_secret_enc: encrypted,
                    iv,
                    auth_tag: authTag,
                    is_verified: false,     // reset — needs re-validation
                    last_verified_at: null,
                },
                { onConflict: 'organization_id' }
            );

        if (error) throw error;

        // ── Advance onboarding to step 4 (keys saved) ───────────────────────
        await supabaseAdmin
            .from('organizations')
            .update({ onboarding_step: 3 })
            .eq('id', orgId)
            .lt('onboarding_step', 3);   // only advance, never go back

        sendSuccess(res, {
            message: 'Razorpay keys saved securely. Run validation to activate.',
            keyId: keyId.trim(),          // safe to echo back (public key)
            isVerified: false,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/keys/validate
 * Decrypts and tests the tenant's Razorpay keys by creating a ₹1 test order.
 * Marks is_verified=true on success.
 */
export const validateRazorpayKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId } = req.user!;

        // ── Retrieve encrypted keys ───────────────────────────────────────────
        const { data: keyRow, error } = await supabaseAdmin
            .from('razorpay_keys')
            .select('key_id, key_secret_enc, iv, auth_tag')
            .eq('organization_id', orgId)
            .maybeSingle();

        if (error || !keyRow) {
            throw new NotFoundError('No Razorpay keys found. Please save your keys first.');
        }

        // ── Decrypt key_secret ────────────────────────────────────────────────
        const keySecret = decryptSecret({
            encrypted: keyRow.key_secret_enc,
            iv: keyRow.iv,
            authTag: keyRow.auth_tag,
        });

        // ── Test the keys by creating a ₹1 order ─────────────────────────────
        const rzp = new Razorpay({ key_id: keyRow.key_id, key_secret: keySecret });

        try {
            await rzp.orders.create({
                amount: 100,                // 100 paise = ₹1 (minimum order)
                currency: 'INR',
                receipt: `validation-${orgId.substring(0, 8)}`,
            });
        } catch (rzpErr: any) {
            // Check if it's an auth error (invalid keys) vs. a network error
            if (rzpErr?.statusCode === 401 || rzpErr?.error?.code === 'BAD_REQUEST_ERROR') {
                throw new ValidationError(
                    'Razorpay key validation failed: Invalid Key ID or Key Secret. Please check your Razorpay Dashboard.'
                );
            }
            throw new ValidationError(
                `Razorpay validation error: ${rzpErr?.error?.description || 'Unknown error'}`
            );
        }

        // ── Mark as verified ──────────────────────────────────────────────────
        const now = new Date().toISOString();
        await Promise.all([
            supabaseAdmin
                .from('razorpay_keys')
                .update({ is_verified: true, last_verified_at: now })
                .eq('organization_id', orgId),
            // Advance onboarding to step 4 (keys verified)
            supabaseAdmin
                .from('organizations')
                .update({ onboarding_step: 4 })
                .eq('id', orgId)
                .lt('onboarding_step', 4),
        ]);

        sendSuccess(res, {
            message: 'Razorpay keys verified successfully! You can now accept payments.',
            isVerified: true,
            lastVerifiedAt: now,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/keys/status
 * Returns whether the tenant has configured and verified their Razorpay keys.
 * Does NOT return any key material.
 */
export const getKeyStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId } = req.user!;

        const { data } = await supabaseAdmin
            .from('razorpay_keys')
            .select('key_id, is_verified, last_verified_at, created_at')
            .eq('organization_id', orgId)
            .maybeSingle();

        sendSuccess(res, {
            hasKeys: !!data,
            keyId: data?.key_id ?? null,        // public key is safe to return
            isVerified: data?.is_verified ?? false,
            lastVerifiedAt: data?.last_verified_at ?? null,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/keys/razorpay
 * Removes the tenant's stored Razorpay keys.
 */
export const deleteRazorpayKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { org: orgId } = req.user!;
        await supabaseAdmin.from('razorpay_keys').delete().eq('organization_id', orgId);
        sendSuccess(res, { message: 'Razorpay keys removed.' });
    } catch (err) {
        next(err);
    }
};
