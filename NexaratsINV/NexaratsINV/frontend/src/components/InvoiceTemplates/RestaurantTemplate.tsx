import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { InvoiceTemplateProps } from './types';

const RestaurantTemplate: React.FC<InvoiceTemplateProps> = ({
    adminProfile,
    activeTheme,
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
        <div className="p-10 lg:p-16 bg-white min-h-[1000px] font-sans">
            <div className="flex justify-between items-start mb-16">
                <div>
                    <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border-2 border-slate-100 shadow-sm overflow-hidden text-center">
                        {adminProfile.logo ? (
                            <img src={adminProfile.logo} alt="Business Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <h1 className="text-4xl font-black italic" style={{ color: activeTheme.primary }}>{adminProfile.businessName?.charAt(0) || 'M'}</h1>
                        )}
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">{adminProfile.businessName}</h1>
                    <div className="mt-4 space-y-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <p>{adminProfile.address}</p>
                        <p>Phone: {adminProfile.phone}</p>
                        <p>{adminProfile.email}</p>
                        {gstConfig?.gstNumber && <p className="mt-2 pt-2 border-t border-slate-100/50">GSTIN: {gstConfig.gstNumber}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-6xl font-black tracking-tighter text-slate-200 mb-8">INVOICE</h1>
                    <div className="space-y-2 text-sm font-black text-slate-900">
                        <p className="flex justify-end gap-10"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Invoice Number</span> <span>#{txnInfo?.displayId || txnInfo?.id?.split('-')[0]}</span></p>
                        <p className="flex justify-end gap-10"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Invoice Date</span> <span>{txnInfo?.date?.split('|')[0] || txnInfo?.date}</span></p>
                        <p className="flex justify-end gap-10"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Payment Method</span> <span className="text-orange-600">{isOnline ? 'ONLINE' : txnInfo?.methodLabel.toUpperCase()}</span></p>
                    </div>
                </div>
            </div>

            <div className="mb-16">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2 inline-block">Bill To</p>
                <h3 className="text-2xl font-black text-slate-900">{customerName || 'Valued Customer'}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{customerPhone}</p>
                {customerAddress && <p className="text-xs font-bold text-slate-500 mt-1 max-w-sm whitespace-pre-line">{customerAddress}</p>}
            </div>

            <div className="mb-12">
                <table className="w-full text-left">
                    <thead className="border-b-4 border-slate-900">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="py-4">#</th>
                            <th className="py-4">Description</th>
                            <th className="py-4 text-center">Qty / Unit</th>
                            <th className="py-4 text-right">Unit Price</th>
                            <th className="py-4 text-right">Line Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {cart.map((item, idx) => (
                            <tr key={idx} className="group">
                                <td className="py-6 text-slate-400 font-bold">{idx + 1}</td>
                                <td className="py-6">
                                    <p className="font-black text-slate-900 text-lg">{item.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">HSN: {item.hsnCode || '8471'}</p>
                                </td>
                                <td className="py-6 text-center font-black">{item.quantity} {item.unit}</td>
                                <td className="py-6 text-right font-bold text-slate-500">₹{formatCurrency(item.price)}</td>
                                <td className="py-6 text-right font-black text-slate-900 text-lg">₹{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end">
                <div className="w-80 space-y-4">
                    <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span className="text-slate-900">₹{formatCurrency(calculatedGrandTotal - finalGST)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                        <span>Total GST</span>
                        <span className="text-slate-900">₹{formatCurrency(finalGST)}</span>
                    </div>
                    {couponDiscount > 0 && (
                        <div className="flex justify-between text-xs font-black text-green-600 uppercase tracking-widest">
                            <span>Discount</span>
                            <span>- ₹{formatCurrency(couponDiscount)}</span>
                        </div>
                    )}
                    <div className="pt-6 border-t-4 border-slate-900 flex justify-between items-center">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Amount Due</span>
                        <span className="text-4xl font-black" style={{ color: activeTheme.primary }}>₹{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="pt-4 flex items-center gap-2 justify-end font-black text-green-600 uppercase text-[10px] tracking-widest">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {isOnline ? 'Paid in Full (Online)' : `Paid - ${txnInfo?.methodLabel}`}
                    </div>
                </div>
            </div>

            <div className="mt-32 pt-16 border-t border-slate-100 flex items-end justify-between">
                <div className="space-y-4">
                    <div className="w-48 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                        {adminProfile.signature ? (
                            adminProfile.signature.startsWith('data:image') ? (
                                <img src={adminProfile.signature} alt="Signature" className="max-h-full max-w-full object-contain p-2" />
                            ) : (
                                <span className="text-2xl font-signature font-black text-slate-800">{adminProfile.signature}</span>
                            )
                        ) : null}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Signature</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black italic mb-2" style={{ color: activeTheme.primary }}>{adminProfile.businessName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em]">Hospitality Standard Bill</p>
                </div>
            </div>
        </div>
    );
};

export default RestaurantTemplate;
