import { supabaseAdmin } from '../supabase/client';
import { NotFoundError, wrapDatabaseError } from '../utils/errors';
import { generateUniqueShortId } from '../utils/shortId';
import { Vendor } from '../types';

const mapVendor = (row: any): Vendor => ({
    id: row.id,
    displayId: row.display_id,
    name: row.name,
    businessName: row.business_name,
    gstNumber: row.gst_number,
    phone: row.phone,
    email: row.email,
    totalPaid: parseFloat(row.total_paid),
    pendingAmount: parseFloat(row.pending_amount),
    lastTransaction: row.last_transaction,
    totalInvoices: row.total_invoices,
    image: row.image,
});

export class VendorService {
    async getAll(): Promise<Vendor[]> {
        const { data, error } = await supabaseAdmin
            .from('vendors')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw wrapDatabaseError(error, 'VendorService');
        return (data || []).map(mapVendor);
    }

    async create(input: any): Promise<Vendor> {
        const displayId = await generateUniqueShortId('V', async (id) => {
            const { data } = await supabaseAdmin.from('vendors').select('id').eq('display_id', id).maybeSingle();
            return !!data;
        });
        const { data, error } = await supabaseAdmin
            .from('vendors')
            .insert({
                display_id: displayId,
                name: input.name,
                business_name: input.businessName,
                gst_number: input.gstNumber || null,
                phone: input.phone,
                email: input.email || null,
                total_paid: input.totalPaid ?? 0,
                pending_amount: input.pendingAmount ?? 0,
            })
            .select('*')
            .single();

        if (error) throw wrapDatabaseError(error, 'VendorService.create');
        return mapVendor(data);
    }

    async update(id: string, input: any): Promise<Vendor> {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) payload.name = input.name;
        if (input.businessName !== undefined) payload.business_name = input.businessName;
        if (input.gstNumber !== undefined) payload.gst_number = input.gstNumber || null;
        if (input.phone !== undefined) payload.phone = input.phone;
        if (input.email !== undefined) payload.email = input.email || null;
        if (input.totalPaid !== undefined) payload.total_paid = input.totalPaid;
        if (input.pendingAmount !== undefined) payload.pending_amount = input.pendingAmount;

        const { data, error } = await supabaseAdmin
            .from('vendors')
            .update(payload)
            .eq('id', id)
            .select('*')
            .single();

        if (error || !data) throw new NotFoundError('Vendor');
        return mapVendor(data);
    }

    // FIX I3: Vendor delete was missing from original API layer
    async delete(id: string): Promise<void> {
        // --- CASCADING DELETE ---
        // 1. Delete associated purchase orders
        await supabaseAdmin.from('purchase_orders').delete().eq('vendor_id', id);

        // 2. Finally delete the vendor
        const { error } = await supabaseAdmin.from('vendors').delete().eq('id', id);
        if (error) throw wrapDatabaseError(error, 'VendorService.delete');
    }
}

export const vendorService = new VendorService();
