import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error in UI:', error, errorInfo);

        // Auto-heal chunk load errors caused by new deployments
        const errMsg = error?.message || String(error);
        const isChunkError =
            errMsg.includes('Failed to fetch dynamically imported module') ||
            errMsg.includes('error loading dynamically imported module') ||
            errMsg.includes('ChunkLoadError') ||
            errMsg.includes('Loading chunk');

        if (isChunkError) {
            const hasReloaded = sessionStorage.getItem('sb_chunk_reload_attempted');
            if (!hasReloaded) {
                sessionStorage.setItem('sb_chunk_reload_attempted', 'true');
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(regs => {
                        regs.forEach(r => r.update());
                    });
                }
                window.location.reload();
                return;
            }
        }
    }

    private handleReset = () => {
        sessionStorage.removeItem('sb_chunk_reload_attempted');
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            const isDev = Boolean(import.meta.env?.DEV);

            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100">
                        <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">⚡</span>
                        </div>

                        <h1 className="text-2xl font-black text-gray-900 mb-2">
                            Oops! Something went wrong
                        </h1>

                        <p className="text-gray-600 mb-6 text-sm">
                            We encountered a temporary display issue. Don't worry, your business records and cart data are safe.
                        </p>

                        {isDev && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 mb-2 font-mono">
                                    Technical details (Dev only)
                                </summary>
                                <pre className="text-[11px] bg-gray-100 p-3 rounded-xl overflow-auto max-h-40 text-red-600 font-mono">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 text-sm"
                            >
                                Return Home
                            </button>
                            <button
                                onClick={() => {
                                    sessionStorage.removeItem('sb_chunk_reload_attempted');
                                    window.location.reload();
                                }}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition text-sm"
                            >
                                Reload Page
                            </button>
                        </div>

                        <p className="text-[11px] text-gray-400 mt-6">
                            If this persists, your offline cache will refresh automatically upon reconnecting.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
