import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, LogOut, Menu, Calendar, RefreshCw, AlertTriangle, Package, IndianRupee, ShoppingBag, X, CheckCircle2, Settings, Shield, MessageCircle } from 'lucide-react';
import { Page, User, Product, Customer, Transaction } from '../types';

import { useLocalStorage } from '../hooks/useLocalStorage';

interface HeaderProps {
    activePage: Page;
    onPageChange: (page: Page) => void;
    onToggleSidebar: () => void;
    user?: User | null;
    onRefresh?: () => Promise<void>;
    products?: Product[];
    customers?: Customer[];
    transactions?: Transaction[];
}

const Header: React.FC<HeaderProps> = ({ activePage, onPageChange, onToggleSidebar, user, onRefresh, products = [], customers = [], transactions = [] }) => {
    const isSuperAdmin = user?.role === 'Super Admin';
    const canShowSettings = isSuperAdmin || (user?.permissions?.['settings'] && user.permissions['settings'] !== 'none');
    const canShowAdminPanel = isSuperAdmin || (user?.permissions?.['admin'] && user.permissions['admin'] !== 'none');

    const [profile] = useLocalStorage('inv_admin_profile', {
        name: 'NEXA Admin',
        avatar: ''
    });

    const [refreshing, setRefreshing] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
        try {
            const stored = sessionStorage.getItem('nx_dismissed_notifications');
            return stored ? JSON.parse(stored) : [];
        } catch { return []; }
    });
    const [currentTime, setCurrentTime] = useState(new Date());
    const [sessionStart] = useState(new Date());

    const navRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setShowProfile(false);
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        try { sessionStorage.setItem('nx_dismissed_notifications', JSON.stringify(dismissedIds)); } catch { }
    }, [dismissedIds]);

    // Build real avatar URL using the actual user name
    const avatarUrl = user?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3B82F6&color=fff&bold=true`
        : profile.avatar || `https://ui-avatars.com/api/?name=Admin&background=3B82F6&color=fff&bold=true`;

    const sessionMinutes = Math.floor((currentTime.getTime() - sessionStart.getTime()) / 60000);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [waConnected, setWaConnected] = useState<boolean | null>(null);

    useEffect(() => {
        const checkWa = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/v1/whatsapp/status').then(r => r.json());
                if (res.success && res.data) {
                    // Backend returns { connected: true, status: 'ready' }
                    setWaConnected(res.data.connected === true || res.data.status === 'ready');
                } else {
                    setWaConnected(false);
                }
            } catch (e) {
                setWaConnected(false);
            }
        };
        checkWa();
        const interval = setInterval(checkWa, 10000);
        return () => clearInterval(interval);
    }, []);

    const displayName = profile.name.split(' ')[0] || user?.name?.split(' ')[0] || 'Admin';

    const titles: Partial<Record<Page, { title: string; subtitle: string }>> = {
        dashboard: { title: 'Dashboard', subtitle: `Welcome back, ${displayName}. Here's what's happening today.` },
        'invoice:create': { title: 'Billing Dashboard', subtitle: 'Dashboard > Billing' },
        'product:manage': { title: 'Inventory Dashboard', subtitle: 'Track stock levels, movement, and profitability' },
        customers: { title: 'Customer Management', subtitle: 'Manage and track all your customers in one place.' },
        vendors: { title: 'Vendors', subtitle: 'Manage vendor accounts, payment history, and outstanding amounts.' },
        analytics: { title: 'Analytics Dashboard', subtitle: 'Overview of product, customer, and vendor performance' },
        'settings:manage': { title: 'Settings', subtitle: 'Manage your business information' },


        'online-store': { title: 'Online Store Management', subtitle: 'Manage your digital storefront and orders' },
        storefront: { title: 'NEXA POS Storefront', subtitle: 'Customer-facing ordering portal' },
        'user:manage': { title: 'Admin Access', subtitle: 'Manage system administrators and permissions' },
        'payment:manage': { title: 'Payment Management', subtitle: 'Track and manage all payments' },
        'audit:read': { title: 'Audit Logs', subtitle: 'View system audit trail and activity logs' },
        'inventory:adjust': { title: 'Inventory Adjustment', subtitle: 'Adjust stock levels and manage inventory' },
        billing: { title: 'Billing Dashboard', subtitle: 'Dashboard > Billing' },
        inventory: { title: 'Inventory Dashboard', subtitle: 'Track stock levels, movement, and profitability' },
        settings: { title: 'Settings', subtitle: 'Manage your business information' },
        'admin-access': { title: 'Admin Access', subtitle: 'Manage system administrators and permissions' },
        'all-invoices': { title: 'All Invoices', subtitle: 'View and manage all your transaction records' },
        'invoice:view': { title: 'Invoice Details', subtitle: 'Viewing transaction document' },
        login: { title: '', subtitle: '' },
    };

    const { title, subtitle } = titles[activePage] || { title: 'Page', subtitle: '' };

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setTimeout(() => setRefreshing(false), 600);
        }
    };

    // Build notifications from real data
    const notifications: { id: string; type: 'warning' | 'info' | 'success'; icon: React.ElementType; text: string; detail: string }[] = [];

    const outOfStock = products.filter(p => Number(p.stock) <= 0);
    const lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock ?? 5));
    const pendingCustomers = customers.filter(c => c.pending > 0);
    const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })();
    const todayTxns = transactions.filter(t => t.date === todayStr);

    if (outOfStock.length > 0) {
        notifications.push({
            id: 'oos', type: 'warning', icon: AlertTriangle,
            text: `${outOfStock.length} product${outOfStock.length > 1 ? 's' : ''} out of stock`,
            detail: outOfStock.slice(0, 3).map(p => p.name).join(', ') + (outOfStock.length > 3 ? '...' : '')
        });
    }
    if (lowStock.length > 0) {
        notifications.push({
            id: 'ls', type: 'warning', icon: Package,
            text: `${lowStock.length} product${lowStock.length > 1 ? 's' : ''} running low`,
            detail: lowStock.slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', ') + (lowStock.length > 3 ? '...' : '')
        });
    }
    if (pendingCustomers.length > 0) {
        const totalPending = pendingCustomers.reduce((s, c) => s + c.pending, 0);
        notifications.push({
            id: 'cp', type: 'info', icon: IndianRupee,
            text: `₹${totalPending.toLocaleString('en-IN')} pending from ${pendingCustomers.length} customer${pendingCustomers.length > 1 ? 's' : ''}`,
            detail: pendingCustomers.slice(0, 3).map(c => `${c.name}: ₹${c.pending}`).join(', ')
        });
    }
    if (todayTxns.length > 0) {
        const todayTotal = todayTxns.reduce((s, t) => s + (Number(t.total) || 0), 0);
        notifications.push({
            id: 'ts', type: 'success', icon: ShoppingBag,
            text: `${todayTxns.length} sale${todayTxns.length > 1 ? 's' : ''} today — ₹${todayTotal.toLocaleString('en-IN')}`,
            detail: `Last: ${todayTxns[todayTxns.length - 1]?.id || ''}`
        });
    }
    if (notifications.length === 0) {
        notifications.push({
            id: 'none', type: 'success', icon: CheckCircle2,
            text: 'All clear! No alerts right now.',
            detail: 'Your store is running smoothly.'
        });
    }

    const activeAlerts = notifications.filter(n => n.type === 'warning').length;
    // Filter out dismissed notifications from view
    const visibleNotifications = notifications.filter(n => !dismissedIds.includes(n.id));
    const clearAll = () => setDismissedIds(notifications.map(n => n.id));

    return (
        <header className="h-16 lg:h-20 bg-white shadow-sm px-4 lg:px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-4">
                <button
                    onClick={onToggleSidebar}
                    className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                    <Menu className="w-3.5 h-3.5" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-lg lg:text-2xl font-bold text-gray-900 leading-tight truncate">{title}</h1>
                    <p className="text-xs lg:text-sm text-gray-500 truncate hidden sm:block">{subtitle}</p>
                </div>

            </div>

            <div className="flex items-center space-x-3 lg:space-x-5" ref={navRef}>
                {activePage === 'dashboard' && (
                    <div className="hidden md:flex items-center gap-3 mr-1">
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Access: {user?.role || 'Admin'}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">
                                {currentTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} | {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                            </span>
                        </div>
                    </div>
                )}

                {/* Refresh Button */}
                {onRefresh && (
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Refresh data from database"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                )}

                {/* WhatsApp Status */}
                {(user?.role === 'Super Admin' || (user?.permissions?.['whatsapp'] && user.permissions['whatsapp'] !== 'none')) && (
                    <button
                        onClick={() => {
                            sessionStorage.setItem('nx_settings_tab', 'whatsapp');
                            sessionStorage.setItem('nx_settings_whatsapp_only', 'true');
                            onPageChange('settings:manage');
                        }}
                        className={`relative p-2 rounded-lg transition-colors ${waConnected ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:text-green-500 hover:bg-slate-50'}`}
                        title={waConnected ? "WhatsApp Connected" : "WhatsApp Disconnected - Click to connect"}
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className={`absolute top-1 right-1 flex h-2 w-2 rounded-full border border-white ${waConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </button>
                )}

                {/* Notifications Bell */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <Bell className="w-4 h-4" />
                        {activeAlerts > 0 && (
                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="dropdown-enter absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[9999] overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Notifications</h3>
                                    {visibleNotifications.length > 0 && (
                                        <p className="text-[10px] font-bold text-slate-400">{visibleNotifications.length} alert{visibleNotifications.length > 1 ? 's' : ''}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {visibleNotifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            className="text-[11px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest transition-colors"
                                        >Clear all</button>
                                    )}
                                    <button
                                        onClick={() => setShowNotifications(false)}
                                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                {visibleNotifications.length === 0 ? (
                                    <div className="p-6 flex flex-col items-center text-center">
                                        <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                                        <p className="text-xs font-black text-slate-500">All clear!</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">No active alerts right now.</p>
                                    </div>
                                ) : (
                                    visibleNotifications.map(n => (
                                        <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-start space-x-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'warning' ? 'bg-amber-100' : n.type === 'success' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                                    <n.icon className={`w-3.5 h-3.5 ${n.type === 'warning' ? 'text-amber-600' : n.type === 'success' ? 'text-green-600' : 'text-blue-600'}`} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-black text-slate-800">{n.text}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{n.detail}</p>
                                                </div>
                                                <button
                                                    onClick={() => setDismissedIds(prev => [...prev, n.id])}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-slate-500 transition-all"
                                                    title="Dismiss"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-3 border-t border-slate-100 bg-slate-50">
                                <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                                    Live data · refreshes automatically
                                </p>
                            </div>
                        </div>
                    )}
                </div>


                {/* ── Profile Dropdown ─────────────────────────────── */}
                <div className="relative">
                    <button
                        onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                        className="flex items-center gap-2 group rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-all"
                        title={`${user?.name || 'Admin'} · ${user?.role || 'Admin'}`}
                    >
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent group-hover:border-blue-200 transition-all shadow-sm shrink-0">
                            <img src={avatarUrl || undefined} alt={user?.name || 'Admin'} className="w-full h-full object-cover" />
                        </div>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-xs font-black text-slate-800 leading-tight">{user?.name?.split(' ')[0] || 'Admin'}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{user?.role || 'Admin'}</span>
                        </div>
                    </button>

                    {showProfile && (
                        <div className="dropdown-enter absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[9999] overflow-hidden">
                            {/* Profile header */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-5 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/30 shrink-0 shadow">
                                    <img src={avatarUrl || undefined} alt={user?.name || 'Admin'} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-white truncate">{user?.name || profile.name || 'Admin'}</p>
                                    <p className="text-[10px] font-bold text-blue-200 truncate">{user?.email || 'admin@nexarats.com'}</p>
                                    <span className="mt-1 inline-block px-2 py-0.5 bg-white/20 rounded-full text-[9px] font-black text-white uppercase tracking-widest">
                                        {user?.role || 'Admin'}
                                    </span>
                                </div>
                            </div>

                            {/* Session info */}
                            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">Session active</span>
                                <span className="text-[10px] font-black text-slate-600">
                                    {sessionMinutes < 60
                                        ? `${sessionMinutes}m`
                                        : `${Math.floor(sessionMinutes / 60)}h ${sessionMinutes % 60}m`}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="p-2 space-y-0.5">
                                {canShowSettings && (
                                    <button
                                        onClick={() => { setShowProfile(false); onPageChange('settings:manage'); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all group"
                                    >
                                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                                            <Settings className="w-3.5 h-3.5 text-blue-500" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black">Settings</p>
                                            <p className="text-[10px] text-slate-400">Profile, GST, Security</p>
                                        </div>
                                    </button>
                                )}

                                {canShowAdminPanel && (
                                    <button
                                        onClick={() => { setShowProfile(false); onPageChange('user:manage'); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all group"
                                    >
                                        <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors shrink-0">
                                            <Shield className="w-3.5 h-3.5 text-purple-500" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black">Admin Panel</p>
                                            <p className="text-[10px] text-slate-400">Users, Roles & Permissions</p>
                                        </div>
                                    </button>
                                )}
                            </div>

                            {/* Logout */}
                            <div className="p-2 border-t border-slate-100">
                                <button
                                    onClick={() => { setShowProfile(false); sessionStorage.clear(); window.location.reload(); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all group"
                                >
                                    <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors shrink-0">
                                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black">Sign Out</p>
                                        <p className="text-[10px] text-red-400">End your current session</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
