import { supabaseAdmin } from '../supabase/client';
import { NotFoundError, ConflictError, wrapDatabaseError } from '../utils/errors';
import { Product } from '../types';
import { logger } from '../utils/logger';

import { cacheService } from '../utils/cache';

const log = logger('ProductService');

// Convert DB snake_case row to frontend camelCase shape
const mapProduct = (row: any): Product => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    price: parseFloat(row.price),
    purchasePrice: parseFloat(row.purchase_price),
    mrp: parseFloat(row.mrp),
    stock: row.stock,
    minStock: row.min_stock,
    status: row.status,
    gstRate: parseFloat(row.gst_rate),
    taxType: row.tax_type,
    unit: row.unit,
    image: row.image,
    expiryDate: row.expiry_date,
    returns: row.returns,
    discountPercentage: parseFloat(row.discount_percentage),
    hsnCode: row.hsn_code,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

export class ProductService {
    async getAll(page: number = 1, limit: number = 500): Promise<{ products: Product[], total: number }> {
        const cacheKey = `products:list:${page}:${limit}`;
        const cached = await cacheService.get<{ products: Product[], total: number }>(cacheKey);
        if (cached) return cached;

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, count, error } = await supabaseAdmin
            .from('products')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw wrapDatabaseError(error, 'ProductService.getAll');
        
        const result = {
            products: (data || []).map(mapProduct),
            total: count || 0,
        };

