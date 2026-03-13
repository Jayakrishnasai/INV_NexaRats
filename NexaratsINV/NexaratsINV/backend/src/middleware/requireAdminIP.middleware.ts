import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ForbiddenError } from '../utils/errors';

/**
 * Admin IP Allowlist Middleware.
 * Blocks requests to /api/v1/admin/* from non-allowlisted IPs.
 *
 * Config: ADMIN_IP_ALLOWLIST="1.2.3.4,5.6.7.8" in .env
 * If ADMIN_IP_ALLOWLIST is not set, the check is skipped (dev mode).
 * In production, ADMIN_IP_ALLOWLIST MUST be set.
 */
export const requireAdminIP = (req: Request, _res: Response, next: NextFunction): void => {
    // Skip IP check in development if not configured
    if (!env.ADMIN_IP_ALLOWLIST) {
        if (env.NODE_ENV === 'production') {
            // In production, if allowlist is empty, block everything
            throw new ForbiddenError('Admin endpoint: IP allowlist not configured');
        }
        return next();
    }

    const allowedIPs = env.ADMIN_IP_ALLOWLIST.split(',').map((ip: string) => ip.trim());

    // Get real client IP (handle proxies/load balancers)
    const clientIP =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || '';

    if (!allowedIPs.includes(clientIP)) {
        throw new ForbiddenError(`Access denied from IP: ${clientIP}`);
    }

    next();
};
