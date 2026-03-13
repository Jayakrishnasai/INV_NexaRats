import { supabaseAdmin } from '../supabase/client';
import { NotFoundError, wrapDatabaseError } from '../utils/errors';
import { Transaction } from '../types';

export const mapTransaction = (row: any): any => ({
    id: row.id,
    displayId: row.display_id || row.id.split('-')[0],
    customerId: row.customer_id,
    customerName: row.customers?.name || row.cust_name || 'Walk-in Customer',
    customerPhone: row.customers?.phone || row.cust_phone || null,
    subtotal: parseFloat(row.subtotal || 0),
    gstAmount: parseFloat(row.gst_amount || 0),
    total: parseFloat(row.total || 0),
    paidAmount: parseFloat(row.paid_amount || 0),
    couponDiscount: parseFloat(row.coupon_discount || 0),
    method: row.method || 'cash',
    status: row.status || 'Paid',
    source: row.source || 'offline',
    orderStatus: row.order_status || 'Pending',
    assignedStaff: row.assigned_staff,
    deliveryStatus: row.delivery_status,
    date: row.date,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    createdAt: row.created_at,
    items: (row.invoice_items || []).map((item: any) => ({
        id: item.product_id,
        name: item.product_name,
        price: parseFloat(item.price || 0),
        quantity: item.quantity,
        gstAmount: parseFloat(item.gst_amount || 0),
        discount: parseFloat(item.discount || 0),
        purchasePrice: parseFloat(item.purchase_price || 0)
    })),
});

export class TransactionService {
    async getAll(source?: string, page: number = 1, limit: number = 1000): Promise<{ transactions: any[], total: number }> {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from('transactions')
            .select('*, invoice_items(*), customers(name, phone)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (source === 'online' || source === 'offline') {
            query = query.eq('source', source);
        }

        const { data, count, error } = await query;
        if (error) throw wrapDatabaseError(error, 'TransactionService.getAll');
        return {
            transactions: (data || []).map(mapTransaction),
            total: count || 0,
        };
    }

    async getById(id: string): Promise<any> {
        const { data, error } = await supabaseAdmin
            .from('transactions')
            .select('*, invoice_items(*), customers(name, phone)')
            .eq('id', id)
            .single();

        if (error || !data) throw new NotFoundError('Transaction');
        return mapTransaction(data);
    }

    async update(id: string, input: {
        orderStatus?: string;
        assignedStaff?: string;
        deliveryStatus?: string;
        status?: string;
    }): Promise<any> {
        const payload: Record<string, unknown> = {};
        if (input.orderStatus !== undefined) payload.order_status = input.orderStatus;
        if (input.assignedStaff !== undefined) payload.assigned_staff = input.assignedStaff;
        if (input.deliveryStatus !== undefined) payload.delivery_status = input.deliveryStatus;
        if (input.status !== undefined) payload.status = input.status;

        const { data, error } = await supabaseAdmin
            .from('transactions')
            .update(payload)
            .eq('id', id)
            .select('*, invoice_items(*)')
            .single();

        if (error || !data) throw new NotFoundError('Transaction');
        return mapTransaction(data);
    }

    async delete(id: string): Promise<void> {
        // Cascade delete: First remove invoice items, then the transaction itself
        const { error: itemsError } = await supabaseAdmin
            .from('invoice_items')
            .delete()
            .eq('transaction_id', id);

        if (itemsError) throw wrapDatabaseError(itemsError, 'TransactionService.delete_items');

        const { error: txnError } = await supabaseAdmin
            .from('transactions')
            .delete()
            .eq('id', id);

        if (txnError) throw wrapDatabaseError(txnError, 'TransactionService.delete_txn');
    }
}

export const transactionService = new TransactionService();
