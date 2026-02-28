import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { Building2, Plus, Trash2, Edit3, Save, X, Download, Upload } from 'lucide-react';
import { triggerImport, exportItemsToJSON, exportSingleItemToJSON } from '../../utils/importExportUtils';
import { motion, AnimatePresence } from 'framer-motion';
import LorebookFields from './LorebookFields';

const emptyOrg = { name: '', members: '', traits: '', purpose: '', notes: '', keywords: '', state: '', insertionOrder: '', priority: '', alwaysActive: false };

export default function OrganizationTab() {
    const { currentStory, organizationOps } = useStory();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptyOrg });

    const organizations = currentStory?.database?.organizations || [];

    const handleAdd = () => {
        if (newItem.name.trim()) {
            organizationOps.add(newItem);
            setNewItem({ ...emptyOrg });
            setShowAdd(false);
        }
    };

    const handleEdit = (o) => {
        setEditingId(o.id);
        setEditData({ name: o.name, members: o.members || '', traits: o.traits || '', purpose: o.purpose || '', notes: o.notes || '', keywords: o.keywords || '', state: o.state || '' });
    };

    const handleSave = (id) => { organizationOps.update(id, editData); setEditingId(null); };

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
                    <Building2 size={22} className="text-primary" /> Tổ chức
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({organizations.length})</span>
                </h2>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-small" onClick={async () => {
                        try {
                            const items = await triggerImport();
                            if (items.length > 0) { items.forEach(item => organizationOps.add(item)); alert(`✅ Đã nhập ${items.length} tổ chức!`); }
                        } catch (err) { alert('❌ ' + err.message); }
                    }} title="Nhập tổ chức từ JSON"><Upload size={16} /> Nhập</button>
                    <button className="btn btn-secondary btn-small" onClick={() => exportItemsToJSON(organizations, `${currentStory.title}_organizations.json`)} disabled={organizations.length === 0} title="Xuất tất cả tổ chức"><Download size={16} /> Xuất</button>
                    <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm</button>
                </div>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <Field label="Tên tổ chức" value={newItem.name} onChange={v => setNewItem(p => ({ ...p, name: v }))} placeholder="VD: Hội Kỵ Sĩ Bạch Long" />
                            <Field label="Cấu trúc thành viên" value={newItem.members} onChange={v => setNewItem(p => ({ ...p, members: v }))} textarea placeholder="Lãnh đạo, thành viên đã biết..." />
                            <Field label="Đặc điểm thành viên" value={newItem.traits} onChange={v => setNewItem(p => ({ ...p, traits: v }))} textarea placeholder="Quy tắc, phong cách, trang phục..." />
                            <Field label="Mục đích" value={newItem.purpose} onChange={v => setNewItem(p => ({ ...p, purpose: v }))} textarea placeholder="Tổ chức này nhằm mục đích gì?" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Trạng thái (MVU)" value={newItem.state} onChange={v => setNewItem(p => ({ ...p, state: v }))} placeholder="Trạng thái..." />
                            </div>
                            <Field label="Ghi chú" value={newItem.notes} onChange={v => setNewItem(p => ({ ...p, notes: v }))} textarea placeholder="Ghi chú quan trọng..." />
                            <LorebookFields data={newItem} onChange={setNewItem} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewItem({ ...emptyOrg }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newItem.name.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {organizations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <Building2 size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có tổ chức nào.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {organizations.map((o, i) => (
                        <motion.div key={o.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="character-card">
                            {editingId === o.id ? (
                                <div>
                                    <Field label="Tên" value={editData.name} onChange={v => setEditData(p => ({ ...p, name: v }))} />
                                    <Field label="Thành viên" value={editData.members} onChange={v => setEditData(p => ({ ...p, members: v }))} textarea />
                                    <Field label="Đặc điểm" value={editData.traits} onChange={v => setEditData(p => ({ ...p, traits: v }))} textarea />
                                    <Field label="Mục đích" value={editData.purpose} onChange={v => setEditData(p => ({ ...p, purpose: v }))} textarea />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
                                        <Field label="Trạng thái (MVU)" value={editData.state} onChange={v => setEditData(p => ({ ...p, state: v }))} placeholder="Trạng thái..." />
                                    </div>
                                    <Field label="Ghi chú" value={editData.notes} onChange={v => setEditData(p => ({ ...p, notes: v }))} textarea />
                                    <LorebookFields data={editData} onChange={setEditData} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSave(o.id)}><Save size={14} /> Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <Building2 size={20} style={{ color: 'hsl(220, 80%, 60%)' }} />
                                            <span className="card-title">{o.name}</span>
                                        </div>
                                        <div className="card-actions">
                                            <button className="btn-icon" onClick={() => exportSingleItemToJSON(o, `${o.name}.json`)} title="Xuất"><Download size={14} /></button>
                                            <button className="btn-icon" onClick={() => handleEdit(o)}><Edit3 size={16} /></button>
                                            <button className="btn-icon" onClick={() => { if (window.confirm('Xóa tổ chức này?')) organizationOps.delete(o.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        {o.purpose && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Mục đích:</span><div className="field-value">{o.purpose}</div></div>}
                                        {o.members && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Thành viên:</span><div className="field-value">{o.members}</div></div>}
                                        {o.traits && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Đặc điểm:</span><div className="field-value">{o.traits}</div></div>}
                                        {o.state && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(140, 70%, 50%)', fontWeight: 600 }}>🟢 Trạng thái: {o.state}</span></div>}
                                        {o.keywords && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(45, 95%, 50%)', fontWeight: 600 }}>🔑 {o.keywords}</span></div>}
                                        {o.notes && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{o.notes}</span></div>}
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