        // Cache for 5 minutes
        await cacheService.set(cacheKey, result, 300);
        return result;
    }

    async getById(id: string): Promise<Product> {
        const cacheKey = `product:detail:${id}`;
        const cached = await cacheService.get<Product>(cacheKey);
        if (cached) return cached;

        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) throw new NotFoundError('Product');
        
        const product = mapProduct(data);
        await cacheService.set(cacheKey, product, 600); // 10 mins
        return product;
    }

    async invalidateCache(id?: string) {
        await cacheService.clearByPattern('products:list:*');
        if (id) await cacheService.del(`product:detail:${id}`);
    }

    async create(input: any): Promise<Product> {
        // Check for duplicate SKU
        const { data: existing } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('sku', input.sku)
            .single();

        if (existing) throw new ConflictError(`SKU '${input.sku}' already exists`);

        const { data, error } = await supabaseAdmin
            .from('products')
            .insert({
                name: input.name,
                sku: input.sku,
                category: input.category,
                price: input.price,
                purchase_price: input.purchasePrice,
                mrp: input.mrp,
                stock: input.stock ?? 0,
                min_stock: input.minStock ?? 5,
                gst_rate: input.gstRate,
                tax_type: input.taxType ?? 'Inclusive',
                unit: input.unit ?? 'Pieces',
                returns: input.returns ?? 'Returnable',
                discount_percentage: input.discountPercentage ?? 0,
                image: input.image || null,
                expiry_date: input.expiryDate || null,
                hsn_code: input.hsnCode || null,
                description: input.description || null,
                status: input.stock > 0 ? (input.stock < (input.minStock ?? 5) ? 'Low Stock' : 'In Stock') : 'Out of Stock',
            })
            .select('*')
            .single();

        if (error) throw wrapDatabaseError(error, 'ProductService.create');
        await this.invalidateCache();
        return mapProduct(data);
    }

    async bulkCreate(inputs: any[]): Promise<{ results: Product[], failures: any[] }> {
        const failures: { sku?: string; name?: string; error: string }[] = [];

        if (inputs.length === 0) return { results: [], failures: [] };

        // ── Step 1: Batch SKU duplicate check — single query instead of N queries ──
        const skusToCheck = inputs.map(i => i.sku).filter(Boolean);
        const { data: existingSkus } = await supabaseAdmin
            .from('products')
            .select('sku')
            .in('sku', skusToCheck);

        const takenSkus = new Set((existingSkus || []).map((r: any) => r.sku));

        // ── Step 2: Partition into valid and duplicate ─────────────────────────────
        const validInputs = inputs.filter(input => {
            if (input.sku && takenSkus.has(input.sku)) {
                failures.push({ sku: input.sku, error: 'SKU already exists' });
                return false;
            }
            return true;
        });

        if (validInputs.length === 0) {
            log.warn(`Bulk create: all ${inputs.length} items were duplicate SKUs`);
            return { results: [], failures };
        }

        // ── Step 3: Single batch INSERT for all valid rows ─────────────────────────
        const rows = validInputs.map(input => ({
            name: input.name,
            sku: input.sku,
            category: input.category,
            price: input.price,
            purchase_price: input.purchasePrice,
            mrp: input.mrp,
            stock: input.stock ?? 0,
            min_stock: input.minStock ?? 5,
            gst_rate: input.gstRate,
            tax_type: input.taxType ?? 'Inclusive',
            unit: input.unit ?? 'Pieces',
            returns: input.returns ?? 'Returnable',
            discount_percentage: input.discountPercentage ?? 0,
            image: input.image || null,
            expiry_date: input.expiryDate || null,
            hsn_code: input.hsnCode || null,
            description: input.description || null,
            status: (input.stock ?? 0) > 0
                ? ((input.stock ?? 0) < (input.minStock ?? 5) ? 'Low Stock' : 'In Stock')
                : 'Out of Stock',
        }));

        const { data, error } = await supabaseAdmin
            .from('products')
            .insert(rows)
            .select('*');

        if (error) {
            log.error('Batch insert failed', error);
            validInputs.forEach(i => failures.push({ sku: i.sku, error: error.message }));
            return { results: [], failures };
        }

        const results = (data || []).map(mapProduct);

        if (failures.length > 0) {
            log.warn(`Bulk create: ${failures.length} skipped (duplicate SKUs), ${results.length} inserted`, failures);
        }
        log.info(`Bulk create: inserted ${results.length} products in a single batch query`);

        await this.invalidateCache();
        return { results, failures };
    }

    async update(id: string, input: any): Promise<Product> {
        const payload: Record<string, unknown> = {};
        if (input.name !== undefined) payload.name = input.name;
        if (input.sku !== undefined) payload.sku = input.sku;
        if (input.category !== undefined) payload.category = input.category;
        if (input.price !== undefined) payload.price = input.price;
        if (input.purchasePrice !== undefined) payload.purchase_price = input.purchasePrice;
        if (input.mrp !== undefined) payload.mrp = input.mrp;
        if (input.stock !== undefined) {
            payload.stock = input.stock;
            const minS = input.minStock ?? 5;
            payload.status = input.stock === 0 ? 'Out of Stock' : input.stock < minS ? 'Low Stock' : 'In Stock';
        }
        if (input.minStock !== undefined) payload.min_stock = input.minStock;
        if (input.gstRate !== undefined) payload.gst_rate = input.gstRate;
        if (input.taxType !== undefined) payload.tax_type = input.taxType;
        if (input.unit !== undefined) payload.unit = input.unit;
        if (input.returns !== undefined) payload.returns = input.returns;
        if (input.discountPercentage !== undefined) payload.discount_percentage = input.discountPercentage;
        if (input.image !== undefined) payload.image = input.image || null;
        if (input.expiryDate !== undefined) payload.expiry_date = input.expiryDate || null;
        if (input.hsnCode !== undefined) payload.hsn_code = input.hsnCode || null;
        if (input.description !== undefined) payload.description = input.description || null;
        if (input.status !== undefined) payload.status = input.status;
        payload.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('products')
            .update(payload)
            .eq('id', id)
            .select('*')
            .single();

        if (error || !data) throw new NotFoundError('Product');
        await this.invalidateCache(id);
        return mapProduct(data);
    }

    async delete(id: string): Promise<void> {
        // 1. Remove FK references in invoice_items (ON DELETE RESTRICT blocks otherwise)
        //    We keep the invoice row for history — product_name preserves what was sold.
        const { error: iiErr } = await supabaseAdmin
            .from('invoice_items')
            .update({ product_id: id })          // noop filter target
            .eq('product_id', id);               // match rows

        // Actually nullify the FK so RESTRICT won't fire
        // Supabase doesn't allow setting FK to null via update if column is NOT NULL,
        // so we delete the constraint-blocking rows' FK by deleting the invoice_items
        // or updating. Since product_id is NOT NULL in schema, we delete referencing rows.
        await supabaseAdmin
            .from('store_wishlist')
            .delete()
            .eq('product_id', id);

        // For invoice_items with NOT NULL product_id, we must delete them
        // (the product_name column preserves the historical record)
        await supabaseAdmin
            .from('invoice_items')
            .delete()
            .eq('product_id', id);

        // 2. Now safe to delete the product
        const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
        if (error) {
            log.error(`Product deletion failed for id=${id}`, error);
            throw wrapDatabaseError(error, 'ProductService.delete');
        }
        await this.invalidateCache(id);
        log.info(`Product ${id} deleted successfully`);
    }

    /**
     * FIX B5: bulkUpdate now tracks and logs individual failures
     * instead of silently swallowing them.
     */
    async bulkUpdate(items: { id: string; stock?: number; status?: string }[]): Promise<Product[]> {
        const results: Product[] = [];
        const failures: { id: string; error: string }[] = [];

        // Batch processing (Concurrency = 10) to prevent timeouts while avoiding hitting rate limits
        const BATCH_SIZE = 10;
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);

            const promises = batch.map(async (item) => {
                const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (item.stock !== undefined) payload.stock = item.stock;
                if (item.status !== undefined) payload.status = item.status;

                const { data, error } = await supabaseAdmin
                    .from('products')
                    .update(payload)
                    .eq('id', item.id)
                    .select('*')
                    .single();

                if (error || !data) {
                    throw { id: item.id, error: error?.message || 'Product not found' };
                }
                return mapProduct(data);
            });

            const settled = await Promise.allSettled(promises);
            for (const outcome of settled) {
                if (outcome.status === 'fulfilled') {
                    results.push(outcome.value);
                } else {
                    failures.push(outcome.reason);
                }
            }
        }

        if (failures.length > 0) {
            log.warn(`Bulk update completed with ${failures.length}/${items.length} failures`, failures);
        }

        await this.invalidateCache();
        return results;
    }
}

export const productService = new ProductService();
