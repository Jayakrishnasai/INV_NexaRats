import React, { useState, useRef } from 'react';
import { Save, Upload, CheckCircle2, User, ImageIcon, PenTool, X, Camera } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { api } from '../../services/api';
import { fireConfetti } from '../../utils/confettiInModal';

const ProfileSettings: React.FC = () => {
    const [profile, setProfile] = useLocalStorage('inv_admin_profile', {
        name: 'Admin',
        email: '',
        phone: '',
        businessName: 'My Store',
        address: '',
        role: 'Administrator',
        avatar: '',
        signature: '',
        logo: '',
    });
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const signatureInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const compressImage = (file: File, maxWidth: number = 400): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const compressed = await compressImage(file, 200);
            setProfile({ ...profile, avatar: compressed });
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const compressed = await compressImage(file, 300);
            setProfile({ ...profile, signature: compressed });
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const compressed = await compressImage(file, 400);
            setProfile({ ...profile, logo: compressed });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.settings.update({ 'inv_admin_profile': profile });
            setSaved(true);
            // Fire Paper Blast / confetti animation on successful save
            fireConfetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6']
            });
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save settings to DB:', error);
            // Still mark as saved for localStorage (which already persisted)
            setSaved(true);
            fireConfetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6']
            });
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Admin Profile</h2>
                        <p className="text-xs text-slate-400 font-bold">Manage your profile, logo, and signature</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'} shadow-lg shadow-blue-200 disabled:opacity-70`}
                >
                    {saving ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    ) : saved ? <CheckCircle2 className="w-4 h-4 animate-in zoom-in" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}</span>
                </button>
            </div>

            {/* Avatar Section */}
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className="relative group">
                    <div className="w-20 h-20 rounded-xl bg-blue-100 flex items-center justify-center text-2xl font-black text-blue-600 overflow-hidden shrink-0">
                        {profile.avatar ? (
                            <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            profile.name?.charAt(0)?.toUpperCase() || 'A'
                        )}
                    </div>
                    <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-700 transition-all">
                        <Camera className="w-3 h-3 text-white" />
                    </label>
                    <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-lg">{profile.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{profile.role}</p>
                    <p className="text-xs text-slate-400 mt-1">{profile.email || 'No email set'}</p>
                </div>
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                    <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold" />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Email</label>
                    <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold" />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Phone</label>
                    <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold" />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Business Name</label>
                    <input value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold" />
                </div>
                <div className="sm:col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Address</label>
                    <textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} rows={3} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold resize-none" />
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Business Logo Upload */}
            <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5" /> Business Logo
                </h3>
                <p className="text-xs text-slate-400 font-bold">Upload your business logo to display on invoices and documents</p>

                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                    {profile.logo ? (
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden bg-white flex items-center justify-center">
                                <img src={profile.logo} alt="Business Logo" className="w-full h-full object-contain p-1" />
                            </div>
                            <button
                                onClick={() => setProfile({ ...profile, logo: '' })}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-white">
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                        </div>
                    )}
                    <div>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} />
                        <button
                            onClick={() => logoInputRef.current?.click()}
                            className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            {profile.logo ? 'Change Logo' : 'Upload Logo'}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold">PNG, JPG, or SVG. Max 2MB recommended.</p>
                    </div>
                </div>
            </div>

            {/* Signature Upload */}
            <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <PenTool className="w-3.5 h-3.5" /> Digital Signature
                </h3>
                <p className="text-xs text-slate-400 font-bold">Upload your signature image to include on invoices</p>

                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100">
                    {profile.signature ? (
                        <div className="relative group">
                            <div className="w-40 h-20 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden bg-white flex items-center justify-center">
                                {profile.signature.startsWith('data:') || profile.signature.startsWith('http') ? (
                                    <img src={profile.signature} alt="Signature" className="max-w-full max-h-full object-contain p-1" />
                                ) : (
                                    <p className="text-sm font-bold text-slate-600 italic px-2">{profile.signature}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setProfile({ ...profile, signature: '',
        logo: ''})}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-40 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-white">
                            <PenTool className="w-6 h-6 text-slate-300" />
                        </div>
                    )}
                    <div className="space-y-2">
                        <input type="file" ref={signatureInputRef} className="hidden" accept="image/png,image/jpeg" onChange={handleSignatureUpload} />
                        <button
                            onClick={() => signatureInputRef.current?.click()}
                            className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            {profile.signature ? 'Change Signature' : 'Upload Signature'}
                        </button>
                        <p className="text-[10px] text-slate-400 font-bold">PNG or JPG with transparent background recommended.</p>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 mb-1 block">Or type your name as signature:</label>
                            <input
                                type="text"
                                placeholder="e.g. John Doe"
                                value={profile.signature?.startsWith('data:') ? '' : (profile.signature || '')}
                                onChange={(e) => setProfile({ ...profile, signature: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
