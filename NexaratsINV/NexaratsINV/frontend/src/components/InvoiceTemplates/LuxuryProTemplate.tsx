import React from 'react';
import { InvoiceTemplateProps } from './types';

const LuxuryProTemplate: React.FC<InvoiceTemplateProps> = ({
    adminProfile,
    activeTheme,
    txnInfo,
    cart,
    finalGST,
    calculatedGrandTotal,
    grandTotal,
    gstConfig,
    formatCurrency
}) => {
    return (
        <div className="bg-[#111827] text-white p-10 lg:p-16 min-h-[1000px]">
            <div className="flex justify-between items-start mb-24">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.6em]">Premium Member Invoice</p>
                    <h1 className="text-6xl font-black uppercase tracking-tighter text-white">{adminProfile.businessName}</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-sm">{adminProfile.address}</p>
                </div>
                <div className="flex flex-col items-end">
                    {adminProfile.logo ? (
                        <div className="w-24 h-24 rounded-full border-4 border-amber-500 overflow-hidden bg-white flex items-center justify-center shadow-xl shadow-amber-500/20">
                            <img src={adminProfile.logo} alt="Logo" className="w-full h-full object-contain p-3" />
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-amber-500 flex items-center justify-center text-amber-500 text-4xl font-black italic">V</div>
                    )}
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-4">Authorized Pro Partner</p>
                    {gstConfig?.gstNumber && <p className="text-[10px] font-black text-white/40 mt-2 uppercase">GSTIN: {gstConfig.gstNumber}</p>}
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-[40px] p-10 border border-white/10 mb-16">
                <div className="grid grid-cols-4 gap-10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-white/50">Receipt Number</p>
                        <p className="text-2xl font-black tracking-tighter uppercase text-white">#VPRO-{txnInfo?.displayId || txnInfo?.id?.split('-')[0]}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-white/50">Issue Date</p>
                        <p className="text-2xl font-black tracking-tighter uppercase text-white">{txnInfo?.date?.split('|')[0] || txnInfo?.date}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-white/50">Total Payable</p>
                        <p className="text-2xl font-black tracking-tighter uppercase text-amber-500">₹{formatCurrency(grandTotal)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-white/50">Member Since</p>
                        <p className="text-2xl font-black tracking-tighter uppercase text-white">FEB 2024</p>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden border border-white/10 rounded-[32px] mb-20 bg-white/5">
                <table className="w-full text-left">
                    <thead className="bg-white/10 text-[10px] font-black uppercase tracking-widest text-amber-500">
                        <tr>
                            <th className="px-10 py-6">Lux Item Details</th>
                            <th className="px-10 py-6 text-center">Qty</th>
                            <th className="px-10 py-6 text-right">Unit Price</th>
                            <th className="px-10 py-6 text-right">Line Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {cart.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-10 py-8">
                                    <p className="text-xl font-black tracking-tight mb-1">{item.name}</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-white/40">Premium Selection | HSN: {item.hsnCode}</p>
                                </td>
                                <td className="px-10 py-8 text-center font-black text-2xl tracking-tighter">{item.quantity}</td>
                                <td className="px-10 py-8 text-right font-bold text-slate-400">₹{formatCurrency(item.price)}</td>
                                <td className="px-10 py-8 text-right font-black text-amber-500 text-2xl">₹{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-start">
                <div className="max-w-md">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Terms of luxury</p>
                    <p className="text-xs font-bold text-white/50 leading-relaxed uppercase italic">This is a premium transaction document. All luxury products are subject to exclusive terms and branding guidelines.</p>
                </div>
                <div className="text-right space-y-6">
                    <div className="space-y-4 pb-10 border-b border-white/10">
                        <div className="flex justify-end gap-10 text-[10px] font-black text-white/50 uppercase tracking-widest"><span>Tax Component</span><span>₹{formatCurrency(finalGST)}</span></div>
                        <div className="flex justify-end gap-10 text-[10px] font-black text-white/50 uppercase tracking-widest"><span>Base Component</span><span>₹{formatCurrency(calculatedGrandTotal - finalGST)}</span></div>
                    </div>
                    <div className="pt-6 flex flex-col items-end">
                        {adminProfile.signature && (
                            <div className="mb-6 h-20 flex items-center justify-end overflow-hidden">
                                {adminProfile.signature.startsWith('data:image') ? (
                                    <img src={adminProfile.signature} alt="Signature" className="h-full w-auto object-contain brightness-0 invert" />
                                ) : (
                                    <span className="text-3xl font-signature font-black text-amber-500">{adminProfile.signature}</span>
                                )}
                            </div>
                        )}
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Net Payable Amount</p>
                        <h1 className="text-8xl font-black tracking-tighter text-white">₹{formatCurrency(grandTotal)}</h1>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LuxuryProTemplate;
