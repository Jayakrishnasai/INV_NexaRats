import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { Product, Customer, Vendor, Transaction, PurchaseOrder, User, Page } from '../types';
import { api } from '../services/api';
import { DEFAULT_PRODUCTS, DEFAULT_CUSTOMERS, DEFAULT_VENDORS, DEFAULT_USERS } from '../data/mockData';
import { useSessionStorage } from '../hooks/useSessionStorage';
import { useDailyReset } from '../hooks/useDailyReset';

// ─── Auth Context ─────────────────────────────────────────────────────────────
interface AuthContextType {
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    page: Page;
    setPage: (page: Page) => void;
    handleLogout: () => void;
    handleLogin: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Data Context ─────────────────────────────────────────────────────────────
interface DataContextType {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    vendors: Vendor[];
    setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    purchases: PurchaseOrder[];
    setPurchases: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    dataLoaded: boolean;
    loadData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ─── Auth Provider ────────────────────────────────────────────────────────────
const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [page, setPage] = useSessionStorage<Page>('inv_page', 'dashboard');
    const [currentUser, setCurrentUser] = useSessionStorage<User | null>('inv_user', null);

    const handleLogout = useCallback(() => {
        sessionStorage.removeItem('inv_user');
        sessionStorage.removeItem('inv_token');
        setCurrentUser(null);
        setPage('login');
    }, [setCurrentUser, setPage]);

    const handleLogin = useCallback((user: User) => {
        setCurrentUser(user);
        setPage('dashboard');
    }, [setCurrentUser, setPage]);

    const value = useMemo(() => ({
        currentUser, setCurrentUser, page, setPage, handleLogout, handleLogin
    }), [currentUser, page, handleLogout, handleLogin, setCurrentUser, setPage]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Data Provider ────────────────────────────────────────────────────────────
const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);

