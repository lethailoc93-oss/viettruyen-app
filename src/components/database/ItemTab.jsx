import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { Package, Plus, Trash2, Edit3, Save, X, Download, Upload } from 'lucide-react';
import { triggerImport, exportItemsToJSON, exportSingleItemToJSON } from '../../utils/importExportUtils';
import { motion, AnimatePresence } from 'framer-motion';
import LorebookFields from './LorebookFields';

const emptyItem = { name: '', owner: '', location: '', quantity: '', form: '', effect: '', limitation: '', origin: '', notes: '', keywords: '', state: '', insertionOrder: '', priority: '', alwaysActive: false };

export default function ItemTab() {
    const { currentStory, itemOps } = useStory();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptyItem });

    const items = currentStory?.database?.items || [];

    const handleAdd = () => {
        if (newItem.name.trim()) {
            itemOps.add(newItem);
            setNewItem({ ...emptyItem });
            setShowAdd(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setEditData({
            name: item.name, owner: item.owner || '', location: item.location || '',
            quantity: item.quantity || '', form: item.form || '', effect: item.effect || '',
            limitation: item.limitation || '', notes: item.notes || '', keywords: item.keywords || '', state: item.state || ''
        });
    };

    const handleSave = (id) => { itemOps.update(id, editData); setEditingId(null); };

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
                    <Package size={22} className="text-primary" /> Vật phẩm
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({items.length})</span>
                </h2>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-small" onClick={async () => {
                        try {
                            const imported = await triggerImport();
                            if (imported.length > 0) { imported.forEach(item => itemOps.add(item)); alert(`✅ Đã nhập ${imported.length} vật phẩm!`); }
                        } catch (err) { alert('❌ ' + err.message); }
                    }} title="Nhập vật phẩm từ JSON"><Upload size={16} /> Nhập</button>
                    <button className="btn btn-secondary btn-small" onClick={() => exportItemsToJSON(items, `${currentStory.title}_items.json`)} disabled={items.length === 0} title="Xuất tất cả vật phẩm"><Download size={16} /> Xuất</button>
                    <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm</button>
                </div>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Tên vật phẩm" value={newItem.name} onChange={v => setNewItem(p => ({ ...p, name: v }))} placeholder="VD: Kiếm Hắc Long" />
                                <Field label="Người sở hữu" value={newItem.owner} onChange={v => setNewItem(p => ({ ...p, owner: v }))} placeholder="Ai đang giữ?" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Vị trí hiện tại" value={newItem.location} onChange={v => setNewItem(p => ({ ...p, location: v }))} placeholder="Đang ở đâu?" />
                                <Field label="Số lượng" value={newItem.quantity} onChange={v => setNewItem(p => ({ ...p, quantity: v }))} placeholder="1" />
                                <Field label="Hình thái" value={newItem.form} onChange={v => setNewItem(p => ({ ...p, form: v }))} placeholder="Kiếm, sách..." />
                            </div>
                            <Field label="Công dụng" value={newItem.effect} onChange={v => setNewItem(p => ({ ...p, effect: v }))} textarea placeholder="Vật phẩm này dùng để làm gì?" />
                            <Field label="Hạn chế" value={newItem.limitation} onChange={v => setNewItem(p => ({ ...p, limitation: v }))} textarea placeholder="Điều kiện sử dụng, tác dụng phụ..." />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Trạng thái (MVU)" value={newItem.state} onChange={v => setNewItem(p => ({ ...p, state: v }))} placeholder="Trạng thái hiện tại (tự động cập nhật)..." />
                            </div>
                            <Field label="Ghi chú" value={newItem.notes} onChange={v => setNewItem(p => ({ ...p, notes: v }))} textarea placeholder="Ghi chú quan trọng..." />
                            <Field label="Nguồn gốc" value={newItem.origin} onChange={v => setNewItem(p => ({ ...p, origin: v }))} textarea placeholder="Vật phẩm này đến từ đâu, ai tạo ra..." />
                            <LorebookFields data={newItem} onChange={setNewItem} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewItem({ ...emptyItem }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newItem.name.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <Package size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có vật phẩm nào.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {items.map((item, i) => (
                        <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="character-card">
                            {editingId === item.id ? (
                                <div>
                                    <Field label="Tên" value={editData.name} onChange={v => setEditData(p => ({ ...p, name: v }))} />
                                    <Field label="Người sở hữu" value={editData.owner} onChange={v => setEditData(p => ({ ...p, owner: v }))} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                                        <Field label="Vị trí" value={editData.location} onChange={v => setEditData(p => ({ ...p, location: v }))} />
                                        <Field label="Số lượng" value={editData.quantity} onChange={v => setEditData(p => ({ ...p, quantity: v }))} />
                                        <Field label="Hình thái" value={editData.form} onChange={v => setEditData(p => ({ ...p, form: v }))} />
                                    </div>
                                    <Field label="Công dụng" value={editData.effect} onChange={v => setEditData(p => ({ ...p, effect: v }))} textarea />
                                    <Field label="Hạn chế" value={editData.limitation} onChange={v => setEditData(p => ({ ...p, limitation: v }))} textarea />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
                                        <Field label="Trạng thái (MVU)" value={editData.state} onChange={v => setEditData(p => ({ ...p, state: v }))} placeholder="Trạng thái..." />
                                    </div>
                                    <Field label="Ghi chú" value={editData.notes} onChange={v => setEditData(p => ({ ...p, notes: v }))} textarea />
                                    <Field label="Nguồn gốc" value={editData.origin} onChange={v => setEditData(p => ({ ...p, origin: v }))} textarea placeholder="Nguồn gốc vật phẩm..." />
                                    <LorebookFields data={editData} onChange={setEditData} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSave(item.id)}><Save size={14} /> Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <Package size={20} style={{ color: 'hsl(30, 90%, 55%)' }} />
                                            <div>
                                                <span className="card-title">{item.name}</span>
                                                {item.owner && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>👤 {item.owner}</div>}
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button className="btn-icon" onClick={() => exportSingleItemToJSON(item, `${item.name}.json`)} title="Xuất"><Download size={14} /></button>
                                            <button className="btn-icon" onClick={() => handleEdit(item)}><Edit3 size={16} /></button>
                                            <button className="btn-icon" onClick={() => { if (window.confirm('Xóa vật phẩm này?')) itemOps.delete(item.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        {(item.location || item.quantity || item.form) && (
                                            <div className="card-field" style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                                {item.location && <span style={{ fontSize: 'var(--font-size-xs)' }}>📍 {item.location}</span>}
                                                {item.quantity && <span style={{ fontSize: 'var(--font-size-xs)' }}>x{item.quantity}</span>}
                                                {item.form && <span style={{ fontSize: 'var(--font-size-xs)' }}>🔹 {item.form}</span>}
                                            </div>
                                        )}
                                        {item.effect && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Công dụng:</span><div className="field-value">{item.effect}</div></div>}
                                        {item.limitation && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(0, 70%, 60%)' }}>⚠ Hạn chế:</span><div className="field-value">{item.limitation}</div></div>}
                                        {item.state && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(140, 70%, 50%)', fontWeight: 600 }}>🟢 Trạng thái: {item.state}</span></div>}
                                        {item.keywords && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(45, 95%, 50%)', fontWeight: 600 }}>🔑 {item.keywords}</span></div>}
                                        {item.notes && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{item.notes}</span></div>}
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
