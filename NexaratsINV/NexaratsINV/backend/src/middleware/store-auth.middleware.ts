import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { AuthError } from '../utils/errors';
import { logger } from '../utils/logger';

const log = logger('StoreAuth');

/**
 * Storefront Session Authentication Middleware.
 * FIX C3: Sessions are now managed server-side in the store_sessions table.
 * The X-Store-Token header is verified against the DB on every request.
 * Expired sessions are rejected. Logout actively deletes the session row.
 *
 * FIX B3: Entire body wrapped in try/catch to prevent unhandled rejections.
 */
export const requireStoreAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers['x-store-token'] as string | undefined;

        if (!token) {
            return next(new AuthError('X-Store-Token header required'));
        }

        const { data: session, error } = await supabaseAdmin
            .from('store_sessions')
            .select('customer_id, phone, expires_at')
            .eq('token', token)
            .single();

        if (error || !session) {
            return next(new AuthError('Invalid store session'));
        }

        if (new Date(session.expires_at) < new Date()) {
            // Clean up expired session
            try { await supabaseAdmin.from('store_sessions').delete().eq('token', token); } catch { /* ignore cleanup errors */ }
            return next(new AuthError('Store session expired. Please login again.'));
        }

        req.storeCustomer = {
            id: session.customer_id,
            phone: session.phone,
        };

        next();
    } catch (err) {
        log.error('Store auth middleware failed', err instanceof Error ? err : new Error(String(err)));
        next(new AuthError('Authentication service unavailable'));
    }
};