    const loadData = useCallback(async () => {
        const isMock = String(import.meta.env.VITE_USE_MOCKS).trim() === 'true';
        if (!isMock && !sessionStorage.getItem('inv_token')) {
            setDataLoaded(true);
            return;
        }

        try {
            const [prods, custs, vends, txns, purch, allUsers, remoteSettings] = await Promise.all([
                api.products.getAll().catch(e => { console.error('API Error (products):', e); return []; }),
                api.customers.getAll().catch(e => { console.error('API Error (customers):', e); return []; }),
                api.vendors.getAll().catch(e => { console.error('API Error (vendors):', e); return []; }),
                api.transactions.getAll().catch(e => { console.error('API Error (transactions):', e); return []; }),
                api.purchases.getAll().catch(e => { console.error('API Error (purchases):', e); return []; }),
                api.users.getAll().catch(e => { console.error('API Error (users):', e); return []; }),
                api.settings.get().catch(e => { console.error('API Error (settings):', e); return {}; }),
            ]);

            // M7 FIX: Clear old/stale setting keys before rehydrating to prevent
            // renamed settings from persisting indefinitely in localStorage
            if (remoteSettings && Object.keys(remoteSettings).length > 0) {
                // Remove old inv_setting_* keys that may no longer exist remotely
                Object.keys(localStorage)
                    .filter(k => k.startsWith('inv_setting') || k === 'shopSettings' || k === 'shop_settings')
                    .forEach(k => localStorage.removeItem(k));
                Object.entries(remoteSettings).forEach(([key, value]) => {
                    localStorage.setItem(key, JSON.stringify(value));
                });
            }

            const isMock = String(import.meta.env.VITE_USE_MOCKS).trim() === 'true';

            if (isMock) {
                if (prods.length === 0) {
                    await api.products.seed(DEFAULT_PRODUCTS).catch((err) => console.error('[SEED] Products:', err));
                    setProducts(DEFAULT_PRODUCTS);
                } else setProducts(prods);
                if (custs.length === 0) {
                    await api.customers.seed(DEFAULT_CUSTOMERS).catch((err) => console.error('[SEED] Customers:', err));
                    setCustomers(DEFAULT_CUSTOMERS);
                } else setCustomers(custs);
                if (vends.length === 0) {
                    await api.vendors.seed(DEFAULT_VENDORS).catch((err) => console.error('[SEED] Vendors:', err));
                    setVendors(DEFAULT_VENDORS);
                } else setVendors(vends);

                const defaultPassword = import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || 'demo1234';
                const needsReseed = allUsers.length === 0 || allUsers.every((u: any) => !u.password);
                if (needsReseed) {
                    const usersWithPasswords = DEFAULT_USERS.map((u) => ({ ...u, password: defaultPassword }));
                    await api.users.seed(usersWithPasswords).catch((err) => console.error('[SEED] Users:', err));
                }
            } else {
                setProducts(prods);
                setCustomers(custs);
                setVendors(vends);
            }

            setTransactions(txns);
            setPurchases(purch);

            // Auto-sync session user in case permissions or status changed centrally
            const sessionStr = sessionStorage.getItem('inv_user');
            if (sessionStr && allUsers && allUsers.length > 0) {
                try {
                    const sessionUser = JSON.parse(sessionStr);
                    const freshUser = allUsers.find((u: any) => u.id === sessionUser.id);
                    if (freshUser) {
                        const isChanged = freshUser.role !== sessionUser.role ||
                            JSON.stringify(freshUser.permissions) !== JSON.stringify(sessionUser.permissions) ||
                            freshUser.status !== sessionUser.status ||
                            freshUser.status === 'Inactive';

                        if (isChanged) {
                            if (freshUser.status === 'Inactive') {
                                // If they were deactivated, they will be logged out by AuthContext handling null
                                sessionStorage.removeItem('inv_user');
                                window.dispatchEvent(new CustomEvent('session_storage_update', { detail: { key: 'inv_user', newValue: null } }));
                            } else {
                                const updatedSession = { ...sessionUser, role: freshUser.role, permissions: freshUser.permissions };
                                const newValue = JSON.stringify(updatedSession);
                                sessionStorage.setItem('inv_user', newValue);
                                window.dispatchEvent(new CustomEvent('session_storage_update', { detail: { key: 'inv_user', newValue } }));
                            }
                        }
                    } else {
                        // User deleted
                        sessionStorage.removeItem('inv_user');
                        window.dispatchEvent(new CustomEvent('session_storage_update', { detail: { key: 'inv_user', newValue: null } }));
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }

            setDataLoaded(true);
        } catch (error) {
            console.error('Failed to load application data:', error);
            setDataLoaded(true);
        }
    }, []);

    // Daily reset: detects new day, re-syncs frontend, triggers 23:59 analytics backup
    useDailyReset({
        loadData,
        products,
        customers,
        vendors,
        transactions,
        setCustomers,
        setVendors,
        setTransactions,
        setPurchases
    });

    // Real-time sync across tabs — H3 FIX: debounced so rapid localStorage pulses
    // (e.g. after a bulk CSV import) don't fire 7 API calls per event
    React.useEffect(() => {
        loadData();
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key && e.key.startsWith('inv_')) {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    loadData();
                    debounceTimer = null;
                }, 1500);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [loadData]);

    const value = useMemo(() => ({
        products, setProducts,
        customers, setCustomers,
        vendors, setVendors,
        transactions, setTransactions,
        purchases, setPurchases,
        dataLoaded, loadData,
    }), [products, customers, vendors, transactions, purchases, dataLoaded, loadData]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// ─── Combined Provider (backwards-compatible) ─────────────────────────────────
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
    <AuthProvider>
        <DataProvider>
            {children}
        </DataProvider>
    </AuthProvider>
);

// ─── Granular Hooks ───────────────────────────────────────────────────────────
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AppProvider');
    return context;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within AppProvider');
    return context;
};

// ─── Backwards-compatible composite hook ─────────────────────────────────────
export const useApp = () => {
    const auth = useAuth();
    const data = useData();
    return { ...auth, ...data };
};
