import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './layouts/Sidebar';
import Header from './layouts/Header';
import { useApp } from './context/AppContext';
import { SaasAuthProvider, useSaasAuth } from './context/SaasAuthContext';
import { api } from './services/api';
import { getLocalDateString } from './utils/date';
import { Product, Customer, Transaction, PaymentMethod, CartItem, OrderStatus, Page } from './types';
import { useNotificationEngine } from './hooks/useNotificationEngine';

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Billing = React.lazy(() => import('./pages/Billing'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Vendors = React.lazy(() => import('./pages/Vendors'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const OnlineStore = React.lazy(() => import('./pages/OnlineStore'));
const Storefront = React.lazy(() => import('./pages/Storefront'));
const Login = React.lazy(() => import('./pages/Login'));
const AdminAccess = React.lazy(() => import('./pages/AdminAccess'));
const StorefrontPage = React.lazy(() => import('./pages/StorefrontPage'));
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage'));
const BillingWall = React.lazy(() => import('./pages/BillingWall'));
const AllInvoices = React.lazy(() => import('./pages/AllInvoices'));
const InvoiceView = React.lazy(() => import('./pages/InvoiceView'));
import SettingsModal from './pages/settings/SettingsModal';
import AdminModal from './pages/AdminModal';
import { shortCustomerId } from './utils/shortId';
import { ErrorBoundary } from './components/ErrorBoundary';

// Protected Route Component (Security Hardening)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, dataLoaded } = useApp();
    if (!dataLoaded) return <div className="h-screen flex items-center justify-center font-black text-slate-400">Loading...</div>;
    if (!currentUser) return <Navigate to="/login" replace />;
    return <>{children}</>;
};


const AdminLayout: React.FC = () => {
    const {
        products, setProducts, customers, setCustomers, vendors, setVendors,
        transactions, setTransactions, purchases,
        currentUser, handleLogout, loadData, dataLoaded
    } = useApp();

    const SIDEBAR_KEY = 'inv_sidebar_collapsed';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; }
    });

    const handleToggleCollapse = useCallback(() => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { }
            return next;
        });
    }, []);

    const [showSettings, setShowSettings] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const navigate = useNavigate();

    const handlePageChange = useCallback((page: string) => {
        if (page === 'settings:manage' || page === 'settings') {
            setShowSettings(true);
            return;
        }
        if (page === 'user:manage' || page === 'admin-access' || page === 'admin') {
            setShowAdmin(true);
            return;
        }
        navigate(`/admin/${page}`);
    }, [navigate]);

    useEffect(() => { loadData(); }, [loadData]);

    // Fire real-time browser push + WhatsApp alerts based on notification settings
    useNotificationEngine({ products, customers, transactions });

    if (!dataLoaded) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#F8F9FC]">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <p className="text-slate-500 font-bold text-lg">Loading secure session...</p>
        </div>
    );

    const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    const lowStockCount = products.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock').length;

    const handleSaleWrapper = async (cart: CartItem[], total: number, gstAmount: number, custName?: string, custPhone?: string, custAddress?: string, source: 'online' | 'offline' = 'offline', paid?: number, method?: PaymentMethod, customerId?: string, couponDiscount: number = 0) => {
        const isMock = String(import.meta.env.VITE_USE_MOCKS).trim() === 'true';
        const localDate = getLocalDateString();
        const actualPaid = paid !== undefined ? Number(paid) : total;
        const subtotal = cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);

        if (!isMock) {
            // M2 FIX: single atomic call — backend handles stock, customer, and invoice in one DB transaction
            // Optimistic UI update first for instant feedback
            setProducts(prev => prev.map(p => {
                const update = cart.find(item => item.id === p.id);
                if (!update) return p;
                const ns = Math.max(0, p.stock - (update.quantity || 0));
                return { ...p, stock: ns, status: (ns === 0 ? 'Out of Stock' : ns < 10 ? 'Low Stock' : 'In Stock') as Product['status'] };
            }));

            try {
                // CRITICAL FIX: items must use camelCase keys matching Zod SaleItemSchema
                // (id, name, gstRate, taxType, discountPercentage) — NOT snake_case
                // Also: top-level fields must match CreateTransactionSchema
                const txnPayload: any = {
                    items: cart.map(i => ({
                        id: i.id,
                        name: i.name,
                        quantity: i.quantity || 1,
                        price: i.price,
                        purchasePrice: i.purchasePrice || 0,
                        gstRate: i.gstRate || 0,
                        taxType: i.taxType || 'Inclusive',
                        discountPercentage: i.discountPercentage || 0,
                    })),
                    subtotal,
                    gstAmount,
                    total,
                    couponDiscount,
                    paidAmount: actualPaid,
                    method: method || 'cash',
                    source,
                    date: localDate,
                    // Walk-in customer fields for server-side create-or-link
                    ...(customerId && customerId !== 'WALK-IN' ? { customerId } : {}),
                    ...(custName ? { custName } : {}),
                    ...(custPhone ? { custPhone } : {}),
                    ...(custAddress ? { custAddress } : {}),
                };
                const res: any = await api.transactions.create(txnPayload as any);
                const createdTxn = res?.transaction || res;

                // Update transactions list with server-confirmed record (unwrapped)
                if (createdTxn && createdTxn.id) {
                    setTransactions(prev => [createdTxn as any, ...prev]);
                }

                // CRITICAL: Refresh all data // Atomic success — reload fresh from DB 
                await loadData();
                localStorage.setItem('inv_products_pulse', Date.now().toString()); // Pulse cross-tab listeners
            } catch (err) {
                console.error('[SALE] Atomic transaction failed:', err);
                // On error, reload fresh data to reconcile any partial optimistic updates
                await loadData();
                throw err;
            }
            return;
        }

        // ── MOCK MODE: original 3-call fire-and-forget flow ─────────────────────
        // FIX H3: Update products AND persist from fresh state (no stale closure)
        setProducts(prev => {
            const updatedProducts = prev.map(p => {
                const update = cart.find(item => item.id === p.id);
                if (!update) return p;
                const ns = Math.max(0, p.stock - (update.quantity || 0));
                return { ...p, stock: ns, status: (ns === 0 ? 'Out of Stock' : ns < 10 ? 'Low Stock' : 'In Stock') as Product['status'] };
            });
            // Persist stock from fresh state — not stale outer closure
            api.products.bulkUpdate(
                updatedProducts.filter(p => cart.some(item => item.id === p.id))
                    .map(p => ({ id: p.id, stock: p.stock, status: p.status }))
            ).catch(err => {
                console.error('[SALE] Stock sync failed:', err);
                alert(`Stock sync failed: ${err.message || 'Unknown error'}`);
            });
            localStorage.setItem('inv_products_pulse', Date.now().toString()); // Pulse cross-tab listeners
            return updatedProducts;
        });

        // CUSTOMER SYNC: Link to customer and update their metrics
        let finalCustomerId = customerId || 'WALK-IN';
        let isNew = false;

        if (finalCustomerId === 'WALK-IN' && custName && custPhone) {
            const existing = customers.find(c => c.phone === custPhone);
            if (existing) {
                finalCustomerId = existing.id;
            } else {
                isNew = true;
                const newCustomer: Customer = {
                    id: shortCustomerId(), name: custName, phone: custPhone, email: '',
                    totalPaid: actualPaid, pending: Math.max(0, total - actualPaid),
                    status: (actualPaid >= total ? 'Paid' : 'Partial') as Customer['status'],
                    lastTransaction: localDate, totalInvoices: 1, address: custAddress || ''
                };
                finalCustomerId = newCustomer.id;
                setCustomers(prev => [...prev, newCustomer]);
                api.customers.create(newCustomer)
                    .then((res: any) => { if (res?.id) setCustomers(prev => prev.map(c => c.id === newCustomer.id ? { ...res } : c)); })
                    .catch(err => console.error('[SALE] Customer create failed:', err));
            }
        }

        if (finalCustomerId !== 'WALK-IN' && !isNew) {
            setCustomers(prev => prev.map(cust => {
                if (cust.id === finalCustomerId) {
                    const totalPending = Math.max(0, (cust.pending || 0) + (total - actualPaid));
                    const updatedCust = {
                        ...cust,
                        totalPaid: (cust.totalPaid || 0) + actualPaid,
                        pending: totalPending,
                        status: (totalPending <= 0 ? 'Paid' : 'Partial') as Customer['status'],
                        lastTransaction: localDate,
                        totalInvoices: (cust.totalInvoices || 0) + 1
                    };
                    api.customers.update(finalCustomerId, updatedCust).catch(err => console.error('[SALE] Customer update failed:', err));
                    return updatedCust;
                }
                return cust;
            }));
        }

        const newTxn: Transaction = {
            id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            customerId: finalCustomerId,
            items: [...cart],
            total, paidAmount: actualPaid, gstAmount, couponDiscount, date: localDate,
            method: method || 'cash', status: actualPaid >= total ? 'Paid' : 'Partial', source,
            timestamp: Date.now()
        };
        setTransactions(prev => [newTxn, ...prev]);
        api.transactions.create(newTxn)
            .then((res: any) => { if (res?.id) setTransactions(prev => prev.map(t => t.id === newTxn.id ? { ...res } : t)); })
            .catch(err => console.error('[SALE] Transaction save failed:', err));
    };

    const handleUpdateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, orderStatus: status } : t));
        api.transactions.update(id, { orderStatus: status }).catch(err => console.error('[ORDER] Status update failed:', err));

        // Auto-send WhatsApp Invoice on Delivery
        if (status === 'Delivered') {
            // Use functional update or ref to get LATEST transactions if needed, 
            // but for now, we'll try to find it in the current scope
            const txn = transactions.find(t => t.id === id);
            if (txn && txn.source === 'online') {
                try {
                    const adminProfile = JSON.parse(localStorage.getItem('inv_admin_profile') || '{}');
                    const invoiceConfig = JSON.parse(localStorage.getItem('nx_invoice_config') || '{}');
                    const onlineTheme = JSON.parse(localStorage.getItem('nx_online_theme') || '"vy_classic"');

                    const format = onlineTheme.startsWith('thermal_') ? 'thermal' : 'a4';

                    // Lookup customer phone if not on transaction
                    let finalPhone = txn.customerPhone || '';
                    if (!finalPhone && txn.customerId) {
                        const cust = customers.find(c => c.id === txn.customerId);
                        if (cust) finalPhone = cust.phone;
                    }

                    const billData = {
                        invoiceNumber: txn.id,
                        id: txn.id,
                        date: txn.date || new Date().toISOString(),
                        customerName: txn.customerName || 'Online Customer',
                        customerPhone: finalPhone,
                        items: (txn.items || []).map(item => ({
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            gstRate: item.gstRate || 0,
                            taxType: item.taxType || 'Exclusive',
                            hsnCode: (item as any).hsnCode || '',
                            unit: (item as any).unit || 'NOS',
                        })),
                        grandTotal: txn.total,
                        total: txn.total,
                        gstAmount: txn.gstAmount || 0,
                        paymentMode: txn.method || 'online',
                        couponDiscount: txn.couponDiscount || 0,
                        format,
                    };

                    const shopSettings = {
                        shopName: adminProfile.businessName || 'My Store',
                        address: adminProfile.address || '',
                        phone: adminProfile.phone || '',
                        email: adminProfile.email || '',
                        footer: invoiceConfig.footerText || 'Thank you for your business!',
                    };

                    if (finalPhone) {
                        await api.invoices.sendWhatsApp(billData, shopSettings, format);
                        console.log('[WHATSAPP] Auto-sent delivery invoice to', finalPhone);
                    } else {
                        console.warn('[WHATSAPP] Skip auto-send: No phone found for txn', id);
                    }
                } catch (err) {
                    console.error('[WHATSAPP] Failed to auto-send delivery invoice:', err);
                }
            }
        }
    }, [transactions, customers]);

    const location = useLocation();
    // Derive active page from current URL path so header title always reflects the current route
    const activePageFromRoute = ((): Page => {
        const path = location.pathname.replace('/admin/', '');
        if (path === 'billing') return 'billing';
        if (path === 'inventory') return 'inventory';
        if (path === 'customers') return 'customers';
        if (path === 'vendors') return 'vendors';
        if (path === 'analytics') return 'analytics';
        if (path === 'settings') return 'settings';
        if (path === 'online-store') return 'online-store';
        if (path === 'admin') return 'admin-access';
        if (path === 'all-invoices') return 'all-invoices';
        if (location.pathname.includes('/admin/invoice/')) return 'invoice:view';
        return 'dashboard';
    })();

    const onlineOrdersCount = React.useMemo(() => {
        return transactions.filter(t => t.source === 'online' && t.orderStatus === 'Pending').length;
    }, [transactions]);

    return (
        <div className="flex h-screen bg-[#F8F9FC] overflow-hidden admin-layout-enter">
            <Sidebar
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                user={currentUser}
                collapsed={sidebarCollapsed}
                onToggleCollapse={handleToggleCollapse}
                onlineOrdersCount={onlineOrdersCount}
            />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden admin-main-transition">
                <Header activePage={activePageFromRoute} onPageChange={handlePageChange} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={currentUser} onRefresh={loadData} products={products} customers={customers} transactions={transactions} />
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 vyapar-scrollbar">
                    <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-t-blue-600 rounded-full animate-spin"></div></div>}>
                        <ErrorBoundary>
                            <div key={location.pathname} className="page-enter admin-page-enter h-full">
                                <Routes>
                                    <Route index element={<Navigate to="dashboard" replace />} />
                                    <Route path="dashboard" element={<Dashboard onNavigateBilling={() => navigate('/admin/billing')} onNavigateAllInvoices={() => navigate('/admin/all-invoices')} onVisitStore={() => window.open('/', '_blank')} user={currentUser} onRefresh={loadData} />} />
                                    <Route path="billing" element={<Billing user={currentUser} products={products} customers={customers} onSaleSuccess={handleSaleWrapper} onRefresh={loadData} />} />
                                    <Route path="inventory" element={<Inventory user={currentUser} products={products} onUpdate={setProducts} onRefresh={loadData} />} />
                                    <Route path="customers" element={<Customers user={currentUser} customers={customers} transactions={transactions} onUpdate={setCustomers} onUpdateTransactions={setTransactions} onDelete={(id) => setCustomers(prev => prev.filter(c => c.id !== id))} onRefresh={loadData} />} />
                                    <Route path="all-invoices" element={<AllInvoices transactions={transactions} user={currentUser} onDelete={(id) => setTransactions(prev => prev.filter(t => t.id !== id))} onRefresh={loadData} />} />
                                    <Route path="invoice/:id" element={<InvoiceView />} />
                                    <Route path="vendors" element={<Vendors user={currentUser} vendors={vendors} purchases={purchases} onUpdate={setVendors} onDelete={(id) => setVendors(prev => prev.filter(v => v.id !== id))} onRefresh={loadData} />} />
                                    <Route path="analytics" element={<Analytics user={currentUser} products={products} customers={customers} vendors={vendors} transactions={transactions} onRefresh={loadData} />} />
                                    <Route path="online-store" element={<OnlineStore user={currentUser} onVisitStore={() => window.open('/', '_blank')} transactions={transactions.filter(t => t.source === 'online')} customers={customers} onUpdateOrderStatus={handleUpdateOrderStatus} products={products} />} />
                                    {/* admin and settings now open as modals */}
                                    <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
                                    <Route path="settings" element={<Navigate to="/admin/dashboard" replace />} />
                                </Routes>
                            </div>
                        </ErrorBoundary>
                    </Suspense>
                </main>
            </div>

            {/* Global Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                user={currentUser}
            />
            {/* Global Admin Panel Modal */}
            <AdminModal
                isOpen={showAdmin}
                onClose={() => setShowAdmin(false)}
                user={currentUser}
            />
        </div>
    );
};

const App: React.FC = () => {
    const { handleLogin, currentUser, loadData } = useApp();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser && window.location.pathname === '/login') {
            navigate('/admin/dashboard');
        }
    }, [currentUser, navigate]);

    return (
        <SaasAuthProvider>
            <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#F8F9FC]"><div className="w-12 h-12 border-4 border-t-indigo-600 rounded-full animate-spin"></div></div>}>
                <Routes>
                    <Route path="/" element={<StorefrontPage />} />
                    <Route path="/login" element={<Login onLogin={async (user) => { handleLogin(user); await loadData(); navigate('/admin/dashboard'); }} />} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route path="/billing-wall" element={<BillingWall />} />
                    <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </SaasAuthProvider>
    );
};

export default App;
