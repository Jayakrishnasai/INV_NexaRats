import { UnprocessableError } from './errors';

/**
 * Server-side GST re-validation.
 * FIX I1: All financial figures submitted by client are re-computed server-side.
 * A tolerance of ₹0.01 handles floating-point rounding differences.
 */

interface CartItem {
    price: number;
    quantity: number;
    gstRate: number;
    taxType: 'Inclusive' | 'Exclusive';
    discountPercentage?: number;
}

interface GstResult {
    subtotal: number;
    gstAmount: number;
    total: number;
}

export const computeGst = (items: CartItem[]): GstResult => {
    let subtotal = 0;
    let gstAmount = 0;

    for (const item of items) {
        // NOTE: item.price is already the final selling price (with product discount applied).
        // Therefore, we DO NOT re-apply discountPercentage.
        const basePrice = item.price * item.quantity;

        if (item.taxType === 'Inclusive') {
            // Extract GST from price
            const gstFraction = item.gstRate / (100 + item.gstRate);
            const itemGst = basePrice * gstFraction;
            const itemSubtotal = basePrice - itemGst;
            subtotal += itemSubtotal;
            gstAmount += itemGst;
        } else {
            // Add GST on top
            const itemGst = (basePrice * item.gstRate) / 100;
            subtotal += basePrice;
            gstAmount += itemGst;
        }
    }

    return {
        subtotal: round2(subtotal),
        gstAmount: round2(gstAmount),
        total: round2(subtotal + gstAmount),
    };
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const TOLERANCE = 0.02; // ₹2 tolerance for rounding differences

export const validateClientTotals = (
    clientTotal: number,
    clientGst: number,
    items: CartItem[],
    couponDiscount: number = 0
): void => {
    const server = computeGst(items);
    const expectedTotal = round2(server.total - couponDiscount);
    if (Math.abs(clientTotal - expectedTotal) > TOLERANCE) {
        throw new UnprocessableError(
            `Total mismatch: client sent ₹${clientTotal}, server computed ₹${server.total} (discount ₹${couponDiscount}). Potential tampering.`
        );
    }
    if (Math.abs(clientGst - server.gstAmount) > TOLERANCE) {
        throw new UnprocessableError(
            `GST mismatch: client sent ₹${clientGst}, server computed ₹${server.gstAmount}.`
        );
    }
};
