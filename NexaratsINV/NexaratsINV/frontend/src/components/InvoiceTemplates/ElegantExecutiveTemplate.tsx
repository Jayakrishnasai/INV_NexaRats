import React from 'react';
import { InvoiceTemplateProps } from './types';

const ElegantExecutiveTemplate: React.FC<InvoiceTemplateProps> = ({
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
    gstConfig,
    formatCurrency
}) => {
    return (
        <div className="p-10 lg:p-16 border-t-[20px] shadow-sm min-h-[1000px]" style={{ borderColor: activeTheme.primary }}>
            <div className="flex justify-between items-center mb-20">
                <div className="flex items-center gap-8">
                    {adminProfile.logo ? (
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden flex items-center justify-center bg-white">
                            <img src={adminProfile.logo} alt="Logo" className="w-full h-full object-contain p-3" />
                        </div>
                    ) : null}
                    <div>
                        <h1 className="text-5xl font-serif text-slate-900 leading-none">{adminProfile.businessName}</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-4 tracking-[0.5em]">{adminProfile.address}</p>
                        {gstConfig?.gstNumber && <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2 border-t pt-2">GSTIN: {gstConfig.gstNumber}</p>}
                    </div>
                </div>
                <div className="text-right border-l-4 pl-10 h-32 flex flex-col justify-center" style={{ borderColor: activeTheme.primary }}>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Outstanding</p>
                    <p className="text-5xl font-black" style={{ color: activeTheme.primary }}>₹{formatCurrency(grandTotal)}</p>
                </div>
            </div>

            <div className="flex gap-20 mb-20">
                <div className="w-1/3">
                    <p className="text-[10px] font-black text-slate-400 uppercase border-b-2 pb-2 mb-6" style={{ borderColor: activeTheme.primary }}>Ship To</p>
                    <div className="space-y-2">
                        <p className="text-2xl font-black text-slate-900">{customerName}</p>
                        <p className="text-sm font-bold text-slate-500">{customerPhone}</p>
                        {customerAddress && <p className="text-xs font-bold text-slate-500 max-w-xs whitespace-pre-line">{customerAddress}</p>}
                    </div>
                </div>
                <div className="w-1/3">
                    <p className="text-[10px] font-black text-slate-400 uppercase border-b-2 pb-2 mb-6" style={{ borderColor: activeTheme.primary }}>Information</p>
                    <div className="grid grid-cols-2 gap-y-4 text-xs font-black uppercase text-slate-400">
                        <span>Inv ID:</span> <span className="text-slate-900">#E-{txnInfo?.displayId || txnInfo?.id?.split('-')[0]}</span>
                        <span>Created:</span> <span className="text-slate-900">{txnInfo?.date?.split('|')[0] || txnInfo?.date}</span>
                        <span>Method:</span> <span className="text-slate-900">{txnInfo?.methodLabel}</span>
                    </div>
                </div>
            </div>

            <div className="mb-20">
                <table className="w-full">
                    <thead className="border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-400">
                        <tr>
                            <th className="py-4 text-left">Description</th>
                            <th className="py-4 text-center">Unit</th>
                            <th className="py-4 text-center">Qty</th>
                            <th className="py-4 text-right">Price</th>
                            <th className="py-4 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {cart.map((item, idx) => (
                            <tr key={idx}>
                                <td className="py-6">
                                    <p className="font-black text-slate-900 text-lg uppercase">{item.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-1 uppercase">Tax: {item.gstRate}% {item.taxType}</p>
                                </td>
                                <td className="py-6 text-center font-bold text-slate-500 uppercase">{item.unit}</td>
                                <td className="py-6 text-center font-black">x{item.quantity}</td>
                                <td className="py-6 text-right font-bold text-slate-500">₹{formatCurrency(item.price)}</td>
                                <td className="py-6 text-right font-black text-slate-900 text-lg">₹{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 gap-20">
                <div className="flex items-end gap-10">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Office Use Only</p>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-${txnInfo?.displayId || txnInfo?.id}`} alt="QR" className="w-32 h-32 border-2 p-2 rounded-xl" />
                    </div>
                    <div className="flex-1 pb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Authorized Signatory</p>
                        <div className="h-20 border-b-2 border-slate-100 flex items-center justify-start overflow-hidden">
                             {adminProfile.signature ? (
                                adminProfile.signature.startsWith('data:image') ? (
                                    <img src={adminProfile.signature} alt="Signature" className="h-full w-auto object-contain" />
                                ) : (
                                    <span className="text-3xl font-signature font-black text-slate-800">{adminProfile.signature}</span>
                                )
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="space-y-4 bg-slate-50 p-10 rounded-br-[60px]">
                    <div className="flex justify-between font-black text-xs uppercase text-slate-400"><span>Net Amount</span><span>₹{formatCurrency(calculatedGrandTotal - finalGST)}</span></div>
                    <div className="flex justify-between font-black text-xs uppercase text-slate-400"><span>GST Contribution</span><span>₹{formatCurrency(finalGST)}</span></div>
                    <div className="flex justify-between font-black text-3xl uppercase text-slate-900 pt-6 border-t-2 border-dashed border-slate-200"><span>Grand Total</span><span>₹{formatCurrency(grandTotal)}</span></div>
                </div>
            </div>
        </div>
    );
};

export default ElegantExecutiveTemplate;
