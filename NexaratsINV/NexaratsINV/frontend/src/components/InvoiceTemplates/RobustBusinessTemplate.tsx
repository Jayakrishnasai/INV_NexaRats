import React from 'react';
import { MapPin, Smartphone, Mail } from 'lucide-react';
import { InvoiceTemplateProps } from './types';

const RobustBusinessTemplate: React.FC<InvoiceTemplateProps> = ({
    adminProfile,
    activeTheme,
    customerName,
    customerPhone,
    customerAddress,
    txnInfo,
    cart,
    grandTotal,
    gstConfig,
    formatCurrency
}) => {
    return (
        <div className="bg-white p-4 border min-h-[1000px]" style={{ border: `2px solid ${activeTheme.primary}` }}>
            <div className="flex border-b-2 mb-10" style={{ borderColor: activeTheme.primary }}>
                <div className="w-1/2 p-6 bg-slate-50 border-r-2 flex gap-4 items-start" style={{ borderColor: activeTheme.primary }}>
                    {adminProfile.logo && (
                        <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center p-2 shrink-0">
                            <img src={adminProfile.logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase" style={{ color: activeTheme.primary }}>{adminProfile.businessName}</h1>
                        <div className="mt-4 text-[10px] font-black text-slate-500 uppercase space-y-1">
                            <p className="flex items-center gap-2"><MapPin className="w-3 h-3 text-slate-400" /> {adminProfile.address}</p>
                            <p className="flex items-center gap-2"><Smartphone className="w-3 h-3 text-slate-400" /> {adminProfile.phone}</p>
                            <p className="flex items-center gap-2"><Mail className="w-3 h-3 text-slate-400" /> {adminProfile.email}</p>
                            {gstConfig?.gstNumber && <p className="font-bold text-slate-900 mt-2">GSTIN: {gstConfig.gstNumber}</p>}
                        </div>
                    </div>
                </div>
                <div className="w-1/2 p-6 flex flex-col justify-center items-end bg-slate-900 text-white">
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter border-b-4 border-emerald-500 mb-2">INVOICE</h1>
                    <p className="text-xs font-black tracking-[0.5em] text-emerald-400 opacity-80 uppercase">Commercial Document</p>
                </div>
            </div>

            <div className="flex mb-10 gap-x-1 border-b-2" style={{ borderColor: activeTheme.primary }}>
                <div className="w-1/2 p-8 space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Billing Entity</p>
                    <h3 className="text-2xl font-black uppercase text-slate-900 leading-none">{customerName || 'General Client'}</h3>
                    <div className="text-[10px] font-black text-slate-400 space-y-1 uppercase">
                        <p>State Code: 07-Delhi</p>
                        <p>Contact: +91 {customerPhone}</p>
                        {customerAddress && <p className="max-w-xs whitespace-pre-line">{customerAddress}</p>}
                    </div>
                </div>
                <div className="w-1/2 grid grid-cols-2 bg-slate-50">
                    <div className="p-8 border-r-2 border-slate-100 flex flex-col justify-center items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2 leading-none">Voucher No</p>
                        <p className="text-xl font-black text-slate-900">{txnInfo?.displayId || txnInfo?.id?.split('-')[0]}</p>
                    </div>
                    <div className="p-8 flex flex-col justify-center items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2 leading-none">Billing Date</p>
                        <p className="text-xl font-black text-slate-900">{txnInfo?.date?.split('|')[0] || txnInfo?.date}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl overflow-hidden border-2 mb-10" style={{ borderColor: activeTheme.primary }}>
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-5 border-r border-white/20">Product & Specifications</th>
                            <th className="px-6 py-5 text-center border-r border-white/20">HSN</th>
                            <th className="px-6 py-5 text-center border-r border-white/20">Qty</th>
                            <th className="px-6 py-5 text-right border-r border-white/20">Price/U</th>
                            <th className="px-6 py-5 text-right">Taxable Val</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 border-t-2" style={{ borderColor: activeTheme.primary }}>
                        {cart.map((item, idx) => (
                            <tr key={idx} className="text-xs font-black uppercase text-slate-700">
                                <td className="px-6 py-5 font-black text-slate-900">{item.name}</td>
                                <td className="px-6 py-5 text-center text-slate-400">{item.hsnCode || '8471'}</td>
                                <td className="px-6 py-5 text-center">{item.quantity}</td>
                                <td className="px-6 py-5 text-right">₹{formatCurrency(item.price)}</td>
                                <td className="px-6 py-5 text-right text-slate-900 font-extrabold text-sm">₹{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-x-6 h-48 border-t-2 pt-10" style={{ borderColor: activeTheme.primary }}>
                <div className="flex-1 p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-between">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b-2 pb-1" style={{ borderColor: activeTheme.primary }}>Authorized By</p>
                        <p className="text-xs font-black text-slate-900">{adminProfile.businessName}</p>
                    </div>
                    <div className="w-32 h-24 bg-white border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden p-2">
                        {adminProfile.signature ? (
                            adminProfile.signature.startsWith('data:image') ? (
                                <img src={adminProfile.signature} alt="Signature" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="text-xl font-signature font-black text-slate-800">{adminProfile.signature}</span>
                            )
                        ) : null}
                    </div>
                </div>
                <div className="w-96 bg-slate-900 text-white rounded-2xl p-8 flex flex-col justify-between shadow-2xl">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/50 tracking-widest leading-none">
                        <span>Business Final Invoice</span>
                        <span>#{txnInfo?.displayId || txnInfo?.id.split('-')[0]}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <p className="text-xs font-black uppercase text-emerald-400">Total Payable</p>
                        <h1 className="text-5xl font-black italic tracking-tighter">₹{formatCurrency(grandTotal)}</h1>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RobustBusinessTemplate;
