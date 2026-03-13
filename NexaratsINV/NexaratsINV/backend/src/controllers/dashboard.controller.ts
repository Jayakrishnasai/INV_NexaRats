import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { sendSuccess, sendError } from '../utils/response';
import { mapTransaction } from '../services/transaction.service';

// Mappers to ensure the frontend receives camelCase
// Transaction mapper moved to transaction.service.ts

const mapPurchase = (p: any) => ({
    ...p,
    vendorId: p.vendor_id,
    amount: parseFloat(p.amount || 0),
    paidAmount: parseFloat(p.paid_amount || 0),
    referenceNo: p.reference_no,
});

const mapVendor = (v: any) => ({
    ...v,
    pendingAmount: parseFloat(v.pending_amount || 0),
    totalPaid: parseFloat(v.total_paid || 0),
});

export const getDashboardData = async (req: Request, res: Response) => {
    try {
        const reqDate = req.query.date as string;
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Month Start (YYYY-MM-DD)
        const monthStart = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
        
        // Filter: Specific day if reqDate, else Whole Month (MTD)
        const filterDate = reqDate;
        const subheaderDataLog = filterDate ? `date=${filterDate}` : `month=${monthStart}`;

        // ── 1. Fetch Transactions (MTD or Day)
        let txnQuery = supabaseAdmin
            .from('transactions')
            .select('*, invoice_items(*), customers(name, phone)');
            
        if (filterDate) {
            txnQuery = txnQuery.eq('date', filterDate);
        } else {
            txnQuery = txnQuery.gte('date', monthStart);
        }
        
        const { data: txnRaw, error: txnError } = await txnQuery
            .order('created_at', { ascending: false })
            .limit(2000); // 2000 limit for monthly data

        if (txnError) console.error('[Dashboard] transactions fetch error:', txnError.message);
        const transactionsData = txnRaw || [];

        // ── 3. SYNC STICKY PERFORMANCE LOG (As requested: "data will be stay correctly when we delete also")
        // We use the 'settings' table as a persistent daily/hourly sales journal.
        const currentMonthKey = `perf_stats_${monthStart}`; 
        const { data: statsRow } = await supabaseAdmin.from('settings').select('value').eq('key', currentMonthKey).maybeSingle();
        let stickyStats: Record<string, any> = statsRow?.value || {};
        let updated = false;

        transactionsData.forEach((t: any) => {
            const dayKey = t.date;
            const hour = new Date(t.created_at).getHours();
            const logKey = `${dayKey}_H${hour}_${t.source}`;
            if (!stickyStats[logKey]) stickyStats[logKey] = { revenue: 0, profit: 0, txns: {} };
            if (!stickyStats[logKey].txns[t.id]) {
                stickyStats[logKey].revenue += Number(t.total) || 0;
                stickyStats[logKey].txns[t.id] = true;
                updated = true;
            }
        });

        if (updated) await supabaseAdmin.from('settings').upsert({ key: currentMonthKey, value: stickyStats });

        // ── 4. Fetch Purchase Orders (MTD or Day)
        let purQuery = supabaseAdmin.from('purchase_orders').select('*');
        if (filterDate) purQuery = purQuery.eq('date', filterDate);
        else purQuery = purQuery.gte('date', monthStart);
            
        const { data: purRaw, error: purError } = await purQuery
            .order('created_at', { ascending: false })
            .limit(1000);

        if (purError) console.error('[Dashboard] purchases fetch error:', purError.message);
        const purchasesData = purRaw || [];

        // ── 5. Fetch other master data
        const [productResult, customerResult, vendorResult] = await Promise.all([
            supabaseAdmin.from('products').select('*'),
            supabaseAdmin.from('customers').select('*').order('created_at', { ascending: false }),
            supabaseAdmin.from('vendors').select('*').order('created_at', { ascending: false }),
        ]);

        const products = productResult.data || [];
        const customers = customerResult.data || [];
        const vendorsData = vendorResult.data || [];

        console.log(`[Dashboard] ${subheaderDataLog} | txns=${transactionsData.length} | purchases=${purchasesData.length} | customers=${customers.length}`);

        return sendSuccess(res, {
            transactions: transactionsData.map(mapTransaction),
            purchases: purchasesData.map(mapPurchase),
            products,
            customers,
            vendors: vendorsData.map(mapVendor),
            performanceStats: stickyStats // Return sticky statistics for graph
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return sendError(res, 500, 'Failed to fetch centralized dashboard data', 'FETCH_ERROR');
    }
};

export const resetDashboardData = async (_req: Request, res: Response) => {
    try {
        console.log('[Dashboard] Initiating full data reset...');
        
        // 1. Clear sticky stats
        const monthStart = new Date().toISOString().slice(0, 7) + '-01';
        await supabaseAdmin.from('settings').delete().eq('key', `perf_stats_${monthStart}`);

        // 2. Delete transactional sub-items first
        await supabaseAdmin.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // 3. Delete transactions and purchases
        await supabaseAdmin.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabaseAdmin.from('purchase_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // 4. Delete contacts (Customers & Vendors)
        await supabaseAdmin.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabaseAdmin.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        console.log('[Dashboard] Data reset complete.');
        return sendSuccess(res, { message: 'All transactions, customers, and vendors have been cleared successfully.' });
    } catch (error) {
        console.error('Error resetting dashboard data:', error);
        return sendError(res, 500, 'Failed to reset dashboard data', 'RESET_ERROR');
    }
};
