// ================================================
// RegexManager — Panel quản lý regex scripts
// ================================================
import { useState, useRef, useCallback } from 'react';
import { Plus, Download, Upload, Edit3, Trash2, GripVertical, Code } from 'lucide-react';
import { REGEX_PLACEMENT } from '../../services/regexEngine';
import RegexEditorModal from './RegexEditorModal';
import '../../styles/regexManager.css';

const PLACEMENT_LABELS = {
    [REGEX_PLACEMENT.USER_INPUT]: { label: 'User', cls: 'tag-user' },
    [REGEX_PLACEMENT.AI_OUTPUT]: { label: 'AI', cls: 'tag-ai' },
    [REGEX_PLACEMENT.SLASH_COMMAND]: { label: 'Cmd', cls: '' },
    [REGEX_PLACEMENT.WORLD_INFO]: { label: 'WI', cls: '' },
};

export default function RegexManager({ scripts = [], onUpdate }) {
    const [editingScript, setEditingScript] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const fileInputRef = useRef(null);

    // Drag state
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    // --- CRUD ---
    const handleToggle = useCallback((id) => {
        const updated = scripts.map(s =>
            s.id === id ? { ...s, disabled: !s.disabled } : s
        );
        onUpdate(updated);
    }, [scripts, onUpdate]);

    const handleDelete = useCallback((id) => {
        onUpdate(scripts.filter(s => s.id !== id));
    }, [scripts, onUpdate]);

    const handleSaveScript = useCallback((scriptData) => {
        let updated;
        if (scriptData.id) {
            // Update existing
            updated = scripts.map(s => s.id === scriptData.id ? { ...s, ...scriptData } : s);
        } else {
            // Create new
            const newScript = {
                ...scriptData,
                id: 'rx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            };
            updated = [...scripts, newScript];
        }
        onUpdate(updated);
        setShowEditor(false);
        setEditingScript(null);
    }, [scripts, onUpdate]);

    const handleEdit = useCallback((script) => {
        setEditingScript(script);
        setShowEditor(true);
    }, []);

    const handleCreate = useCallback(() => {
        setEditingScript(null);
        setShowEditor(true);
    }, []);

    // --- Drag & Drop ---
    const handleDragStart = (idx) => setDragIdx(idx);
    const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleDragEnd = () => {
        if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
            const newScripts = [...scripts];
            const [moved] = newScripts.splice(dragIdx, 1);
            newScripts.splice(dragOverIdx, 0, moved);
            onUpdate(newScripts);
        }
        setDragIdx(null);
        setDragOverIdx(null);
    };

    // --- Import / Export ---
    const handleExport = useCallback(() => {
        const data = JSON.stringify(scripts, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'regex_scripts.json';
        a.click();
        URL.revokeObjectURL(url);
    }, [scripts]);

    const handleImport = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                const arr = Array.isArray(imported) ? imported : [imported];
                const withIds = arr.map(s => ({
                    ...s,
                    id: s.id || 'rx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                }));
                onUpdate([...scripts, ...withIds]);
            } catch (err) {
                console.error('[RegexManager] Import failed:', err);
                alert('Import thất bại: file JSON không hợp lệ');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [scripts, onUpdate]);

    return (
        <div className="regex-panel">
            <div className="regex-panel-header">
                <h4><Code size={14} /> Regex Scripts</h4>
                <div className="regex-panel-actions">
                    <button onClick={handleCreate} title="Tạo mới">
                        <Plus size={12} /> Thêm
                    </button>
                </div>
            </div>

            {/* Script List */}
            {scripts.length === 0 ? (
                <div className="regex-empty">
                    <div className="regex-empty-icon">🔧</div>
                    <div>Chưa có regex script nào</div>
                    <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
                        Import từ card hoặc tạo mới
                    </div>
                </div>
            ) : (
                <div className="regex-list">
                    {scripts.map((script, idx) => (
                        <div
                            key={script.id || idx}
                            className={`regex-item ${dragIdx === idx ? 'dragging' : ''} ${dragOverIdx === idx ? 'drag-over' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="regex-item-grip">
                                <GripVertical size={12} />
                            </div>

                            <div className="regex-item-info">
                                <div className={`regex-item-name ${script.disabled ? 'disabled' : ''}`}>
                                    {script.scriptName || script.name || `Regex #${idx + 1}`}
                                </div>
                                <div className="regex-item-tags">
                                    {(Array.isArray(script.placement) ? script.placement : []).map(p => {
                                        const info = PLACEMENT_LABELS[p];
                                        if (!info) return null;
                                        return (
                                            <span key={p} className={`regex-placement-tag ${info.cls}`}>
                                                {info.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="regex-toggle" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={!script.disabled}
                                    onChange={() => handleToggle(script.id)}
                                />
                                <span className="regex-toggle-slider" />
                            </label>

                            <div className="regex-item-btns">
                                <button onClick={() => handleEdit(script)} title="Sửa">
                                    <Edit3 size={11} />
                                </button>
                                <button className="btn-delete" onClick={() => handleDelete(script.id)} title="Xóa">
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Import / Export */}
            <div className="regex-io-bar">
                <button onClick={() => fileInputRef.current?.click()}>
                    <Upload size={11} /> Import
                </button>
                <button onClick={handleExport} disabled={scripts.length === 0}>
                    <Download size={11} /> Export
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="regex-hidden-input"
                onChange={handleImport}
            />

            {/* Editor Modal */}
            {showEditor && (
                <RegexEditorModal
                    script={editingScript}
                    onSave={handleSaveScript}
                    onClose={() => { setShowEditor(false); setEditingScript(null); }}
                />
            )}
        </div>
    );
}
