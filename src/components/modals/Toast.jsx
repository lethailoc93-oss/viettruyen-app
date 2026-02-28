import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const COLORS = {
    success: 'hsl(140, 70%, 50%)',
    error: 'hsl(0, 75%, 55%)',
    warning: 'hsl(40, 95%, 55%)',
    info: 'hsl(210, 85%, 55%)',
};

let toastIdCounter = 0;
let globalAddToast = null;

/**
 * Call this from anywhere to show a toast notification.
 * Usage: showToast('Đã lưu thành công!', 'success')
 */
export function showToast(message, type = 'info', duration = 3500) {
    if (globalAddToast) {
        globalAddToast({ id: ++toastIdCounter, message, type, duration });
    }
}

/**
 * Toast container — render once in the app root.
 * <ToastContainer />
 */
export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((toast) => {
        setToasts(prev => [...prev, toast]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Register globalAddToast
    useEffect(() => {
        globalAddToast = addToast;
        return () => { globalAddToast = null; };
    }, [addToast]);

    return (
        <div className="toast-container" style={{
            position: 'fixed', top: 'var(--space-lg)', right: 'var(--space-lg)',
            zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)',
            pointerEvents: 'none', maxWidth: '400px',
        }}>
            <AnimatePresence>
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({ toast, onRemove }) {
    const { id, message, type = 'info', duration = 3500 } = toast;
    const Icon = ICONS[type] || ICONS.info;
    const color = COLORS[type] || COLORS.info;

    useEffect(() => {
        const timer = setTimeout(() => onRemove(id), duration);
        return () => clearTimeout(timer);
    }, [id, duration, onRemove]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="toast-item"
            style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--color-bg-secondary)',
                border: `1px solid ${color}33`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                backdropFilter: 'blur(12px)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                minWidth: '250px',
            }}
        >
            <Icon size={18} style={{ color, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{message}</span>
            <button
                onClick={() => onRemove(id)}
                style={{
                    background: 'none', border: 'none', color: 'var(--color-text-tertiary)',
                    cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0,
                }}
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}
