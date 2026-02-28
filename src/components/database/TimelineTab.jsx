import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { Clock, Plus, Trash2, Edit3, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const emptyEvent = { title: '', date: '', description: '', characters: '', location: '' };

export default function TimelineTab({ onNavigate }) {
    const { currentStory, timelineOps } = useStory();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptyEvent });

    const timeline = currentStory?.database?.timeline || [];

    const handleAdd = () => {
        if (newItem.title.trim()) {
            timelineOps.add({ ...newItem, order: timeline.length + 1 });
            setNewItem({ ...emptyEvent });
            setShowAdd(false);
        }
    };

    const handleEdit = (t) => {
        setEditingId(t.id);
        setEditData({ title: t.title, date: t.date || '', description: t.description || '', characters: t.characters || '', location: t.location || '' });
    };

    const handleSave = (id) => { timelineOps.update(id, editData); setEditingId(null); };

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
                    <Clock size={22} className="text-primary" /> Dòng thời gian
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({timeline.length} sự kiện)</span>
                </h2>
                <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm sự kiện</button>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Tiêu đề sự kiện" value={newItem.title} onChange={v => setNewItem(p => ({ ...p, title: v }))} placeholder="Tên sự kiện" />
                                <Field label="Thời gian" value={newItem.date} onChange={v => setNewItem(p => ({ ...p, date: v }))} placeholder="Ngày/Kỳ (VD: Năm 1, Mùa xuân)" />
                            </div>
                            <Field label="Mô tả" value={newItem.description} onChange={v => setNewItem(p => ({ ...p, description: v }))} textarea placeholder="Chi tiết sự kiện..." />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Nhân vật liên quan" value={newItem.characters} onChange={v => setNewItem(p => ({ ...p, characters: v }))} placeholder="An, Bình..." />
                                <Field label="Địa điểm" value={newItem.location} onChange={v => setNewItem(p => ({ ...p, location: v }))} placeholder="Xảy ra ở đâu?" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewItem({ ...emptyEvent }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newItem.title.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <Clock size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có sự kiện nào trong dòng thời gian.</p>
                </div>
            ) : (
                <div style={{ position: 'relative', paddingLeft: '30px' }}>
                    {/* Vertical timeline line */}
                    <div style={{ position: 'absolute', left: '14px', top: 0, bottom: 0, width: '2px', background: 'var(--gradient-primary)', borderRadius: '1px' }} />

                    {timeline.map((t, i) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            style={{ position: 'relative', marginBottom: 'var(--space-md)' }}
                        >
                            {/* Dot */}
                            <div style={{ position: 'absolute', left: '-22px', top: '12px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-primary)', border: '2px solid var(--color-bg-primary)', zIndex: 1 }} />

                            <div className="character-card" style={{ marginLeft: 'var(--space-md)' }}>
                                {editingId === t.id ? (
                                    <div>
                                        <Field label="Tiêu đề" value={editData.title} onChange={v => setEditData(p => ({ ...p, title: v }))} />
                                        <Field label="Thời gian" value={editData.date} onChange={v => setEditData(p => ({ ...p, date: v }))} />
                                        <Field label="Mô tả" value={editData.description} onChange={v => setEditData(p => ({ ...p, description: v }))} textarea />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                            <Field label="Nhân vật" value={editData.characters} onChange={v => setEditData(p => ({ ...p, characters: v }))} />
                                            <Field label="Địa điểm" value={editData.location} onChange={v => setEditData(p => ({ ...p, location: v }))} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                            <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                            <button className="btn btn-primary btn-small" onClick={() => handleSave(t.id)}><Save size={14} /> Lưu</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="card-header">
                                            <div>
                                                <span className="card-title">{t.title}</span>
                                                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                                    {t.date && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', marginTop: '2px' }}>⏰ {t.date}</div>}
                                                    {t.location && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', marginTop: '2px' }}>📍 {t.location}</div>}
                                                </div>
                                            </div>
                                            <div className="card-actions">
                                                <button className="btn-icon" onClick={() => handleEdit(t)}><Edit3 size={16} /></button>
                                                <button className="btn-icon" onClick={() => { if (window.confirm('Xóa sự kiện này?')) timelineOps.delete(t.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="card-content">
                                            {t.description && <div className="card-field"><div className="field-value">{t.description}</div></div>}
                                            {t.characters && (() => {
                                                const charNames = t.characters.split(',').map(n => n.trim()).filter(Boolean);
                                                const dbChars = currentStory?.database?.characters || [];
                                                return (
                                                    <div className="card-field" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>👥</span>
                                                        {charNames.map((name, idx) => {
                                                            const isInDb = dbChars.some(c => c.name?.toLowerCase() === name.toLowerCase());
                                                            return (
                                                                <span
                                                                    key={idx}
                                                                    onClick={(e) => { if (isInDb) { e.stopPropagation(); onNavigate && onNavigate('characters'); } }}
                                                                    style={{
                                                                        fontSize: '0.7rem',
                                                                        padding: '1px 6px',
                                                                        borderRadius: '8px',
                                                                        background: isInDb ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255,255,255,0.05)',
                                                                        color: isInDb ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                                                                        cursor: isInDb ? 'pointer' : 'default',
                                                                        fontWeight: isInDb ? 600 : 400
                                                                    }}
                                                                >
                                                                    {name}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
