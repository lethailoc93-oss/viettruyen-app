import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { FileText, Plus, Trash2, Edit3, Save, X, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const emptyPlot = { title: '', type: 'foreshadowing', description: '', status: 'planned', triggerCondition: '', timeline: '', consequences: '', keywords: '', insertionOrder: '', priority: '', alwaysActive: false };
const plotTypes = [
    { value: 'foreshadowing', label: 'Phục bút', color: '#8b5cf6' },
    { value: 'twist', label: 'Twist / Bước ngoặt', color: '#ef4444' },
    { value: 'conflict', label: 'Xung đột', color: '#f59e0b' },
    { value: 'resolution', label: 'Giải quyết', color: '#10b981' },
    { value: 'subplot', label: 'Tuyến phụ', color: '#6366f1' },
    { value: 'other', label: 'Khác', color: '#94a3b8' }
];
const statusOptions = [
    { value: 'planned', label: 'Đã lên kế hoạch', color: '#94a3b8' },
    { value: 'written', label: 'Đã viết', color: '#3b82f6' },
    { value: 'resolved', label: 'Đã giải quyết', color: '#10b981' }
];

export default function PlotTab() {
    const { currentStory, plotOps } = useStory();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptyPlot });

    const plots = currentStory?.database?.plots || [];

    const handleAdd = () => {
        if (newItem.title.trim()) {
            plotOps.add(newItem);
            setNewItem({ ...emptyPlot });
            setShowAdd(false);
        }
    };

    const handleEdit = (p) => {
        setEditingId(p.id);
        setEditData({ title: p.title, type: p.type || 'other', description: p.description || '', status: p.status || 'planned', triggerCondition: p.triggerCondition || '', timeline: p.timeline || '', consequences: p.consequences || '', keywords: p.keywords || '', insertionOrder: p.insertionOrder || '', priority: p.priority || '', alwaysActive: !!p.alwaysActive });
    };

    const handleSave = (id) => { plotOps.update(id, editData); setEditingId(null); };

    const getTypeInfo = (type) => plotTypes.find(t => t.value === type) || plotTypes[5];
    const getStatusInfo = (status) => statusOptions.find(s => s.value === status) || statusOptions[0];

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
                    <FileText size={22} className="text-primary" /> Chi tiết cốt truyện
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({plots.length})</span>
                </h2>
                <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm</button>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <Field label="Tiêu đề" value={newItem.title} onChange={v => setNewItem(p => ({ ...p, title: v }))} placeholder="Tên chi tiết/sự kiện" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Loại</label>
                                    <select className="form-input" value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))}>
                                        {plotTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Trạng thái</label>
                                    <select className="form-input" value={newItem.status} onChange={e => setNewItem(p => ({ ...p, status: e.target.value }))}>
                                        {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <Field label="Mô tả" value={newItem.description} onChange={v => setNewItem(p => ({ ...p, description: v }))} textarea placeholder="Chi tiết sự kiện, ai tham gia, kết quả, hậu quả..." />
                            <Field label="Hậu quả" value={newItem.consequences} onChange={v => setNewItem(p => ({ ...p, consequences: v }))} textarea placeholder="Hậu quả của sự kiện này (VD: Vua chết, hoàng tử lên ngôi)..." />
                            <Field label="Timeline" value={newItem.timeline} onChange={v => setNewItem(p => ({ ...p, timeline: v }))} placeholder="Trước: Sự kiện A; Sau: Sự kiện B" />
                            <Field label="Điều kiện trigger" value={newItem.triggerCondition} onChange={v => setNewItem(p => ({ ...p, triggerCondition: v }))} placeholder="Chỉ inject khi nhân vật nhắc đến chiến tranh..." />
                            <Field label="Từ khóa (Lorebook)" value={newItem.keywords} onChange={v => setNewItem(p => ({ ...p, keywords: v }))} placeholder="Từ khóa kích hoạt, bao gồm cả biến thể..." />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Thứ tự inject" value={newItem.insertionOrder} onChange={v => setNewItem(p => ({ ...p, insertionOrder: v }))} placeholder="300" />
                                <Field label="Độ ưu tiên (1-5)" value={newItem.priority} onChange={v => setNewItem(p => ({ ...p, priority: v }))} placeholder="3" />
                                <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Luôn kích hoạt</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginTop: '6px' }}>
                                        <input type="checkbox" checked={!!newItem.alwaysActive} onChange={e => setNewItem(p => ({ ...p, alwaysActive: e.target.checked }))} />
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Always Active</span>
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewItem({ ...emptyPlot }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newItem.title.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {plots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <FileText size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có chi tiết cốt truyện nào.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {plots.map((p, i) => {
                        const typeInfo = getTypeInfo(p.type);
                        const statusInfo = getStatusInfo(p.status);
                        return (
                            <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="character-card">
                                {editingId === p.id ? (
                                    <div>
                                        <Field label="Tiêu đề" value={editData.title} onChange={v => setEditData(d => ({ ...d, title: v }))} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                                <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Loại</label>
                                                <select className="form-input" value={editData.type} onChange={e => setEditData(d => ({ ...d, type: e.target.value }))}>
                                                    {plotTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                                <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Trạng thái</label>
                                                <select className="form-input" value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}>
                                                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <Field label="Mô tả" value={editData.description} onChange={v => setEditData(d => ({ ...d, description: v }))} textarea />
                                        <Field label="Hậu quả" value={editData.consequences} onChange={v => setEditData(d => ({ ...d, consequences: v }))} textarea placeholder="Hậu quả sự kiện..." />
                                        <Field label="Timeline" value={editData.timeline} onChange={v => setEditData(d => ({ ...d, timeline: v }))} placeholder="Trước/Sau sự kiện nào" />
                                        <Field label="Điều kiện trigger" value={editData.triggerCondition} onChange={v => setEditData(d => ({ ...d, triggerCondition: v }))} placeholder="Khi nào inject..." />
                                        <Field label="Từ khóa (Lorebook)" value={editData.keywords} onChange={v => setEditData(d => ({ ...d, keywords: v }))} placeholder="Từ khóa kích hoạt..." />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                                            <Field label="Thứ tự inject" value={editData.insertionOrder} onChange={v => setEditData(d => ({ ...d, insertionOrder: v }))} placeholder="300" />
                                            <Field label="Độ ưu tiên (1-5)" value={editData.priority} onChange={v => setEditData(d => ({ ...d, priority: v }))} placeholder="3" />
                                            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                                <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Luôn kích hoạt</label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginTop: '6px' }}>
                                                    <input type="checkbox" checked={!!editData.alwaysActive} onChange={e => setEditData(d => ({ ...d, alwaysActive: e.target.checked }))} />
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Always Active</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                            <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                            <button className="btn btn-primary btn-small" onClick={() => handleSave(p.id)}><Save size={14} /> Lưu</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="card-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                <Flag size={18} style={{ color: typeInfo.color }} />
                                                <div>
                                                    <span className="card-title">{p.title}</span>
                                                    <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: '4px' }}>
                                                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '8px', background: typeInfo.color + '22', color: typeInfo.color, fontWeight: 600 }}>{typeInfo.label}</span>
                                                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '8px', background: statusInfo.color + '22', color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="card-actions">
                                                <button className="btn-icon" onClick={() => handleEdit(p)}><Edit3 size={16} /></button>
                                                <button className="btn-icon" onClick={() => { if (window.confirm('Xóa chi tiết này?')) plotOps.delete(p.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="card-content">
                                            {p.description && <div className="card-field"><div className="field-value">{p.description}</div></div>}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
