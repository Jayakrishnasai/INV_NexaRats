import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Customer, Vendor, Transaction, PurchaseOrder, User } from '../types';
import { useApp } from '../context/AppContext';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { getLocalDateString } from '../utils/date';
import {
    TrendingUp, TrendingDown, IndianRupee, ShoppingBag,
    Warehouse, BarChart2, AlertCircle, Calendar, Coins, RefreshCw, X, FileText, Trash2
} from 'lucide-react';
import ThemedInvoice from '../components/ThemedInvoice';


interface DashboardProps {
    onNavigateBilling: () => void;
    onNavigateAllInvoices: () => void;
    onVisitStore: () => void;
    user?: User | null;
    onRefresh?: () => Promise<void>;
}

// All chart data is now computed dynamically inside the component from real data

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    icon: React.ElementType;
    iconColor: string;
    subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, isPositive, icon: Icon, iconColor, subtitle }) => (
    <div className="stat-card-hover bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-default">
        <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
                <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className={`flex items-center space-x-1 text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                <span>{isPositive ? '+' : ''}{change}%</span>
                {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            </div>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-xl font-black text-slate-900 mb-1">{value}</h3>
        <p className="text-[10px] font-bold text-slate-400">{subtitle}</p>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigateBilling, onNavigateAllInvoices, onVisitStore, user, onRefresh }) => {
    const navigate = useNavigate();
    const { transactions: allTransactions, customers: allCustomers, products: allProducts, vendors: allVendors } = useApp();
    const isSuperAdmin = user?.role === 'Super Admin';
    const permissionLevel = isSuperAdmin ? 'manage' : (user?.permissions?.['dashboard'] || 'none');
    const [refreshing, setRefreshing] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [data, setData] = React.useState<any>(null);

    // ── Month-to-Date Filtering (from 1st of current month)
    const mtdTransactions = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startStr = getLocalDateString(startOfMonth);
        return allTransactions.filter(t => t.date >= startStr);
    }, [allTransactions]);

    const [vendorActiveIndex, setVendorActiveIndex] = React.useState<number | undefined>(undefined);
    const [currentTime, setCurrentTime] = React.useState(new Date());
    const [previewTransaction, setPreviewTransaction] = useState<Transaction | null>(null);

    // Load admin profile and invoice theme for invoice preview
    const adminProfile = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('inv_admin_profile') || '{}'); }
        catch { return {}; }
    }, []);
    const invoiceTheme = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('nx_invoice_theme') || '"vy_classic"'); }
        catch { return 'vy_classic'; }
    }, []);

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    React.useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            const { api } = await import('../services/api');
            if (!data) setIsLoading(true);
            try {
                const res = await api.dashboard.getDailyData(); // No date param = MTD
                if (mounted && res) {
                    setData(res as any);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Dashboard Fetch Error:', err);
                if (mounted) setIsLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [allTransactions.length, allProducts.length, allCustomers.length, allVendors.length]);

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try {
            await onRefresh();
            const { api } = await import('../services/api');
            const res = await api.dashboard.getDailyData();
            setData(res as any);
        } finally { setTimeout(() => setRefreshing(false), 600); }
    };

    const handleResetData = async () => {
        if (!window.confirm("CRITICAL ACTION: Are you sure you want to delete ALL transactions, purchases, customers, and vendors? This cannot be undone and is for fresh start testing.")) return;
        setRefreshing(true);
        try {
            const { api } = await import('../services/api');
            await api.dashboard.reset();
            if (onRefresh) await onRefresh();
            const res = await api.dashboard.getDailyData();
            setData(res as any);
        } catch (err) {
            console.error('Reset Data Error:', err);
            alert('Failed to reset data. Check console.');
        } finally {
            setRefreshing(false);
        }
    };

    const dailyTransactions = data?.transactions || [];
    const dailyPurchases = data?.purchases || [];
    const dailyProducts = data?.products || [];
    const dailyCustomers = data?.customers || [];
    const dailyVendors = data?.vendors || [];

    const [timeFilter, setTimeFilter] = React.useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');

    // ── Memoized sales totals — based on MONTH-TO-DATE data from global context
    const { mtdOnlineSales, mtdOfflineSales, mtdNetSales } = useMemo(() => {
        const online = mtdTransactions.filter(t => t.source === 'online').reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        const offline = mtdTransactions.filter(t => t.source !== 'online').reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        return { mtdOnlineSales: online, mtdOfflineSales: offline, mtdNetSales: online + offline };
    }, [mtdTransactions]);

    // ── Memoized product metrics — use master products list
    const { inventoryValue, lowStockCount, totalProfit, profitMargin } = useMemo(() => {
        const productMap = new Map(allProducts.map(p => [p.id, p]));
        const invVal = allProducts.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);
        const lowStock = allProducts.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock').length;
        
        const profit = mtdTransactions.reduce((sum, t) => {
            const revenue = Number(t.total) || 0;
            const gst = Number(t.gstAmount) || 0;
            
            const cogs = (t.items || []).reduce((s, item) => {
                const product = productMap.get(item.id);
                const cost = product ? Number(product.purchasePrice || 0) : Number(item.purchasePrice || 0);
                return s + (cost * Number(item.quantity || 0));
            }, 0);
            
            const p = revenue - cogs - gst;
            return sum + (isNaN(p) ? 0 : p);
        }, 0);
        
        const margin = mtdNetSales > 0 ? ((profit / mtdNetSales) * 100).toFixed(1) : '0';
        return { inventoryValue: invVal, lowStockCount: lowStock, totalProfit: profit, profitMargin: margin };
    }, [allProducts, mtdTransactions, mtdNetSales]);

    // ── Memoized today's metrics — recalculates when transactions change ──────
    const { todaySales, todayGst, todayStockCost, todayNetProfit, marginPercent, cogsPercent, onlineStatus, todayStr } = useMemo(() => {
        const todayKey = getLocalDateString();
        const todayTxns = allTransactions.filter(t => t.date === todayKey);
        const productMap = new Map(allProducts.map(p => [p.id, p]));
        const sales = todayTxns.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        
        const { gst, stockCost } = todayTxns.reduce((acc, t) => {
            const tGst = Number(t.gstAmount) || 0;
            const tCost = (t.items || []).reduce((s, item) => {
                const product = productMap.get(item.id);
                const cost = product ? Number(product.purchasePrice || 0) : Number(item.purchasePrice || 0);
                return s + (cost * Number(item.quantity || 0));
            }, 0);
            
            return {
                gst: acc.gst + tGst,
                stockCost: acc.stockCost + tCost,
            };
        }, { gst: 0, stockCost: 0 });

        const netProfit = sales - stockCost - gst;
        const onlineTxns = todayTxns.filter(t => t.source === 'online');
        return {
            todaySales: sales, todayGst: gst, todayStockCost: stockCost, todayNetProfit: netProfit, todayStr: todayKey,
            marginPercent: sales > 0 ? ((netProfit / sales) * 100).toFixed(1) : '0',
            cogsPercent: sales > 0 ? ((stockCost / sales) * 100).toFixed(0) : '0',
            onlineStatus: {
                pending: onlineTxns.filter(t => !t.orderStatus || t.orderStatus === 'Pending').length,
                confirmed: onlineTxns.filter(t => t.orderStatus === 'Confirmed').length,
                shipped: onlineTxns.filter(t => t.orderStatus === 'Shipped').length,
                delivered: onlineTxns.filter(t => t.orderStatus === 'Delivered').length,
            },
        };
    }, [allTransactions, allProducts]);

    // ── Memoized vendor metrics — based on global allVendors
    const { totalVendorPurchased, totalVendorPaid, totalVendorPending, vendorPieData } = useMemo(() => {
        const purchased = allVendors.reduce((sum, v) => sum + (Number(v.totalPaid) || 0) + (Number(v.pendingAmount) || 0), 0);
        const paid = allVendors.reduce((sum, v) => sum + (Number(v.totalPaid) || 0), 0);
        const pending = allVendors.reduce((sum, v) => sum + (Number(v.pendingAmount) || 0), 0);
        return {
            totalVendorPurchased: purchased, totalVendorPaid: paid, totalVendorPending: pending, vendorPieData: [
                { name: 'Purchased', value: purchased, color: '#8b5cf6' },
                { name: 'Paid', value: paid, color: '#10b981' },
                { name: 'Pending', value: pending, color: '#f59e0b' },
            ]
        };
    }, [allVendors]);

    // ── Memoized performance chart data
    const performanceData = useMemo(() => {
        const now = new Date();
        const result: { name: string; value: number }[] = [];
        const sticky = (data as any)?.performanceStats || {};

        if (timeFilter === 'Daily') {
            // "Remove daily data only when we deleting"
            // Daily view strictly shows LIVE transactions
            const todayKey = getLocalDateString();
            const todayTxns = allTransactions.filter(t => t.date === todayKey);
            
            for (let i = 0; i < 12; i++) {
                const blockStart = i * 2;
                const blockEnd = blockStart + 2;
                const label = `${String(blockStart).padStart(2, '0')}:00`;
                
                const blockTotal = todayTxns.filter((t: any) => {
                    const h = new Date(t.createdAt || t.timestamp).getHours();
                    return h >= blockStart && h < blockEnd;
                }).reduce((s, t) => s + (Number(t.total) || 0), 0);

                result.push({ name: label, value: blockTotal });
            }
        } else if (timeFilter === 'Weekly') {
            // "Stay weekly and monthly"
            // Weekly view uses STICKY stats
            const todayIdx = now.getDay();
            const diff = now.getDate() - todayIdx + (todayIdx === 0 ? -6 : 1);
            const monday = new Date(now.setDate(diff));
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const dk = getLocalDateString(d);
                
                let dayTotal = 0;
                for (let h = 0; h < 24; h++) {
                    dayTotal += (sticky[`${dk}_H${h}_online`]?.revenue || 0) + (sticky[`${dk}_H${h}_offline`]?.revenue || 0);
                }
                
                result.push({
                    name: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    value: dayTotal
                });
            }
        } else {
            // "Stay weekly and monthly"
            // Monthly view uses STICKY stats
            const year = now.getFullYear();
            const month = now.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                const dk = getLocalDateString(d);
                
                let dayTotal = 0;
                for (let h = 0; h < 24; h++) {
                    dayTotal += (sticky[`${dk}_H${h}_online`]?.revenue || 0) + (sticky[`${dk}_H${h}_offline`]?.revenue || 0);
                }

                result.push({
                    name: `${i} ${d.toLocaleDateString('en-US', { month: 'short' })}`,
                    value: dayTotal
                });
            }
        }
        return result;
    }, [data, allTransactions, timeFilter]);

    // ── Memoized customer chart data — Uses ALL (historical) Transactions
    const customerAnalyticsData = useMemo(() => {
        const data = allCustomers.map(c => {
            const custTrans = allTransactions.filter(t => t.customerId === c.id);
            return {
                name: (c.name || 'Unknown').split(' ')[0],
                online: custTrans.filter(t => t.source === 'online').reduce((s, t) => s + (Number(t.total) || 0), 0),
                offline: custTrans.filter(t => t.source !== 'online').reduce((s, t) => s + (Number(t.total) || 0), 0),
            };
        }).filter(d => d.online > 0 || d.offline > 0)
            .sort((a, b) => (b.online + b.offline) - (a.online + a.offline))
            .slice(0, 8);
        return data.length > 0 ? data : [{ name: 'No Data', online: 0, offline: 0 }];
    }, [allCustomers, allTransactions]);

    // Show a loading spinner if we don't have dashboard data yet
    if (isLoading && !data) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-[#F8F9FC]">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold text-sm">Loading Daily Activity...</p>
            </div>
        );
    }

    if (permissionLevel === 'none') {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <TrendingUp className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-bold leading-relaxed mb-10">
                    You do not have the required authority to access the dashboard. Please contact your administrator to upgrade your permissions.
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

            {/* Row 1: Responsive Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard title="Online Sales" value={`₹${(mtdOnlineSales || 0).toLocaleString('en-IN')}`} change="0" isPositive={true} icon={ShoppingBag} iconColor="bg-orange-500" subtitle="This Month" />
                <StatCard title="Offline Sales" value={`₹${(mtdOfflineSales || 0).toLocaleString('en-IN')}`} change="0" isPositive={true} icon={Coins} iconColor="bg-emerald-500" subtitle="This Month" />
                <StatCard title="Net Sales" value={`₹${(mtdNetSales || 0).toLocaleString('en-IN')}`} change="0" isPositive={mtdNetSales > 0} icon={IndianRupee} iconColor="bg-green-500" subtitle={`Total: ${dailyCustomers.length} active`} />
                <StatCard title="Inventory Assets" value={`₹${(inventoryValue || 0).toLocaleString('en-IN')}`} change="0" isPositive={inventoryValue > 0} icon={Warehouse} iconColor="bg-blue-600" subtitle={`${allProducts.length} products`} />
                <StatCard title="MTD Net Profit" value={`₹${(totalProfit || 0).toLocaleString('en-IN')}`} change="0" isPositive={totalProfit > 0} icon={BarChart2} iconColor="bg-purple-600" subtitle={`MTD Margin: ${profitMargin}%`} />
                <StatCard title="Low Stock" value={String(lowStockCount)} change="0" isPositive={lowStockCount === 0} icon={AlertCircle} iconColor="bg-red-500" subtitle={`${allProducts.filter(p => p.status === 'Out of Stock').length} out of stock`} />
            </div>




            {/* Row 2: Performance Overview (2/3) + Real-Time Today (1/3) - Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Overview */}
                <div className="card-hover lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="space-y-0.5">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Performance Overview</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {timeFilter === 'Daily' ? "Today's Sales by Hour" : `${timeFilter} Revenue Trend`}
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {isSuperAdmin && (
                                <button
                                    onClick={handleResetData}
                                    disabled={refreshing}
                                    className="p-2.5 rounded-xl transition-all border bg-red-50 text-red-500 hover:bg-red-100 border-red-100"
                                    title="Reset All Transactions & Contacts"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onRefresh && (
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className={`p-2.5 rounded-xl transition-all border ${refreshing ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-100'}`}
                                    title="Refresh Dashboard"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                            <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                                <button
                                    onClick={() => setTimeFilter('Daily')}
                                    className={`px-4 py-2 rounded-lg transition-all ${timeFilter === 'Daily' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
                                >Daily</button>
                                <button
                                    onClick={() => setTimeFilter('Weekly')}
                                    className={`px-4 py-2 rounded-lg transition-all ${timeFilter === 'Weekly' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
                                >Weekly</button>
                                <button
                                    onClick={() => setTimeFilter('Monthly')}
                                    className={`px-4 py-2 rounded-lg transition-all ${timeFilter === 'Monthly' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
                                >Monthly</button>
                            </div>
                        </div>
                    </div>
                    {/* Chart — explicit px height required for Recharts ResponsiveContainer */}
                    <div className="w-full h-[340px]">
                        <ResponsiveContainer key={timeFilter} width="100%" height="100%">
                            <AreaChart data={performanceData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                                    interval={timeFilter === 'Monthly' ? 5 : timeFilter === 'Daily' ? 3 : 0}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                    tickFormatter={(val) => `₹${val}`}
                                    width={56}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#EF4444' }}
                                    formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#EF4444"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    animationDuration={600}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* ── Staff Performance Leaderboard ──────────────────── */}
                    <div className="mt-5 pt-4 border-t border-slate-100/80">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Performance · Today's Sales</p>
                            <span className="text-[10px] font-bold text-slate-300">ranked by count</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {(() => {
                                const todayKey = getLocalDateString();
                                const todayTxns = (allTransactions || []).filter(t => t.date === todayKey);
                                const map: Record<string, { count: number; revenue: number }> = {};
                                todayTxns.forEach(t => {
                                    const name = t.assignedStaff?.trim() || 'Direct Sales';
                                    if (!map[name]) map[name] = { count: 0, revenue: 0 };
                                    map[name].count++;
                                    map[name].revenue += Number(t.total) || 0;
                                });
                                const sorted = Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
                                const maxCount = sorted[0]?.[1]?.count || 1;
                                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                                const barColors = ['bg-amber-400', 'bg-slate-300', 'bg-orange-400', 'bg-blue-300', 'bg-emerald-300'];
                                if (sorted.length === 0) {
                                    return (
                                        <div className="col-span-5 flex items-center justify-center gap-2 py-3">
                                            <span className="text-xs text-slate-300 font-bold">No sales recorded today yet</span>
                                        </div>
                                    );
                                }
                                return sorted.map(([name, data], i) => (
                                    <div key={name} className="bg-slate-50/80 hover:bg-slate-50 rounded-xl p-3 flex flex-col gap-1.5 border border-slate-100 hover:border-slate-200 transition-all">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-sm leading-none shrink-0">{medals[i]}</span>
                                            <span className="text-[10px] font-black text-slate-700 truncate leading-none">{name}</span>
                                        </div>
                                        <div className="flex items-end justify-between gap-1">
                                            <span className="text-xl font-black text-slate-900 leading-none">{data.count}</span>
                                            <span className="text-[9px] font-bold text-slate-400 mb-0.5">sales</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${barColors[i]} transition-all duration-700`}
                                                style={{ width: `${Math.round((data.count / maxCount) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400">₹{data.revenue.toLocaleString('en-IN')}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>


                {/* Real-Time Today Blue Panel */}
                <div className="lg:col-span-1 bg-[#2563EB] text-white p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden h-full">
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between items-start">
                            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Real-Time Today</h3>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em] leading-none">
                                    {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                </p>
                                <p className="text-[8px] font-bold text-blue-200 uppercase mt-1">
                                    {currentTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </p>
                            </div>
                        </div>

                        {/* Layer 1: Today's Sales */}
                        <div className="p-6 bg-white/10 rounded-2xl border border-white/10">
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1.5">Today's Total Sales</p>
                            <p className="text-4xl font-black tracking-tight">₹{(todaySales || 0).toLocaleString('en-IN')}</p>
                        </div>

                        {/* Layer 2: Realized Cash Distribution (Ignores Credit) */}
                        <div className="p-6 bg-white/10 rounded-2xl border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Profit Distribution</p>
                                <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[8px] font-black uppercase tracking-tighter">
                                    Cash Flow
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                        <p className="text-[10px] font-bold text-blue-200 uppercase">Gross Revenue</p>
                                    </div>
                                    <p className="text-sm font-black text-white">₹{(todaySales || 0).toLocaleString()}</p>
                                </div>

                                <div className="space-y-2.5 px-2">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <p className="text-blue-200/60 uppercase font-black">(-) Cost of Goods</p>
                                        <p className="font-bold text-white/80">₹{(todayStockCost || 0).toLocaleString()}</p>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px]">
                                        <p className="text-blue-200/60 uppercase font-black">(-) Tax Liability</p>
                                        <p className="font-bold text-white/80">₹{(todayGst || 0).toLocaleString()}</p>
                                    </div>


                                </div>

                                {/* DASH-2 FIX: Changed from dull emerald-400 to vivid white/yellow for pop on blue bg */}
                                <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/10 px-1">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 bg-yellow-300 rounded-full shadow-[0_0_12px_rgba(253,224,71,0.9)]"></div>
                                        <div>
                                            <p className="text-[11px] font-black text-yellow-200 uppercase leading-none">Net Profit</p>
                                            <p className="text-[8px] font-bold text-blue-200/50 uppercase">Take Home</p>
                                        </div>
                                    </div>
                                    <p className={`text-3xl font-black ${todayNetProfit >= 0 ? 'text-yellow-300' : 'text-red-300'}`}>₹{(todayNetProfit || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white/10 rounded-2xl border border-white/10">
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-5">Order Tracking</p>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="text-center p-2 rounded-xl bg-white/5">
                                    <p className="text-[9px] font-black text-blue-200 uppercase mb-1">Pnd</p>
                                    <p className="text-xl font-black text-white">{onlineStatus.pending}</p>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-white/5">
                                    <p className="text-[9px] font-black text-blue-200 uppercase mb-1">Cnf</p>
                                    <p className="text-xl font-black text-white">{onlineStatus.confirmed}</p>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-white/5 text-blue-100">
                                    <p className="text-[9px] font-black text-blue-200 uppercase mb-1">Shp</p>
                                    <p className="text-xl font-black text-white">{onlineStatus.shipped}</p>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                                    <p className="text-[9px] font-black uppercase mb-1">Dlv</p>
                                    <p className="text-xl font-black">{onlineStatus.delivered}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Customer Purchase + Vendor Purchase Analytics - Responsive */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Customer Purchase Analytics */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-slate-900 leading-tight">Customer<br />Sales Analytics</h3>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Online</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Offline</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={customerAnalyticsData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                <Tooltip />
                                <Bar dataKey="online" fill="#2563EB" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="offline" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Vendor Purchase Analytics */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-5">Vendor Purchase Analytics</h3>

                    {/* DASH-3 FIX: Replaced irrelevant 'Total Customers' with 'Total Vendors' */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-4 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Vendor Purchases</p>
                            <p className="text-xl font-black text-slate-900">₹{(totalVendorPurchased || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Vendors</p>
                            <p className="text-xl font-black text-slate-900">{dailyVendors.length}</p>
                        </div>
                    </div>

                    {/* Vendor Payment Overview subtitle */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-black text-slate-700">Vendor Payment Overview</p>
                        <p className="text-[10px] font-bold text-slate-400">All Time</p>
                    </div>

                    {/* Donut chart + Legend side by side */}
                    <div className="flex flex-col sm:flex-row items-center">
                        <div className="w-[160px] h-[160px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={vendorPieData}
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={6}
                                        dataKey="value"
                                        activeIndex={vendorActiveIndex}
                                        onMouseEnter={(_, index) => setVendorActiveIndex(index)}
                                        onMouseLeave={() => setVendorActiveIndex(undefined)}
                                    >
                                        {vendorPieData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                opacity={vendorActiveIndex === undefined || vendorActiveIndex === index ? 1 : 0.5}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, '']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 900 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-4 pl-4">
                            {vendorPieData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">₹{(item.value || 0).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Row 4: Recent Transactions */}
            <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-black text-slate-900">Recent Transactions</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Latest billing activities</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inv ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Paid</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Remaining</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {allTransactions.slice(0, 5).map((t, idx) => {
                                const paid = t.paidAmount !== undefined ? Number(t.paidAmount) : Number(t.total);
                                const remaining = Math.max(0, Number(t.total) - paid);
                                return (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/admin/invoice/${t.id}`)}
                                                className="flex items-center gap-1.5 font-black text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                                            >
                                                <FileText className="w-3 h-3" />
                                                {t.displayId || t.id.split('-')[0]}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{t.date?.split('|')[0] || t.date}</td>
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
                                        <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                                            ₹{(t.total || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600 text-sm">
                                            ₹{paid.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-sm">
                                            <span className={remaining > 0 ? 'text-red-500' : 'text-slate-300'}>₹{remaining.toLocaleString()}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {allTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-xs font-bold text-slate-400">No recent transactions</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice Preview Modal */}
            {previewTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPreviewTransaction(null)}>
                    <div className="bg-[#F8F9FC] w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Invoice Preview</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {previewTransaction.displayId || previewTransaction.id.split('-')[0]} · {previewTransaction.customerName || 'Walk-in Customer'}
                                </p>
                            </div>
                            <button onClick={() => setPreviewTransaction(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors focus:outline-none">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-8">
                            {/* Partial Payment Summary Bar */}
                            {previewTransaction.status === 'Partial' && (
                                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-black text-xs">₹</div>
                                        <div>
                                            <p className="text-xs font-black text-amber-800 uppercase">Partial Payment</p>
                                            <p className="text-[10px] font-bold text-amber-600">This invoice has outstanding balance</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 text-right">
                                        <div><p className="text-[9px] font-black text-amber-500 uppercase">Total</p><p className="text-sm font-black text-slate-900">₹{Number(previewTransaction.total).toLocaleString()}</p></div>
                                        <div><p className="text-[9px] font-black text-emerald-500 uppercase">Paid</p><p className="text-sm font-black text-emerald-600">₹{(previewTransaction.paidAmount ?? previewTransaction.total).toLocaleString()}</p></div>
                                        <div><p className="text-[9px] font-black text-red-500 uppercase">Due</p><p className="text-sm font-black text-red-600">₹{Math.max(0, Number(previewTransaction.total) - Number(previewTransaction.paidAmount ?? previewTransaction.total)).toLocaleString()}</p></div>
                                    </div>
                                </div>
                            )}
                            <div className="max-w-3xl mx-auto shadow-sm rounded-[40px] overflow-hidden">
                                <ThemedInvoice
                                    adminProfile={{
                                        businessName: adminProfile.businessName || 'My Store',
                                        address: adminProfile.address || '',
                                        phone: adminProfile.phone || '',
                                        email: adminProfile.email || '',
                                        logo: adminProfile.logo || '',
                                    }}
                                    invoiceTheme={invoiceTheme}
                                    customerName={previewTransaction.customerName || 'Walk-in Customer'}
                                    customerPhone={previewTransaction.customerPhone || ''}
                                    customerAddress={previewTransaction.customerAddress || previewTransaction.deliveryAddress || ''}
                                    txnInfo={{
                                        id: previewTransaction.id,
                                        displayId: previewTransaction.displayId,
                                        date: previewTransaction.date,
                                        methodLabel: previewTransaction.method || 'Cash',
                                    }}
                                    cart={previewTransaction.items || []}
                                    finalGST={previewTransaction.gstAmount || 0}
                                    grandTotal={previewTransaction.total}
                                    calculatedGrandTotal={previewTransaction.total}
                                    couponDiscount={previewTransaction.couponDiscount || 0}
                                    paymentSource={previewTransaction.source}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;