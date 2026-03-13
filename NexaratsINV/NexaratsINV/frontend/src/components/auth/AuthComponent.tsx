import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, Mail, Lock, Eye, EyeOff, ArrowLeft, X, AlertCircle, PartyPopper, Loader, Gem } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ConfettiCanvas, { type ConfettiRef } from "../ui/ConfettiCanvas";
import { TextLoop } from "../ui/TextLoop";
import { BlurFade } from "../ui/BlurFade";
import GlassButton from "../ui/GlassButton";
import GradientBackground from "../ui/GradientBackground";
import { cn } from "../../utils/cn";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-6 h-6">
        <g fillRule="evenodd" fill="none">
            <g fillRule="nonzero" transform="translate(3, 2)">
                <path fill="#4285F4" d="M57.8123233,30.1515267 C57.8123233,27.7263183 57.6155321,25.9565533 57.1896408,24.1212666 L29.4960833,24.1212666 L29.4960833,35.0674653 L45.7515771,35.0674653 C45.4239683,37.7877475 43.6542033,41.8844383 39.7213169,44.6372555 L39.6661883,45.0037254 L48.4223791,51.7870338 L49.0290201,51.8475849 C54.6004021,46.7020943 57.8123233,39.1313952 57.8123233,30.1515267" />
                <path fill="#34A853" d="M29.4960833,58.9921667 C37.4599129,58.9921667 44.1456164,56.3701671 49.0290201,51.8475849 L39.7213169,44.6372555 C37.2305867,46.3742596 33.887622,47.5868638 29.4960833,47.5868638 C21.6960582,47.5868638 15.0758763,42.4415991 12.7159637,35.3297782 L12.3700541,35.3591501 L3.26524241,42.4054492 L3.14617358,42.736447 C7.9965904,52.3717589 17.959737,58.9921667 29.4960833,58.9921667" />
                <path fill="#FBBC05" d="M12.7159637,35.3297782 C12.0932812,33.4944915 11.7329116,31.5279353 11.7329116,29.4960833 C11.7329116,27.4640054 12.0932812,25.4976752 12.6832029,23.6623884 L12.6667095,23.2715173 L3.44779955,16.1120237 L3.14617358,16.2554937 C1.14708246,20.2539019 0,24.7439491 0,29.4960833 C0,34.2482175 1.14708246,38.7380388 3.14617358,42.736447 L12.7159637,35.3297782" />
                <path fill="#EB4335" d="M29.4960833,11.4050769 C35.0347044,11.4050769 38.7707997,13.7975244 40.9011602,15.7968415 L49.2255853,7.66898166 C44.1130815,2.91684746 37.4599129,0 29.4960833,0 C17.959737,0 7.9965904,6.62018183 3.14617358,16.2554937 L12.6832029,23.6623884 C15.0758763,16.5505675 21.6960582,11.4050769 29.4960833,11.4050769" />
            </g>
        </g>
    </svg>
);

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-6 h-6">
        <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
);

const modalSteps = [
    { message: "Signing you up...", icon: <Loader className="w-12 h-12 text-primary animate-spin" /> },
    { message: "Onboarding you...", icon: <Loader className="w-12 h-12 text-primary animate-spin" /> },
    { message: "Finalizing...", icon: <Loader className="w-12 h-12 text-primary animate-spin" /> },
    { message: "Welcome Aboard!", icon: <PartyPopper className="w-12 h-12 text-green-500" /> },
];

const TEXT_LOOP_INTERVAL = 1.5;

const DefaultLogo = () => (
    <div className="bg-primary text-primary-foreground rounded-md p-1.5">
        <Gem className="h-4 w-4" />
    </div>
);

interface AuthComponentProps {
    logo?: React.ReactNode;
    brandName?: string;
    onSuccess?: () => void;
    onGoToLogin?: () => void;
}

