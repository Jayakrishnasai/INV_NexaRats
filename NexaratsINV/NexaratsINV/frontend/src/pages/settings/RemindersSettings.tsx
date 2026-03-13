import React, { useState } from 'react';
import { Clock, Bell, Save, CheckCircle2, Smartphone } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { fireConfetti } from '../../utils/confettiInModal';

const RemindersSettings: React.FC = () => {
    const [config, setConfig] = useLocalStorage('nx_reminders_config', {
        paymentReminder: true,
        stockReminder: true,
        expiryReminder: true,
        gstFilingReminder: true,
        paymentFrequency: '3',
        stockThreshold: '10',
        expiryDays: '30',
        reminderTime: '09:00',
        channels: { push: true },
    });
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        fireConfetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#2563EB']
        });
        setTimeout(() => setSaved(false), 3000);
    };

    const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
        <button onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

    return (
        <div className="w-full space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Reminders</h2>
                        <p className="text-xs text-slate-400 font-bold">Configure automated alerts and payment follows-ups</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-lg shadow-blue-200`}
                >
                    {saved ? <CheckCircle2 className="w-4 h-4 animate-in zoom-in" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saved ? 'Saved!' : 'Save Reminders'}</span>
                </button>
            </div>

            {/* Reminder Types grouped in a Box */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest px-1">Automated Reminders</h3>
                <div className="w-full p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    {[
                        {
                            id: 'payment', label: 'Payment Reminders', desc: 'Automatic reminders for pending payments',
                            control: (
                                <select value={config.paymentFrequency} onChange={(e) => setConfig({ ...config, paymentFrequency: e.target.value })} className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white">
                                    <option value="1">Every day</option><option value="3">Every 3 days</option><option value="7">Weekly</option><option value="15">Bi-weekly</option>
                                </select>
                            ),
                            toggleKey: 'paymentReminder' as const
                        },
                        {
                            id: 'stock', label: 'Low Stock Alerts', desc: 'Alert when stock falls below threshold',
                            control: (
                                <div className="flex items-center space-x-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Below</span>
                                    <input type="number" value={config.stockThreshold} onChange={(e) => setConfig({ ...config, stockThreshold: e.target.value })} className="w-14 px-2 py-1.5 border border-slate-200 rounded-xl text-xs text-center font-bold outline-none bg-white" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">units</span>
                                </div>
                            ),
                            toggleKey: 'stockReminder' as const
                        },
                        {
                            id: 'expiry', label: 'Expiry Reminders', desc: 'Notify before product expiry',
                            control: (
                                <div className="flex items-center space-x-1">
                                    <input type="number" value={config.expiryDays} onChange={(e) => setConfig({ ...config, expiryDays: e.target.value })} className="w-14 px-2 py-1.5 border border-slate-200 rounded-xl text-xs text-center font-bold outline-none bg-white" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Days Left</span>
                                </div>
                            ),
                            toggleKey: 'expiryReminder' as const
                        },
                        {
                            id: 'gst', label: 'GST Filing Reminder', desc: 'Remind before filing deadlines',
                            control: null,
                            toggleKey: 'gstFilingReminder' as const
                        },
                    ].map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-100 transition-all shadow-sm">
                            <div>
                                <p className="font-bold text-sm text-slate-900 leading-none mb-1">{item.label}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.desc}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                {item.control}
                                <ToggleSwitch enabled={config[item.toggleKey]} onChange={() => setConfig(prev => ({ ...prev, [item.toggleKey]: !prev[item.toggleKey] }))} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Timing Box */}
            <div className="w-full flex items-center justify-between p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                        <p className="font-black text-sm text-slate-900 uppercase">Default Timing</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Time of day to send automated reminders</p>
                    </div>
                </div>
                <input type="time" value={config.reminderTime} onChange={(e) => setConfig({ ...config, reminderTime: e.target.value })} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <hr className="border-slate-100" />

            {/* Notification Channel — Push Only */}
            <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3">Notification Channel</h3>

                <div className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Bell className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="font-black text-sm text-slate-900">Push Notifications</p>
                            <p className="text-xs text-slate-500">All reminders are delivered as push notifications</p>
                        </div>
                    </div>
                    <ToggleSwitch
                        enabled={config.channels?.push ?? true}
                        onChange={() => setConfig(prev => ({ ...prev, channels: { push: !(prev.channels?.push ?? true) } }))}
                    />
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-500 font-bold">
                        Notifications appear as toast alerts in the top-right corner of your dashboard. Make sure browser notifications are enabled for the best experience.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RemindersSettings;


