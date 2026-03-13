import React, { useState } from 'react';
import { Save, CheckCircle2, FileCheck, Check, Fingerprint, Receipt } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { fireConfetti } from '../../utils/confettiInModal';
import { api } from '../../services/api';

const GSTSettings: React.FC = () => {
    const [config, setConfig] = useLocalStorage('nx_gst_config', {
        gstNumber: '1234567890',
        enableCGST: true,
        enableSGST: true,
        enableIGST: false,
        enableComposition: false,
    });
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.settings.update({ 'nx_gst_config': config });
            setSaved(true);
            fireConfetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#0284C7', '#10B981']
            });
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save GST settings to DB', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <FileCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">GST Configuration</h2>
                        <p className="text-xs text-slate-400 font-bold">Manage your GST details and tax components</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'} shadow-lg shadow-blue-200 disabled:opacity-70`}
                >
                    {saved ? <CheckCircle2 className="w-4 h-4 animate-in zoom-in" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saved ? 'Saved!' : 'Save GST Settings'}</span>
                </button>
            </div>

            {/* GSTIN Information - Matching Profile Asset Box Style */}
            <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Receipt className="w-3.5 h-3.5" /> GST Identification
                </h3>
                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">GSTIN Number</label>
                        <div className="relative">
                            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                value={config.gstNumber}
                                onChange={(e) => setConfig({ ...config, gstNumber: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm font-bold transition-all bg-white"
                                placeholder="e.g. 22AAAAA0000A1Z5"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tight px-1">Your 15-digit Tax Identification Number</p>
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Tax Components Group Box - Matching Profile Style */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Fingerprint className="w-4 h-4" /> Tax Components
                </h3>

                <div className="w-full p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                        {[
                            { key: 'enableCGST', label: 'CGST (Central GST)', desc: 'Intra-state transactions' },
                            { key: 'enableSGST', label: 'SGST (State GST)', desc: 'Intra-state transactions' },
                            { key: 'enableIGST', label: 'IGST (Integrated GST)', desc: 'Inter-state transactions' },
                            { key: 'enableComposition', label: 'Composition Scheme', desc: 'SME dynamic tax' },
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-100 transition-all shadow-sm">
                                <div>
                                    <p className="font-bold text-sm text-slate-900 leading-none mb-1">{item.label}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.desc}</p>
                                </div>
                                <button
                                    onClick={() => setConfig(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(config as any)[item.key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${(config as any)[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GSTSettings;


