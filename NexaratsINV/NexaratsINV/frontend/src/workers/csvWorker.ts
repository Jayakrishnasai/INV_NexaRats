/**
 * CSV Import Web Worker
 * Runs CSV parsing off the main thread to prevent UI freeze on large files.
 * Receives: { text: string }
 * Posts back: { products: Product[] } or { error: string }
 */

const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        else if (line[i] === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else current += line[i];
    }
    result.push(current.trim());
    return result;
};

const FIELD_MAP: Record<string, string> = {
    'name': 'name',
    'category': 'category',
    'sku': 'sku',
    'hsncode': 'hsnCode',
    'mrp': 'mrp',
    'sellingprice': 'price',
    'purchaseprice': 'purchasePrice',
    'gstrate': 'gstRate',
    'taxtype': 'taxType',
    'stock': 'stock',
    'minstock': 'minStock',
    'unit': 'unit',
    'expirydate': 'expiryDate',
    'returns': 'returns',
    'imageurl': 'image',
};

const NUMERIC_FIELDS = new Set(['price', 'purchasePrice', 'stock', 'mrp', 'gstRate', 'minStock']);

self.onmessage = (e: MessageEvent<{ text: string }>) => {
    try {
        const { text } = e.data;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
            self.postMessage({ error: 'File must have a header row and at least one data row.' });
            return;
        }

        const headers = parseCSVLine(lines[0]);
        const products: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const p: any = {};

            headers.forEach((h, idx) => {
                const key = h.toLowerCase().replace(/[\s_]/g, '');
                const targetKey = FIELD_MAP[key] || key;
                let val: any = values[idx] || '';

                // Basic XSS sanitization
                if (typeof val === 'string') val = val.replace(/<[^>]*>?/gm, '');

                if (NUMERIC_FIELDS.has(targetKey)) {
                    val = parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
                }
                p[targetKey] = val;
            });

            const sVal = parseInt(p.stock) || 0;
            const msVal = parseInt(p.minStock) || 10;

            products.push({
                ...p,
                id: `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-${i}`,
                status: sVal === 0 ? 'Out of Stock' : sVal <= msVal ? 'Low Stock' : 'In Stock',
                discountPercentage: p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
                profit: p.price - p.purchasePrice,
            });
        }

        self.postMessage({ products });
    } catch (err: any) {
        self.postMessage({ error: err?.message || 'CSV parse failed' });
    }
};
