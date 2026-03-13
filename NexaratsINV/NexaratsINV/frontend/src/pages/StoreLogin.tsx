import React, { useState, useRef, useEffect } from 'react';
import { X, Phone, Eye, EyeOff, MessageSquare, ShieldCheck, Loader2, RefreshCw, Lock, User, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export type AuthMode = 'login-password' | 'login-otp' | 'signup';

interface StoreLoginModalProps {
    onLoginSuccess: (phone: string, token: string, customer?: any) => void;
    onClose: () => void;
    storeName?: string;
    initialMode?: AuthMode;
}

// ─── Sub-components Moved Outside to prevent re-creation on every render ─────────────────
const ResendTimer = ({ onResend, countdown, loading }: { onResend: () => void, countdown: number, loading: boolean }) => {
    if (countdown > 0) return <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Resend in <b style={{ color: '#15803d' }}>{countdown}s</b></span>;
    return (
        <button onClick={onResend} disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#15803d', fontWeight: 800, background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Resend OTP
        </button>
    );
};

const PhoneInput = ({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter: () => void }) => (
    <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Mobile Number</label>
        <div style={{ display: 'flex', gap: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 16px', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.6)', borderRight: 'none', borderRadius: '16px 0 0 16px', fontSize: 15, fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
            <input
                type="tel" autoFocus
                value={value}
                onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => e.key === 'Enter' && onEnter()}
                placeholder="Enter 10-digit number"
                maxLength={10}
                className="sf-auth-input"
                style={{ flex: 1, padding: '14px 16px', borderLeft: 'none', borderRadius: '0 16px 16px 0', fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', monospace" }}
            />
        </div>
    </div>
);

const OtpBoxes = ({ phone, otp, mode, setOtpStep, setSignupStep, handleOtpChange, handleOtpKeyDown, handleOtpPaste, otpRefs, countdown, loading, handleSendOtp, clearErrors, setOtp }: {
    phone: string, otp: string[], mode: AuthMode, setOtpStep: any, setSignupStep: any, handleOtpChange: any, handleOtpKeyDown: any, handleOtpPaste: any, otpRefs: any, countdown: number, loading: boolean, handleSendOtp: any, clearErrors: any, setOtp: any
}) => (
    <div>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, marginBottom: 8 }}>
                <Phone size={12} color="#15803d" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>+91 {phone}</span>
                <button onClick={() => { mode === 'login-otp' ? setOtpStep('phone') : setSignupStep('phone'); setOtp(['', '', '', '', '', '']); clearErrors(); }} style={{ fontSize: 11, color: '#15803d', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Enter the 6-digit OTP sent to WhatsApp</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }} onPaste={handleOtpPaste}>
            {otp.map((digit, idx) => (
                <input key={idx} ref={el => { otpRefs.current[idx] = el; }}
                    type="tel" inputMode="numeric" maxLength={2} value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    onFocus={e => e.target.select()}
                    style={{ width: 48, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 900, borderRadius: 14, border: digit ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.8)', background: digit ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', color: digit ? '#4f46e5' : '#0f172a', outline: 'none', transition: 'all 0.2s', fontFamily: "'Outfit', monospace", backdropFilter: 'blur(10px)', boxShadow: digit ? '0 4px 12px rgba(99,102,241,0.2)' : 'inset 0 2px 4px rgba(255,255,255,0.5)' }}
                />
            ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
            <ResendTimer countdown={countdown} loading={loading} onResend={() => { setOtp(['', '', '', '', '', '']); handleSendOtp(); }} />
        </div>
    </div>
);

const StoreLoginModal: React.FC<StoreLoginModalProps> = ({
    onLoginSuccess,
    onClose,
    storeName = 'NEXA Store',
    initialMode = 'login-otp',
}) => {
    const [mode, setMode] = useState<AuthMode>(initialMode);

    // Shared
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Password login
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    // OTP login
    const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Signup
    const [signupStep, setSignupStep] = useState<'phone' | 'otp' | 'details'>('phone');
    const [signupName, setSignupName] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirm, setSignupConfirm] = useState('');
    const [showSignupPwd, setShowSignupPwd] = useState(false);

    // Countdown for OTP resend
    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const clearErrors = () => { setError(''); setSuccess(''); };
    const switchMode = (m: AuthMode) => { setMode(m); clearErrors(); setPhone(''); setPassword(''); setOtp(['', '', '', '', '', '']); setOtpStep('phone'); setSignupStep('phone'); };

    // ─── Password Login ──────────────────────────────────────────────────────
    const handlePasswordLogin = async () => {
        if (!phone || !/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit mobile number'); return; }
        if (!password) { setError('Enter your password'); return; }
        setLoading(true); clearErrors();
        try {
            const res = await api.auth.loginWithPassword(phone, password);
            if (res.success) {
                setSuccess('Login successful! Welcome back 🎉');
                setTimeout(() => onLoginSuccess(res.phone, res.sessionToken, res.customer), 600);
            }
        } catch (err: any) { setError(err.message || 'Login failed'); }
        finally { setLoading(false); }
    };

    // ─── OTP Send ─────────────────────────────────────────────────────────────
    const handleSendOtp = async (phoneNum?: string) => {
        const p = phoneNum || phone;
        if (!p || !/^[6-9]\d{9}$/.test(p)) { setError('Enter a valid 10-digit mobile number'); return; }
        setLoading(true); clearErrors();
        try {
            const res = await api.auth.sendOtp(p);
            if (res.success) {
                setSuccess(res.message || 'OTP sent to your WhatsApp!');
                setCountdown(30);
                if (mode === 'login-otp') { setOtpStep('otp'); setTimeout(() => otpRefs.current[0]?.focus(), 200); }
                if (mode === 'signup') { setSignupStep('otp'); setTimeout(() => otpRefs.current[0]?.focus(), 200); }
            }
        } catch (err: any) { setError(err.message || 'Failed to send OTP'); }
        finally { setLoading(false); }
    };

    // ─── OTP Verify (for OTP login only) ─────────────────────────────────────
    const handleVerifyOtp = async (otpVal?: string) => {
        const finalOtp = otpVal || otp.join('');
        if (finalOtp.length !== 6) { setError('Enter the complete 6-digit OTP'); return; }
        setLoading(true); clearErrors();
        try {
            const res = await api.auth.verifyOtp(phone, finalOtp);
            if (res.success) {
                setSuccess('Verified! Logging you in…');
                setTimeout(() => onLoginSuccess(res.phone, res.sessionToken, res.customer), 700);
            }
        } catch (err: any) {
            setError(err.message || 'Invalid OTP');
            // Don't wipe the whole OTP, just focus the last digit so they can fix it
            otpRefs.current[5]?.focus();
        }
        finally { setLoading(false); }
    };

    // ─── Signup OTP Verify → move to details ────────────────────────────────
    const handleSignupOtpVerify = async (otpVal?: string) => {
        const finalOtp = otpVal || otp.join('');
        if (finalOtp.length !== 6) { setError('Enter the complete 6-digit OTP'); return; }
        setLoading(true); clearErrors();
        try {
            // We call verify-otp which creates a guest account first, then we upgrade with signup
            const res = await api.auth.verifyOtp(phone, finalOtp);
            if (res.success) {
                setSuccess('Phone verified! Now set your name & password.');
                setSignupStep('details');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid OTP');
            otpRefs.current[5]?.focus();
        }
        finally { setLoading(false); }
    };

    // ─── Final Signup ─────────────────────────────────────────────────────────
    const handleSignup = async () => {
        if (!signupName.trim()) { setError('Please enter your full name'); return; }
        if (signupPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        if (signupPassword !== signupConfirm) { setError('Passwords do not match'); return; }
        setLoading(true); clearErrors();
        try {
            const res = await api.auth.signup(phone, signupName.trim(), signupPassword);
            if (res.success) {
                setSuccess('Account created! Welcome 🎉');
                setTimeout(() => onLoginSuccess(res.phone, res.sessionToken, res.customer), 700);
            }
        } catch (err: any) { setError(err.message || 'Signup failed'); }
        finally { setLoading(false); }
    };

    // ─── OTP Input Handlers ───────────────────────────────────────────────────
    const handleOtpChange = (idx: number, val: string) => {
        // Only keep digits
        const cleanVal = val.replace(/\D/g, '');
        // If they typed something but it wasn't a digit (like a space or symbol), just ignore the change
        if (!cleanVal && val !== '') return;

        const n = [...otp];
        n[idx] = cleanVal.slice(-1); // Take the rightmost digit typed
        setOtp(n);
        clearErrors();

        if (cleanVal && idx < 5) {
            // Focus next box
            setTimeout(() => otpRefs.current[idx + 1]?.focus(), 10);
        }

        const full = n.join('');
        if (full.length === 6) {
            // Auto-verify when 6 digits are complete
            if (mode === 'login-otp') handleVerifyOtp(full);
            else if (mode === 'signup') handleSignupOtpVerify(full);
        }
    };
    const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    };
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (p.length === 6) { setOtp(p.split('')); mode === 'login-otp' ? handleVerifyOtp(p) : handleSignupOtpVerify(p); }
    };

    const tabs: { id: AuthMode; label: string; icon: React.ReactNode }[] = [
        { id: 'login-password', label: 'Login', icon: <Lock size={14} /> },
        { id: 'login-otp', label: 'OTP Login', icon: <MessageSquare size={14} /> },
        { id: 'signup', label: 'Sign Up', icon: <User size={14} /> },
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 32, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(31, 38, 135, 0.12)', overflow: 'hidden', animation: 'sfModalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <style>{`
                    @keyframes sfModalIn { 0% { opacity:0; transform: scale(0.95) translateY(20px); filter: blur(10px); } 100% { opacity:1; transform: scale(1) translateY(0); filter: blur(0); } }
                    .sf-auth-input { background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.8); backdrop-filter: blur(10px); transition: all 0.2s; color: #0f172a; outline: none; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5); }
                    .sf-auth-input:focus { border-color: #6366f1 !important; background: rgba(255,255,255,0.85); box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }
                    .sf-auth-btn { width: 100%; padding: 15px; border: none; border-radius: 16px; font-weight: 800; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,0.3); text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                    .sf-auth-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
                    .sf-auth-btn:disabled { background: rgba(203,213,225,0.6); color: #64748b; box-shadow: none; transform: none; cursor: not-allowed; text-shadow: none; }
                `}</style>

                {/* Header */}
                <div style={{ padding: '32px 32px 16px', position: 'relative', textAlign: 'center' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }}>
                        <X size={18} />
                    </button>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: 20, marginBottom: 16, boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
                        <ShieldCheck size={32} color="#fff" />
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 26, color: '#0f172a', letterSpacing: '-0.5px' }}>{storeName}</div>
                    <div style={{ fontSize: 14, color: '#475569', fontWeight: 500, marginTop: 4 }}>
                        {mode === 'signup' ? 'Create a new account' : 'Welcome back to our store'}
                    </div>

                    {/* Mode Toggle Instead of Tabs */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24, padding: '4px', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <button onClick={() => switchMode('login-password')} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: mode === 'login-password' || mode === 'login-otp' ? '#fff' : 'transparent', color: mode === 'login-password' || mode === 'login-otp' ? '#4f46e5' : '#64748b', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', boxShadow: mode === 'login-password' || mode === 'login-otp' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
                            Login
                        </button>
                        <button onClick={() => switchMode('signup')} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: mode === 'signup' ? '#fff' : 'transparent', color: mode === 'signup' ? '#4f46e5' : '#64748b', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', boxShadow: mode === 'signup' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
                            Sign Up
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '0 32px 32px' }}>

                    {/* ── LOGIN WITH PASSWORD ──────────────────────────────── */}
                    {mode === 'login-password' && (
                        <form onSubmit={(e) => { e.preventDefault(); handlePasswordLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <PhoneInput value={phone} onChange={setPhone} onEnter={() => document.getElementById('sf-pwd-input')?.focus()} />
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input id="sf-pwd-input"
                                        type={showPwd ? 'text' : 'password'} value={password}
                                        onChange={e => { setPassword(e.target.value); clearErrors(); }}
                                        onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                                        placeholder="Enter your password"
                                        className="sf-auth-input"
                                        style={{ width: '100%', padding: '14px 44px 14px 16px', borderRadius: 16, fontSize: 16, fontWeight: 600, boxSizing: 'border-box' }}
                                    />
                                    <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={loading || phone.length < 10 || !password} className="sf-auth-btn" style={{ marginTop: 8 }}>
                                {loading ? <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><Lock size={18} /> Secure Login <ArrowRight size={18} /></>}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: 8 }}>
                                <button type="button" onClick={() => switchMode('login-otp')} style={{ fontSize: 14, color: '#4f46e5', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Login with WhatsApp OTP instead
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── OTP LOGIN ─────────────────────────────────────────── */}
                    {mode === 'login-otp' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {otpStep === 'phone' ? (<>
                                <PhoneInput value={phone} onChange={setPhone} onEnter={handleSendOtp} />
                                <button onClick={() => handleSendOtp()} disabled={loading || phone.length < 10} className="sf-auth-btn" style={{ marginTop: 8 }}>
                                    {loading ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><MessageSquare size={18} /> Send WhatsApp OTP <ArrowRight size={18} /></>}
                                </button>
                                <div style={{ textAlign: 'center', marginTop: 8 }}>
                                    <button type="button" onClick={() => switchMode('login-password')} style={{ fontSize: 14, color: '#4f46e5', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                        Login with Password instead
                                    </button>
                                </div>
                            </>) : (<>
                                <OtpBoxes
                                    phone={phone} otp={otp} mode={mode}
                                    setOtpStep={setOtpStep} setSignupStep={setSignupStep}
                                    handleOtpChange={handleOtpChange} handleOtpKeyDown={handleOtpKeyDown}
                                    handleOtpPaste={handleOtpPaste} otpRefs={otpRefs}
                                    countdown={countdown} loading={loading}
                                    handleSendOtp={handleSendOtp} clearErrors={clearErrors}
                                    setOtp={setOtp}
                                />
                                <button onClick={() => handleVerifyOtp()} disabled={loading || otp.join('').length < 6} className="sf-auth-btn" style={{ marginTop: 16 }}>
                                    {loading ? <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><ShieldCheck size={18} /> Verify & Login</>}
                                </button>
                            </>)}
                        </div>
                    )}

                    {/* ── SIGN UP ───────────────────────────────────────────── */}
                    {mode === 'signup' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {signupStep === 'phone' && (<>
                                <PhoneInput value={phone} onChange={setPhone} onEnter={handleSendOtp} />
                                <p style={{ fontSize: 13, color: '#475569', fontWeight: 600, margin: '4px 0 0' }}>
                                    We'll send a 6-digit OTP to verify your WhatsApp number.
                                </p>
                                <button onClick={() => handleSendOtp()} disabled={loading || phone.length < 10} className="sf-auth-btn" style={{ marginTop: 8 }}>
                                    {loading ? <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><MessageSquare size={18} /> Send Verification OTP <ArrowRight size={18} /></>}
                                </button>
                            </>)}

                            {signupStep === 'otp' && (<>
                                <OtpBoxes
                                    phone={phone} otp={otp} mode={mode}
                                    setOtpStep={setOtpStep} setSignupStep={setSignupStep}
                                    handleOtpChange={handleOtpChange} handleOtpKeyDown={handleOtpKeyDown}
                                    handleOtpPaste={handleOtpPaste} otpRefs={otpRefs}
                                    countdown={countdown} loading={loading}
                                    handleSendOtp={handleSendOtp} clearErrors={clearErrors}
                                    setOtp={setOtp}
                                />
                                <button onClick={() => handleSignupOtpVerify()} disabled={loading || otp.join('').length < 6} className="sf-auth-btn" style={{ marginTop: 16 }}>
                                    {loading ? <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><ShieldCheck size={18} /> Verify Phone Number</>}
                                </button>
                            </>)}

                            {signupStep === 'details' && (<form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Full Name *</label>
                                    <input type="text" value={signupName} onChange={e => { setSignupName(e.target.value); clearErrors(); }}
                                        placeholder="Enter your full name" autoFocus className="sf-auth-input"
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: 16, fontSize: 16, fontWeight: 600, boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Secure Password *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showSignupPwd ? 'text' : 'password'} value={signupPassword}
                                            onChange={e => { setSignupPassword(e.target.value); clearErrors(); }}
                                            placeholder="Minimum 6 characters" className="sf-auth-input"
                                            style={{ width: '100%', padding: '14px 44px 14px 16px', borderRadius: 16, fontSize: 16, fontWeight: 600, boxSizing: 'border-box' }}
                                        />
                                        <button type="button" onClick={() => setShowSignupPwd(!showSignupPwd)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                            {showSignupPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Confirm Password *</label>
                                    <input type={showSignupPwd ? 'text' : 'password'} value={signupConfirm}
                                        onChange={e => { setSignupConfirm(e.target.value); clearErrors(); }}
                                        onKeyDown={e => e.key === 'Enter' && handleSignup()}
                                        placeholder="Re-enter password" className="sf-auth-input"
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: 16, fontSize: 16, fontWeight: 600, boxSizing: 'border-box' }}
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="sf-auth-btn" style={{ marginTop: 8 }}>
                                    {loading ? <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><User size={18} /> Create My Account 🎉</>}
                                </button>
                            </form>)}
                        </div>
                    )}

                    {/* Error / Success */}
                    {error && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>⚠️</span>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', margin: 0 }}>{error}</p>
                        </div>
                    )}
                    {success && !error && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>✅</span>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', margin: 0 }}>{success}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '0 32px 32px', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, margin: 0, padding: '12px', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.6)' }}>
                        🔒 Secured with WhatsApp OTP • Powered by NEXA
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StoreLoginModal;
