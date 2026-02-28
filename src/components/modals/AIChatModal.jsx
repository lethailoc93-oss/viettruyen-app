import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, User, Bot, Loader2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIService } from '../../services/aiService';
import { useApiKey } from '../../context/ApiKeyContext';

export default function AIChatModal({ isOpen, onClose, onApply, storyContext, currentChapterContent, chapterOutline, chapterScenes }) {
    const { getNextKey, selectedModel } = useApiKey();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Xin chào! Tôi có thể giúp gì cho chương này? Bạn có thể yêu cầu tôi viết tiếp một đoạn, mô tả kỹ hơn về bối cảnh, hay thêm một cuộc đối thoại...'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const apiKey = getNextKey();
            const result = await AIService.chatWithAI(apiKey, input, storyContext, currentChapterContent, messages, { model: selectedModel, chapterOutline, chapterScenes });

            // chatWithAI may return { text, groundingMetadata } when web search is active
            const aiText = typeof result === 'object' ? (result.text || '') : result;
            setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Lỗi: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="mca-modal-overlay">
            <motion.div
                className="mca-modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ width: '800px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }}
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
                        <Sparkles size={20} className="text-accent" />
                        <h3 style={{ margin: 0 }}>Trợ lý AI Viết Truyện</h3>
                        <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: 'var(--color-primary)'
                        }}>
                            {selectedModel || '?'}
                        </span>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Area */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 'var(--space-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-md)'
                }}>
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                gap: 'var(--space-sm)',
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%'
                            }}
                        >
                            {msg.role === 'assistant' && (
                                <div style={{
                                    minWidth: '32px', height: '32px',
                                    borderRadius: '50%', background: 'var(--color-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Bot size={18} color="white" />
                                </div>
                            )}

                            <div style={{
                                padding: 'var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                background: msg.role === 'user' ? 'var(--color-secondary)' : 'var(--glass-bg)',
                                border: msg.role === 'assistant' ? '1px solid var(--glass-border)' : 'none',
                                color: 'var(--color-text-primary)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6'
                            }}>
                                {msg.content}

                                {msg.role === 'assistant' && index > 0 && (
                                    <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn btn-primary btn-small"
                                            onClick={() => onApply(msg.content)}
                                            style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                                        >
                                            <Check size={14} style={{ marginRight: 4 }} /> Áp dụng vào bài viết
                                        </button>
                                    </div>
                                )}
                            </div>

                            {msg.role === 'user' && (
                                <div style={{
                                    minWidth: '32px', height: '32px',
                                    borderRadius: '50%', background: 'var(--color-text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <User size={18} color="var(--color-bg)" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <div style={{
                                minWidth: '32px', height: '32px',
                                borderRadius: '50%', background: 'var(--color-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Loader2 size={18} className="spin" color="white" />
                            </div>
                            <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                                AI đang viết...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{
                    padding: 'var(--space-md)',
                    background: 'rgba(0,0,0,0.2)',
                    borderTop: '1px solid var(--glass-border)'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-sm)',
                        background: 'var(--glass-bg)',
                        borderRadius: 'var(--radius-md)',
                        padding: '4px',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập yêu cầu cho AI (VD: Viết cảnh nhân vật chính gặp kẻ thù...)"
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-primary)',
                                padding: 'var(--space-sm) var(--space-md)',
                                resize: 'none',
                                height: '50px',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="btn-icon"
                            style={{
                                width: '50px',
                                color: input.trim() ? 'var(--color-primary)' : 'var(--color-text-tertiary)'
                            }}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-tertiary)',
                        marginTop: '8px',
                        textAlign: 'center'
                    }}>
                        Shift + Enter để xuống dòng. Nội dung AI tạo ra có thể không chính xác, hãy kiểm tra lại.
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
