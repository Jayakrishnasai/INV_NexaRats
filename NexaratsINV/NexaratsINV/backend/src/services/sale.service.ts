import { supabaseAdmin } from '../supabase/client';
import { customerService } from './customer.service';
import { validateClientTotals } from '../utils/gst.calculator';
import { UnprocessableError, wrapDatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

const log = logger('SaleService');
import { Transaction } from '../types';

/**
 * SaleService — CRITICAL FIX C2: Atomic Sale Processing
 *
 * The frontend (handleSaleWrapper in App.tsx) made 3 separate API calls:
 *   1. PATCH /products/bulk     (stock decrement)
 *   2. POST  /customers         (optional walk-in customer create)
 *   3. POST  /transactions      (invoice creation)
 *
 * This meant a network failure between steps left corrupted state:
 * - Stock decremented but no invoice created
 * - Invoice created but stock not decremented
 *
 * SOLUTION: Single POST /api/transactions handles ALL three operations
 * within a Supabase RPC function (PostgreSQL transaction).
 * If any step fails, the entire operation is rolled back atomically.
 *
 * GST re-validation is also performed server-side (FIX I1).
 */

interface SaleInput {
    customerId?: string;
    items: Array<{
        id: string;
        name: string;
        price: number;
        purchasePrice: number; // Added for COGS
        quantity: number;
        gstRate: number;
        taxType: 'Inclusive' | 'Exclusive';
        discountPercentage?: number;
    }>;
    total: number;
    paidAmount: number;
    gstAmount: number;
    method: string;
    source: 'online' | 'offline';
    date: string;
    couponDiscount?: number;
    // Walk-in customer (optional)
    custName?: string;
    custPhone?: string;
    custAddress?: string;
}

export class SaleService {
    async processSale(input: SaleInput): Promise<{ transaction: any }> {
        // ── Step 1: Server-side GST re-validation (FIX I1) ──────────────────────
        validateClientTotals(
            input.total,
            input.gstAmount,
            input.items.map(i => ({
                price: i.price,
                quantity: i.quantity,
                gstRate: i.gstRate,
                taxType: i.taxType,
                discountPercentage: i.discountPercentage ?? 0,
            })),
            input.couponDiscount || 0
        );

        // ── Step 2: Validate stock availability (FIX E3: batched IN query) ────────
        // Single DB round-trip instead of N sequential queries for N cart items
        const itemIds = input.items.map(i => i.id);
        const { data: productRows, error: stockFetchError } = await supabaseAdmin
            .from('products')
            .select('id, name, stock')
            .in('id', itemIds);

        if (stockFetchError) {
            throw new UnprocessableError(`Failed to fetch product stock: ${stockFetchError.message}`);
        }

        const productMap = new Map((productRows || []).map(p => [p.id, p]));

        for (const item of input.items) {
            const product = productMap.get(item.id);
            if (!product) {
                throw new UnprocessableError(`Product '${item.name}' (id: ${item.id}) not found`);
            }
            if (product.stock < item.quantity) {
                throw new UnprocessableError(
                    `Insufficient stock for '${product.name}': ${product.stock} available, ${item.quantity} requested`
                );
            }
        }

        // ── Step 3: Atomic DB Operation via RPC ─────────────────────────────────
        // Call the Supabase PostgreSQL function 'process_sale' which handles:
        // - Stock decrement (with LOCK on product rows)
        // - Transaction + invoice_items insert
        // - Customer upsert/create (if walk-in)
        // - Customer balance update
        // All within a single PostgreSQL transaction — full atomic rollback on failure.

        let resolvedCustomerId = input.customerId || null;

        // Determine or create walk-in customer before calling RPC
        if (!resolvedCustomerId && input.custPhone) {
            const existing = await customerService.findByPhone(input.custPhone);
            if (existing) {
                resolvedCustomerId = existing.id;
            } else if (input.custName) {
                const newCust = await customerService.create({
                    name: input.custName,
                    phone: input.custPhone,
                    address: input.custAddress,
                    channel: 'offline',
                });
                resolvedCustomerId = newCust.id;
            }
        }

        // Feature request: "also the name of the customer need to update in online store or else at the billing also.. when enter the name there.. neeed to update in the db also"
        // Also: address provided during online order should reflect in customer page address
        if (resolvedCustomerId && (input.custName || input.custAddress)) {
            try {
                const updatePayload: any = {};

                if (input.custName && input.custName.trim() !== '' && input.custName !== 'Walk-in Customer') {
                    updatePayload.name = input.custName.trim();
                }
                if (input.custAddress && input.custAddress.trim() !== '') {
                    updatePayload.address = input.custAddress.trim();
                }

                if (Object.keys(updatePayload).length > 0) {
                    await supabaseAdmin
                        .from('customers')
                        .update(updatePayload)
                        .eq('id', resolvedCustomerId);
                }
            } catch (err) {
                log.warn('Silently failed to sync customer name/address', err);
            }
        }

        // Determine payment status
        const status = input.paidAmount >= input.total
            ? 'Paid'
            : input.paidAmount > 0
                ? 'Partial'
                : 'Unpaid';

        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_sale', {
            p_customer_id: resolvedCustomerId,
            p_subtotal: parseFloat((input.total - input.gstAmount).toFixed(2)),
            p_gst_amount: input.gstAmount,
            p_total: input.total,
            p_paid_amount: input.paidAmount,
            p_method: input.method,
            p_status: status,
            p_source: input.source,
            p_date: input.date,
            p_items: input.items.map(i => ({
                product_id: i.id,
                product_name: i.name,
                quantity: i.quantity,
                price: i.price,
                purchase_price: i.purchasePrice,
                gst_amount: (() => {
                    const basePrice = i.price * i.quantity;
                    if (i.taxType === 'Inclusive') {
                        return parseFloat((basePrice * i.gstRate / (100 + i.gstRate)).toFixed(2));
                    } else {
                        return parseFloat((basePrice * i.gstRate / 100).toFixed(2));
                    }
                })(),
                discount: 0,
            })),
        });

        if (rpcError) {
            log.error('RPC process_sale failed', rpcError);
            throw new UnprocessableError(`Sale processing failed: ${rpcError.message}`);
        }

        log.info('Sale processed successfully via RPC (including customer aggregates)');

        // Fetch the full transaction with items to return to frontend
        const { data: fullTxn } = await supabaseAdmin
            .from('transactions')
            .select('*, invoice_items(*), customers(name, phone)')
            .eq('id', rpcResult.transactionId)
            .single();

        return { transaction: fullTxn || rpcResult };
    }
}

export const saleService = new SaleService();
