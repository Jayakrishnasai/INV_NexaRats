import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Transaction } from '../types';
import { api } from '../services/api';
import ThemedInvoice from '../components/ThemedInvoice';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ChevronLeft, Printer, FileDown, Share2, ArrowLeft } from 'lucide-react';

const InvoiceView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [adminProfile] = useLocalStorage('inv_admin_profile', {
        businessName: 'My Store',
        address: 'Business Address',
        phone: '',
        email: '',
        avatar: '',
        signature: '',
        logo: ''
    });
    const [invoiceTheme] = useLocalStorage('nx_invoice_theme', 'vy_classic');

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Try fetching by full UUID or partial ID
                const res = await api.transactions.getAll();
                const found = res.find(t => t.id === id || t.displayId === id || t.id.startsWith(id));
                if (found) {
                    setInvoice(found);
                } else {
                    setError('Invoice not found');
                }
            } catch (err) {
                console.error('Fetch Invoice Error:', err);
                setError('Failed to load invoice');
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!invoice) return;
        try {
            const isOnline = invoice.source === 'online';
            let effectiveThemeForFormat = invoiceTheme;
            if (isOnline) {
                try {
                    const savedOnlineTheme = localStorage.getItem('nx_online_theme');
                    if (savedOnlineTheme) effectiveThemeForFormat = JSON.parse(savedOnlineTheme);
                } catch { /* fallback */ }
            }

            const gstConfig = JSON.parse(localStorage.getItem('nx_gst_config') || '{}');
            const billData = {
                invoiceNumber: invoice.id,
                id: invoice.id,
                date: invoice.date,
                customerName: invoice.customerName || 'Walk-in',
                customerPhone: invoice.customerPhone || '',
                items: invoice.items || [],
                grandTotal: invoice.total,
                total: invoice.subtotal || invoice.total,
                gstAmount: invoice.gstAmount || 0,
                paymentMode: invoice.method || 'cash',
                couponDiscount: 0,
                format: effectiveThemeForFormat.startsWith('thermal_') ? 'thermal' : 'a4'
            };

            const shopSettings = {
                shopName: adminProfile.businessName || 'My Store',
                address: adminProfile.address || '',
                phone: adminProfile.phone || '',
                email: adminProfile.email || '',
                signature: adminProfile.signature || '',
                gstNumber: gstConfig.gstNumber || '',
                footer: 'Thank you for your business!'
            };

            await api.invoices.downloadPdf(billData, shopSettings);
        } catch (error) {
            console.error('Failed to download PDF:', error);
            alert('Failed to download PDF invoice.');
        }
    };

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold">Loading Invoice Details...</p>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
                    <ArrowLeft className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Invoice Not Found</h2>
                <p className="text-slate-500 font-bold mb-8">The invoice ID you're looking for doesn't exist or has been removed.</p>
                <button 
                    onClick={() => navigate('/admin/dashboard')}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FC] pb-20">
            {/* Action Bar */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 p-4 lg:p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all font-black text-sm active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-none">
                            {invoice.displayId || invoice.id.split('-')[0]}
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {invoice.customerName || 'Walk-in Customer'} · {invoice.date}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handlePrint}
                        className="hidden md:flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                    <button 
                        onClick={handleDownloadPdf}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                        <FileDown className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Invoice Content */}
            <div className="max-w-4xl mx-auto px-4 lg:px-0">
                {/* Status Badge for Full View */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full ${
                            invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' :
                            invoice.status === 'Partial' ? 'bg-amber-100 text-amber-600' :
                            'bg-rose-100 text-rose-600'
                        }`}>
                            Payment Status: {invoice.status}
                        </span>
                        <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full ${
                            invoice.source === 'online' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                            Channel: {invoice.source || 'POS'}
                        </span>
                    </div>
                    {invoice.status === 'Partial' && (
                        <p className="text-sm font-black text-red-500 uppercase tracking-tight">
                            Outstanding Balance: ₹{(invoice.total - (invoice.paidAmount || 0)).toLocaleString()}
                        </p>
                    )}
                </div>

                <div className="bg-white rounded-[48px] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none">
                    <ThemedInvoice
                        adminProfile={adminProfile}
                        invoiceTheme={invoiceTheme}
                        customerName={invoice.customerName || 'Walk-in Customer'}
                        customerPhone={invoice.customerPhone || ''}
                        customerAddress={invoice.customerAddress || invoice.deliveryAddress || ''}
                        txnInfo={{ 
                            id: invoice.id, 
                            displayId: invoice.displayId, 
                            date: invoice.date, 
                            methodLabel: invoice.method || 'Cash' 
                        }}
                        cart={invoice.items || []}
                        finalGST={invoice.gstAmount || 0}
                        grandTotal={invoice.total}
                        calculatedGrandTotal={invoice.total}
                        paymentSource={invoice.source}
                        couponDiscount={invoice.couponDiscount}
                    />
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;
