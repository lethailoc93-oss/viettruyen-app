import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { MapPinned, Plus, Trash2, Edit3, Save, X, Download, Upload } from 'lucide-react';
import { triggerImport, exportItemsToJSON, exportSingleItemToJSON } from '../../utils/importExportUtils';
import { motion, AnimatePresence } from 'framer-motion';

const emptyQuest = { title: '', description: '', progress: '', assignee: '', delegate: '', reward: '', location: '', startTime: '', deadline: '', notes: '' };

const progressOptions = ['Chưa bắt đầu', 'Đang thực hiện', 'Tạm dừng', 'Hoàn thành', 'Thất bại'];

export default function QuestTab() {
    const { currentStory, questOps } = useStory();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptyQuest });

    const quests = currentStory?.database?.quests || [];

    const handleAdd = () => {
        if (newItem.title.trim()) {
            questOps.add(newItem);
            setNewItem({ ...emptyQuest });
            setShowAdd(false);
        }
    };

    const handleEdit = (q) => {
        setEditingId(q.id);
        setEditData({
            title: q.title, description: q.description || '', progress: q.progress || '',
            assignee: q.assignee || '', delegate: q.delegate || '', reward: q.reward || '',
            location: q.location || '', startTime: q.startTime || '', deadline: q.deadline || '',
            notes: q.notes || ''
        });
    };

    const handleSave = (id) => { questOps.update(id, editData); setEditingId(null); };

    if (!currentStory) return <div className="database-container"><p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Vui lòng chọn hoặc tạo truyện trước.</p></div>;

    const Field = ({ label, value, onChange, textarea, placeholder }) => (
        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
            <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>{label}</label>
            {textarea ? <textarea className="form-textarea" value={value} onChange={e => onChange(e.target.value)} rows={2} placeholder={placeholder} />
                : <input className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
        </div>
    );

    const progressColor = (p) => {
        if (p === 'Hoàn thành') return 'hsl(140, 70%, 50%)';
        if (p === 'Thất bại') return 'hsl(0, 70%, 55%)';
        if (p === 'Đang thực hiện') return 'hsl(200, 85%, 55%)';
        if (p === 'Tạm dừng') return 'hsl(40, 90%, 55%)';
        return 'var(--color-text-tertiary)';
    };

    return (
        <motion.div className="database-container" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <MapPinned size={22} className="text-primary" /> Nhiệm vụ / Lịch trình
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({quests.length})</span>
                </h2>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-small" onClick={async () => {
                        try {
                            const items = await triggerImport();
                            if (items.length > 0) { items.forEach(item => questOps.add(item)); alert(`✅ Đã nhập ${items.length} nhiệm vụ!`); }
                        } catch (err) { alert('❌ ' + err.message); }
                    }} title="Nhập nhiệm vụ từ JSON"><Upload size={16} /> Nhập</button>
                    <button className="btn btn-secondary btn-small" onClick={() => exportItemsToJSON(quests, `${currentStory.title}_quests.json`)} disabled={quests.length === 0} title="Xuất tất cả nhiệm vụ"><Download size={16} /> Xuất</button>
                    <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm</button>
                </div>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <Field label="Tên nhiệm vụ" value={newItem.title} onChange={v => setNewItem(p => ({ ...p, title: v }))} placeholder="VD: Tìm kiếm ngọc rồng" />
                            <Field label="Nội dung tổng thể" value={newItem.description} onChange={v => setNewItem(p => ({ ...p, description: v }))} textarea placeholder="Mô tả chi tiết nhiệm vụ..." />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Tiến độ</label>
                                    <select className="form-input" value={newItem.progress} onChange={e => setNewItem(p => ({ ...p, progress: e.target.value }))}>
                                        <option value="">Chọn...</option>
                                        {progressOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <Field label="Người thực hiện" value={newItem.assignee} onChange={v => setNewItem(p => ({ ...p, assignee: v }))} placeholder="Nhân vật nào?" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Người ủy thác" value={newItem.delegate} onChange={v => setNewItem(p => ({ ...p, delegate: v }))} placeholder="Ai giao?" />
                                <Field label="Phần thưởng" value={newItem.reward} onChange={v => setNewItem(p => ({ ...p, reward: v }))} placeholder="Phần thưởng..." />
                                <Field label="Địa điểm" value={newItem.location} onChange={v => setNewItem(p => ({ ...p, location: v }))} placeholder="Ở đâu?" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Thời gian bắt đầu" value={newItem.startTime} onChange={v => setNewItem(p => ({ ...p, startTime: v }))} placeholder="Khi nào bắt đầu?" />
                                <Field label="Thời hạn" value={newItem.deadline} onChange={v => setNewItem(p => ({ ...p, deadline: v }))} placeholder="Deadline?" />
                            </div>
                            <Field label="Ghi chú" value={newItem.notes} onChange={v => setNewItem(p => ({ ...p, notes: v }))} textarea placeholder="Ghi chú quan trọng..." />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewItem({ ...emptyQuest }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newItem.title.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {quests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <MapPinned size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có nhiệm vụ nào.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {quests.map((q, i) => (
                        <motion.div key={q.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="character-card">
                            {editingId === q.id ? (
                                <div>
                                    <Field label="Tên" value={editData.title} onChange={v => setEditData(p => ({ ...p, title: v }))} />
                                    <Field label="Nội dung" value={editData.description} onChange={v => setEditData(p => ({ ...p, description: v }))} textarea />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Tiến độ</label>
                                            <select className="form-input" value={editData.progress} onChange={e => setEditData(p => ({ ...p, progress: e.target.value }))}>
                                                <option value="">Chọn...</option>
                                                {progressOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <Field label="Người thực hiện" value={editData.assignee} onChange={v => setEditData(p => ({ ...p, assignee: v }))} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                                        <Field label="Ủy thác" value={editData.delegate} onChange={v => setEditData(p => ({ ...p, delegate: v }))} />
                                        <Field label="Phần thưởng" value={editData.reward} onChange={v => setEditData(p => ({ ...p, reward: v }))} />
                                        <Field label="Địa điểm" value={editData.location} onChange={v => setEditData(p => ({ ...p, location: v }))} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                        <Field label="Bắt đầu" value={editData.startTime} onChange={v => setEditData(p => ({ ...p, startTime: v }))} />
                                        <Field label="Thời hạn" value={editData.deadline} onChange={v => setEditData(p => ({ ...p, deadline: v }))} />
                                    </div>
                                    <Field label="Ghi chú" value={editData.notes} onChange={v => setEditData(p => ({ ...p, notes: v }))} textarea />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSave(q.id)}><Save size={14} /> Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <MapPinned size={20} style={{ color: 'hsl(160, 70%, 50%)' }} />
                                            <div>
                                                <span className="card-title">{q.title}</span>
                                                {q.progress && <div style={{ fontSize: 'var(--font-size-xs)', color: progressColor(q.progress), fontWeight: 600 }}>{q.progress}</div>}
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button className="btn-icon" onClick={() => exportSingleItemToJSON(q, `${q.title || 'quest'}.json`)} title="Xuất"><Download size={14} /></button>
                                            <button className="btn-icon" onClick={() => handleEdit(q)}><Edit3 size={16} /></button>
                                            <button className="btn-icon" onClick={() => { if (window.confirm('Xóa nhiệm vụ này?')) questOps.delete(q.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        {q.description && <div className="card-field"><div className="field-value">{q.description}</div></div>}
                                        {(q.assignee || q.delegate) && (
                                            <div className="card-field" style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                                {q.assignee && <span style={{ fontSize: 'var(--font-size-xs)' }}>🎯 {q.assignee}</span>}
                                                {q.delegate && <span style={{ fontSize: 'var(--font-size-xs)' }}>📋 Giao bởi: {q.delegate}</span>}
                                            </div>
                                        )}
                                        {(q.location || q.startTime || q.deadline) && (
                                            <div className="card-field" style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                                {q.location && <span style={{ fontSize: 'var(--font-size-xs)' }}>📍 {q.location}</span>}
                                                {q.startTime && <span style={{ fontSize: 'var(--font-size-xs)' }}>🕐 {q.startTime}</span>}
                                                {q.deadline && <span style={{ fontSize: 'var(--font-size-xs)' }}>⏰ {q.deadline}</span>}
                                            </div>
                                        )}
                                        {q.reward && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(45, 95%, 55%)' }}>🏆 {q.reward}</span></div>}
                                        {q.notes && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{q.notes}</span></div>}
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
