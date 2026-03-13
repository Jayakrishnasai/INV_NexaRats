import { Request, Response, NextFunction } from 'express';
import { whatsAppService } from '../services/whatsapp.service';
import { sendSuccess } from '../utils/response';

const getSessionId = (req: Request) => req.user?.org || req.user?.sub || 'default';

export const getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await whatsAppService.getStatus(getSessionId(req))); } catch (err) { next(err); }
};

export const getQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await whatsAppService.getQr(getSessionId(req))); } catch (err) { next(err); }
};

export const waLogout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await whatsAppService.logout(getSessionId(req))); } catch (err) { next(err); }
};

export const restart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await whatsAppService.restart(getSessionId(req))); } catch (err) { next(err); }
};

export const requestPairingCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await whatsAppService.requestPairingCode(getSessionId(req), req.body.phone);
        sendSuccess(res, result);
    } catch (err) { next(err); }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await whatsAppService.send(getSessionId(req), req.body.to, req.body.type, req.body.content);
        sendSuccess(res, result);
    } catch (err) { next(err); }
};

export const sendReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await whatsAppService.sendReceipt(getSessionId(req), req.body)); } catch (err) { next(err); }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string | undefined;
        const to = req.query.to as string | undefined;
        sendSuccess(res, await whatsAppService.getMessages(getSessionId(req), page, limit, status, to));
    } catch (err) { next(err); }
};

