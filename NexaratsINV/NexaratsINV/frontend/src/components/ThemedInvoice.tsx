import React from 'react';
import RestaurantTemplate from './InvoiceTemplates/RestaurantTemplate';
import ClassicGSTTemplate from './InvoiceTemplates/ClassicGSTTemplate';
import StylishRetailTemplate from './InvoiceTemplates/StylishRetailTemplate';
import ElegantExecutiveTemplate from './InvoiceTemplates/ElegantExecutiveTemplate';
import LuxuryProTemplate from './InvoiceTemplates/LuxuryProTemplate';
import RobustBusinessTemplate from './InvoiceTemplates/RobustBusinessTemplate';
import ModernSlateTemplate from './InvoiceTemplates/ModernSlateTemplate';
import StandardA4Template from './InvoiceTemplates/StandardA4Template';
import ThermalTemplate from './InvoiceTemplates/ThermalTemplate';
import { InvoiceTemplateProps } from './InvoiceTemplates/types';
import { useInvoiceData } from '../hooks/useInvoiceData';

export interface ThemedInvoiceProps {
    invoiceTheme: string;
    adminProfile: {
        businessName: string;
        address: string;
        phone: string;
        email: string;
        logo?: string;
        signature?: string;
        avatar?: string;
    };
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    txnInfo: {
        id: string;
        displayId?: string;
        date: string;
        methodLabel: string;
    } | null;
    cart: any[];
    finalGST: number;
    grandTotal: number;
    couponDiscount?: number;
    calculatedGrandTotal?: number;
    paymentSource?: string;
}

const ThemedInvoice: React.FC<ThemedInvoiceProps> = (props) => {
    const {
        invoiceTheme,
        adminProfile,
        customerName,
        customerPhone,
        customerAddress,
        txnInfo,
        cart,
        finalGST,
        grandTotal,
        couponDiscount = 0
    } = props;

    const {
        isOnline,
        activeTheme,
        formatCurrency,
        calculatedGrandTotal,
        displayCGST,
        displaySGST
    } = useInvoiceData({
        invoiceTheme,
        cart,
        finalGST,
        grandTotal,
        txnInfo
    });

    const gstConfig = {
        gstNumber: (adminProfile as any).gstNumber || ""
    };

    const templateProps: InvoiceTemplateProps = {
        adminProfile,
        activeTheme,
        customerName,
        customerPhone,
        customerAddress,
        txnInfo,
        cart,
        finalGST,
        cgst: displayCGST,
        sgst: displaySGST,
        grandTotal,
        calculatedGrandTotal: props.calculatedGrandTotal || calculatedGrandTotal,
        couponDiscount,
        isOnline,
        gstConfig,
        formatCurrency
    };

    // ═══════════ TEMPLATE DISPATCHER ═══════════
    switch (invoiceTheme) {
        case 'vy_restaurant':
            return <RestaurantTemplate {...templateProps} />;
        case 'vy_classic':
            return <ClassicGSTTemplate {...templateProps} />;
        case 'vy_stylish':
            return <StylishRetailTemplate {...templateProps} />;
        case 'vy_elegant':
            return <ElegantExecutiveTemplate {...templateProps} />;
        case 'vy_pro':
            return <LuxuryProTemplate {...templateProps} />;
        case 'vy_business':
            return <RobustBusinessTemplate {...templateProps} />;
        case 'vy_minimal':
            return <ModernSlateTemplate {...templateProps} />;
        
        default:
            if (['classic_red', 'corporate_blue', 'teal_modern', 'navy_marine', 'minimal_blue', 'dark_executive'].includes(invoiceTheme)) {
                return <StandardA4Template {...templateProps} invoiceTheme={invoiceTheme} />;
            }
            if (invoiceTheme.startsWith('thermal_')) {
                return <ThermalTemplate {...templateProps} invoiceTheme={invoiceTheme} />;
            }
            return <ClassicGSTTemplate {...templateProps} />;
    }
};

export default ThemedInvoice;

