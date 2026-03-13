import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthError, ForbiddenError } from '../utils/errors';

/**
 * Admin JWT Authentication Middleware.
 * Verifies the JWT and checks that role === 'nexarats_admin'.
 * Must come AFTER requireAdminIP in the middleware chain.
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new AuthError('Authorization header missing or malformed');
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyAccessToken(token);

        if ((payload as any).role !== 'nexarats_admin') {
            throw new ForbiddenError('Admin access required');
        }

        req.user = payload;
        next();
    } catch (err) {
        next(err);
    }
};
