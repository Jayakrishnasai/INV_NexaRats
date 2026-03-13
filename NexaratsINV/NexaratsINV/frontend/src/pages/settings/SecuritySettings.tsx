import React, { useState, useEffect } from 'react';
import { Shield, Key, Monitor, Save, Eye, EyeOff, CheckCircle2, Clock, Bell, Globe, Laptop, Smartphone, LogOut, Users } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { api } from '../../services/api';
import { fireConfetti } from '../../utils/confettiInModal';

interface ActiveSession {
    id: string;
    user: string;
    role: string;
    device: string;
    browser: string;
    ip: string;
    loginTime: string;
    status: 'active' | 'expired';
    current?: boolean;
}

const SecuritySettings: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', newPassword: '', confirm: '' });
    const [settings, setSettings] = useLocalStorage('nx_security_settings', {
        sessionTimeout: '30',
        sessionWarning: true,
        ipRestriction: false,
        loginMonitoring: true,
    });
    const [saved, setSaved] = useState(false);

    // Active sessions — populated from current session + localStorage mock
    const [sessions, setSessions] = useState<ActiveSession[]>([]);

    useEffect(() => {
        // Build current session info
        const currentUser = JSON.parse(sessionStorage.getItem('inv_user') || '{}');
        const ua = navigator.userAgent;
        const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other';
        const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Unknown';
        const device = ua.includes('Mobile') ? 'Mobile' : 'Desktop';

        const currentSession: ActiveSession = {
            id: 'current',
            user: currentUser?.name || 'Current User',
            role: currentUser?.role || 'Admin',
            device: `${device} (${os})`,
            browser,
            ip: '127.0.0.1',
            loginTime: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            status: 'active',
            current: true,
        };

        // Load stored sessions (mock — in production this would come from API)
        const stored = JSON.parse(localStorage.getItem('nx_active_sessions') || '[]') as ActiveSession[];
        setSessions([currentSession, ...stored.filter(s => s.id !== 'current')]);
    }, []);

    const handleUpdatePassword = async () => {
        if (!passwords.newPassword || passwords.newPassword !== passwords.confirm) {
            alert("Passwords don't match or are empty!");
            return;
        }
        if (!passwords.current) {
            alert('Please enter your current password.');
            return;
        }

        try {
            const currentUser = JSON.parse(sessionStorage.getItem('inv_user') || 'null');
            if (!currentUser?.id) {
                alert('Session expired. Please log in again.');
                return;
            }

            await api.users.update(currentUser.id, {
                currentPassword: passwords.current,
                password: passwords.newPassword,
            } as any);

            setSaved(true);
            fireConfetti({
                particleCount: 50,
                spread: 50,
                origin: { y: 0.6 },
                colors: ['#10B981', '#059669']
            });
            setPasswords({ current: '', newPassword: '', confirm: '' });
            setTimeout(() => setSaved(false), 3000);
        } catch (error: any) {
            console.error('Password update failed:', error);
            alert(error?.message || 'Password update failed. Please check your current password.');
        }
    };

    const handleRevokeAll = () => {
        sessionStorage.removeItem('inv_token');
        sessionStorage.removeItem('inv_refresh_token');
        sessionStorage.removeItem('inv_user');
        localStorage.removeItem('nx_active_sessions');
        window.location.href = '/login';
    };

    const handleEndSession = (sessionId: string) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        const updated = sessions.filter(s => s.id !== sessionId && s.id !== 'current');
        localStorage.setItem('nx_active_sessions', JSON.stringify(updated));
    };

    const handleSaveSettings = () => {
        setSaved(true);
        fireConfetti({ particleCount: 60, spread: 50, origin: { y: 0.6 }, colors: ['#2563EB', '#8B5CF6'] });
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
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Security & Privacy</h2>
                        <p className="text-xs text-slate-400 font-bold">Manage your password, login sessions and security preferences</p>
                    </div>
                </div>
                <button
                    onClick={handleSaveSettings}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-lg shadow-blue-200`}
                >
                    {saved ? <CheckCircle2 className="w-4 h-4 animate-in zoom-in" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saved ? 'Saved!' : 'Save Settings'}</span>
                </button>
            </div>

            {/* Change Password - Matching Profile Asset Box Style */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center space-x-2">
                        <Key className="w-3.5 h-3.5" />
                        <span>Change Password</span>
                    </h3>
                    <button onClick={() => setShowPassword(!showPassword)} className="flex items-center space-x-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                </div>

                <div className="w-full p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Current Password</label>
                            <input type={showPassword ? "text" : "password"} value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold bg-white shadow-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">New Password</label>
                            <input type={showPassword ? "text" : "password"} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold bg-white shadow-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Confirm Password</label>
                            <input type={showPassword ? "text" : "password"} value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold bg-white shadow-sm" />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleUpdatePassword}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600' : 'bg-slate-900 hover:bg-black'} text-white shadow-xl shadow-slate-200`}
                        >
                            {saved ? <CheckCircle2 className="w-4 h-4 animate-in zoom-in" /> : <Save className="w-3.5 h-3.5" />}
                            <span>{saved ? 'Password Updated!' : 'Update Password'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Session Timeout */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Session Management
                </h3>

                <div className="w-full p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-slate-900">Session Timeout</p>
                                <p className="text-xs text-slate-400">Auto-logout after period of inactivity</p>
                            </div>
                        </div>
                        <select
                            value={settings.sessionTimeout}
                            onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-bold cursor-pointer"
                        >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes (Default)</option>
                            <option value="45">45 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="120">2 hours</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Bell className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-slate-900">Session Warning Popup</p>
                                <p className="text-xs text-slate-400">Show a warning popup 5 minutes before auto-logout</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={settings.sessionWarning}
                            onChange={() => setSettings(prev => ({ ...prev, sessionWarning: !prev.sessionWarning }))}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Globe className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-slate-900">IP Restriction</p>
                                <p className="text-xs text-slate-400">Restrict access to specific IP addresses</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={settings.ipRestriction}
                            onChange={() => setSettings(prev => ({ ...prev, ipRestriction: !prev.ipRestriction }))}
                        />
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Login Monitoring */}
            <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Login Monitoring
                </h3>

                <div className="w-full p-5 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                <Bell className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-slate-900">Notify on User Login</p>
                                <p className="text-xs text-slate-500">Super Admin receives a push notification when any user (Admin, Manager, Staff) logs in</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={settings.loginMonitoring}
                            onChange={() => setSettings(prev => ({ ...prev, loginMonitoring: !prev.loginMonitoring }))}
                        />
                    </div>
                    <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100 text-xs text-slate-500 font-bold">
                        <p>When enabled, the Super Admin will receive real-time push notifications containing:</p>
                        <ul className="mt-1 ml-4 list-disc space-y-0.5">
                            <li>User name and role</li>
                            <li>Device and browser info</li>
                            <li>Login time and IP address</li>
                        </ul>
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Active Sessions Box */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5" /> Active Sessions
                    </h3>
                    <button onClick={handleRevokeAll} className="flex items-center gap-1.5 text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest hover:underline transition-colors">
                        <LogOut className="w-3 h-3" /> Revoke All
                    </button>
                </div>

                <div className="w-full p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-4">User</th>
                                        <th className="px-5 py-4">Device / Browser</th>
                                        <th className="px-5 py-4 hidden md:table-cell">IP Address</th>
                                        <th className="px-5 py-4">Login Time</th>
                                        <th className="px-5 py-4">Status</th>
                                        <th className="px-5 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold">
                                    {sessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-bold text-sm">No active sessions</td>
                                        </tr>
                                    ) : sessions.map((s) => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100">
                                                        {s.user?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-slate-900 leading-none mb-0.5">{s.user}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{s.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    {s.device.includes('Mobile') ? <Smartphone className="w-3.5 h-3.5 text-slate-400" /> : <Laptop className="w-3.5 h-3.5 text-slate-400" />}
                                                    <div>
                                                        <p className="font-bold text-xs text-slate-700">{s.browser}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{s.device}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 hidden md:table-cell text-xs text-slate-500 font-bold">{s.ip}</td>
                                            <td className="px-5 py-4 text-xs text-slate-500 font-bold">{s.loginTime}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                    {s.current ? 'Current' : s.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {s.current ? (
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Current Session</span>
                                                ) : (
                                                    <button onClick={() => handleEndSession(s.id)} className="text-[10px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 uppercase tracking-widest transition-all">Revoke</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
