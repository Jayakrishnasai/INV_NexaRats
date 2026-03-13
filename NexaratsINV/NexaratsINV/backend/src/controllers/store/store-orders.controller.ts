import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../supabase/client';
import { sendSuccess } from '../../utils/response';
import { AuthError, wrapDatabaseError } from '../../utils/errors';
import { saleService } from '../../services/sale.service';

export const getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 1000;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, count, error } = await supabaseAdmin
            .from('transactions')
            .select('*, invoice_items(*), customers(name, phone)', { count: 'exact' })
            .eq('customer_id', req.storeCustomer.id)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw wrapDatabaseError(error, 'StoreOrders.getOrders');

        const orders = (data || []).map((t: any) => ({
            id: t.id,
            total: parseFloat(t.total),
            status: t.status,
            orderStatus: t.order_status,
            date: t.date,
            source: t.source,
            items: (t.invoice_items || []).map((i: any) => ({
                name: i.product_name,
                quantity: i.quantity,
                price: parseFloat(i.price),
            })),
        }));

        sendSuccess(res, orders, 'Orders retrieved', 200, {
            pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) }
        });
    } catch (err) { next(err); }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        // Ensure source is online
        req.body.source = 'online';
        // Ensure customer ID correctly attaches to them
        if (!req.body.customerId) {
            req.body.customerId = req.storeCustomer.id;
        }

        // Map Storefront fields to SaleService expected fields
        if (req.body.customerName && !req.body.custName) {
            req.body.custName = req.body.customerName;
        }
        if (req.body.customerPhone && !req.body.custPhone) {
            req.body.custPhone = req.body.customerPhone;
        }
        if (req.body.deliveryAddress && !req.body.custAddress) {
            req.body.custAddress = req.body.deliveryAddress;
        }

        const result = await saleService.processSale(req.body);
        sendSuccess(res, result, 'Order processed successfully', 201);
    } catch (err) { next(err); }
};

// Admin view of storefront customers
export const getStoreCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 1000;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, count, error } = await supabaseAdmin
            .from('customers')
            .select('id, name, phone, email, total_invoices, total_paid, created_at, store_addresses(*)', { count: 'exact' })
            .in('channel', ['online', 'both'])
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw wrapDatabaseError(error, 'StoreOrders.getStoreCustomers');

        const mappedData = (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            totalOrders: c.total_invoices,
            totalSpent: Number(c.total_paid) || 0,
            createdAt: c.created_at,
            addresses: (c.store_addresses || []).map((a: any) => ({
                id: a.id,
                label: a.label,
                name: a.name,
                phone: a.phone,
                line1: a.line1,
                line2: a.line2,
                city: a.city,
                state: a.state,
                pincode: a.pincode,
                isDefault: a.is_default
            }))
        }));

        sendSuccess(res, mappedData, 'Store customers retrieved', 200, {
            pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) }
        });
    } catch (err) { next(err); }
};
