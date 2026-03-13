import { useMemo } from 'react';
import { InvoiceThemes } from '../components/InvoiceTemplates/config';
import { CartItem } from '../types';

interface UseInvoiceDataProps {
    invoiceTheme: string;
    cart: CartItem[];
    finalGST: number;
    grandTotal: number;
    txnInfo: { methodLabel: string } | null;
}

export const useInvoiceData = ({
    invoiceTheme,
    cart,
    finalGST,
    grandTotal,
    txnInfo
}: UseInvoiceDataProps) => {
    const isOnline = useMemo(() => txnInfo?.methodLabel === 'Online', [txnInfo]);
    
    const activeTheme = useMemo(() => 
        InvoiceThemes[invoiceTheme] || InvoiceThemes.vy_classic, 
    [invoiceTheme]);

    const formatCurrency = (val: number) => {
        return val % 1 === 0 ? val.toLocaleString() : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    };

    const calculatedGrandTotal = useMemo(() => 
        cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), 
    [cart]);

    const displayCGST = finalGST / 2;
    const displaySGST = finalGST / 2;

    return {
        isOnline,
        activeTheme,
        formatCurrency,
        calculatedGrandTotal,
        displayCGST,
        displaySGST
    };
};
