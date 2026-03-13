import { Request, Response, NextFunction } from 'express';
import { saleService } from '../services/sale.service';
import { transactionService } from '../services/transaction.service';
import { sendSuccess } from '../utils/response';

export const getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const source = req.query.source as string | undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 500; // FIX B4: lowered from 1000

        const result = await transactionService.getAll(source, page, limit);

        sendSuccess(res, result.transactions, 'Transactions retrieved', 200, {
            pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) }
        });
    } catch (err) { next(err); }
};

// POST /api/transactions — delegates to SaleService for atomic processing (FIX C2)
export const createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await saleService.processSale(req.body);
        sendSuccess(res, result, 'Sale processed successfully', 201);
    } catch (err) { next(err); }
};

export const updateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const transaction = await transactionService.update(req.params.id, req.body);
        sendSuccess(res, transaction, 'Transaction updated');
    } catch (err) { next(err); }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await transactionService.delete(req.params.id);
        sendSuccess(res, null, 'Transaction deleted');
    } catch (err) { next(err); }
};
