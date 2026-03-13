import React, { useState, useMemo } from 'react';
import {
    ShoppingCart, Search, User, MapPin, Plus, Minus, X, ChevronRight,
    Package, LogOut, Home, Briefcase, MoreHorizontal, Check, Clock, Truck,
    CheckCircle, XCircle, ShoppingBag, Heart, ChevronDown, ArrowLeft,
    Phone, Mail, Edit2, Trash2, Lock, Grid, Tag, AlertCircle, Shield
} from 'lucide-react';
import { Product, StoreAddress, StoreCustomerProfile, PaymentMethod } from '../types';
import { api } from '../services/api';
import './Storefront.css';

type TabType = 'shop' | 'account' | 'orders' | 'addresses' | 'wishlist';

interface Props {
    products: Product[];
    loadingProducts: boolean;
    userPhone: string;
    sessionToken: string;
    customerProfile: StoreCustomerProfile | null;
    orders: any[];
    wishlistIds: string[];
    storeName: string;
    onCheckoutSuccess: (cart: any[], total: number, gst: number, name?: string, phone?: string, addr?: string, method?: PaymentMethod) => Promise<void>;
    onLogout: () => void;
    onUpdateProfile: (name: string, email: string) => void;
    onAddAddress: (a: Omit<StoreAddress, 'id'>) => Promise<any>;
    onUpdateAddress: (id: string, a: Partial<StoreAddress>) => void;
    onDeleteAddress: (id: string) => void;
    onReloadOrders: () => void;
    onToggleWishlist: (productId: string) => void;
    onBackToAdmin?: () => void;
    isLoggedIn: boolean;
    onRequireLogin: () => void;
    cart: { id: string; qty: number }[];
    setCart: React.Dispatch<React.SetStateAction<{ id: string; qty: number }[]>>;
}

const CATEGORY_ICONS: Record<string, string> = {
    All: '🛍️', Groceries: '🥦', Fruits: '🍎', Vegetables: '🥕',
    Dairy: '🥛', Snacks: '🍿', Beverages: '🧃', Bakery: '🍞',
    Meat: '🍗', Personal: '🧴', Household: '🧹', Electronics: '📱',
    Clothing: '👕', Health: '💊', Baby: '🍼', Pets: '🐾',
    Stationery: '📚', Sports: '⚽', Toys: '🧸', Other: '📦',
};
const getCatIcon = (cat: string) => CATEGORY_ICONS[cat] || '📦';

const STATUS_MAP: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    Pending: { icon: <Clock size={13} />, color: '#f59e0b', label: 'Pending' },
    Confirmed: { icon: <Check size={13} />, color: '#3b82f6', label: 'Confirmed' },
    Shipped: { icon: <Truck size={13} />, color: '#8b5cf6', label: 'Shipped' },
    Delivered: { icon: <CheckCircle size={13} />, color: '#10b981', label: 'Delivered' },
    Cancelled: { icon: <XCircle size={13} />, color: '#ef4444', label: 'Cancelled' },
};

