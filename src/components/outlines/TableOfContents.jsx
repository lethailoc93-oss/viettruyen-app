import React, { useState } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import { Book, Plus, Trash2, Edit3, Save, X, ChevronRight, PenTool, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


export default React.memo(function TableOfContents({ onSelectChapter, onNavigate }) {
    const { currentStory } = useStoryState();
    const { chapterOps } = useStoryDispatch();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newChapter, setNewChapter] = useState({ title: '', summary: '' });
    const [deleteConfirm, setDeleteConfirm] = useState(null); // chapter to confirm delete

    const chapters = currentStory?.database?.chapters || [];

    const handleAdd = () => {
        if (newChapter.title.trim()) {
            chapterOps.add({
                order: chapters.length + 1,
                title: newChapter.title.trim(),
                summary: newChapter.summary.trim(),
                content: '' // Initialize with empty content
            });
            setNewChapter({ title: '', summary: '' });
            setShowAddForm(false);
        }
    };

    const handleEdit = (chapter) => {
        setEditingId(chapter.id);
        setEditData({ title: chapter.title, summary: chapter.summary || '' });
    };

    const handleSaveEdit = (id) => {
        chapterOps.update(id, editData);
        setEditingId(null);
    };

    const handleDelete = (chapter) => {
        setDeleteConfirm(chapter);
    };

    const confirmDelete = () => {
        if (!deleteConfirm) return;
        chapterOps.delete(deleteConfirm.id);
        // Reorder remaining chapters
        const remaining = chapters
            .filter(c => c.id !== deleteConfirm.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        remaining.forEach((c, i) => {
            if (c.order !== i + 1) {
                chapterOps.update(c.id, { order: i + 1 });
            }
        });
        setDeleteConfirm(null);
    };

    if (!currentStory) return null;

    return (
        <motion.div
            className="database-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Book size={22} className="text-primary" />
                    Mục lục
                    <span style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 400
                    }}>
                        ({chapters.length} chương)
                    </span>
                </h2>
                <button className="btn btn-primary btn-small" onClick={() => setShowAddForm(true)}>
                    <Plus size={16} />
                    Thêm chương
                </button>
            </div>

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
                                <label className="form-label">Tiêu đề chương {chapters.length + 1}</label>
                                <input
                                    className="form-input"
                                    value={newChapter.title}
                                    onChange={(e) => setNewChapter(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Nhập tiêu đề chương..."
                                    autoFocus
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Tóm tắt</label>
                                <textarea
                                    className="form-textarea"
                                    value={newChapter.summary}
                                    onChange={(e) => setNewChapter(prev => ({ ...prev, summary: e.target.value }))}
                                    placeholder="Tóm tắt ngắn gọn..."
                                    rows={2}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => setShowAddForm(false)}>
                                    <X size={14} /> Hủy
                                </button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newChapter.title.trim()}>
                                    <Plus size={14} /> Thêm
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {chapters.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: 'var(--space-3xl)',
                    color: 'var(--color-text-tertiary)'
                }}>
                    <Book size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Chưa có chương nào. Hãy thêm chương mới.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {chapters.map((chapter, index) => (
                        <motion.div
                            key={chapter.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="character-card"
                            style={{
                                cursor: editingId === chapter.id ? 'default' : 'pointer',
                                border: '1px solid var(--glass-border)'
                            }}
                            onClick={() => !editingId && onSelectChapter(chapter.id)}
                        >
                            {editingId === chapter.id ? (
                                <div onClick={e => e.stopPropagation()}>
                                    <div className="form-group">
                                        <input
                                            className="form-input"
                                            value={editData.title}
                                            onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <textarea
                                            className="form-textarea"
                                            value={editData.summary}
                                            onChange={(e) => setEditData(prev => ({ ...prev, summary: e.target.value }))}
                                            rows={2}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                        <button className="btn btn-primary btn-small" onClick={() => handleSaveEdit(chapter.id)}>
                                            <Save size={14} /> Lưu
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                    <div style={{
                                        minWidth: '40px',
                                        height: '40px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--gradient-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 'var(--font-size-base)',
                                        fontWeight: 700,
                                        color: 'white',
                                        flexShrink: 0
                                    }}>
                                        {chapter.order || index + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', marginBottom: '4px' }}>
                                            {chapter.title}
                                        </div>
                                        {chapter.summary && (
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                                {chapter.summary}
                                            </div>
                                        )}
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-tertiary)',
                                            marginTop: 'var(--space-xs)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-xs)'
                                        }}>
                                            <PenTool size={12} />
                                            {chapter.content ? `${chapter.content.length.toLocaleString()} ký tự` : 'Chưa có nội dung'}
                                        </div>
                                        {/* Scene count badge */}
                                        {(() => {
                                            const sceneCount = (currentStory?.database?.scenes || []).filter(s => s.chapterId === chapter.id).length;
                                            return sceneCount > 0 ? (
                                                <div style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-xs)',
                                                    marginTop: '2px'
                                                }}>
                                                    🎬 {sceneCount} cảnh
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEdit(chapter); }} title="Sửa tên">
                                            <Edit3 size={18} />
                                        </button>
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(chapter); }} title="Xóa" style={{ color: 'var(--color-error)' }}>
                                            <Trash2 size={18} />
                                        </button>
                                        <ChevronRight size={24} style={{ opacity: 0.5, marginLeft: 'var(--space-sm)' }} />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            backdropFilter: 'blur(4px)',
                        }}
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'var(--color-bg-secondary, #1e1e2e)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-xl)',
                                maxWidth: '420px',
                                width: '90%',
                                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                                <AlertTriangle size={24} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
                                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Xóa chương?</h3>
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6, margin: '0 0 var(--space-sm)' }}>
                                Bạn có chắc muốn xóa <strong style={{ color: 'var(--color-text-primary)' }}>Chương {deleteConfirm.order}: {deleteConfirm.title}</strong>?
                            </p>
                            {deleteConfirm.content && (
                                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', margin: '0 0 var(--space-md)' }}>
                                    ⚠️ Chương này có {deleteConfirm.content.length.toLocaleString()} ký tự nội dung sẽ bị mất vĩnh viễn.
                                </p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => setDeleteConfirm(null)}>
                                    <X size={14} /> Hủy
                                </button>
                                <button
                                    className="btn btn-small"
                                    onClick={confirmDelete}
                                    style={{
                                        background: 'var(--color-error)',
                                        color: 'white',
                                        border: 'none',
                                    }}
                                >
                                    <Trash2 size={14} /> Xóa chương
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
});
