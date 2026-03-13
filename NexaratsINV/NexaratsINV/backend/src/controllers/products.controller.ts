import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';
import { sendSuccess } from '../utils/response';

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 500; // FIX B4: lowered from 1000

        const result = await productService.getAll(page, limit);
        sendSuccess(res, result.products, 'Products retrieved', 200, {
            pagination: {
                page,
                limit,
                total: result.total,
                pages: Math.ceil(result.total / limit)
            }
        });
    } catch (err) { next(err); }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const product = await productService.getById(req.params.id);
        sendSuccess(res, product);
    } catch (err) { next(err); }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const product = await productService.create(req.body);
        sendSuccess(res, product, 'Product created', 201);
    } catch (err) { next(err); }
};

export const bulkCreateProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const products = await productService.bulkCreate(req.body.items);
        sendSuccess(res, products, 'Products imported successfully', 201);
    } catch (err) { next(err); }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const product = await productService.update(req.params.id, req.body);
        sendSuccess(res, product, 'Product updated');
    } catch (err) { next(err); }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await productService.delete(req.params.id);
        sendSuccess(res, null, 'Product deleted');
    } catch (err) { next(err); }
};

export const bulkUpdateProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const products = await productService.bulkUpdate(req.body.items);
        sendSuccess(res, products, 'Products updated');
    } catch (err) { next(err); }
};
