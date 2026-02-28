import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { Zap, Plus, Trash2, Edit3, Save, X, Download, Upload } from 'lucide-react';
import { triggerImport, exportItemsToJSON, exportSingleItemToJSON } from '../../utils/importExportUtils';
import { motion, AnimatePresence } from 'framer-motion';
import LorebookFields from './LorebookFields';

const emptyAbility = { name: '', owner: '', effect: '', limitation: '', notes: '', keywords: '', state: '', insertionOrder: '', priority: '', alwaysActive: false };

export default function AbilityTab() {
    const { currentStory, abilityOps } = useStory();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptyAbility });

    const abilities = currentStory?.database?.abilities || [];

    const handleAdd = () => {
        if (newItem.name.trim()) {
            abilityOps.add(newItem);
            setNewItem({ ...emptyAbility });
            setShowAdd(false);
        }
    };

    const handleEdit = (a) => {
        setEditingId(a.id);
        setEditData({ name: a.name, owner: a.owner || '', effect: a.effect || '', limitation: a.limitation || '', notes: a.notes || '', keywords: a.keywords || '', state: a.state || '' });
    };

    const handleSave = (id) => { abilityOps.update(id, editData); setEditingId(null); };

    if (!currentStory) return <div className="database-container"><p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Vui lòng chọn hoặc tạo truyện trước.</p></div>;

    const Field = ({ label, value, onChange, textarea, placeholder }) => (
        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
            <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>{label}</label>
            {textarea ? <textarea className="form-textarea" value={value} onChange={e => onChange(e.target.value)} rows={2} placeholder={placeholder} />
                : <input className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
        </div>
    );

    return (
        <motion.div className="database-container" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Zap size={22} className="text-primary" /> Năng lực
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({abilities.length})</span>
                </h2>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-small" onClick={async () => {
                        try {
                            const items = await triggerImport();
                            if (items.length > 0) { items.forEach(item => abilityOps.add(item)); alert(`✅ Đã nhập ${items.length} năng lực!`); }
                        } catch (err) { alert('❌ ' + err.message); }
                    }} title="Nhập năng lực từ JSON"><Upload size={16} /> Nhập</button>
                    <button className="btn btn-secondary btn-small" onClick={() => exportItemsToJSON(abilities, `${currentStory.title}_abilities.json`)} disabled={abilities.length === 0} title="Xuất tất cả năng lực"><Download size={16} /> Xuất</button>
                    <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm</button>
                </div>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Tên năng lực" value={newItem.name} onChange={v => setNewItem(p => ({ ...p, name: v }))} placeholder="VD: Phép thuật lửa" />
                                <Field label="Người sở hữu" value={newItem.owner} onChange={v => setNewItem(p => ({ ...p, owner: v }))} placeholder="Nhân vật nào?" />
                            </div>
                            <Field label="Công dụng" value={newItem.effect} onChange={v => setNewItem(p => ({ ...p, effect: v }))} textarea placeholder="Năng lực này làm được gì?" />
                            <Field label="Hạn chế" value={newItem.limitation} onChange={v => setNewItem(p => ({ ...p, limitation: v }))} textarea placeholder="Điểm yếu, điều kiện sử dụng..." />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Trạng thái (MVU)" value={newItem.state} onChange={v => setNewItem(p => ({ ...p, state: v }))} placeholder="Trạng thái..." />
                            </div>
                            <Field label="Ghi chú" value={newItem.notes} onChange={v => setNewItem(p => ({ ...p, notes: v }))} textarea placeholder="Ghi chú quan trọng..." />
                            <LorebookFields data={newItem} onChange={setNewItem} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewItem({ ...emptyAbility }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newItem.name.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {abilities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <Zap size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có năng lực nào.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {abilities.map((a, i) => (
                        <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="character-card">
                            {editingId === a.id ? (
                                <div>
                                    <Field label="Tên" value={editData.name} onChange={v => setEditData(p => ({ ...p, name: v }))} />
                                    <Field label="Người sở hữu" value={editData.owner} onChange={v => setEditData(p => ({ ...p, owner: v }))} />
                                    <Field label="Công dụng" value={editData.effect} onChange={v => setEditData(p => ({ ...p, effect: v }))} textarea />
                                    <Field label="Hạn chế" value={editData.limitation} onChange={v => setEditData(p => ({ ...p, limitation: v }))} textarea />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
                                        <Field label="Trạng thái (MVU)" value={editData.state} onChange={v => setEditData(p => ({ ...p, state: v }))} placeholder="Trạng thái..." />
                                    </div>
                                    <Field label="Ghi chú" value={editData.notes} onChange={v => setEditData(p => ({ ...p, notes: v }))} textarea />
                                    <LorebookFields data={editData} onChange={setEditData} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSave(a.id)}><Save size={14} /> Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <Zap size={20} style={{ color: 'hsl(45, 95%, 55%)' }} />
                                            <div>
                                                <span className="card-title">{a.name}</span>
                                                {a.owner && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>👤 {a.owner}</div>}
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button className="btn-icon" onClick={() => exportSingleItemToJSON(a, `${a.name}.json`)} title="Xuất"><Download size={14} /></button>
                                            <button className="btn-icon" onClick={() => handleEdit(a)}><Edit3 size={16} /></button>
                                            <button className="btn-icon" onClick={() => { if (window.confirm('Xóa năng lực này?')) abilityOps.delete(a.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        {a.effect && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Công dụng:</span><div className="field-value">{a.effect}</div></div>}
                                        {a.limitation && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(0, 70%, 60%)' }}>⚠ Hạn chế:</span><div className="field-value">{a.limitation}</div></div>}
                                        {a.state && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(140, 70%, 50%)', fontWeight: 600 }}>🟢 Trạng thái: {a.state}</span></div>}
                                        {a.keywords && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(45, 95%, 50%)', fontWeight: 600 }}>🔑 {a.keywords}</span></div>}
                                        {a.notes && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{a.notes}</span></div>}
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
