import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSaasAuth } from '../../context/SaasAuthContext';

/**
 * I5 — Subscription Guard
 * Wraps any route that requires an active subscription.
 * - past_due / cancelled → BillingWall
 * - onboarding incomplete → /onboarding
 * - loading → spinner
 */
export const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { status, org } = useSaasAuth();

    if (status === 'loading') {
        return (
            <div className="h-screen flex items-center justify-center bg-[#F8F9FC]">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (status === 'unauthenticated') return <Navigate to="/login" replace />;

    if (org && !org.onboarding_complete) return <Navigate to="/onboarding" replace />;

    if (org && (org.subscription_status === 'past_due' || org.subscription_status === 'cancelled' || org.subscription_status === 'paused')) {
        return <Navigate to="/billing-wall" replace />;
    }

    return <>{children}</>;
};
