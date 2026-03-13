import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useSaasAuth } from '../context/SaasAuthContext';

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'http://localhost:3000';

/**
 * I7 — Billing Wall page
 * Shown when subscription is past_due, cancelled, or paused.
 */
export default function BillingWall() {
    const { org, logout } = useSaasAuth();

    const statusMessages: Record<string, { title: string; body: string }> = {
        past_due: {
            title: 'Payment failed',
            body: 'Your last payment could not be processed. Please update your payment method to continue.',
        },
        cancelled: {
            title: 'Subscription cancelled',
            body: 'Your subscription has ended. Renew to regain access to your account.',
        },
        paused: {
            title: 'Account suspended',
            body: 'Your account has been temporarily suspended. Please contact support.',
        },
    };

    const msg = statusMessages[org?.subscription_status ?? ''] ?? {
        title: 'Subscription inactive',
        body: 'Your subscription is not active. Please renew to continue.',
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h1 className="text-2xl font-black text-slate-800 mb-3">{msg.title}</h1>
                <p className="text-slate-500 mb-8">{msg.body}</p>

                <div className="space-y-3">
                    <a
                        href={`${MARKETING_URL}/pricing`}
                        id="billing-wall-renew-btn"
                        className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Renew subscription
                    </a>
                    <a
                        href="mailto:hello@nexarats.in"
                        className="block w-full py-3 px-6 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Contact support
                    </a>
                    <button
                        onClick={logout}
                        className="block w-full text-slate-400 text-sm mt-2 hover:text-slate-600 transition-colors"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
}
