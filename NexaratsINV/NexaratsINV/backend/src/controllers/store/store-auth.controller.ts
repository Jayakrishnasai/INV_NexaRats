import { Request, Response, NextFunction } from 'express';
import { storeAuthService } from '../../services/store-auth.service';
import { sendSuccess } from '../../utils/response';

export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await storeAuthService.sendOtp(req.body.phone)); } catch (err) { next(err); }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await storeAuthService.verifyOtp(req.body.phone, req.body.otp);
        sendSuccess(res, {
            success: true,
            token: result.token,
            sessionToken: result.token,  // alias — frontend uses both fields
            phone: req.body.phone,
            customer: result.customer,
        });
    } catch (err) { next(err); }
};

export const storeLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await storeAuthService.loginWithPassword(req.body.phone, req.body.password);
        sendSuccess(res, result);
    } catch (err) { next(err); }
};

export const storeSignup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await storeAuthService.signup(req.body.phone, req.body.name, req.body.password);
        sendSuccess(res, result);
    } catch (err) { next(err); }
};

export const storeRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await storeAuthService.register(req.body.phone, req.body.name, req.body.email);
        sendSuccess(res, result);
    } catch (err) { next(err); }
};

export const setPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await storeAuthService.setPassword(req.storeCustomer!.id, req.body.password);
        sendSuccess(res, null, 'Password set successfully');
    } catch (err) { next(err); }
};

export const getSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers['x-store-token'] as string;
        sendSuccess(res, await storeAuthService.getSession(token));
    } catch (err) { next(err); }
};

export const storeLogout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers['x-store-token'] as string;
        await storeAuthService.logout(token);
        sendSuccess(res, null, 'Logged out');
    } catch (err) { next(err); }
};
