import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaasAuth } from '../context/SaasAuthContext';
import {
    CheckCircle2, Zap, BarChart3, ShoppingCart, Users,
    KeyRound, AlertCircle, ChevronRight, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API = import.meta.env.VITE_API_URL ?? '/api/v1';

// ─── Step Components ──────────────────────────────────────────────────────────

const Step1Welcome: React.FC<{ orgName: string; onNext: () => void }> = ({ orgName, onNext }) => (
    <div className="text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-3">Welcome, {orgName}! 🎉</h2>
        <p className="text-slate-500 text-lg mb-8 max-w-sm mx-auto">
            Let's get your account set up in just a few steps. It takes less than 5 minutes.
        </p>
        <button id="onboarding-step1-next" onClick={onNext}
            className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto">
            Let's get started <ChevronRight size={18} />
        </button>
    </div>
);

const Step2Tour: React.FC<{ onNext: () => void }> = ({ onNext }) => {
    const features = [
        { icon: <ShoppingCart className="w-6 h-6 text-indigo-600" />, title: 'Billing & Invoices', desc: 'Create invoices, record payments, generate PDF receipts.' },
        { icon: <BarChart3 className="w-6 h-6 text-emerald-600" />, title: 'Analytics & Reports', desc: 'Real-time revenue, GST, and profit dashboards.' },
        { icon: <Users className="w-6 h-6 text-violet-600" />, title: 'Customers & Vendors', desc: 'Manage relationships, pending dues, and purchase history.' },
    ];
    return (
        <div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">What you can do with NexaRats</h2>
            <p className="text-slate-400 text-center mb-8">A quick look at what's waiting for you inside.</p>
            <div className="space-y-4 mb-8">
                {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0">{f.icon}</div>
                        <div>
                            <div className="font-semibold text-slate-800">{f.title}</div>
                            <div className="text-slate-400 text-sm">{f.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
            <button id="onboarding-step2-next" onClick={onNext}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                Continue <ChevronRight size={18} />
            </button>
        </div>
    );
};

const Step3RazorpaySetup: React.FC<{ onNext: () => void }> = ({ onNext }) => {
    const [keyId, setKeyId] = useState('');
    const [keySecret, setKeySecret] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!keyId.startsWith('rzp_')) { setError('Key ID must start with rzp_'); return; }
        if (!keySecret) { setError('Key Secret is required'); return; }
        setSaving(true); setError(null);
        try {
            const res = await fetch(`${API}/keys/razorpay`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key_id: keyId, key_secret: keySecret }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed to save keys'); }
            onNext();
        } catch (e: any) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-2">
                <KeyRound className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-black text-slate-800">Connect Razorpay</h2>
            </div>
            <p className="text-slate-400 mb-6">Add your Razorpay API keys to accept online payments. Find them at <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">dashboard.razorpay.com</a>.</p>
            {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4"><AlertCircle size={14} />{error}</div>}
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Key ID</label>
                    <input id="onboarding-razorpay-key-id" value={keyId} onChange={e => setKeyId(e.target.value)} placeholder="rzp_live_..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Key Secret</label>
                    <input id="onboarding-razorpay-key-secret" type="password" value={keySecret} onChange={e => setKeySecret(e.target.value)} placeholder="Your Razorpay secret" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={onNext} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 font-medium hover:bg-slate-50">Skip for now</button>
                <button id="onboarding-step3-save" onClick={handleSave} disabled={saving}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save & continue'}
                </button>
            </div>
        </div>
    );
};

const Step4Validate: React.FC<{ onNext: () => void }> = ({ onNext }) => {
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [msg, setMsg] = useState('');

    const handleTest = async () => {
        setStatus('testing'); setMsg('');
        try {
            const res = await fetch(`${API}/keys/validate`, { method: 'POST', credentials: 'include' });
            const d = await res.json();
            if (res.ok) { setStatus('success'); setMsg('Razorpay connection verified successfully!'); }
            else { setStatus('error'); setMsg(d.error ?? 'Validation failed'); }
        } catch { setStatus('error'); setMsg('Network error during validation'); }
    };

    return (
        <div className="text-center">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-colors ${status === 'success' ? 'bg-green-50' : status === 'error' ? 'bg-red-50' : 'bg-indigo-50'}`}>
                {status === 'testing' ? <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    : status === 'success' ? <CheckCircle2 className="w-10 h-10 text-green-500" />
                        : status === 'error' ? <AlertCircle className="w-10 h-10 text-red-500" />
                            : <KeyRound className="w-10 h-10 text-indigo-600" />}
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Test your connection</h2>
            <p className="text-slate-400 mb-6">We'll create a ₹1 test order to verify your Razorpay keys work correctly.</p>
            {msg && <p className={`text-sm mb-4 ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
            <div className="flex gap-3 justify-center">
                {status !== 'success' && (
                    <button id="onboarding-step4-test" onClick={handleTest} disabled={status === 'testing'}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {status === 'testing' ? <><Loader2 size={16} className="animate-spin" /> Testing...</> : 'Test connection'}
                    </button>
                )}
                <button id="onboarding-step4-continue" onClick={onNext}
                    className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50">
                    {status === 'success' ? 'Continue →' : 'Skip for now'}
                </button>
            </div>
        </div>
    );
};

const Step5Ready: React.FC<{ onComplete: () => void; completing: boolean }> = ({ onComplete, completing }) => (
    <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <BarChart3 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-3">You're all set! 🚀</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            Your NexaRats account is ready. Start by exploring the dashboard or creating your first invoice.
        </p>
        <button id="onboarding-complete-btn" onClick={onComplete} disabled={completing}
            className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-all flex items-center gap-2 mx-auto disabled:opacity-50">
            {completing ? <><Loader2 size={18} className="animate-spin" /> Setting up...</> : 'Go to Dashboard →'}
        </button>
    </div>
);

// ─── Main Onboarding Page ─────────────────────────────────────────────────────

const STEPS = ['Welcome', 'Product Tour', 'Razorpay', 'Validate', 'Go Live'];

export default function OnboardingPage() {
    const { org, refresh } = useSaasAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [completing, setCompleting] = useState(false);

    // Resume from last saved step
    useEffect(() => {
        if (org?.onboarding_step) setStep(Math.min(org.onboarding_step, 4));
    }, [org]);

    const advanceStep = async (nextStep: number) => {
        setStep(nextStep);
        try {
            await fetch(`${API}/onboarding/step`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step: nextStep }),
            });
        } catch { /* non-blocking */ }
    };

    const handleComplete = async () => {
        setCompleting(true);
        try {
            await fetch(`${API}/onboarding/complete`, { method: 'PATCH', credentials: 'include' });
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
            await refresh();
            setTimeout(() => navigate('/admin/dashboard'), 1500);
        } catch { setCompleting(false); }
    };

    const progress = ((step + 1) / STEPS.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/30 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-indigo-100/50 overflow-hidden">
                {/* Progress header */}
                <div className="px-8 pt-8 pb-6">
                    <div className="flex items-center justify-between mb-4">
                        {STEPS.map((s, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? 'bg-indigo-600 text-white' : i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                                    {i < step ? <CheckCircle2 size={14} /> : i + 1}
                                </div>
                                <span className={`text-[10px] font-medium hidden sm:block ${i === step ? 'text-indigo-600' : 'text-slate-300'}`}>{s}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Step content */}
                <div className="px-8 pb-10">
                    {step === 0 && <Step1Welcome orgName={org?.name ?? 'there'} onNext={() => advanceStep(1)} />}
                    {step === 1 && <Step2Tour onNext={() => advanceStep(2)} />}
                    {step === 2 && <Step3RazorpaySetup onNext={() => advanceStep(3)} />}
                    {step === 3 && <Step4Validate onNext={() => advanceStep(4)} />}
                    {step === 4 && <Step5Ready onComplete={handleComplete} completing={completing} />}
                </div>
            </div>
        </div>
    );
}
