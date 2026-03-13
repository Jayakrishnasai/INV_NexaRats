import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { AuthError } from '../utils/errors';
import { cacheService } from '../utils/cache';

// ─── Global type augmentation ──────────────────────────────────────────────────
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            storeCustomer?: { id: string; phone: string };
        }
    }
}

/**
 * B11 — JWT Authentication Middleware.
 *
 * Supports BOTH token delivery mechanisms:
 *   1. Bearer token in Authorization header  (admin + SaaS API clients)
 *   2. httpOnly `access_token` cookie        (SaaS web app frontend)
 *
 * JWT shapes handled (backward-compatible):
 *   NEW SaaS shape : { sub, org, role, plan, onboarded }
 *   Legacy admin   : { userId, email, role, permissions }
 *
 * After this middleware, downstream handlers always have:
 *   req.user.sub → user ID   (falls back to userId for legacy tokens)
 *   req.user.org → org ID    (undefined for legacy admin users — expected)
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        // ── 1. Extract token ──────────────────────────────────────────────────
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if ((req as any).cookies?.access_token) {
            // httpOnly cookie set by signup/login controllers
            token = (req as any).cookies.access_token;
        }

        if (!token) {
            throw new AuthError('Authorization header missing or malformed');
        }

        // ── 2. Check Redis denylist ────────────────────────────────────────────
        const isDenied = await cacheService.get(`denylist:${token}`);
        if (isDenied) throw new AuthError('Token has been revoked. Please log in again.');

        // ── 3. Verify and normalise ───────────────────────────────────────────
        const payload = verifyAccessToken(token);

        // Normalise legacy shape: promote userId → sub
        if (!payload.sub && payload.userId) {
            (payload as any).sub = payload.userId;
        }

        req.user = payload;
        next();
    } catch (err) {
        next(err);
    }
};
