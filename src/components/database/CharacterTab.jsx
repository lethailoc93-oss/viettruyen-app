import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { useDirectives } from '../../context/DirectiveContext';
import { AIService } from '../../services/aiService';
import { Users, Plus, Trash2, Edit3, Save, X, Sparkles, Loader2, ChevronDown, ChevronRight, Eye, EyeOff, Download, Upload } from 'lucide-react';
import { triggerImport, exportItemsToJSON, exportSingleItemToJSON, convertCharacterToCard, importCharacterCard } from '../../utils/importExportUtils';
import { motion, AnimatePresence } from 'framer-motion';
import LorebookFields from './LorebookFields';

const emptyChar = {
    // === Static Lore (#2 Thông tin Nhân vật) ===
    name: '', role: '', gender: '', age: '',
    appearance: '', personality: '', weakness: '',
    background: '', motivation: '', abilities: '',
    relationships: '', description: '',
    bodyFeatures: '', clothingPreference: '', hobbies: '',
    longTermGoal: '', importantRelationships: '',
    backgroundSetting: '', attitudeToProtagonist: '',
    actionHistory: '',
    // === Dynamic State (#1 Nhân vật Gần đây) ===
    currentLocation: '', currentClothing: '', currentState: '',
    currentGoal: '', currentPosture: '', currentBodyState: '',
    specialStatus: '',
    // === Lorebook Meta ===
    notes: '', keywords: '',
    insertionOrder: '', priority: '', alwaysActive: false
};

const Field = ({ label, value, onChange, textarea, placeholder, rows }) => (
    <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
        <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>{label}</label>
        {textarea ? (
            <textarea className="form-textarea" value={value} onChange={e => onChange(e.target.value)} rows={rows || 2} placeholder={placeholder} />
        ) : (
            <input className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        )}
    </div>
);

const SectionHeader = ({ icon, title }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: 'var(--font-size-xs)', fontWeight: 600,
        color: 'var(--color-primary)', marginTop: 'var(--space-md)',
        marginBottom: 'var(--space-xs)', textTransform: 'uppercase',
        letterSpacing: '0.5px'
    }}>
        <span>{icon}</span> {title}
    </div>
);

