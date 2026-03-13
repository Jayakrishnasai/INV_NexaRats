import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Phone, Mail, X, Building2, Upload, ChevronDown, Eye, ArrowLeft, MoreVertical, Calendar, Clock, CreditCard, ShieldCheck, MapPin, Printer, Send, FileText, Check, FileSpreadsheet, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Vendor, PurchaseOrder, User } from '../types';
import Portal from '../components/Portal';
import { api } from '../services/api';
import { usePagination } from '../hooks/usePagination';
import { getLocalDateString } from '../utils/date';
import { shortVendorId } from '../utils/shortId';


interface VendorsProps {
    vendors: Vendor[];
    purchases: PurchaseOrder[];
    onUpdate: React.Dispatch<React.SetStateAction<Vendor[]>>;
    onDelete?: (id: string) => void;
    user?: User | null;
    onRefresh?: () => Promise<void>;
}

const Vendors: React.FC<VendorsProps> = ({ vendors, purchases, onUpdate, onDelete, user, onRefresh }) => {
    const isSuperAdmin = user?.role === 'Super Admin';
    const permissionLevel = isSuperAdmin ? 'manage' : (user?.permissions?.['vendors'] || 'none');
    const isReadOnly = !isSuperAdmin && permissionLevel === 'read';
    const canManageVendors = isSuperAdmin || permissionLevel === 'manage' || permissionLevel === 'cru';
    const canDeleteVendors = isSuperAdmin || permissionLevel === 'manage' || permissionLevel === 'cru';
    const [search, setSearch] = useState('');
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showFilter, setShowFilter] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid' | 'pending'>('all');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', businessName: '', gstNumber: '', phone: '', email: '', image: '', totalBill: '', totalPaid: '', pendingAmount: '' });
    const [refreshing, setRefreshing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
    const [purchaseForm, setPurchaseForm] = useState({
        vendorId: '',
        date: getLocalDateString(),
        amount: '',
        paidAmount: '',
        status: 'Paid' as 'Paid' | 'Partial' | 'Unpaid',
        referenceNo: '',
        notes: '',
        image: '',
    });
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);

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
                    const compressed = canvas.toDataURL('image/jpeg', 0.6);
                    setFormData({ ...formData, image: compressed });
                    setIsUploading(false);
                };
                img.onerror = () => {
                    console.error('Vendor image load failed');
                    setIsUploading(false);
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try { await onRefresh(); } finally { setTimeout(() => setRefreshing(false), 600); }
    };

    // Prefer displayId (e.g. V9m4p), fallback to shortened id
    const formatId = (id: string, displayId?: string) => {
        if (displayId) return displayId;
        if (!id) return 'N/A';
        if (id.length <= 6 && /^[CV]/.test(id)) return id; // already short C/V id
        const parts = id.split('-');
        if (parts.length >= 2) return `${parts[0]}-...${id.slice(-4)}`;
        return id.length > 12 ? `...${id.slice(-8)}` : id;
    };

    const searchFiltered = vendors.filter(v =>
        (v.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.businessName || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.phone || '').includes(search)
    );

    const filtered = useMemo(() => searchFiltered.filter(v => {
        switch (activeFilter) {
            case 'paid': return v.pendingAmount === 0 && v.totalPaid > 0;
            case 'partial': return v.pendingAmount > 0 && v.totalPaid > 0;
            case 'unpaid': return v.totalPaid === 0;
            case 'pending': return v.pendingAmount > 0;
            default: return true;
        }
    }), [searchFiltered, activeFilter]);

    const vPagination = usePagination(filtered, 25);
    useEffect(() => { vPagination.resetPage(); }, [search, activeFilter]);

    const handleEdit = (vendor: Vendor) => {
        setFormData({
            name: vendor.name,
            businessName: vendor.businessName,
            gstNumber: vendor.gstNumber,
            phone: vendor.phone,
            email: vendor.email,
            image: vendor.image || '',
            totalBill: ((vendor.totalPaid || 0) + (vendor.pendingAmount || 0)).toString(),
            totalPaid: (vendor.totalPaid || 0).toString(),
            pendingAmount: (vendor.pendingAmount || 0).toString(),
        });
        setEditingId(vendor.id);
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ name: '', businessName: '', gstNumber: '', phone: '', email: '', image: '', totalBill: '', totalPaid: '', pendingAmount: '' });
    };

    const handleSave = () => {
        const isEdit = !!editingId;
        const vendorData: any = {
            id: editingId || shortVendorId(),
            name: formData.name,
            businessName: formData.businessName,
            phone: formData.phone,
            totalPaid: parseFloat(formData.totalPaid) || 0,
            pendingAmount: parseFloat(formData.pendingAmount) || 0,
        };

        if (formData.gstNumber) vendorData.gstNumber = formData.gstNumber;
        if (formData.email) vendorData.email = formData.email;
        if (formData.image) vendorData.image = formData.image;

        if (isEdit) {
            onUpdate(prev => prev.map(v => v.id === editingId ? (vendorData as Vendor) : v));
            api.vendors.update(editingId, vendorData).catch(err => console.error('Vendor update sync error:', err));
        } else {
            const tempId = vendorData.id;
            onUpdate(prev => [...prev, (vendorData as Vendor)]);
            api.vendors.create({
                name: vendorData.name,
                businessName: vendorData.businessName,
                gstNumber: vendorData.gstNumber,
                phone: vendorData.phone,
                email: vendorData.email,
                image: vendorData.image,
                totalPaid: vendorData.totalPaid,
                pendingAmount: vendorData.pendingAmount,
            }).then((created) => {
                onUpdate(prev => prev.map(v => v.id === tempId ? created : v));
            }).catch(err => console.error('Vendor create sync error:', err));
        }
        closeModal();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) return;
        try {
            await api.vendors.delete(id);
            if (onDelete) onDelete(id);
            else onUpdate(prev => prev.filter(v => v.id !== id));
            onRefresh?.();
        } catch (err: any) {
            console.error('Vendor delete sync error:', err);
            alert(err.message || 'Failed to delete vendor. They may have existing records.');
        }
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === filtered.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filtered.map(v => v.id));
        }
    };

    const toggleRow = (id: string) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const selectedVendor = vendors.find(v => v.id === selectedVendorId);

    const openAddPurchaseModal = (presetVendorId?: string) => {
        setPurchaseForm({
            vendorId: presetVendorId || selectedVendorId || '',
            date: getLocalDateString(),
            amount: '',
            paidAmount: '',
            status: 'Paid',
            referenceNo: '',
            notes: '',
            image: '',
        });
        setShowAddPurchaseModal(true);
    };

    const handleAddPurchase = async () => {
        const vendorId = purchaseForm.vendorId || selectedVendorId;
        if (!vendorId) return;
        const amount = parseFloat(purchaseForm.amount);
        if (isNaN(amount) || amount <= 0) return;
        const paidAmount = purchaseForm.paidAmount ? parseFloat(purchaseForm.paidAmount) : undefined;
        try {
            await api.purchases.create({
                vendorId,
                amount,
                date: purchaseForm.date,
                status: purchaseForm.status,
                ...(paidAmount !== undefined && purchaseForm.status === 'Partial' && { paidAmount }),
                ...(purchaseForm.referenceNo.trim() && { referenceNo: purchaseForm.referenceNo.trim() }),
                ...(purchaseForm.notes.trim() && { notes: purchaseForm.notes.trim() }),
            });
            setShowAddPurchaseModal(false);
            onRefresh?.();
        } catch (err) {
            console.error('Purchase create error:', err);
        }
    };

    if (permissionLevel === 'none') {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-purple-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <Building2 className="w-10 h-10 text-purple-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-bold leading-relaxed mb-10">
                    You do not have the required authority to access the vendor management system. Please contact your administrator to upgrade your permissions.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => window.history.back()} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Go Back</button>
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Retry Access</button>
                </div>
            </div>
        );
    }

    if (selectedVendorId && selectedVendor) {
        const vendorPurchases = purchases.filter(p => p.vendorId === selectedVendorId);

        const computedTotalPaid = vendorPurchases.reduce((sum, p) => {
            if (p.paidAmount != null) return sum + p.paidAmount;
            if (p.status === 'Paid') return sum + (p.amount || 0);
            if (p.status === 'Partial') return sum + ((p.amount || 0) / 2);
            return sum;
        }, 0);

        const computedPendingAmount = vendorPurchases.reduce((sum, p) => {
            if (p.paidAmount != null) return sum + ((p.amount || 0) - p.paidAmount);
            if (p.status === 'Unpaid') return sum + (p.amount || 0);
            if (p.status === 'Partial') return sum + ((p.amount || 0) / 2);
            return sum;
        }, 0);

        const displayTotalPaid = Math.max(selectedVendor.totalPaid || 0, computedTotalPaid);
        const displayPendingAmount = Math.max(selectedVendor.pendingAmount || 0, computedPendingAmount);

        return (
            <>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Profile Header */}
                    <div className="bg-white p-6 lg:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 relative overflow-hidden">
                        <button
                            onClick={() => setSelectedVendorId(null)}
                            className="absolute top-6 left-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-sm transition-all"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </button>

                        {selectedVendor.image ? (
                            <img src={selectedVendor.image || undefined} alt={selectedVendor.name} className="w-20 h-20 rounded object-cover shrink-0 mt-8 md:mt-0" />
                        ) : (
                            <div className="w-20 h-20 bg-purple-50 rounded flex items-center justify-center font-black text-purple-600 text-3xl shrink-0 mt-8 md:mt-0 uppercase">
                                {selectedVendor.name?.charAt(0) || 'V'}
                            </div>
                        )}

                        <div className="flex-1 text-center md:text-left mt-8 md:mt-0">
                            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-2">
                                <h2 className="text-3xl font-black text-slate-900">{selectedVendor.name}</h2>
                                <span className="w-fit mx-auto md:mx-0 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {selectedVendor.businessName}
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-sm font-bold text-slate-400">
                                <div className="flex items-center space-x-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                                    <span title={selectedVendor.id}>{formatId(selectedVendor.id, selectedVendor.displayId)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>{selectedVendor.phone}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>{selectedVendor.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        {[
                            { label: 'Total Paid', value: `₹${displayTotalPaid.toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
                            { label: 'Pending Amount', value: `₹${displayPendingAmount.toLocaleString()}`, icon: Clock, color: 'text-red-500', bg: 'bg-red-50' },
                            { label: 'Total Purchases', value: Math.max(selectedVendor.totalInvoices || 0, vendorPurchases.length).toString(), icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
                            { label: 'Last Payment', value: selectedVendor.lastTransaction || 'No history', icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-50' },
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
                                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <h3 className="text-xl font-black text-slate-900">Recent Purchases</h3>
                                    <div className="flex items-center space-x-4 w-full md:w-auto">
                                        {canManageVendors && (
                                            <button
                                                type="button"
                                                onClick={() => openAddPurchaseModal(selectedVendorId)}
                                                className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-black transition-all shrink-0"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Purchase
                                            </button>
                                        )}
                                        <div className="relative flex-1 md:w-64">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input placeholder="Search purchases..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-sm text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-visible sm:overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-5">PO ID</th>
                                                <th className="px-8 py-5">Date</th>
                                                <th className="px-8 py-5">Amount</th>
                                                <th className="px-8 py-5">Status</th>
                                                <th className="px-8 py-5">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {vendorPurchases.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold">No purchase history found for this vendor.</td>
                                                </tr>
                                            ) : (
                                                vendorPurchases.slice(0, 5).map((t, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                                <span className="font-bold text-sm text-slate-900">{t.displayId || t.id.split('-')[0]}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-sm font-bold text-slate-500">{t.date}</td>
                                                        <td className="px-8 py-6 text-sm font-black text-slate-900">₹{(t.amount || 0).toLocaleString()}</td>
                                                        <td className="px-8 py-6 text-sm">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.status === 'Paid' ? 'bg-green-100 text-green-600' :
                                                                t.status === 'Partial' ? 'bg-orange-100 text-orange-600' :
                                                                    'bg-red-100 text-red-600'
                                                                }`}>
                                                                {t.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === t.id ? null : t.id); }}
                                                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                                >
                                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                                </button>
                                                                {actionMenuId === t.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                                                                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1 w-40 animate-in fade-in zoom-in-95 duration-150">
                                                                            <button
                                                                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                                                onClick={() => { setActionMenuId(null); /* View details — future */ }}
                                                                            >
                                                                                <Eye className="w-3 h-3" /> View Details
                                                                            </button>
                                                                            {t.image && (
                                                                                <button
                                                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                                                    onClick={() => {
                                                                                        setActionMenuId(null);
                                                                                        const newWindow = window.open();
                                                                                        if (newWindow) {
                                                                                            newWindow.document.write(`<img src="${t.image}" alt="Purchase Receipt" style="max-width:100%; height:auto;" />`);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <ImageIcon className="w-3 h-3" /> View Image
                                                                                </button>
                                                                            )}
                                                                            {canManageVendors && (
                                                                                <button
                                                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                                                                    onClick={() => {
                                                                                        setActionMenuId(null);
                                                                                        if (window.confirm('Delete this purchase record?')) {
                                                                                            api.purchases.delete(t.id).then(() => onRefresh?.()).catch(console.error);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" /> Delete
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </>
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
                                    <p className="text-xs font-bold text-slate-400">Showing {Math.min(1, vendorPurchases.length)} to {Math.min(5, vendorPurchases.length)} of {vendorPurchases.length} entries</p>
                                    <div className="flex space-x-2">
                                        <button className="w-10 h-10 flex items-center justify-center rounded-sm bg-slate-50 text-slate-400 font-bold hover:bg-slate-100 transition-all border border-slate-100">1</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Section */}
                        <div className="space-y-6">
                            {/* Business Information */}
                            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Business Information</h4>
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">Vendor ID</p>
                                            <p className="text-sm font-black text-slate-900" title={selectedVendor.id}>{formatId(selectedVendor.id, selectedVendor.displayId)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">Business Name</p>
                                            <p className="text-sm font-bold text-slate-900">{selectedVendor.businessName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">GST Number</p>
                                            <p className="text-sm font-mono font-bold text-slate-600">{selectedVendor.gstNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">Contact Details</p>
                                            <p className="text-sm font-bold text-slate-900 leading-relaxed">
                                                {selectedVendor.phone}<br />
                                                {selectedVendor.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-50">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Financial Summary</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">Total Paid</span>
                                            <span className="text-sm font-black text-green-600">₹{displayTotalPaid.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">Outstanding Balance</span>
                                            <span className="text-sm font-black text-red-500">₹{displayPendingAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">Purchase Orders</span>
                                            <span className="text-xs font-black text-slate-900">{vendorPurchases.length} Orders</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>
                {showAddPurchaseModal && (
                    <Portal>
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddPurchaseModal(false)}>
                            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-black text-slate-900">Add Purchase</h3>
                                {!selectedVendorId && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendor</label>
                                        <select
                                            value={purchaseForm.vendorId}
                                            onChange={e => setPurchaseForm(f => ({ ...f, vendorId: e.target.value }))}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold"
                                        >
                                            <option value="">Select vendor</option>
                                            {vendors.map(v => (
                                                <option key={v.id} value={v.id}>{v.name} ({formatId(v.id, v.displayId)})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
                                    <input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount (₹)</label>
                                    <input type="number" min="0" step="0.01" value={purchaseForm.amount} onChange={e => setPurchaseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                                    <select value={purchaseForm.status} onChange={e => setPurchaseForm(f => ({ ...f, status: e.target.value as 'Paid' | 'Partial' | 'Unpaid' }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold">
                                        <option value="Paid">Paid</option>
                                        <option value="Partial">Partial</option>
                                        <option value="Unpaid">Unpaid</option>
                                    </select>
                                </div>
                                {purchaseForm.status === 'Partial' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paid amount (₹)</label>
                                        <input type="number" min="0" step="0.01" value={purchaseForm.paidAmount} onChange={e => setPurchaseForm(f => ({ ...f, paidAmount: e.target.value }))} placeholder="0.00" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold" />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference / PO #</label>
                                    <input type="text" value={purchaseForm.referenceNo} onChange={e => setPurchaseForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="Optional" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</label>
                                    <textarea value={purchaseForm.notes} onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" rows={2} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold resize-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Purchase Image (optional)</label>
                                    <div className="flex items-center gap-3">
                                        {purchaseForm.image ? (
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                                                <img src={purchaseForm.image} alt="Purchase" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setPurchaseForm(f => ({ ...f, image: '' }))}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 cursor-pointer hover:bg-slate-50 transition-all">
                                                <Upload className="w-4 h-4" />
                                                <span>Upload Image</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                const img = new Image();
                                                                img.src = reader.result as string;
                                                                img.onload = () => {
                                                                    const canvas = document.createElement('canvas');
                                                                    const ctx = canvas.getContext('2d');
                                                                    const maxDim = 400;
                                                                    let w = img.width, h = img.height;
                                                                    if (w > h) { if (w > maxDim) { h *= maxDim / w; w = maxDim; } } else { if (h > maxDim) { w *= maxDim / h; h = maxDim; } }
                                                                    canvas.width = w; canvas.height = h;
                                                                    ctx?.drawImage(img, 0, 0, w, h);
                                                                    setPurchaseForm(f => ({ ...f, image: canvas.toDataURL('image/jpeg', 0.6) }));
                                                                };
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowAddPurchaseModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-xl">Cancel</button>
                                    <button type="button" onClick={handleAddPurchase} className="flex-1 py-3 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700">Save</button>
                                </div>
                            </div>
                        </div>
                    </Portal>
                )}
            </>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded border border-slate-100 shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-sm text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                        <div className="relative">
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className={`flex items-center space-x-2 p-3 rounded-sm font-bold text-sm transition-all ${activeFilter !== 'all'
                                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                {activeFilter !== 'all' && (
                                    <span className="text-xs">{filtered.length}</span>
                                )}
                                <ChevronDown className={`w-3 h-3 transition-transform ${showFilter ? 'rotate-180' : ''}`} />
                            </button>
                            {showFilter && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowFilter(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-sm shadow-xl border border-slate-100 z-40 py-2 overflow-hidden">
                                        <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Status</p>
                                        {[
                                            { key: 'all', label: 'All Vendors', color: 'text-slate-600' },
                                            { key: 'paid', label: 'Fully Paid', color: 'text-green-600' },
                                            { key: 'partial', label: 'Partially Paid', color: 'text-yellow-600' },
                                            { key: 'unpaid', label: 'Unpaid', color: 'text-slate-500' },
                                            { key: 'pending', label: 'Has Pending', color: 'text-red-600' },
                                        ].map(f => (
                                            <button
                                                key={f.key}
                                                onClick={() => { setActiveFilter(f.key as any); setShowFilter(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm font-bold flex items-center justify-between transition-colors ${activeFilter === f.key ? 'bg-blue-50 text-blue-700' : `hover:bg-slate-50 ${f.color}`
                                                    }`}
                                            >
                                                <span>{f.label}</span>
                                                {activeFilter === f.key && <span className="text-blue-500 text-xs">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {onRefresh && (
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className={`p-3 rounded-sm transition-all ${refreshing ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                title="Refresh Vendors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        )}

                        {canManageVendors && (
                            <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-sm font-bold text-sm whitespace-nowrap">
                                <Plus className="w-3.5 h-3.5" /><span>Add Vendor</span>
                            </button>
                        )}
                    </div>
                </div>

                {isReadOnly && (
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 mb-6">
                        <div className="bg-orange-600 p-1.5 rounded-lg">
                            <ShieldCheck className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-orange-900 uppercase">View Only Mode</p>
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">You have restricted access to vendor management</p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded border border-slate-100 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-4 lg:px-6 py-4 w-10">
                                    <div
                                        onClick={toggleSelectAll}
                                        className={`w-4 h-4 rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${selectedRows.length === filtered.length && filtered.length > 0
                                            ? 'bg-purple-600 border-purple-600'
                                            : 'border-slate-300 bg-white hover:border-purple-400'
                                            }`}
                                    >
                                        {selectedRows.length === filtered.length && filtered.length > 0 && (
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                        )}
                                    </div>
                                </th>
                                <th className="px-4 lg:px-6 py-4">Vendor</th>
                                <th className="px-4 lg:px-6 py-4 hidden md:table-cell">Business</th>
                                <th className="px-4 lg:px-6 py-4 hidden lg:table-cell">GST No.</th>
                                <th className="px-4 lg:px-6 py-4">Total Bill</th>
                                <th className="px-4 lg:px-6 py-4">Paid</th>
                                <th className="px-4 lg:px-6 py-4">Pending</th>
                                <th className="px-4 lg:px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {vPagination.paginatedItems.map(v => (
                                <tr key={v.id} className={`hover:bg-slate-50/50 transition-colors ${selectedRows.includes(v.id) ? 'bg-purple-50/30' : ''}`}>
                                    <td className="px-4 lg:px-6 py-4">
                                        <div
                                            onClick={() => toggleRow(v.id)}
                                            className={`w-4 h-4 rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${selectedRows.includes(v.id)
                                                ? 'bg-purple-600 border-purple-600'
                                                : 'border-slate-300 bg-white hover:border-purple-400'
                                                }`}
                                        >
                                            {selectedRows.includes(v.id) && (
                                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            {v.image ? (
                                                <img src={v.image || undefined} alt={v.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-600 text-sm shrink-0">
                                                    {v.name?.charAt(0) || 'V'}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-slate-900 truncate">{v.name}</p>
                                                <button
                                                    onClick={() => setSelectedVendorId(v.id)}
                                                    className="text-[10px] text-purple-600 font-black hover:underline tracking-tight"
                                                >
                                                    {v.id}
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                                        <div className="flex items-center space-x-2">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-600 truncate">{v.businessName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 hidden lg:table-cell text-xs font-mono text-slate-500">{v.gstNumber}</td>
                                    <td className="px-4 lg:px-6 py-4 font-black text-sm text-blue-600">₹{((v.totalPaid || 0) + (v.pendingAmount || 0)).toLocaleString()}</td>
                                    <td className="px-4 lg:px-6 py-4 font-black text-sm text-green-600">₹{(v.totalPaid || 0).toLocaleString()}</td>
                                    <td className="px-4 lg:px-6 py-4 font-black text-sm text-red-500">₹{(v.pendingAmount || 0).toLocaleString()}</td>
                                    <td className="px-4 lg:px-6 py-4">
                                        <div className="flex space-x-2">
                                            {canManageVendors && (
                                                <button onClick={() => handleEdit(v)} className="p-2 bg-blue-50 text-blue-600 rounded-sm hover:bg-blue-100"><Edit2 className="w-3.5 h-3.5" /></button>
                                            )}
                                            {canDeleteVendors && (
                                                <button onClick={() => handleDelete(v.id)} className="p-2 bg-red-50 text-red-500 rounded-sm hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
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

                {vPagination.totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400">
                            Showing {vPagination.startIndex}–{vPagination.endIndex} of {vPagination.totalItems} vendors
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={vPagination.prevPage} disabled={vPagination.currentPage === 1} className="px-3 py-1.5 text-xs font-bold rounded-sm bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Prev</button>
                            {Array.from({ length: Math.min(vPagination.totalPages, 7) }, (_, i) => (
                                <button key={i + 1} onClick={() => vPagination.goToPage(i + 1)} className={`w-7 h-7 text-xs font-black rounded-sm transition-all ${vPagination.currentPage === i + 1 ? 'bg-purple-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{i + 1}</button>
                            ))}
                            <button onClick={vPagination.nextPage} disabled={vPagination.currentPage === vPagination.totalPages} className="px-3 py-1.5 text-xs font-bold rounded-sm bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next</button>
                        </div>
                    </div>
                )}

                {showAddModal && (
                    <Portal>
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">

                            <div className="bg-white rounded-[24px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden">
                                {/* Purple Header */}
                                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
                                    <h2 className="text-xl font-black text-white">{editingId ? 'Edit Vendor' : 'Add Vendor'}</h2>
                                    <button onClick={closeModal} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"><X className="w-3.5 h-3.5" /></button>
                                </div>
                                <div className="p-6 lg:p-8 space-y-4">
                                    {/* Photo Upload */}
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Vendor Photo</label>
                                        {formData.image ? (
                                            <div className="relative group">
                                                <img src={formData.image || undefined} alt="Vendor preview" className="w-full h-36 object-cover rounded-sm border-2 border-slate-100" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-sm transition-all flex items-center justify-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewImage(formData.image)}
                                                        className="px-4 py-2 bg-white text-blue-600 font-bold text-xs rounded-sm hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, image: '' })}
                                                        className="px-4 py-2 bg-white text-red-600 font-bold text-xs rounded-sm hover:bg-red-50 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all">
                                                    <Upload className="w-3.5 h-3.5 text-slate-400 mb-2" />
                                                    <span className="text-sm font-bold text-slate-500">Click to upload photo</span>
                                                    <span className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleImageUpload}
                                                    />
                                                </label>
                                                {isUploading && (
                                                    <div className="flex flex-col items-center justify-center p-4 bg-blue-50/50 rounded-xl animate-pulse">
                                                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mb-2" />
                                                        <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">Compressing...</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <div className="h-px flex-1 bg-slate-200"></div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">or paste URL</span>
                                                    <div className="h-px flex-1 bg-slate-200"></div>
                                                </div>
                                                <input
                                                    value={formData.image}
                                                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-sm outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    placeholder="https://example.com/photo.jpg"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div><label className="text-xs font-black text-slate-400 uppercase">Name</label><input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                    <div><label className="text-xs font-black text-slate-400 uppercase">Business Name</label><input value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                    <div><label className="text-xs font-black text-slate-400 uppercase">GST Number</label><input value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                    <div><label className="text-xs font-black text-slate-400 uppercase">Phone</label><input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                    <div><label className="text-xs font-black text-slate-400 uppercase">Email</label><input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                    {/* Bill & Payment Section */}
                                    <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-3">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Payment Details</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs font-black text-blue-500 uppercase">Total Bill (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.totalBill}
                                                    onChange={(e) => {
                                                        const bill = e.target.value;
                                                        const paid = parseFloat(formData.totalPaid) || 0;
                                                        const billNum = parseFloat(bill) || 0;
                                                        const pending = Math.max(0, billNum - paid);
                                                        setFormData({ ...formData, totalBill: bill, pendingAmount: pending.toString() });
                                                    }}
                                                    placeholder="0"
                                                    className="w-full mt-1 px-3 py-3 border border-blue-200 bg-blue-50/50 rounded-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-green-500 uppercase">Total Paid (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.totalPaid}
                                                    onChange={(e) => {
                                                        const paid = e.target.value;
                                                        const bill = parseFloat(formData.totalBill) || 0;
                                                        const paidNum = parseFloat(paid) || 0;
                                                        const pending = Math.max(0, bill - paidNum);
                                                        setFormData({ ...formData, totalPaid: paid, pendingAmount: pending.toString() });
                                                    }}
                                                    placeholder="0"
                                                    className="w-full mt-1 px-3 py-3 border border-green-200 bg-green-50/50 rounded-sm outline-none focus:ring-2 focus:ring-green-500 font-bold text-green-700 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-red-500 uppercase">Pending (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.pendingAmount}
                                                    readOnly
                                                    placeholder="0"
                                                    className="w-full mt-1 px-3 py-3 border border-red-200 bg-red-50/50 rounded-sm outline-none font-bold text-red-600 text-sm cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        {(() => {
                                            const bill = parseFloat(formData.totalBill) || 0;
                                            const paid = parseFloat(formData.totalPaid) || 0;
                                            const pending = parseFloat(formData.pendingAmount) || 0;
                                            if (bill <= 0) return null;
                                            const paidPct = Math.min(100, (paid / bill) * 100);
                                            return (
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                                        <span>Payment Progress</span>
                                                        <span>{paidPct.toFixed(0)}% paid</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${paidPct >= 100 ? 'bg-green-500' : paidPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                            style={{ width: `${paidPct}%` }}
                                                        />
                                                    </div>
                                                    {pending > 0 && (
                                                        <p className="text-[10px] font-bold text-red-500 mt-1">₹{(pending || 0).toLocaleString()} remaining to pay</p>
                                                    )}
                                                    {pending === 0 && paid > 0 && (
                                                        <p className="text-[10px] font-bold text-green-600 mt-1">✓ Fully paid</p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button onClick={closeModal} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-sm">Cancel</button>
                                    <button onClick={handleSave} disabled={!formData.name || !formData.businessName || formData.phone.length < 10} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-sm disabled:opacity-50">{editingId ? 'Update' : 'Add'}</button>
                                </div>
                            </div>
                        </div>
                    </Portal>
                )}


                {/* Image Preview Modal */}
                {
                    previewImage && (
                        <Portal>
                            <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                                <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg text-slate-500 hover:text-red-500 transition-colors z-10">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded" />
                                </div>
                            </div>
                        </Portal>
                    )
                }
                {/* Export Modal */}
                {
                    showExportModal && (
                        <Portal>

                            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                                <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col relative px-8 py-12 lg:px-12">
                                    {/* Close Button */}
                                    <button
                                        onClick={() => setShowExportModal(false)}
                                        className="absolute top-8 right-8 p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-sm transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="text-center mb-8">
                                        <h2 className="text-3xl font-black text-slate-900 mb-3">Export Items</h2>
                                        <p className="text-slate-500 font-bold max-w-md mx-auto">
                                            Export your vendor database using Excel, PDF, or CSV formats.
                                        </p>
                                    </div>

                                    <div className="bg-white border-2 border-slate-50 rounded-[32px] p-8 lg:p-10 shadow-sm relative overflow-hidden">
                                        {/* Mesh Gradient Background */}
                                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-50 rounded-full blur-[100px] -z-1" />

                                        <div className="flex flex-col items-center text-center relative z-10">
                                            <div className="w-16 h-16 bg-blue-50 rounded flex items-center justify-center mb-6 border border-blue-100">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 mb-2">Export Vendor Data</h3>
                                            <p className="text-sm font-bold text-slate-400 mb-8">Choose the format you want to export your items.</p>

                                            <div className="w-full space-y-4 max-w-sm mx-auto">
                                                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded font-black flex items-center justify-center space-x-3 shadow-lg shadow-blue-100 transition-all active:scale-95 group">
                                                    <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    <span>Export as Excel (.xlsx)</span>
                                                </button>

                                                <button className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 py-4 rounded font-black flex items-center justify-center space-x-3 transition-all active:scale-95 group">
                                                    <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    <span>Export as CSV (.csv)</span>
                                                </button>

                                                <button className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 py-4 rounded font-black flex items-center justify-center space-x-3 transition-all active:scale-95 group">
                                                    <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    <span>Export as PDF (.pdf)</span>
                                                </button>
                                            </div>

                                            <div className="mt-8 text-left w-full max-w-sm border-t border-slate-100 pt-8">
                                                <button className="text-blue-600 font-black text-sm hover:underline flex items-center space-x-2 mb-6 group">
                                                    <span>Export format details</span>
                                                </button>
                                                <ul className="space-y-3">
                                                    <li className="flex items-start space-x-3">
                                                        <div className="w-4 h-4 bg-green-50 rounded-sm flex items-center justify-center mt-0.5">
                                                            <Check className="w-2.5 h-2.5 text-green-600" />
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Supports: .xlsx, .csv, .pdf</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Portal>
                    )
                }
            </div>
        </>
    );
};

export default Vendors;


