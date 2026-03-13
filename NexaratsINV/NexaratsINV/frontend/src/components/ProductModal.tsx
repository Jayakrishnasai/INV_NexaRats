import React, { useState, useEffect } from 'react';
import { X, Search, Info, Package, DollarSign, Tag, Clock, BarChart3, Image as ImageIcon, Plus } from 'lucide-react';
import { Product } from '../types';
import Portal from './Portal';

interface ProductModalProps {
    product: Partial<Product>;
    onClose: () => void;
    onSave: (product: Product) => void;
    mode: 'add' | 'edit';
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSave, mode }) => {
    const [formData, setFormData] = useState<Partial<Product>>(product);
    const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'media'>('basic');

    useEffect(() => {
        setFormData(product);
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic Validation
        if (!formData.name || !formData.sku) {
            alert('Name and SKU are required');
            return;
        }

        const finalProduct = {
            ...formData,
            id: formData.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            price: Number(formData.price) || 0,
            mrp: Number(formData.mrp) || 0,
            purchasePrice: Number(formData.purchasePrice) || 0,
            stock: Number(formData.stock) || 0,
            minStock: Number(formData.minStock) || 10,
            gstRate: Number(formData.gstRate) || 0,
            discountPercentage: (Number(formData.mrp) > Number(formData.price))
                ? Math.round(((Number(formData.mrp) - Number(formData.price)) / Number(formData.mrp)) * 100)
                : 0,
            profit: (Number(formData.price) - Number(formData.purchasePrice)),
            status: Number(formData.stock) === 0 ? 'Out of Stock' : Number(formData.stock) <= (Number(formData.minStock) || 10) ? 'Low Stock' : 'In Stock'
        } as Product;

        onSave(finalProduct);
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{mode === 'add' ? 'New Merchant Product' : 'Revise Inventory Data'}</h2>
                            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{mode === 'add' ? 'Populating global catalog' : `Serial: ${formData.id}`}</p>
                        </div>
                        <button onClick={onClose} className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-8 border-b border-slate-100 bg-slate-50/50">
                        {[
                            { id: 'basic', label: 'Primary Info', icon: Package },
                            { id: 'pricing', label: 'Financials', icon: DollarSign },
                            { id: 'inventory', label: 'Stock Logic', icon: BarChart3 },
                            { id: 'media', label: 'Assets', icon: ImageIcon },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2.5 px-6 py-5 text-sm font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white shadow-[0_4px_0_-2px_white]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                        <form onSubmit={handleSubmit} id="product-form" className="space-y-12">
                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="col-span-2 space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Product Definition (Title)</label>
                                        <input
                                            name="name"
                                            value={formData.name || ''}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-600 focus:bg-white text-xl font-black transition-all"
                                            placeholder="e.g. Ultra HD Smart Display"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest text-[10px]">Merchant Category</label>
                                        <select
                                            name="category"
                                            value={formData.category || ''}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold"
                                        >
                                            <option value="">Select Domain</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="Appliances">Appliances</option>
                                            <option value="Personal Care">Personal Care</option>
                                            <option value="Food & Bev">Food & Bev</option>
                                            <option value="Home Goods">Home Goods</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global SKU / Barcode</label>
                                        <input
                                            name="sku"
                                            value={formData.sku || ''}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold"
                                            placeholder="NXS-4002-LX"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant Description</label>
                                        <textarea
                                            name="description"
                                            value={formData.description || ''}
                                            onChange={handleChange}
                                            rows={3}
                                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-600 font-bold resize-none"
                                            placeholder="Detailed product specifications..."
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pricing' && (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div className="space-y-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max MRP</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                                            <input type="number" name="mrp" value={formData.mrp || 0} onChange={handleNumberChange} className="w-full pl-8 pr-4 py-3 bg-white border border-slate-100 rounded-xl font-black text-xl" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 p-6 bg-slate-50 rounded-3xl border-2 border-blue-100">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Retail Price</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-400">₹</span>
                                            <input type="number" name="price" value={formData.price || 0} onChange={handleNumberChange} className="w-full pl-8 pr-4 py-3 bg-white border border-blue-200 rounded-xl font-black text-xl text-blue-600 shadow-sm outline-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchase / Net</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                                            <input type="number" name="purchasePrice" value={formData.purchasePrice || 0} onChange={handleNumberChange} className="w-full pl-8 pr-4 py-3 bg-white border border-slate-100 rounded-xl font-black text-xl" />
                                        </div>
                                    </div>

                                    <div className="col-span-full grid grid-cols-3 gap-8 p-8 bg-blue-50/50 rounded-[40px] border-2 border-dashed border-blue-100">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-2">Projected Profit</p>
                                            <p className="text-3xl font-black text-blue-600">₹{((formData.price || 0) - (formData.purchasePrice || 0)).toLocaleString()}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-2">Discount Applied</p>
                                            <p className="text-3xl font-black text-emerald-600">{formData.mrp && formData.price ? Math.round(((formData.mrp - formData.price) / formData.mrp) * 100) : 0}% OFF</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-2">Tax Impact (GST)</p>
                                            <p className="text-3xl font-black text-slate-700">{formData.gstRate || 0}% <span className="text-xs uppercase opacity-40">{formData.taxType}</span></p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'inventory' && (
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Stock</label>
                                        <input type="number" name="stock" value={formData.stock || 0} onChange={handleNumberChange} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-600 font-black text-2xl" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alert Threshold</label>
                                        <input type="number" name="minStock" value={formData.minStock || 10} onChange={handleNumberChange} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-600 font-black text-2xl" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Measurement Unit</label>
                                        <select name="unit" value={formData.unit || 'pcs'} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold">
                                            <option value="pcs">Pieces (pcs)</option>
                                            <option value="kg">Kilograms (kg)</option>
                                            <option value="ltr">Liters (ltr)</option>
                                            <option value="box">Box</option>
                                            <option value="set">Set</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Life (Expiry)</label>
                                        <input type="date" name="expiryDate" value={formData.expiryDate || ''} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'media' && (
                                <div className="space-y-8">
                                    <div className="p-12 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center text-center group hover:border-blue-200 transition-all cursor-pointer bg-slate-50/50">
                                        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <ImageIcon className="w-10 h-10 text-slate-300 group-hover:text-blue-500" />
                                        </div>
                                        <p className="text-xl font-black text-slate-900 mb-2">Upload Visual Asset</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-[240px]">High resolution PNG/JPG supported (Max 5MB)</p>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remote Image URL (Fallback)</label>
                                        <input name="image" value={formData.image || ''} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold" placeholder="https://example.com/asset.jpg" />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-slate-100 flex justify-end gap-6 bg-white sticky bottom-0">
                        <button onClick={onClose} className="px-10 py-5 font-black uppercase text-sm text-slate-400 hover:text-slate-900 transition-all">Abort</button>
                        <button
                            type="submit"
                            form="product-form"
                            className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            {mode === 'add' ? 'Commit to Registry' : 'Save Modifications'}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

export default ProductModal;
