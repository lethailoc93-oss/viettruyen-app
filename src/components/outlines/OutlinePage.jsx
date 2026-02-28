import { useState, useEffect } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { useDirectives } from '../../context/DirectiveContext';
import { AIService } from '../../services/aiService';
import {
    Layout, Book, Sparkles, Save, Check, Loader2, AlertCircle,
    Plus, Trash2, Edit3, X, PenTool, Copy, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SceneOutline from './SceneOutline';

export default function OutlinePage({ onNavigate }) {
    const {
        currentStory, updateOverallOutline, chapterOps,
        updateStoryContent, addCharacter, settingOps, timelineOps,
        abilityOps, itemOps, organizationOps, updateCurrentInfo
    } = useStory();
    const { getNextKey, isKeySet, selectedModel } = useApiKey();
    const { getDirective } = useDirectives();

    // ─── Overall Outline State ───
    const [outline, setOutline] = useState('');
    const [outlineLoading, setOutlineLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved');

    // ─── Chapter Outline State ───
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newChapter, setNewChapter] = useState({ title: '', summary: '' });
    const [chapterLoading, setChapterLoading] = useState(false);
    const [writingId, setWritingId] = useState(null);
    const [writingStatus, setWritingStatus] = useState('');
    const [writtenContent, setWrittenContent] = useState({});
    const [expandedContent, setExpandedContent] = useState(null);
    const [copied, setCopied] = useState(null);

    const chapters = currentStory?.database?.chapters || [];

    // Sync overall outline from story
    useEffect(() => {
        setOutline(currentStory?.outlines?.overall || '');
    }, [currentStory]);

    // ─── Overall Outline Handlers ───
    const handleSaveOutline = () => {
        updateOverallOutline(outline);
        setSaveStatus('saving');
        setTimeout(() => setSaveStatus('saved'), 800);
    };

    const handleGenerateOutline = async () => {
        if (!currentStory) return;
        setOutlineLoading(true);
        try {
            const result = await AIService.generateOutline(getNextKey(), currentStory, {
                directive: getDirective('generateOutline'), model: selectedModel
            });
            setOutline(result);
            updateOverallOutline(result);
        } catch (err) {
            alert('Có lỗi khi tạo dàn ý: ' + err.message);
        } finally {
            setOutlineLoading(false);
        }
    };

    // ─── Chapter Outline Handlers ───
    const handleAddChapter = () => {
        if (newChapter.title.trim()) {
            chapterOps.add({
                order: chapters.length + 1,
                title: newChapter.title.trim(),
                summary: newChapter.summary.trim()
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

    const handleGenerateChapters = async () => {
        setChapterLoading(true);
        try {
            const result = await AIService.generateChapterOutline(
                getNextKey(), currentStory,
                { directive: getDirective('generateChapterOutline'), model: selectedModel }
            );
            const lines = result.split('\n').filter(l => l.trim().startsWith('Chương'));
            lines.forEach((line, i) => {
                const parts = line.replace(/^Chương \d+:\s*/, '').split(' - ');
                chapterOps.add({
                    order: chapters.length + i + 1,
                    title: parts[0]?.trim() || `Chương ${chapters.length + i + 1}`,
                    summary: parts[1]?.trim() || ''
                });
            });
        } catch (err) {
            alert('Có lỗi: ' + err.message);
        } finally {
            setChapterLoading(false);
        }
    };

    const handleWriteChapter = async (chapter) => {
        setWritingId(chapter.id);
        setWritingStatus('🔍 Đang tìm kiếm thông tin...');
        try {
            const apiKey = getNextKey();
            const result = await AIService.writeChapter(apiKey, chapter, currentStory, {
                directive: getDirective('writeChapter'),
                model: selectedModel,
                useWebSearch: true,
                onProgress: (step, message) => setWritingStatus(message)
            });
            const chapterText = result?.text || result || '';
            setWrittenContent(prev => ({ ...prev, [chapter.id]: chapterText }));
            setExpandedContent(chapter.id);
            chapterOps.update(chapter.id, { content: chapterText });

            // Post-write scan
            setWritingStatus('🔍 Bước 3/3: Đang quét dữ liệu...');
            try {
                const scanResult = await AIService.postWriteScan(apiKey, chapterText, chapter, currentStory, {
                    model: selectedModel,
                    onProgress: (step, message) => setWritingStatus(message)
                });
                if (scanResult.summary || scanResult.recap || scanResult.keywords?.length) {
                    const updates = {};
                    if (scanResult.summary) updates.summary = scanResult.summary;
                    if (scanResult.recap) updates.recap = scanResult.recap;
                    if (scanResult.keywords?.length) updates.keywords = scanResult.keywords;
                    chapterOps.update(chapter.id, updates);
                }
                scanResult.characters?.forEach(char => addCharacter({ name: char.name, role: char.role || '', description: char.description || '', personality: char.personality || '' }));
                scanResult.settings?.forEach(s => settingOps.add({ name: s.name, description: s.description || '' }));
                scanResult.timeline?.forEach(event => timelineOps.add({ name: event.title || event.name || 'Sự kiện', title: event.title || event.name || 'Sự kiện', description: event.description || '', chapter: chapter.order }));
                scanResult.abilities?.forEach(a => abilityOps.add({ name: a.name, owner: a.owner || '', effect: a.effect || '', limitation: a.limitation || '' }));
                scanResult.items?.forEach(i => itemOps.add({ name: i.name, owner: i.owner || '', effect: i.effect || '' }));
                scanResult.organizations?.forEach(o => organizationOps.add({ name: o.name, purpose: o.purpose || '' }));
                if (scanResult.currentState) {
                    updateCurrentInfo(scanResult.currentState.time || '', scanResult.currentState.location || '');
                }
                const parts = [];
                if (scanResult.summary) parts.push('tóm tắt');
                if (scanResult.characters?.length) parts.push(`${scanResult.characters.length} nhân vật`);
                if (scanResult.settings?.length) parts.push(`${scanResult.settings.length} bối cảnh`);
                if (scanResult.abilities?.length) parts.push(`${scanResult.abilities.length} năng lực`);
                if (scanResult.items?.length) parts.push(`${scanResult.items.length} vật phẩm`);
                if (scanResult.organizations?.length) parts.push(`${scanResult.organizations.length} tổ chức`);
                if (scanResult.timeline?.length) parts.push(`${scanResult.timeline.length} sự kiện`);
                setWritingStatus(`✅ Hoàn thành! ${parts.length > 0 ? `Đã thêm: ${parts.join(', ')}` : ''}`);
            } catch (scanErr) {
                console.warn('Post-write scan failed:', scanErr);
                setWritingStatus('✅ Hoàn thành! (quét dữ liệu thất bại)');
            }
        } catch (err) {
            alert('Có lỗi khi viết chương: ' + err.message);
        } finally {
            setTimeout(() => { setWritingId(null); setWritingStatus(''); }, 3000);
        }
    };

    const handleCopyContent = (chapterId) => {
        const content = writtenContent[chapterId];
        if (content) {
            navigator.clipboard.writeText(content);
            setCopied(chapterId);
            setTimeout(() => setCopied(null), 2000);
        }
    };

    const handleAppendToStory = (chapterId) => {
        const content = writtenContent[chapterId];
        if (content && currentStory) {
            const newContent = (currentStory.content || '') + '\n\n' + content;
            updateStoryContent(newContent);
            alert('Đã thêm nội dung chương vào truyện!');
        }
    };

    if (!currentStory) {
        return (
            <div className="database-container">
                <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                    Vui lòng chọn hoặc tạo truyện trước.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', padding: 'var(--space-lg)', overflowY: 'auto', height: '100%' }}>

            {/* ═══════════════════════════════ */}
            {/* PHẦN 1: DÀN Ý TỔNG            */}
            {/* ═══════════════════════════════ */}
            <motion.div
                className="database-container"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ flex: 'none' }}
            >
                <div className="database-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Layout size={22} className="text-primary" />
                        Dàn ý tổng
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                            — Kế hoạch cho toàn bộ câu chuyện
                        </span>
                    </h2>
                    <div className="flex gap-sm">
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={handleGenerateOutline}
                            disabled={outlineLoading}
                            title={!isKeySet ? 'Sẽ dùng dữ liệu mẫu (chưa có API key)' : 'Tạo bằng AI'}
                        >
                            {outlineLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                            {outlineLoading ? 'Đang tạo...' : 'Tạo bằng AI'}
                        </button>
                        <button className="btn btn-primary btn-small" onClick={handleSaveOutline}>
                            {saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />}
                            {saveStatus === 'saved' ? 'Đã lưu' : 'Lưu'}
                        </button>
                    </div>
                </div>

                {!isKeySet && (
                    <div style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid var(--color-warning)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                        fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <AlertCircle size={14} />
                        <span>Nhập API key ở header để sử dụng AI. Hiện đang dùng dữ liệu mẫu.</span>
                    </div>
                )}

                <div style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-md)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <textarea
                        className="editor-textarea"
                        value={outline}
                        onChange={(e) => { setOutline(e.target.value); setSaveStatus('unsaved'); }}
                        placeholder={"Nhập dàn ý tổng cho câu chuyện của bạn...\n\nHoặc bấm 'Tạo bằng AI' để AI gợi ý."}
                        style={{ minHeight: '250px', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-base)' }}
                    />
                </div>
            </motion.div>

            {/* ═══════════════════════════════ */}
            {/* PHẦN 2: DÀN Ý CHƯƠNG           */}
            {/* ═══════════════════════════════ */}
            <motion.div
                className="database-container"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                style={{ flex: 'none' }}
            >
                <div className="database-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Book size={22} className="text-primary" />
                        Dàn ý chương
                        <span style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-tertiary)',
                            fontWeight: 400
                        }}>
                            ({chapters.length} chương)
                        </span>
                    </h2>
                    <div className="flex gap-sm">
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={handleGenerateChapters}
                            disabled={chapterLoading}
                        >
                            {chapterLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                            {chapterLoading ? 'Đang tạo...' : 'Tạo dàn ý AI'}
                        </button>
                        <button className="btn btn-primary btn-small" onClick={() => setShowAddForm(true)}>
                            <Plus size={16} />
                            Thêm chương
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
                                        placeholder="Tóm tắt nội dung chương..."
                                        rows={3}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                    <button className="btn btn-secondary btn-small" onClick={() => { setShowAddForm(false); setNewChapter({ title: '', summary: '' }); }}>
                                        <X size={14} /> Hủy
                                    </button>
                                    <button className="btn btn-primary btn-small" onClick={handleAddChapter} disabled={!newChapter.title.trim()}>
                                        <Plus size={14} /> Thêm
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chapters list */}
                {chapters.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)' }}>
                        <Book size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                        <p>Chưa có chương nào. Thêm chương mới hoặc tạo bằng AI.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {chapters.map((chapter, index) => (
                            <motion.div
                                key={chapter.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                style={{
                                    background: 'var(--glass-bg)',
                                    border: `1px solid ${writtenContent[chapter.id] ? 'var(--color-success)' : 'var(--glass-border)'}`,
                                    borderRadius: 'var(--radius-lg)',
                                    overflow: 'hidden',
                                    transition: 'all var(--transition-base)'
                                }}
                            >
                                {/* Chapter header */}
                                <div style={{ padding: 'var(--space-lg)' }}>
                                    {editingId === chapter.id ? (
                                        <div>
                                            <div className="form-group">
                                                <input className="form-input" value={editData.title}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <textarea className="form-textarea" value={editData.summary}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, summary: e.target.value }))} rows={3} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                                <button className="btn-icon" onClick={() => setEditingId(null)} title="Hủy"><X size={16} /></button>
                                                <button className="btn btn-primary btn-small" onClick={() => handleSaveEdit(chapter.id)}>
                                                    <Save size={14} /> Lưu
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                                            <div style={{
                                                minWidth: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                                                background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 700,
                                                color: 'white', flexShrink: 0
                                            }}>
                                                {chapter.order || index + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-xs)' }}>
                                                    {chapter.title}
                                                </div>
                                                {chapter.summary && (
                                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                                                        {chapter.summary}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-primary btn-small"
                                                    onClick={() => handleWriteChapter(chapter)}
                                                    disabled={writingId === chapter.id}
                                                    style={{
                                                        background: writingId === chapter.id ? 'var(--color-text-tertiary)' : 'var(--gradient-secondary)',
                                                        fontSize: 'var(--font-size-xs)', padding: '4px 10px'
                                                    }}
                                                    title={!isKeySet ? 'Cần nhập API key để viết chương' : 'AI viết nội dung chương'}
                                                >
                                                    {writingId === chapter.id ? (
                                                        <><Loader2 size={14} className="spin" /> {writingStatus || 'Đang xử lý...'}</>
                                                    ) : (
                                                        <><PenTool size={14} /> Viết chương</>
                                                    )}
                                                </button>
                                                <button className="btn-icon" onClick={() => handleEdit(chapter)} title="Sửa"><Edit3 size={16} /></button>
                                                <button className="btn-icon" onClick={() => chapterOps.delete(chapter.id)} title="Xóa"
                                                    style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Written content area */}
                                <AnimatePresence>
                                    {writtenContent[chapter.id] && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: expandedContent === chapter.id ? 'auto' : 0, opacity: expandedContent === chapter.id ? 1 : 0 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{ borderTop: '1px solid var(--glass-border)', padding: 'var(--space-lg)', background: 'rgba(0,0,0,0.15)' }}>
                                                <div style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)',
                                                    borderBottom: '1px solid var(--glass-border)'
                                                }}>
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', fontWeight: 600 }}>
                                                        ✨ Nội dung AI đã tạo
                                                    </span>
                                                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                                        <button className="btn btn-secondary btn-small" onClick={() => handleCopyContent(chapter.id)}
                                                            style={{ fontSize: 'var(--font-size-xs)', padding: '3px 8px' }}>
                                                            {copied === chapter.id ? <><Check size={12} /> Đã copy</> : <><Copy size={12} /> Copy</>}
                                                        </button>
                                                        <button className="btn btn-primary btn-small" onClick={() => handleAppendToStory(chapter.id)}
                                                            style={{ fontSize: 'var(--font-size-xs)', padding: '3px 8px' }}>
                                                            <Plus size={12} /> Thêm vào truyện
                                                        </button>
                                                        <button className="btn btn-secondary btn-small" onClick={() => handleWriteChapter(chapter)}
                                                            disabled={writingId === chapter.id}
                                                            style={{ fontSize: 'var(--font-size-xs)', padding: '3px 8px' }}>
                                                            <Sparkles size={12} /> Viết lại
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    whiteSpace: 'pre-wrap', fontSize: 'var(--font-size-sm)', lineHeight: 1.8,
                                                    color: 'var(--color-text-secondary)', maxHeight: '500px', overflowY: 'auto',
                                                    fontFamily: 'var(--font-family-primary)'
                                                }}>
                                                    {writtenContent[chapter.id]}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Toggle button for written content */}
                                {writtenContent[chapter.id] && (
                                    <button
                                        onClick={() => setExpandedContent(expandedContent === chapter.id ? null : chapter.id)}
                                        style={{
                                            width: '100%', padding: '6px', background: 'rgba(139, 92, 246, 0.1)',
                                            border: 'none', borderTop: '1px solid var(--glass-border)',
                                            color: 'var(--color-primary)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            gap: 'var(--space-xs)', fontSize: 'var(--font-size-xs)',
                                            transition: 'all var(--transition-fast)'
                                        }}
                                    >
                                        {expandedContent === chapter.id
                                            ? <><ChevronUp size={14} /> Ẩn nội dung</>
                                            : <><ChevronDown size={14} /> Xem nội dung đã viết</>}
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ═══════════════════════════════ */}
            {/* PHẦN 3: DÀN Ý PHÂN CẢNH        */}
            {/* ═══════════════════════════════ */}
            <SceneOutline onNavigate={onNavigate} style={{ flex: 'none' }} />
        </div>
    );
}
