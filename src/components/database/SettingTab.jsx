import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { AIService } from '../../services/aiService';
import { Map, Plus, Trash2, Edit3, Save, X, Sparkles, Loader2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LorebookFields from './LorebookFields';

const emptySetting = { name: '', type: '', description: '', details: '', location: '', spatialStructure: '', logicRules: '', timeVariations: '', notes: '', keywords: '', state: '', insertionOrder: '', priority: '', alwaysActive: false };

export default function SettingTab() {
    const { currentStory, settingOps } = useStory();
    const { getNextKey, selectedModel } = useApiKey();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptySetting });
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState('');

    const settings = currentStory?.database?.settings || [];

    const handleAdd = () => {
        if (newItem.name.trim()) {
            settingOps.add(newItem);
            setNewItem({ ...emptySetting });
            setShowAdd(false);
        }
    };

    const handleEdit = (s) => {
        setEditingId(s.id);
        const d = {};
        for (const key of Object.keys(emptySetting)) {
            d[key] = s[key] || '';
        }
        setEditData(d);
    };

    const handleSave = (id) => { settingOps.update(id, editData); setEditingId(null); };

    const handleAI = async () => {
        setAiLoading(true);
        try {
            const prompt = `Gợi ý một bối cảnh/địa điểm mới cho truyện thể loại "${currentStory?.genre || 'chung'}". Tên truyện: "${currentStory?.title || ''}". Bối cảnh hiện có: ${settings.map(s => s.name).join(', ') || 'chưa có'}. Viết bằng tiếng Việt. Format: Tên - Loại - Mô tả chi tiết (bầu không khí, đặc điểm, ý nghĩa trong truyện).`;
            const key = getNextKey();
            const result = key
                ? await AIService.continueStory(key, prompt, currentStory?.database, { storyTitle: currentStory?.title, genre: currentStory?.genre }, { model: selectedModel })
                : 'Cần nhập API key để dùng tính năng AI.';
            setAiResult(result);
        } catch (e) { alert('Lỗi: ' + e.message); }
        finally { setAiLoading(false); }
    };

    if (!currentStory) return <div className="database-container"><p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Vui lòng chọn hoặc tạo truyện trước.</p></div>;

    const Field = ({ label, value, onChange, textarea, placeholder }) => (
        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
            <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>{label}</label>
            {textarea ? <textarea className="form-textarea" value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} />
                : <input className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
        </div>
    );

    const settingTypes = ['Thành phố', 'Làng quê', 'Rừng', 'Biển', 'Núi', 'Cung điện', 'Trường học', 'Khác'];

    return (
        <motion.div className="database-container" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Map size={22} className="text-primary" /> Bối cảnh
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({settings.length})</span>
                </h2>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary btn-small" onClick={handleAI} disabled={aiLoading}>
                        {aiLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Gợi ý AI
                    </button>
                    <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm</button>
                </div>
            </div>

            <AnimatePresence>
                {aiResult && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-md)' }}>
                        <div style={{ padding: 'var(--space-md)', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
                            {aiResult}
                            <div style={{ marginTop: 'var(--space-sm)', textAlign: 'right' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => setAiResult('')}><X size={14} /> Đóng</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Tên địa điểm" value={newItem.name} onChange={v => setNewItem(p => ({ ...p, name: v }))} placeholder="Tên bối cảnh" />
                                <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Loại</label>
                                    <select className="form-input" value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))}>
                                        <option value="">Chọn loại...</option>
                                        {settingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <Field label="Mô tả" value={newItem.description} onChange={v => setNewItem(p => ({ ...p, description: v }))} textarea placeholder="Mô tả bối cảnh..." />
                            <Field label="Chi tiết đặc biệt" value={newItem.details} onChange={v => setNewItem(p => ({ ...p, details: v }))} textarea placeholder="Đặc điểm riêng, lịch sử..." />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Vị trí / Khu vực" value={newItem.location} onChange={v => setNewItem(p => ({ ...p, location: v }))} placeholder="Phía nam thành phố, tầng 3..." />
                                <Field label="Cấu trúc không gian" value={newItem.spatialStructure} onChange={v => setNewItem(p => ({ ...p, spatialStructure: v }))} placeholder="3 tầng, có hầm ngầm..." />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
                                <Field label="Trạng thái (MVU)" value={newItem.state} onChange={v => setNewItem(p => ({ ...p, state: v }))} placeholder="Trạng thái hiện tại (tự động cập nhật)..." />
                            </div>
                            <Field label="Ghi chú" value={newItem.notes} onChange={v => setNewItem(p => ({ ...p, notes: v }))} placeholder="Ghi chú cho tác giả..." />
                            <Field label="Quy tắc logic" value={newItem.logicRules} onChange={v => setNewItem(p => ({ ...p, logicRules: v }))} textarea placeholder="Ví dụ: phép thuật chỉ hoạt động ban đêm, tiền tệ là vàng và bạc..." />
                            <Field label="Biến đổi theo thời gian" value={newItem.timeVariations} onChange={v => setNewItem(p => ({ ...p, timeVariations: v }))} textarea placeholder="Ví dụ: Eldoria trước chiến tranh vs. Eldoria sau chiến tranh..." />
                            <LorebookFields data={newItem} onChange={setNewItem} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewItem({ ...emptySetting }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newItem.name.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {settings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <Map size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có bối cảnh nào.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {settings.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="character-card">
                            {editingId === s.id ? (
                                <div>
                                    <Field label="Tên" value={editData.name} onChange={v => setEditData(p => ({ ...p, name: v }))} />
                                    <Field label="Loại" value={editData.type} onChange={v => setEditData(p => ({ ...p, type: v }))} />
                                    <Field label="Mô tả" value={editData.description} onChange={v => setEditData(p => ({ ...p, description: v }))} textarea />
                                    <Field label="Chi tiết" value={editData.details} onChange={v => setEditData(p => ({ ...p, details: v }))} textarea />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                        <Field label="Vị trí" value={editData.location} onChange={v => setEditData(p => ({ ...p, location: v }))} placeholder="Khu vực, phương hướng..." />
                                        <Field label="Cấu trúc" value={editData.spatialStructure} onChange={v => setEditData(p => ({ ...p, spatialStructure: v }))} placeholder="Sơ đồ lãnh thổ..." />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
                                        <Field label="Trạng thái (MVU)" value={editData.state} onChange={v => setEditData(p => ({ ...p, state: v }))} placeholder="Trạng thái..." />
                                    </div>
                                    <Field label="Ghi chú" value={editData.notes} onChange={v => setEditData(p => ({ ...p, notes: v }))} placeholder="Ghi chú..." />
                                    <Field label="Quy tắc logic" value={editData.logicRules} onChange={v => setEditData(p => ({ ...p, logicRules: v }))} textarea placeholder="Quy tắc bất di bất dịch..." />
                                    <Field label="Biến đổi theo thời gian" value={editData.timeVariations} onChange={v => setEditData(p => ({ ...p, timeVariations: v }))} textarea placeholder="Phiên bản khác nhau..." />
                                    <LorebookFields data={editData} onChange={setEditData} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSave(s.id)}><Save size={14} /> Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <MapPin size={20} className="text-primary" />
                                            <div>
                                                <span className="card-title">{s.name}</span>
                                                {s.type && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{s.type}</div>}
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button className="btn-icon" onClick={() => handleEdit(s)}><Edit3 size={16} /></button>
                                            <button className="btn-icon" onClick={() => { if (window.confirm('Xóa bối cảnh này?')) settingOps.delete(s.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        {s.description && <div className="card-field"><div className="field-value">{s.description}</div></div>}
                                        {s.details && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{s.details}</span></div>}
                                        {s.location && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>📍 {s.location}</span></div>}
                                        {s.spatialStructure && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>🏗️ {s.spatialStructure}</span></div>}
                                        {s.state && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(140, 70%, 50%)', fontWeight: 600 }}>🟢 Trạng thái: {s.state}</span></div>}
                                        {s.keywords && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(45, 95%, 50%)', fontWeight: 600 }}>🔑 {s.keywords}</span></div>}
                                        {s.notes && <div className="card-field"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>⚠️ {s.notes}</span></div>}
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