const CharacterForm = ({ data, onChange, isNew }) => (
    <>
        {/* ═══ SECTION 1: Static Lore (Thông tin ổn định) ═══ */}
        <SectionHeader icon="🔵" title="Thông tin ổn định (Static Lore)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <Field label="Tên" value={data.name} onChange={v => onChange(p => ({ ...p, name: v }))} placeholder="Tên nhân vật" />
            <Field label="Vai trò" value={data.role} onChange={v => onChange(p => ({ ...p, role: v }))} placeholder="Nhân vật chính, phản diện..." />
            <Field label="Giới tính" value={data.gender} onChange={v => onChange(p => ({ ...p, gender: v }))} placeholder="Nam, Nữ, Khác..." />
            <Field label="Tuổi" value={data.age} onChange={v => onChange(p => ({ ...p, age: v }))} placeholder="25" />
        </div>
        <Field label="Ngoại hình" value={data.appearance} onChange={v => onChange(p => ({ ...p, appearance: v }))} textarea placeholder="Tóc đen dài, mắt nâu, cao 1m70..." rows={2} />
        <Field label="Đặc điểm cơ thể" value={data.bodyFeatures} onChange={v => onChange(p => ({ ...p, bodyFeatures: v }))} textarea placeholder="Sẹo trên mặt, hình xăm cánh tay, da nâu..." rows={2} />
        <Field label="Tính cách" value={data.personality} onChange={v => onChange(p => ({ ...p, personality: v }))} textarea placeholder="Dũng cảm, thông minh, ít nói nhưng quan tâm người khác..." rows={2} />
        <Field label="Điểm yếu" value={data.weakness} onChange={v => onChange(p => ({ ...p, weakness: v }))} placeholder="Sợ độ cao, nóng tính, dễ tin người..." />
        <Field label="Phong cách trang phục" value={data.clothingPreference} onChange={v => onChange(p => ({ ...p, clothingPreference: v }))} placeholder="Trang phục gọn gàng, áo hoodie, phong cách gothic..." />
        <Field label="Sở thích" value={data.hobbies} onChange={v => onChange(p => ({ ...p, hobbies: v }))} placeholder="Đọc sách, câu cá, luyện kiếm..." />
        <Field label="Lý lịch / Quá khứ" value={data.background} onChange={v => onChange(p => ({ ...p, background: v }))} textarea placeholder="Xuất thân từ gia đình quý tộc sa sút, từ nhỏ phải tự lập..." rows={2} />
        <Field label="Bối cảnh quan trọng" value={data.backgroundSetting} onChange={v => onChange(p => ({ ...p, backgroundSetting: v }))} textarea placeholder="Bối cảnh lore quan trọng riêng của nhân vật..." rows={2} />
        <Field label="Mục tiêu dài hạn" value={data.longTermGoal} onChange={v => onChange(p => ({ ...p, longTermGoal: v }))} textarea placeholder="Trở thành hiệp sĩ mạnh nhất, tìm lại gia tộc..." rows={2} />
        <Field label="Động lực" value={data.motivation} onChange={v => onChange(p => ({ ...p, motivation: v }))} textarea placeholder="Lời hứa với cha, bảo vệ người thân..." rows={2} />
        <Field label="Năng lực / Kỹ năng" value={data.abilities} onChange={v => onChange(p => ({ ...p, abilities: v }))} textarea placeholder="Kiếm thuật cơ bản, am hiểu y học cổ truyền..." rows={2} />
        <Field label="Mối quan hệ (với MC)" value={data.relationships} onChange={v => onChange(p => ({ ...p, relationships: v }))} textarea placeholder="Là bạn thân/đối thủ/... của nhân vật chính" rows={2} />
        <Field label="Thái độ với nhân vật chính" value={data.attitudeToProtagonist} onChange={v => onChange(p => ({ ...p, attitudeToProtagonist: v }))} placeholder="Thân thiện, nghi ngờ, ngưỡng mộ..." />
        <Field label="Quan hệ quan trọng (giữa nhân vật)" value={data.importantRelationships} onChange={v => onChange(p => ({ ...p, importantRelationships: v }))} textarea placeholder="【Minh】bạn thân, 【Hải】kẻ thù, 【Lão Trần】sư phụ" rows={2} />

        {/* ═══ SECTION 2: Dynamic State (Trạng thái tức thì) ═══ */}
        <SectionHeader icon="🟡" title="Trạng thái tức thì (Dynamic)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <Field label="Vị trí hiện tại" value={data.currentLocation} onChange={v => onChange(p => ({ ...p, currentLocation: v }))} placeholder="Phòng khách, cổng thành..." />
            <Field label="Tư thế" value={data.currentPosture} onChange={v => onChange(p => ({ ...p, currentPosture: v }))} placeholder="Đứng, ngồi, nằm..." />
        </div>
        <Field label="Trang phục hiện tại" value={data.currentClothing} onChange={v => onChange(p => ({ ...p, currentClothing: v }))} placeholder="Áo giáp sắt, áo choàng đen..." />
        <Field label="Trạng thái cơ thể" value={data.currentBodyState} onChange={v => onChange(p => ({ ...p, currentBodyState: v }))} placeholder="Mồ hôi, vết thương vai trái, mệt mỏi..." />
        <Field label="Mục tiêu tức thì" value={data.currentGoal} onChange={v => onChange(p => ({ ...p, currentGoal: v }))} placeholder="Tìm chìa khóa, trốn khỏi ngục..." />
        <Field label="Trạng thái tổng quát (Cập nhật tự động)" value={data.currentState} onChange={v => onChange(p => ({ ...p, currentState: v }))} placeholder="Bình thường, bị thương nhẹ..." />
        <Field label="Trạng thái đặc biệt" value={data.specialStatus} onChange={v => onChange(p => ({ ...p, specialStatus: v }))} placeholder="Buff/debuff: trúng độc, tàng hình, tăng sức..." />

        {/* ═══ SECTION 2.5: Lịch sử hành động ═══ */}
        <SectionHeader icon="📜" title="Lịch sử hành động" />
        <Field label="Sự kiện quan trọng đã tham gia" value={data.actionHistory} onChange={v => onChange(p => ({ ...p, actionHistory: v }))} textarea placeholder="VD: Tham gia trận chiến Goblin Ch.3, phát hiện hang động bí mật Ch.5..." rows={3} />

        {/* ═══ SECTION 3: Lorebook Meta ═══ */}
        <LorebookFields data={data} onChange={onChange} />
        <Field label="Mô tả tổng quản hệ thống" value={data.description} onChange={v => onChange(p => ({ ...p, description: v }))} textarea placeholder="Mô tả chi tiết về nhân vật..." rows={3} />
        <Field label="Ghi chú" value={data.notes} onChange={v => onChange(p => ({ ...p, notes: v }))} textarea placeholder="Ghi chú riêng cho tác giả..." rows={2} />
    </>
);

