import React from 'react';
import { Smartphone } from 'lucide-react';
import { InvoiceTemplateProps } from './types';

const StylishRetailTemplate: React.FC<InvoiceTemplateProps> = ({
    adminProfile,
    activeTheme,
    customerName,
    customerPhone,
    customerAddress,
    txnInfo,
    cart,
    finalGST,
    grandTotal,
    gstConfig,
    formatCurrency
}) => {
    return (
        <div className="relative p-10 lg:p-16 min-h-[1000px]">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10 rounded-full -mr-32 -mt-32" style={{ backgroundColor: activeTheme.primary }}></div>
            <div className="flex items-center gap-10 mb-16 relative">
                {adminProfile.logo ? (
                    <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl border-4 border-white overflow-hidden flex items-center justify-center">
                        <img src={adminProfile.logo} alt="Logo" className="w-full h-full object-contain p-3" />
                    </div>
                ) : (
                    <div className="p-4 rounded-[40px] shadow-2xl border-4 border-white" style={{ backgroundColor: activeTheme.primary }}>
                        <Smartphone className="w-16 h-16 text-white" />
                    </div>
                )}
                <div>
                    <h1 className="text-5xl font-black italic tracking-tighter" style={{ color: activeTheme.primary }}>{adminProfile.businessName}</h1>
                    <p className="text-lg font-black text-slate-400 uppercase tracking-[0.4em]">{adminProfile.address}</p>
                    {gstConfig?.gstNumber && <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-1">GSTIN: {gstConfig.gstNumber}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-20 mb-16">
                <div className="space-y-6">
                    <div className="p-8 bg-slate-50 rounded-[32px] border-l-[12px]" style={{ borderColor: activeTheme.primary }}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Customer Invoice To</p>
                        <h3 className="text-3xl font-black text-slate-900">{customerName || 'Loyal Customer'}</h3>
                        <p className="text-sm font-bold text-slate-500 mt-2 uppercase">Contact: +91 {customerPhone}</p>
                        {customerAddress && <p className="text-xs font-bold text-slate-500 mt-1 uppercase whitespace-pre-line">{customerAddress}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8 text-center pt-8">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill No</p>
                        <p className="text-xl font-black text-slate-900">#{txnInfo?.displayId || txnInfo?.id?.split('-')[0]}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                        <p className="text-xl font-black text-slate-900">{txnInfo?.date?.split('|')[0] || txnInfo?.date}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 mb-16">
                {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white transition-all">
                        <div className="flex gap-6 items-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl" style={{ backgroundColor: activeTheme.accent }}>{idx + 1}</div>
                            <div>
                                <p className="text-xl font-black text-slate-900">{item.name}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase">Qty: {item.quantity} {item.unit} | Price: ₹{formatCurrency(item.price)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-slate-900">₹{formatCurrency(item.price * item.quantity)}</p>
                            <p className="text-[10px] font-black text-green-600 uppercase">GST {item.gstRate}% Applied</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 pt-10 border-t-8 flex items-end justify-between" style={{ borderColor: activeTheme.primary }}>
                <div className="space-y-4">
                    <p className="text-sm font-black text-slate-400 uppercase italic">Authorized Partner</p>
                    <div className="w-64 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden p-2">
                        {adminProfile.signature ? (
                            adminProfile.signature.startsWith('data:image') ? (
                                <img src={adminProfile.signature} alt="Signature" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="text-2xl font-signature font-black text-slate-800">{adminProfile.signature}</span>
                            )
                        ) : (
                            <span className="text-xs font-bold text-slate-300 italic">Signature Required</span>
                        )}
                    </div>
                </div>
                <div className="text-right space-y-4">
                    <div className="flex justify-end gap-x-10 text-xs font-black text-slate-400 uppercase">
                        <span>Net Items: {cart.length}</span>
                        <span>Net Tax: ₹{formatCurrency(finalGST)}</span>
                    </div>
                    <h1 className="text-7xl font-black tracking-tighter" style={{ color: activeTheme.primary }}>₹{formatCurrency(grandTotal)}</h1>
                </div>
            </div>
        </div>
    );
};

export default StylishRetailTemplate;
