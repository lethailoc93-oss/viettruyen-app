import React, { useState } from 'react';
import {
    Layout, Book, FileText, Users, MapPin, Link2,
    Clapperboard, Plus, Sparkles, Loader2,
    Edit3, Save, X, ChevronDown, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIService } from '../../../services/aiService';

/**
 * Right sidebar panel for ChapterDetail with 4 tabs:
 * - Dàn ý (outlines: overall, chapter, scenes)
 * - Chương (chapter info)
 * - Tham chiếu (characters + settings)
 * - Nguồn (source citations)
 */
export default React.memo(function ChapterSidebarPanel({
    chapter,
    chapterId,
    currentStory,
    activeTab,
    setActiveTab,
    chapterSources,
    setChapterSources,
    // Outline sections
    outlineSections,
    toggleOutlineSection,
    isEditingOutline,
    outlineText,
    outlineSaved,
    setIsEditingOutline,
    setOutlineText,
    setOutlineSaved,
    updateChapterOutline,
    // Scene
    chapterScenes,
    onGenerateSceneAI,
    onAddScene,
    sceneLoading,
    // AI generation
    isKeySet,
    getNextKey,
    selectedModel,
    content,
    // Navigation
    onNavigate,
}) {
    const [outlineLoading, setOutlineLoading] = useState(false);

    const handleGenerateChapterOutline = async () => {
        setOutlineLoading(true);
        try {
            const result = await AIService.generateSingleChapterOutline(
                getNextKey(),
                {
                    id: chapterId,
                    title: chapter.title,
                    order: chapter.order,
                    summary: chapter.summary || '',
                    content: content
                },
                currentStory,
                { model: selectedModel }
            );
            setOutlineText(result);
            updateChapterOutline(chapterId, result);
            setOutlineSaved(true);
            setIsEditingOutline(false);
        } catch (err) {
            alert('Lỗi tạo dàn ý: ' + err.message);
        } finally {
            setOutlineLoading(false);
        }
    };

    return (
        <>
            {/* Sidebar Tabs — 4 tabs */}
            <div className="sidebar-tabs-container">
                <button
                    className={`sidebar-tab ${activeTab === 'outlines' ? 'active' : ''}`}
                    onClick={() => setActiveTab('outlines')}
                    title="Dàn ý"
                >
                    <Layout size={16} />
                    <span className="sidebar-tab-label">Dàn ý</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'chapter' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chapter')}
                    title="Thông tin chương"
                >
                    <Book size={16} />
                    <span className="sidebar-tab-label">Chương</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'reference' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reference')}
                    title="Nhân vật & Bối cảnh"
                >
                    <Users size={16} />
                    <span className="sidebar-tab-label">Tham chiếu</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'sources' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sources')}
                    title="Nguồn trích dẫn"
                    style={{ position: 'relative' }}
                >
                    <Link2 size={16} />
                    <span className="sidebar-tab-label">Nguồn</span>
                    {chapterSources.length > 0 && (
                        <span className="sidebar-tab-badge">
                            {chapterSources.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Sidebar Content */}
            <div className="sidebar-panel-content">
                {/* === TAB: DÀN Ý (gom 3 mục) === */}
                {activeTab === 'outlines' && (
                    <div className="sidebar-content">
                        {/* Sub-section 1: Dàn ý tổng */}
                        <div className="outline-sub-section">
                            <button
                                className="outline-sub-header"
                                onClick={() => toggleOutlineSection('overall')}
                            >
                                <div className="outline-header-flex">
                                    <Layout size={14} className="outline-icon-overall" />
                                    <span>Dàn ý tổng</span>
                                </div>
                                {outlineSections.overall ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <AnimatePresence>
                                {outlineSections.overall && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div className="sidebar-content-block">
                                            {currentStory?.outlines?.overall || 'Chưa có dàn ý tổng'}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sub-section 2: Dàn ý chương */}
                        <div className="outline-sub-section">
                            <div
                                className="outline-sub-header"
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleOutlineSection('chapterOutline')}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleOutlineSection('chapterOutline'); }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="outline-header-flex">
                                    <FileText size={14} className="outline-icon-chapter" />
                                    <span>Dàn ý chương</span>
                                </div>
                                <div className="outline-actions-flex">
                                    {!isEditingOutline ? (
                                        <button
                                            className="btn-icon-small"
                                            onClick={(e) => { e.stopPropagation(); setIsEditingOutline(true); setOutlineText(chapter.outline || ''); }}
                                            title="Chỉnh sửa"
                                        >
                                            <Edit3 size={12} />
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                className="btn-icon-small outline-btn-cancel"
                                                onClick={(e) => { e.stopPropagation(); setIsEditingOutline(false); setOutlineText(chapter.outline || ''); }}
                                                title="Hủy"
                                            >
                                                <X size={12} />
                                            </button>
                                            <button
                                                className="btn-icon-small outline-btn-save"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateChapterOutline(chapterId, outlineText);
                                                    setOutlineSaved(true);
                                                    setIsEditingOutline(false);
                                                }}
                                                title="Lưu dàn ý"
                                            >
                                                <Save size={12} />
                                            </button>
                                        </>
                                    )}
                                    {outlineSections.chapterOutline ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                            </div>
                            <AnimatePresence>
                                {outlineSections.chapterOutline && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        {/* AI Generate button */}
                                        <button
                                            className="btn btn-secondary btn-small outline-ai-btn"
                                            disabled={outlineLoading || !isKeySet}
                                            onClick={handleGenerateChapterOutline}
                                        >
                                            {outlineLoading ? (
                                                <><Loader2 size={13} className="spin" /> Đang tạo...</>
                                            ) : (
                                                <><Sparkles size={13} /> Tạo dàn ý AI</>
                                            )}
                                        </button>

                                        {isEditingOutline ? (
                                            <textarea
                                                value={outlineText}
                                                onChange={(e) => { setOutlineText(e.target.value); setOutlineSaved(false); }}
                                                placeholder="Nhập dàn ý cho chương này..."
                                                className="sidebar-outline-textarea"
                                            />
                                        ) : (
                                            <div
                                                className="sidebar-outline-display"
                                                onClick={() => { setIsEditingOutline(true); setOutlineText(chapter.outline || ''); }}
                                            >
                                                {chapter.outline || 'Chưa có dàn ý. Nhấn để thêm hoặc dùng AI.'}
                                            </div>
                                        )}

                                        {!outlineSaved && !isEditingOutline && (
                                            <div className="outline-unsaved-text">
                                                Chưa lưu
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sub-section 3: Dàn ý phân cảnh chương hiện tại */}
                        <div className="outline-sub-section">
                            <div
                                className="outline-sub-header"
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleOutlineSection('sceneOutline')}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleOutlineSection('sceneOutline'); }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="outline-header-flex">
                                    <Clapperboard size={14} className="outline-icon-scene" />
                                    <span>Dàn ý phân cảnh chương hiện tại</span>
                                </div>
                                <div className="outline-actions-flex">
                                    <button
                                        className="btn-icon-small"
                                        onClick={(e) => { e.stopPropagation(); onGenerateSceneAI(); }}
                                        title="Tạo dàn ý phân cảnh bằng AI"
                                        disabled={sceneLoading}
                                        style={sceneLoading ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    >
                                        {sceneLoading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                                    </button>
                                    <button className="btn-icon-small" onClick={(e) => { e.stopPropagation(); onAddScene(); }} title="Thêm cảnh">
                                        <Plus size={12} />
                                    </button>
                                    {outlineSections.sceneOutline ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                            </div>
                            <AnimatePresence>
                                {outlineSections.sceneOutline && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        {chapterScenes.length === 0 ? (
                                            <div className="sidebar-empty-text">
                                                Chưa có cảnh nào
                                            </div>
                                        ) : (
                                            <div className="scene-list-container">
                                                {chapterScenes.map(scene => (
                                                    <div key={scene.id} className="scene-item-card">
                                                        <div className="scene-item-title">{scene.name}</div>
                                                        <div className="scene-item-desc">{scene.description || 'Chưa có mô tả'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* === TAB: THÔNG TIN CHƯƠNG === */}
                {activeTab === 'chapter' && (
                    <div className="sidebar-content">
                        <h3 className="sidebar-section-title">Thông tin chương</h3>
                        <div className="form-group">
                            <label className="form-label">Tóm tắt chương</label>
                            <div className="sidebar-summary-box">
                                {chapter.summary || 'Chưa có tóm tắt'}
                            </div>
                        </div>
                        {/* Keywords display */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🏷️ Từ khóa chương
                            </label>
                            {chapter.keywords?.length > 0 ? (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                }}>
                                    {chapter.keywords.map((kw, idx) => (
                                        <span key={idx} style={{
                                            display: 'inline-block',
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            fontSize: 'var(--font-size-xs)',
                                            background: 'hsla(220, 80%, 60%, 0.15)',
                                            color: 'hsl(220, 80%, 70%)',
                                            border: '1px solid hsla(220, 80%, 60%, 0.25)'
                                        }}>
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="sidebar-empty-text">
                                    Chưa có từ khóa. Viết chương và quét dữ liệu để tạo tự động.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* === TAB: THAM CHIẾU === */}
                {activeTab === 'reference' && (
                    <div className="sidebar-content">
                        <h3 className="sidebar-section-title sidebar-section-title-icon">
                            <Users size={14} /> Nhân vật
                        </h3>
                        {(currentStory?.database?.characters || []).length === 0 ? (
                            <div className="sidebar-empty-text">
                                Chưa có nhân vật nào
                            </div>
                        ) : (
                            <div className="sidebar-ref-list">
                                {(currentStory?.database?.characters || []).map(c => (
                                    <div key={c.id}
                                        className="sidebar-ref-item sidebar-ref-character"
                                        onClick={() => onNavigate && onNavigate('characters')}
                                    >
                                        <div className="sidebar-ref-title">{c.name}</div>
                                        {c.role && <div className="sidebar-ref-subtitle">{c.role}</div>}
                                        {c.description && <div className="sidebar-ref-desc">{c.description.substring(0, 60)}{c.description.length > 60 ? '...' : ''}</div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        <h3 className="sidebar-section-title sidebar-section-title-icon">
                            <MapPin size={14} /> Bối cảnh
                        </h3>
                        {(currentStory?.database?.settings || []).length === 0 ? (
                            <div className="sidebar-empty-text">
                                Chưa có bối cảnh nào
                            </div>
                        ) : (
                            <div className="sidebar-ref-list" style={{ marginBottom: 0 }}>
                                {(currentStory?.database?.settings || []).map(s => (
                                    <div key={s.id}
                                        className="sidebar-ref-item sidebar-ref-setting"
                                        onClick={() => onNavigate && onNavigate('settings')}
                                    >
                                        <div className="sidebar-ref-title">{s.name}</div>
                                        {s.description && <div className="sidebar-ref-desc">{s.description.substring(0, 60)}{s.description.length > 60 ? '...' : ''}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* === TAB: NGUỒN TRÍCH DẪN === */}
                {activeTab === 'sources' && (
                    <div className="sidebar-content">
                        <h3 className="sidebar-source-title-icon">
                            <Link2 size={14} className="sidebar-source-icon" /> Nguồn trích dẫn
                        </h3>
                        {chapterSources.length === 0 ? (
                            <div className="sidebar-source-empty">
                                <Link2 size={32} className="sidebar-source-empty-icon" />
                                <div>Chưa có nguồn trích dẫn</div>
                                <div className="sidebar-source-empty-sub">
                                    Khi AI viết chương, các câu trích dẫn nguồn sẽ tự động xuất hiện tại đây.
                                </div>
                            </div>
                        ) : (
                            <div className="sidebar-source-list">
                                {chapterSources.map((src, idx) => (
                                    <div key={idx} className="sidebar-source-item">
                                        {src}
                                    </div>
                                ))}
                                <button
                                    className="btn btn-secondary btn-small sidebar-source-clear-btn"
                                    onClick={() => setChapterSources([])}
                                >
                                    <X size={12} /> Xóa tất cả
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
});
