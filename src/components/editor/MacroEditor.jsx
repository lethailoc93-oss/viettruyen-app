import React, { useState } from 'react';
import '../../styles/MacroEditor.css';

/**
 * MacroEditor — modal for creating/editing custom Quick Action macros.
 * Macros are stored as: { id, icon, label, prompt }
 */
export default function MacroEditor({ macros, onSave, onDelete, onClose }) {
    const [icon, setIcon] = useState('⚡');
    const [label, setLabel] = useState('');
    const [prompt, setPrompt] = useState('');
    const [editingId, setEditingId] = useState(null);

    const handleSubmit = () => {
        if (!label.trim() || !prompt.trim()) return;
        onSave({
            id: editingId || `macro_${Date.now()}`,
            icon: icon || '⚡',
            label: label.trim(),
            prompt: prompt.trim()
        });
        resetForm();
    };

    const handleEdit = (macro) => {
        setEditingId(macro.id);
        setIcon(macro.icon || '⚡');
        setLabel(macro.label);
        setPrompt(macro.prompt);
    };

    const resetForm = () => {
        setEditingId(null);
        setIcon('⚡');
        setLabel('');
        setPrompt('');
    };

    return (
        <div className="macro-editor-overlay" onClick={onClose}>
            <div className="macro-editor" onClick={e => e.stopPropagation()}>
                <div className="macro-editor-title">
                    🎛️ Quản lý Quick Actions tùy chỉnh
                </div>

                {/* Add/Edit form */}
                <div className="macro-form">
                    <label>{editingId ? '✏️ Sửa macro' : '➕ Tạo macro mới'}</label>
                    <div className="macro-form-row">
                        <input
                            type="text"
                            value={icon}
                            onChange={e => setIcon(e.target.value)}
                            placeholder="Icon"
                            style={{ maxWidth: '50px', textAlign: 'center' }}
                        />
                        <input
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="Tên nút (VD: Phép thuật)"
                        />
                    </div>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Prompt sẽ gửi cho AI khi nhấn nút (VD: Hãy viết một cảnh nhân vật thi triển phép thuật với mô tả chi tiết màu sắc mana...)"
                    />
                    <div className="macro-form-actions">
                        {editingId && (
                            <button className="macro-btn danger" onClick={resetForm}>Hủy</button>
                        )}
                        <button className="macro-btn" onClick={handleSubmit}>
                            {editingId ? 'Cập nhật' : 'Thêm'}
                        </button>
                    </div>
                </div>

                {/* Existing macros list */}
                <label style={{ fontSize: '0.72rem', color: '#a0a0b8', marginBottom: '6px', display: 'block' }}>
                    Danh sách macros ({macros.length})
                </label>
                {macros.length > 0 ? (
                    <div className="macro-list">
                        {macros.map(m => (
                            <div key={m.id} className="macro-list-item">
                                <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
                                <div className="macro-list-item-info">
                                    <div className="macro-list-item-name">{m.label}</div>
                                    <div className="macro-list-item-prompt">{m.prompt}</div>
                                </div>
                                <div className="macro-list-item-actions">
                                    <button className="macro-icon-btn" onClick={() => handleEdit(m)}>✏️</button>
                                    <button className="macro-icon-btn" onClick={() => onDelete(m.id)}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="macro-empty">
                        Chưa có macro tùy chỉnh nào.
                    </div>
                )}

                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                    <button className="macro-btn" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    );
}
