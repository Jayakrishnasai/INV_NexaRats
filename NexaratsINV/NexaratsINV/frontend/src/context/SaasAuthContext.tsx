import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export interface SaasUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface SaasOrg {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    onboarding_complete: boolean;
    onboarding_step: number;
}

export interface SaasPlan {
    id: string;
    name: string;
    slug: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SaasAuthState {
    status: AuthStatus;
    user: SaasUser | null;
    org: SaasOrg | null;
    plan: SaasPlan | null;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
}

const SaasAuthContext = createContext<SaasAuthState>({
    status: 'loading',
    user: null,
    org: null,
    plan: null,
    refresh: async () => { },
    logout: async () => { },
});

export const SaasAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [user, setUser] = useState<SaasUser | null>(null);
    const [org, setOrg] = useState<SaasOrg | null>(null);
    const [plan, setPlan] = useState<SaasPlan | null>(null);

    const fetchMe = useCallback(async () => {
        try {
            const res = await fetch(`${API}/auth/me`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                setStatus('unauthenticated');
                setUser(null); setOrg(null); setPlan(null);
                return;
            }

            const data = await res.json();
            setUser(data.user ?? null);
            setOrg(data.org ?? null);
            setPlan(data.plan ?? null);
            setStatus('authenticated');
        } catch {
            setStatus('unauthenticated');
        }
    }, []);

    useEffect(() => { fetchMe(); }, [fetchMe]);

    const logout = useCallback(async () => {
        try {
            await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
        } finally {
            setStatus('unauthenticated');
            setUser(null); setOrg(null); setPlan(null);
        }
    }, []);

    return (
        <SaasAuthContext.Provider value={{ status, user, org, plan, refresh: fetchMe, logout }}>
            {children}
        </SaasAuthContext.Provider>
    );
};

export const useSaasAuth = () => useContext(SaasAuthContext);
