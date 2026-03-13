import React from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { CartItem } from '../../types';

interface CartItemCardProps {
    item: CartItem;
    onUpdateQty: (id: string, delta: number) => void;
    onRemove: (id: string) => void;
}

const CartItemCard: React.FC<CartItemCardProps> = ({ item, onUpdateQty, onRemove }) => {
    return (
        <div className="cart-item-enter bg-slate-50 p-3 lg:p-4 rounded border border-transparent hover:border-slate-200 transition-colors flex gap-4">
            <div className="w-16 h-16 bg-white border border-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.image ? (
                    <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-black text-xl uppercase">
                        {item.name?.charAt(0) || '?'}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col truncate">
                        <span className="font-black text-slate-900 text-sm truncate">{item.name}</span>
                        {(item.mrp || 0) > (item.price || 0) && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 line-through font-bold">₹{item.mrp}</span>
                                <span className="text-[10px] text-green-600 font-black">Save ₹{((item.mrp || 0) - item.price).toFixed(0)}</span>
                            </div>
                        )}
                    </div>
                    <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-500 ml-2">
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 bg-white border border-slate-100 rounded-sm p-1">
                        <button onClick={() => onUpdateQty(item.id, -1)} className="p-1 text-slate-400">
                            <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-xs font-black">{item.quantity}</span>
                        <button onClick={() => onUpdateQty(item.id, 1)} className="p-1 text-slate-400">
                            <Plus className="w-2.5 h-2.5" />
                        </button>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-slate-900 leading-none">₹{((item.price || 0) * (item.quantity || 0)).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CartItemCard);
