import React, { useState, useMemo } from 'react';
import { TrendingUp, IndianRupee, Users, ShieldCheck, ArrowUp, ArrowDown, FileText, Download, Calendar, Filter, BarChart3, PieChart, DollarSign, Package, ShoppingCart, ArrowRight, RefreshCw, Globe, Clock, CheckCircle2, TruckIcon } from 'lucide-react';
import { Product, Customer, Vendor, Transaction, User } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getLocalDateString } from '../utils/date';
import { generateMasterCSV, triggerDownload } from '../utils/export';

interface AnalyticsProps {
    products: Product[];
    customers: Customer[];
    vendors: Vendor[];
    transactions: Transaction[];
    user?: User | null;
    onRefresh?: () => Promise<void>;
}

const Analytics: React.FC<AnalyticsProps> = ({ products, customers, vendors, transactions, user, onRefresh }) => {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try { await onRefresh(); } finally { setTimeout(() => setRefreshing(false), 600); }
    };
    const isSuperAdmin = user?.role === 'Super Admin';
    const permissionLevel = isSuperAdmin ? 'manage' : (user?.permissions?.['analytics'] || 'none');
    const isReadOnly = !isSuperAdmin && permissionLevel === 'read';
    const [selectedReport, setSelectedReport] = useState('sales');
    const [dateRange, setDateRange] = useState('this_month');

    const [gstConfig] = useLocalStorage('nx_gst_config', {
        defaultRate: '18',
        enableCGST: true,
        enableSGST: true,
        enableIGST: false,
    });



    // Helper to check if a date falls within the selected range - Enhanced for local matching
    const isWithinRange = (dateStr: string) => {
        if (!dateStr) return false;

        const cleanDateStr = dateStr.split(' | ')[0];

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const itemDate = new Date(cleanDateStr);

        switch (dateRange) {
            case 'today':
                return cleanDateStr === todayStr;
            case 'this_week':
                const startOfWeek = new Date();
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                return itemDate >= startOfWeek;
            case 'this_month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return itemDate >= startOfMonth;
            case 'this_quarter':
                const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
                return itemDate >= new Date(now.getFullYear(), quarterMonth, 1);
            case 'this_year':
                return itemDate >= new Date(now.getFullYear(), 0, 1);
            default:
                return true;
        }
    };

    // Filtered data based on time range
    const filteredTransactions = useMemo(() => {
        // Pre-parse today's date once for efficiency
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Memoize date boundaries
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const startOfQuarter = new Date(now.getFullYear(), quarterMonth, 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const filterFunc = (dateStr: string) => {
            if (!dateStr) return false;
            const cleanDateStr = dateStr.split(' | ')[0];
            const itemDate = new Date(cleanDateStr);

            switch (dateRange) {
                case 'today': return cleanDateStr === todayStr;
                case 'this_week': return itemDate >= startOfWeek;
                case 'this_month': return itemDate >= startOfMonth;
                case 'this_quarter': return itemDate >= startOfQuarter;
                case 'this_year': return itemDate >= startOfYear;
                default: return true;
            }
        };

        return transactions.filter(t => filterFunc(t.date));
    }, [transactions, dateRange]);


    // Summary Metrics - Optimized to O(N) using Product Map
    const metrics = useMemo(() => {
        const productMap = new Map(products.map(p => [p.id, p]));

        // All transactions are valid sales — don't filter by customer existence
        // (walk-in, guest, or customers deleted after the sale are all real revenue)
        const validTransactions = filteredTransactions;

        let totalRevenue = 0;
        let onlineRevenue = 0;
        let offlineRevenue = 0;
        let totalGst = 0;
        let totalCogs = 0;
        let onlineOrders = 0;
        let offlineOrders = 0;

        validTransactions.forEach(t => {
            const amount = Number(t.total) || 0;
            totalRevenue += amount;
            totalGst += Number(t.gstAmount) || 0;

            if (t.source === 'online') {
                onlineRevenue += amount;
                onlineOrders++;
            } else {
                offlineRevenue += amount;
                offlineOrders++;
            }

            t.items.forEach(item => {
                const product = productMap.get(item.id);
                if (product) {
                    totalCogs += (Number(product.purchasePrice) || 0) * (Number(item.quantity) || 0);
                }
            });
        });

        const netProfit = totalRevenue - totalGst - totalCogs;
        const inventoryValuation = products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);

        return {
            revenue: totalRevenue,
            onlineRevenue,
            offlineRevenue,
            gst: totalGst,
            taxableValue: totalRevenue - totalGst,
            netProfit,
            cogs: totalCogs,
            inventoryValuation,
            customerCount: customers.length,
            onlineCustomerCount: customers.filter(c => c.channel === 'online' || c.channel === 'both').length,
            transactionCount: validTransactions.length,
            onlineOrders,
            offlineOrders,
            avgOrder: validTransactions.length > 0 ? totalRevenue / validTransactions.length : 0
        };
    }, [filteredTransactions, products, customers]);

    const reports = [
        { id: 'sales', title: 'Sales Report', icon: DollarSign, description: 'Revenue, transactions, and sales trends' },
        { id: 'online', title: 'Online Store', icon: Globe, description: 'E-commerce performance and order status' },
        { id: 'inventory', title: 'Inventory Report', icon: BarChart3, description: 'Stock levels, movement, and valuation' },
        { id: 'profit', title: 'Profit & Loss', icon: TrendingUp, description: 'Income, expenses, and net profit' },
        { id: 'gst', title: 'GST Report', icon: PieChart, description: 'CGST, SGST, and IGST breakdown' },
        { id: 'customer', title: 'Customer Report', icon: FileText, description: 'Payment history, outstanding, and activity' },
        { id: 'vendors', title: 'Vendor Report', icon: TruckIcon, description: 'Procurement, payables, and supply history' },
    ];

    const handleExport = () => {
        let csvContent = "";
        let fileName = `nexapos_${selectedReport}_report_${getLocalDateString()}.csv`;

        if (selectedReport === 'sales') {
            const headers = ["Transaction ID", "Date", "Customer", "Status", "Amount"];
            const rows = filteredTransactions.map(t => [
                t.displayId || t.id,
                t.date,
                customers.find(c => c.id === t.customerId)?.name || 'Walk-in',
                t.status,
                t.total
            ]);
            csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        } else if (selectedReport === 'online') {
            const headers = ["Order ID", "Date", "Customer", "Amount", "Order Status", "Payment Status"];
            const rows = filteredTransactions.filter(t => t.source === 'online').map(t => [
                t.displayId || t.id,
                t.date,
                t.customerName || 'Online Guest',
                t.total,
                t.orderStatus || 'Pending',
                t.status
            ]);
            csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        } else if (selectedReport === 'inventory') {
            const headers = ["Product Name", "SKU", "Category", "Stock", "Unit", "Status", "Price", "Value"];
            const rows = products.map(p => [
                p.name,
                p.sku,
                p.category,
                p.stock,
                p.unit || 'Units',
                p.status,
                p.price,
                p.price * p.stock
            ]);
            csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        } else if (selectedReport === 'profit') {
            const headers = ["Category", "Label", "Amount"];
            const rows = [
                ["Income", "Gross Sales", metrics.revenue],
                ["Income", "Tax Liabilities", -metrics.gst],
                ["Income", "Net Revenue", metrics.revenue - metrics.gst],
                ["Expense", "Product COGS", metrics.cogs],
                ["Expense", "Total Costs", metrics.cogs],
                ["Final", "Net Profit/Loss", metrics.netProfit]
            ];
            csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        } else if (selectedReport === 'gst') {
            const headers = ["Invoice No", "Date", "Total Amount", "Taxable Value", "CGST", "SGST", "Total GST"];
            const rows = filteredTransactions.map(t => {
                const total = Number(t.total) || 0;
                const gst = Number(t.gstAmount) || 0;
                const taxable = total - gst;
                return [
                    t.displayId || t.id,
                    t.date,
                    total,
                    taxable.toFixed(2),
                    (gst / 2).toFixed(2),
                    (gst / 2).toFixed(2),
                    gst.toFixed(2)
                ];
            });
            csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        } else if (selectedReport === 'customer') {
            const headers = ["Customer Name", "Phone", "Total Purchases", "Outstanding", "Last Visit"];
            const rows = customers.map(c => [
                c.name,
                c.phone || '',
                c.totalPaid || 0,
                c.pending || 0,
                c.lastTransaction || 'Never'
            ]);
            csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        } else if (selectedReport === 'vendors') {
            const headers = ["Vendor Name", "Business Name", "Phone", "Total Procurement", "Amount Payable"];
            const rows = vendors.map(v => [
                v.name,
                v.businessName || '',
                v.phone || '',
                v.totalPaid || 0,
                v.pendingAmount || 0
            ]);
            csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportAll = () => {
        const csvContent = generateMasterCSV(products, customers, vendors, filteredTransactions, dateRange);
        triggerDownload(csvContent, `nexapos_master_report_full_${getLocalDateString()}.csv`);
    };

    if (permissionLevel === 'none') {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <BarChart3 className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-bold leading-relaxed mb-10">
                    You do not have the required authority to access business analytics. Please contact your administrator to upgrade your permissions.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => window.history.back()} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Go Back</button>
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Retry Access</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {isReadOnly && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-orange-600 p-1.5 rounded-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-orange-900 uppercase">View Only Mode</p>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">You have restricted access to analytics and reports</p>
                    </div>
                </div>
            )}

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {[
                    { title: 'Total Revenue', value: `₹${metrics.revenue.toLocaleString()}`, icon: IndianRupee, color: 'bg-emerald-500', trend: 'Live' },
                    { title: 'Net Profit', value: `₹${metrics.netProfit.toLocaleString()}`, icon: TrendingUp, color: 'bg-blue-600', trend: 'Real-time' },
                    { title: 'Tax Collected', value: `₹${metrics.gst.toLocaleString()}`, icon: ShieldCheck, color: 'bg-indigo-500', trend: 'Audit' },
                    { title: 'Valuation', value: `₹${metrics.inventoryValuation.toLocaleString()}`, icon: Package, color: 'bg-orange-500', trend: 'Asset' },
                ].map((card, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                                <card.icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{card.trend}</span>
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
                        <h3 className="text-2xl font-black text-slate-900">{card.value}</h3>
                    </div>
                ))}
            </div>

            {/* Report Icons Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {reports.map(r => (
                    <button
                        key={r.id}
                        onClick={() => setSelectedReport(r.id)}
                        className={`p-6 rounded-2xl border-2 text-left transition-all group ${selectedReport === r.id
                            ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-50'
                            : 'border-white bg-white hover:border-slate-100 hover:shadow-lg shadow-sm'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${selectedReport === r.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400'
                            }`}>
                            <r.icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-black text-sm text-slate-900">{r.title}</h4>
                        <p className="text-xs text-slate-400 font-bold mt-1 leading-tight">{r.description}</p>
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center space-x-3 overflow-x-auto vyapar-scrollbar pb-2 md:pb-0">
                    <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-transparent text-xs font-black uppercase tracking-wider outline-none text-slate-600 cursor-pointer"
                        >
                            <option value="today">Today</option>
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                            <option value="this_quarter">This Quarter</option>
                            <option value="this_year">This Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                    <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    {onRefresh && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className={`p-3 rounded-xl transition-all border ${refreshing ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-100'}`}
                            title="Refresh Analytics"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Selected</span>
                    </button>
                    <button
                        onClick={handleExportAll}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Master Report</span>
                    </button>
                </div>
            </div>

            {/* Dynamic Report Content */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                            {reports.find(r => r.id === selectedReport)?.title}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                            Live visualization of your business data
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Real-time Sync Active</span>
                    </div>
                </div>

                <div className="p-8">
                    {selectedReport === 'sales' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Sales</p>
                                    <p className="text-3xl font-black text-slate-900">₹{metrics.revenue.toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Orders</p>
                                    <p className="text-3xl font-black text-slate-900">{metrics.transactionCount}</p>
                                </div>
                                <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100">
                                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Avg Ticket Size</p>
                                    <p className="text-3xl font-black text-slate-900">₹{Math.round(metrics.avgOrder).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Transaction ID</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredTransactions.slice(0, 10).map((t, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-black text-blue-600 text-sm">{t.displayId || t.id.split('-')[0]}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{t.date}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-900">{customers.find(c => c.id === t.customerId)?.name || 'Walk-in'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                                        }`}>{t.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900">₹{t.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {filteredTransactions.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-300 font-bold uppercase tracking-widest">No sales data in this period</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedReport === 'online' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Online vs Offline Revenue Card */}
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Revenue Mix (Online vs Offset)</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs font-black mb-2">
                                                <span className="text-blue-600 uppercase">Online Sales</span>
                                                <span>₹{metrics.onlineRevenue.toLocaleString()} ({Math.round((metrics.onlineRevenue / (metrics.revenue || 1)) * 100)}%)</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(metrics.onlineRevenue / (metrics.revenue || 1)) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs font-black mb-2">
                                                <span className="text-slate-400 uppercase">Offline Sales</span>
                                                <span>₹{metrics.offlineRevenue.toLocaleString()} ({Math.round((metrics.offlineRevenue / (metrics.revenue || 1)) * 100)}%)</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-400 rounded-full" style={{ width: `${(metrics.offlineRevenue / (metrics.revenue || 1)) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Online Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                        <Globe className="w-5 h-5 text-blue-600 mb-3" />
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Online Orders</p>
                                        <p className="text-2xl font-black text-slate-900">{metrics.onlineOrders}</p>
                                    </div>
                                    <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                                        <Users className="w-5 h-5 text-orange-600 mb-3" />
                                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Web Users</p>
                                        <p className="text-2xl font-black text-slate-900">{metrics.onlineCustomerCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Pending', count: filteredTransactions.filter(t => t.source === 'online' && t.orderStatus === 'Pending').length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
                                    { label: 'Confirmed', count: filteredTransactions.filter(t => t.source === 'online' && t.orderStatus === 'Confirmed').length, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
                                    { label: 'Shipped', count: filteredTransactions.filter(t => t.source === 'online' && t.orderStatus === 'Shipped').length, icon: TruckIcon, color: 'text-purple-500', bg: 'bg-purple-50' },
                                    { label: 'Delivered', count: filteredTransactions.filter(t => t.source === 'online' && t.orderStatus === 'Delivered').length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                ].map((s, idx) => (
                                    <div key={idx} className={`${s.bg} p-4 rounded-2xl border border-slate-100 flex items-center gap-4`}>
                                        <div className={`p-2 rounded-lg bg-white ${s.color}`}>
                                            <s.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                                            <p className="text-xl font-black text-slate-900 leading-none">{s.count}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Online Order</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4">Fulfillment</th>
                                            <th className="px-6 py-4 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredTransactions.filter(t => t.source === 'online').slice(0, 5).map((t, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-sm text-slate-900">#{t.displayId || t.id.substring(0, 8)}</p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.date}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-black text-slate-700">{customers.find(c => c.id === t.customerId)?.name || 'Online Customer'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">{t.method?.toUpperCase() || 'ONLINE'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                        t.orderStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                                                        t.orderStatus === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>{t.orderStatus || 'Pending'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900">₹{t.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {filteredTransactions.filter(t => t.source === 'online').length === 0 && (
                                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-300 font-black uppercase italic">No online orders found in this period</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedReport === 'inventory' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-black text-slate-400 uppercase mb-1">Total Stock</p>
                                    <p className="text-2xl font-black text-slate-900">{products.reduce((s, p) => s + p.stock, 0)} Units</p>
                                </div>
                                <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                                    <p className="text-xs font-black text-red-400 uppercase mb-1">Out of Stock</p>
                                    <p className="text-2xl font-black text-red-600">{products.filter(p => p.stock === 0).length} Items</p>
                                </div>
                                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                                    <p className="text-xs font-black text-orange-400 uppercase mb-1">Low Stock</p>
                                    <p className="text-2xl font-black text-orange-600">{products.filter(p => p.stock > 0 && p.stock < 10).length} Items</p>
                                </div>
                                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-xs font-black text-blue-400 uppercase mb-1">Asset Value</p>
                                    <p className="text-2xl font-black text-blue-600">₹{metrics.inventoryValuation.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Product Details</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Stock</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {products.slice(0, 10).map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-sm text-slate-900">{p.name}</p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.sku}</p>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-600">{p.category}</td>
                                                <td className="px-6 py-4 text-sm font-black tracking-tighter">{p.stock} {p.unit || 'Units'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.status === 'In Stock' ? 'bg-emerald-50 text-emerald-600' :
                                                        p.status === 'Low Stock' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                                                        }`}>{p.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900">₹{(p.price * p.stock).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedReport === 'profit' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ArrowRight className="w-3 h-3 text-emerald-500" /> Income Breakdown
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-100/50">
                                            <span className="text-sm font-bold text-slate-600">Gross Sales</span>
                                            <span className="text-sm font-black text-slate-900">₹{metrics.revenue.toLocaleString()}</span>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-100/50">
                                            <span className="text-sm font-bold text-slate-600">Tax Liabilities</span>
                                            <span className="text-sm font-black text-rose-500">- ₹{metrics.gst.toLocaleString()}</span>
                                        </div>
                                        <div className="p-5 bg-emerald-50 rounded-2xl flex justify-between items-center border border-emerald-100">
                                            <span className="text-sm font-black text-emerald-700 uppercase tracking-tight">Net Revenue</span>
                                            <span className="text-lg font-black text-emerald-700">₹{(metrics.revenue - metrics.gst).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ArrowRight className="w-3 h-3 text-rose-500" /> Outflow Breakdown
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-100/50">
                                            <span className="text-sm font-bold text-slate-600">Product COGS</span>
                                            <span className="text-sm font-black text-slate-900">₹{metrics.cogs.toLocaleString()}</span>
                                        </div>

                                        <div className="p-5 bg-rose-50 rounded-2xl flex justify-between items-center border border-rose-100">
                                            <span className="text-sm font-black text-rose-700 uppercase tracking-tight">Total Costs</span>
                                            <span className="text-lg font-black text-rose-700">₹{metrics.cogs.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-8 rounded-[32px] border-2 text-center transition-all ${metrics.netProfit >= 0 ? 'bg-emerald-500 border-emerald-400 shadow-xl shadow-emerald-100' : 'bg-rose-500 border-rose-400 shadow-xl shadow-rose-100'
                                }`}>
                                <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em] mb-2 text-center">Final Net Profit/Loss</p>
                                <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter text-center">
                                    {metrics.netProfit < 0 && '-'}₹{Math.abs(metrics.netProfit).toLocaleString()}
                                </h2>
                                <p className="text-white/80 text-xs font-bold mt-4 max-w-md mx-auto">
                                    {metrics.netProfit >= 0
                                        ? "Your business is running in profit. Keep up the great work!"
                                        : "Heads up! Your expenses and COGS exceed your revenue for this period."}
                                </p>
                            </div>
                        </div>
                    )}

                    {selectedReport === 'gst' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-8 rounded-3xl bg-indigo-50 border border-indigo-100 text-center">
                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Total Taxable Value</p>
                                    <h4 className="text-3xl font-black text-slate-900">₹{metrics.taxableValue.toLocaleString()}</h4>
                                    <p className="text-xs font-bold text-slate-400 mt-2">Amount before GST</p>
                                </div>
                                <div className="p-8 rounded-3xl bg-indigo-50 border border-indigo-100 text-center">
                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Total GST Collected</p>
                                    <h4 className="text-3xl font-black text-slate-900">₹{metrics.gst.toLocaleString()}</h4>
                                    <p className="text-xs font-bold text-slate-400 mt-2">CGST + SGST</p>
                                </div>
                                <div className="p-8 rounded-3xl bg-slate-900 text-center shadow-xl shadow-slate-200">
                                    <p className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-3">GSTR-1 Format Total</p>
                                    <h4 className="text-4xl font-black text-white">₹{metrics.revenue.toLocaleString()}</h4>
                                    <p className="text-xs font-bold text-indigo-300/50 mt-2 tracking-widest uppercase italic font-black">B2C Retail Summary</p>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start space-x-3">
                                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                                    <span className="font-black uppercase tracking-wider block mb-1">Tax Filing Note:</span>
                                    This report provides a summary for GSTR-1 B2C Small (B2CS) filing. For B2B filing, ensure customer GSTINs are recorded. Values are derived from sale transactions based on your GST configuration.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Invoice Details</th>
                                            <th className="px-6 py-4">Taxable Value</th>
                                            <th className="px-6 py-4">CGST (9%)</th>
                                            <th className="px-6 py-4">SGST (9%)</th>
                                            <th className="px-6 py-4 text-right">Invoice Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredTransactions.slice(0, 10).map((t, i) => {
                                            const total = Number(t.total) || 0;
                                            const gst = Number(t.gstAmount) || 0;
                                            const taxable = total - gst;
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-black text-sm text-slate-900">{t.displayId || t.id.substring(0, 8)}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t.date}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">₹{taxable.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">₹{(gst/2).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-sky-600">₹{(gst/2).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-900">₹{total.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedReport === 'customer' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Database</p>
                                        <p className="text-2xl font-black text-slate-900">{customers.length}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Today</p>
                                        <p className="text-2xl font-black text-slate-900">
                                            {new Set(transactions.filter(t => t.date === getLocalDateString()).map(t => t.customerId)).size}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        <ArrowUp className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total LTV</p>
                                        <p className="text-2xl font-black text-slate-900">₹{customers.reduce((s, c) => s + (c.totalPaid || 0), 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
                                        <ArrowDown className="w-5 h-5 text-rose-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Credit</p>
                                        <p className="text-2xl font-black text-slate-900">₹{customers.reduce((s, c) => s + (c.pending || 0), 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Total Purchases</th>
                                            <th className="px-6 py-4">Outstanding</th>
                                            <th className="px-6 py-4">Last Visit</th>
                                            <th className="px-6 py-4 text-right">Loyalty Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {customers.sort((a, b) => (b.totalPaid || 0) - (a.totalPaid || 0)).slice(0, 5).map((c, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-black text-blue-600">
                                                        {c.name?.charAt(0) || 'C'}
                                                    </div>
                                                    <span className="font-black text-sm text-slate-900">{c.name}</span>
                                                </td>
                                                <td className="px-6 py-4 font-black text-slate-900 text-sm">₹{(c.totalPaid || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-xs font-black text-rose-500">₹{(c.pending || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{c.lastTransaction || 'Never'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-black">
                                                        {Math.floor((c.totalPaid || 0) / 100)} PTS
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedReport === 'vendors' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                        <TruckIcon className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Vendors</p>
                                        <p className="text-2xl font-black text-slate-900">{vendors.length}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Procurement</p>
                                        <p className="text-2xl font-black text-slate-900">₹{vendors.reduce((s, v) => s + (v.totalPaid || 0), 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
                                        <IndianRupee className="w-5 h-5 text-rose-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Payables</p>
                                        <p className="text-2xl font-black text-slate-900">₹{vendors.reduce((s, v) => s + (v.pendingAmount || 0), 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Supplier</p>
                                        <p className="text-sm font-black text-slate-900 truncate max-w-[120px]">
                                            {vendors.sort((a,b) => (b.totalPaid||0) - (a.totalPaid||0))[0]?.name || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                                    <h3 className="text-lg font-black text-slate-900">Primary Suppliers</h3>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort by: Business Value</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-8 py-5">Vendor Details</th>
                                                <th className="px-8 py-5">Business Name</th>
                                                <th className="px-8 py-5">Total Procurement</th>
                                                <th className="px-8 py-5">Pending Payable</th>
                                                <th className="px-8 py-5 text-right">Trust Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {vendors.sort((a, b) => (b.totalPaid || 0) - (a.totalPaid || 0)).slice(0, 5).map((v, i) => (
                                                <tr key={i} className="group hover:bg-slate-50/50 transition-all">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xs font-black">
                                                                {v.name?.charAt(0) || 'V'}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 text-sm">{v.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{v.phone || 'NO CONTACT'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                            {v.businessName || 'GENERAL'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-sm font-black text-slate-900">₹{(v.totalPaid || 0).toLocaleString()}</td>
                                                    <td className="px-8 py-6">
                                                        <span className={`text-sm font-black ${v.pendingAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                            ₹{(v.pendingAmount || 0).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end space-x-1">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <div key={star} className={`w-1.5 h-1.5 rounded-full ${star <= (v.pendingAmount === 0 ? 5 : 4) ? 'bg-amber-400' : 'bg-slate-200'}`} />
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
