import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // LOGGING: Real-world apps send this to Sentry/LogRocket here
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-2xl border border-slate-100 flex flex-col items-center">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-10 h-10 text-rose-500" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Something went wrong</h1>
                        <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                            {this.state.error?.message || "An unexpected error occurred in NexaratsINV. We've been notified and are working on a fix."}
                        </p>

                        <div className="flex flex-col w-full gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Try Reloading App
                            </button>
                            <button
                                onClick={() => window.location.href = '/admin'}
                                className="flex items-center justify-center gap-2 w-full py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                            >
                                <Home className="w-5 h-5" />
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
