import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { User } from '../types';
import AdminAccess from './AdminAccess';

interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, user }) => {

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Lock body scroll while open
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 admin-modal-backdrop"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="relative w-full max-w-6xl max-h-[92vh] bg-[#F8F9FC] rounded-3xl shadow-2xl flex flex-col overflow-hidden admin-modal-content"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Admin Panel</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Users · Roles · Permissions
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                        title="Close (Esc)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <AdminAccess user={user} onClose={onClose} />
                </div>
            </div>

            <style>{`
                @keyframes adminModalBackdropIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes adminModalContentIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .admin-modal-backdrop {
                    animation: adminModalBackdropIn 0.2s ease-out both;
                }
                .admin-modal-content {
                    animation: adminModalContentIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
            `}</style>
        </div>
    );
};

export default AdminModal;
