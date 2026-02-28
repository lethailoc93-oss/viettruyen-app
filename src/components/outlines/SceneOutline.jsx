import React, { useState } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { useDirectives } from '../../context/DirectiveContext';
import { AIService } from '../../services/aiService';
import { Clapperboard, Plus, Trash2, Edit3, Save, X, Sparkles, Loader2, Users, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default React.memo(function SceneOutline({ onNavigate, style = {} }) {
    const { currentStory } = useStoryState();
    const { sceneOps } = useStoryDispatch();
    const { getNextKey, selectedModel } = useApiKey();
    const { getDirective } = useDirectives();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newScene, setNewScene] = useState({ name: '', description: '', characters: '', setting: '', chapterId: '' });
    const [loading, setLoading] = useState(false);

    const scenes = currentStory?.database?.scenes || [];
    const chapters = currentStory?.database?.chapters || [];

    const handleAdd = () => {
        if (newScene.name.trim()) {
            sceneOps.add({
                order: scenes.length + 1,
                name: newScene.name.trim(),
                description: newScene.description.trim(),
                characters: newScene.characters.trim(),
                setting: newScene.setting.trim(),
                chapterId: newScene.chapterId
            });
            setNewScene({ name: '', description: '', characters: '', setting: '', chapterId: '' });
            setShowAddForm(false);
        }
    };

    const handleEdit = (scene) => {
        setEditingId(scene.id);
        setEditData({
            name: scene.name || '',
            description: scene.description || '',
            characters: scene.characters || '',
            setting: scene.setting || '',
            chapterId: scene.chapterId || ''
        });
    };

    const handleSaveEdit = (id) => {
        sceneOps.update(id, editData);
        setEditingId(null);
    };

    const handleGenerateAI = async () => {
        setLoading(true);
        try {
            const result = await AIService.generateSceneOutline(getNextKey(), null, null, currentStory, { directive: getDirective('generateSceneOutline'), model: selectedModel });
            const lines = result.split('\n').filter(l => l.trim().startsWith('Cảnh'));
            lines.forEach((line, i) => {
                const parts = line.replace(/^Cảnh \d+:\s*/, '').split(' - ');
                sceneOps.add({
                    order: scenes.length + i + 1,
                    name: parts[0]?.trim() || `Cảnh ${scenes.length + i + 1}`,
                    description: parts[1]?.trim() || '',
                    characters: '',
                    setting: ''
                });
            });
        } catch (err) {
            alert('Có lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!currentStory) {
        return (
            <div className="database-container" style={style}>
                <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                    Vui lòng chọn hoặc tạo truyện trước.
                </p>
            </div>
        );
    }

    return (
        <motion.div
            className="database-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={style}
        >
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Clapperboard size={22} className="text-primary" />
                    Dàn ý phân cảnh
                    <span style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 400
                    }}>
                        ({scenes.length} cảnh)
                    </span>
                </h2>
                <div className="flex gap-sm">
                    <button
                        className="btn btn-secondary btn-small"
                        onClick={handleGenerateAI}
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                        {loading ? 'Đang tạo...' : 'Tạo bằng AI'}
                    </button>
                    <button className="btn btn-primary btn-small" onClick={() => setShowAddForm(true)}>
                        <Plus size={16} />
                        Thêm cảnh
                    </button>
                </div>
            </div>

            {/* Add form */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}
                    >
                        <div style={{
                            padding: 'var(--space-lg)',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <div className="form-group">
                                <label className="form-label">Tên cảnh</label>
                                <input
                                    className="form-input"
                                    value={newScene.name}
                                    onChange={(e) => setNewScene(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Nhập tên cảnh..."
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả</label>
                                <textarea
                                    className="form-textarea"
                                    value={newScene.description}
                                    onChange={(e) => setNewScene(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Mô tả cảnh..."
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Thuộc Chương</label>
                                <select
                                    className="form-input"
                                    value={newScene.chapterId}
                                    onChange={(e) => setNewScene(prev => ({ ...prev, chapterId: e.target.value }))}
                                >
                                    <option value="">-- Không thuộc chương nào --</option>
                                    {chapters.map(c => (
                                        <option key={c.id} value={c.id}>
                                            Chương {c.order}: {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Nhân vật tham gia</label>
                                    <input
                                        className="form-input"
                                        value={newScene.characters}
                                        onChange={(e) => setNewScene(prev => ({ ...prev, characters: e.target.value }))}
                                        placeholder="VD: An, Bình, Cường..."
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Bối cảnh</label>
                                    <input
                                        className="form-input"
                                        value={newScene.setting}
                                        onChange={(e) => setNewScene(prev => ({ ...prev, setting: e.target.value }))}
                                        placeholder="VD: Phòng khách, ban đêm..."
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAddForm(false); setNewScene({ name: '', description: '', characters: '', setting: '' }); }}>
                                    <X size={14} /> Hủy
                                </button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newScene.name.trim()}>
                                    <Plus size={14} /> Thêm
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scenes list */}
            {scenes.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: 'var(--space-3xl)',
                    color: 'var(--color-text-tertiary)'
                }}>
                    <Clapperboard size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có cảnh nào. Thêm cảnh mới hoặc tạo bằng AI.</p>
                </div>
            ) : (
                <div className="character-grid">
                    {scenes.map((scene, index) => (
                        <motion.div
                            key={scene.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="character-card"
                        >
                            {editingId === scene.id ? (
                                <div>
                                    <div className="form-group">
                                        <label className="form-label">Tên cảnh</label>
                                        <input className="form-input" value={editData.name}
                                            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Mô tả</label>
                                        <textarea className="form-textarea" value={editData.description}
                                            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Thuộc Chương</label>
                                        <select
                                            className="form-input"
                                            value={editData.chapterId || ''}
                                            onChange={(e) => setEditData(prev => ({ ...prev, chapterId: e.target.value }))}
                                        >
                                            <option value="">-- Không thuộc chương nào --</option>
                                            {chapters.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    Chương {c.order}: {c.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nhân vật</label>
                                        <input className="form-input" value={editData.characters}
                                            onChange={(e) => setEditData(prev => ({ ...prev, characters: e.target.value }))} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Bối cảnh</label>
                                        <input className="form-input" value={editData.setting}
                                            onChange={(e) => setEditData(prev => ({ ...prev, setting: e.target.value }))} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSaveEdit(scene.id)}>
                                            <Save size={14} /> Lưu
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span style={{
                                                minWidth: '28px',
                                                height: '28px',
                                                borderRadius: 'var(--radius-sm)',
                                                background: 'var(--gradient-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 700,
                                                color: 'white'
                                            }}>
                                                {scene.order || index + 1}
                                            </span>
                                            <span className="card-title">{scene.name}</span>
                                        </div>
                                        <div className="card-actions">
                                            <button className="btn-icon" onClick={() => handleEdit(scene)} title="Sửa">
                                                <Edit3 size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => sceneOps.delete(scene.id)} title="Xóa"
                                                style={{ color: 'var(--color-error)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        {scene.description && (
                                            <div className="card-field">
                                                <div className="field-value">{scene.description}</div>
                                            </div>
                                        )}
                                        {scene.characters && (
                                            <div className="card-field" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                                <Users size={12} className="text-muted" />
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{scene.characters}</span>
                                            </div>
                                        )}
                                        {scene.setting && (
                                            <div className="card-field" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                                <MapPin size={12} className="text-muted" />
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{scene.setting}</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Chapter link badge */}
                                    {(() => {
                                        const chapters = currentStory?.database?.chapters || [];
                                        const linkedChapter = scene.chapterId ? chapters.find(c => c.id === scene.chapterId) : null;
                                        return (
                                            <div style={{ marginTop: 'var(--space-xs)' }}>
                                                {linkedChapter ? (
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('chapter-detail', linkedChapter.id); }}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '0.7rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '10px',
                                                            background: 'rgba(139, 92, 246, 0.12)',
                                                            color: 'var(--color-primary)',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                            transition: 'background 0.2s'
                                                        }}
                                                    >
                                                        📖 Chương {linkedChapter.order}: {linkedChapter.title}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Chưa gán chương</span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
});
