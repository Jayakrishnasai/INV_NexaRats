import { supabaseAdmin } from '../supabase/client';
import { NotFoundError, wrapDatabaseError } from '../utils/errors';
import { generateUniqueShortId } from '../utils/shortId';
import { Customer } from '../types';

const mapCustomer = (row: any): Customer => ({
    id: row.id,
    displayId: row.display_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    totalPaid: parseFloat(row.total_paid),
    pending: parseFloat(row.pending),
    status: row.status,
    lastTransaction: row.last_transaction,
    totalInvoices: row.total_invoices,
    address: row.address,
    channel: row.channel,
});

export class CustomerService {
    async getAll(page: number = 1, limit: number = 1000): Promise<{ customers: Customer[], total: number }> {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, count, error } = await supabaseAdmin
            .from('customers')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw wrapDatabaseError(error, 'CustomerService.getAll');
        return {
            customers: (data || []).map(mapCustomer),
            total: count || 0,
        };
    }

    async getById(id: string): Promise<Customer> {
        const { data, error } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) throw new NotFoundError('Customer');
        return mapCustomer(data);
    }

    async findByPhone(phone: string): Promise<Customer | null> {
        const { data } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        return data ? mapCustomer(data) : null;
    }

    async create(input: any): Promise<Customer> {
        const displayId = await generateUniqueShortId('C', async (id) => {
            const { data } = await supabaseAdmin.from('customers').select('id').eq('display_id', id).maybeSingle();
            return !!data;
        });
        const { data, error } = await supabaseAdmin
            .from('customers')
            .insert({
                display_id: displayId,
                name: input.name,
                email: input.email || null,
                phone: input.phone,
                total_paid: input.totalPaid ?? 0,
                pending: input.pending ?? 0,
                status: input.status ?? 'Paid',
                address: input.address || null,
                channel: input.channel ?? 'offline',
            })
            .select('*')
            .single();

        if (error) throw wrapDatabaseError(error, 'CustomerService.create');
        return mapCustomer(data);
    }

    async update(id: string, input: any): Promise<Customer> {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) payload.name = input.name;
        if (input.email !== undefined) payload.email = input.email || null;
        if (input.phone !== undefined) payload.phone = input.phone;
        if (input.totalPaid !== undefined) payload.total_paid = input.totalPaid;
        if (input.pending !== undefined) payload.pending = input.pending;
        if (input.status !== undefined) payload.status = input.status;
        if (input.lastTransaction !== undefined) payload.last_transaction = input.lastTransaction;
        if (input.totalInvoices !== undefined) payload.total_invoices = input.totalInvoices;
        if (input.address !== undefined) payload.address = input.address;
        if (input.channel !== undefined) payload.channel = input.channel;

        const { data, error } = await supabaseAdmin
            .from('customers')
            .update(payload)
            .eq('id', id)
            .select('*')
            .single();

        if (error || !data) throw new NotFoundError('Customer');
        return mapCustomer(data);
    }

    async delete(id: string): Promise<void> {
        // --- CASCADING DELETE (To ensure Dashboard totals update correctly) ---
        // 1. Find all transactions for this customer
        const { data: txns } = await supabaseAdmin
            .from('transactions')
            .select('id')
            .eq('customer_id', id);

        if (txns && txns.length > 0) {
            const txnIds = txns.map(t => t.id);
            // 2. Delete invoice items
            await supabaseAdmin
                .from('invoice_items')
                .delete()
                .in('transaction_id', txnIds);

            // 3. Delete the transactions
            await supabaseAdmin
                .from('transactions')
                .delete()
                .in('id', txnIds);
        }

        // 4. Finally delete the customer record
        const { error } = await supabaseAdmin.from('customers').delete().eq('id', id);
        if (error) throw wrapDatabaseError(error, 'CustomerService.delete');
    }
}

export const customerService = new CustomerService();
