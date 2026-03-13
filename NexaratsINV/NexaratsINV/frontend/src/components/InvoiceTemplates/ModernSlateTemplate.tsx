import React from 'react';
import { Calendar, Receipt, CheckCircle2 } from 'lucide-react';
import { InvoiceTemplateProps } from './types';

const ModernSlateTemplate: React.FC<InvoiceTemplateProps> = ({
    adminProfile,
    activeTheme,
    customerName,
    customerAddress,
    txnInfo,
    cart,
    grandTotal,
    gstConfig,
    formatCurrency
}) => {
    return (
        <div className="p-10 lg:p-16 bg-slate-50 min-h-[1000px] font-sans">
            <div className="max-w-4xl mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden min-h-[1000px] border border-slate-200">
                <div className="h-4 w-full" style={{ backgroundColor: activeTheme.primary }}></div>
                <div className="p-16">
                    <div className="flex justify-between items-start mb-24">
                        <div>
                            <div className="flex items-center gap-x-4 mb-4">
                                {adminProfile.logo ? (
                                    <div className="w-14 h-14 rounded-[20px] shadow-lg flex items-center justify-center border-2 overflow-hidden bg-white" style={{ borderColor: activeTheme.primary }}>
                                        <img src={adminProfile.logo} alt="Business Logo" className="w-full h-full object-contain p-1" />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 rounded-[20px] shadow-lg flex items-center justify-center text-white text-3xl font-black" style={{ backgroundColor: activeTheme.primary }}>
                                        {adminProfile.businessName?.charAt(0) || 'N'}
                                    </div>
                                )}
                                <h1 className="text-4xl font-black tracking-tight text-slate-900">{adminProfile.businessName}</h1>
                            </div>
                            <p className="max-w-xs text-xs font-bold text-slate-400 uppercase leading-loose tracking-widest">{adminProfile.address}</p>
                            {gstConfig?.gstNumber && <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter mt-2">GSTIN: {gstConfig.gstNumber}</p>}
                        </div>
                        <div className="text-right">
                            <div className="inline-block px-10 py-5 rounded-[24px] bg-slate-50 border-2 border-slate-100 mb-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Invoice Amount</p>
                                <p className="text-4xl font-black tracking-tighter text-slate-900">₹{formatCurrency(grandTotal)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Customer Reference</p>
                                <p className="font-black text-slate-900 text-xl">{customerName || 'Standard Client'}</p>
                                {customerAddress && <p className="text-[10px] font-bold text-slate-500 mt-1 max-w-xs whitespace-pre-line text-right ml-auto">{customerAddress}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-24 mb-24 border-y-2 border-slate-50 py-12">
                        <div className="flex items-center gap-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100"><Calendar className="w-3.5 h-3.5" /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Billing Date</p>
                                <p className="text-lg font-black text-slate-900">{txnInfo?.date?.split('|')[0] || txnInfo?.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100"><Receipt className="w-3.5 h-3.5" /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Reference ID</p>
                                <p className="text-lg font-black text-slate-900">#{txnInfo?.displayId || txnInfo?.id?.split('-')[0]}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 mb-24">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center group">
                                <div className="flex-1">
                                    <div className="flex items-center gap-x-3 mb-1">
                                        <span className="w-1 h-6 rounded-full" style={{ backgroundColor: activeTheme.primary }}></span>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{item.name}</h3>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase ml-4">Unit Price: ₹{formatCurrency(item.price)} | Qty: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black tracking-tighter text-slate-900 mb-1">₹{formatCurrency(item.price * item.quantity)}</p>
                                    <div className="flex items-center justify-end gap-x-2 text-[9px] font-black text-blue-600 uppercase">
                                        <CheckCircle2 className="w-3 h-3" /> Includes {item.gstRate}% Tax
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-end pt-20 border-t-2 border-slate-50 h-56">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none mb-6">Payment Secured</p>
                            <div className="flex gap-x-4">
                                <div className="w-12 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-[9px] text-slate-400 uppercase">VISA</div>
                                <div className="w-12 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-[9px] text-slate-400 uppercase">UPI</div>
                                <div className="w-12 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-[9px] text-slate-400 uppercase">PCI</div>
                            </div>
                        </div>
                        <div className="text-right space-y-4">
                            <div className="text-[10px] font-black text-slate-300 uppercase leading-none italic pb-2">Business Representative</div>
                            <div className="h-20 flex items-center justify-end overflow-hidden mb-2">
                                {adminProfile.signature ? (
                                    adminProfile.signature.startsWith('data:image') ? (
                                        <img src={adminProfile.signature} alt="Signature" className="h-full w-auto object-contain" />
                                    ) : (
                                        <span className="text-4xl font-signature font-black text-slate-400">{adminProfile.signature}</span>
                                    )
                                ) : null}
                            </div>
                            <h1 className="text-6xl font-black tracking-tighter italic opacity-80" style={{ color: activeTheme.primary }}>{adminProfile.businessName}</h1>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModernSlateTemplate;
