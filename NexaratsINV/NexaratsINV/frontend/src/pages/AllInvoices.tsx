import React, { useState, useMemo } from 'react';
import { Transaction, User } from '../types';
import { FileText, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, FileDown, Trash2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { default as ThemedInvoice } from '../components/ThemedInvoice';
import { api } from '../services/api';

interface AllInvoicesProps {
    transactions: Transaction[];
    user?: User | null;
    onDelete?: (id: string) => void;
    onRefresh?: () => Promise<void>;
}

type SortField = 'date' | 'customerName' | 'total' | 'status' | 'source';
type SortOrder = 'asc' | 'desc';

const AllInvoices: React.FC<AllInvoicesProps> = ({ transactions, user, onDelete, onRefresh }) => {
    const isSuperAdmin = user?.role === 'Super Admin';
    const permissionLevel = isSuperAdmin ? 'manage' : (user?.permissions?.['billing'] || 'none');
    const isReadOnly = !isSuperAdmin && permissionLevel === 'read';

    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Partial'>('all');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const [previewInvoice, setPreviewInvoice] = useState<Transaction | null>(null);
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

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to permanently delete this invoice? This will also remove related stock records.')) return;
        try {
            await api.transactions.delete(id);
            if (onDelete) onDelete(id);
            if (onRefresh) await onRefresh();
            alert('Invoice deleted successfully');
        } catch (error: any) {
            console.error('Delete failed:', error);
            alert(error.message || 'Failed to delete invoice');
        }
    };

    const handleDownloadPdf = async (order: Transaction) => {
        try {
            const isOnline = order.source === 'online';
            let effectiveThemeForFormat = invoiceTheme;
            if (isOnline) {
                try {
                    const savedOnlineTheme = localStorage.getItem('nx_online_theme');
                    if (savedOnlineTheme) effectiveThemeForFormat = JSON.parse(savedOnlineTheme);
                } catch { /* fallback */ }
            }

            const gstConfig = JSON.parse(localStorage.getItem('nx_gst_config') || '{}');
            const billData = {
                invoiceNumber: order.id,
                id: order.id,
                date: order.date,
                customerName: order.customerName || 'Walk-in',
                customerPhone: order.customerPhone || '',
                items: order.items || [],
                grandTotal: order.total,
                total: order.subtotal || order.total,
                gstAmount: order.gstAmount || 0,
                paymentMode: order.method || 'cash',
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

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc'); // Default to descending when changing sort
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 inline-block ml-1" />;
        return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600 inline-block ml-1" /> : <ArrowDown className="w-3 h-3 text-blue-600 inline-block ml-1" />;
    };

    const filteredAndSortedTransactions = useMemo(() => {
        let result = transactions;

        // Filtering
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(t =>
                (t.displayId?.toLowerCase() || t.id.toLowerCase()).includes(lowerTerm) ||
                t.customerName?.toLowerCase().includes(lowerTerm)
            );
        }

        if (sourceFilter !== 'all') {
            result = result.filter(t => t.source === sourceFilter);
        }

        if (statusFilter !== 'all') {
            result = result.filter(t => t.status === statusFilter);
        }

        // Sorting
        result = [...result].sort((a, b) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            if (sortField === 'date') {
                // Parse DD/MM/YYYY | HH:MM AM/PM 
                const parseDate = (dStr: string) => {
                    if (!dStr) return 0;
                    const datePart = dStr.split('|')[0].trim();
                    const [dd, mm, yyyy] = datePart.split('/');
                    return new Date(`${yyyy}-${mm}-${dd}`).getTime() || 0;
                };
                valA = a.timestamp || parseDate(a.date);
                valB = b.timestamp || parseDate(b.date);
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [transactions, searchTerm, sourceFilter, statusFilter, sortField, sortOrder]);

    if (permissionLevel === 'none') {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <FileText className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-bold leading-relaxed mb-10">
                    You do not have the required authority to access invoice history. Please contact your administrator to upgrade your permissions.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => window.history.back()} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Go Back</button>
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Retry Access</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FC] min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" /> All Invoices
                    </h1>
                    <p className="text-sm font-bold text-slate-500 mt-1">Manage and view all your transaction records</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                {/* Filters Row */}
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between mb-0">
                    <div className="relative flex-1 min-w-[300px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by ID or Customer Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value as any)}
                                className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                            >
                                <option value="all">All Channels</option>
                                <option value="online">Online</option>
                                <option value="offline">POS / Offline</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Paid">Paid</option>
                                <option value="Partial">Partial/Unpaid</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-x-auto vyapar-scrollbar">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date')}>
                                    Date & Time <SortIcon field="date" />
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100" onClick={() => handleSort('customerName')}>
                                    Customer Name <SortIcon field="customerName" />
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Invoice ID
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100" onClick={() => handleSort('source')}>
                                    Channel <SortIcon field="source" />
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                                    Status <SortIcon field="status" />
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('total')}>
                                    Amount <SortIcon field="total" />
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAndSortedTransactions.length > 0 ? (
                                filteredAndSortedTransactions.map((t, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-500">
                                            {t.date?.split('|')[0]} <span className="text-xs text-slate-400 font-normal">{t.date?.split('|')[1]}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-900">
                                            {t.customerName || 'Walk-in'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setPreviewInvoice(t)}
                                                className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors focus:outline-none"
                                            >
                                                {t.displayId || t.id.split('-')[0]}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${t.source === 'online' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {t.source || 'POS'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${t.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' :
                                                t.status === 'Partial' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-rose-100 text-rose-600'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-base font-black text-slate-900">₹{(t.total || 0).toLocaleString()}</span>
                                            {t.status === 'Partial' && <p className="text-[10px] font-bold text-orange-600 mt-1 uppercase tracking-widest">Due: ₹{(t.total - (t.paidAmount || 0)).toLocaleString()}</p>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownloadPdf(t)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                </button>
                                                {!isReadOnly && (
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Invoice"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm font-black text-slate-500">No invoices found matching your filters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Showing {filteredAndSortedTransactions.length} of {transactions.length} invoices</span>
                </div>
            </div>

            {/* Invoice Preview Modal */}
            {previewInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-[#F8F9FC] w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Invoice Preview</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {previewInvoice.displayId || previewInvoice.id.split('-')[0]}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownloadPdf(previewInvoice)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-sm transition-all"
                                >
                                    <FileDown className="w-4 h-4" />
                                    <span>Download PDF</span>
                                </button>
                                <button onClick={() => setPreviewInvoice(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors focus:outline-none">
                                    <X className="w-6 h-6 text-slate-500" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-8">
                            <div className="max-w-3xl mx-auto shadow-sm rounded-[40px] overflow-hidden">
                                <ThemedInvoice
                                    adminProfile={adminProfile}
                                    invoiceTheme={invoiceTheme}
                                    customerName={previewInvoice.customerName || 'Walk-in Customer'}
                                    customerPhone={previewInvoice.customerPhone || ''}
                                    customerAddress={previewInvoice.customerAddress || previewInvoice.deliveryAddress || ''}
                                    txnInfo={{ id: previewInvoice.id, displayId: previewInvoice.displayId, date: previewInvoice.date, methodLabel: previewInvoice.method || 'Cash' }}
                                    cart={previewInvoice.items || []}
                                    finalGST={previewInvoice.gstAmount || 0}
                                    grandTotal={previewInvoice.total}
                                    calculatedGrandTotal={previewInvoice.total}
                                    paymentSource={previewInvoice.source}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AllInvoices;
