/**
 * Calculate GST based on total amount and rate
 * Handles both Inclusive and Exclusive tax-types
 */
export function calculateGST(amount: number, rate: number, isInclusive: boolean = true): {
    basePrice: number,
    gstAmount: number,
    total: number
} {
    if (isInclusive) {
        // Amount = Base + (Base * Rate / 100)
        // Amount = Base * (1 + Rate / 100)
        // Base = Amount / (1 + Rate / 100)
        const basePrice = amount / (1 + rate / 100);
        const gstAmount = amount - basePrice;
        return {
            basePrice: Number(basePrice.toFixed(2)),
            gstAmount: Number(gstAmount.toFixed(2)),
            total: Number(amount.toFixed(2))
        };
    } else {
        const gstAmount = (amount * rate) / 100;
        const total = amount + gstAmount;
        return {
            basePrice: Number(amount.toFixed(2)),
            gstAmount: Number(gstAmount.toFixed(2)),
            total: Number(total.toFixed(2))
        };
    }
}
