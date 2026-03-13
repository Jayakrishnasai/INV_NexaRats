import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';
import { sendSuccess } from '../utils/response';

export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 1000;
        const result = await customerService.getAll(page, limit);

        sendSuccess(res, result.customers, 'Customers retrieved', 200, {
            pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) }
        });
    } catch (err) { next(err); }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await customerService.getById(req.params.id)); } catch (err) { next(err); }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await customerService.create(req.body), 'Customer created', 201); } catch (err) { next(err); }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await customerService.update(req.params.id, req.body), 'Customer updated'); } catch (err) { next(err); }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await customerService.delete(req.params.id); sendSuccess(res, null, 'Customer deleted'); } catch (err) { next(err); }
};
