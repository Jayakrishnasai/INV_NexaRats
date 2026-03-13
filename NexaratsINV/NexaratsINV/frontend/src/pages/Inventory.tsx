import React, { useState } from 'react';
import { Search, Plus, Filter, Grid, List, Edit2, Trash2, X, Image as ImageIcon, Upload, TrendingUp, TrendingDown, Calculator, Eye, FileSpreadsheet, Download, Check, Tag, Package, Boxes, Shield, Camera, RefreshCw, ShieldCheck, DollarSign, Trash2 as TrashIcon, ChevronDown, Box, Scale, Droplet, Lock } from 'lucide-react';
import { Product, User } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Portal from '../components/Portal';
import { api } from '../services/api';
import ProductModal from '../components/ProductModal';


interface InventoryProps {
    products: Product[];
    onUpdate: (products: Product[]) => void;
    user?: User | null;
    onRefresh?: () => Promise<void>;
    onClose?: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpdate, user, onRefresh, onClose }) => {
    const isSuperAdmin = user?.role === 'Super Admin';
    const permissionLevel = isSuperAdmin ? 'manage' : (user?.permissions?.['inventory'] || 'none');
    const isReadOnly = !isSuperAdmin && permissionLevel === 'read';
    const canManageProducts = isSuperAdmin || permissionLevel === 'manage' || permissionLevel === 'cru';
    const canDeleteProducts = isSuperAdmin || permissionLevel === 'manage' || permissionLevel === 'cru';
    const [gstConfig] = useLocalStorage('nx_gst_config', {
        defaultRate: '18',
        enableCGST: true,
        enableSGST: true,
        enableIGST: false,
        taxInclusive: false,
    });

    const emptyForm: any = {
        name: '', category: '', price: '', purchasePrice: '', stock: '', sku: '', gstRate: gstConfig.defaultRate,
        unit: '', mrp: '', discountPercentage: '', profitPercentage: '', expiryDate: '', returns: 'Returnable', image: '',
        hsnCode: '', minStock: '10', taxType: 'Inclusive'
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [search, setSearch] = useState('');
    const [formData, setFormData] = useState({ ...emptyForm });

    // Sync default GST rate when config changes (only if not editing)
    React.useEffect(() => {
        if (!editingId) {
            setFormData(prev => ({ ...prev, gstRate: gstConfig.defaultRate }));
        }
    }, [gstConfig.defaultRate, editingId]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [showImportModal, setShowImportModal] = useState(false);
    const [reviewBeforeImport, setReviewBeforeImport] = useState(true);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [importPreview, setImportPreview] = useState<Product[] | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try { await onRefresh(); } finally { setTimeout(() => setRefreshing(false), 600); }
    };

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
    const statuses = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

    const handleSave = async () => {
        const stock = parseInt(formData.stock as string) || 0;
        const minStock = parseInt(formData.minStock as string) || 10;
        const status: Product['status'] = stock === 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'In Stock';

        const price = parseFloat(formData.price as string) || 0;
        const purchasePrice = parseFloat(formData.purchasePrice as string) || 0;
        const mrp = Number(formData.mrp) || 0;
        const gst = parseFloat(formData.gstRate as string) || 0;
        const revenue = formData.taxType === 'Inclusive' ? price / (1 + gst / 100) : price;

        const productData: Product = {
            id: editingId || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: formData.name,
            category: formData.category,
            price,
            purchasePrice,
            stock,
            status,
            sku: formData.sku || `${(formData.category || 'GEN').substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
            gstRate: gst,
            unit: formData.unit,
            mrp,
            discountPercentage: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
            expiryDate: formData.expiryDate,
            returns: formData.returns as Product['returns'],
            profit: revenue - purchasePrice,
            image: formData.image || '',
            hsnCode: formData.hsnCode,
            minStock: minStock,
            taxType: formData.taxType as 'Inclusive' | 'Exclusive'
        };

        if (editingId) {
            try {
                const updatedProduct = await api.products.update(editingId, productData);
                onUpdate(products.map(p => p.id === editingId ? updatedProduct : p));
                localStorage.setItem('inv_products_pulse', Date.now().toString()); // Pulse cross-tab listeners
            } catch (err) {
                console.error('Product update failed:', err);
                alert('Failed to update product. Please try again.');
                return;
            }
        } else {
            try {
                const createdProduct = await api.products.create(productData);
                onUpdate([...products, createdProduct]);
                localStorage.setItem('inv_products_pulse', Date.now().toString()); // Pulse cross-tab listeners
            } catch (err) {
                console.error('Product create failed:', err);
                alert('Failed to create product. Please try again.');
                return;
            }
        }
        closeModal();
    };

    const handleEdit = (product: Product) => {
        setFormData({
            name: product.name,
            category: product.category,
            price: product.price.toString(),
            purchasePrice: product.purchasePrice.toString(),
            stock: product.stock.toString(),
            sku: product.sku,
            gstRate: product.gstRate.toString(),
            unit: product.unit || 'Pieces',
            mrp: product.mrp?.toString() || '',
            discountPercentage: product.discountPercentage?.toString() || '',
            profitPercentage: product.purchasePrice > 0 ? (((product.price - product.purchasePrice) / product.purchasePrice) * 100).toFixed(1) : '',
            expiryDate: product.expiryDate || '',
            returns: product.returns || 'Returnable',
            image: product.image || '',
            hsnCode: product.hsnCode || '',
            minStock: product.minStock?.toString() || '10',
            taxType: product.taxType || 'Inclusive',
        });
        setEditingId(product.id);
        setShowAddModal(true);
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxDim = 400; // Optimized for performance and LocalStorage limits
                    let w = img.width;
                    let h = img.height;

                    if (w > h) { if (w > maxDim) { h *= maxDim / w; w = maxDim; } }
                    else { if (h > maxDim) { w *= maxDim / h; h = maxDim; } }

                    canvas.width = w;
                    canvas.height = h;
                    ctx?.drawImage(img, 0, 0, w, h);
                    const compressed = canvas.toDataURL('image/jpeg', 0.6); // Slightly higher compression
                    setFormData({ ...formData, image: compressed });
                    setIsUploading(false);
                };
                img.onerror = () => {
                    console.error('Image load failed');
                    setIsUploading(false);
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

        const originalProducts = [...products];
        // Optimistic update — remove from UI immediately
        onUpdate(products.filter(p => p.id !== id));

        try {
            await api.products.delete(id);
            localStorage.setItem('inv_products_pulse', Date.now().toString()); // Pulse cross-tab listeners
            // Refresh from server to ensure consistency
            if (onRefresh) await onRefresh();
        } catch (err: any) {
            console.error('Product delete failed:', err);
            alert(err?.message || 'Failed to delete product from database. Reverting...');
            onUpdate(originalProducts);
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ ...emptyForm });
    };

    if (permissionLevel === 'none') {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <Lock className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-bold leading-relaxed mb-10">
                    You do not have the required authority to access the inventory system. Please contact your administrator to upgrade your permissions.
                </p>
                <div className="flex gap-4">
                    {onClose ? (
                        <button onClick={onClose} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Go Back</button>
                    ) : (
                        <button onClick={() => window.history.back()} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Go Back</button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded border border-slate-100 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-sm text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <div className="flex bg-slate-100 p-1 rounded-sm">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-sm ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-slate-400'}`} title="Grid View"><Grid className="w-3 h-3" /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-sm ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-slate-400'}`} title="Table View"><List className="w-3 h-3" /></button>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-3 rounded-sm transition-all ${showFilters || selectedCategory !== 'All' || selectedStatus !== 'All' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            <Filter className="w-3 h-3" />
                        </button>

                        {showFilters && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)}></div>
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded shadow-2xl border border-slate-100 p-5 z-20 animate-in fade-in zoom-in duration-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">Filters</h4>
                                        <button
                                            onClick={() => { setSelectedCategory('All'); setSelectedStatus('All'); }}
                                            className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                                        >
                                            Reset All
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {categories.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setSelectedCategory(c)}
                                                        className={`px-3 py-2 rounded-sm text-[10px] font-bold text-left transition-all ${selectedCategory === c ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                                    >
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Stock Status</label>
                                            <div className="space-y-2">
                                                {statuses.map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setSelectedStatus(s)}
                                                        className={`w-full px-3 py-2 rounded-sm text-[10px] font-bold text-left transition-all ${selectedStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {canManageProducts && (
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-4 py-3 rounded-sm font-bold text-sm whitespace-nowrap hover:bg-slate-200 transition-all"
                        >
                            <Upload className="w-3 h-3 text-blue-600" /><span>Import</span>
                        </button>
                    )}

                    {onRefresh && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className={`p-3 rounded-sm transition-all ${refreshing ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            title="Refresh Products"
                        >
                            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}

                    {canManageProducts && (
                        <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-sm font-bold text-sm whitespace-nowrap shadow-lg shadow-blue-200">
                            <Plus className="w-3 h-3" /><span>Add Product</span>
                        </button>
                    )}
                </div>
            </div>

            {isReadOnly && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-orange-600 p-1.5 rounded-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-orange-900 uppercase">View Only Mode</p>
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">You have restricted access to inventory management</p>
                    </div>
                </div>
            )}

            {/* Product Display */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                    {filtered.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                            <div className="aspect-square bg-slate-50 rounded-sm mb-4 overflow-hidden relative flex items-center justify-center">
                                {p.image ? (
                                    <img
                                        src={p.image || undefined}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        alt={p.name}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 text-blue-600/20 font-black relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
                                        <Package className="w-12 h-12 mb-2 opacity-10" />
                                        <span className="text-4xl relative z-10 text-blue-600/60 drop-shadow-sm">{p.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                    </div>
                                )}
                                <span className={`absolute top-2 right-2 px-2 py-1 rounded-sm text-[10px] font-black uppercase ${p.status === 'In Stock' ? 'bg-green-100 text-green-600' : p.status === 'Low Stock' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                    }`}>{p.status}</span>
                            </div>
                            <h4 className="font-black text-slate-900 text-sm mb-1">{p.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold mb-2">{p.category} · SKU: {p.sku}</p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-black text-slate-900">₹{p.price}</p>
                                        {p.mrp > p.price && (
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-slate-400 line-through font-bold">₹{(p.mrp || 0)}</p>
                                                <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-black">
                                                    {((((p.mrp || 0) - (p.price || 0)) / (p.mrp || 1)) * 100).toFixed(1)}% OFF
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] font-bold text-slate-400 leading-none">Stock: {p.stock}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <ShieldCheck className="w-3 h-3 text-slate-300" />
                                                <p className="text-[9px] font-black text-slate-400 tracking-tighter uppercase">{p.gstRate}% {p.taxType}</p>
                                            </div>
                                        </div>
                                        <p className={`text-[10px] font-black ${(() => {
                                            const revenue = (p.taxType === 'Inclusive' ? (p.price || 0) / (1 + (p.gstRate || 0) / 100) : (p.price || 0));
                                            return (revenue - (p.purchasePrice || 0)) >= 0 ? 'text-emerald-600' : 'text-red-500';
                                        })()}`}>
                                            Profit: ₹{(() => {
                                                const revenue = (p.taxType === 'Inclusive' ? (p.price || 0) / (1 + (p.gstRate || 0) / 100) : (p.price || 0));
                                                return (revenue - (p.purchasePrice || 0)).toFixed(0);
                                            })()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    {canManageProducts && (
                                        <button onClick={() => handleEdit(p)} className="p-2 bg-blue-50 text-blue-600 rounded-sm hover:bg-blue-100"><Edit2 className="w-3 h-3" /></button>
                                    )}
                                    {canDeleteProducts && (
                                        <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-50 text-red-500 rounded-sm hover:bg-red-100"><Trash2 className="w-3 h-3" /></button>
                                    )}
                                    {isReadOnly && (
                                        <button className="p-2 bg-slate-50 text-slate-400 rounded-sm cursor-not-allowed" title="Read Only Access"><Lock className="w-3 h-3" /></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded border border-slate-100 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-4 lg:px-6 py-4">Product</th>
                                <th className="px-4 lg:px-6 py-4 hidden sm:table-cell text-left">Category</th>
                                <th className="px-4 lg:px-6 py-4 hidden sm:table-cell text-left">Returns</th>
                                <th className="px-4 lg:px-6 py-4">Sale Price</th>
                                <th className="px-4 lg:px-6 py-4 hidden md:table-cell">Profit / Unit</th>
                                <th className="px-4 lg:px-6 py-4 hidden md:table-cell">Buying Price</th>
                                <th className="px-4 lg:px-6 py-4 hidden lg:table-cell">Tax Details</th>
                                <th className="px-4 lg:px-6 py-4">Stock</th>
                                <th className="px-4 lg:px-6 py-4 hidden lg:table-cell">Status</th>
                                <th className="px-4 lg:px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 lg:px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            {p.image ? (
                                                <img
                                                    src={p.image || undefined}
                                                    className="w-10 h-10 rounded-sm object-cover"
                                                    alt={p.name}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 font-black text-sm border border-blue-100/50 shadow-sm shadow-blue-500/5">
                                                    {p.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{p.name}</p>
                                                {p.sku && <p className="text-[10px] text-slate-400">SKU: {p.sku}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-500 hidden sm:table-cell">{p.category}</td>
                                    <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${p.returns === 'Returnable' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                                            {p.returns || 'Non-Return'}
                                        </span>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm text-slate-900">₹{p.price}</span>
                                            {p.mrp > p.price && (
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 line-through font-bold">₹{p.mrp}</span>
                                                    <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-black">
                                                        {(((p.mrp - p.price) / p.mrp) * 100).toFixed(1)}% OFF
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                                        <div className="flex flex-col">
                                            <span className={`font-black text-sm ${(() => {
                                                const revenue = p.taxType === 'Inclusive' ? p.price / (1 + p.gstRate / 100) : p.price;
                                                return (revenue - p.purchasePrice) >= 0 ? 'text-emerald-600' : 'text-red-600';
                                            })()}`}>
                                                ₹{(() => {
                                                    const revenue = p.taxType === 'Inclusive' ? p.price / (1 + p.gstRate / 100) : p.price;
                                                    return (revenue - p.purchasePrice).toFixed(2);
                                                })()}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Net Earnings</span>
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 text-sm font-bold text-slate-500 hidden md:table-cell">₹{p.purchasePrice}</td>
                                    <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                                        <div className="flex flex-col">
                                            <span className="font-black text-[11px] text-slate-700">{p.gstRate}% GST</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{p.taxType}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 font-black text-sm">{p.stock}</td>
                                    <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'In Stock' ? 'bg-green-100 text-green-600' : p.status === 'Low Stock' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                            }`}>{p.status}</span>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4">
                                        <div className="flex space-x-2">
                                            {canManageProducts && (
                                                <button onClick={() => handleEdit(p)} className="p-2 bg-blue-50 text-blue-600 rounded-sm hover:bg-blue-100"><Edit2 className="w-3 h-3" /></button>
                                            )}
                                            {canDeleteProducts && (
                                                <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-50 text-red-500 rounded-sm hover:bg-red-100"><Trash2 className="w-3 h-3" /></button>
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
                </div>
            )}

            {showAddModal && (
                <Portal>
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <div className="bg-slate-50 rounded-[24px] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in zoom-in duration-300">
                            {/* Header */}
                            <div className="px-8 py-5 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-3">
                                        <div className="bg-white/20 p-1.5 rounded-lg">
                                            <Plus className="w-3 h-3 text-white" />
                                        </div>
                                        {editingId ? 'Modify Product' : 'Register New Item'}
                                    </h2>
                                    <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mt-0.5 ml-9">Inventory Management System</p>
                                </div>
                                <button onClick={closeModal} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"><X className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 scrollbar-hide bg-slate-50">
                                {/* SECTION 1: CORE INFORMATION */}
                                <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-6">
                                    <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
                                        <div className="bg-blue-100 p-1.5 rounded-lg">
                                            <Package className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Item Information</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                                            <input
                                                autoFocus
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full mt-1.5 px-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-lg shadow-sm"
                                                placeholder="e.g. Samsung Galaxy S24 Ultra"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                            <div className="relative mt-1.5">
                                                <input
                                                    type="text"
                                                    value={formData.category}
                                                    onFocus={() => setShowCategoryDropdown(true)}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, category: e.target.value });
                                                        setShowCategoryDropdown(true);
                                                    }}
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 shadow-sm"
                                                    placeholder="Search or Select Category"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    {showCategoryDropdown && formData.category && !['General', 'Dairy', 'Groceries', 'Personal Care', 'Beverages', 'Electronics', ...products.map(p => p.category)].includes(formData.category) && (
                                                        <div className="bg-emerald-500 p-0.5 rounded-lg animate-pulse" title="New Category Detected">
                                                            <Plus className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    )}
                                                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {showCategoryDropdown && (
                                                <>
                                                    <div className="fixed inset-0 z-[60]" onClick={() => setShowCategoryDropdown(false)}></div>
                                                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[70] max-h-48 overflow-y-auto p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-hide">
                                                        {Array.from(new Set(['General', 'Dairy', 'Groceries', 'Personal Care', 'Beverages', 'Electronics', ...products.map(p => p.category)]))
                                                            .filter(c => c.toLowerCase().includes(formData.category.toLowerCase()))
                                                            .map(c => (
                                                                <button
                                                                    key={c}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, category: c });
                                                                        setShowCategoryDropdown(false);
                                                                    }}
                                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${formData.category === c ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-600'}`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${formData.category === c ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                                        <Tag className={`w-3 h-3 ${formData.category === c ? 'text-white' : 'text-slate-400'}`} />
                                                                    </div>
                                                                    {c}
                                                                </button>
                                                            ))
                                                        }
                                                        {Array.from(new Set(['General', 'Dairy', 'Groceries', 'Personal Care', 'Beverages', 'Electronics', ...products.map(p => p.category)]))
                                                            .filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).length === 0 && (
                                                                <div className="p-3 text-center">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">New Category recognized</p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowCategoryDropdown(false)}
                                                                        className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all border border-emerald-100"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                        <span>Create "{formData.category}"</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                                            <div className="relative mt-1.5">
                                                <input
                                                    type="text"
                                                    value={formData.unit}
                                                    onFocus={() => setShowUnitDropdown(true)}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, unit: e.target.value });
                                                        setShowUnitDropdown(true);
                                                    }}
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 shadow-sm"
                                                    placeholder="Search Unit"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showUnitDropdown ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {showUnitDropdown && (
                                                <>
                                                    <div className="fixed inset-0 z-[60]" onClick={() => setShowUnitDropdown(false)}></div>
                                                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[70] max-h-48 overflow-y-auto p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-hide">
                                                        {[
                                                            { name: 'Pieces', icon: Tag },
                                                            { name: 'Kg', icon: Scale },
                                                            { name: 'Litre', icon: Droplet },
                                                            { name: 'Box', icon: Boxes },
                                                            { name: 'Pack', icon: Box },
                                                            { name: 'Gram', icon: Scale },
                                                            { name: 'Ml', icon: Droplet }
                                                        ]
                                                            .filter(u => u.name.toLowerCase().includes(formData.unit.toLowerCase()))
                                                            .map(u => (
                                                                <button
                                                                    key={u.name}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, unit: u.name });
                                                                        setShowUnitDropdown(false);
                                                                    }}
                                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${formData.unit === u.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-600'}`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${formData.unit === u.name ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                                        <u.icon className={`w-3 h-3 ${formData.unit === u.name ? 'text-white' : 'text-slate-400'}`} />
                                                                    </div>
                                                                    {u.name}
                                                                </button>
                                                            ))
                                                        }
                                                        {![
                                                            { name: 'Pieces', icon: Tag },
                                                            { name: 'Kg', icon: Scale },
                                                            { name: 'Litre', icon: Droplet },
                                                            { name: 'Box', icon: Boxes },
                                                            { name: 'Pack', icon: Box },
                                                            { name: 'Gram', icon: Scale },
                                                            { name: 'Ml', icon: Droplet }
                                                        ].filter(u => u.name.toLowerCase().includes(formData.unit.toLowerCase())).length && formData.unit && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowUnitDropdown(false)}
                                                                    className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 flex items-center gap-3"
                                                                >
                                                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                                        <Plus className="w-3 h-3" />
                                                                    </div>
                                                                    Add "{formData.unit}"
                                                                </button>
                                                            )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Code / SKU</label>
                                            <input
                                                value={formData.sku}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                className="w-full mt-1.5 px-5 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-600 shadow-sm"
                                                placeholder="Auto-generated"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HSN Code</label>
                                            <input
                                                value={formData.hsnCode}
                                                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                                className="w-full mt-1.5 px-5 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-600 shadow-sm"
                                                placeholder="Taxation Code"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* SECTION 2: PRICING & TAX LOGIC */}
                                <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-emerald-100 p-1.5 rounded-lg">
                                                <Calculator className="w-3 h-3 text-emerald-600" />
                                            </div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Pricing & Profit</h3>
                                        </div>
                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                                            {['Inclusive', 'Exclusive'].map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, taxType: t as any })}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.taxType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                                >
                                                    Tax {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Left Cost Card */}
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <TrendingDown className="w-2.5 h-2.5 text-emerald-500" /> Cost Basis
                                            </p>
                                            <div className="relative">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purchase Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.purchasePrice}
                                                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                                                    className="w-full mt-1.5 px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-slate-700 text-xl"
                                                    placeholder="0.00"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-2 ml-1">Base cost per unit paid to vendor</p>
                                            </div>
                                            <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[9px] font-black text-emerald-600/50 uppercase">Net Profit %</p>
                                                    <p className="text-xl font-black text-emerald-700">
                                                        {(() => {
                                                            const cost = parseFloat(formData.purchasePrice) || 0;
                                                            const price = parseFloat(formData.price) || 0;
                                                            const gst = parseFloat(formData.gstRate) || 0;
                                                            const revenue = formData.taxType === 'Inclusive' ? price / (1 + gst / 100) : price;
                                                            const profit = revenue - cost;
                                                            return cost > 0 ? ((profit / cost) * 100).toFixed(1) : '0.0';
                                                        })()}%
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-emerald-600/50 uppercase">Net Earnings / Unit</p>
                                                    <p className="text-xl font-black text-emerald-700">
                                                        ₹{(() => {
                                                            const cost = parseFloat(formData.purchasePrice) || 0;
                                                            const price = parseFloat(formData.price) || 0;
                                                            const gst = parseFloat(formData.gstRate) || 0;
                                                            const revenue = formData.taxType === 'Inclusive' ? price / (1 + gst / 100) : price;
                                                            return Math.max(0, revenue - cost).toFixed(2);
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Sales Card */}
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <TrendingUp className="w-2.5 h-2.5 text-blue-500" /> Selling Context
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MRP (Max Price)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={formData.mrp}
                                                            onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                                                            className="w-full mt-1.5 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-slate-600 shadow-sm"
                                                            placeholder="0.00"
                                                        />
                                                        <Tag className="absolute right-5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Rate (GST %)</label>
                                                    <div className="relative">
                                                        <select
                                                            value={formData.gstRate}
                                                            onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                                                            className="w-full mt-1.5 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-black text-slate-700 appearance-none shadow-sm"
                                                        >
                                                            {['0', '5', '12', '18', '28'].map(r => <option key={r} value={r}>{r}% GST Rate</option>)}
                                                        </select>
                                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <ChevronDown className="w-3 h-3 text-slate-300" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${formData.taxType === 'Inclusive' ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        Sale Price ({formData.taxType === 'Inclusive' ? 'Incl.' : 'Excl.'})
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={formData.price}
                                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                            className="w-full mt-1.5 px-4 py-4 border-2 border-blue-500/20 rounded-2xl outline-none focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 bg-blue-50/10 transition-all font-black text-blue-700 text-xl shadow-lg shadow-blue-500/5 placeholder:text-blue-200"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest ml-1 animate-pulse">Discount (%)</label>
                                                    <div className="relative group">
                                                        <input
                                                            type="number"
                                                            value={(() => {
                                                                const mrp = parseFloat(formData.mrp) || 0;
                                                                const price = parseFloat(formData.price) || 0;
                                                                return mrp > 0 ? (((mrp - price) / mrp) * 100).toFixed(1) : '';
                                                            })()}
                                                            onChange={(e) => {
                                                                const pct = parseFloat(e.target.value);
                                                                const mrp = parseFloat(formData.mrp);
                                                                if (!isNaN(pct) && !isNaN(mrp)) {
                                                                    const newPrice = mrp * (1 - pct / 100);
                                                                    setFormData({ ...formData, price: newPrice.toFixed(2) });
                                                                }
                                                            }}
                                                            className="w-full mt-1.5 px-5 py-4 bg-orange-50/30 border-2 border-orange-100/50 rounded-2xl outline-none focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5 transition-all font-black text-orange-700 text-xl shadow-sm placeholder:text-orange-200"
                                                            placeholder="0%"
                                                        />
                                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-orange-300 uppercase opacity-60">Off MRP</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50 flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <TrendingDown className="w-3 h-3 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-blue-600/50 uppercase leading-none">Net Customer Saving</p>
                                                        <p className="text-sm font-black text-blue-700 mt-1">
                                                            ₹{Math.max(0, (parseFloat(formData.mrp) || 0) - (parseFloat(formData.price) || 0)).toLocaleString()} Saved Per Unit
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dynamic Analysis Footer */}
                                    <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-4 items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                                    <ShieldCheck className="w-3 h-3 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Tax Impact</p>
                                                    <p className="text-[11px] font-black text-slate-700 leading-none">
                                                        {formData.gstRate}% {formData.taxType} (₹{(() => {
                                                            const price = parseFloat(formData.price) || 0;
                                                            const gst = parseFloat(formData.gstRate) || 0;
                                                            return formData.taxType === 'Inclusive' ? (price - (price / (1 + gst / 100))).toFixed(2) : ((price * gst) / 100).toFixed(2);
                                                        })()} Tax)
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="w-px h-8 bg-slate-100"></div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                                    <DollarSign className="w-3 h-3 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">True Sales Margin</p>
                                                    <p className="text-[11px] font-black text-slate-700 leading-none">
                                                        {(() => {
                                                            const cost = parseFloat(formData.purchasePrice) || 0;
                                                            const price = parseFloat(formData.price) || 0;
                                                            const gst = parseFloat(formData.gstRate) || 0;
                                                            const revenue = formData.taxType === 'Inclusive' ? price / (1 + gst / 100) : price;
                                                            return revenue > 0 ? (((revenue - cost) / revenue) * 100).toFixed(1) : '0.0';
                                                        })()}% Net
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-full border border-slate-100">
                                            Manual Entry Mode Active
                                        </div>
                                    </div>
                                </div>
                                {/* SECTION 3: STOCK & LOGISTICS */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-orange-100 p-1.5 rounded-lg">
                                                <Boxes className="w-3 h-3 text-orange-600" />
                                            </div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Stock Setup</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Stock</label>
                                                <input
                                                    type="number"
                                                    value={formData.stock}
                                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                                    className="w-full mt-1.5 px-5 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-black text-slate-700"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Low Stock Alert</label>
                                                <input
                                                    type="number"
                                                    value={formData.minStock}
                                                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                                                    className="w-full mt-1.5 px-5 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold text-slate-600"
                                                    placeholder="10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-purple-100 p-1.5 rounded-lg">
                                                <Shield className="w-3 h-3 text-purple-600" />
                                            </div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Governance</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.expiryDate}
                                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                                    className="w-full mt-1.5 px-4 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm text-slate-600"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-pink-100 p-1.5 rounded-lg">
                                                <RefreshCw className="w-3 h-3 text-pink-600" />
                                            </div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Return Policy</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-2 pt-1.5">
                                                {['Returnable', 'Not Returnable'].map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, returns: r as any })}
                                                        className={`py-4 px-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all flex items-center justify-between ${formData.returns === r ? 'border-pink-500 bg-pink-50/30 text-pink-600 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400 opacity-60'}`}
                                                    >
                                                        {r}
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.returns === r ? 'border-pink-500 bg-pink-500' : 'border-slate-200'}`}>
                                                            {formData.returns === r && <Check className="w-2.5 h-2.5 text-white" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 4: PRODUCT MEDIA */}
                                <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
                                        <div className="bg-pink-100 p-1.5 rounded-lg">
                                            <Camera className="w-3 h-3 text-pink-600" />
                                        </div>
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Product Media</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                        <div className="space-y-6">
                                            <div className="relative group">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Option 1: Paste Photo URL</label>
                                                <div className="mt-1.5 relative">
                                                    <input
                                                        type="text"
                                                        value={formData.image}
                                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-pink-500 rounded-2xl outline-none transition-all font-medium text-slate-500 pr-12 shadow-sm"
                                                        placeholder="https://images.unsplash.com/..."
                                                    />
                                                    <ImageIcon className="absolute right-5 top-4 w-3.5 h-3.5 text-slate-300" />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="h-px flex-1 bg-slate-50"></div>
                                                <span className="text-[8px] font-black text-slate-300 uppercase italic">OR</span>
                                                <div className="h-px flex-1 bg-slate-50"></div>
                                            </div>

                                            <div className="relative">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Option 2: Local Upload</label>
                                                <input
                                                    type="file"
                                                    id="product-photo-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                />
                                                <label
                                                    htmlFor="product-photo-upload"
                                                    className="mt-1.5 w-full flex items-center justify-center gap-3 px-5 py-4 bg-white border-2 border-slate-100 border-dashed rounded-2xl cursor-pointer hover:border-pink-400 hover:bg-pink-50/20 transition-all group"
                                                >
                                                    <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-500" />
                                                    <span className="text-xs font-black text-slate-500 group-hover:text-pink-600 uppercase tracking-widest">Browse Folders</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="aspect-square md:aspect-auto md:h-52 border-2 border-dashed border-slate-100 rounded-[32px] flex items-center justify-center bg-slate-50/30 shadow-inner overflow-hidden relative group">
                                            {formData.image ? (
                                                <>
                                                    <img src={formData.image || undefined} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button onClick={() => setFormData({ ...formData, image: '' })} className="bg-white p-3 rounded-2xl text-red-500 shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all active:scale-95"><TrashIcon className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center px-6">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                        <Camera className="w-3.5 h-3.5 text-slate-200" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-tight">Visual Preview Area</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer: Final Actions */}
                            <div className="px-8 py-6 bg-white border-t border-slate-100 flex items-center justify-end gap-6 sticky bottom-0 z-10">
                                <button
                                    onClick={closeModal}
                                    className="px-8 py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-all flex items-center gap-2"
                                >
                                    <X className="w-3 h-3" /> Cancel Process
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!formData.name}
                                    className="relative overflow-hidden px-10 py-4 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-[20px] shadow-2xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale group"
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        {editingId ? <RefreshCw className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                        {editingId ? 'Confirm Changes' : 'Initialize Item'}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )
            }

            {/* Image Preview Modal */}
            {
                previewImage && (
                    <Portal>
                        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                            <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg text-slate-500 hover:text-red-500 transition-colors z-10"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded" />
                            </div>
                        </div>
                    </Portal>
                )
            }
            {/* Import Items Modal */}
            {
                showImportModal && (
                    <Portal>
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col relative">
                                {/* Close Button */}
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportPreview(null);
                                    }}
                                    className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-sm transition-all z-10"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>

                                <div className="p-8 lg:p-12">
                                    <div className="text-center mb-10">
                                        <h2 className="text-3xl font-black text-slate-900 mb-3">Import Items</h2>
                                        <p className="text-slate-500 font-bold max-w-lg mx-auto">
                                            {importPreview ? `Review ${importPreview.length} items before importing` : 'Add products to your inventory using our Excel template.'}
                                        </p>
                                    </div>

                                    {importPreview ? (
                                        <div className="space-y-6">
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-100/80 sticky top-0 backdrop-blur-sm z-10 border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Item Name</th>
                                                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">SKU</th>
                                                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Price</th>
                                                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Stock</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                        {importPreview.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                                <td className="px-4 py-3 text-sm font-bold text-slate-800">{item.name}</td>
                                                                <td className="px-4 py-3 text-sm font-medium text-slate-500">{item.sku}</td>
                                                                <td className="px-4 py-3 text-sm font-black text-slate-900 text-right">₹{item.price.toFixed(2)}</td>
                                                                <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">
                                                                    <span className={`px-2 py-1 rounded text-xs ${item.stock <= item.minStock ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                                        {item.stock} {item.unit}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-100">
                                                <button
                                                    onClick={() => setImportPreview(null)}
                                                    disabled={isImporting}
                                                    className="px-6 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 font-bold text-sm transition-colors disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        setIsImporting(true);
                                                        try {
                                                            const sanitized = (importPreview || []).map(({ id, status, profit, ...rest }: any) => {
                                                                if (!['Inclusive', 'Exclusive'].includes(rest.taxType)) rest.taxType = 'Inclusive';
                                                                if (!['Returnable', 'Not Returnable'].includes(rest.returns)) rest.returns = 'Returnable';
                                                                if (!rest.unit) rest.unit = 'Pieces';
                                                                return rest;
                                                            });
                                                            const { results, failures } = await api.products.bulkCreate(sanitized);
                                                            onUpdate([...products, ...results]);
                                                            if (failures && failures.length > 0) {
                                                                alert(`Successfully imported ${results.length} items. ${failures.length} items were skipped (check for duplicate SKUs).`);
                                                            }
                                                            localStorage.setItem('inv_products_pulse', Date.now().toString()); // Pulse cross-tab listeners
                                                            setShowImportModal(false);
                                                            setImportPreview(null);
                                                        } catch (err: any) {
                                                            console.error('Bulk import failed', err, err.errors);
                                                            const errorsStr = err.errors ? '\n\nDetails:\n' + JSON.stringify(err.errors, null, 2).slice(0, 500) : '';
                                                            alert(`Import failed: ${err.message || 'Validation error'}${errorsStr}`);
                                                        } finally {
                                                            setIsImporting(false);
                                                        }
                                                    }}
                                                    disabled={isImporting}
                                                    className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-200 transition-all flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {isImporting ? (
                                                        <>
                                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                                            <span>Importing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="w-4 h-4" />
                                                            <span>Confirm Import</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-8 mb-10">
                                                {/* Excel Upload Card */}
                                                <div className="bg-white border-2 border-slate-100 rounded p-8 hover:border-green-500 transition-all group">
                                                    <div className="flex flex-col items-center text-center">
                                                        <div className="w-16 h-16 bg-green-50 rounded flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                                        </div>
                                                        <h3 className="text-xl font-black text-slate-900 mb-2">Upload Inventory Sheet</h3>
                                                        <p className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest">Bulk import items using .csv files.</p>

                                                        <input
                                                            type="file"
                                                            id="excel-import"
                                                            className="hidden"
                                                            accept=".csv"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = async (event) => {
                                                                        const rawText = event.target?.result as string;
                                                                        const text = rawText.replace(/^\uFEFF/, ''); // BOM removal
                                                                        const parseCSVLine = (line: string) => {
                                                                            const result = [];
                                                                            let current = '', inQuotes = false;
                                                                            for (let i = 0; i < line.length; i++) {
                                                                                if (line[i] === '"') inQuotes = !inQuotes;
                                                                                else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
                                                                                else current += line[i];
                                                                            }
                                                                            result.push(current.trim());
                                                                            return result;
                                                                        };

                                                                        const lines = text.split(/\r?\n/).filter(l => l.trim());
                                                                        if (lines.length < 2) return;

                                                                        const headers = parseCSVLine(lines[0]);
                                                                        const newProducts: Product[] = [];

                                                                        for (let i = 1; i < lines.length; i++) {
                                                                            const values = parseCSVLine(lines[i]);
                                                                            if (!values.join('').trim()) continue; // Skip totally empty lines
                                                                            const p: any = {};
                                                                            headers.forEach((h, idx) => {
                                                                                const key = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                                                                                const mapping: Record<string, string> = {
                                                                                    'name': 'name', 'productname': 'name', 'item': 'name', 'itemname': 'name',
                                                                                    'category': 'category', 'sku': 'sku', 'code': 'sku',
                                                                                    'hsncode': 'hsnCode', 'hsn': 'hsnCode',
                                                                                    'mrp': 'mrp', 'maximumretailprice': 'mrp',
                                                                                    'sellingprice': 'price', 'price': 'price', 'saleprice': 'price', 'rate': 'price',
                                                                                    'purchaseprice': 'purchasePrice', 'purchasecost': 'purchasePrice', 'costprice': 'purchasePrice', 'cost': 'purchasePrice',
                                                                                    'gstrate': 'gstRate', 'gst': 'gstRate', 'gstpercent': 'gstRate',
                                                                                    'taxtype': 'taxType', 'tax': 'taxType',
                                                                                    'stock': 'stock', 'quantity': 'stock', 'qty': 'stock', 'stockqty': 'stock',
                                                                                    'minstock': 'minStock', 'minimumstock': 'minStock', 'reorderpoint': 'minStock',
                                                                                    'unit': 'unit', 'expirydate': 'expiryDate', 'expiry': 'expiryDate',
                                                                                    'returns': 'returns', 'returnable': 'returns',
                                                                                    'description': 'description', 'details': 'description',
                                                                                    'imageurl': 'image', 'image': 'image', 'imagelink': 'image', 'photo': 'image',
                                                                                    'discount': 'discountPercentage', 'discountpercent': 'discountPercentage', 'discountpercentage': 'discountPercentage',
                                                                                };
                                                                                const targetKey = mapping[key] || key;
                                                                                let val = values[idx] || '';
                                                                                if (typeof val === 'string') val = val.replace(/<[^>]*>?/gm, ''); // Basic XSS sanitization
                                                                                if (['price', 'purchasePrice', 'stock', 'mrp', 'gstRate', 'minStock'].includes(targetKey)) {
                                                                                    val = parseFloat(val.toString().replace(/[^\d.-]/g, '')) || 0;
                                                                                }
                                                                                p[targetKey] = val;
                                                                            });

                                                                            // Robust normalization
                                                                            const price = parseFloat(p.price) || 0;
                                                                            const mrp = parseFloat(p.mrp) || price || 0;
                                                                            const stock = parseInt(p.stock) || 0;
                                                                            const minStock = parseInt(p.minStock) || 5;
                                                                            
                                                                            const finalName = (p.name || '').toString().trim();
                                                                            const finalSku = (p.sku || '').toString().trim() || `SKU-${Date.now().toString().substr(-6)}-${i}`;
                                                                            if (!finalName) continue; // Must have name to be valid product

                                                                            newProducts.push({
                                                                                ...p,
                                                                                name: finalName,
                                                                                sku: finalSku,
                                                                                category: (p.category || 'General').toString().trim(),
                                                                                price,
                                                                                purchasePrice: parseFloat(p.purchasePrice) || 0,
                                                                                mrp,
                                                                                stock,
                                                                                minStock,
                                                                                gstRate: parseFloat(p.gstRate) || 0,
                                                                                id: `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                                                                status: stock === 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'In Stock' as any,
                                                                                discountPercentage: (mrp > price && mrp > 0) ? Math.round(((mrp - price) / mrp) * 100) : 0,
                                                                            });
                                                                        }

                                                                        if (newProducts.length > 0) {
                                                                            if (reviewBeforeImport) {
                                                                                setImportPreview(newProducts);
                                                                            } else {
                                                                                // Direct import bypasses preview
                                                                                setIsImporting(true);
                                                                                try {
                                                                                    const sanitized = newProducts.map(({ id, status, profit, ...rest }: any) => {
                                                                                        if (!['Inclusive', 'Exclusive'].includes(rest.taxType)) rest.taxType = 'Inclusive';
                                                                                        if (!['Returnable', 'Not Returnable'].includes(rest.returns)) rest.returns = 'Returnable';
                                                                                        if (!rest.unit) rest.unit = 'Pieces';
                                                                                        return rest;
                                                                                    });
                                                                                    const { results, failures } = await api.products.bulkCreate(sanitized);
                                                                                    onUpdate([...products, ...results]);
                                                                                    if (failures && failures.length > 0) {
                                                                                        alert(`Successfully imported ${results.length} items. ${failures.length} items were skipped (check for duplicate SKUs).`);
                                                                                    }
                                                                                    localStorage.setItem('inv_products_pulse', Date.now().toString()); // Pulse cross-tab listeners
                                                    setShowImportModal(false);
                                                                                } catch (err: any) {
                                                                                    console.error('Bulk import failed', err, err.errors);
                                                                                    const errorsStr = err.errors ? '\n\nDetails:\n' + JSON.stringify(err.errors, null, 2).slice(0, 500) : '';
                                                                                    alert(`Import failed: ${err.message || 'Validation error'}${errorsStr}`);
                                                                                } finally {
                                                                                    setIsImporting(false);
                                                                                }
                                                                            }
                                                                        }
                                                                    };
                                                                    reader.readAsText(file);
                                                                }
                                                            }}
                                                        />

                                                        <label
                                                            htmlFor="excel-import"
                                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded font-black shadow-lg shadow-blue-100 transition-all mb-4 cursor-pointer flex items-center justify-center space-x-2"
                                                        >
                                                            <Upload className="w-4 h-4" />
                                                            <span>Upload CSV File</span>
                                                        </label>

                                                        <button
                                                            onClick={() => {
                                                                const headers = ['Name', 'Category', 'SKU', 'HSN Code', 'MRP', 'Selling Price', 'Purchase Price', 'GST Rate', 'Tax Type', 'Stock', 'Min Stock', 'Unit', 'Expiry Date', 'Returns', 'Description', 'Image URL'];
                                                                const sampleRows: string[][] = [];
                                                                
                                                                let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
                                                                sampleRows.forEach(row => {
                                                                    csvContent += row.join(",") + "\n";
                                                                });

                                                                const encodedUri = encodeURI(csvContent);
                                                                const link = document.createElement("a");
                                                                link.setAttribute("href", encodedUri);
                                                                link.setAttribute("download", "Nexarats_Inventory_Template.csv");
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                            className="flex items-center space-x-2 text-blue-600 font-black text-sm hover:underline"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            <span>Download Clean Template (.csv)</span>
                                                        </button>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-widest leading-loose">Supported format: .csv | Max file size: 5MB</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center pt-8 border-t border-slate-100">
                                                <label className="flex items-center space-x-3 cursor-pointer group">
                                                    <div
                                                        onClick={() => setReviewBeforeImport(!reviewBeforeImport)}
                                                        className={`w-5 h-5 rounded-sm flex items-center justify-center border-2 transition-all ${reviewBeforeImport ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'border-slate-300'}`}
                                                    >
                                                        {reviewBeforeImport && <Check className="w-3 h-3" />}
                                                    </div>
                                                    <span className="text-sm font-black text-slate-700 group-hover:text-blue-600 transition-colors">Review items before final import</span>
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Portal>
                )
            }
        </div >
    );
};

export default Inventory;