const Storefront: React.FC<Props> = ({
    products, loadingProducts, userPhone, sessionToken,
    customerProfile, orders, wishlistIds, storeName,
    onCheckoutSuccess, onLogout,
    onUpdateProfile, onAddAddress, onUpdateAddress, onDeleteAddress, onReloadOrders, onToggleWishlist,
    isLoggedIn, onRequireLogin, cart, setCart
}) => {
    const [search, setSearch] = useState('');
    const [orderFilter, setOrderFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [activeCat, setActiveCat] = useState('All');
    const [cartOpen, setCartOpen] = useState(false);
    const [profileDropdown, setProfileDropdown] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Tab persistence
    const [tab, setTabState] = useState<TabType>(() => {
        const saved = sessionStorage.getItem('nx_store_tab');
        return (saved as TabType) || 'shop';
    });
    const setTab = (t: TabType) => { setTabState(t); sessionStorage.setItem('nx_store_tab', t); };

    // Checkout
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedAddr, setSelectedAddr] = useState<StoreAddress | null>(null);
    const [custName, setCustName] = useState(customerProfile?.name || '');
    const [custPhone, setCustPhone] = useState(userPhone);
    const [addrText, setAddrText] = useState('');
    const [payMethod, setPayMethod] = useState<PaymentMethod>('upi');
    const [checkoutDone, setCheckoutDone] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    // Razorpay Integration
    const [rzpConfig, setRzpConfig] = useState<{ enabled: boolean; keyId: string | null }>({ enabled: false, keyId: null });

    React.useEffect(() => {
        if (isLoggedIn && sessionToken) {
            const loadRzp = async () => {
                try {
                    const cfg = await api.auth.payment.getConfig(sessionToken);
                    setRzpConfig(cfg);
                    if (cfg.enabled) {
                        const script = document.createElement('script');
                        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                        script.async = true;
                        document.body.appendChild(script);
                    }
                } catch (err) { console.error('Failed to load Razorpay config', err); }
            };
            loadRzp();
        }
    }, [isLoggedIn, sessionToken]);

    // Address form
    const [showAddrForm, setShowAddrForm] = useState(false);
    const [editingAddr, setEditingAddr] = useState<StoreAddress | null>(null);
    const [addrForm, setAddrForm] = useState({ label: 'Home', name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
    const [addrLoading, setAddrLoading] = useState(false);

    // Profile edit
    const [editProfile, setEditProfile] = useState(false);
    const [profileName, setProfileName] = useState(customerProfile?.name || '');
    const [profileEmail, setProfileEmail] = useState(customerProfile?.email || '');

    // Password
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');

    // Sync profile data when props change
    React.useEffect(() => {
        if (customerProfile) {
            setCustName(customerProfile.name);
            setProfileName(customerProfile.name);
            setProfileEmail(customerProfile.email || '');
            if (customerProfile.addresses?.length > 0) {
                const def = customerProfile.addresses.find(a => a.isDefault) || customerProfile.addresses[0];
                setSelectedAddr(def);
                setAddrText(`${def.line1}${def.line2 ? ', ' + def.line2 : ''}, ${def.city}, ${def.state} - ${def.pincode}`);
            }
        }
    }, [customerProfile]);

    React.useEffect(() => {
        setCustPhone(userPhone);
    }, [userPhone]);

    const handleSetPassword = async () => {
        if (newPassword.length < 6) { setPwdError('Password must be at least 6 characters'); return; }
        if (newPassword !== confirmPassword) { setPwdError('Passwords do not match'); return; }
        setPwdLoading(true); setPwdError(''); setPwdSuccess('');
        try {
            await api.auth.setPassword(sessionToken, newPassword);
            setPwdSuccess('Password updated!');
            setNewPassword(''); setConfirmPassword('');
            setTimeout(() => { setShowPasswordForm(false); setPwdSuccess(''); }, 2000);
        } catch (err: any) { setPwdError(err.message || 'Failed'); }
        finally { setPwdLoading(false); }
    };

    const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
    const filtered = useMemo(() => products.filter(p => {
        const pName = p.name || '';
        const pCat = p.category || '';
        const searchLower = search.toLowerCase();
        const ms = pName.toLowerCase().includes(searchLower) || pCat.toLowerCase().includes(searchLower);
        const mc = activeCat === 'All' || pCat === activeCat;
        return ms && mc;
    }), [products, search, activeCat]);

    const getQty = (id: string) => cart.find(c => c.id === id)?.qty || 0;

    /* ── Allow adding to cart even if not logged in (require login only at checkout) ── */
    const addToCart = (p: Product) => {
        if (p.stock <= 0) return;

        const ex = cart.find(c => c.id === p.id);
        if (ex && ex.qty >= p.stock) {
            setToast({ msg: 'Stock limit reached', type: 'error' });
            setTimeout(() => setToast(null), 2500);
            return;
        }

        setCart(prev => {
            const existing = prev.find(c => c.id === p.id);
            if (existing) {
                return prev.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { id: p.id, qty: 1 }];
        });

        setToast({ msg: `Added ${p.name}`, type: 'success' });
        setTimeout(() => setToast(null), 2500);
    };
    const changeQty = (id: string, delta: number) => {
        setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
    };

    const resolved = useMemo(() => cart.map(c => {
        const p = products.find(pp => pp.id === c.id);
        if (!p) return null;
        const base = p.price * c.qty;
        const gstRate = p.gstRate || 0;
        const incl = p.taxType === 'Inclusive';
        const tax = incl ? base - base / (1 + gstRate / 100) : base * gstRate / 100;
        const total = incl ? base : base + tax;
        return { p, qty: c.qty, tax, total };
    }).filter(Boolean) as { p: Product; qty: number; tax: number; total: number }[], [cart, products]);

    const cartTotal = resolved.reduce((s, i) => s + i.total, 0);
    const cartTax = resolved.reduce((s, i) => s + i.tax, 0);
    const cartCount = resolved.reduce((s, i) => s + i.qty, 0);

    const openCheckout = () => {
        if (!isLoggedIn) { onRequireLogin(); return; }
        setCustName(customerProfile?.name || '');
        setCustPhone(userPhone);
        const def = customerProfile?.addresses?.find(a => a.isDefault);
        setSelectedAddr(def || null);
        setAddrText(def ? `${def.line1}${def.line2 ? ', ' + def.line2 : ''}, ${def.city}, ${def.state} - ${def.pincode}` : '');
        setCheckoutDone(false);
        setShowCheckout(true);
        setCartOpen(false);
    };

    const placeOrder = async () => {
        if (!selectedAddr && !addrText) {
            setToast({ msg: 'Please provide a delivery address', type: 'error' });
            return;
        }

        const addr = selectedAddr
            ? `${selectedAddr.line1}${selectedAddr.line2 ? ', ' + selectedAddr.line2 : ''}, ${selectedAddr.city}, ${selectedAddr.state} - ${selectedAddr.pincode}`
            : addrText;

        const saleItems = resolved.map(i => ({ ...i.p, quantity: i.qty }));
        const isOnlinePayment = payMethod !== 'cash';

        if (isOnlinePayment && rzpConfig.enabled && rzpConfig.keyId) {
            setCheckoutLoading(true);
            try {
                const order = await api.auth.payment.createOrder(sessionToken, cartTotal);
                const options = {
                    key: rzpConfig.keyId,
                    amount: order.amount,
                    currency: order.currency,
                    name: storeName,
                    description: `Order ${order.id}`,
                    order_id: order.id,
                    prefill: {
                        name: custName,
                        contact: custPhone,
                        email: customerProfile?.email || '',
                    },
                    handler: async (response: any) => {
                        try {
                            setCheckoutLoading(true);
                            const saleData = {
                                customerId: customerProfile?.id,
                                items: saleItems,
                                total: cartTotal,
                                gstAmount: cartTax,
                                method: payMethod,
                                date: new Date().toISOString(),
                                custName,
                                custPhone,
                                custAddress: addr,
                            };
                            await api.auth.payment.verify(
                                sessionToken,
                                response.razorpay_order_id,
                                response.razorpay_payment_id,
                                response.razorpay_signature,
                                saleData
                            );
                            setCheckoutDone(true);
                            setCart([]);
                            setToast({ msg: 'Payment successful! Order placed.', type: 'success' });
                            onReloadOrders();
                        } catch (err) {
                            setToast({ msg: 'Payment verification failed', type: 'error' });
                        } finally {
                            setCheckoutLoading(false);
                        }
                    },
                    modal: { ondismiss: () => setCheckoutLoading(false) },
                    theme: { color: '#6366f1' }
                };
                const win = window as any;
                if (win.Razorpay) {
                    new win.Razorpay(options).open();
                } else {
                    throw new Error('Razorpay SDK not loaded');
                }
            } catch (err) {
                setToast({ msg: 'Failed to initiate payment', type: 'error' });
                setCheckoutLoading(false);
            }
            return;
        }

        setCheckoutLoading(true);
        try {
            await onCheckoutSuccess(saleItems, cartTotal, cartTax, custName, custPhone, addr, payMethod as PaymentMethod);
            setCheckoutDone(true);
            setCart([]);
            setToast({ msg: 'Order placed successfully!', type: 'success' });
        } catch {
            setToast({ msg: 'Order failed. Please try again.', type: 'error' });
        }
        setCheckoutLoading(false);
    };

    const saveAddress = async () => {
        if (!addrForm.name || !addrForm.line1 || !addrForm.city || !addrForm.state || !addrForm.pincode) { alert('Please fill all required fields.'); return; }
        setAddrLoading(true);
        try {
            if (editingAddr) { await onUpdateAddress(editingAddr.id, addrForm); }
            else { await onAddAddress({ ...addrForm, isDefault: !customerProfile?.addresses?.length }); }
            setShowAddrForm(false); setEditingAddr(null);
            setAddrForm({ label: 'Home', name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
        } catch { alert('Failed to save address.'); }
        setAddrLoading(false);
    };
    const openAddAddr = () => { setEditingAddr(null); setAddrForm({ label: 'Home', name: customerProfile?.name || '', phone: userPhone, line1: '', line2: '', city: '', state: '', pincode: '' }); setShowAddrForm(true); };
    const openEditAddr = (a: StoreAddress) => { setEditingAddr(a); setAddrForm({ label: a.label, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode }); setShowAddrForm(true); };
    const getStatusInfo = (s: string) => STATUS_MAP[s] || STATUS_MAP['Pending'];

    // ──────────────────────────────────────────────────────────────
    //  RENDER
    // ──────────────────────────────────────────────────────────────
    return (
        <div className="sf-page">

            {/* ── HEADER ── */}
            <div className="sf-header">
                <div className="sf-header-inner">
                    <div className="sf-logo" onClick={() => setTab('shop')}>
                        <div className="sf-logo-icon">🛒</div>
                        <span>{storeName}</span>
                    </div>

                    <div className="sf-search">
                        <Search size={16} color="#9ca3af" />
                        <input placeholder={`Search in ${storeName}...`} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    {/* Desktop actions */}
                    <div className="sf-hdr-actions">
                        {/* Profile */}
                        <div style={{ position: 'relative' }}>
                            <button className="sf-hdr-btn" onClick={() => isLoggedIn ? setProfileDropdown(!profileDropdown) : onRequireLogin()}>
                                <User size={20} />
                                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    {isLoggedIn ? (customerProfile?.name?.split(' ')[0] || 'Account') : 'Login'}
                                    {isLoggedIn && <ChevronDown size={10} />}
                                </span>
                            </button>
                            {isLoggedIn && profileDropdown && <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 155 }} onClick={() => setProfileDropdown(false)} />
                                <div className="sf-profile-dropdown">
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                                        <div style={{ fontWeight: 800, fontSize: 14 }}>{customerProfile?.name || 'Customer'}</div>
                                        <div style={{ fontSize: 12, color: '#9ca3af' }}>+91 {userPhone}</div>
                                    </div>
                                    {[
                                        { icon: <User size={16} />, label: 'My Profile', action: () => { setTab('account'); setProfileDropdown(false); } },
                                        { icon: <Package size={16} />, label: 'My Orders', action: () => { setTab('orders'); onReloadOrders(); setProfileDropdown(false); } },
                                        { icon: <Heart size={16} />, label: 'My Wishlist', action: () => { setTab('wishlist'); setProfileDropdown(false); } },
                                        { icon: <MapPin size={16} />, label: 'My Addresses', action: () => { setTab('addresses'); setProfileDropdown(false); } },
                                    ].map((item, i) => (
                                        <button key={i} className="sf-dd-item" onClick={item.action}>{item.icon} {item.label}</button>
                                    ))}
                                    <div className="sf-dd-divider" />
                                    <button className="sf-dd-item danger" onClick={() => { setProfileDropdown(false); onLogout(); }}>
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            </>}
                        </div>

                        {/* Wishlist */}
                        <button className="sf-hdr-btn" onClick={() => isLoggedIn ? setTab('wishlist') : onRequireLogin()}>
                            <Heart size={20} fill={wishlistIds.length > 0 ? '#ef4444' : 'none'} color={wishlistIds.length > 0 ? '#ef4444' : 'currentColor'} />
                            {wishlistIds.length > 0 && <span className="sf-badge">{wishlistIds.length}</span>}
                            <span>Wishlist</span>
                        </button>
                    </div>

                    {/* Cart Button (Desktop) */}
                    <button className="sf-cart-btn" onClick={() => setCartOpen(true)}>
                        <ShoppingCart size={18} />
                        <span>{cartCount > 0 ? `${cartCount} item${cartCount > 1 ? 's' : ''}` : 'Cart'}</span>
                        {cartCount > 0 && <span>| ₹{Math.round(cartTotal)}</span>}
                    </button>
                </div>
            </div>

            {/* ── CATEGORY BAR ── */}
            <div className="sf-catbar">
                <div className="sf-catbar-inner">
                    {categories.map(cat => (
                        <button key={cat} className={`sf-cat-pill ${activeCat === cat ? 'active' : ''}`}
                            onClick={() => { setActiveCat(cat); setTab('shop'); }}>
                            <span className="sf-cat-emoji">{getCatIcon(cat)}</span>
                            <span>{cat}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── SHOP TAB ── */}
            {tab === 'shop' && (
                <div className="sf-body">
                    {/* Hero Banner */}
                    <div className="sf-hero">
                        <div className="sf-hero-text">
                            <div className="sf-hero-sub">Welcome back 👋</div>
                            <h2>Fresh Picks, Fast Delivery</h2>
                            <p>{customerProfile?.name ? `Hi ${customerProfile.name}!` : 'Shop your favourites'} • {loadingProducts ? 'Loading...' : `${products.length} items available`}</p>
                        </div>
                        <div className="sf-hero-emoji">🛒</div>
                    </div>

                    {loadingProducts ? (
                        <div className="sf-grid">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="sf-skeleton" style={{ height: 300 }} />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="sf-empty">
                            <div className="sf-empty-icon">🔍</div>
                            <div className="sf-empty-title">No products found</div>
                            <div className="sf-empty-sub">Try a different search or category</div>
                        </div>
                    ) : (
                        <>
                            <div className="sf-grid-info">
                                Showing <strong>{filtered.length}</strong> products {activeCat !== 'All' ? `in ${activeCat}` : ''}
                            </div>
                            <div className="sf-grid">
                                {filtered.map((p, index) => {
                                    const qty = getQty(p.id);
                                    const disc = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
                                    return (
                                        <div key={`${p.id}-${index}`} className={`sf-card ${qty > 0 ? 'in-cart' : ''}`} onClick={() => setSelectedProduct(p)}>
                                            <div className="sf-card-img">
                                                {p.image ? (
                                                    <img
                                                        src={p.image}
                                                        alt={p.name}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                                            if (fallback) fallback.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <span className="sf-img-fallback" style={{ display: p.image ? 'none' : 'flex' }}>
                                                    {getCatIcon(p.category)}
                                                </span>
                                                {disc > 0 && <span className="sf-disc-badge">{disc}% OFF</span>}
                                                <button className="sf-wish-btn" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}>
                                                    <Heart size={15} fill={wishlistIds.includes(p.id) ? '#ef4444' : 'none'} color={wishlistIds.includes(p.id) ? '#ef4444' : '#9ca3af'} />
                                                </button>
                                                {p.stock <= 0 && <div className="sf-oos-overlay">OUT OF STOCK</div>}
                                            </div>
                                            <div className="sf-card-body">
                                                <span className="sf-card-cat">{p.category}</span>
                                                <div className="sf-card-name">{p.name}</div>
                                                <div className="sf-card-unit-row">
                                                    {p.unit && <span className="sf-card-unit">{p.unit}</span>}
                                                    {p.returns === 'Returnable' && <span className="sf-return-badge">Returnable</span>}
                                                </div>
                                                <div className="sf-card-prices">
                                                    <span className="sf-card-price">₹{p.price}</span>
                                                    {p.mrp > p.price && <span className="sf-card-mrp">₹{p.mrp}</span>}
                                                    {disc > 0 && <span className="sf-card-off">{disc}% off</span>}
                                                </div>
                                                <div className="sf-card-tax">{p.taxType === 'Inclusive' ? 'Incl. GST' : `+ ${p.gstRate}% GST`}</div>
                                                {p.stock > 0 ? (
                                                    qty === 0 ? (
                                                        <button className="sf-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(p); }}>
                                                            <Plus size={15} /> Add
                                                        </button>
                                                    ) : (
                                                        <div className="sf-qty-row" onClick={e => e.stopPropagation()}>
                                                            <button className="sf-qty-btn" onClick={() => changeQty(p.id, -1)}>−</button>
                                                            <span className="sf-qty-num">{qty}</span>
                                                            <button className="sf-qty-btn" onClick={() => changeQty(p.id, 1)} disabled={qty >= p.stock}>+</button>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="sf-oos-badge">Out of Stock</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {tab === 'account' && (
                <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 12px' }}>
                    <div className="sf-profile-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
                            <div className="sf-profile-avatar">{(customerProfile?.name || userPhone || '?').charAt(0)?.toUpperCase() || '?'}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 2 }}>{customerProfile?.name || 'Customer'}</div>
                                <div style={{ fontSize: 13, opacity: .8, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> +91 {userPhone}</div>
                                {customerProfile?.email && <div style={{ fontSize: 12, opacity: .7, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> {customerProfile.email}</div>}
                            </div>
                            <button className="sf-btn-outline" style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 12, padding: '7px 12px' }}
                                onClick={() => setEditProfile(!editProfile)}>
                                <Edit2 size={12} /> {editProfile ? 'Cancel' : 'Edit'}
                            </button>
                        </div>
                    </div>

                    {editProfile && (
                        <div className="sf-section-card">
                            <div className="sf-section-title">Edit Profile</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div><label className="sf-label">Full Name</label><input className="sf-input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Enter your name" /></div>
                                <div><label className="sf-label">Email (optional)</label><input className="sf-input" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="Enter your email" /></div>
                                <button className="sf-btn-primary" onClick={() => { onUpdateProfile(profileName, profileEmail); setEditProfile(false); }}>Save Changes</button>
                            </div>
                        </div>
                    )}

                    <div className="sf-stats">
                        <div className="sf-stat-card"><div className="sf-stat-val">{customerProfile?.totalOrders || 0}</div><div className="sf-stat-label">Orders</div></div>
                        <div className="sf-stat-card"><div className="sf-stat-val">₹{(customerProfile?.totalSpent || 0).toLocaleString()}</div><div className="sf-stat-label">Spent</div></div>
                        <div className="sf-stat-card"><div className="sf-stat-val" style={{ color: '#ef4444' }}>{wishlistIds.length}</div><div className="sf-stat-label">Wishlist</div></div>
                    </div>

                    {/* Security */}
                    <div className="sf-section-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPasswordForm ? 12 : 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, background: '#f3f4f6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={18} color="#6b7280" /></div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>Account Security</div>
                            </div>
                            <button onClick={() => setShowPasswordForm(!showPasswordForm)} style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                                {showPasswordForm ? 'Close' : 'Set Password'}
                            </button>
                        </div>
                        {showPasswordForm && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                                <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Set a password to log in without WhatsApp OTP.</p>
                                <div><label className="sf-label">New Password</label><input type="password" className="sf-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" /></div>
                                <div><label className="sf-label">Confirm Password</label><input type="password" className="sf-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" /></div>
                                {pwdError && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{pwdError}</div>}
                                {pwdSuccess && <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>{pwdSuccess}</div>}
                                <button className="sf-btn-primary" disabled={pwdLoading} onClick={handleSetPassword}>{pwdLoading ? 'Updating...' : 'Save Password'}</button>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="sf-section-card">
                        <div className="sf-section-title">Quick Actions</div>
                        <div className="sf-quick-grid">
                            {[
                                { icon: <Package size={22} color="#3b82f6" />, label: 'My Orders', bg: '#eff6ff', action: () => { setTab('orders'); onReloadOrders(); } },
                                { icon: <Heart size={22} color="#ef4444" />, label: 'Wishlist', bg: '#fef2f2', action: () => setTab('wishlist') },
                                { icon: <MapPin size={22} color="#8b5cf6" />, label: 'Addresses', bg: '#f5f3ff', action: () => setTab('addresses') },
                            ].map((item, i) => (
                                <button key={i} className="sf-quick-btn" style={{ background: item.bg }} onClick={item.action}>
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button className="sf-btn-danger" onClick={onLogout}><LogOut size={18} /> Logout</button>
                </div>
            )}

            {/* ── ORDERS TAB ── */}
            {tab === 'orders' && (
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 12px' }}>
                    <div className="sf-back-header" style={{ marginBottom: 12 }}>
                        <button className="sf-back-btn" onClick={() => setTab('account')}><ArrowLeft size={20} /></button>
                        <h2>My Orders</h2>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <button className={`sf-pay-btn ${orderFilter === 'all' ? 'active' : ''}`} style={{ flex: 1, padding: '8px 0', fontSize: 13 }} onClick={() => setOrderFilter('all')}>All Orders</button>
                        <button className={`sf-pay-btn ${orderFilter === 'online' ? 'active' : ''}`} style={{ flex: 1, padding: '8px 0', fontSize: 13 }} onClick={() => setOrderFilter('online')}>Online</button>
                        <button className={`sf-pay-btn ${orderFilter === 'offline' ? 'active' : ''}`} style={{ flex: 1, padding: '8px 0', fontSize: 13 }} onClick={() => setOrderFilter('offline')}>In-Store</button>
                    </div>

                    {orders.filter(o => orderFilter === 'all' ? true : o.source === orderFilter).length === 0 ? (
                        <div className="sf-empty">
                            <div className="sf-empty-icon">📦</div>
                            <div className="sf-empty-title">No orders found</div>
                            <div className="sf-empty-sub">We couldn't find any {orderFilter !== 'all' ? orderFilter : ''} orders.</div>
                            <button className="sf-btn-primary" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setTab('shop')}>Start Shopping</button>
                        </div>
                    ) : orders.filter(o => orderFilter === 'all' ? true : o.source === orderFilter).map(order => {
                        const st = getStatusInfo(order.orderStatus || 'Pending');
                        return (
                            <div key={order.id} className="sf-order-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 15 }}>Order #{order.id}</div>
                                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{new Date(order.createdAt || order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    </div>
                                    <div className="sf-order-status" style={{ color: st.color }}>{st.icon} {st.label}</div>
                                </div>
                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                                    {(order.items || []).slice(0, 3).map((item: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', padding: '3px 0' }}>
                                            <span>{item.name} × {item.quantity || item.qty || 1}</span>
                                            <span style={{ fontWeight: 700 }}>₹{((item.price || 0) * (item.quantity || item.qty || 1)).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {(order.items || []).length > 3 && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>+{order.items.length - 3} more</div>}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>{order.method || 'UPI'} • {order.items?.length || 0} items</div>
                                    <div style={{ fontWeight: 900, fontSize: 16, color: '#4f46e5' }}>₹{(order.total || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── ADDRESSES TAB ── */}
            {tab === 'addresses' && (
                <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 12px' }}>
                    <div className="sf-back-header" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button className="sf-back-btn" onClick={() => setTab('account')}><ArrowLeft size={20} /></button>
                            <h2>My Addresses</h2>
                        </div>
                        <button className="sf-btn-outline" onClick={openAddAddr}><Plus size={14} /> Add New</button>
                    </div>
                    {(!customerProfile?.addresses || customerProfile.addresses.length === 0) ? (
                        <div className="sf-empty">
                            <MapPin size={48} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
                            <div className="sf-empty-title">No addresses saved</div>
                            <button className="sf-btn-primary" style={{ maxWidth: 200, margin: '16px auto 0' }} onClick={openAddAddr}><Plus size={14} /> Add Address</button>
                        </div>
                    ) : customerProfile.addresses.map(a => (
                        <div key={a.id} className={`sf-addr-card ${a.isDefault ? 'default' : ''}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    {a.label === 'Home' ? <Home size={14} /> : a.label === 'Work' ? <Briefcase size={14} /> : <MoreHorizontal size={14} />}
                                    <span style={{ fontWeight: 800, fontSize: 14 }}>{a.label}</span>
                                    {a.isDefault && <span className="sf-addr-default-badge">Default</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="sf-back-btn" onClick={() => openEditAddr(a)}><Edit2 size={15} /></button>
                                    <button className="sf-back-btn" style={{ color: '#ef4444' }} onClick={() => { if (confirm('Delete?')) onDeleteAddress(a.id); }}><Trash2 size={15} /></button>
                                </div>
                            </div>
                            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                                <div style={{ fontWeight: 600 }}>{a.name} • {a.phone}</div>
                                <div>{a.line1}{a.line2 ? ', ' + a.line2 : ''}</div>
                                <div>{a.city}, {a.state} - {a.pincode}</div>
                            </div>
                            {!a.isDefault && <button className="sf-btn-outline" style={{ marginTop: 8, fontSize: 12, padding: '5px 12px' }} onClick={() => onUpdateAddress(a.id, { isDefault: true })}>Set as Default</button>}
                        </div>
                    ))}
                </div>
            )}

            {/* ── WISHLIST TAB ── */}
            {tab === 'wishlist' && (
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 12px' }}>
                    <div className="sf-back-header">
                        <button className="sf-back-btn" onClick={() => setTab('shop')}><ArrowLeft size={20} /></button>
                        <h2>My Wishlist</h2>
                        <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>({wishlistIds.length})</span>
                    </div>
                    {wishlistIds.length === 0 ? (
                        <div className="sf-empty">
                            <Heart size={48} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
                            <div className="sf-empty-title">Your wishlist is empty</div>
                            <div className="sf-empty-sub">Save items you love to buy them later</div>
                            <button className="sf-btn-primary" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setTab('shop')}>Start Shopping</button>
                        </div>
                    ) : (
                        <div className="sf-grid">
                            {wishlistIds.map(pid => {
                                const p = products.find(pp => pp.id === pid);
                                if (!p) return null;
                                const qty = getQty(p.id);
                                const disc = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
                                return (
                                    <div key={p.id} className={`sf-card ${qty > 0 ? 'in-cart' : ''}`}>
                                        <button className="sf-wish-btn" onClick={() => onToggleWishlist(p.id)}>
                                            <Heart size={15} fill="#ef4444" color="#ef4444" />
                                        </button>
                                        <div className="sf-card-img">
                                            {p.image ? <img src={p.image} alt={p.name} /> : <span>{getCatIcon(p.category)}</span>}
                                            {disc > 0 && <span className="sf-disc-badge">{disc}% OFF</span>}
                                        </div>
                                        <div className="sf-card-body">
                                            <span className="sf-card-cat">{p.category}</span>
                                            <div className="sf-card-name">{p.name}</div>
                                            <div className="sf-card-prices">
                                                <span className="sf-card-price">₹{p.price}</span>
                                                {p.mrp > p.price && <span className="sf-card-mrp">₹{p.mrp}</span>}
                                            </div>
                                            {p.stock > 0 ? (
                                                qty === 0 ? <button className="sf-add-btn" onClick={() => addToCart(p)}><Plus size={15} /> Add</button>
                                                    : <div className="sf-qty-row"><button className="sf-qty-btn" onClick={() => changeQty(p.id, -1)}>−</button><span className="sf-qty-num">{qty}</span><button className="sf-qty-btn" onClick={() => changeQty(p.id, 1)}>+</button></div>
                                            ) : <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginTop: 6 }}>Out of Stock</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── CART DRAWER ── */}
            {cartOpen && <>
                <div className="sf-drawer-bg" onClick={() => setCartOpen(false)} />
                <div className="sf-drawer">
                    <div className="sf-drawer-header">
                        <h3>My Cart {cartCount > 0 && <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>({cartCount} items)</span>}</h3>
                        <button className="sf-close-btn" onClick={() => setCartOpen(false)}><X size={18} /></button>
                    </div>
                    <div className="sf-drawer-body">
                        {resolved.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                                <ShoppingBag size={48} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
                                <div style={{ color: '#9ca3af', fontWeight: 700, marginBottom: 16 }}>Your cart is empty</div>
                                <button className="sf-btn-primary" style={{ maxWidth: 180, margin: '0 auto' }} onClick={() => setCartOpen(false)}>Shop Now</button>
                            </div>
                        ) : resolved.map(item => (
                            <div key={item.p.id} className="sf-drawer-item">
                                <div className="sf-drawer-item-img">
                                    {item.p.image ? <img src={item.p.image} alt={item.p.name} /> : getCatIcon(item.p.category)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.p.name}</div>
                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>₹{item.p.price} × {item.qty}</div>
                                    <div className="sf-qty-row" style={{ marginTop: 6, maxWidth: 120 }}>
                                        <button className="sf-qty-btn" style={{ padding: '6px 0', fontSize: 16 }} onClick={() => changeQty(item.p.id, -1)}>−</button>
                                        <span className="sf-qty-num" style={{ fontSize: 13 }}>{item.qty}</span>
                                        <button className="sf-qty-btn" style={{ padding: '6px 0', fontSize: 16 }} onClick={() => changeQty(item.p.id, 1)}>+</button>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', marginTop: 4 }}>₹{Math.round(item.total)}</div>
                            </div>
                        ))}
                    </div>
                    {resolved.length > 0 && (
                        <div className="sf-drawer-footer">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#6b7280' }}>
                                <span>Subtotal ({cartCount} items)</span><span>₹{Math.round(cartTotal - cartTax)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: '#6b7280' }}>
                                <span>GST</span><span>₹{Math.round(cartTax)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 18, marginBottom: 16 }}>
                                <span>Total</span><span>₹{Math.round(cartTotal)}</span>
                            </div>
                            <button className="sf-btn-primary" onClick={openCheckout}>
                                {!isLoggedIn ? '🔐 Login to Checkout' : 'Proceed to Checkout →'}
                            </button>
                        </div>
                    )}
                </div>
            </>}

            {/* ── FLOATING CART (Mobile) ── */}
            {cartCount > 0 && !cartOpen && !showCheckout && tab === 'shop' && (
                <div className="sf-floating-cart" onClick={() => setCartOpen(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShoppingCart size={20} />
                        <span style={{ fontWeight: 800, fontSize: 14 }}>{cartCount} item{cartCount > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 900, fontSize: 16 }}>₹{Math.round(cartTotal)}</span>
                        <ChevronRight size={18} />
                    </div>
                </div>
            )}

            {/* ── BOTTOM NAVIGATION (Mobile) ── */}
            <div className="sf-bottomnav">
                {[
                    { id: 'shop' as TabType, icon: <Home size={22} />, label: 'Home' },
                    { id: 'wishlist' as TabType, icon: <Heart size={22} fill={wishlistIds.length > 0 ? '#ef4444' : 'none'} color={tab === 'wishlist' ? '#4f46e5' : wishlistIds.length > 0 ? '#ef4444' : '#9ca3af'} />, label: 'Wishlist', badge: wishlistIds.length || undefined },
                    { id: 'cart' as any, icon: <ShoppingCart size={22} />, label: 'Cart', badge: cartCount || undefined },
                    { id: 'orders' as TabType, icon: <Package size={22} />, label: 'Orders' },
                    { id: 'account' as TabType, icon: <User size={22} />, label: 'Account' },
                ].map(item => (
                    <button key={item.id} className={`sf-bnav-btn ${tab === item.id ? 'active' : ''}`}
                        onClick={() => {
                            if (item.id === 'cart') { setCartOpen(true); return; }
                            if (['account', 'orders', 'wishlist'].includes(item.id) && !isLoggedIn) { onRequireLogin(); return; }
                            setTab(item.id as TabType);
                            if (item.id === 'orders') onReloadOrders();
                        }}>
                        {item.icon}
                        {item.badge && item.badge > 0 && <span className="sf-badge">{item.badge}</span>}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>

            {/* ── CHECKOUT MODAL ── */}
            {showCheckout && (
                <div className="sf-overlay">
                    <div className="sf-modal" style={{ maxWidth: 700 }}>
                        {checkoutDone ? (
                            <div style={{ padding: 48, textAlign: 'center' }}>
                                <div style={{ width: 80, height: 80, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>✅</div>
                                <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px' }}>Order Placed!</h3>
                                <p style={{ color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>Thank you{customerProfile?.name ? ', ' + customerProfile.name : ''}! Your order is confirmed.</p>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button className="sf-btn-primary" style={{ width: 'auto' }} onClick={() => { setShowCheckout(false); setTab('orders'); onReloadOrders(); }}>View Orders</button>
                                    <button className="sf-btn-outline" onClick={() => setShowCheckout(false)}>Continue Shopping</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="sf-modal-header">
                                    <h3>Checkout</h3>
                                    <button className="sf-close-btn" onClick={() => setShowCheckout(false)}><X size={18} /></button>
                                </div>
                                <div className="sf-checkout-grid">
                                    <div className="sf-checkout-left">
                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📋 Contact Details</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                                            <div><label className="sf-label">Your Name</label><input className="sf-input" value={custName} onChange={e => setCustName(e.target.value)} placeholder="Full name" /></div>
                                            <div><label className="sf-label">Phone</label><input className="sf-input" value={custPhone} onChange={e => setCustPhone(e.target.value)} /></div>
                                        </div>

                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📍 Delivery Address</div>
                                        {customerProfile?.addresses && customerProfile.addresses.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                                {customerProfile.addresses.map(a => (
                                                    <div key={a.id} style={{ padding: 12, borderRadius: 10, border: selectedAddr?.id === a.id ? '2px solid #4f46e5' : '1px solid #e5e7eb', cursor: 'pointer', background: selectedAddr?.id === a.id ? '#e0e7ff' : '#fff', transition: 'all .2s' }}
                                                        onClick={() => { setSelectedAddr(a); setAddrText(`${a.line1}${a.line2 ? ', ' + a.line2 : ''}, ${a.city}, ${a.state} - ${a.pincode}`); }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                            <span style={{ fontWeight: 700, fontSize: 13 }}>{a.label}</span>
                                                            {a.isDefault && <span className="sf-addr-default-badge">Default</span>}
                                                            {selectedAddr?.id === a.id && <Check size={14} color="#4f46e5" style={{ marginLeft: 'auto' }} />}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: '#374151' }}>{a.name} • {a.line1}, {a.city}</div>
                                                    </div>
                                                ))}
                                                <button className="sf-btn-outline" style={{ fontSize: 12 }} onClick={openAddAddr}><Plus size={12} /> Add New Address</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                                <textarea className="sf-input" style={{ minHeight: 80, resize: 'none' } as any} value={addrText} onChange={e => setAddrText(e.target.value)} placeholder="Enter delivery address..." />
                                                <button className="sf-btn-outline" style={{ fontSize: 12 }} onClick={openAddAddr}><Plus size={12} /> Save Address to Profile</button>
                                            </div>
                                        )}

                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>💳 Payment Method</div>
                                        <div className="sf-pay-grid">
                                            {[{ v: 'upi', l: '📱 UPI' }, { v: 'cash', l: '💵 Cash' }, { v: 'card', l: '💳 Card' }, { v: 'bank_transfer', l: '🏦 Bank' }].map(m => (
                                                <button key={m.v} className={`sf-pay-btn ${payMethod === m.v ? 'active' : ''}`} onClick={() => setPayMethod(m.v as PaymentMethod)}>{m.l}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="sf-checkout-right">
                                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Order Summary</div>
                                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                            {resolved.map(item => (
                                                <div key={item.p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: '#374151' }}>
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{item.p.name} ×{item.qty}</span>
                                                    <span style={{ fontWeight: 700, flexShrink: 0 }}>₹{Math.round(item.total)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}><span>Subtotal</span><span>₹{Math.round(cartTotal - cartTax)}</span></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 8 }}><span>GST</span><span>₹{Math.round(cartTax)}</span></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 18, color: '#111827' }}><span>Total</span><span>₹{Math.round(cartTotal)}</span></div>
                                        </div>
                                        <button className="sf-btn-primary" disabled={!custName || (!selectedAddr && !addrText) || checkoutLoading} onClick={placeOrder}>
                                            {checkoutLoading ? 'Placing...' : '✓ Place Order'}
                                        </button>
                                        <button style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer', fontWeight: 600, textAlign: 'center' }} onClick={() => setShowCheckout(false)}>Cancel</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── ADDRESS FORM MODAL ── */}
            {showAddrForm && (
                <div className="sf-overlay">
                    <div className="sf-modal" style={{ maxWidth: 480 }}>
                        <div className="sf-modal-header">
                            <h3>{editingAddr ? 'Edit' : 'Add'} Address</h3>
                            <button className="sf-close-btn" onClick={() => setShowAddrForm(false)}><X size={18} /></button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label className="sf-label">Address Label</label>
                                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                    {['Home', 'Work', 'Other'].map(l => (
                                        <button key={l} className={`sf-pay-btn ${addrForm.label === l ? 'active' : ''}`} style={{ flex: 1 }}
                                            onClick={() => setAddrForm(p => ({ ...p, label: l }))}>{l}</button>
                                    ))}
                                </div>
                            </div>
                            <div><label className="sf-label">Full Name *</label><input className="sf-input" value={addrForm.name} onChange={e => setAddrForm(p => ({ ...p, name: e.target.value }))} placeholder="Recipient name" /></div>
                            <div><label className="sf-label">Phone *</label><input className="sf-input" value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile number" /></div>
                            <div><label className="sf-label">Address Line 1 *</label><input className="sf-input" value={addrForm.line1} onChange={e => setAddrForm(p => ({ ...p, line1: e.target.value }))} placeholder="House no, street, area" /></div>
                            <div><label className="sf-label">Address Line 2</label><input className="sf-input" value={addrForm.line2} onChange={e => setAddrForm(p => ({ ...p, line2: e.target.value }))} placeholder="Landmark (optional)" /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div><label className="sf-label">City *</label><input className="sf-input" value={addrForm.city} onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))} placeholder="City" /></div>
                                <div><label className="sf-label">State *</label><input className="sf-input" value={addrForm.state} onChange={e => setAddrForm(p => ({ ...p, state: e.target.value }))} placeholder="State" /></div>
                            </div>
                            <div><label className="sf-label">Pincode *</label><input className="sf-input" value={addrForm.pincode} onChange={e => setAddrForm(p => ({ ...p, pincode: e.target.value }))} placeholder="6-digit pincode" maxLength={6} /></div>
                            <button className="sf-btn-primary" onClick={saveAddress} disabled={addrLoading}>
                                {addrLoading ? 'Saving...' : editingAddr ? 'Update Address' : 'Save Address'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── PRODUCT DETAILS MODAL ── */}
            {selectedProduct && (
                <div className="sf-overlay" onClick={() => setSelectedProduct(null)}>
                    <div className="sf-modal sf-product-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
                        <button className="sf-modal-close-abs" onClick={() => setSelectedProduct(null)}><X size={24} /></button>
                        <div className="sf-product-detail-grid">
                            <div className="sf-product-detail-img">
                                {selectedProduct.image ? (
                                    <img
                                        src={selectedProduct.image}
                                        alt={selectedProduct.name}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div className="sf-img-fallback-large" style={{ display: selectedProduct.image ? 'none' : 'flex' }}>
                                    {getCatIcon(selectedProduct.category)}
                                </div>
                                {selectedProduct.mrp > selectedProduct.price && <div className="sf-detail-disc">{Math.round((1 - selectedProduct.price / selectedProduct.mrp) * 100)}% OFF</div>}
                            </div>
                            <div className="sf-product-detail-info">
                                <span className="sf-detail-cat">{selectedProduct.category}</span>
                                <h2 className="sf-detail-name">{selectedProduct.name}</h2>
                                {selectedProduct.unit && <div className="sf-detail-unit">{selectedProduct.unit}</div>}

                                <div className="sf-detail-price-row">
                                    <span className="sf-detail-price">₹{selectedProduct.price}</span>
                                    {selectedProduct.mrp > selectedProduct.price && <span className="sf-detail-mrp">₹{selectedProduct.mrp}</span>}
                                    <span className="sf-detail-gst">{selectedProduct.taxType === 'Inclusive' ? 'Incl. GST' : `+ ${selectedProduct.gstRate}% GST`}</span>
                                </div>

                                {selectedProduct.description && (
                                    <div className="sf-detail-desc-box">
                                        <div className="sf-detail-desc-title">Description</div>
                                        <p className="sf-detail-desc">{selectedProduct.description}</p>
                                    </div>
                                )}

                                <div className="sf-detail-policies">
                                    <div className="sf-policy-item">
                                        <div className={`sf-policy-icon ${selectedProduct.returns === 'Returnable' ? 'success' : 'warning'}`}>
                                            {selectedProduct.returns === 'Returnable' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                        </div>
                                        <div>
                                            <div className="sf-policy-label">{selectedProduct.returns === 'Returnable' ? 'Returnable' : 'Non-returnable'}</div>
                                            <div className="sf-policy-sub">{selectedProduct.returns === 'Returnable' ? 'Easy returns within 7 days' : 'Final sale, no returns'}</div>
                                        </div>
                                    </div>
                                    <div className="sf-policy-item">
                                        <div className="sf-policy-icon success">
                                            <Shield size={14} />
                                        </div>
                                        <div>
                                            <div className="sf-policy-label">Quality Assured</div>
                                            <div className="sf-policy-sub">100% genuine products</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
                                    {selectedProduct.stock > 0 ? (
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            {getQty(selectedProduct.id) === 0 ? (
                                                <button className="sf-btn-primary" style={{ flex: 1 }} onClick={() => addToCart(selectedProduct)}>
                                                    <ShoppingCart size={18} /> Add to Cart
                                                </button>
                                            ) : (
                                                <div className="sf-qty-row" style={{ flex: 1, height: 48 }}>
                                                    <button className="sf-qty-btn" style={{ fontSize: 24 }} onClick={() => changeQty(selectedProduct.id, -1)}>−</button>
                                                    <span className="sf-qty-num" style={{ fontSize: 18 }}>{getQty(selectedProduct.id)}</span>
                                                    <button className="sf-qty-btn" style={{ fontSize: 24 }} onClick={() => changeQty(selectedProduct.id, 1)} disabled={getQty(selectedProduct.id) >= selectedProduct.stock}>+</button>
                                                </div>
                                            )}
                                            <button className="sf-btn-wish" onClick={() => onToggleWishlist(selectedProduct.id)}>
                                                <Heart size={20} fill={wishlistIds.includes(selectedProduct.id) ? '#ef4444' : 'none'} color={wishlistIds.includes(selectedProduct.id) ? '#ef4444' : '#64748b'} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="sf-oos-box">
                                            <span>Out of Stock</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOAST ── */}
            {toast && (
                <div className={`sf-toast ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default Storefront;
