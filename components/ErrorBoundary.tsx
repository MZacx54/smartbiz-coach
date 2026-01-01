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
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">⚠️</span>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Oops! Something went wrong
                        </h1>

                        <p className="text-gray-600 mb-6">
                            We encountered an unexpected error. Don't worry, your data is safe.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 mb-2">
                                    Technical details (Dev only)
                                </summary>
                                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40 text-red-600">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
                            >
                                Return Home
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 mt-6">
                            If this persists, please contact support or clear your browser cache.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
