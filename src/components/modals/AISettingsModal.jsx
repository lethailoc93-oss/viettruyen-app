import { useState } from 'react';
import { useDirectives } from '../../context/DirectiveContext';
import { Bot, Save, RotateCcw, X, MessageSquare, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AISettingsModal({ onClose }) {
    const { directives, updateDirective, resetDirective, DEFAULT_DIRECTIVES } = useDirectives();
    const [selectedFeature, setSelectedFeature] = useState(Object.keys(directives)[0]);
    const [savedId, setSavedId] = useState(null);

    const currentDirective = directives[selectedFeature] || {};
    const defaultDirective = DEFAULT_DIRECTIVES[selectedFeature] || {};

    const handleChange = (field, value) => {
        updateDirective(selectedFeature, { [field]: value });
    };

    const handleSave = () => {
        // Auto-saved in context, just visual feedback
        setSavedId(selectedFeature);
        setTimeout(() => setSavedId(null), 2000);
    };

    // Helper to get icon for feature
    const getIcon = (key) => {
        return <Bot size={16} />;
    };

    return (
        <div className="mca-modal-overlay active" onClick={(e) => { if (e.target.classList?.contains('mca-modal-overlay')) onClose(); }}>
            <style>{`
                @media (max-width: 768px) {
                    .settings-body-wrapper { flex-direction: column !important; }
                    .settings-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--color-border); max-height: 200px; display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; }
                    .settings-sidebar-btn { width: auto !important; padding: 6px 10px !important; flex: 1 1 calc(50% - 8px); }
                    .settings-content-area { padding: var(--space-md) !important; }
                }
            `}</style>
            <div className="mca-modal" style={{ maxWidth: '800px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
                {/* Header */}
                <div className="mca-modal-header" style={{ padding: 'var(--space-md)' }}>
                    <h3 className="mca-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Bot size={22} className="text-primary" />
                        Cấu hình AI (Chỉ đạo & Persona)
                    </h3>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="settings-body-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* Sidebar - Features List */}
                    <div className="settings-sidebar" style={{
                        width: '250px',
                        borderRight: '1px solid var(--color-border)',
                        overflowY: 'auto',
                        background: 'var(--color-bg-secondary)',
                        padding: 'var(--space-sm)'
                    }}>
                        {Object.keys(directives).map(key => {
                            const hasRichDefault = !!(DEFAULT_DIRECTIVES[key]?.systemInstruction);
                            const isCustomized = directives[key]?.systemInstruction !== DEFAULT_DIRECTIVES[key]?.systemInstruction
                                || directives[key]?.customInstruction !== DEFAULT_DIRECTIVES[key]?.customInstruction;
                            return (
                                <button
                                    key={key}
                                    className="settings-sidebar-btn"
                                    onClick={() => setSelectedFeature(key)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-sm)',
                                        width: '100%',
                                        padding: 'var(--space-sm) var(--space-md)',
                                        border: 'none',
                                        background: selectedFeature === key ? 'var(--color-bg-tertiary)' : 'transparent',
                                        color: selectedFeature === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: 'var(--font-size-sm)',
                                        marginBottom: '2px',
                                        fontWeight: selectedFeature === key ? '600' : 'normal'
                                    }}
                                >
                                    {getIcon(key)}
                                    <span style={{ flex: 1 }}>{directives[key].name}</span>
                                    {isCustomized && (
                                        <span style={{ fontSize: '9px', background: 'var(--color-warning)', color: '#000', padding: '1px 5px', borderRadius: '8px', fontWeight: 600 }}>Tùy chỉnh</span>
                                    )}
                                    {!isCustomized && hasRichDefault && (
                                        <span style={{ fontSize: '9px', background: 'var(--color-primary)', color: '#fff', padding: '1px 5px', borderRadius: '8px', opacity: 0.7 }}>Mặc định</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content - Editor */}
                    <div className="settings-content-area" style={{ flex: 1, padding: 'var(--space-lg)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{currentDirective.name}</h4>
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => resetDirective(selectedFeature)}
                                title="Khôi phục mặc định"
                            >
                                <RotateCcw size={14} /> Mặc định
                            </button>
                        </div>

                        {/* System Instruction / Persona */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                <Briefcase size={16} /> Persona / Vai trò hệ thống
                            </label>
                            <p className="helper-text" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-xs)' }}>
                                Định nghĩa AI là "ai". Ví dụ: "Bạn là một nhà văn hài hước", "Bạn là chuyên gia sử học".
                            </p>
                            <textarea
                                className="form-input"
                                value={currentDirective.systemInstruction || ''}
                                onChange={(e) => handleChange('systemInstruction', e.target.value)}
                                placeholder={defaultDirective.systemInstruction || "Mặc định (Trống)"}
                                rows={4}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        {/* Custom Instruction */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                <MessageSquare size={16} /> Chỉ đạo tùy chỉnh (Custom Instructions)
                            </label>
                            <p className="helper-text" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-xs)' }}>
                                Hướng dẫn cụ thể thêm vào cuối mỗi yêu cầu. Ví dụ: "Luôn dùng từ ngữ cổ trang", "Không viết quá dài".
                            </p>
                            <textarea
                                className="form-input"
                                value={currentDirective.customInstruction || ''}
                                onChange={(e) => handleChange('customInstruction', e.target.value)}
                                placeholder="Nhập hướng dẫn cụ thể..."
                                rows={4}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="mca-modal-footer" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <p style={{ marginRight: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                        Thay đổi được lưu tự động.
                    </p>
                    <button className="btn btn-primary" onClick={() => { handleSave(); onClose(); }}>
                        <Save size={16} /> Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
