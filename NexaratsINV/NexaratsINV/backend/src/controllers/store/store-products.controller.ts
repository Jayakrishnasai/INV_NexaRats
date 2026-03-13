import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../supabase/client';
import { sendSuccess } from '../../utils/response';
import { wrapDatabaseError } from '../../utils/errors';

/**
 * Publicly available products for the Online Storefront.
 * This endpoint is unauthenticated and returns only basic product details.
 */
export const getStoreProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw wrapDatabaseError(error, 'StoreProducts.getStoreProducts');

        // Map database fields to frontend Product type if needed
        // (Assuming the database schema matches the frontend Product interface)
        const products = (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            price: parseFloat(p.price),
            mrp: parseFloat(p.mrp),
            stock: p.stock,
            minStock: p.min_stock,
            unit: p.unit,
            image: p.image_url,
            description: p.description,
            gstRate: parseFloat(p.gst_rate),
            taxType: p.tax_type,
            status: p.status,
            returns: p.returns,
            expiryDate: p.expiry_date,
            purchasePrice: parseFloat(p.purchase_price),
            hsnCode: p.hsn_code,
            discountPercentage: parseFloat(p.discount_percentage) || 0
        }));

        sendSuccess(res, products, 'Store products retrieved', 200);
    } catch (err) {
        next(err);
    }
};
