import React from 'react';
import { InvoiceTemplateProps } from './types';

interface StandardA4TemplateProps extends InvoiceTemplateProps {
    invoiceTheme: string;
}

const StandardA4Template: React.FC<StandardA4TemplateProps> = ({
    invoiceTheme,
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
        <div className={`p-10 lg:p-16 min-h-[1000px] font-sans ${invoiceTheme === 'dark_executive' ? 'bg-[#1E293B] text-white' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex justify-between items-start mb-16 pb-8 border-b-4`} style={{ borderColor: activeTheme.primary }}>
                <div className="flex items-center gap-6">
                    {adminProfile.logo ? (
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white shadow-lg overflow-hidden border-2" style={{ borderColor: activeTheme.primary }}>
                            <img src={adminProfile.logo} alt="Business Logo" className="w-full h-full object-contain p-2" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-lg" style={{ backgroundColor: activeTheme.primary }}>
                            {adminProfile.businessName?.charAt(0) || 'N'}
                        </div>
                    )}
                    <div>
                        <h1 className={`text-4xl font-black tracking-tight ${invoiceTheme === 'dark_executive' ? 'text-white' : 'text-slate-900'}`}>{adminProfile.businessName}</h1>
                        <p className={`text-xs font-bold uppercase tracking-widest mt-2 ${invoiceTheme === 'dark_executive' ? 'text-white/50' : 'text-slate-400'}`}>{adminProfile.address}</p>
                        <p className={`text-xs font-bold ${invoiceTheme === 'dark_executive' ? 'text-white/50' : 'text-slate-400'}`}>{adminProfile.phone} | {adminProfile.email}</p>
                        {gstConfig?.gstNumber && <p className={`text-xs font-black uppercase mt-1 ${invoiceTheme === 'dark_executive' ? 'text-white/30' : 'text-slate-400'}`}>GSTIN: {gstConfig.gstNumber}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-black uppercase tracking-wider" style={{ color: activeTheme.primary }}>INVOICE</p>
                    <p className={`text-sm font-bold mt-2 ${invoiceTheme === 'dark_executive' ? 'text-white/50' : 'text-slate-500'}`}>{txnInfo?.displayId || txnInfo?.id}</p>
                    <p className={`text-sm font-bold ${invoiceTheme === 'dark_executive' ? 'text-white/50' : 'text-slate-500'}`}>Date: {txnInfo?.date?.split('|')[0] || txnInfo?.date}</p>
                </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="p-6 rounded-2xl" style={{ backgroundColor: invoiceTheme === 'dark_executive' ? 'rgba(255,255,255,0.05)' : `${activeTheme.accent}40` || 'rgba(0,0,0,0.03)' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: activeTheme.primary }}>Bill To</p>
                    <p className={`text-xl font-black ${invoiceTheme === 'dark_executive' ? 'text-white' : 'text-slate-900'}`}>{customerName || 'Walk-in Customer'}</p>
                    <p className={`text-sm font-bold mt-1 ${invoiceTheme === 'dark_executive' ? 'text-white/50' : 'text-slate-500'}`}>{customerPhone || 'N/A'}</p>
                    {customerAddress && <p className={`text-xs font-bold mt-1 max-w-xs whitespace-pre-line ${invoiceTheme === 'dark_executive' ? 'text-white/40' : 'text-slate-400'}`}>{customerAddress}</p>}
                </div>
                <div className="p-6 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: activeTheme.primary }}>Payment</p>
                    <p className={`text-sm font-bold ${invoiceTheme === 'dark_executive' ? 'text-white' : 'text-slate-600'}`}>Method: {isOnline ? 'Online' : txnInfo?.methodLabel}</p>
                    <p className="text-sm font-black text-emerald-500 uppercase mt-1">PAID ✓</p>
                </div>
            </div>

            {/* Items Table */}
            <div className="rounded-2xl overflow-hidden mb-12 border" style={{ borderColor: invoiceTheme === 'dark_executive' ? 'rgba(255,255,255,0.1)' : `${activeTheme.primary}30` || 'rgba(0,0,0,0.1)' }}>
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs font-black uppercase tracking-widest text-white" style={{ backgroundColor: activeTheme.primary }}>
                            <th className="px-6 py-4">SL</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4 text-center">HSN</th>
                            <th className="px-6 py-4 text-center">Qty</th>
                            <th className="px-6 py-4 text-right">Price</th>
                            <th className="px-6 py-4 text-right">GST</th>
                            <th className="px-6 py-4 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${invoiceTheme === 'dark_executive' ? 'divide-white/5' : 'divide-slate-100'}`}>
                        {cart.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? (invoiceTheme === 'dark_executive' ? 'bg-white/5' : 'bg-slate-50/50') : ''}>
                                <td className={`px-6 py-4 ${invoiceTheme === 'dark_executive' ? 'text-white/40' : 'text-slate-400'}`}>{String(idx + 1).padStart(2, '0')}</td>
                                <td className="px-6 py-4">
                                    <p className={`font-black ${invoiceTheme === 'dark_executive' ? 'text-white' : 'text-slate-900'}`}>{item.name}</p>
                                    <p className={`text-[9px] font-bold uppercase ${invoiceTheme === 'dark_executive' ? 'text-white/30' : 'text-slate-400'}`}>Unit: {item.unit || 'PCS'}</p>
                                </td>
                                <td className={`px-6 py-4 text-center ${invoiceTheme === 'dark_executive' ? 'text-white/40' : 'text-slate-400'}`}>{item.hsnCode || '-'}</td>
                                <td className={`px-6 py-4 text-center font-black ${invoiceTheme === 'dark_executive' ? 'text-white' : ''}`}>{item.quantity}</td>
                                <td className={`px-6 py-4 text-right font-bold ${invoiceTheme === 'dark_executive' ? 'text-white/60' : 'text-slate-500'}`}>₹{formatCurrency(item.price)}</td>
                                <td className={`px-6 py-4 text-right font-bold ${invoiceTheme === 'dark_executive' ? 'text-white/40' : 'text-slate-400'}`}>{item.gstRate || 0}%</td>
                                <td className="px-6 py-4 text-right font-black" style={{ color: invoiceTheme === 'dark_executive' ? activeTheme.primary : undefined }}>₹{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
                <div className={`w-80 space-y-3 p-6 rounded-2xl ${invoiceTheme === 'dark_executive' ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                        <span className={invoiceTheme === 'dark_executive' ? 'text-white/50' : 'text-slate-400'}>Subtotal</span>
                        <span className={invoiceTheme === 'dark_executive' ? 'text-white' : 'text-slate-900'}>₹{formatCurrency(calculatedGrandTotal - finalGST)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest pl-4">
                        <span className={invoiceTheme === 'dark_executive' ? 'text-white/40' : 'text-slate-400'}>CGST</span>
                        <span className={invoiceTheme === 'dark_executive' ? 'text-white' : 'text-slate-900'}>₹{formatCurrency(cgst || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest pl-4">
                        <span className={invoiceTheme === 'dark_executive' ? 'text-white/40' : 'text-slate-400'}>SGST</span>
                        <span className={invoiceTheme === 'dark_executive' ? 'text-white' : 'text-slate-900'}>₹{formatCurrency(sgst || 0)}</span>
                    </div>
                    {couponDiscount > 0 && (
                        <div className="flex justify-between text-xs font-black text-green-500 uppercase tracking-widest">
                            <span>Discount</span><span>- ₹{formatCurrency(couponDiscount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center border-t-4 pt-4 mt-2" style={{ borderColor: activeTheme.primary }}>
                        <span className="text-sm font-black uppercase" style={{ color: activeTheme.primary }}>Grand Total</span>
                        <span className={`text-3xl font-black ${invoiceTheme === 'dark_executive' ? 'text-white' : 'text-slate-900'}`}>₹{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={`mt-20 pt-8 border-t flex justify-between items-end ${invoiceTheme === 'dark_executive' ? 'border-white/10' : 'border-slate-100'}`}>
                <div>
                    <div className={`w-48 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden p-2 ${invoiceTheme === 'dark_executive' ? 'bg-white/5 border-white/20' : 'bg-slate-50 border-slate-200'}`}>
                        {adminProfile.signature ? (
                            adminProfile.signature.startsWith('data:image') ? (
                                <img src={adminProfile.signature} alt="Signature" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className={`text-xl font-signature font-black ${invoiceTheme === 'dark_executive' ? 'text-amber-500' : 'text-slate-800'}`}>{adminProfile.signature}</span>
                            )
                        ) : null}
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-3 ${invoiceTheme === 'dark_executive' ? 'text-white/30' : 'text-slate-400'}`}>Authorized Signature</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black italic" style={{ color: activeTheme.primary }}>{adminProfile.businessName}</p>
                    <p className={`text-xs font-bold mt-1 ${invoiceTheme === 'dark_executive' ? 'text-white/30' : 'text-slate-400'}`}>Thank you for your business!</p>
                </div>
            </div>
        </div>
    );
};

export default StandardA4Template;
