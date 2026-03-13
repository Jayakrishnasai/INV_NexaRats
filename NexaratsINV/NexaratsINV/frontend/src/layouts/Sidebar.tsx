import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Receipt, Package, Users, Truck, BarChart3,
    Settings, ShoppingCart, LogOut, X, ShieldCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
    onLogout: () => void;
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onlineOrdersCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
    onLogout, isOpen, onClose, user, collapsed, onToggleCollapse, onlineOrdersCount = 0
}) => {
    const navigate = useNavigate();
    const isSuperAdmin = user?.role === 'Super Admin';
    const [hovered, setHovered] = useState(false);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // true expanded = not collapsed OR user is hovering on collapsed sidebar
    const isExpanded = !collapsed || hovered;

    const handleMouseEnter = () => {
        if (!collapsed) return;
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setHovered(true), 80);
    };
    const handleMouseLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setHovered(false), 120);
    };
    useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'billing', icon: Receipt, label: 'Billing' },
        { id: 'inventory', icon: Package, label: 'Inventory' },
        { id: 'customers', icon: Users, label: 'Customers' },
        { id: 'vendors', icon: Truck, label: 'Vendors' },
        { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    ];

    const filteredMenuItems = menuItems.filter(item => {
        if (!user) return true;
        if (user.role === 'Super Admin') return true;
        return (user.permissions?.[item.id] || 'none') !== 'none';
    });

    const canShowOnlineStore = isSuperAdmin
        || (user?.permissions?.['online-store'] && user.permissions['online-store'] !== 'none');

    // Generate avatar URL from real user name — never shows broken "Avat" text
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=EFF6FF&color=2563EB&bold=true&size=64`;

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
            )}

            <aside
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={[
                    'fixed lg:static inset-y-0 left-0 z-50',
                    'h-full bg-white border-r border-slate-100 flex flex-col shrink-0',
                    'transition-[width,transform] duration-300 ease-out overflow-hidden',
                    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    'transform lg:transform-none',
                    isExpanded ? 'w-60' : 'w-[68px]',
                    hovered && collapsed ? 'lg:shadow-2xl lg:shadow-slate-200/60' : '',
                ].join(' ')}
                style={{ willChange: 'width' }}
            >
                {/* ── Logo row ─────────────────────────────── */}
                <div className="h-16 lg:h-20 px-3 flex items-center justify-between border-b border-slate-50 shrink-0">
                    {/* Logo mark — always visible, centered when collapsed */}
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className={['flex items-center gap-3 min-w-0', !isExpanded ? 'w-full justify-center' : ''].join(' ')}
                    >
                        <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-700 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-sky-200/60">
                            <span className="text-white font-black text-sm leading-none">N</span>
                        </div>
                        {/* Title label — hidden when collapsed */}
                        {isExpanded && (
                            <span className="font-black text-slate-900 tracking-tight text-lg whitespace-nowrap animate-fade-in">
                                NEXA POS
                            </span>
                        )}
                    </button>

                    {/* Desktop collapse toggle — only when expanded */}
                    {isExpanded && (
                        <button
                            onClick={onToggleCollapse}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            className="hidden lg:flex w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 items-center justify-center transition-all shrink-0"
                        >
                            {collapsed
                                ? <ChevronRight className="w-3.5 h-3.5" />
                                : <ChevronLeft className="w-3.5 h-3.5" />
                            }
                        </button>
                    )}

                    {/* Mobile close button */}
                    <button onClick={onClose} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* ── Main nav ─────────────────────────────── */}
                <nav className="flex-1 px-2 pt-3 space-y-0.5 overflow-y-auto overflow-x-hidden vyapar-scrollbar">
                    {filteredMenuItems.map(item => (
                        <NavLink
                            key={item.id}
                            to={`/admin/${item.id}`}
                            onClick={onClose}
                            title={!isExpanded ? item.label : undefined}
                            className={({ isActive }) => [
                                'group flex items-center rounded-xl transition-all duration-200 relative overflow-hidden',
                                // When collapsed → center icon; when expanded → left align with gap
                                isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-3',
                                isActive
                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-red-100'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                            ].join(' ')}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active left bar when collapsed */}
                                    {!isExpanded && isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-red-500 rounded-r-full" />
                                    )}

                                    {/* Icon */}
                                    <item.icon
                                        className="w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110"
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />

                                    {/* Label — only rendered when expanded */}
                                    {isExpanded && (
                                        <span className="text-sm font-bold whitespace-nowrap animate-fade-in">
                                            {item.label}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* ── Bottom section ────────────────────────── */}
                <div className="p-2 pb-3 space-y-2 shrink-0">
                    {/* Online Store */}
                    {canShowOnlineStore && (
                        <NavLink
                            to="/admin/online-store"
                            onClick={onClose}
                            title={!isExpanded ? 'Online Store' : undefined}
                            className={({ isActive }) => [
                                'relative overflow-hidden group cursor-pointer transition-all duration-300 rounded-2xl flex items-center',
                                isActive
                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-md shadow-red-100'
                                    : 'bg-gradient-to-r from-sky-500 to-blue-700 shadow-md shadow-sky-200/60',
                                isExpanded ? 'p-3 gap-3' : 'justify-center p-3',
                            ].join(' ')}
                        >
                            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0 relative">
                                <ShoppingCart className="w-[16px] h-[16px] text-white" />
                                {onlineOrdersCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center bg-red-500 text-[10px] font-black text-white rounded-full ring-2 ring-white shadow-lg animate-bounce duration-1000">
                                        {onlineOrdersCount > 9 ? '9+' : onlineOrdersCount}
                                    </span>
                                )}
                            </div>
                            {isExpanded && (
                                <span className="font-black text-sm text-white whitespace-nowrap animate-fade-in">
                                    Online Store
                                </span>
                            )}
                            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                        </NavLink>
                    )}

                    {/* User profile + logout */}
                    <div className={[
                        'flex items-center bg-slate-50 rounded-2xl border border-slate-100 transition-all duration-300',
                        isExpanded ? 'p-2.5 gap-2.5' : 'flex-col p-2 gap-2',
                    ].join(' ')}>
                        {/* Avatar — always use generated URL, never breaks */}
                        <div className="w-8 h-8 rounded-xl overflow-hidden border border-blue-100 shrink-0">
                            <img
                                src={avatarUrl || undefined}
                                alt={user?.name || 'Admin'}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Name + role — only visible when expanded */}
                        {isExpanded && (
                            <div className="flex flex-col min-w-0 flex-1 animate-fade-in">
                                <span className="text-xs font-black text-slate-900 truncate leading-tight">
                                    {user?.name || 'Admin'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                                    {user?.role || 'Admin'}
                                </span>
                            </div>
                        )}

                        {/* Logout button */}
                        <button
                            onClick={onLogout}
                            title="Logout"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Collapsed expand tab — right-edge button */}
                {collapsed && !hovered && (
                    <button
                        onClick={onToggleCollapse}
                        title="Expand sidebar"
                        className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-10 bg-white border border-slate-200 rounded-r-lg items-center justify-center text-slate-400 hover:text-slate-700 shadow-sm hover:shadow-md transition-all duration-200 z-10"
                    >
                        <ChevronRight className="w-3 h-3" />
                    </button>
                )}
            </aside>
        </>
    );
};

export default Sidebar;
