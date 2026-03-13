import React from 'react';
import { InvoiceTemplateProps } from './types';

interface ThermalTemplateProps extends InvoiceTemplateProps {
    invoiceTheme: string;
}

const ThermalTemplate: React.FC<ThermalTemplateProps> = ({
    invoiceTheme,
    adminProfile,
    customerName,
    customerPhone,
    customerAddress,
    txnInfo,
    cart,
    finalGST,
    grandTotal,
    calculatedGrandTotal,
    couponDiscount,
    isOnline,
    gstConfig,
    formatCurrency
}) => {
    return (
        <div className={`max-w-sm mx-auto p-6 bg-white ${invoiceTheme === 'thermal_bold' ? 'font-mono' : 'font-sans'}`}>
            {/* Shop Header */}
            <div className="text-center mb-4">
                {adminProfile.logo ? (
                    <img src={adminProfile.logo} alt="Logo" className="w-12 h-12 mx-auto mb-2 object-contain" />
                ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 font-black text-slate-400 text-lg uppercase">
                        {adminProfile.businessName?.charAt(0) || 'S'}
                    </div>
                )}
                <h1 className={`font-black uppercase ${invoiceTheme === 'thermal_bold' ? 'text-2xl' : 'text-xl'}`}>{adminProfile.businessName}</h1>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold leading-tight">{adminProfile.address}</p>
                <p className="text-[10px] text-slate-500 font-bold">Ph: {adminProfile.phone}</p>
                {gstConfig?.gstNumber && <p className="text-[10px] font-black mt-1 text-slate-700">GSTIN: {gstConfig.gstNumber}</p>}
            </div>

            <div className={`border-t ${invoiceTheme === 'thermal_modern' ? 'border-slate-200' : 'border-dashed border-slate-300'} my-3`} />

            {/* Bill Info */}
            <div className="flex justify-between text-xs mb-1">
                <span>Bill: {txnInfo?.displayId || txnInfo?.id}</span>
                <span>{txnInfo?.date}</span>
            </div>
            {customerName && <p className="text-xs text-left mb-1">Customer: {customerName}</p>}
            {customerPhone && <p className="text-xs text-left text-slate-500 mb-1">Ph: {customerPhone}</p>}
            {customerAddress && <p className="text-xs text-left text-slate-500 mb-1 leading-tight whitespace-pre-line max-w-[250px]">{customerAddress}</p>}

            <div className={`border-t ${invoiceTheme === 'thermal_modern' ? 'border-slate-200' : 'border-dashed border-slate-300'} my-3`} />

            {/* Items Header */}
            {invoiceTheme !== 'thermal_compact' && (
                <div className="flex justify-between text-xs font-black uppercase mb-2">
                    <span>Item</span><span>Qty × Price = Amt</span>
                </div>
            )}

            {/* Items */}
            <div className="space-y-2">
                {cart.map((item, idx) => (
                    <div key={idx} className={invoiceTheme === 'thermal_bold' ? 'mb-2' : ''}>
                        <p className={`font-black text-sm ${invoiceTheme === 'thermal_compact' ? 'text-xs' : ''}`}>{item.name}</p>
                        <div className="flex justify-between text-xs text-slate-600">
                            <span>{item.quantity} × ₹{formatCurrency(item.price)}</span>
                            <span className="font-black text-slate-900">₹{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={`border-t ${invoiceTheme === 'thermal_modern' ? 'border-slate-200' : 'border-dashed border-slate-300'} my-3`} />

            {/* Totals */}
            <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Subtotal:</span><span>₹{formatCurrency(calculatedGrandTotal - finalGST)}</span></div>
                <div className="flex justify-between"><span>Tax (GST):</span><span>₹{formatCurrency(finalGST)}</span></div>
                {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount:</span><span>- ₹{formatCurrency(couponDiscount)}</span></div>}
            </div>

            <div className={`border-t ${invoiceTheme === 'thermal_bold' ? 'border-double border-slate-400 border-t-4' : 'border-dashed border-slate-300'} my-3`} />

            {/* Grand Total */}
            {invoiceTheme === 'thermal_modern' ? (
                <div className="bg-slate-800 text-white rounded-lg py-3 px-4 flex justify-between font-black text-lg">
                    <span>TOTAL</span><span>₹{formatCurrency(grandTotal)}</span>
                </div>
            ) : invoiceTheme === 'thermal_compact' ? (
                <div className="bg-slate-900 text-white rounded px-3 py-2 flex justify-between font-black text-sm">
                    <span>PAY</span><span>₹{formatCurrency(grandTotal)}</span>
                </div>
            ) : (
                <div className={`flex justify-between font-black ${invoiceTheme === 'thermal_bold' ? 'text-xl' : 'text-lg'}`}>
                    <span>TOTAL</span><span>₹{formatCurrency(grandTotal)}</span>
                </div>
            )}

            <div className={`border-t ${invoiceTheme === 'thermal_modern' ? 'border-slate-200' : 'border-dashed border-slate-300'} my-3`} />

            {/* Footer */}
            <div className="text-center">
                <p className="text-xs text-slate-500 font-bold">
                    {isOnline ? 'Paid Online' : `Paid via ${txnInfo?.methodLabel || 'Cash'}`}
                </p>
                <p className={`text-xs text-slate-400 mt-2 ${invoiceTheme === 'thermal_bold' ? 'font-black uppercase' : ''}`}>
                    {invoiceTheme === 'thermal_bold' ? '*** Thank You! Visit Again! ***' : 'Thank you! Visit again!'}
                </p>
            </div>
        </div>
    );
};

export default ThermalTemplate;
