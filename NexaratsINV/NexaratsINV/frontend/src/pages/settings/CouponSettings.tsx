import React, { useState } from 'react';
import { Tag, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { api } from '../../services/api';

export interface Coupon {
    id: string;
    code: string;
    type: 'percentage' | 'flat';
    value: number;
    minOrderAmount: number;
    expiryDate: string;
    isActive: boolean;
}

const CouponSettings: React.FC = () => {
    const [coupons, setCoupons] = useLocalStorage<Coupon[]>('nx_coupons', []);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState<Omit<Coupon, 'id'>>({
        code: '',
        type: 'percentage',
        value: 10,
        minOrderAmount: 0,
        expiryDate: '',
        isActive: true,
    });

    const handleSave = async () => {
        if (!form.code.trim()) {
            alert('Coupon code is required');
            return;
        }
        if (form.value <= 0) {
            alert('Discount value must be greater than 0');
            return;
        }

        let updated: Coupon[];
        if (editingId) {
            updated = coupons.map(c => c.id === editingId ? { ...form, id: editingId } : c);
        } else {
            updated = [...coupons, { ...form, id: Date.now().toString() }];
        }

        // Optimistic UI update
        setCoupons(updated);
        setShowModal(false);
        setEditingId(null);

        // Persist to DB
        try {
            await api.settings.update({ nx_coupons: updated });
        } catch (err) {
            console.error('Failed to save coupons to DB', err);
        }
    };

    const handleEdit = (c: Coupon) => {
        setForm({
            code: c.code,
            type: c.type,
            value: c.value,
            minOrderAmount: c.minOrderAmount,
            expiryDate: c.expiryDate,
            isActive: c.isActive,
        });
        setEditingId(c.id);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this coupon?')) {
            const updated = coupons.filter(c => c.id !== id);
            setCoupons(updated);
            try {
                await api.settings.update({ nx_coupons: updated });
            } catch (err) {
                console.error('Failed to save coupons to DB', err);
            }
        }
    };

    const openCreate = () => {
        setForm({
            code: '',
            type: 'percentage',
            value: 10,
            minOrderAmount: 0,
            expiryDate: '',
            isActive: true,
        });
        setEditingId(null);
        setShowModal(true);
    };

    return (
        <div className="w-full space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Tag className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Coupons & Discounts</h2>
                        <p className="text-xs text-slate-400 font-bold">Create promo codes to offer percentage or flat discounts</p>
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Coupon</span>
                </button>
            </div>

            {/* Coupon List Box - Matching Profile Asset Box Style */}
            <div className="w-full p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                <th className="p-4 font-black">Code</th>
                                <th className="p-4 font-black">Discount</th>
                                <th className="p-4 font-black">Min Order</th>
                                <th className="p-4 font-black">Expiry</th>
                                <th className="p-4 font-black">Status</th>
                                <th className="p-4 font-black text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-sm bg-white/30">
                            {coupons.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        <Tag className="w-10 h-10 mx-auto mb-4 text-slate-300" />
                                        <p className="font-black text-slate-900">No coupons created yet</p>
                                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">Click the Add Coupon button to get started</p>
                                    </td>
                                </tr>
                            ) : coupons.map(c => (
                                <tr key={c.id} className="hover:bg-white/60 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                                <Tag className="w-3.5 h-3.5 text-blue-500" />
                                            </div>
                                            <span className="font-black text-slate-900 uppercase tracking-wide">{c.code}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-emerald-600 font-black">
                                        {c.type === 'percentage' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                                    </td>
                                    <td className="p-4 text-slate-500 font-bold">
                                        {c.minOrderAmount > 0 ? `₹${c.minOrderAmount}` : 'No Min.'}
                                    </td>
                                    <td className="p-4 text-slate-500 font-bold">
                                        {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Lifetime'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {c.isActive ? 'Active' : 'Paused'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleEdit(c)} className="p-2 text-slate-400 hover:text-blue-600 bg-white rounded-xl border border-slate-200 hover:border-blue-200 shadow-sm transition-all active:scale-95">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white rounded-xl border border-slate-200 hover:border-red-200 shadow-sm transition-all active:scale-95">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">{editingId ? 'Edit Coupon' : 'Create New Coupon'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Coupon Code</label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. SUMMER20"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 uppercase font-bold text-slate-800"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Discount Type</label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Value</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.value}
                                        onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Minimum Order Amount (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.minOrderAmount}
                                    onChange={e => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                                    placeholder="0 for no minimum"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expiry Date</label>
                                <input
                                    type="date"
                                    value={form.expiryDate}
                                    onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-bold text-slate-700">Coupon Active</span>
                                </label>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm">
                                <Check className="w-4 h-4" />
                                Save Coupon
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponSettings;
