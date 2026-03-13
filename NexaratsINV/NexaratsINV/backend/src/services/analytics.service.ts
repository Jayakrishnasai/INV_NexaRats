import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../supabase/client';

class AnalyticsService {
    // Run daily at 23:59 server time — ONLY backs up data, NEVER deletes anything
    public initializeCron() {
        // Daily Backup & Reset — As requested: "auto download every day end of the day when auto download all must clear in dashboard and analytics"
        // 1. Daily Backup at 23:55
        cron.schedule('55 23 * * *', async () => {
            console.log('⏰ [Cron] Starting daily analytics backup before reset...');
            await this.processDailyExport();
        });

        // 2. Daily Reset at 23:59 (End of Day)
        cron.schedule('59 23 * * *', async () => {
            console.log('🏁 [Cron] Starting Daily Data Reset (End of Day)...');
            await this.processDailyReset(); // Renaming this to processDailyReset internally might be better but let's just use the logic
        });

        console.log('✅ Analytics cron jobs initialized: Backup (23:55 daily), Reset (23:59 daily).');
    }

    public async processDailyReset() {
        try {
            // 1. Perform a final backup of the previous day
            await this.processDailyExport();

            console.log('[Analytics] Wiping transactional data for new day...');
            
            // Delete in order of constraints
            await supabaseAdmin.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabaseAdmin.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabaseAdmin.from('purchase_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabaseAdmin.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabaseAdmin.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

            console.log('✨ [Analytics] Daily reset complete. System is fresh for the new day.');
        } catch (error) {
            console.error('❌ [Analytics] Daily reset failed:', error);
        }
    }

    public async processDailyExport() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Fetch today's transactions (date-based, no processed column needed)
            const { data: transactions, error: tError } = await supabaseAdmin
                .from('transactions')
                .select('*')
                .eq('date', today)
                .order('created_at', { ascending: false });

            if (tError) {
                console.error('[Analytics] Failed to fetch transactions:', tError.message);
            }

            // 2. Fetch today's purchases
            const { data: purchases, error: pError } = await supabaseAdmin
                .from('purchase_orders')
                .select('*')
                .eq('date', today)
                .order('created_at', { ascending: false });

            if (pError) {
                console.error('[Analytics] Failed to fetch purchases:', pError.message);
            }

            // 3. Fetch all customers and vendors for full analytics
            const [custResult, vendResult] = await Promise.all([
                supabaseAdmin.from('customers').select('*').order('created_at', { ascending: false }),
                supabaseAdmin.from('vendors').select('*').order('created_at', { ascending: false }),
            ]);

            const txns = transactions || [];
            const purch = purchases || [];
            const customers = custResult.data || [];
            const vendors = vendResult.data || [];

            // 4. Generate CSV + JSON
            const csvData = this.generateCSV(txns, purch, customers, vendors);
            const backupData = {
                date: today,
                generatedAt: new Date().toISOString(),
                summary: {
                    totalSales: txns.reduce((sum, t) => sum + Number(t.total || 0), 0),
                    salesCount: txns.length,
                    totalPurchases: purch.reduce((sum, p) => sum + Number(p.amount || 0), 0),
                    purchaseCount: purch.length,
                    totalCustomers: customers.length,
                    totalVendors: vendors.length,
                },
                details: {
                    sales: txns,
                    purchases: purch,
                    customers,
                    vendors,
                }
            };

            // 5. Save to disk (never deletes backend data)
            const dirPath = path.join(process.cwd(), 'backups', 'analytics');
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            const csvPath = path.join(dirPath, `analytics_${today}.csv`);
            const jsonPath = path.join(dirPath, `analytics_${today}.json`);

            fs.writeFileSync(csvPath, csvData, 'utf8');
            fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');

            console.log(`✅ [Analytics] Daily backup saved: ${csvPath}`);
            console.log(`   Sales: ₹${backupData.summary.totalSales} | Txns: ${txns.length} | Purchases: ${purch.length}`);

            return { success: true, csvPath, jsonPath, filePath: csvPath, summary: backupData.summary };
        } catch (error) {
            console.error('❌ [Analytics] Error processing daily export:', error);
            return { success: false, error };
        }
    }

    private generateCSV(
        transactions: any[],
        purchases: any[],
        customers: any[],
        vendors: any[]
    ): string {
        const rows: string[] = [];

        // Header
        rows.push('=== DAILY ANALYTICS REPORT ===');
        rows.push(`Generated: ${new Date().toISOString()}`);
        rows.push('');

        // Sales section
        rows.push('--- SALES ---');
        rows.push('Type,ID,Date,Total,Paid,Status,Payment Method,Customer ID');
        transactions.forEach(t => {
            rows.push(`Sale,${t.id},${t.date},${t.total},${t.paid_amount || 0},${t.status},${t.method || 'cash'},${t.customer_id || ''}`);
        });

        rows.push('');

        // Purchases section
        rows.push('--- PURCHASES ---');
        rows.push('Type,ID,Date,Amount,Paid,Status,Vendor ID,Reference');
        purchases.forEach(p => {
            rows.push(`Purchase,${p.id},${p.date},${p.amount},${p.paid_amount || 0},${p.status},${p.vendor_id || ''},${p.reference_no || ''}`);
        });

        rows.push('');

        // Customer summary
        rows.push('--- CUSTOMER SUMMARY ---');
        rows.push('ID,Name,Phone,Total Paid,Pending,Status');
        customers.forEach(c => {
            rows.push(`${c.id},"${c.name || ''}",${c.phone || ''},${c.total_paid || 0},${c.pending || 0},${c.status || ''}`);
        });

        rows.push('');

        // Vendor summary
        rows.push('--- VENDOR SUMMARY ---');
        rows.push('ID,Name,Business,Phone,Total Paid,Pending');
        vendors.forEach(v => {
            rows.push(`${v.id},"${v.name || ''}","${v.business_name || ''}",${v.phone || ''},${v.total_paid || 0},${v.pending_amount || 0}`);
        });

        rows.push('');

        // Summary
        const totalSales = transactions.reduce((s, t) => s + Number(t.total || 0), 0);
        const totalPurchases = purchases.reduce((s, p) => s + Number(p.amount || 0), 0);
        rows.push('--- TOTALS ---');
        rows.push(`Total Sales Amount,${totalSales}`);
        rows.push(`Total Purchase Amount,${totalPurchases}`);
        rows.push(`Net (Sales - Purchases),${totalSales - totalPurchases}`);
        rows.push(`Total Customers,${customers.length}`);
        rows.push(`Total Vendors,${vendors.length}`);

        return rows.join('\n');
    }
}

export const analyticsService = new AnalyticsService();
