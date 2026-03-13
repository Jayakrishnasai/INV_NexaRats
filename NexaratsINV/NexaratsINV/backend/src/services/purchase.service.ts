import { supabaseAdmin } from '../supabase/client';
import { wrapDatabaseError } from '../utils/errors';
import { PurchaseOrder } from '../types';
import { logger } from '../utils/logger';

const log = logger('PurchaseService');

const mapPurchase = (row: any): PurchaseOrder => ({
    id: row.id,
    displayId: row.display_id,
    vendorId: row.vendor_id,
    amount: parseFloat(row.amount),
    date: row.date,
    status: row.status,
    paidAmount: row.paid_amount != null ? parseFloat(row.paid_amount) : undefined,
    referenceNo: row.reference_no ?? undefined,
    notes: row.notes ?? undefined,
});

export class PurchaseService {
    async getAll(): Promise<PurchaseOrder[]> {
        const { data, error } = await supabaseAdmin
            .from('purchase_orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw wrapDatabaseError(error, 'PurchaseService.getAll');
        return (data || []).map(mapPurchase);
    }

    async create(input: {
        vendorId: string;
        amount: number;
        date: string;
        status: string;
        paidAmount?: number;
        referenceNo?: string;
        notes?: string;
    }): Promise<PurchaseOrder> {
        const status = input.status ?? 'Paid';
        const amount = input.amount;
        const paidAmount =
            status === 'Paid'
                ? amount
                : status === 'Unpaid'
                    ? 0
                    : Math.min(amount, Math.max(0, input.paidAmount ?? 0));

        const { data, error } = await supabaseAdmin
            .from('purchase_orders')
            .insert({
                vendor_id: input.vendorId,
                amount,
                date: input.date,
                status,
                paid_amount: paidAmount,
                reference_no: input.referenceNo || null,
                notes: input.notes || null,
            })
            .select('*')
            .single();

        if (error) throw wrapDatabaseError(error, 'PurchaseService.create');

        try {
            const { data: vendor } = await supabaseAdmin
                .from('vendors')
                .select('total_paid, pending_amount, total_invoices')
                .eq('id', input.vendorId)
                .single();

            if (vendor) {
                const addToPaid = paidAmount;
                const addToPending = amount - paidAmount;
                const { error: updateError } = await supabaseAdmin
                    .from('vendors')
                    .update({
                        total_paid: parseFloat(vendor.total_paid) + addToPaid,
                        pending_amount: parseFloat(vendor.pending_amount) + addToPending,
                        total_invoices: vendor.total_invoices + 1,
                        last_transaction: input.date,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', input.vendorId);

                if (updateError) {
                    log.error('Failed to update vendor aggregates after purchase', updateError);
                }
            } else {
                log.warn(`Vendor ${input.vendorId} not found when updating aggregates`);
            }
        } catch (err) {
            log.error('Vendor aggregate update crashed — purchase order was still created', err instanceof Error ? err : new Error(String(err)));
        }

        return mapPurchase(data);
    }
}

export const purchaseService = new PurchaseService();
