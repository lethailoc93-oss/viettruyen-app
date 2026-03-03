// ================================================
// RegexEditorModal — Edit a single regex script
// ================================================
import { useState, useMemo } from 'react';
import { X, Eye, Save } from 'lucide-react';
import { runRegexScript, REGEX_PLACEMENT } from '../../services/regexEngine';
import '../../styles/regexManager.css';

const PLACEMENT_OPTIONS = [
    { value: REGEX_PLACEMENT.USER_INPUT, label: 'User Input', key: 'user' },
    { value: REGEX_PLACEMENT.AI_OUTPUT, label: 'AI Output', key: 'ai' },
    { value: REGEX_PLACEMENT.SLASH_COMMAND, label: 'Slash Command', key: 'slash' },
    { value: REGEX_PLACEMENT.WORLD_INFO, label: 'World Info', key: 'world' },
];

const DEFAULT_SCRIPT = {
    scriptName: '',
    findRegex: '',
    replaceString: '',
    trimStrings: [],
    placement: [REGEX_PLACEMENT.AI_OUTPUT],
    disabled: false,
    markdownOnly: false,
    promptOnly: false,
    runOnEdit: false,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
};

export default function RegexEditorModal({ script, onSave, onClose }) {
    const isNew = !script?.id;
    const [form, setForm] = useState(() => ({
        ...DEFAULT_SCRIPT,
        ...script,
        trimStrings: script?.trimStrings || [],
    }));
    const [trimInput, setTrimInput] = useState((script?.trimStrings || []).join(', '));
    const [testInput, setTestInput] = useState('');

    const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const togglePlacement = (val) => {
        setForm(prev => {
            const arr = Array.isArray(prev.placement) ? [...prev.placement] : [];
            const idx = arr.indexOf(val);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(val);
            return { ...prev, placement: arr };
        });
    };

    // Live preview
    const previewResult = useMemo(() => {
        if (!testInput || !form.findRegex) return null;
        try {
            const result = runRegexScript(form, testInput);
            return { text: result, error: false };
        } catch (e) {
            return { text: e.message, error: true };
        }
    }, [testInput, form.findRegex, form.replaceString, form.trimStrings, form.substituteRegex]);

    const handleSave = () => {
        const trimArr = trimInput.split(',').map(s => s.trim()).filter(Boolean);
        onSave({
            ...form,
            trimStrings: trimArr,
            scriptName: form.scriptName || 'Regex chưa đặt tên',
        });
    };

    return (
        <div className="regex-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="regex-modal">
                <div className="regex-modal-header">
                    <h3>
                        <Eye size={16} />
                        {isNew ? 'Tạo Regex mới' : `Sửa: ${form.scriptName}`}
                    </h3>
                    <button className="regex-modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Script Name */}
                <div className="regex-field">
                    <label>Tên kịch bản</label>
                    <input
                        type="text"
                        value={form.scriptName}
                        onChange={(e) => updateField('scriptName', e.target.value)}
                        placeholder="VD: Format dialogue, Bold names..."
                    />
                </div>

                {/* Find Regex */}
                <div className="regex-field">
                    <label>Find Regex (pattern tìm kiếm)</label>
                    <input
                        type="text"
                        value={form.findRegex}
                        onChange={(e) => updateField('findRegex', e.target.value)}
                        placeholder="/pattern/flags  VD: /\*\*(.*?)\*\*/g"
                    />
                    <div className="regex-field-hint">
                        Dạng /pattern/flags. Hỗ trợ macro: {'{{char}}'}, {'{{user}}'}
                    </div>
                </div>

                {/* Replace String */}
                <div className="regex-field">
                    <label>Replace String (chuỗi thay thế)</label>
                    <textarea
                        value={form.replaceString}
                        onChange={(e) => updateField('replaceString', e.target.value)}
                        placeholder="$1 hoặc {{match}} hoặc HTML..."
                        rows={3}
                    />
                    <div className="regex-field-hint">
                        Hỗ trợ $1, $2 (capture groups), {'{{match}}'} (toàn bộ match)
                    </div>
                </div>

                {/* Placement */}
                <div className="regex-field">
                    <label>Placement (áp dụng ở đâu)</label>
                    <div className="regex-placement-grid">
                        {PLACEMENT_OPTIONS.map(opt => (
                            <label
                                key={opt.value}
                                className={`regex-placement-check ${(form.placement || []).includes(opt.value) ? 'checked' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={(form.placement || []).includes(opt.value)}
                                    onChange={() => togglePlacement(opt.value)}
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Trim Strings */}
                <div className="regex-field">
                    <label>Trim Strings (các chuỗi cần loại bỏ, phân cách bằng dấu phẩy)</label>
                    <input
                        type="text"
                        value={trimInput}
                        onChange={(e) => setTrimInput(e.target.value)}
                        placeholder="VD: [, ], {, }"
                    />
                </div>

                {/* Flags */}
                <div className="regex-field">
                    <label>Flags</label>
                    <div className="regex-flags-grid">
                        <label className="regex-flag-item">
                            <input
                                type="checkbox"
                                checked={form.markdownOnly}
                                onChange={(e) => updateField('markdownOnly', e.target.checked)}
                            />
                            Markdown Only
                        </label>
                        <label className="regex-flag-item">
                            <input
                                type="checkbox"
                                checked={form.promptOnly}
                                onChange={(e) => updateField('promptOnly', e.target.checked)}
                            />
                            Prompt Only
                        </label>
                        <label className="regex-flag-item">
                            <input
                                type="checkbox"
                                checked={form.runOnEdit}
                                onChange={(e) => updateField('runOnEdit', e.target.checked)}
                            />
                            Run On Edit
                        </label>
                        <label className="regex-flag-item">
                            Substitute:
                            <input
                                type="number"
                                min={0}
                                max={2}
                                value={form.substituteRegex}
                                onChange={(e) => updateField('substituteRegex', Number(e.target.value))}
                            />
                        </label>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="regex-preview">
                    <h5>🧪 Test nhanh</h5>
                    <input
                        type="text"
                        className="regex-preview-input"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="Nhập text để test regex..."
                    />
                    {previewResult && (
                        <div className={`regex-preview-result ${previewResult.error ? 'regex-preview-error' : ''}`}>
                            {previewResult.text || '(không thay đổi)'}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="regex-modal-actions">
                    <button className="regex-btn regex-btn-cancel" onClick={onClose}>
                        Hủy
                    </button>
                    <button className="regex-btn regex-btn-save" onClick={handleSave}>
                        <Save size={14} />
                        {isNew ? 'Tạo mới' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
}
