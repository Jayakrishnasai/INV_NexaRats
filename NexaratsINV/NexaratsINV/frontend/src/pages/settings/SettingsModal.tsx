import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Bell, FileCheck, MessageSquare, Shield, Palette, Clock, HelpCircle, Users, Tag } from 'lucide-react';
import { User } from '../../types';

import ProfileSettings from './ProfileSettings';
import NotificationSettings from './NotificationSettings';
import GSTSettings from './GSTSettings';
import WhatsAppSettings from './WhatsAppSettings';
import SecuritySettings from './SecuritySettings';
import InvoiceThemes from './InvoiceThemes';
import RemindersSettings from './RemindersSettings';
import HelpSupport from './HelpSupport';
import CustomerMessaging from './CustomerMessaging';
import CouponSettings from './CouponSettings';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
    initialTab?: string;
}

const tabs = [
    { id: 'profile', icon: UserIcon, label: 'Admin Profile' },
    { id: 'notification', icon: Bell, label: 'Notification' },
    { id: 'gst', icon: FileCheck, label: 'GST Configuration' },
    { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp' },
    { id: 'messaging', icon: Users, label: 'Customer Messaging' },
    { id: 'security', icon: Shield, label: 'Security & Privacy' },
    { id: 'invoice', icon: Palette, label: 'Invoice Themes' },
    { id: 'reminders', icon: Clock, label: 'Reminders' },
    { id: 'coupons', icon: Tag, label: 'Coupons & Discounts' },
    { id: 'help', icon: HelpCircle, label: 'Help & Support' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, initialTab = 'profile' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [isWhatsAppOnly, setIsWhatsAppOnly] = useState(false);

    // Reset to initialTab or sessionStorage-driven tab whenever modal opens
    useEffect(() => {
        if (isOpen) {
            const storedTab = sessionStorage.getItem('nx_settings_tab');
            const waOnly = sessionStorage.getItem('nx_settings_whatsapp_only') === 'true';
            
            setIsWhatsAppOnly(waOnly);

            if (storedTab) {
                setActiveTab(storedTab);
                sessionStorage.removeItem('nx_settings_tab');
            } else {
                setActiveTab(initialTab);
            }
        } else {
            // Cleanup on close
            sessionStorage.removeItem('nx_settings_whatsapp_only');
            setIsWhatsAppOnly(false);
        }
    }, [isOpen, initialTab]);

    // Close on Escape
    const handleClose = () => {
        sessionStorage.removeItem('nx_settings_whatsapp_only');
        setIsWhatsAppOnly(false);
        onClose();
    };

    const visibleTabs = isWhatsAppOnly 
        ? tabs.filter(t => t.id === 'whatsapp')
        : tabs;

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

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileSettings />;
            case 'notification': return <NotificationSettings />;
            case 'gst': return <GSTSettings />;
            case 'whatsapp': return <WhatsAppSettings />;
            case 'messaging': return <CustomerMessaging />;
            case 'security': return <SecuritySettings />;
            case 'invoice': return <InvoiceThemes />;
            case 'coupons': return <CouponSettings />;
            case 'reminders': return <RemindersSettings />;
            case 'help': return <HelpSupport />;
            default: return null;
        }
    };

    return (
        /* ── Backdrop ──────────────────────────────────────────── */
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* ── Modal container ─────────────────────────────── */}
            <div
                className="relative w-full max-w-6xl h-[800px] max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ animation: 'settingsModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
                {/* Header bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">{isWhatsAppOnly ? 'WhatsApp Configuration' : 'Settings'}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Logged in as {user?.name || 'Admin'} · {user?.role || 'Admin'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                        title="Close Settings (Esc)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body: sidebar + content */}
                <div className="flex flex-1 min-h-0">
                    {/* ── Tab sidebar ──────────────────────────── */}
                    <nav className={`w-52 lg:w-60 shrink-0 bg-slate-50/70 border-r border-slate-100 overflow-y-auto py-3 px-2 flex flex-col gap-0.5 ${isWhatsAppOnly ? 'bg-slate-50/30 overflow-hidden' : ''}`}>
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={[
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all w-full group',
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                        : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm',
                                ].join(' ')}
                            >
                                <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`} />
                                <span className="text-sm font-bold leading-none truncate">{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* ── Content area ─────────────────────────── */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white">
                        <div key={activeTab} className="w-full" style={{ animation: 'fadeInUp 0.18s ease both' }}>
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Inline keyframe for modal pop-in */}
            <style>{`
                @keyframes settingsModalIn {
                    from { opacity: 0; transform: scale(0.93) translateY(12px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SettingsModal;
