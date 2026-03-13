import { Request, Response, NextFunction } from 'express';
import { purchaseService } from '../services/purchase.service';
import { sendSuccess } from '../utils/response';

export const getPurchases = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await purchaseService.getAll()); } catch (err) { next(err); }
};

export const createPurchase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await purchaseService.create(req.body), 'Purchase order created', 201); } catch (err) { next(err); }
};
