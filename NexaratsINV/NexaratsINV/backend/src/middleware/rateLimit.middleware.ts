import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { env } from '../config/env';
import { cacheService } from '../utils/cache';

// Reusable store resolver that gracefully falls back to MemoryStore if Redis isn't configured
const getStore = () => {
    const redisClient = cacheService.getRedisClient();
    if (!redisClient) return undefined; // Defaults to MemoryStore internally
    return new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    });
};

export const globalRateLimiter = rateLimit({
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
    },
});

// Stricter limiter for auth endpoints — max 5 login attempts per 15 minutes per IP
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Tightened from 100 → 5 to prevent brute-force attacks
    store: getStore(),
    message: {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.',
        code: 'AUTH_RATE_LIMITED',
    },
});

// OTP endpoint limiter — critical to prevent OTP brute-force
export const otpRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3,
    store: getStore(),
    keyGenerator: (req) => req.body?.phone || req.ip,
    message: {
        success: false,
        error: 'Too many OTP requests for this phone number.',
        code: 'OTP_RATE_LIMITED',
    },
});
