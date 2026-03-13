import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageSquare, Save, Phone, CheckCircle2, Wifi, WifiOff, QrCode, RefreshCw,
    Send, LogOut, Loader2, AlertCircle, Clock, ChevronDown, ChevronUp,
    Smartphone, Link2, Unlink, Activity, Zap, MessageCircle, FileText,
    Image as ImageIcon, ArrowRight, Search, Filter, XCircle, Shield
} from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { api } from '../../services/api';
import { fireConfetti } from '../../utils/confettiInModal';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConnectionStatus {
    status: string;
    connectionInfo: {
        pushName?: string;
        phoneNumber?: string;
        platform?: string;
    };
    queueLength: number;
    reconnectAttempts: number;
    uptime: number;
}

interface MessageLogEntry {
    _id: string;
    to: string;
    type: string;
    content: string;
    status: string;
    error?: string;
    sentAt?: string;
    createdAt: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
const WhatsAppSettings: React.FC = () => {
    // Connection state
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Pairing
    const [pairingMode, setPairingMode] = useState<'qr' | 'phone'>('qr');
    const [pairingPhone, setPairingPhone] = useState('');
    const [pairingCode, setPairingCode] = useState<string | null>(null);

    // Test message
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [testType, setTestType] = useState<'text' | 'receipt'>('text');

    // Message history
    const [messages, setMessages] = useState<MessageLogEntry[]>([]);
    const [msgFilter, setMsgFilter] = useState('');
    const [msgStatusFilter, setMsgStatusFilter] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    // Settings (persisted)
    const [config, setConfig] = useLocalStorage('nx_whatsapp_config', {
        apiNumber: '',
        businessName: 'NEXA POS Store',
        autoReply: true,
        orderConfirmation: true,
        paymentReceipt: true,
        deliveryUpdate: true,
        promotionalMessages: false,
        welcomeMessage: 'Welcome to NEXA POS! How can we help you today?',
        orderTemplate: 'Hi {{name}}, your order #{{orderId}} has been confirmed. Total: ₹{{amount}}',
        paymentTemplate: 'Hi {{name}}, payment of ₹{{amount}} received. Thank you!',
    });
    const [saved, setSaved] = useState(false);

    // Polling refs
    const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Fetch Status ────────────────────────────────────────────────────────
    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.whatsapp.getStatus();
            if (res.success) {
                setConnectionStatus(res.data);
                // If the status response includes a QR code, use it directly
                if (res.data.qrCode) {
                    setQrCode(res.data.qrCode);
                }
                if (res.data.status === 'ready' && res.data.connectionInfo?.phoneNumber) {
                    setConfig((prev: typeof config) => ({ ...prev, apiNumber: res.data.connectionInfo.phoneNumber }));
                }
            }
            setError(null);
        } catch (err: any) {
            // Don't overwrite connection status on transient fetch errors
            if (!connectionStatus) setError('Cannot reach backend service');
        } finally {
            setLoading(false);
        }
    }, []);

    // ─── Fetch QR ────────────────────────────────────────────────────────────
    const fetchQr = useCallback(async () => {
        try {
            const res = await api.whatsapp.getQr();
            // The backend returns { success: true, data: { qrCode, ready } }
            const qr = res.data?.qrCode || res.qr;
            const ready = res.data?.ready || res.ready;
            if (qr) {
                setQrCode(qr);
            } else if (ready) {
                setQrCode(null);
                // Stop QR polling — already connected
                if (qrIntervalRef.current) {
                    clearInterval(qrIntervalRef.current);
                    qrIntervalRef.current = null;
                }
            }
        } catch { /* silent */ }
    }, []);

    // ─── Boot ────────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchStatus();
        statusIntervalRef.current = setInterval(fetchStatus, 5000);
        return () => {
            if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
            if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
        };
    }, [fetchStatus]);

    // Start QR polling when not ready
    useEffect(() => {
        const status = connectionStatus?.status;
        if (status && status !== 'ready' && status !== 'authenticated') {
            if (!qrIntervalRef.current) {
                fetchQr();
                qrIntervalRef.current = setInterval(fetchQr, 3000);
            }
        } else {
            if (qrIntervalRef.current) {
                clearInterval(qrIntervalRef.current);
                qrIntervalRef.current = null;
            }
            setQrCode(null);
        }
    }, [connectionStatus?.status, fetchQr]);

    // ─── Actions ─────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        if (!confirm('Are you sure you want to disconnect WhatsApp? You will need to scan QR again.')) return;
        setActionLoading('logout');
        try {
            await api.whatsapp.logout();
            showSuccess('WhatsApp disconnected');
            fetchStatus();
        } catch (err: any) { showError(err.message); }
        finally { setActionLoading(null); }
    };

    const handleRestart = async () => {
        setActionLoading('restart');
        try {
            await api.whatsapp.restart();
            showSuccess('Restart initiated — reconnecting...');
            fetchStatus();
        } catch (err: any) { showError(err.message); }
        finally { setActionLoading(null); }
    };

    const handlePairingCode = async () => {
        if (!pairingPhone || pairingPhone.length < 10) {
            showError('Enter a valid 10-digit phone number');
            return;
        }
        // Auto-prepend 91 for 10-digit Indian numbers
        const fullNumber = pairingPhone.length === 10 ? `91${pairingPhone}` : pairingPhone;
        setActionLoading('pair');
        try {
            const res = await api.whatsapp.requestPairingCode(fullNumber);
            if (res.success && res.pairingCode) {
                setPairingCode(res.pairingCode);
                showSuccess('Pairing code generated! Enter it on your phone.');
            } else if (res.success && !res.pairingCode) {
                // Already connected
                showSuccess(res.message || 'Already connected');
            }
        } catch (err: any) {
            const msg = err.message || '';
            // Known whatsapp-web.js v1.34+ bug — phone pairing not supported
            if (msg.includes('not supported') || msg.includes('QR code') || msg.includes('onCodeReceivedEvent')) {
                showError('Phone pairing is unavailable — please use QR code scanning instead.');
                setPairingMode('qr');
            } else {
                showError(msg);
            }
        }
        finally { setActionLoading(null); }
    };

    const handleSendTest = async () => {
        if (!testPhone) { showError('Enter a phone number'); return; }
        if (!testMessage && testType === 'text') { showError('Enter a message'); return; }
        setActionLoading('send');
        try {
            if (testType === 'receipt') {
                await api.whatsapp.sendReceipt(testPhone, {
                    storeName: config.businessName || 'NEXA POS Store',
                    invoiceNo: 'TEST-' + Date.now().toString().slice(-6),
                    date: new Date().toLocaleDateString('en-IN'),
                    items: [
                        { name: 'Test Product A', qty: 2, price: 250, amount: 500 },
                        { name: 'Test Product B', qty: 1, price: 150, amount: 150 },
                    ],
                    subtotal: 650,
                    tax: 39,
                    total: 689,
                    footer: 'This is a test receipt from Settings',
                });
            } else {
                await api.whatsapp.send({ to: testPhone, type: 'text', content: testMessage });
            }
            showSuccess('Message queued successfully!');
            setTestMessage('');
        } catch (err: any) { showError(err.message); }
        finally { setActionLoading(null); }
    };

    const handleFetchMessages = async () => {
        setActionLoading('messages');
        try {
            const res = await api.whatsapp.getMessages({
                page: 1,
                limit: 20,
                status: msgStatusFilter || undefined,
                to: msgFilter || undefined,
            });
            if (res.success) setMessages(res.data || []);
        } catch (err: any) { showError(err.message); }
        finally { setActionLoading(null); }
    };

    const handleSave = () => {
        setSaved(true);
        fireConfetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#10B981', '#059669'] });
        setTimeout(() => setSaved(false), 3000);
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const showError = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000); };
    const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

    const isReady = connectionStatus?.status === 'ready';
    const statusColor = isReady ? 'green' : connectionStatus?.status === 'qr_ready' ? 'amber' : connectionStatus?.status === 'connecting' ? 'blue' : 'red';
    const statusLabel = isReady ? 'Connected' : connectionStatus?.status === 'qr_ready' ? 'Waiting for QR Scan' : connectionStatus?.status === 'authenticated' ? 'Authenticating...' : connectionStatus?.status === 'connecting' ? 'Connecting...' : 'Disconnected';

    const formatUptime = (s: number) => {
        if (!s) return '—';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
        <button onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-slate-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">WhatsApp Integration</h2>
                        <p className="text-xs text-slate-400 font-bold">Connect, configure & monitor your WhatsApp Business</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-lg shadow-blue-200`}
                >
                    {saved ? <CheckCircle2 className="w-4 h-4 animate-in zoom-in" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saved ? 'Saved!' : 'Save Connection'}</span>
                </button>
            </div>

            {/* ─── Alerts ─── */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm font-bold text-red-700">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto"><XCircle className="w-4 h-4 text-red-400" /></button>
                </div>
            )}
            {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-sm font-bold text-emerald-700">{successMsg}</p>
                </div>
            )}

            {/* ─── Connection Status Card ─── */}
            <div className={`w-full p-5 rounded-2xl border-2 transition-all ${isReady ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isReady ? 'bg-green-500' : 'bg-slate-300'}`}>
                            {isReady ? <Wifi className="w-5 h-5 text-white" /> : <WifiOff className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-black text-slate-900 text-base uppercase">{statusLabel}</h3>
                                <span className={`w-2.5 h-2.5 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : `bg-${statusColor}-400`}`} />
                            </div>
                            {isReady && connectionStatus?.connectionInfo && (
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {connectionStatus.connectionInfo.pushName} · +{connectionStatus.connectionInfo.phoneNumber} · {connectionStatus.connectionInfo.platform}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleRestart}
                            disabled={actionLoading === 'restart'}
                            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm disabled:opacity-50"
                        >
                            {actionLoading === 'restart' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            <span>Restart</span>
                        </button>
                        {isReady && (
                            <button
                                onClick={handleLogout}
                                disabled={actionLoading === 'logout'}
                                className="flex items-center space-x-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                            >
                                {actionLoading === 'logout' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                                <span>Disconnect</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                {connectionStatus && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/70 backdrop-blur rounded-xl p-3 text-center border border-white/50">
                            <Activity className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                            <p className="text-lg font-black text-slate-900">{formatUptime(connectionStatus.uptime)}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uptime</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur rounded-xl p-3 text-center border border-white/50">
                            <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                            <p className="text-lg font-black text-slate-900">{connectionStatus.queueLength}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Queue</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur rounded-xl p-3 text-center border border-white/50">
                            <RefreshCw className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                            <p className="text-lg font-black text-slate-900">{connectionStatus.reconnectAttempts}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reconnects</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── QR / Pairing Section (shown when not connected) ─── */}
            {!isReady && (
                <div className="w-full p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center space-x-2">
                        <Link2 className="w-4 h-4" />
                        <span>Connect WhatsApp</span>
                    </h3>

                    {/* QR Code Section */}
                    <div className="flex flex-col items-center space-y-4">
                        {qrCode ? (
                            <>
                                <div className="relative p-3 bg-white rounded-2xl shadow-xl border-2 border-green-100">
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl" />
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                        <QrCode className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <div className="text-center max-w-xs">
                                    <p className="text-sm font-bold text-slate-700">Scan with WhatsApp</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Open WhatsApp → Settings → Linked Devices → Link a Device → Scan this code
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center space-y-3 py-8">
                                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                                <p className="text-sm font-bold text-slate-500">Generating QR Code...</p>
                                <p className="text-xs text-slate-400">This may take a moment as the browser engine starts</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Test Message Section ─── */}
            {isReady && (
                <div className="w-full p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center space-x-2">
                        <Send className="w-4 h-4" />
                        <span>Send Test Message</span>
                    </h3>

                    <div className="flex space-x-2 mb-4">
                        <button
                            onClick={() => setTestType('text')}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${testType === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            <MessageCircle className="w-3 h-3" />
                            <span>Text</span>
                        </button>
                        <button
                            onClick={() => setTestType('receipt')}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${testType === 'receipt' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            <FileText className="w-3 h-3" />
                            <span>Receipt</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                            <div className="relative mt-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="919876543210"
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
                                />
                            </div>
                        </div>
                        {testType === 'text' && (
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Message</label>
                                <input
                                    value={testMessage}
                                    onChange={(e) => setTestMessage(e.target.value)}
                                    placeholder="Hello from Nexarats POS! 🚀"
                                    className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                />
                            </div>
                        )}
                    </div>
                    {testType === 'receipt' && (
                        <p className="text-xs text-slate-400 mt-2">A sample POS receipt with test products will be sent.</p>
                    )}
                    <button
                        onClick={handleSendTest}
                        disabled={actionLoading === 'send'}
                        className="mt-4 flex items-center space-x-2 px-5 py-2.5 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 transition-all disabled:opacity-50 shadow-lg shadow-green-100"
                    >
                        {actionLoading === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>Send {testType === 'receipt' ? 'Test Receipt' : 'Message'}</span>
                    </button>
                </div>
            )}

            <hr className="border-slate-100" />

            {/* Business Info - Matching Profile Asset Box Style */}
            <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 px-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Business Profile
                </h3>
                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 w-full">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Connected Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    value={isReady ? `+${connectionStatus?.connectionInfo?.phoneNumber || ''}` : config.apiNumber || 'Not connected'}
                                    readOnly
                                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none bg-white text-slate-500 cursor-not-allowed text-sm font-bold shadow-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Business Display Name</label>
                            <input
                                value={config.businessName}
                                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold bg-white shadow-sm transition-all"
                                placeholder="e.g. Nexarats Store"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Message History (Collapsible) ─── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => { setShowHistory(!showHistory); if (!showHistory && messages.length === 0) handleFetchMessages(); }}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-all"
                >
                    <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">Message History</h3>
                    </div>
                    {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showHistory && (
                    <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
                        {/* Filters */}
                        <div className="flex items-center space-x-3 pt-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    value={msgFilter}
                                    onChange={(e) => setMsgFilter(e.target.value)}
                                    placeholder="Filter by phone..."
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-300"
                                />
                            </div>
                            <select
                                value={msgStatusFilter}
                                onChange={(e) => setMsgStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none"
                            >
                                <option value="">All Status</option>
                                <option value="queued">Queued</option>
                                <option value="sent">Sent</option>
                                <option value="failed">Failed</option>
                            </select>
                            <button
                                onClick={handleFetchMessages}
                                disabled={actionLoading === 'messages'}
                                className="flex items-center space-x-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all disabled:opacity-50"
                            >
                                {actionLoading === 'messages' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Filter className="w-3 h-3" />}
                                <span>Fetch</span>
                            </button>
                        </div>

                        {/* Messages List */}
                        {messages.length === 0 ? (
                            <div className="text-center py-8">
                                <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-400 uppercase">No messages yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto vyapar-scrollbar">
                                {messages.map((msg) => (
                                    <div key={msg._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.status === 'sent' ? 'bg-green-100 text-green-600'
                                                : msg.status === 'failed' ? 'bg-red-100 text-red-600'
                                                    : msg.status === 'queued' ? 'bg-amber-100 text-amber-600'
                                                        : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                {msg.type === 'text' ? <MessageCircle className="w-3.5 h-3.5" /> :
                                                    msg.type === 'receipt' ? <FileText className="w-3.5 h-3.5" /> :
                                                        msg.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> :
                                                            <FileText className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-700 truncate">
                                                    +{msg.to} · <span className="text-slate-400 capitalize">{msg.type}</span>
                                                </p>
                                                <p className="text-[10px] text-slate-400 truncate">{msg.content?.substring(0, 60) || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${msg.status === 'sent' ? 'bg-green-100 text-green-600'
                                                : msg.status === 'failed' ? 'bg-red-100 text-red-600'
                                                    : msg.status === 'queued' ? 'bg-amber-100 text-amber-600'
                                                        : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                {msg.status}
                                            </span>
                                            <p className="text-[9px] text-slate-400 mt-1">
                                                {new Date(msg.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Security Note ─── */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3">
                <Shield className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-black text-slate-500 uppercase">Security Note</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        WhatsApp sessions are persisted locally in the server. Do not share the <code className="bg-slate-200 px-1 rounded text-[10px]">.wwebjs_auth</code> folder.
                        Set <code className="bg-slate-200 px-1 rounded text-[10px]">WA_API_KEY</code> in your <code className="bg-slate-200 px-1 rounded text-[10px]">.env</code> file to protect API endpoints in production.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppSettings;
