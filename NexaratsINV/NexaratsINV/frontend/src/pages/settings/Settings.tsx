import React, { useState } from 'react';
import { User as UserIcon, Bell, FileCheck, MessageSquare, Shield, Palette, Clock, HelpCircle, LogOut, Trash2, ShieldCheck, Users, Settings as SettingsIcon, Tag } from 'lucide-react';
import { User } from '../../types';

interface SettingsProps {
    user?: User | null;
}
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

interface TabGroup {
    label: string;
    tabs: { id: string; icon: React.FC<any>; label: string }[];
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
    const isSuperAdmin = user?.role === 'Super Admin';
    const permissionLevel = isSuperAdmin ? 'manage' : (user?.permissions?.['settings'] || 'none');
    const isReadOnly = !isSuperAdmin && permissionLevel === 'read';
    const [activeTab, setActiveTab] = useState('profile');

    const tabGroups: TabGroup[] = [
        {
            label: 'Account',
            tabs: [
                { id: 'profile', icon: UserIcon, label: 'Admin Profile' },
                { id: 'notification', icon: Bell, label: 'Notifications' },
                { id: 'security', icon: Shield, label: 'Security & Privacy' },
            ]
        },
        {
            label: 'Billing & Store',
            tabs: [
                { id: 'gst', icon: FileCheck, label: 'GST Configuration' },
                { id: 'invoice', icon: Palette, label: 'Invoice Themes' },
                { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp' },
                { id: 'messaging', icon: Users, label: 'Customer Messaging' },
                { id: 'coupons', icon: Tag, label: 'Coupons & Discounts' },
            ]
        },
        {
            label: 'System',
            tabs: [
                { id: 'reminders', icon: Clock, label: 'Reminders' },
                { id: 'help', icon: HelpCircle, label: 'Help & Support' },
            ]
        }
    ];

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

    if (permissionLevel === 'none') {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <SettingsIcon className="w-10 h-10 text-slate-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-bold leading-relaxed mb-10">
                    You do not have the required authority to access system settings. Please contact your administrator to upgrade your permissions.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => window.history.back()} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Go Back</button>
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Retry Access</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6">
            {isReadOnly && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-orange-600 p-1.5 rounded-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-orange-900 uppercase">View Only Mode</p>
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">You have restricted access to system settings</p>
                    </div>
                </div>
            )}
            <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-120px)]">
                {/* Tabs Sidebar — Grouped */}
                <div className="w-full lg:w-72 bg-white rounded-2xl border border-slate-100 shadow-sm p-3 lg:p-4 shrink-0">
                    {/* Mobile: horizontal scroll */}
                    <div className="flex lg:hidden gap-1 overflow-x-auto pb-2 vyapar-scrollbar">
                        {tabGroups.flatMap(g => g.tabs).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap shrink-0 text-xs ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'text-slate-500 hover:bg-slate-50 border border-slate-100'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-bold">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Desktop: grouped vertical nav */}
                    <div className="hidden lg:block space-y-5">
                        {tabGroups.map((group, gi) => (
                            <div key={gi}>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-3 mb-1.5">{group.label}</p>
                                <div className="space-y-0.5">
                                    {group.tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            <tab.icon className="w-4 h-4 shrink-0" />
                                            <span className="text-sm font-bold">{tab.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden lg:block mt-6 space-y-1 border-t border-slate-100 pt-4">
                        <button
                            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                            onClick={() => { sessionStorage.clear(); window.location.reload(); }}
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="text-sm font-bold">Sign Out</span>
                        </button>
                        {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
                            <button
                                className="w-full flex items-center space-x-3 px-4 py-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                onClick={() => window.location.href = '/admin/admin'}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-sm font-bold">Manage Staff Accounts</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 lg:p-8 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Settings;
