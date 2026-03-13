import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
    ExternalLink, ShoppingCart, TrendingUp, Package, Users,
    ChevronRight, Settings, Globe, Layout, Share2, Eye,
    CreditCard, Truck, Clock, AlertCircle, Plus, Filter, Search, ShieldCheck,
    Wifi, WifiOff, MapPin, RefreshCw, Phone, X, FileText, FileDown
} from 'lucide-react';
import Portal from '../components/Portal';
import { api } from '../services/api';
import ThemedInvoice from '../components/ThemedInvoice';

import { getLocalDateString } from '../utils/date';
import { Transaction, Customer, OrderStatus, User, Product } from '../types';

interface OnlineStoreProps {
    onVisitStore: () => void;
    transactions: Transaction[];
    customers: Customer[];
    onUpdateOrderStatus: (id: string, status: OrderStatus) => void;
    user?: User | null;
    products: Product[];
}

const OnlineStore: React.FC<OnlineStoreProps> = ({
    onVisitStore, transactions, customers, onUpdateOrderStatus, user, products
}) => {
    const isSuperAdmin = user?.role === 'Super Admin';
    const permissionLevel = isSuperAdmin ? 'manage' : (user?.permissions?.['online-store'] || 'none');
    const isReadOnly = !isSuperAdmin && permissionLevel === 'read';
    const canManageStore = isSuperAdmin || permissionLevel === 'manage' || permissionLevel === 'cru';
    const canDoAdminActions = isSuperAdmin || permissionLevel === 'manage';
    const [showSettings, setShowSettings] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');
    const [storeCustomers, setStoreCustomers] = useState<any[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [customersSearch, setCustomersSearch] = useState('');

    const loadStoreCustomers = async () => {
        setCustomersLoading(true);
        try {
            const res = await api.auth.getStoreCustomers();
            if (res.customers) setStoreCustomers(res.customers);
        } catch { setStoreCustomers([]); }
        setCustomersLoading(false);
    };

    useEffect(() => { loadStoreCustomers(); }, []);

    const [storeSettings, setStoreSettings] = useLocalStorage('nx_store_settings', {
        name: 'NEXA Store',
        domain: 'shop.nexapos.com',
        currency: 'INR (₹) - Indian Rupee',
        minOrder: '499',
        isOnline: true,
        customerDisplay: 'all' as 'all' | 'online'
    });

    const [tempSettings, setTempSettings] = useState(storeSettings);

    // Sync temp settings when modal opens
    React.useEffect(() => {
        if (showSettings && storeSettings) {
            setTempSettings(storeSettings);
        }
    }, [showSettings, storeSettings]);

    const handleSaveSettings = () => {
        setStoreSettings(tempSettings);
        setShowSettings(false);
    };



    // Derive real stats from transactions
    const onlineSalesTotal = transactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const totalOrdersCount = transactions.length;

    const stats = [
        { label: 'Online Sales', value: `₹ ${(onlineSalesTotal || 0).toLocaleString('en-IN')}`, change: '+0%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Total Orders', value: (totalOrdersCount || 0).toString(), change: 'Live', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Registered Users', value: (storeCustomers?.length || 0).toString(), change: 'Active', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', action: () => setActiveTab('customers') },
        { label: 'Store Status', value: storeSettings?.isOnline ? 'Live' : 'Offline', change: storeSettings?.isOnline ? 'Public' : 'Hidden', icon: Eye, color: storeSettings?.isOnline ? 'text-purple-600' : 'text-slate-400', bg: storeSettings?.isOnline ? 'bg-purple-50' : 'bg-slate-50' },
    ];

    // derive recent orders from transactions
    const recentOrders = transactions.map(t => {
        const customer = customers.find(c => c.id === t.customerId);
        return {
            id: t.id,
            displayId: t.displayId,
            customer: customer?.name || 'Walk-in Customer',
            customerPhone: customer?.phone || '',
            address: customer?.address || '',
            amount: `₹ ${(t.total || 0).toLocaleString('en-IN')}`,
            status: t.orderStatus || 'Pending',
            date: t.date === getLocalDateString() ? 'Today' : t.date,
            fullTxn: t // Keep the full transaction for preview
        };
    });

    const [previewInvoice, setPreviewInvoice] = useState<Transaction | null>(null);
    const [adminProfile] = useLocalStorage('inv_admin_profile', {
        businessName: 'My Store', address: 'Business Address', phone: '', email: '', avatar: '', signature: '',
        logo: ''});
    const [invoiceTheme] = useLocalStorage('nx_invoice_theme', 'vy_classic');

    const handleVisitStore = () => {
        onVisitStore();
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
                customerName: order.customerName || 'Online Customer',
                customerPhone: order.customerPhone || '',
                items: order.items || [],
                grandTotal: order.total,
                total: order.subtotal || order.total,
                gstAmount: order.gstAmount || 0,
                paymentMode: order.method || 'online',
                couponDiscount: order.couponDiscount || 0,
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


    if (permissionLevel === 'none') {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <Globe className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-bold leading-relaxed mb-10">
                    You do not have the required authority to manage the online store. Please contact your administrator to upgrade your permissions.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => window.history.back()} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Go Back</button>
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Retry Access</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {isReadOnly && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-orange-600 p-1.5 rounded-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-orange-900 uppercase">View Only Mode</p>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">You have restricted access to online store management</p>
                    </div>
                </div>
            )}
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl">
                            <Globe className="w-6 h-6 text-white" />
                        </div>
                        Online Store Management
                    </h1>
                    <p className="text-slate-500 font-bold mt-1 ml-11">Control your customer-facing ordering portal</p>
                </div>

                <div className="flex items-center gap-3">
                    {canDoAdminActions && (
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 rounded-xl font-black text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95 group shadow-sm"
                        >
                            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                            Store Settings
                        </button>
                    )}
                    <a
                        href="/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 group inline-flex"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Live Store
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        onClick={stat.action}
                        className={`bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group ${stat.action ? 'cursor-pointer' : ''}`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">{stat.change}</span>
                        </div>
                        <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">{stat.label}</h3>
                        <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="flex bg-white p-2 rounded-2xl border border-slate-100 w-fit gap-1">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Orders ({recentOrders.length})
                        </button>
                        <button
                            onClick={() => { setActiveTab('customers'); loadStoreCustomers(); }}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'customers' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Users className="w-3 h-3" />
                            Registered Users ({storeCustomers.length})
                        </button>
                    </div>

                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                {activeTab === 'orders' ? (
                                    <><Clock className="w-5 h-5 text-blue-600" /> Active Online Orders</>
                                ) : (
                                    <><Users className="w-5 h-5 text-emerald-600" /> Registered Store Customers</>
                                )}
                            </h3>
                            {activeTab === 'customers' && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                                        <Search className="w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            value={customersSearch}
                                            onChange={e => setCustomersSearch(e.target.value)}
                                            placeholder="Search by name or phone..."
                                            className="bg-transparent text-xs font-bold outline-none w-40 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <button onClick={loadStoreCustomers} className="p-2 hover:bg-slate-100 rounded-xl transition-all" title="Refresh">
                                        <RefreshCw className={`w-4 h-4 text-slate-400 ${customersLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            {activeTab === 'customers' ? (
                                customersLoading ? (
                                    <div className="px-8 py-12 text-center">
                                        <RefreshCw className="w-6 h-6 text-slate-300 animate-spin mx-auto mb-3" />
                                        <p className="text-slate-400 font-bold text-sm">Loading customers...</p>
                                    </div>
                                ) : (() => {
                                    const filtered = storeCustomers.filter(c =>
                                        !customersSearch ||
                                        c.phone?.includes(customersSearch) ||
                                        c.name?.toLowerCase().includes(customersSearch.toLowerCase())
                                    );
                                    return filtered.length === 0 ? (
                                        <div className="px-8 py-12 text-center">
                                            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 font-bold">No registered customers yet</p>
                                            <p className="text-slate-300 text-xs font-bold mt-1">Customers appear here after logging in via WhatsApp OTP</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left bg-slate-50/80">
                                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Addresses</th>
                                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Orders / Spent</th>
                                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Last Login</th>
                                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filtered.map((c, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-black text-sm flex-shrink-0">
                                                                    {(c.name || c.phone || '?').charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-sm text-slate-900">{c.name || <span className="italic text-slate-400 font-bold">No name yet</span>}</div>
                                                                    <div className="text-xs font-bold text-slate-400">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-700">
                                                                <Phone className="w-3 h-3 text-slate-400" />
                                                                +91 {c.phone}
                                                            </div>
                                                            {c.email && <div className="text-xs text-slate-400 font-bold mt-0.5">{c.email}</div>}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {(c.addresses || []).length === 0 ? (
                                                                <span className="text-xs text-slate-300 font-bold">None</span>
                                                            ) : (
                                                                <div>
                                                                    <div className="flex items-center gap-1 text-xs font-black text-slate-700">
                                                                        <MapPin className="w-3 h-3 text-blue-500" />
                                                                        {c.addresses.length} address{c.addresses.length > 1 ? 'es' : ''}
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 font-bold mt-0.5">
                                                                        {c.addresses.find((a: any) => a.isDefault)?.city || c.addresses[0]?.city || ''}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-black text-sm text-slate-900">{c.totalOrders || 0} orders</div>
                                                            <div className="text-xs font-bold text-emerald-600">₹{(c.totalSpent || 0).toLocaleString('en-IN')}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                                            {c.lastLogin ? new Date(c.lastLogin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'First login'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                {c.activeSessions > 0 ? (
                                                                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">
                                                                        <Wifi className="w-2.5 h-2.5" /> Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-400 rounded-full text-xs font-black">
                                                                        <WifiOff className="w-2.5 h-2.5" /> Offline
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    );
                                })()
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left bg-white">
                                            <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Order Details</th>
                                            <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                            <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status Update</th>
                                            <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {recentOrders.length === 0 ? (
                                            <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold">No online orders found</td></tr>
                                        ) : recentOrders.map((order, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-4">
                                                    <div className="font-black text-xs text-slate-500 mb-0.5">#{order.id.substring(0, 8).toUpperCase()}</div>
                                                    <div className="font-bold text-sm text-slate-900">{order.customer}</div>
                                                    {order.address && <div className="text-xs font-bold text-slate-400 truncate max-w-[150px]">{order.address}</div>}
                                                </td>
                                                <td className="px-8 py-4 font-black text-sm text-slate-900">{order.amount}</td>
                                                <td className="px-8 py-4">
                                                    <select
                                                        disabled={!canManageStore}
                                                        value={order.status}
                                                        onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                                                        className={`
                                                            px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider outline-none border-none cursor-pointer
                                                            ${order.status === 'Pending' ? 'bg-orange-50 text-orange-600' : ''}
                                                            ${order.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' : ''}
                                                            ${order.status === 'Shipped' ? 'bg-purple-50 text-purple-600' : ''}
                                                            ${order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' : ''}
                                                            ${!canManageStore ? 'opacity-50 cursor-not-allowed' : ''}
                                                        `}
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Confirmed">Confirm</option>
                                                        <option value="Shipped">Ship Order</option>
                                                        <option value="Delivered">Deliver</option>
                                                        <option value="Cancelled">Cancel</option>
                                                    </select>

                                                    {isReadOnly && (
                                                        <div className="mt-2 px-2 py-1 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-lg border border-slate-100 w-fit">Read Only</div>
                                                    )}
                                                </td>

                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-400">{order.date}</span>
                                                        <button
                                                            onClick={() => setPreviewInvoice(order.fullTxn)}
                                                            className="p-2 bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                                                            title="View Invoice"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>


            </div>

            {/* Store Settings Modal */}
            {
                showSettings && (
                    <Portal>
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden">
                                {/* Blue Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
                                    <h2 className="text-xl font-black text-white">Store Settings</h2>
                                    <button onClick={() => setShowSettings(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
                                        <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                </div>

                                <div className="p-8 lg:p-10 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Store Name</label>
                                            <input
                                                value={tempSettings.name}
                                                onChange={(e) => setTempSettings({ ...tempSettings, name: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all" placeholder="NEXA Store"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Custom Domain</label>
                                            <div className="relative">
                                                <input
                                                    value={tempSettings.domain}
                                                    onChange={(e) => setTempSettings({ ...tempSettings, domain: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all pr-12" placeholder="shop.nexapos.com"
                                                />
                                                <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Currency</label>
                                            <select
                                                value={tempSettings.currency}
                                                onChange={(e) => setTempSettings({ ...tempSettings, currency: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                            >
                                                <option>INR (₹) - Indian Rupee</option>
                                                <option>USD ($) - US Dollar</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Order Minimum (₹)</label>
                                            <input
                                                type="number"
                                                value={tempSettings.minOrder}
                                                onChange={(e) => setTempSettings({ ...tempSettings, minOrder: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all" placeholder="499"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900">Customer Display in Admin</p>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter admin view</p>
                                            </div>
                                        </div>
                                        <select
                                            value={tempSettings.customerDisplay || 'all'}
                                            onChange={(e) => setTempSettings({ ...tempSettings, customerDisplay: e.target.value as 'all' | 'online' })}
                                            className="px-4 py-2 bg-slate-50 border-2 border-slate-50 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
                                        >
                                            <option value="all">Show All Customers</option>
                                            <option value="online">Online Customers Only</option>
                                        </select>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 ${tempSettings.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-xl flex items-center justify-center`}>
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900">Store is currently {tempSettings.isOnline ? 'Live' : 'Offline'}</p>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tempSettings.isOnline ? 'Publicly accessible' : 'Hidden from customers'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setTempSettings({ ...tempSettings, isOnline: !tempSettings.isOnline })}
                                            className={`px-6 py-3 ${tempSettings.isOnline ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-black rounded-xl hover:opacity-80 transition-all active:scale-95`}
                                        >
                                            {tempSettings.isOnline ? 'Go Offline' : 'Go Live Now'}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                                    <button onClick={() => setShowSettings(false)} className="px-8 py-4 text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-all">Cancel</button>
                                    <button onClick={handleSaveSettings} className="px-10 py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Portal>
                )
            }

            {/* Online Invoice Preview Modal */}
            {previewInvoice && (
                <Portal>
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="bg-[#F8F9FC] w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
                            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">Online Invoice Preview</h2>
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
                                        customerName={previewInvoice.customerName || 'Online Customer'}
                                        customerPhone={previewInvoice.customerPhone || ''}
                                        customerAddress={previewInvoice.customerAddress || previewInvoice.deliveryAddress || ''}
                                        txnInfo={{ id: previewInvoice.id, displayId: previewInvoice.displayId, date: previewInvoice.date, methodLabel: previewInvoice.method || 'Online Payment' }}
                                        cart={previewInvoice.items || []}
                                        finalGST={previewInvoice.gstAmount || 0}
                                        grandTotal={previewInvoice.total}
                                        calculatedGrandTotal={previewInvoice.total}
                                        paymentSource="online"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div >
    );
};

export default OnlineStore;
