import React, { useState, useEffect } from 'react';
import { Bell, Volume2, CheckCircle2, MessageCircle, AlertTriangle, Package, IndianRupee, ShoppingBag, Calendar, TestTube2, Loader2, Activity } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { api } from '../../services/api';

const NotificationSettings: React.FC = () => {
    const [settings, setSettings] = useLocalStorage('nx_notification_settings', {
        whatsappNotifications: true,
        pushNotifications: true,
        lowStockAlert: true,
        paymentReminder: true,
        orderUpdates: true,
        weeklyReport: false,
        soundEnabled: true,
    });
    const [justSaved, setJustSaved] = useState(false);
    const [testingWa, setTestingWa] = useState(false);
    const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [pushPermission, setPushPermission] = useState<string>('default');

    // Realtime Updates State
    const [liveAlerts, setLiveAlerts] = useState<{ id: string; icon: any; title: string; desc: string; color: string; bg: string; time: string }[]>([]);

    // Check current statuses on mount
    useEffect(() => {
        // Check WhatsApp status
        api.whatsapp.getStatus()
            .then(res => {
                // The microservice returns { success, data: { status: 'ready', ... } }
                // The backend proxy returns { connected: true, status: 'ready', ... }
                const isConnected = res?.data?.connected === true
                    || res?.data?.status === 'ready'
                    || res?.connected === true
                    || res?.status === 'ready';
                setWaStatus(res?.success && isConnected ? 'connected' : 'disconnected');
            })
            .catch(() => setWaStatus('disconnected'));

        // Check push permission 
        if ('Notification' in window) {
            setPushPermission(Notification.permission);
        }

        const fetchAlerts = async () => {
            try {
                const [products, customers, transactions] = await Promise.all([
                    api.products.getAll(),
                    api.customers.getAll(),
                    api.transactions.getAll()
                ]);

                const outOfStock = products.filter(p => Number(p.stock) <= 0);
                const lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock ?? 5));
                const pending = customers.filter(c => Number(c.pending) > 0);

                const n = new Date();
                const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
                const todayTxns = transactions.filter(t => t.date === todayStr);

                const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                const built = [];
                if (outOfStock.length > 0) built.push({ id: 'oos', icon: AlertTriangle, title: 'Out of Stock', desc: `${outOfStock.length} items completely depleted`, color: 'text-red-600', bg: 'bg-red-50', time: nowTime });
                if (lowStock.length > 0) built.push({ id: 'ls', icon: Package, title: 'Low Stock', desc: `${lowStock.length} items running low`, color: 'text-amber-600', bg: 'bg-amber-50', time: nowTime });
                if (pending.length > 0) built.push({ id: 'pr', icon: IndianRupee, title: 'Pending Payments', desc: `₹${pending.reduce((s, c) => s + c.pending, 0).toLocaleString('en-IN')} outstanding from ${pending.length} customers`, color: 'text-blue-600', bg: 'bg-blue-50', time: nowTime });
                if (todayTxns.length > 0) built.push({ id: 'ou', icon: ShoppingBag, title: "Today's Sales", desc: `${todayTxns.length} orders total ₹${todayTxns.reduce((s, t) => s + (Number(t.total) || 0), 0).toLocaleString('en-IN')}`, color: 'text-emerald-600', bg: 'bg-emerald-50', time: nowTime });

                setLiveAlerts(built);
            } catch (e) {
                console.error("Failed to fetch live alerts:", e);
            }
        };

        fetchAlerts();
        const intervalId = setInterval(fetchAlerts, 15000); // Check every 15s

        return () => clearInterval(intervalId);
    }, []);

    const toggle = async (key: keyof typeof settings) => {
        let newValue = !settings[key];

        // Handle native push notification permission
        if (key === 'pushNotifications' && newValue) {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                setPushPermission(permission);
                if (permission !== 'granted') {
                    newValue = false;
                    alert('Please allow notification permissions in your browser to enable Push Notifications.');
                }
            } else {
                newValue = false;
                alert('Your browser does not support Desktop Notifications.');
            }
        }

        if (key === 'soundEnabled' && newValue) {
            // Play test sound
            try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {
                    // Fallback: Web Audio API beep
                    try {
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.value = 800;
                        gain.gain.value = 0.15;
                        osc.start();
                        osc.stop(ctx.currentTime + 0.15);
                    } catch { }
                });
            } catch { }
        }

        setSettings(prev => ({ ...prev, [key]: newValue }));
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
    };

    const sendTestWa = async () => {
        setTestingWa(true);
        try {
            // Get connected number — use the same api client
            const statusData = await api.whatsapp.getStatus();
            const isConnected = statusData?.data?.connected === true
                || statusData?.data?.status === 'ready'
                || statusData?.connected === true
                || statusData?.status === 'ready';
            if (!statusData?.success || !isConnected) {
                alert('WhatsApp is not connected. Please connect in Settings > WhatsApp first.');
                return;
            }
            const connInfo = statusData?.data?.connectionInfo || statusData?.connectionInfo || {};
            const phone = (statusData?.data?.number || connInfo?.phoneNumber || '').replace(/[^0-9]/g, '');
            if (!phone || phone.length < 10) {
                alert('No WhatsApp number found. Make sure WhatsApp is connected.');
                return;
            }

            const res = await api.whatsapp.send({
                to: phone,
                type: 'text',
                content: `✅ *NEXA POS — Test Notification*\n\nYour notification alerts are working correctly!\n\nEnabled alerts:\n${settings.lowStockAlert ? '✅' : '❌'} Low Stock Alerts\n${settings.paymentReminder ? '✅' : '❌'} Payment Reminders\n${settings.orderUpdates ? '✅' : '❌'} Order Updates\n${settings.weeklyReport ? '✅' : '❌'} Weekly Digest\n\n_Sent from NEXA POS Notification Settings_`
            });

            if (res?.success) {
                alert('✅ Test message sent to your WhatsApp!');
            } else {
                alert('Failed to send test message.');
            }
        } catch (err: any) {
            alert('Error: ' + (err.message || 'Failed to send test'));
        } finally {
            setTestingWa(false);
        }
    };

    const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
        <button onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

    return (
        <div className="w-full space-y-8 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Notifications</h2>
                        <p className="text-xs text-slate-400 font-bold">Configure how you receive alerts and updates</p>
                    </div>
                </div>
                {justSaved && (
                    <div className="flex items-center space-x-2 text-green-600 font-bold text-sm animate-in fade-in slide-in-from-right-4">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Changes Saved</span>
                    </div>
                )}
            </div>

            {/* ── Channels ───────────────────────────────────────────── */}
            {/* Channels Box */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest px-1">Channels</h3>
                <div className="w-full p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    {/* WhatsApp */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-100 transition-all shadow-sm">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                                <MessageCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm text-slate-900">WhatsApp</p>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${waStatus === 'connected' ? 'bg-green-100 text-green-700' : waStatus === 'checking' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'}`}>
                                        {waStatus === 'connected' ? '● Connected' : waStatus === 'checking' ? 'Checking...' : '● Disconnected'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Registered Device Alerts</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {settings.whatsappNotifications && waStatus === 'connected' && (
                                <button onClick={sendTestWa} className="px-3 py-1.5 text-[10px] font-black text-green-600 bg-green-50 rounded-lg hover:bg-green-100 uppercase tracking-widest">Test</button>
                            )}
                            <ToggleSwitch enabled={settings.whatsappNotifications} onChange={() => toggle('whatsappNotifications')} />
                        </div>
                    </div>

                    {/* Push */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-100 transition-all shadow-sm">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                <Bell className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm text-slate-900">Push Notifications</p>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${pushPermission === 'granted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                        {pushPermission === 'granted' ? '● Active' : '● Blocked'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Browser & Desktop Alerts</p>
                            </div>
                        </div>
                        <ToggleSwitch enabled={settings.pushNotifications} onChange={() => toggle('pushNotifications')} />
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* ── Alert Types ────────────────────────────────────────── */}
            {/* Alert Types Box */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest px-1">Alert Types</h3>
                <div className="w-full p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { key: 'lowStockAlert' as const, icon: Package, iconColor: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Low Stock', desc: 'Inventory drops below threshold' },
                            { key: 'paymentReminder' as const, icon: IndianRupee, iconColor: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Payments', desc: 'Upcoming & overdue balances' },
                            { key: 'orderUpdates' as const, icon: ShoppingBag, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'Orders', desc: 'New sales & status changes' },
                            { key: 'weeklyReport' as const, icon: Calendar, iconColor: 'text-indigo-600', bgColor: 'bg-indigo-50', label: 'Weekly', desc: 'Summary every Monday' },
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-100 transition-all shadow-sm">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 ${item.bgColor} rounded-xl flex items-center justify-center`}>
                                        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900 leading-none mb-1">{item.label}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.desc}</p>
                                    </div>
                                </div>
                                <ToggleSwitch enabled={settings[item.key]} onChange={() => toggle(item.key)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── How it works ───────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-2xl p-5 mt-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">How Notifications Work</h4>
                <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p><span className="font-bold text-slate-700">Low Stock & Out of Stock</span> — Automatically detected when product stock falls at or below min-stock threshold. Fires on every data refresh.</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <IndianRupee className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <p><span className="font-bold text-slate-700">Payment Reminders</span> — Fires when customers have outstanding balances (pending &gt; 0).</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <p><span className="font-bold text-slate-700">Order Updates</span> — Notifies you when new sales are recorded today.</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <MessageCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <p><span className="font-bold text-slate-700">WhatsApp</span> — Messages are sent to your connected WhatsApp number. Make sure WhatsApp is connected in Settings &gt; WhatsApp.</p>
                    </div>
                </div>
            </div>

            {/* ── Realtime Updates (Live Monitor) ────────────────────── */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mt-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 z-0"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Realtime Active Alerts</h4>
                        </div>
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded-md text-[9px] font-black uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> Live
                        </span>
                    </div>

                    {liveAlerts.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center">
                            <CheckCircle2 className="w-8 h-8 text-slate-200 mb-2" />
                            <p className="text-sm font-bold text-slate-400">All Clear</p>
                            <p className="text-xs text-slate-400">No active triggers detected right now.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {liveAlerts.map(alert => (
                                <div key={alert.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.bg}`}>
                                            <alert.icon className={`w-3.5 h-3.5 ${alert.color}`} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 uppercase">{alert.title}</p>
                                            <p className="text-[10px] font-bold text-slate-500">{alert.desc}</p>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {alert.time}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
