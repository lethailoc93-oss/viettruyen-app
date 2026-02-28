import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { BookOpen, Plus, Trash2, Edit3, Save, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const emptyRule = {
    name: '', narrativeStyle: '', logicLimits: '', dynamicUpdates: '',
    description: '', keywords: '', notes: '',
    insertionOrder: '', priority: '5', alwaysActive: true
};

export default function MetaRulesTab() {
    const { currentStory, metaRuleOps } = useStory();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptyRule });

    const metaRules = currentStory?.database?.metaRules || [];

    const handleAdd = () => {
        if (newItem.name.trim()) {
            metaRuleOps.add(newItem);
            setNewItem({ ...emptyRule });
            setShowAdd(false);
        }
    };

    const handleEdit = (r) => {
        setEditingId(r.id);
        const d = {};
        for (const key of Object.keys(emptyRule)) {
            d[key] = key === 'alwaysActive' ? !!r[key] : (r[key] || '');
        }
        setEditData(d);
    };

    const handleSave = (id) => { metaRuleOps.update(id, editData); setEditingId(null); };

    if (!currentStory) return <div className="database-container"><p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Vui lòng chọn hoặc tạo truyện trước.</p></div>;

    const Field = ({ label, value, onChange, textarea, placeholder, rows }) => (
        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
            <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>{label}</label>
            {textarea ? <textarea className="form-textarea" value={value} onChange={e => onChange(e.target.value)} rows={rows || 3} placeholder={placeholder} />
                : <input className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
        </div>
    );

    const RuleForm = ({ data, onChange }) => (
        <>
            <Field label="Tên quy tắc" value={data.name} onChange={v => onChange(p => ({ ...p, name: v }))} placeholder='VD: "quy tắc kể chuyện", "hướng dẫn AI"' />
            <Field label="Phong cách kể chuyện" value={data.narrativeStyle} onChange={v => onChange(p => ({ ...p, narrativeStyle: v }))} textarea placeholder="Giọng văn, độ dài chương, góc nhìn (VD: kể theo góc nhìn thứ ba, tránh spoil tương lai)..." rows={3} />
            <Field label="Giới hạn logic" value={data.logicLimits} onChange={v => onChange(p => ({ ...p, logicLimits: v }))} textarea placeholder='VD: "Không thêm nhân vật mới vô lý", "Giữ nhất quán timeline"...' rows={3} />
            <Field label="Cập nhật động" value={data.dynamicUpdates} onChange={v => onChange(p => ({ ...p, dynamicUpdates: v }))} textarea placeholder="Các quy tắc cần tuân thủ liên tục, always-on..." rows={2} />
            <Field label="Mô tả chi tiết" value={data.description} onChange={v => onChange(p => ({ ...p, description: v }))} textarea placeholder="Mô tả tổng quan cho quy tắc này..." rows={2} />
            <Field label="Từ khóa (Lorebook)" value={data.keywords} onChange={v => onChange(p => ({ ...p, keywords: v }))} placeholder='VD: "quy tắc truyện", "hướng dẫn AI"' />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                <Field label="Thứ tự inject" value={data.insertionOrder} onChange={v => onChange(p => ({ ...p, insertionOrder: v }))} placeholder="50" />
                <Field label="Độ ưu tiên (1-5)" value={data.priority} onChange={v => onChange(p => ({ ...p, priority: v }))} placeholder="5" />
                <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Luôn kích hoạt</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginTop: '6px' }}>
                        <input type="checkbox" checked={!!data.alwaysActive} onChange={e => onChange(p => ({ ...p, alwaysActive: e.target.checked }))} />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Always Active</span>
                    </label>
                </div>
            </div>
            <Field label="Ghi chú" value={data.notes} onChange={v => onChange(p => ({ ...p, notes: v }))} textarea placeholder="Ghi chú cho tác giả (dưới 200 từ/entry)..." rows={2} />
        </>
    );

    return (
        <motion.div className="database-container" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Shield size={22} className="text-primary" /> Quy tắc AI
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({metaRules.length})</span>
                </h2>
                <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm</button>
            </div>

            {/* Info banner */}
            <div style={{
                padding: 'var(--space-sm) var(--space-md)',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6
            }}>
                🔒 <strong>Quy tắc AI</strong> luôn được inject vào context, giúp AI tuân thủ phong cách kể chuyện, giới hạn logic, và các quy tắc bạn đặt ra. Giữ mỗi entry ngắn gọn (dưới 200 từ).
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <RuleForm data={newItem} onChange={setNewItem} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewItem({ ...emptyRule }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newItem.name.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {metaRules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <Shield size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có quy tắc AI nào.</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-sm)' }}>Thêm quy tắc để AI luôn tuân thủ phong cách kể chuyện của bạn.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {metaRules.map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="character-card">
                            {editingId === r.id ? (
                                <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                    <RuleForm data={editData} onChange={setEditData} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSave(r.id)}><Save size={14} /> Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <Shield size={20} style={{ color: 'hsl(270, 80%, 60%)' }} />
                                            <div>
                                                <span className="card-title">{r.name}</span>
                                                {r.alwaysActive && <div style={{ fontSize: '0.6rem', color: 'hsl(140, 70%, 50%)', fontWeight: 600 }}>🔒 Always Active</div>}
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button className="btn-icon" onClick={() => handleEdit(r)}><Edit3 size={16} /></button>
                                            <button className="btn-icon" onClick={() => { if (window.confirm('Xóa quy tắc này?')) metaRuleOps.delete(r.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        {r.narrativeStyle && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>📝 Phong cách:</span><div className="field-value">{r.narrativeStyle}</div></div>}
                                        {r.logicLimits && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(0, 70%, 60%)' }}>⚠ Giới hạn:</span><div className="field-value">{r.logicLimits}</div></div>}
                                        {r.dynamicUpdates && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>🔄 Cập nhật:</span><div className="field-value">{r.dynamicUpdates}</div></div>}
                                        {r.description && <div className="card-field"><div className="field-value">{r.description}</div></div>}
                                        {r.keywords && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(45, 95%, 50%)', fontWeight: 600 }}>🔑 {r.keywords}</span></div>}
                                        {r.notes && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{r.notes}</span></div>}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
