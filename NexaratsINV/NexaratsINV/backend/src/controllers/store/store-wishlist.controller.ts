import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../supabase/client';
import { sendSuccess } from '../../utils/response';
import { NotFoundError, AuthError, wrapDatabaseError } from '../../utils/errors';

export const getWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        const { data, error } = await supabaseAdmin
            .from('store_wishlist')
            .select('id, added_at, products(id, name, price, image, status)')
            .eq('customer_id', req.storeCustomer.id);

        if (error) throw wrapDatabaseError(error, 'StoreWishlist.get');
        sendSuccess(res, (data || []).map((w: any) => ({ ...w.products, wishlistId: w.id, addedAt: w.added_at })));
    } catch (err) { next(err); }
};

export const addToWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        const { data, error } = await supabaseAdmin
            .from('store_wishlist')
            .insert({ customer_id: req.storeCustomer.id, product_id: req.body.productId })
            .select('id, product_id')
            .single();

        if (error) throw wrapDatabaseError(error, 'StoreWishlist.add');
        sendSuccess(res, data, 'Added to wishlist', 201);
    } catch (err) { next(err); }
};

export const removeFromWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        const { error } = await supabaseAdmin
            .from('store_wishlist')
            .delete()
            .eq('customer_id', req.storeCustomer.id)
            .eq('product_id', req.params.productId);

        if (error) throw new NotFoundError('Wishlist item');
        sendSuccess(res, null, 'Removed from wishlist');
    } catch (err) { next(err); }
};
