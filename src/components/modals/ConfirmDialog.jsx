import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Reusable confirmation dialog with animated backdrop and focus trap.
 *
 * Props:
 * - title: string
 * - message: string | JSX
 * - details: string | JSX (optional — warning box)
 * - confirmLabel: string (default: 'Xác nhận')
 * - confirmColor: string (default: 'var(--color-error)')
 * - onConfirm: () => void
 * - onCancel: () => void
 * - icon: Lucide icon component (default: AlertTriangle)
 */
export default function ConfirmDialog({
    title = 'Xác nhận',
    message,
    details,
    confirmLabel = 'Xác nhận',
    confirmColor = 'var(--color-error, #ef4444)',
    onConfirm,
    onCancel,
    icon: IconComponent = AlertTriangle,
}) {
    const cancelRef = useRef(null);

    // Focus cancel button on mount
    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onCancel]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="confirm-dialog-overlay"
                onClick={onCancel}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="confirm-dialog"
                >
                    <div className="confirm-dialog-header">
                        <IconComponent size={24} style={{ color: confirmColor, flexShrink: 0 }} />
                        <h3 id="confirm-dialog-title">{title}</h3>
                    </div>

                    {message && (
                        <p className="confirm-dialog-message">{message}</p>
                    )}

                    {details && (
                        <div className="confirm-dialog-details" style={{ borderColor: `${confirmColor}33` }}>
                            {details}
                        </div>
                    )}

                    <div className="confirm-dialog-actions">
                        <button
                            ref={cancelRef}
                            className="btn btn-secondary btn-small"
                            onClick={onCancel}
                        >
                            <X size={14} /> Hủy
                        </button>
                        <button
                            className="btn btn-small"
                            onClick={onConfirm}
                            style={{
                                background: confirmColor,
                                color: 'white',
                                border: 'none',
                            }}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
