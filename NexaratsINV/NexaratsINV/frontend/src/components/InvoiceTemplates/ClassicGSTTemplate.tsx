import React from 'react';
import { MapPin, Smartphone, CheckCircle2 } from 'lucide-react';
import { InvoiceTemplateProps } from './types';

const ClassicGSTTemplate: React.FC<InvoiceTemplateProps> = ({
    adminProfile,
    activeTheme,
    customerName,
    customerPhone,
    customerAddress,
    txnInfo,
    cart,
    finalGST,
    cgst,
    sgst,
    grandTotal,
    calculatedGrandTotal,
    couponDiscount,
    isOnline,
    gstConfig,
    formatCurrency
}) => {
    return (
        <div className="p-10 lg:p-16 bg-white min-h-[1000px]">
            <div className="flex justify-between items-start mb-16">
                <div className="flex items-start gap-6">
                    <div className="flex items-center gap-6">
                        {adminProfile.logo ? (
                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-100 shadow-sm overflow-hidden">
                                <img src={adminProfile.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-lg" style={{ backgroundColor: activeTheme.primary }}>
                                {adminProfile.businessName?.charAt(0) || 'N'}
                            </div>
                        )}
                        <div>
                            <h1 className="text-5xl font-black italic tracking-tighter" style={{ color: activeTheme.primary }}>{adminProfile.businessName}</h1>
                            <div className="space-y-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                                <p className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {adminProfile.address}</p>
                                <p className="flex items-center gap-2"><Smartphone className="w-3 h-3" /> {adminProfile.phone}</p>
                                {gstConfig?.gstNumber && <p className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">GSTIN: {gstConfig.gstNumber}</p>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Original Tax Invoice</p>
                    <p className="text-4xl font-black" style={{ color: activeTheme.primary }}>₹{formatCurrency(grandTotal)}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-12 text-sm mb-16">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pb-1 border-b border-slate-100">Client Details</p>
                    <p className="text-lg font-black text-slate-900">{customerName || 'Walk-in Customer'}</p>
                    <p className="font-bold text-slate-500">Contact: {customerPhone || 'N/A'}</p>
                    {customerAddress && <p className="text-xs font-bold text-slate-500 mt-1 max-w-xs whitespace-pre-line">{customerAddress}</p>}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pb-1 border-b border-slate-100">Invoice Info</p>
                    <div className="space-y-1 font-bold">
                        <p className="flex justify-between"><span>Inv No:</span> <span>{txnInfo?.displayId || txnInfo?.id?.split('-')[0]}</span></p>
                        <p className="flex justify-between"><span>Date:</span> <span>{txnInfo?.date}</span></p>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pb-1 border-b border-slate-100">Payment</p>
                    <div className="flex items-center gap-2 pt-1 font-black text-green-600 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {isOnline ? 'Paid Online' : `Paid - ${txnInfo?.methodLabel}`}
                    </div>
                </div>
            </div>

            <div className="border-2 border-slate-100 rounded-[32px] overflow-hidden mb-12">
                <table className="w-full text-left">
                    <thead className="text-white uppercase font-black tracking-widest" style={{ backgroundColor: activeTheme.primary }}>
                        <tr>
                            <th className="px-6 py-4">S.No</th>
                            <th className="px-6 py-4">Item & HSN</th>
                            <th className="px-6 py-4 text-center">Qty</th>
                            <th className="px-6 py-4 text-right">Rate</th>
                            <th className="px-6 py-4 text-right">Tax</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {cart.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-6 py-4">
                                    <p className="font-black text-slate-900">{item.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">HSN: {item.hsnCode || '8471'}</p>
                                </td>
                                <td className="px-6 py-4 text-center font-black">{item.quantity} {item.unit}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-500">₹{formatCurrency(item.price)}</td>
                                <td className="px-6 py-4 text-right font-black text-slate-700">{item.gstRate}%</td>
                                <td className="px-6 py-4 text-right font-black text-slate-900">₹{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-8">
                <div className="w-80 space-y-3 p-6 bg-slate-50 rounded-[40px] border border-slate-100">
                    <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                        <span>Subtotal</span> <span className="text-slate-900">₹{formatCurrency(calculatedGrandTotal - finalGST)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">
                        <span>CGST</span> <span className="text-slate-900">₹{formatCurrency(cgst || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">
                        <span>SGST</span> <span className="text-slate-900">₹{formatCurrency(sgst || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-2 pb-1">
                        <span>Total Tax</span> <span className="text-slate-900">₹{formatCurrency(finalGST)}</span>
                    </div>
                    {couponDiscount > 0 && <div className="flex justify-between text-xs font-black text-green-600 uppercase tracking-widest">
                        <span>Discount</span> <span>- ₹{formatCurrency(couponDiscount)}</span>
                    </div>}
                    <div className="flex justify-between items-center border-t border-slate-200 pt-4 mt-2">
                        <span className="text-sm font-black text-slate-900 uppercase">Total Bill</span>
                        <span className="text-3xl font-black" style={{ color: activeTheme.primary }}>₹{formatCurrency(grandTotal)}</span>
                    </div>
                    {adminProfile.signature && (
                        <div className="pt-8 text-right pr-4">
                            {adminProfile.signature.startsWith('data:image') ? (
                                <div className="h-16 flex justify-end items-center mb-2">
                                    <img src={adminProfile.signature} alt="Signature" className="h-16 w-auto object-contain" />
                                </div>
                            ) : (
                                <p className="text-2xl font-signature font-black text-slate-800 mb-2">{adminProfile.signature}</p>
                            )}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 border-t border-slate-200 inline-block pt-2">Authorized Signature</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassicGSTTemplate;
