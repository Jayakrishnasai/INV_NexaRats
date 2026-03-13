import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { cacheService } from '../utils/cache';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await userService.login(req.body.email, req.body.password);
        
        // FIX A7: Set httpOnly cookie for better security
        res.cookie('access_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 mins
        });

        sendSuccess(res, result, 'Login successful');
    } catch (err) { next(err); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await userService.refresh(req.body.refreshToken);
        
        // Update cookie with new access token
        res.cookie('access_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        });

        sendSuccess(res, result);
    } catch (err) { next(err); }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
        
        if (token && req.user?.exp) {
            const ttlSeconds = req.user.exp - Math.floor(Date.now() / 1000);
            if (ttlSeconds > 0) {
                await cacheService.set(`denylist:${token}`, true, ttlSeconds);
            }
        }
        
        // FIX A7: Clear the cookie on logout
        res.clearCookie('access_token');
        
        sendSuccess(res, null, 'Logged out successfully. Token revoked.');
    } catch (err) { next(err); }
};
