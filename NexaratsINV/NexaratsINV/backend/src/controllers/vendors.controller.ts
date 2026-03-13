import { Request, Response, NextFunction } from 'express';
import { vendorService } from '../services/vendor.service';
import { sendSuccess } from '../utils/response';

export const getVendors = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await vendorService.getAll()); } catch (err) { next(err); }
};

export const createVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await vendorService.create(req.body), 'Vendor created', 201); } catch (err) { next(err); }
};

export const updateVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await vendorService.update(req.params.id, req.body), 'Vendor updated'); } catch (err) { next(err); }
};

export const deleteVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await vendorService.delete(req.params.id); sendSuccess(res, null, 'Vendor deleted'); } catch (err) { next(err); }
};
