import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Reusable input dialog — replaces window.prompt().
 *
 * Props:
 * - title: string
 * - placeholder: string
 * - defaultValue: string
 * - onConfirm: (value: string) => void
 * - onCancel: () => void
 */
export default function InputDialog({
    title = 'Nhập giá trị',
    placeholder = '',
    defaultValue = '',
    onConfirm,
    onCancel,
}) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef(null);

    // Auto-focus input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Handle Escape and Enter
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onCancel]);

    const handleSubmit = () => {
        if (value.trim()) {
            onConfirm(value.trim());
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="confirm-dialog-overlay"
                onClick={onCancel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="input-dialog-title"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="confirm-dialog"
                >
                    <div className="confirm-dialog-header">
                        <h3 id="input-dialog-title">{title}</h3>
                    </div>

                    <div style={{ margin: 'var(--space-md) 0' }}>
                        <input
                            ref={inputRef}
                            className="form-input"
                            type="text"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                            placeholder={placeholder}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="confirm-dialog-actions">
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={onCancel}
                        >
                            <X size={14} /> Hủy
                        </button>
                        <button
                            className="btn btn-primary btn-small"
                            onClick={handleSubmit}
                            disabled={!value.trim()}
                        >
                            Xác nhận
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
