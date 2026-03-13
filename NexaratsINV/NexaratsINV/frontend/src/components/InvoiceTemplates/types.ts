import { CartItem } from '../../types';

export interface InvoiceTemplateProps {
    adminProfile: {
        businessName: string;
        address: string;
        phone: string;
        email: string;
        logo?: string;
        signature?: string;
    };
    activeTheme: { primary: string; accent: string };
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    txnInfo: {
        id: string;
        displayId?: string;
        date: string;
        methodLabel: string;
    } | null;
    cart: CartItem[];
    finalGST: number;
    cgst?: number;
    sgst?: number;
    grandTotal: number;
    calculatedGrandTotal: number;
    couponDiscount: number;
    isOnline: boolean;
    gstConfig: any;
    formatCurrency: (val: number) => string;
}
