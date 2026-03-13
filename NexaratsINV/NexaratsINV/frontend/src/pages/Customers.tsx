import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, Plus, Edit2, Trash2, Mail, Phone, X, FileSpreadsheet, FileText, Check, FileDown, ArrowDownToLine, ArrowLeft, MoreVertical, Calendar, Clock, CreditCard, ShieldCheck, MapPin, Printer, Send, Users, Globe, Eye, Wallet, Coins, RefreshCw } from 'lucide-react';

import { Customer, Transaction, User } from '../types';
import Portal from '../components/Portal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import ThemedInvoice from '../components/ThemedInvoice';
import { usePagination } from '../hooks/usePagination';
import { api } from '../services/api';
import { shortCustomerId } from '../utils/shortId';


interface CustomersProps {
    customers: Customer[];
    transactions: Transaction[];
    onUpdate: React.Dispatch<React.SetStateAction<Customer[]>>;
    onUpdateTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
    onDelete?: (id: string) => void;
    user?: User | null;
    onRefresh?: () => Promise<void>;
}

const Customers: React.FC<CustomersProps> = ({ customers, transactions, onUpdate, onUpdateTransactions, onDelete, user, onRefresh }) => {
    const isSuperAdmin = user?.role === 'Super Admin';
    const permissionLevel = isSuperAdmin ? 'manage' : (user?.permissions?.['customers'] || 'none');
    const isReadOnly = !isSuperAdmin && permissionLevel === 'read';
    const canManageCustomers = isSuperAdmin || permissionLevel === 'manage' || permissionLevel === 'cru';
    const canDeleteCustomers = isSuperAdmin || permissionLevel === 'manage' || permissionLevel === 'cru';
    const [inputValue, setInputValue] = useState('');
    const [search, setSearch] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [includeZeroBalance, setIncludeZeroBalance] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', totalPaid: '0', pending: '0' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);
    const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partial' | 'Unpaid'>('All');
    const [showFilters, setShowFilters] = useState(false);
    const [txnSearch, setTxnSearch] = useState('');
    const [payingTransaction, setPayingTransaction] = useState<Transaction | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [refreshing, setRefreshing] = useState(false);

    const [storeSettings] = useLocalStorage('nx_store_settings', {
        name: 'NEXA Store',
        domain: 'shop.nexapos.com',
        currency: 'INR (₹) - Indian Rupee',
        minOrder: '499',
        isOnline: true,
        customerDisplay: 'all' as 'all' | 'online'
    });

    // B1 FIX: Debounce search input to prevent excessive re-renders and avoid API rate-limiting
    useEffect(() => {
        const timer = setTimeout(() => setSearch(inputValue), 300);
        return () => clearTimeout(timer);
    }, [inputValue]);

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try { await onRefresh(); } finally { setTimeout(() => setRefreshing(false), 600); }
    };

    // Prefer displayId (e.g. C7x2k), fallback to shortened id
    const formatId = (id: string, displayId?: string) => {
        if (displayId) return displayId;
        if (!id) return 'N/A';
        if (id.length <= 6 && /^[CV]/.test(id)) return id; // already short C/V id
        const parts = id.split('-');
        if (parts.length >= 2) return `${parts[0]}-...${id.slice(-4)}`;
        return id.length > 12 ? `...${id.slice(-8)}` : id;
    };

    // Theme Settings for Invoice
    const [adminProfile] = useLocalStorage('inv_admin_profile', {
        businessName: 'My Store',
        address: 'Business Address',
        phone: '',
        email: '',
        avatar: '',
        signature: '',
        logo: ''});
    const [invoiceTheme] = useLocalStorage('nx_invoice_theme', 'vy_classic');

    const handlePrintInvoice = (order: Transaction) => {
        setPrintingTransaction(order);
        setTimeout(() => {
            window.print();
            setPrintingTransaction(null);
        }, 100);
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

            const billData = {
                invoiceNumber: order.id,
                id: order.id,
                date: order.date,
                customerName: selectedCustomer?.name || 'Walk-in',
                customerPhone: selectedCustomer?.phone || '',
                items: order.items || [],
                grandTotal: order.total,
                total: order.subtotal || order.total,
                gstAmount: order.gstAmount || 0,
                paymentMode: order.method || 'cash',
                couponDiscount: 0,
                format: effectiveThemeForFormat.startsWith('thermal_') ? 'thermal' : 'a4'
            };
            const gstConfig = JSON.parse(localStorage.getItem('nx_gst_config') || '{}');
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

    const handleRecordPayment = () => {
        if (!payingTransaction || !onUpdateTransactions || !paymentAmount) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;

        onUpdateTransactions(prev => prev.map(t => {
            if (t.id === payingTransaction.id) {
                const newPaid = (t.paidAmount || 0) + amount;
                const updatedTxn = {
                    ...t,
                    paidAmount: newPaid,
                    status: (newPaid >= t.total ? 'Paid' : 'Partial') as Transaction['status']
                };
                api.transactions.update(t.id, updatedTxn).catch(err => console.error('Transaction update error:', err));
                return updatedTxn;
            }
            return t;
        }));

        onUpdate(prev => prev.map(c => {
            if (c.id === payingTransaction.customerId) {
                const updatedCust = {
                    ...c,
                    totalPaid: c.totalPaid + amount,
                    pending: Math.max(0, c.pending - amount),
                    status: (Math.max(0, c.pending - amount) === 0 ? 'Paid' : 'Partial') as Customer['status']
                };
                api.customers.update(c.id, updatedCust).catch(err => console.error('Customer update error:', err));
                return updatedCust;
            }
            return c;
        }));

        setPayingTransaction(null);
        setPaymentAmount('');
    };


    const mergedCustomers = useMemo(() => {
        const map = new Map<string, Customer & { _allIds: string[] }>();
        customers.forEach(c => {
            const key = c.phone?.trim() || c.id;
            if (map.has(key)) {
                const existing = map.get(key)!;
                existing.totalPaid += (c.totalPaid || 0);
                existing.pending += (c.pending || 0);
                existing.totalInvoices = (existing.totalInvoices || 0) + (c.totalInvoices || 0);
                existing._allIds.push(c.id);
                if (existing.channel !== c.channel && c.channel) existing.channel = 'both';
            } else {
                map.set(key, { ...c, _allIds: [c.id] });
            }
        });
        return Array.from(map.values());
    }, [customers]);

    const filtered = useMemo(() => mergedCustomers.filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.phone || '').includes(search);
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        const matchesDisplay = storeSettings.customerDisplay === 'online' ? (c.channel === 'online' || c.channel === 'both') : true;
        return matchesSearch && matchesStatus && matchesDisplay;
    }), [mergedCustomers, search, statusFilter, storeSettings.customerDisplay]);

    const pagination = usePagination(filtered, 25);
    // Reset to page 1 whenever filter/search changes
    useEffect(() => { pagination.resetPage(); }, [search, statusFilter]);


    const handleEdit = (customer: Customer) => {
        setFormData({
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            totalPaid: (customer.totalPaid || 0).toString(),
            pending: (customer.pending || 0).toString(),
        });
        setEditingId(customer.id);
        setShowAddModal(true);
    };

    const handleAdd = () => {
        const pending = parseFloat(formData.pending) || 0;
        const totalPaid = parseFloat(formData.totalPaid) || 0;
        const isEdit = !!editingId;
        const customerData: Customer = {
            id: editingId || shortCustomerId(),
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            totalPaid,
            pending,
            status: pending === 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid',
        };
        if (isEdit) {
            onUpdate(prev => prev.map(c => c.id === editingId ? { ...c, ...customerData } : c));
            api.customers.update(editingId!, customerData).catch(err => console.error('Customer update sync error:', err));
        } else {
            const tempId = customerData.id;
            onUpdate(prev => [...prev, customerData]);
            api.customers.create({
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                totalPaid: customerData.totalPaid,
                pending: customerData.pending,
                status: customerData.status,
            }).then((created) => {
                onUpdate(prev => prev.map(c => c.id === tempId ? created : c));
            }).catch(err => console.error('Customer create sync error:', err));
        }
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ name: '', email: '', phone: '', totalPaid: '0', pending: '0' });
    };

    const handleDelete = async (id: string) => {
        try {
            await api.customers.delete(id);
            if (onDelete) onDelete(id);
            else onUpdate(prev => prev.filter(c => c.id !== id));
            onRefresh?.();
        } catch (err: any) {
            console.error('Customer delete sync error:', err);
            alert(err.message || 'Failed to delete customer. They may have existing transactions.');
        }
    };

    const handleBulkDelete = async () => {
        if (!canDeleteCustomers) return;
        if (window.confirm(`Are you sure you want to delete ${selectedRows.length} selected customers? This will also remove their transaction history.`)) {
            let hasError = false;
            for (const id of selectedRows) {
                try {
                    await api.customers.delete(id);
                } catch (err) {
                    console.error('Customer delete error:', err);
                    hasError = true;
                }
            }
            if (hasError) {
                alert('Some customers could not be deleted because they have existing transactions.');
            }
            setSelectedRows([]);
            onRefresh?.();
        }
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === filtered.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filtered.map(c => c.id));
        }
    };

    const toggleRow = (id: string) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const selectedCustomer = mergedCustomers.find(c => c.id === selectedCustomerId);
    const customerTransactions = (transactions || []).filter(t => selectedCustomer?._allIds.includes(t.customerId || ''));
    const displayedTransactions = customerTransactions
        .filter(t => t.id.toLowerCase().includes(txnSearch.toLowerCase()));

    // Dynamic metrics for the details view - Scoped to the current view (Offline/Online)
    const dynamicTotalPaid = displayedTransactions.reduce((sum, t) => sum + (t.paidAmount !== undefined ? t.paidAmount : t.total || 0), 0);
    const dynamicTotalInvoices = displayedTransactions.length;
    // For pending, we show the global pending for the customer
    const dynamicPending = selectedCustomer?.pending || 0;

    if (permissionLevel === 'none') {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <Users className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-bold leading-relaxed mb-10">
                    You do not have the required authority to access the customer database. Please contact your administrator to upgrade your permissions.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => window.history.back()} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Go Back</button>
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Retry Access</button>
                </div>
            </div>
        );
    }

    const pageContent = (selectedCustomerId && selectedCustomer) ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile Header */}
            <div className="bg-white p-6 lg:p-8 rounded-[32px] border border-slate-100 shadow-sm">
                {/* Back button row */}
                <button
                    onClick={() => setSelectedCustomerId(null)}
                    className="mb-5 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all group"
                    title="Back to customers"
                >
                    <span className="w-8 h-8 flex items-center justify-center bg-slate-100 group-hover:bg-slate-200 rounded-full transition-all shadow-sm">
                        <ArrowLeft className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                </button>

                {/* Avatar + Info row */}
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                    <div className="w-20 h-20 bg-blue-50 rounded flex items-center justify-center font-black text-blue-600 text-3xl shrink-0 uppercase">
                        {selectedCustomer.name?.charAt(0) || 'C'}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-2">
                            <h2 className="text-3xl font-black text-slate-900">{selectedCustomer.name}</h2>
                            <span className={`w-fit mx-auto md:mx-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedCustomer.status === 'Paid' ? 'bg-green-100 text-green-600' :
                                selectedCustomer.status === 'Partial' ? 'bg-orange-100 text-orange-600' :
                                    'bg-red-100 text-red-600'
                                }`}>
                                {selectedCustomer.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-sm font-bold text-slate-400">
                            <div className="flex items-center space-x-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                <span title={selectedCustomer.id}>{formatId(selectedCustomer.id, selectedCustomer.displayId)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{selectedCustomer.phone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Mail className="w-3.5 h-3.5" />
                                <span>{selectedCustomer.email || 'No email provided'}</span>
                            </div>
                            {selectedCustomer.address && (
                                <div className="flex items-center space-x-2">
                                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                    <span>{selectedCustomer.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {[
                    { label: 'Total Received', value: `₹${(dynamicTotalPaid || 0).toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Pending Amount', value: `₹${(dynamicPending || 0).toLocaleString()}`, icon: Clock, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'Total Invoices', value: dynamicTotalInvoices.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Last Transaction', value: selectedCustomer.lastTransaction || 'No transactions', icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-50' },
                ].map((m, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{m.label}</p>
                        <div className="flex items-end justify-between">
                            <h3 className={`text-2xl font-black ${m.color}`}>{m.value}</h3>
                            <div className={`p-2.5 rounded ${m.bg}`}>
                                <m.icon className={`w-4 h-4 ${m.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Transactions Table Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <h3 className="text-xl font-black text-slate-900">
                                    Full Billing History
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600`}>
                                    Omnichannel
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 w-full md:w-auto">

                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        placeholder="Search transactions..."
                                        value={txnSearch}
                                        onChange={(e) => setTxnSearch(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-sm text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowExportModal(true)}
                                    className="p-3 bg-slate-50 text-slate-400 rounded-sm hover:bg-slate-100 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5">Invoice ID</th>
                                        <th className="px-8 py-5">Date</th>
                                        <th className="px-8 py-5">Amount</th>
                                        <th className="px-8 py-5">Payment Status</th>
                                        <th className="px-8 py-5">Pending</th>
                                        <th className="px-8 py-5">Delivery / Source</th>
                                        <th className="px-8 py-5">Actions</th>
                                    </tr>

                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {displayedTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-12 text-center text-slate-400 font-bold">No transactions found for this customer.</td>
                                        </tr>
                                    ) : (
                                        displayedTransactions.map((t, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${t.source === 'online' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                                        <span className="font-bold text-sm text-slate-900">{t.displayId || t.id.split('-')[0]}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-sm font-bold text-slate-500">{t.date}</td>
                                                <td className="px-8 py-6 text-sm font-black text-slate-900">₹{((t.paidAmount !== undefined ? t.paidAmount : (t.total || 0)) || 0).toLocaleString()}</td>
                                                <td className="px-8 py-6 text-sm">
                                                    {t.source !== 'online' ? (
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.status === 'Paid' ? 'bg-green-100 text-green-600' :
                                                            t.status === 'Partial' ? 'bg-orange-100 text-orange-600' :
                                                                'bg-red-100 text-red-600'
                                                            }`}>
                                                            {t.status}
                                                        </span>
                                                    ) : (
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.orderStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-600' :
                                                            t.orderStatus === 'Shipped' ? 'bg-purple-100 text-purple-600' :
                                                                t.orderStatus === 'Pending' ? 'bg-orange-100 text-orange-600' :
                                                                    'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            {t.orderStatus || 'Pending'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-sm font-black text-red-500">
                                                    ₹{((t.total || 0) - (t.paidAmount !== undefined ? t.paidAmount : (t.total || 0)) || 0).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-6 text-[10px] font-bold text-slate-400 max-w-[150px] truncate">
                                                    {t.source === 'online' ? (selectedCustomer.address || 'Online Order') : 'POS Walk-in'}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handlePrintInvoice(t)}
                                                            className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                                                            title="View Invoice"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handlePrintInvoice(t)}
                                                            className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                                                            title="Download"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </button>
                                                        {t.source !== 'online' && (t.total - (t.paidAmount || 0)) > 0 && (
                                                            <button
                                                                onClick={() => {
                                                                    setPayingTransaction(t);
                                                                    setPaymentAmount((t.total - (t.paidAmount || 0)).toString());
                                                                }}
                                                                className="p-2 bg-orange-50 text-orange-400 hover:text-orange-600 rounded-lg transition-all"
                                                                title="Record Payment"
                                                            >
                                                                <Wallet className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                            </tr>
                                        ))
                                    )}

                                </tbody>
                            </table>
                        </div>

                        <div className="p-8 mt-auto border-t border-slate-50 flex justify-between items-center">
                            <p className="text-xs font-bold text-slate-400">Showing {displayedTransactions.length} {displayedTransactions.length === 1 ? 'entry' : 'entries'}</p>
                            <div className="flex space-x-2">
                                {/* Pagination placeholder - simplified for now */}
                                <button className="w-10 h-10 flex items-center justify-center rounded-sm bg-blue-600 text-white font-black shadow-lg shadow-blue-100 transition-all border border-blue-600">1</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Section */}
                <div className="space-y-6">
                    {/* Contact Information */}
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Contact Information</h4>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1">Customer ID</p>
                                    <p className="text-sm font-black text-slate-900">{selectedCustomer.id}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1">Phone Number</p>
                                    <p className="text-sm font-bold text-slate-900">{selectedCustomer.phone}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1">Email</p>
                                    <p className="text-sm font-bold text-slate-900">{selectedCustomer.email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1">Address</p>
                                    <p className="text-sm font-bold text-slate-900 leading-relaxed">
                                        {selectedCustomer.address || 'No address provided'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Financial Summary</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Total Amount Received</span>
                                    <span className="text-sm font-black text-green-600">₹{(dynamicTotalPaid || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Pending Amount</span>
                                    <span className="text-sm font-black text-red-500">₹{(dynamicPending || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Total Transactions</span>
                                    <span className="text-xs font-black text-slate-900">{dynamicTotalInvoices} Invoices</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <div className="space-y-6">
            {isReadOnly && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-orange-600 p-1.5 rounded-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-orange-900 uppercase">View Only Mode</p>
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">You have restricted access to customer management</p>
                    </div>
                </div>
            )}
            {/* Top Bar with Mode Toggle */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="bg-blue-50 p-3 rounded-2xl">
                        <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Database</h2>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={"Search customers by name or phone..."}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                        {selectedRows.length > 0 && canDeleteCustomers && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center space-x-2 bg-red-50 text-red-500 px-4 py-3 rounded-xl font-black text-sm hover:bg-red-100 transition-all border border-red-100 animate-in zoom-in"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete ({selectedRows.length})</span>
                            </button>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-3 rounded-xl transition-all border shadow-sm ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-100'}`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                            </button>

                            {onRefresh && (
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className={`p-3 rounded-xl transition-all border shadow-sm ${refreshing ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-100'}`}
                                    title="Refresh Customers"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                </button>
                            )}

                            {showFilters && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 p-2 animate-in fade-in zoom-in slide-in-from-top-2 duration-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-2 mb-1">Filter by Status</p>
                                        {(['All', 'Paid', 'Partial', 'Unpaid'] as const).map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => { setStatusFilter(status); setShowFilters(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between group transition-colors ${statusFilter === status ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <span>{status}</span>
                                                {statusFilter === status && <Check className="w-3 h-3" />}
                                                {status !== 'All' && statusFilter !== status && (
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'Paid' ? 'bg-emerald-500' : status === 'Partial' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                                )}
                                            </button>
                                        ))}
                                        <div className="mt-2 pt-2 border-t border-slate-50">
                                            <button
                                                onClick={() => { setStatusFilter('All'); setSearch(''); setShowFilters(false); }}
                                                className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black text-red-500 hover:bg-red-50 uppercase tracking-widest"
                                            >
                                                Reset All
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {canManageCustomers && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-sm animate-in zoom-in"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>New Customer</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>



            {isReadOnly && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between mb-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-3">
                        <div className="bg-orange-600 p-1.5 rounded-lg">
                            <ShieldCheck className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-orange-900 uppercase">View Only Mode</p>
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">You have restricted access to this module</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic Content Section */}
            <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 w-10">
                                    <div
                                        onClick={toggleSelectAll}
                                        className={`w-5 h-5 rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${selectedRows.length === filtered.length && filtered.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}
                                    >
                                        {selectedRows.length === filtered.length && filtered.length > 0 && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                                    </div>
                                </th>
                                <th className="px-8 py-5">Customer Identity</th>
                                <th className="px-8 py-5 hidden md:table-cell">Communication</th>
                                <th className="px-8 py-5">Channel</th>
                                <th className="px-8 py-5 text-green-600">Lifetime POS Revenue</th>
                                <th className="px-8 py-5 text-red-500">Credit Balance</th>
                                <th className="px-8 py-5">Account Status</th>
                                <th className="px-8 py-5">Admin Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {pagination.paginatedItems.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div onClick={() => toggleRow(c.id)} className={`w-5 h-5 rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${selectedRows.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                            {selectedRows.includes(c.id) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div
                                                onClick={() => setSelectedCustomerId(c.id)}
                                                className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm uppercase cursor-pointer hover:bg-blue-100 transition-colors shrink-0"
                                            >
                                                {c.name?.charAt(0) || 'C'}
                                            </div>
                                            <div>
                                                <button
                                                    onClick={() => setSelectedCustomerId(c.id)}
                                                    className="font-black text-sm text-slate-900 hover:text-blue-600 transition-colors text-left flex items-center gap-2 group/name"
                                                >
                                                    {c.name}
                                                    <Eye className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                                                </button>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <button onClick={() => setSelectedCustomerId(c.id)} className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tighter">{c.id}</button>
                                                    {c.lastTransaction && (
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase">Last Visit: {c.lastTransaction}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 hidden md:table-cell">
                                        <p className="text-sm font-bold text-slate-600">{c.phone}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{c.email || 'No Email'}</p>
                                    </td>
                                    {/* Channel badge */}
                                    <td className="px-8 py-6">
                                        {c.channel === 'both' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Both
                                            </span>
                                        ) : c.channel === 'online' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Online
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Offline
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-sm font-black text-green-600">
                                        ₹{transactions.filter(t => t.customerId === c.id).reduce((sum, t) => sum + (t.paidAmount !== undefined ? t.paidAmount : (t.total || 0)), 0).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6 text-sm font-black text-red-500">
                                        ₹{(c.pending || 0).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${c.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex gap-2">
                                            <button onClick={() => setSelectedCustomerId(c.id)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all"><Eye className="w-3.5 h-3.5" /></button>
                                            {canManageCustomers && (
                                                <button onClick={() => handleEdit(c)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                            )}
                                            {canDeleteCustomers && (
                                                <button onClick={() => handleDelete(c.id)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                            )}
                                            {isReadOnly && (
                                                <div className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-full border border-slate-100">Locked</div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Pagination Footer */}
                    {pagination.totalPages > 1 && (
                        <div className="px-8 py-4 border-t border-slate-50 flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-400">
                                Showing {pagination.startIndex}–{pagination.endIndex} of {pagination.totalItems} customers
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={pagination.prevPage}
                                    disabled={pagination.currentPage === 1}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >Prev</button>
                                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                                    const page = i + 1;
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => pagination.goToPage(page)}
                                            className={`w-8 h-8 text-xs font-black rounded-lg transition-all ${pagination.currentPage === page ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                        >{page}</button>
                                    );
                                })}
                                <button
                                    onClick={pagination.nextPage}
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {pageContent}

            {showAddModal && (
                <Portal>
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden">
                            {/* Blue Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
                                <h2 className="text-xl font-black text-white">{editingId ? 'Edit Customer' : 'Add Customer'}</h2>
                                <button onClick={() => { setShowAddModal(false); setEditingId(null); setFormData({ name: '', email: '', phone: '', totalPaid: '0', pending: '0' }); }} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1.5 px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all" placeholder="Enter customer name" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full mt-1.5 px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all" placeholder="customer@example.com" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full mt-1.5 px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all" placeholder="+91 00000 00000" />
                                </div>
                            </div>
                            <div className="flex space-x-4 px-8 pb-8">
                                <button onClick={() => { setShowAddModal(false); setEditingId(null); setFormData({ name: '', email: '', phone: '', totalPaid: '0', pending: '0' }); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded hover:bg-slate-200 transition-all">Cancel</button>
                                <button onClick={handleAdd} disabled={!formData.name} className="flex-1 py-4 bg-blue-600 text-white font-black rounded shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all">{editingId ? 'Update' : 'Create'}</button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <Portal>
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col relative px-8 py-12 lg:px-12">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="absolute top-8 right-8 p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-sm transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>

                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-black text-slate-900 mb-3">Export Items</h2>
                                <p className="text-slate-500 font-bold max-w-md mx-auto">
                                    Export your customer database using Excel, PDF, or Barcode list formats.
                                </p>
                            </div>

                            <div className="bg-white border-2 border-slate-50 rounded-[32px] p-8 lg:p-10 shadow-sm relative overflow-hidden">
                                <div className="flex flex-col items-center text-center relative z-10">
                                    <div className="w-16 h-16 bg-blue-50 rounded flex items-center justify-center mb-6 border border-blue-100">
                                        <FileDown className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Export Customer Data</h3>
                                    <div className="w-full space-y-4 max-w-sm mx-auto">
                                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded font-black flex items-center justify-center space-x-3 shadow-lg shadow-blue-100 transition-all active:scale-95 group">
                                            <FileSpreadsheet className="w-4 h-4" />
                                            <span>Export as Excel (.xlsx)</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
            {/* Hidden Printable Invoice Component */}
            <div id="printable-invoice" className="print-only hidden">
                {printingTransaction && (
                    <ThemedInvoice
                        adminProfile={adminProfile}
                        invoiceTheme={invoiceTheme}
                        customerName={customers.find(c => c.id === printingTransaction.customerId)?.name || 'Online Customer'}
                        customerPhone={customers.find(c => c.id === printingTransaction.customerId)?.phone || ''}
                        customerAddress={printingTransaction.customerAddress || printingTransaction.deliveryAddress || customers.find(c => c.id === printingTransaction.customerId)?.address || ''}
                        txnInfo={{
                            id: printingTransaction.id,
                            date: printingTransaction.date,
                            methodLabel: printingTransaction.method.toUpperCase()
                        }}
                        cart={printingTransaction.items}
                        finalGST={printingTransaction.gstAmount || 0}
                        calculatedGrandTotal={printingTransaction.total}
                        grandTotal={printingTransaction.total}
                        couponDiscount={0}
                        paymentSource={printingTransaction.source}
                    />
                )}
            </div>
            {/* Record Payment Modal */}
            {payingTransaction && (
                <Portal>
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                            <div className="p-8 lg:p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                                            <Wallet className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase">Record Payment</h2>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{payingTransaction.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setPayingTransaction(null)} className="p-2 hover:bg-slate-100 rounded-sm transition-colors">
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Total Bill</span>
                                            <span className="text-sm font-black text-slate-900">₹{payingTransaction.total.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4 text-emerald-600">
                                            <span className="text-xs font-bold uppercase">Already Paid</span>
                                            <span className="text-sm font-black text-emerald-600">₹{(payingTransaction.paidAmount || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                                            <span className="text-sm font-black text-slate-900 uppercase">Pending Due</span>
                                            <span className="text-xl font-black text-red-500">₹{(payingTransaction.total - (payingTransaction.paidAmount || 0)).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Manually Enter Received Cash</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">₹</span>
                                            <input
                                                type="number"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                </div>

                                <button
                                    onClick={handleRecordPayment}
                                    className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-4 rounded-[28px] font-black flex items-center justify-center space-x-3 shadow-xl shadow-green-100 transition-all active:scale-95"
                                >
                                    <Coins className="w-5 h-5" />
                                    <span>Confirm Cash Payment</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};

export default Customers;