export default function CharacterTab({ onNavigate }) {
    const { currentStory, addCharacter, updateCharacter, deleteCharacter } = useStory();
    const { getNextKey, selectedModel } = useApiKey();
    const { getDirective } = useDirectives();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [newChar, setNewChar] = useState({ ...emptyChar });
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState('');
    const [expandedCards, setExpandedCards] = useState({});

    const characters = currentStory?.database?.characters || [];

    const handleAdd = () => {
        if (newChar.name.trim()) {
            addCharacter(newChar);
            setNewChar({ ...emptyChar });
            setShowAdd(false);
        }
    };

    const handleEdit = (c) => {
        setEditingId(c.id);
        const d = {};
        for (const key of Object.keys(emptyChar)) {
            d[key] = c[key] || '';
        }
        setEditData(d);
    };

    const handleSave = (id) => { updateCharacter(id, editData); setEditingId(null); };

    const handleAISuggest = async () => {
        setAiLoading(true);
        try {
            const result = await AIService.suggestCharacter(getNextKey(), currentStory, { directive: getDirective('suggestCharacter'), model: selectedModel });
            setAiResult(result);
        } catch (e) { alert('Lỗi: ' + e.message); }
        finally { setAiLoading(false); }
    };

    const toggleCardExpand = (id) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (!currentStory) return <div className="database-container"><p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Vui lòng chọn hoặc tạo truyện trước.</p></div>;

    // Fields have been moved outside the component body

    // Helper to count filled fields
    const filledFieldCount = (c) => {
        const allFields = Object.keys(emptyChar).filter(k => k !== 'name');
        return allFields.filter(f => c[f] && String(c[f]).trim()).length;
    };

    return (
        <motion.div className="database-container" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Users size={22} className="text-primary" /> Nhân vật
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({characters.length})</span>
                </h2>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-small" onClick={async () => {
                        try {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.json,.png';
                            input.onchange = async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const ext = file.name.toLowerCase().split('.').pop();
                                if (ext === 'png') {
                                    const result = await importCharacterCard(file);
                                    if (result.characters.length > 0) {
                                        result.characters.forEach(c => addCharacter(c));
                                        alert(`✅ Đã nhập ${result.characters.length} nhân vật từ Thẻ nhân vật!${result.lorebook.length > 0 ? `\n📚 Kèm ${result.lorebook.length} entry World Info (xem trong Ghi chú).` : ''}`);
                                    }
                                } else {
                                    const items = await triggerImport();
                                    if (items.length > 0) {
                                        items.forEach(item => addCharacter(item));
                                        alert(`✅ Đã nhập ${items.length} nhân vật!`);
                                    }
                                }
                            };
                            input.click();
                        } catch (err) { alert('❌ ' + err.message); }
                    }} title="Nhập nhân vật từ JSON hoặc ảnh PNG (Thẻ nhân vật)">
                        <Upload size={16} /> Nhập
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={() => {
                        exportItemsToJSON(characters, `${currentStory.title}_characters.json`);
                    }} disabled={characters.length === 0} title="Xuất tất cả nhân vật">
                        <Download size={16} /> Xuất
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={handleAISuggest} disabled={aiLoading}>
                        {aiLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                        Gợi ý AI
                    </button>
                    <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm</button>
                </div>
            </div>

            {/* AI Result */}
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

            {/* Add Form */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{
                            padding: 'var(--space-lg)',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: 'var(--radius-lg)',
                            maxHeight: '70vh',
                            overflowY: 'auto'
                        }}>
                            <CharacterForm data={newChar} onChange={setNewChar} isNew />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewChar({ ...emptyChar }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newChar.name.trim()}><Plus size={14} /> Thêm nhân vật</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Character Cards */}
            {characters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                    <Users size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có nhân vật nào.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {characters.map((c, i) => (
                        <motion.div key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="character-card">
                            {editingId === c.id ? (
                                <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                    <CharacterForm data={editData} onChange={setEditData} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSave(c.id)}><Save size={14} /> Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header" onClick={() => toggleCardExpand(c.id)} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 'var(--font-size-lg)', flexShrink: 0 }}>
                                                {c.name?.charAt(0)?.toUpperCase()}
                                            </span>
                                            <div>
                                                <span className="card-title">{c.name}</span>
                                                {c.role && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 500 }}>{c.role}</div>}
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); toggleCardExpand(c.id); }} title={expandedCards[c.id] ? "Thu gọn" : "Xem chi tiết"}>
                                                {expandedCards[c.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); exportSingleItemToJSON(c, `${c.name}.json`); }} title="Xuất nhân vật"><Download size={14} /></button>
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); exportSingleItemToJSON(convertCharacterToCard(c), `${c.name}_card.json`); }} title="Xuất Thẻ nhân vật" style={{ color: 'hsl(270, 70%, 60%)' }}>📇</button>
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEdit(c); }} title="Chỉnh sửa"><Edit3 size={16} /></button>
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); if (window.confirm('Xóa nhân vật này?')) deleteCharacter(c.id); }} style={{ color: 'var(--color-error)' }} title="Xóa"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    {/* Extra info - hide initially */}
                                    <AnimatePresence>
                                        {expandedCards[c.id] && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                {/* Quick info row */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'var(--space-sm)' }}>
                                                    {c.gender && <span style={tagStyle}>{c.gender}</span>}
                                                    {c.age && <span style={tagStyle}>{c.age} tuổi</span>}
                                                    {c.weakness && <span style={{ ...tagStyle, background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>⚡ {c.weakness}</span>}
                                                </div>

                                                <div className="card-content" style={{ marginTop: 'var(--space-sm)' }}>
                                                    {c.appearance && <DetailRow label="Ngoại hình" value={c.appearance} />}
                                                    {c.personality && <DetailRow label="Tính cách" value={c.personality} />}
                                                    {c.description && <DetailRow label="Mô tả" value={c.description} />}
                                                    {c.bodyFeatures && <DetailRow label="🧬 Đặc điểm" value={c.bodyFeatures} />}
                                                    {c.background && <DetailRow label="📖 Lý lịch" value={c.background} />}
                                                    {c.longTermGoal && <DetailRow label="🎯 Mục tiêu DH" value={c.longTermGoal} />}
                                                    {c.motivation && <DetailRow label="💪 Động lực" value={c.motivation} />}
                                                    {c.abilities && <DetailRow label="⚔️ Năng lực" value={c.abilities} />}
                                                    {c.relationships && <DetailRow label="🤝 Quan hệ" value={c.relationships} />}
                                                    {c.importantRelationships && <DetailRow label="🔗 QH quan trọng" value={c.importantRelationships} />}
                                                    {c.attitudeToProtagonist && <DetailRow label="💭 Thái độ MC" value={c.attitudeToProtagonist} />}
                                                    {c.currentLocation && <DetailRow label="📍 Vị trí" value={c.currentLocation} />}
                                                    {c.currentClothing && <DetailRow label="👔 Trang phục" value={c.currentClothing} />}
                                                    {c.currentGoal && <DetailRow label="🎯 MT tức thì" value={c.currentGoal} />}
                                                    {c.currentState && <DetailRow label="🟢 Trạng thái" value={c.currentState} />}
                                                    {c.specialStatus && <DetailRow label="⚡ Đặc biệt" value={c.specialStatus} />}
                                                    {c.keywords && <DetailRow label="🔑 Từ khóa" value={c.keywords} />}
                                                    {c.notes && <DetailRow label="📝 Ghi chú" value={c.notes} />}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Appears in chapters */}
                                    {(() => {
                                        const chapters = currentStory?.database?.chapters || [];
                                        const appearances = chapters.filter(ch =>
                                            ch.content && c.name && ch.content.toLowerCase().includes(c.name.toLowerCase())
                                        );
                                        return appearances.length > 0 ? (
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '4px',
                                                marginTop: 'var(--space-sm)',
                                                paddingTop: 'var(--space-sm)',
                                                borderTop: '1px solid var(--glass-border)'
                                            }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginRight: '2px' }}>📖 Xuất hiện:</span>
                                                {appearances.map(ch => (
                                                    <span
                                                        key={ch.id}
                                                        onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('chapter-detail', ch.id); }}
                                                        style={{
                                                            fontSize: '0.65rem',
                                                            padding: '1px 6px',
                                                            borderRadius: '8px',
                                                            background: 'rgba(139, 92, 246, 0.12)',
                                                            color: 'var(--color-primary)',
                                                            cursor: 'pointer',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        Ch.{ch.order}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null;
                                    })()}
                                </>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

// Reusable detail row component
function DetailRow({ label, value }) {
    return (
        <div style={{ marginBottom: '6px' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{label}: </span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{value}</span>
        </div>
    );
}

// Tag style for quick info badges
const tagStyle = {
    fontSize: '0.65rem',
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'rgba(139, 92, 246, 0.1)',
    color: 'var(--color-primary)',
    fontWeight: 500,
};
