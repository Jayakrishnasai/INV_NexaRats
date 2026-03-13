import { describe, it, expect } from 'vitest';
import { calculateGST } from '../utils/tax';

describe('GST Calculation Engine', () => {
    it('calculates inclusive GST correctly for ₹100 @ 18%', () => {
        const result = calculateGST(100, 18, true);
        // Base = 100 / 1.18 = 84.745...
        expect(result.basePrice).toBe(84.75);
        expect(result.gstAmount).toBe(15.25);
        expect(result.total).toBe(100);
    });

    it('calculates exclusive GST correctly for ₹100 @ 18%', () => {
        const result = calculateGST(100, 18, false);
        expect(result.basePrice).toBe(100);
        expect(result.gstAmount).toBe(18);
        expect(result.total).toBe(118);
    });

    it('handles zero tax rate', () => {
        const result = calculateGST(100, 0, true);
        expect(result.basePrice).toBe(100);
        expect(result.gstAmount).toBe(0);
        expect(result.total).toBe(100);
    });
});
