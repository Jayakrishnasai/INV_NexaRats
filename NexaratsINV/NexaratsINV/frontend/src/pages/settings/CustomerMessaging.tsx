import React, { useState, useEffect } from 'react';
import { Send, Users, MessageSquare, Search, CheckCircle2, X, Loader2, Phone, User as UserIcon, AlertTriangle, Sparkles, Clock } from 'lucide-react';
import { api } from '../../services/api';

interface CustomerData {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

const messageTemplates = [
    {
        id: 'greeting',
        label: '👋 Festive Greeting',
        template: 'Dear {name},\n\nWishing you and your family a very Happy Festival Season! 🎉✨\n\nThank you for being a valued customer. We appreciate your trust in us.\n\nBest Regards,\nYour Store Team'
    },
    {
        id: 'offer',
        label: '🎁 Special Offer',
        template: 'Hi {name}! 🌟\n\nGreat news! We have an exclusive offer just for you.\n\n🏷️ Get up to 30% OFF on selected items!\n⏰ Limited time offer — valid till this weekend.\n\nVisit us or shop online today.\n\nThank you! 🙏'
    },
    {
        id: 'newstock',
        label: '📦 New Stock Alert',
        template: 'Hello {name}! 👋\n\nExciting update — We have fresh new stock available! 🆕\n\nCome check out our latest collection. You will love what we have in store for you.\n\nSee you soon! 😊'
    },
    {
        id: 'thankyou',
        label: '🙏 Thank You',
        template: 'Dear {name},\n\nThank you for your recent purchase! We truly value your patronage. 💖\n\nIf you have any questions about your order, feel free to reach out. We are always happy to help.\n\nWarm regards,\nYour Store Team'
    },
    {
        id: 'reminder',
        label: '⏰ Payment Reminder',
        template: 'Hi {name},\n\nThis is a gentle reminder about your pending payment with us.\n\nKindly clear the balance at your earliest convenience. Feel free to reach out if you have any questions.\n\nThank you! 🙏'
    },
    {
        id: 'custom',
        label: '✏️ Custom Message',
        template: ''
    }
];

const CustomerMessaging: React.FC = () => {
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [messageTemplate, setMessageTemplate] = useState(messageTemplates[0].template);
    const [selectedTemplateId, setSelectedTemplateId] = useState('greeting');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
    const [waStatus, setWaStatus] = useState<string>('unknown');

    useEffect(() => {
        loadCustomers();
        checkWhatsAppStatus();
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await api.customers.getAll();
            // Filter customers that have phone numbers
            const withPhone = data.filter((c: any) => c.phone && c.phone.trim() !== '' && c.id !== 'WALK-IN');
            setCustomers(withPhone);
        } catch (err) {
            console.error('Failed to load customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const checkWhatsAppStatus = async () => {
        try {
            const result = await api.whatsapp.getStatus();
            setWaStatus(result.data?.status || 'unknown');
        } catch {
            setWaStatus('disconnected');
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
    );

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedCustomers(new Set());
        } else {
            setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
        }
        setSelectAll(!selectAll);
    };

    const toggleCustomer = (id: string) => {
        const next = new Set(selectedCustomers);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedCustomers(next);
        setSelectAll(next.size === filteredCustomers.length);
    };

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const tmpl = messageTemplates.find(t => t.id === templateId);
        if (tmpl && tmpl.id !== 'custom') {
            setMessageTemplate(tmpl.template);
        } else if (tmpl && tmpl.id === 'custom') {
            setMessageTemplate('');
        }
    };

    const handleSendMessages = async () => {
        if (selectedCustomers.size === 0 || !messageTemplate.trim()) return;
        setSending(true);
        setSendResult(null);
        try {
            const selectedList = customers
                .filter(c => selectedCustomers.has(c.id))
                .map(c => ({ name: c.name, phone: c.phone }));

            const result = await api.invoices.sendBulkMessage(selectedList, messageTemplate);
            setSendResult({ sent: result.sent, failed: result.failed, skipped: result.skipped });
        } catch (err) {
            console.error('Bulk message error:', err);
            setSendResult({ sent: 0, failed: selectedCustomers.size, skipped: 0 });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="w-full space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Customer Messaging</h2>
                        <p className="text-xs text-slate-400 font-bold">Standardize and automate customer communication</p>
                    </div>
                </div>
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${waStatus === 'ready' ? 'bg-green-50 text-green-600 shadow-sm' : 'bg-red-50 text-red-500 shadow-sm'}`}>
                    <div className={`w-2 h-2 rounded-full ${waStatus === 'ready' ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                    <span>{waStatus === 'ready' ? 'WhatsApp Ready' : 'WhatsApp Offline'}</span>
                </div>
            </div>

            {waStatus !== 'ready' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-amber-800">WhatsApp Not Connected</p>
                        <p className="text-xs font-bold text-amber-600 mt-1">
                            Please connect WhatsApp from the Settings → WhatsApp tab first before sending messages.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left — Customer Selection */}
                <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2">
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                <span>Select Recipients</span>
                            </h3>
                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                {selectedCustomers.size} / {customers.length} selected
                            </span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search customers by name or phone..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <button
                            onClick={handleSelectAll}
                            className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                        >
                            {selectAll ? '✕ Deselect All' : '☑ Select All'}
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                <span className="ml-2 text-sm font-bold text-slate-400">Loading customers...</span>
                            </div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 opacity-40">
                                <Users className="w-10 h-10 mb-3" />
                                <p className="text-sm font-black">No customers found</p>
                                <p className="text-xs font-bold text-slate-500 mt-1">Customers with phone numbers will appear here</p>
                            </div>
                        ) : (
                            filteredCustomers.map(c => (
                                <label
                                    key={c.id}
                                    className={`flex items-center space-x-3 p-3 cursor-pointer transition-colors ${selectedCustomers.has(c.id) ? 'bg-blue-50/60' : 'hover:bg-white'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedCustomers.has(c.id)}
                                        onChange={() => toggleCustomer(c.id)}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                        <UserIcon className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-800 truncate">{c.name}</p>
                                        <p className="text-xs font-bold text-slate-400 flex items-center space-x-1">
                                            <Phone className="w-2.5 h-2.5" />
                                            <span>{c.phone}</span>
                                        </p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                {/* Right — Message Composer */}
                <div className="space-y-4">
                    {/* Message Templates */}
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                        <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 mb-3">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Quick Templates</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {messageTemplates.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    onClick={() => handleTemplateSelect(tmpl.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedTemplateId === tmpl.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                                        }`}
                                >
                                    {tmpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Input */}
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                        <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 mb-2">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                            <span>Compose Message</span>
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                            Use <code className="bg-white px-1 py-0.5 rounded text-blue-600">{'{name}'}</code> for personalized customer name
                        </p>
                        <textarea
                            value={messageTemplate}
                            onChange={(e) => {
                                setMessageTemplate(e.target.value);
                                setSelectedTemplateId('custom');
                            }}
                            rows={8}
                            placeholder="Type your message here... Use {name} to personalize."
                            className="w-full p-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                        />
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] font-bold text-slate-400">
                                {messageTemplate.length} characters
                            </p>
                            <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-400">
                                <Clock className="w-2.5 h-2.5" />
                                <span>~{Math.ceil(selectedCustomers.size * 1.5)}s estimated send time</span>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    {messageTemplate && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
                            <h3 className="text-xs font-black text-green-700 uppercase tracking-widest mb-2">
                                📱 Message Preview
                            </h3>
                            <div className="bg-white rounded-lg p-3 shadow-sm border border-green-100">
                                <pre className="text-xs font-medium text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                                    {messageTemplate.replace(/\{name\}/gi, 'John Doe').replace(/\{\{name\}\}/gi, 'John Doe')}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Send Result */}
                    {sendResult && (
                        <div className={`rounded-xl border p-4 flex items-start space-x-3 ${sendResult.failed === 0
                            ? 'bg-green-50 border-green-200'
                            : 'bg-amber-50 border-amber-200'
                            }`}>
                            {sendResult.failed === 0 ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            )}
                            <div>
                                <p className="text-sm font-black text-slate-800">
                                    Messages Sent: {sendResult.sent} | Failed: {sendResult.failed} | Skipped: {sendResult.skipped}
                                </p>
                                <p className="text-xs font-bold text-slate-500 mt-1">
                                    {sendResult.failed === 0
                                        ? 'All messages were delivered successfully!'
                                        : 'Some messages could not be delivered. Check phone numbers and try again.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Send Button */}
                    <button
                        onClick={handleSendMessages}
                        disabled={selectedCustomers.size === 0 || !messageTemplate.trim() || sending || waStatus !== 'ready'}
                        className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center space-x-3 transition-all shadow-lg ${selectedCustomers.size === 0 || !messageTemplate.trim() || sending || waStatus !== 'ready'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 active:scale-[0.98]'
                            }`}
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending to {selectedCustomers.size} customers...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>Send to {selectedCustomers.size} Customer{selectedCustomers.size !== 1 ? 's' : ''} via WhatsApp</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerMessaging;
