import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthError } from './errors';

// ─── Legacy payload (internal admin users) ────────────────────────────────────
export interface JwtPayload {
    sub: string;    // user ID
    org: string;    // organization ID (tenant)
    role: string;   // 'owner' | 'admin' | 'member' | 'nexarats_admin'
    plan?: string;  // 'basic' | 'pro' | 'enterprise'
    onboarded?: boolean;
    // Legacy fields (kept for backward compatibility with existing admin_users flow)
    userId?: string;
    email?: string;
    permissions?: Record<string, string>;
    iat?: number;
    exp?: number;
}

export interface RefreshPayload {
    userId: string;
    tokenVersion: number;
}

export interface SaasTokenPayload {
    sub: string;    // saas_users.id
    org: string;    // organizations.id
    role: string;
    plan: string;
    onboarded: boolean;
}

/**
 * Issue both access + refresh tokens in one call.
 * Used by signup and login controllers.
 */
export async function issueTokens(payload: SaasTokenPayload): Promise<{
    accessToken: string;
    refreshToken: string;
}> {
    const accessToken = signAccessToken(payload as unknown as JwtPayload);
    const refreshToken = signRefreshToken({ userId: payload.sub, tokenVersion: 1 });
    return { accessToken, refreshToken };
}

/**
 * Sign a short-lived access token (default: 15m).
 */
export const signAccessToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES as any,
        issuer: 'nexarats-api',
        audience: 'nexarats-app',
    });
};

/**
 * Sign a long-lived refresh token (default: 7d).
 */
export const signRefreshToken = (payload: RefreshPayload): string => {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES as any,
        issuer: 'nexarats-api',
        audience: 'nexarats-refresh',
    });
};

export const verifyAccessToken = (token: string): JwtPayload => {
    try {
        return jwt.verify(token, env.JWT_SECRET, {
            issuer: 'nexarats-api',
            audience: 'nexarats-app',
        }) as JwtPayload;
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            throw new AuthError('Access token expired. Please refresh.');
        }
        throw new AuthError('Invalid access token.');
    }
};

export const verifyRefreshToken = (token: string): RefreshPayload => {
    try {
        return jwt.verify(token, env.JWT_REFRESH_SECRET, {
            issuer: 'nexarats-api',
            audience: 'nexarats-refresh',
        }) as RefreshPayload;
    } catch {
        throw new AuthError('Invalid or expired refresh token.');
    }
};

