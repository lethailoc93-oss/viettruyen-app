import React, { useState, useEffect, useRef } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { AIService } from '../../services/aiService';
import { useDirectives } from '../../context/DirectiveContext';
import { showToast } from '../modals/Toast';
import InputDialog from '../modals/InputDialog';
import useSmartEditor from '../../hooks/useSmartEditor';
import useChapterAI from '../../hooks/useChapterAI';
import {
    Sparkles, Loader2, X,
    RefreshCw, Expand, Shrink, Lightbulb, Image as ImageIcon, Download, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AIImageGuideModal from '../modals/AIImageGuideModal';
import PromptPreviewModal from '../modals/PromptPreviewModal';
import MVUReviewPanel from '../modals/MVUReviewPanel';
import QuickActions from '../editor/QuickActions';
import BranchManager from '../editor/BranchManager';
import ChekhovTracker from '../editor/ChekhovTracker';

// Sub-components
import ChapterToolbar from './chapter/ChapterToolbar';
import ChapterSidebarPanel from './chapter/ChapterSidebarPanel';
import AIDirectivePanel from './chapter/AIDirectivePanel';
import AIResponseToast from './chapter/AIResponseToast';
import DeleteChapterDialog from './chapter/DeleteChapterDialog';

export default React.memo(function ChapterDetail({ chapterId, onBack, onNavigate }) {
    const { currentStory } = useStoryState();
    const {
        updateChapterContent,
        updateChapterOutline,
        chapterOps,
        sceneOps,
        addCharacter,
        updateCharacter,
        settingOps,
        timelineOps,
        abilityOps,
        itemOps,
        organizationOps,
        updateCurrentInfo,
        setEditingItemId,
        setEditingItemType,
        plotProgressOps,
        branchOps,
        updateStoryField
    } = useStoryDispatch();
    const { getNextKey, isKeySet, selectedModel } = useApiKey();
    const { getDirective } = useDirectives();

    // Find current chapter
    const chapter = currentStory?.database?.chapters?.find(c => c.id === chapterId);

    const [content, setContent] = useState('');
    const [activeTab, setActiveTab] = useState('outlines');
    const [activeToolTab, setActiveToolTab] = useState('directive');
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 768);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // Sources
    const [chapterSources, setChapterSources] = useState([]);

    // Outline sub-sections expand/collapse
    const [outlineSections, setOutlineSections] = useState({
        overall: true,
        chapterOutline: true,
        sceneOutline: true
    });
    const [sceneLoading, setSceneLoading] = useState(false);

    // Input dialog states
    const [showAddSceneDialog, setShowAddSceneDialog] = useState(false);
    const [showNewChapterDialog, setShowNewChapterDialog] = useState(false);

    // Guide modal state for Smart Editor
    const [showSmartGuide, setShowSmartGuide] = useState(false);

    // Chapter outline state
    const [isEditingOutline, setIsEditingOutline] = useState(false);
    const [outlineText, setOutlineText] = useState('');
    const [outlineSaved, setOutlineSaved] = useState(true);

    const editorRef = useRef(null);

    // ═══ Extract source citations from AI text ═══
    const extractSources = (text) => {
        if (!text) return { cleanContent: text, sources: [] };
        const sources = [];
        let cleanContent = text;

        const footnoteBlockRegex = /\n?── CHÚ THÍCH NGUỒN ──[\s\S]*$/;
        const footnoteMatch = cleanContent.match(footnoteBlockRegex);
        if (footnoteMatch) {
            const blockText = footnoteMatch[0];
            const sourceLineRegex = /\[Nguồn \d+\]\s*[^\n]+/g;
            let m;
            while ((m = sourceLineRegex.exec(blockText)) !== null) {
                sources.push(m[0].trim());
            }
            cleanContent = cleanContent.replace(footnoteBlockRegex, '').trimEnd();
        }

        const refBlockRegex = /\n?\[NGUỒN THAM KHẢO\][\s\S]*$/;
        const refMatch = cleanContent.match(refBlockRegex);
        if (refMatch) {
            const blockText = refMatch[0];
            const sourceLineRegex = /\[Nguồn \d+\]\s*[^\n]+/g;
            let m;
            while ((m = sourceLineRegex.exec(blockText)) !== null) {
                sources.push(m[0].trim());
            }
            if (sources.length === 0) {
                blockText.split('\n').filter(l => l.trim() && !l.includes('[NGUỒN THAM KHẢO]')).forEach(l => sources.push(l.trim()));
            }
            cleanContent = cleanContent.replace(refBlockRegex, '').trimEnd();
        }

        const inlineRegex = /\s*\[Nguồn \d+\]/g;
        cleanContent = cleanContent.replace(inlineRegex, '');

        return { cleanContent, sources };
    };

    // ═══ Custom hooks ═══
    const smartEditor = useSmartEditor({
        getNextKey, isKeySet, selectedModel, chapter, currentStory,
        content, setContent, setIsSaved, editorRef, showToast
    });
    const {
        smartToolbar, smartSelection, smartAction, smartResult, smartLoading,
        rewriteInstruction, showRewriteInput, smartSuggestions, smartImage, smartImagePrompt,
        setSmartAction, setShowRewriteInput, setRewriteInstruction, setSmartResult, setSmartSuggestions,
        handleTextSelect, handleSmartAction, handleSmartReplace, closeSmartToolbar, handleSuggestionReplace,
    } = smartEditor;

    const chapterAI = useChapterAI({
        getNextKey, isKeySet, selectedModel, chapter, chapterId, currentStory,
        content, setContent, setIsSaved, showToast,
        getDirective, chapterOps, addCharacter, updateCharacter, settingOps, timelineOps,
        abilityOps, itemOps, organizationOps, updateCurrentInfo,
        extractSources, setChapterSources, setActiveTab,
        plotProgressOps,
    });
    const {
        aiLoading, aiResponse, setAiResponse,
        showPromptPreview, setShowPromptPreview,
        promptPreviewData, promptSending,
        hotDirective, setHotDirective,
        isWritingChapter, writeChapterStatus,
        isDrawing, drawStatus, drawImage, setDrawImage, drawImagePrompt,
        pendingScan, applyScanResult, clearPendingScan,
        handleAIAction, handlePromptConfirm, handleWriteFromDirective, handleDrawFromDirective,
    } = chapterAI;

    const handleDownloadImage = async () => {
        if (!smartImage) return;
        try {
            if (smartImage.startsWith('blob:')) {
                // Blob URL: trigger real download
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = smartImage;
                a.download = `ai-image-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                // Direct URL: open in new tab to let user save
                window.open(smartImage, '_blank', 'noopener,noreferrer');
            }
        } catch (e) {
            showToast('Không thể tải ảnh. Vui lòng mở ảnh trong thẻ mới để tải.', 'error');
        }
    };

    const toggleOutlineSection = (key) => {
        setOutlineSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // ═══ Scene handlers ═══
    const handleAddScene = () => setShowAddSceneDialog(true);

    const handleAddSceneConfirm = (name) => {
        const allScenes = currentStory?.database?.scenes || [];
        sceneOps.add({
            order: allScenes.length + 1,
            name: name,
            description: '',
            characters: '',
            setting: '',
            chapterId: chapterId
        });
        setShowAddSceneDialog(false);
    };

    const handleGenerateSceneAI = async () => {
        if (!isKeySet) {
            showToast('Vui lòng nhập API key để dùng tính năng này', 'warning');
            return;
        }
        setSceneLoading(true);
        try {
            const result = await AIService.generateSceneOutline(
                getNextKey(),
                chapter.title,
                chapter.summary || '',
                currentStory,
                { directive: getDirective('generateSceneOutline'), model: selectedModel }
            );
            let scenes = [];
            try {
                const jsonMatch = result.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) scenes = JSON.parse(jsonMatch[0]);
            } catch (e) {
                const lines = result.split('\n').filter(l => l.trim().startsWith('Cảnh'));
                scenes = lines.map((line, i) => {
                    const parts = line.replace(/^Cảnh \d+:\s*/, '').split(' - ');
                    return {
                        name: parts[0]?.trim() || `Cảnh ${i + 1}`,
                        description: parts.slice(1).join(' - ').trim() || ''
                    };
                });
            }
            const allScenes = currentStory?.database?.scenes || [];
            scenes.forEach((scene, i) => {
                sceneOps.add({
                    order: allScenes.length + i + 1,
                    name: scene.name || `Cảnh ${i + 1}`,
                    description: scene.description || '',
                    characters: scene.characters || '',
                    setting: scene.setting || '',
                    chapterId: chapterId
                });
            });
        } catch (err) {
            showToast('Có lỗi khi tạo dàn ý phân cảnh: ' + err.message, 'error');
        } finally {
            setSceneLoading(false);
        }
    };

    // ═══ Chapter CRUD ═══
    const handleCreateNewChapter = () => setShowNewChapterDialog(true);

    const handleCreateNewChapterConfirm = (title) => {
        const chapters = currentStory?.database?.chapters || [];
        const newCh = chapterOps.add({
            title: title || `Chương ${chapters.length + 1}`,
            content: '',
            outline: ''
        });
        setShowNewChapterDialog(false);
        if (newCh && onNavigate) onNavigate('chapter-detail', newCh.id);
    };

    const handleDeleteChapter = () => {
        chapterOps.delete(chapterId);
        setDeleteConfirm(false);
        onBack();
    };

    // ═══ Load content on mount or chapter change ═══
    useEffect(() => {
        if (chapter) {
            setContent(chapter.content || '');
            setIsSaved(true);
            setOutlineText(chapter.outline || '');
            setOutlineSaved(true);
            setIsEditingOutline(false);
        }
        if (chapterId) {
            setEditingItemId(chapterId);
            setEditingItemType('chapter');
        }
        return () => {
            setEditingItemId(null);
            setEditingItemType(null);
        };
    }, [chapterId, setEditingItemId, setEditingItemType]);

    // ═══ Save & Auto-save ═══
    const handleSave = () => {
        setIsSaving(true);
        updateChapterContent(chapterId, content);
        setTimeout(() => {
            setIsSaving(false);
            setIsSaved(true);
        }, 500);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isSaved && chapter && content !== chapter.content) {
                handleSave();
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [content, isSaved]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [content]);

    const handleContentChange = (e) => {
        setContent(e.target.value);
        setIsSaved(false);
    };

    // ═══ Render ═══
    if (!chapter) return <div>Không tìm thấy chương</div>;

    const chapterScenes = currentStory?.database?.scenes?.filter(s => s.chapterId === chapterId) || [];
    const chapters = currentStory?.database?.chapters || [];

    return (
        <motion.div
            className="chapter-detail-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Main Editor Area */}
            <div className="chapter-detail-editor">
                {/* Toolbar */}
                <ChapterToolbar
                    chapter={chapter}
                    content={content}
                    isSaving={isSaving}
                    isSaved={isSaved}
                    aiLoading={aiLoading}
                    isSidebarOpen={isSidebarOpen}
                    onBack={onBack}
                    onSave={handleSave}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    onContinueWrite={() => handleAIAction('continue')}
                    onCreateNewChapter={handleCreateNewChapter}
                    onDeleteRequest={() => setDeleteConfirm(true)}
                />

                {/* Editor Content + Smart Toolbar wrapper */}
                <div className="editor-content-wrapper">
                    <textarea
                        ref={editorRef}
                        className="story-editor-textarea chapter-detail-textarea"
                        value={content}
                        onChange={handleContentChange}
                        onSelect={handleTextSelect}
                        onMouseUp={handleTextSelect}
                        onKeyUp={(e) => { if (e.shiftKey) handleTextSelect(); }}
                        placeholder="Bắt đầu viết nội dung chương tại đây..."
                    />

                    {/* ======= SMART EDITOR FLOATING TOOLBAR ======= */}
                    <AnimatePresence>
                        {smartToolbar.show && (
                            <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.92 }}
                                transition={{ duration: 0.15 }}
                                className="smart-toolbar"
                                style={{ top: smartToolbar.y, left: smartToolbar.x }}
                                onMouseDown={e => e.preventDefault()}
                            >
                                <button className="smart-toolbar-close" onClick={closeSmartToolbar} style={{ right: '28px' }}>
                                    <X size={12} />
                                </button>
                                <button className="smart-toolbar-close" onClick={() => setShowSmartGuide(true)} title="Hướng dẫn tạo ảnh AI">
                                    <Info size={12} />
                                </button>

                                <div className="smart-toolbar-actions">
                                    <button
                                        className={`smart-toolbar-btn ${smartAction === 'rewrite' ? 'active' : ''}`}
                                        onClick={() => {
                                            if (showRewriteInput && smartAction === 'rewrite') {
                                                handleSmartAction('rewrite');
                                            } else {
                                                setSmartAction('rewrite');
                                                setShowRewriteInput(true);
                                                setSmartResult('');
                                            }
                                        }}
                                        disabled={smartLoading}
                                        title="Viết lại theo phong cách khác"
                                    >
                                        <RefreshCw size={14} />
                                        <span>Viết lại</span>
                                    </button>
                                    <button
                                        className={`smart-toolbar-btn ${smartAction === 'expand' ? 'active' : ''}`}
                                        onClick={() => handleSmartAction('expand')}
                                        disabled={smartLoading}
                                        title="Mở rộng thêm chi tiết"
                                    >
                                        <Expand size={14} />
                                        <span>Mở rộng</span>
                                    </button>
                                    <button
                                        className={`smart-toolbar-btn ${smartAction === 'condense' ? 'active' : ''}`}
                                        onClick={() => handleSmartAction('condense')}
                                        disabled={smartLoading}
                                        title="Rút gọn súc tích hơn"
                                    >
                                        <Shrink size={14} />
                                        <span>Tóm tắt</span>
                                    </button>
                                    <button
                                        className={`smart-toolbar-btn suggest-btn ${smartAction === 'suggest' ? 'active' : ''}`}
                                        onClick={() => handleSmartAction('suggest')}
                                        disabled={smartLoading}
                                        title="Gợi ý 3 cách diễn đạt khác (Wordtune)"
                                    >
                                        <Lightbulb size={14} />
                                        <span>Gợi ý</span>
                                    </button>
                                    <button
                                        className={`smart-toolbar-btn suggest-btn ${smartAction === 'image' ? 'active' : ''}`}
                                        onClick={() => handleSmartAction('image')}
                                        disabled={smartLoading}
                                        title="Tạo ảnh minh họa từ đoạn văn"
                                    >
                                        <ImageIcon size={14} />
                                        <span>Tạo ảnh</span>
                                    </button>
                                </div>

                                {/* Rewrite instruction input */}
                                <AnimatePresence>
                                    {showRewriteInput && smartAction === 'rewrite' && !smartResult && !smartLoading && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="smart-rewrite-input-wrap"
                                        >
                                            <input
                                                type="text"
                                                className="smart-rewrite-input"
                                                placeholder="VD: giọng u tối hơn, nhẹ nhàng hơn..."
                                                value={rewriteInstruction}
                                                onChange={e => setRewriteInstruction(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSmartAction('rewrite'); }}
                                                autoFocus
                                            />
                                            <button
                                                className="btn btn-primary btn-small smart-rewrite-submit-btn"
                                                onClick={() => handleSmartAction('rewrite')}
                                            >
                                                <Sparkles size={12} /> Gửi
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Loading indicator */}
                                {smartLoading && (
                                    <div className="smart-loading">
                                        <Loader2 size={16} className="spin" />
                                        <span>AI đang {smartAction === 'rewrite' ? 'viết lại' : smartAction === 'expand' ? 'mở rộng' : smartAction === 'suggest' ? 'gợi ý' : smartAction === 'image' ? 'tạo ảnh' : 'tóm tắt'}...</span>
                                    </div>
                                )}

                                {/* Image Result Panel */}
                                {smartImage && !smartLoading && (
                                    <div className="smart-image-panel" style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ImageIcon size={14} className="text-primary" /> Ảnh được tạo từ AI
                                            </span>
                                            <button className="btn btn-secondary btn-small" onClick={handleDownloadImage} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                                                <Download size={14} /> Tải xuống
                                            </button>
                                        </div>
                                        <div style={{ width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center', minHeight: '200px', alignItems: 'center' }}>
                                            <img
                                                src={smartImage}
                                                alt="AI Generated"
                                                style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    const wrapper = e.target.parentNode;
                                                    wrapper.innerHTML = '<div style="padding: 20px; color: var(--color-text-secondary); text-align: center;">❌ Không thể tải ảnh. Nhấn <b>Tạo ảnh</b> để thử lại.</div>';
                                                }}
                                            />
                                        </div>
                                        {smartImagePrompt && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                                <strong>Prompt:</strong> {smartImagePrompt}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Wordtune suggestion panel */}
                                {smartSuggestions.length > 0 && !smartLoading && (
                                    <div className="smart-suggestion-panel">
                                        <div className="smart-result-header">
                                            <span>💡 Gợi ý diễn đạt</span>
                                            <span className="smart-result-stats">{smartSuggestions.length} phiên bản</span>
                                        </div>
                                        <div className="smart-suggestion-list">
                                            {smartSuggestions.map((variant, idx) => {
                                                const labels = ['🌊 Tự nhiên', '🎨 Giàu hình ảnh', '⚡ Súc tích'];
                                                return (
                                                    <div key={idx} className="smart-suggestion-item">
                                                        <div className="smart-suggestion-label">{labels[idx] || `Phiên bản ${idx + 1}`}</div>
                                                        <div className="smart-suggestion-text">{variant}</div>
                                                        <div className="smart-suggestion-actions">
                                                            <button className="btn btn-primary btn-small smart-action-btn" onClick={() => handleSuggestionReplace(variant)}>✅ Thay thế</button>
                                                            <button className="btn btn-secondary btn-small smart-action-btn" onClick={() => navigator.clipboard.writeText(variant)}>📋 Sao chép</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="smart-result-actions" style={{ marginTop: '6px' }}>
                                            <button className="btn btn-secondary btn-small smart-retry-btn" onClick={() => { setSmartSuggestions([]); handleSmartAction('suggest'); }}>🔄 Thử lại</button>
                                        </div>
                                    </div>
                                )}

                                {/* Result panel */}
                                {smartResult && !smartLoading && (
                                    <div className="smart-result-panel">
                                        <div className="smart-result-header">
                                            <span>{smartAction === 'rewrite' ? '✏️ Viết lại' : smartAction === 'expand' ? '📝 Mở rộng' : '📋 Tóm tắt'}</span>
                                            <span className="smart-result-stats">{smartSelection.text.length} → {smartResult.length} ký tự</span>
                                        </div>
                                        <div className="smart-result-content">{smartResult}</div>
                                        <div className="smart-result-actions">
                                            {!smartResult.startsWith('❌') && (
                                                <button className="btn btn-primary btn-small smart-retry-btn" onClick={handleSmartReplace}>✅ Thay thế</button>
                                            )}
                                            <button className="btn btn-secondary btn-small smart-retry-btn" onClick={() => navigator.clipboard.writeText(smartResult)}>📋 Sao chép</button>
                                            <button className="btn btn-secondary btn-small smart-retry-btn" onClick={() => { setSmartResult(''); setSmartAction(''); }}>Thử lại</button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <AIImageGuideModal isOpen={showSmartGuide} onClose={() => setShowSmartGuide(false)} />
                </div>

                {/* Quick Action Buttons + Token Counter */}
                <QuickActions
                    content={content}
                    story={currentStory}
                    loading={aiLoading || isWritingChapter}
                    onQuickAction={(prompt, label) => {
                        setHotDirective(prompt);
                        showToast(`⚡ ${label}: Đã thiết lập chỉ đạo AI. Nhấn "Viết" để thực hiện.`, 'info');
                    }}
                    onUpdateMacros={(macros) => updateStoryField('customMacros', macros)}
                />

                {/* Editor Tools Tabs */}
                <div className="editor-tools-container">
                    <div className="editor-tools-tabs">
                        <button
                            className={`tool-tab-btn ${activeToolTab === 'directive' ? 'active' : ''}`}
                            onClick={() => setActiveToolTab('directive')}
                            title="Bảng điều khiển AI"
                        >
                            ⚡ Chỉ đạo AI
                        </button>
                        <button
                            className={`tool-tab-btn ${activeToolTab === 'branches' ? 'active' : ''}`}
                            onClick={() => setActiveToolTab('branches')}
                            title="Quản lý các nhánh cốt truyện khác nhau"
                        >
                            🔀 Nhánh truyện
                            {currentStory?.database?.branches?.filter(b => b.parentChapterId === chapterId).length > 0 &&
                                <span className="tab-badge">{currentStory.database.branches.filter(b => b.parentChapterId === chapterId).length}</span>}
                        </button>
                        <button
                            className={`tool-tab-btn ${activeToolTab === 'chekhov' ? 'active' : ''}`}
                            onClick={() => setActiveToolTab('chekhov')}
                            title="Quản lý các yếu tố bị rơi rụng trong truyện"
                        >
                            🔫 Chekhov's Gun
                        </button>
                    </div>

                    <div className="editor-tools-content">
                        {activeToolTab === 'directive' && (
                            <AIDirectivePanel
                                hotDirective={hotDirective}
                                setHotDirective={setHotDirective}
                                onWriteFromDirective={handleWriteFromDirective}
                                onDrawFromDirective={handleDrawFromDirective}
                                isWritingChapter={isWritingChapter}
                                writeChapterStatus={writeChapterStatus}
                                isDrawing={isDrawing}
                                drawStatus={drawStatus}
                                drawImage={drawImage}
                                setDrawImage={setDrawImage}
                                drawImagePrompt={drawImagePrompt}
                                isKeySet={isKeySet}
                            />
                        )}

                        {activeToolTab === 'branches' && (
                            <BranchManager
                                chapterId={chapterId}
                                currentContent={content}
                                branches={currentStory?.database?.branches || []}
                                branchOps={branchOps}
                                onLoadBranch={(branchContent, branchName) => {
                                    setContent(branchContent);
                                    setIsSaved(false);
                                    showToast(`Đã tải nhánh "${branchName}" vào editor`, 'info');
                                }}
                            />
                        )}

                        {activeToolTab === 'chekhov' && (
                            <ChekhovTracker
                                story={currentStory}
                                chapterId={chapterId}
                                onUseElement={(suggestion) => {
                                    const typeLabel = suggestion.type === 'item' ? 'vật phẩm' : suggestion.type === 'character' ? 'nhân vật' : suggestion.type === 'quest' ? 'nhiệm vụ' : 'manh mối';
                                    const prompt = `Hãy viết một cảnh tự nhiên đưa yếu tố "${suggestion.name}" (${typeLabel}) vào nội dung hiện tại. ${suggestion.detail ? `Thông tin: ${suggestion.detail}` : ''} Viết khoảng 200-300 từ.`;
                                    setHotDirective(prompt);
                                    setActiveToolTab('directive'); // Auto-switch to directive tab so user can click Write
                                    showToast(`🔫 Đã tạo prompt cho "${suggestion.name}". Nhấn "Viết" để AI thực hiện.`, 'info');
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* MVU Review Panel — appears after post-write scan */}
                {pendingScan && (
                    <MVUReviewPanel
                        scanResult={pendingScan}
                        onApply={applyScanResult}
                        onDismiss={clearPendingScan}
                        chapterOrder={chapter.order}
                    />
                )}
            </div>

            {/* Right Sidebar */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        className="chapter-detail-sidebar"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '280px', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                    >
                        <ChapterSidebarPanel
                            chapter={chapter}
                            chapterId={chapterId}
                            currentStory={currentStory}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            chapterSources={chapterSources}
                            setChapterSources={setChapterSources}
                            outlineSections={outlineSections}
                            toggleOutlineSection={toggleOutlineSection}
                            isEditingOutline={isEditingOutline}
                            outlineText={outlineText}
                            outlineSaved={outlineSaved}
                            setIsEditingOutline={setIsEditingOutline}
                            setOutlineText={setOutlineText}
                            setOutlineSaved={setOutlineSaved}
                            updateChapterOutline={updateChapterOutline}
                            chapterScenes={chapterScenes}
                            onGenerateSceneAI={handleGenerateSceneAI}
                            onAddScene={handleAddScene}
                            sceneLoading={sceneLoading}
                            isKeySet={isKeySet}
                            getNextKey={getNextKey}
                            selectedModel={selectedModel}
                            content={content}
                            onNavigate={onNavigate}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Response Toast */}
            <AIResponseToast
                aiResponse={aiResponse}
                onClose={() => setAiResponse('')}
                onApply={() => {
                    const newContent = content ? (content + '\n\n' + aiResponse) : aiResponse;
                    setContent(newContent);
                    setIsSaved(false);
                    setAiResponse('');
                }}
                onCopy={() => navigator.clipboard.writeText(aiResponse)}
            />



            <PromptPreviewModal
                isOpen={showPromptPreview}
                onClose={() => setShowPromptPreview(false)}
                onConfirm={handlePromptConfirm}
                systemInstruction={promptPreviewData.systemInstruction}
                userPrompt={promptPreviewData.userPrompt}
                title={promptPreviewData.title}
                isLoading={promptSending}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteChapterDialog
                isOpen={deleteConfirm}
                chapter={chapter}
                contentLength={content ? content.length : 0}
                onConfirm={handleDeleteChapter}
                onCancel={() => setDeleteConfirm(false)}
            />

            {/* Input Dialogs */}
            {showAddSceneDialog && (
                <InputDialog
                    title="Tên cảnh mới"
                    placeholder="Nhập tên cảnh..."
                    onConfirm={handleAddSceneConfirm}
                    onCancel={() => setShowAddSceneDialog(false)}
                />
            )}
            {showNewChapterDialog && (
                <InputDialog
                    title={`Tiêu đề chương ${chapters.length + 1}`}
                    placeholder="Nhập tiêu đề chương..."
                    onConfirm={handleCreateNewChapterConfirm}
                    onCancel={() => setShowNewChapterDialog(false)}
                />
            )}
        </motion.div>
    );
});