export const AuthComponent = ({ logo = <DefaultLogo />, brandName = "NEXA POS", onSuccess, onGoToLogin }: AuthComponentProps) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [authStep, setAuthStep] = useState("email");
    const [modalStatus, setModalStatus] = useState<'closed' | 'loading' | 'error' | 'success'>('closed');
    const [modalErrorMessage, setModalErrorMessage] = useState('');
    const confettiRef = useRef<ConfettiRef>(null);

    const isEmailValid = /\S+@\S+\.\S+/.test(email);
    const isPasswordValid = password.length >= 6;
    const isConfirmPasswordValid = confirmPassword.length >= 6;

    const passwordInputRef = useRef<HTMLInputElement>(null);
    const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

    const fireSideCanons = () => {
        const fire = confettiRef.current?.fire;
        if (fire) {
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
            const particleCount = 50;
            fire({ ...defaults, particleCount, origin: { x: 0, y: 1 }, angle: 60 });
            fire({ ...defaults, particleCount, origin: { x: 1, y: 1 }, angle: 120 });
        }
    };

    const handleFinalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalStatus !== 'closed' || authStep !== 'confirmPassword') return;

        if (password !== confirmPassword) {
            setModalErrorMessage("Passwords do not match!");
            setModalStatus('error');
        } else {
            setModalStatus('loading');
            const loadingStepsCount = modalSteps.length - 1;
            const totalDuration = loadingStepsCount * TEXT_LOOP_INTERVAL * 1000;
            setTimeout(() => {
                fireSideCanons();
                setModalStatus('success');
                setTimeout(() => {
                    if (onSuccess) onSuccess();
                }, 1500);
            }, totalDuration);
        }
    };

    const handleProgressStep = () => {
        if (authStep === 'email') {
            if (isEmailValid) setAuthStep("password");
        } else if (authStep === 'password') {
            if (isPasswordValid) setAuthStep("confirmPassword");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleProgressStep();
        }
    };

    const handleGoBack = () => {
        if (authStep === 'confirmPassword') {
            setAuthStep('password');
            setConfirmPassword('');
        } else if (authStep === 'password') {
            setAuthStep('email');
        }
    };

    const closeModal = () => {
        setModalStatus('closed');
        setModalErrorMessage('');
    };

    useEffect(() => {
        if (authStep === 'password') setTimeout(() => passwordInputRef.current?.focus(), 500);
        else if (authStep === 'confirmPassword') setTimeout(() => confirmPasswordInputRef.current?.focus(), 500);
    }, [authStep]);

    useEffect(() => {
        if (modalStatus === 'success') fireSideCanons();
    }, [modalStatus]);

    const Modal = () => (
        <AnimatePresence>
            {modalStatus !== 'closed' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border-4 border-gray-200 rounded p-8 w-full max-w-sm flex flex-col items-center gap-4 mx-2">
                        {(modalStatus === 'error' || modalStatus === 'success') && <button onClick={closeModal} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-900 transition-colors"><X className="w-4 h-4" /></button>}
                        {modalStatus === 'error' && <>
                            <AlertCircle className="w-12 h-12 text-red-500" />
                            <p className="text-lg font-medium text-gray-900">{modalErrorMessage}</p>
                            <GlassButton onClick={closeModal} size="sm" className="mt-4">Try Again</GlassButton>
                        </>}
                        {modalStatus === 'loading' &&
                            <TextLoop interval={TEXT_LOOP_INTERVAL} stopOnEnd={true}>
                                {modalSteps.slice(0, -1).map((step, i) =>
                                    <div key={i} className="flex flex-col items-center gap-4">
                                        {step.icon}
                                        <p className="text-lg font-medium text-gray-900">{step.message}</p>
                                    </div>
                                )}
                            </TextLoop>
                        }
                        {modalStatus === 'success' &&
                            <div className="flex flex-col items-center gap-4">
                                {modalSteps[modalSteps.length - 1].icon}
                                <p className="text-lg font-medium text-gray-900">{modalSteps[modalSteps.length - 1].message}</p>
                            </div>
                        }
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="bg-white min-h-screen w-full flex flex-col relative overflow-hidden">
            <ConfettiCanvas ref={confettiRef} manualstart className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999]" />
            <Modal />

            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {logo}
                <h1 className="text-base font-bold text-gray-900">{brandName}</h1>
            </div>

            <div className="flex w-full flex-1 items-center justify-center bg-white relative">
                <div className="absolute inset-0 z-0"><GradientBackground /></div>
                <fieldset disabled={modalStatus !== 'closed'} className="relative z-10 flex flex-col items-center gap-8 w-full max-w-[320px] mx-auto p-4">
                    <AnimatePresence mode="wait">
                        {authStep === "email" && <motion.div key="email-content" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full flex flex-col items-center gap-4">
                            <BlurFade delay={0.1} className="w-full text-center"><p className="font-serif font-light text-4xl sm:text-5xl tracking-tight text-gray-900">Get started with Us</p></BlurFade>
                            <BlurFade delay={0.2}><p className="text-sm font-medium text-gray-400">Continue with</p></BlurFade>
                            <BlurFade delay={0.3}><div className="flex items-center justify-center gap-4 w-full">
                                <GlassButton contentClassName="flex items-center justify-center gap-2" size="sm"><GoogleIcon /><span className="font-semibold text-gray-900">Google</span></GlassButton>
                                <GlassButton contentClassName="flex items-center justify-center gap-2" size="sm"><GitHubIcon /><span className="font-semibold text-gray-900">GitHub</span></GlassButton>
                            </div></BlurFade>
                            <BlurFade delay={0.4} className="w-full"><div className="flex items-center w-full gap-2 py-2"><hr className="w-full border-gray-200" /><span className="text-xs font-semibold text-gray-400">OR</span><hr className="w-full border-gray-200" /></div></BlurFade>
                        </motion.div>}
                        {authStep === "password" && <motion.div key="password-title" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full flex flex-col items-center text-center gap-4">
                            <BlurFade delay={0} className="w-full text-center"><p className="font-serif font-light text-4xl sm:text-5xl tracking-tight text-gray-900">Create password</p></BlurFade>
                            <BlurFade delay={0.1}><p className="text-sm font-medium text-gray-400">Must be at least 6 characters.</p></BlurFade>
                        </motion.div>}
                        {authStep === "confirmPassword" && <motion.div key="confirm-title" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full flex flex-col items-center text-center gap-4">
                            <BlurFade delay={0} className="w-full text-center"><p className="font-serif font-light text-4xl sm:text-5xl tracking-tight text-gray-900">One Last Step</p></BlurFade>
                            <BlurFade delay={0.1}><p className="text-sm font-medium text-gray-400">Confirm your password</p></BlurFade>
                        </motion.div>}
                    </AnimatePresence>

                    <form onSubmit={handleFinalSubmit} className="w-full space-y-6">
                        <AnimatePresence>
                            {authStep !== 'confirmPassword' && <motion.div key="email-password-fields" exit={{ opacity: 0, filter: 'blur(4px)' }} transition={{ duration: 0.3 }} className="w-full space-y-6">
                                <BlurFade delay={authStep === 'email' ? 0.5 : 0} className="w-full">
                                    <div className="glass-input">
                                        <div className="w-10 pl-2 flex items-center justify-center"><Mail className="h-5 w-5 text-gray-600" /></div>
                                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} className="h-12 flex-grow bg-transparent text-gray-900 placeholder:text-gray-400 outline-none" />
                                        <div className={cn("overflow-hidden transition-all duration-300", isEmailValid && authStep === 'email' ? "w-10 pr-1" : "w-0")}>
                                            <GlassButton type="button" onClick={handleProgressStep} size="icon"><ArrowRight className="w-4 h-4" /></GlassButton>
                                        </div>
                                    </div>
                                </BlurFade>
                                <AnimatePresence>
                                    {authStep === "password" && <BlurFade key="password-field" className="w-full">
                                        <div className="glass-input">
                                            <div className="w-10 pl-2 flex items-center justify-center">
                                                {isPasswordValid ? <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button> : <Lock className="h-5 w-5 text-gray-600" />}
                                            </div>
                                            <input ref={passwordInputRef} type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} className="h-12 flex-grow bg-transparent text-gray-900 placeholder:text-gray-400 outline-none" />
                                            <div className={cn("overflow-hidden transition-all duration-300", isPasswordValid ? "w-10 pr-1" : "w-0")}>
                                                <GlassButton type="button" onClick={handleProgressStep} size="icon"><ArrowRight className="w-4 h-4" /></GlassButton>
                                            </div>
                                        </div>
                                        <button type="button" onClick={handleGoBack} className="mt-4 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-900 transition-colors mx-auto"><ArrowLeft className="w-3 h-3" /> Go back</button>
                                    </BlurFade>}
                                </AnimatePresence>
                            </motion.div>}
                        </AnimatePresence>
                        <AnimatePresence>
                            {authStep === 'confirmPassword' && <BlurFade key="confirm-password-field" className="w-full">
                                <div className="glass-input">
                                    <div className="w-10 pl-2 flex items-center justify-center">
                                        {isConfirmPasswordValid ? <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button> : <Lock className="h-5 w-5 text-gray-600" />}
                                    </div>
                                    <input ref={confirmPasswordInputRef} type={showConfirmPassword ? "text" : "password"} placeholder="Confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 flex-grow bg-transparent text-gray-900 placeholder:text-gray-400 outline-none" />
                                    <div className={cn("overflow-hidden transition-all duration-300", isConfirmPasswordValid ? "w-10 pr-1" : "w-0")}>
                                        <GlassButton type="submit" size="icon"><ArrowRight className="w-4 h-4" /></GlassButton>
                                    </div>
                                </div>
                                <button type="button" onClick={handleGoBack} className="mt-4 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-900 transition-colors mx-auto"><ArrowLeft className="w-3 h-3" /> Go back</button>
                            </BlurFade>}
                        </AnimatePresence>
                    </form>

                    <BlurFade delay={0.6}>
                        <button onClick={onGoToLogin} className="text-xs font-bold text-slate-400 hover:text-[#0284C7] uppercase tracking-widest transition-colors">
                            Already have an account? Login
                        </button>
                    </BlurFade>
                </fieldset>
            </div>
        </div>
    );
};

export default AuthComponent;

