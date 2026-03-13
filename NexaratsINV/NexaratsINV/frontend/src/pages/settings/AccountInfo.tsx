import React from 'react';
import { Info, Calendar, Package, Users, Database, Globe } from 'lucide-react';

const AccountInfo: React.FC = () => {
    const accountData = {
        plan: 'Professional',
        accountId: 'NXR-2024-001',
        createdOn: 'January 15, 2024',
        renewalDate: 'January 15, 2025',
        storage: { used: 2.4, total: 10 },
        products: { count: 156, limit: 5000 },
        users: { count: 3, limit: 10 },
        invoices: { count: 1240, limit: 'Unlimited' },
    };

    return (
        <div className="w-full space-y-8">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Info className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h2 className="text-xl lg:text-2xl font-black text-slate-900">Account Information</h2>
                    <p className="text-xs text-slate-400 font-bold">Manage your subscription, limits and plan details</p>
                </div>
            </div>

            {/* Plan Info */}
            <div className="p-6 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl text-white shadow-xl shadow-blue-100 border border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80">Current Plan</p>
                        <h3 className="text-3xl font-black mt-1">{accountData.plan}</h3>
                        <p className="text-blue-100 text-[10px] font-black uppercase opacity-60 mt-1">Account ID: {accountData.accountId}</p>
                    </div>
                    <button className="px-6 py-3 bg-white text-blue-700 rounded-xl font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all">Upgrade Plan</button>
                </div>
            </div>

            {/* Key Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                        <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Account Created</p>
                        <p className="font-black text-slate-900">{accountData.createdOn}</p>
                    </div>
                </div>
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Next Renewal</p>
                        <p className="font-black text-slate-900">{accountData.renewalDate}</p>
                    </div>
                </div>
            </div>

            {/* Usage Overview Box */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest px-1">Usage Overview</h3>
                <div className="p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                    {[
                        { icon: Database, label: 'Storage', used: `${accountData.storage.used} GB`, total: `${accountData.storage.total} GB`, pct: (accountData.storage.used / accountData.storage.total) * 100, color: 'bg-blue-600' },
                        { icon: Package, label: 'Products', used: accountData.products.count.toString(), total: accountData.products.limit.toString(), pct: (accountData.products.count / accountData.products.limit) * 100, color: 'bg-green-500' },
                        { icon: Users, label: 'Team Members', used: accountData.users.count.toString(), total: accountData.users.limit.toString(), pct: (accountData.users.count / accountData.users.limit) * 100, color: 'bg-indigo-500' },
                        { icon: Globe, label: 'Invoices', used: accountData.invoices.count.toString(), total: accountData.invoices.limit.toString(), pct: 12, color: 'bg-orange-500' },
                    ].map((item, idx) => (
                        <div key={idx} className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${item.color.replace('bg-', 'bg-')}/10`}>
                                        <item.icon className={`w-4 h-4 ${item.color.replace('bg-', 'text-')}`} />
                                    </div>
                                    <span className="font-black text-sm text-slate-900 leading-none">{item.label}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.used} / {item.total}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                <div className={`${item.color} rounded-full h-full transition-all duration-700`} style={{ width: `${Math.min(item.pct, 100)}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AccountInfo;


