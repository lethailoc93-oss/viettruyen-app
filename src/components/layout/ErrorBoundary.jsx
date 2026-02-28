import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * React Error Boundary — catches unexpected errors and shows a recovery UI
 * instead of a blank white screen.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleDismiss = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', padding: 'var(--space-2xl)',
                    background: 'var(--color-bg-primary, #0f0f1a)',
                    color: 'var(--color-text-primary, #e2e8f0)',
                    textAlign: 'center',
                }}>
                    <AlertTriangle size={48} style={{ color: 'hsl(0, 75%, 55%)', marginBottom: 'var(--space-lg)' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-sm)' }}>
                        Đã xảy ra lỗi 😔
                    </h2>
                    <p style={{ color: 'var(--color-text-tertiary, #94a3b8)', maxWidth: '480px', marginBottom: 'var(--space-xl)' }}>
                        Ứng dụng gặp sự cố không mong muốn. Dữ liệu của bạn vẫn an toàn.
                    </p>
                    {this.state.error && (
                        <pre style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: 'var(--space-md)',
                            maxWidth: '600px', width: '100%',
                            overflow: 'auto', fontSize: '0.75rem',
                            color: 'hsl(0, 75%, 65%)',
                            marginBottom: 'var(--space-xl)',
                            textAlign: 'left',
                        }}>
                            {this.state.error.toString()}
                        </pre>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <button
                            onClick={this.handleReload}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <RefreshCw size={16} /> Tải lại trang
                        </button>
                        <button
                            onClick={this.handleDismiss}
                            className="btn btn-secondary"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
