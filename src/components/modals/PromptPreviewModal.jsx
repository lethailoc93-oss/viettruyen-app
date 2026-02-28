import React, { useState, useEffect } from 'react';
import { X, Send, Eye, EyeOff, Edit3, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PromptPreviewModal — shows the full AI prompt before sending.
 * User can view and edit the user prompt, and optionally view the system instruction.
 *
 * Props:
 *   isOpen        — boolean
 *   onClose       — () => void
 *   onConfirm     — (editedUserPrompt: string) => void   // called with possibly-edited prompt
 *   systemInstruction — string  (read-only, collapsible)
 *   userPrompt    — string  (editable)
 *   title         — string  (modal title, e.g. "Tiếp tục viết")
 *   isLoading     — boolean (optional, shows spinner on confirm button)
 */
export default function PromptPreviewModal({
    isOpen,
    onClose,
    onConfirm,
    systemInstruction = '',
    userPrompt = '',
    title = 'Xem trước Prompt',
    isLoading = false
}) {
    const [editedPrompt, setEditedPrompt] = useState(userPrompt);
    const [showSystem, setShowSystem] = useState(false);

    // Sync when props change
    useEffect(() => {
        setEditedPrompt(userPrompt);
    }, [userPrompt]);

    if (!isOpen) return null;

    const estimateTokens = (text) => Math.ceil((text || '').length / 4);
    const totalTokens = estimateTokens(systemInstruction) + estimateTokens(editedPrompt);

    return (
        <div className="mca-modal-overlay" style={{ zIndex: 1100 }}>
            <motion.div
                className="mca-modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    width: '900px',
                    maxWidth: '95vw',
                    height: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0
                }}
            >
                {/* Header */}
                <div style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Eye size={20} style={{ color: 'var(--color-primary)' }} />
                        <h3 style={{ margin: 0 }}>{title}</h3>
                        <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: 'var(--color-primary)'
                        }}>
                            ~{totalTokens.toLocaleString()} tokens ước tính
                        </span>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {/* System Instruction (collapsible, read-only) */}
                    {systemInstruction && (
                        <div style={{
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden'
                        }}>
                            <button
                                onClick={() => setShowSystem(!showSystem)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 'var(--space-sm) var(--space-md)',
                                    background: 'rgba(0,0,0,0.15)',
                                    border: 'none',
                                    color: 'var(--color-text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {showSystem ? <EyeOff size={14} /> : <Eye size={14} />}
                                    System Instruction (chỉ xem)
                                    <span style={{
                                        fontSize: '0.65rem',
                                        opacity: 0.6
                                    }}>
                                        ~{estimateTokens(systemInstruction).toLocaleString()} tokens
                                    </span>
                                </div>
                                {showSystem ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <AnimatePresence>
                                {showSystem && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <pre style={{
                                            padding: 'var(--space-md)',
                                            margin: 0,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontSize: 'var(--font-size-xs)',
                                            lineHeight: '1.6',
                                            color: 'var(--color-text-tertiary)',
                                            background: 'rgba(0,0,0,0.1)',
                                            maxHeight: '300px',
                                            overflowY: 'auto',
                                            fontFamily: 'var(--font-family-mono, monospace)'
                                        }}>
                                            {systemInstruction}
                                        </pre>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* User Prompt (editable) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 'var(--space-sm)'
                        }}>
                            <label style={{
                                fontWeight: 600,
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <Edit3 size={14} style={{ color: 'var(--color-accent)' }} />
                                User Prompt (có thể chỉnh sửa)
                            </label>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>
                                ~{estimateTokens(editedPrompt).toLocaleString()} tokens
                            </span>
                        </div>
                        <textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                            style={{
                                flex: 1,
                                minHeight: '250px',
                                width: '100%',
                                resize: 'vertical',
                                padding: 'var(--space-md)',
                                fontSize: 'var(--font-size-sm)',
                                lineHeight: '1.7',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-primary)',
                                borderRadius: 'var(--radius-md)',
                                outline: 'none',
                                fontFamily: 'var(--font-family-mono, monospace)',
                                whiteSpace: 'pre-wrap'
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderTop: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'var(--space-sm)',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <button className="btn btn-secondary btn-small" onClick={onClose}>
                        <X size={14} /> Hủy
                    </button>
                    <button
                        className="btn btn-primary btn-small"
                        onClick={() => onConfirm(editedPrompt)}
                        disabled={!editedPrompt.trim() || isLoading}
                    >
                        {isLoading ? (
                            <><Loader2 size={14} className="spin" /> Đang gửi...</>
                        ) : (
                            <><Send size={14} /> Gửi tới AI</>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
