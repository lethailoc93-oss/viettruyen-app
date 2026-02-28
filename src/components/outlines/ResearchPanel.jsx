import React, { useState, useRef, useEffect } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { ResearchService } from '../../services/researchService';
import { IdbStorage } from '../../utils/idbStorage';
import {
    Search, BookOpen, PenTool, Loader2, CheckCircle, XCircle,
    AlertCircle, Trash2, RefreshCw, Zap, Users, Globe,
    Swords, MessageCircle, Info, Hash, ArrowRight, Brain,
    Eye, ChevronDown, ChevronUp, Shield, Target, Heart,
    AlertTriangle, MapPin, Compass, GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Quality score badge component
function QualityBadge({ score }) {
    if (score == null || score === undefined) return null;
    const color = score >= 70 ? 'var(--color-success, #22c55e)' :
        score >= 40 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';
    return (
        <span className="research-quality-badge" style={{ color, borderColor: color }}>
            {score}%
        </span>
    );
}

// Expandable section component
function ExpandableSection({ title, icon: Icon, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="research-expandable">
            <button className="research-expandable-header" onClick={() => setOpen(!open)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {Icon && <Icon size={14} />}
                    <span>{title}</span>
                </div>
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="research-expandable-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default React.memo(function ResearchPanel() {
    const { currentStory } = useStoryState();
    const dispatch = useStoryDispatch();
    const { getNextKey, isKeySet, selectedModel } = useApiKey();

    const [mode, setMode] = useState('fanfiction'); // 'fanfiction' | 'style' | 'characters' | 'self'
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [storyUrl, setStoryUrl] = useState('');
    const [styleUrl, setStyleUrl] = useState('');

    const abortControllerRef = useRef(null);

    // Chapter selection controls
    const [chapterCount, setChapterCount] = useState(50);
    const [chapterStart, setChapterStart] = useState(1);
    const [useCustomChapters, setUseCustomChapters] = useState(false);

    // Load saved data — all 4 types
    const [researchData, setResearchData] = useState(null);
    const [styleGuide, setStyleGuide] = useState(null);
    const [charResearch, setCharResearch] = useState(null);
    const [selfResearch, setSelfResearch] = useState(null);

    useEffect(() => {
        if (currentStory?.id) {
            const loadData = async () => {
                try {
                    const rd = await IdbStorage.getItem(`research_${currentStory.id}`);
                    const sg = await IdbStorage.getItem(`styleGuide_${currentStory.id}`);
                    const cr = await IdbStorage.getItem(`charResearch_${currentStory.id}`);
                    const sr = await IdbStorage.getItem(`selfResearch_${currentStory.id}`);
                    if (rd) setResearchData(rd);
                    if (sg) setStyleGuide(sg);
                    if (cr) setCharResearch(cr);
                    if (sr) setSelfResearch(sr);
                } catch (e) { /* ignore */ }
            };
            loadData();
        }
    }, [currentStory?.id]);

    const saveResearchData = async (data) => {
        setResearchData(data);
        if (currentStory?.id) {
            await IdbStorage.setItem(`research_${currentStory.id}`, data);
        }
    };

    const saveStyleGuide = async (data) => {
        setStyleGuide(data);
        if (currentStory?.id) {
            await IdbStorage.setItem(`styleGuide_${currentStory.id}`, data);
        }
    };

    const saveCharResearch = async (data) => {
        setCharResearch(data);
        if (currentStory?.id) {
            await IdbStorage.setItem(`charResearch_${currentStory.id}`, data);
        }
    };

    const saveSelfResearch = async (data) => {
        setSelfResearch(data);
        if (currentStory?.id) {
            await IdbStorage.setItem(`selfResearch_${currentStory.id}`, data);
        }
    };

    const handleResearch = async () => {
        if (!isKeySet) {
            setError('Vui lòng nhập API key trước!');
            return;
        }
        setLoading(true);
        setError('');
        setProgress('Bắt đầu...');

        // Initialize new AbortController
        abortControllerRef.current = new AbortController();

        try {
            if (mode === 'fanfiction') {
                const result = await ResearchService.researchOriginal(
                    getNextKey(), currentStory, {
                    model: selectedModel,
                    onProgress: setProgress,
                    chapterCount,
                    chapterStart: chapterStart - 1, // 0-indexed
                    useCustomChapters,
                    storyUrl: storyUrl.trim() ? storyUrl.trim() : undefined,
                    signal: abortControllerRef.current.signal
                }
                );
                await saveResearchData(result);
                setProgress('✅ Hoàn thành nghiên cứu truyện gốc!');
            } else if (mode === 'style') {
                const result = await ResearchService.researchStyle(
                    getNextKey(), currentStory, {
                    model: selectedModel,
                    onProgress: setProgress,
                    storyUrl: styleUrl.trim() ? styleUrl.trim() : undefined,
                    chapterCount,
                    chapterStart: chapterStart - 1,
                    useCustomChapters,
                    signal: abortControllerRef.current.signal
                }
                );
                await saveStyleGuide(result);
                setProgress('✅ Hoàn thành phân tích phong cách!');
            } else if (mode === 'characters') {
                const result = await ResearchService.researchCharacters(
                    getNextKey(), currentStory, {
                    model: selectedModel,
                    onProgress: setProgress,
                    signal: abortControllerRef.current.signal
                }
                );
                await saveCharResearch(result);
                setProgress('✅ Hoàn thành nghiên cứu nhân vật chuyên sâu!');
            } else if (mode === 'self') {
                const result = await ResearchService.selfResearch(
                    getNextKey(), currentStory, {
                    model: selectedModel,
                    onProgress: setProgress,
                    signal: abortControllerRef.current.signal
                }
                );
                await saveSelfResearch(result);
                setProgress('✅ Hoàn thành tự phân tích!');
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                setError('Đã dừng nghiên cứu.');
                setProgress('⏹️ Nghiên cứu bị huỷ.');
            } else {
                setError(err.message);
                setProgress('');
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setProgress('Đang dừng nghiên cứu...');
        }
    };

    const clearData = async (type) => {
        if (type === 'research') {
            setResearchData(null);
            if (currentStory?.id) await IdbStorage.removeItem(`research_${currentStory.id}`);
        } else if (type === 'style') {
            setStyleGuide(null);
            if (currentStory?.id) await IdbStorage.removeItem(`styleGuide_${currentStory.id}`);
        } else if (type === 'characters') {
            setCharResearch(null);
            if (currentStory?.id) await IdbStorage.removeItem(`charResearch_${currentStory.id}`);
        } else if (type === 'self') {
            setSelfResearch(null);
            if (currentStory?.id) await IdbStorage.removeItem(`selfResearch_${currentStory.id}`);
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

    // Button label per mode
    const modeButtonLabels = {
        fanfiction: 'Nghiên cứu truyện gốc',
        style: 'Phân tích phong cách',
        characters: 'Nghiên cứu nhân vật sâu',
        self: 'Tự phân tích truyện',
    };

    return (
        <motion.div
            className="database-container auto-workflow-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Search size={22} className="text-primary" />
                    Nghiên cứu tự động
                </h2>
            </div>

            {/* Description */}
            <div className="auto-workflow-description">
                <Info size={14} />
                <span>AI sẽ tìm kiếm trên web để học phong cách viết và thu thập thông tin truyện gốc, giúp viết chính xác và hay hơn.</span>
            </div>

            {/* Mode Selection — 4 tabs */}
            <div className="research-mode-tabs research-mode-tabs-4">
                <button
                    className={`research-mode-tab ${mode === 'fanfiction' ? 'active' : ''}`}
                    onClick={() => setMode('fanfiction')}
                    disabled={loading}
                >
                    <BookOpen size={15} />
                    <span>Đồng nhân</span>
                    <small>Truyện gốc</small>
                </button>
                <button
                    className={`research-mode-tab ${mode === 'style' ? 'active' : ''}`}
                    onClick={() => setMode('style')}
                    disabled={loading}
                >
                    <PenTool size={15} />
                    <span>Phong cách</span>
                    <small>Truyện hot</small>
                </button>
                <button
                    className={`research-mode-tab ${mode === 'characters' ? 'active' : ''}`}
                    onClick={() => setMode('characters')}
                    disabled={loading}
                >
                    <Users size={15} />
                    <span>Nhân vật</span>
                    <small>Tâm lý sâu</small>
                </button>
                <button
                    className={`research-mode-tab ${mode === 'self' ? 'active' : ''}`}
                    onClick={() => setMode('self')}
                    disabled={loading}
                >
                    <Brain size={15} />
                    <span>Tự phân tích</span>
                    <small>Plot holes</small>
                </button>
            </div>

            {/* Mode Description */}
            <div className="research-mode-info">
                {mode === 'fanfiction' ? (
                    <div>
                        <p>AI sẽ tự động tìm truyện gốc theo tên "<strong>{currentStory.title}</strong>". Trích xuất đặc trưng cơ bản.</p>
                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                                Hoặc để quét siêu chuẩn xác, hãy dán link Truyện Gốc (sangtacviet) vào đây:
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-primary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                <Globe size={16} className="text-tertiary" />
                                <input
                                    type="text"
                                    placeholder="Ví dụ: https://sangtacviet.com/truyen/uukanshu/1/123019/"
                                    value={storyUrl}
                                    onChange={(e) => setStoryUrl(e.target.value)}
                                    disabled={loading}
                                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text)', fontSize: '14px' }}
                                />
                            </div>
                        </div>
                    </div>
                ) : mode === 'style' ? (
                    <div>
                        <p>AI sẽ tìm truyện hot cùng thể loại <strong>{(currentStory.genres || [currentStory.genre]).join(', ')}</strong>, phân tích kỹ thuật viết hay, và tạo hướng dẫn phong cách.</p>
                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                                Hoặc dán link truyện mẫu để AI phân tích trực tiếp phong cách viết:
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-primary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                <Globe size={16} className="text-tertiary" />
                                <input
                                    type="text"
                                    placeholder="Ví dụ: https://sangtacviet.com/truyen/..."
                                    value={styleUrl}
                                    onChange={(e) => setStyleUrl(e.target.value)}
                                    disabled={loading}
                                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text)', fontSize: '14px' }}
                                />
                            </div>
                        </div>
                    </div>
                ) : mode === 'characters' ? (
                    <p>AI nghiên cứu <strong>tâm lý, cách nói chuyện, mối quan hệ</strong> của từng nhân vật — giúp viết thoại sống động, nhân vật có chiều sâu.</p>
                ) : (
                    <div>
                        <p>AI đọc lại <strong>tất cả chương đã viết</strong>, tìm mâu thuẫn, tóm tắt thế giới đã xây dựng, phát hiện manh mối chưa giải quyết.</p>
                        {currentStory.database?.chapters && (
                            <small style={{ color: 'var(--color-text-tertiary)', marginTop: '4px', display: 'block' }}>
                                📊 Có {currentStory.database.chapters.filter(c => c.content?.trim()?.length > 100).length} chương có nội dung để phân tích
                            </small>
                        )}
                    </div>
                )}
            </div>

            {/* Chapter Selection (for fanfiction and style modes) */}
            {(mode === 'fanfiction' || mode === 'style') && (
                <div className="research-chapter-config">
                    <div className="research-chapter-header">
                        <Hash size={14} />
                        <span>Cấu hình đọc chương</span>
                        <label className="research-toggle">
                            <input
                                type="checkbox"
                                checked={useCustomChapters}
                                onChange={(e) => setUseCustomChapters(e.target.checked)}
                                disabled={loading}
                            />
                            <span>{useCustomChapters ? 'Tuỳ chỉnh' : 'Tự động'}</span>
                        </label>
                    </div>

                    {useCustomChapters ? (
                        <div>
                            <div className="research-chapter-controls">
                                <div className="research-chapter-field">
                                    <label>Từ chương</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={9999}
                                        value={chapterStart}
                                        onChange={(e) => setChapterStart(Math.max(1, parseInt(e.target.value) || 1))}
                                        disabled={loading}
                                        className="research-chapter-input"
                                    />
                                </div>
                                <ArrowRight size={14} className="text-tertiary" />
                                <div className="research-chapter-field">
                                    <label>Đến chương</label>
                                    <input
                                        type="number"
                                        min={chapterStart}
                                        max={9999}
                                        value={chapterStart + chapterCount - 1}
                                        onChange={(e) => {
                                            const endCh = Math.max(chapterStart, parseInt(e.target.value) || chapterStart);
                                            setChapterCount(endCh - chapterStart + 1);
                                        }}
                                        disabled={loading}
                                        className="research-chapter-input"
                                    />
                                </div>
                            </div>
                            <div className="research-chapter-auto-info" style={{ marginTop: '6px' }}>
                                → AI sẽ đọc <strong>{chapterCount}</strong> chương (từ ch.{chapterStart} đến ch.{chapterStart + chapterCount - 1})
                            </div>
                        </div>
                    ) : (
                        <div className="research-chapter-auto-info">
                            AI tự động đọc 50 chương chiến lược (5 đầu + rải đều khắp truyện)
                        </div>
                    )}
                </div>
            )}

            {/* Run / Stop Buttons */}
            <div className="auto-workflow-controls" style={{ display: 'flex', gap: 'var(--space-md)' }}>
                {!loading ? (
                    <button
                        className="btn btn-primary auto-run-btn"
                        onClick={handleResearch}
                        style={{ flex: 1 }}
                    >
                        <Search size={18} /> {modeButtonLabels[mode]}
                    </button>
                ) : (
                    <button
                        className="btn auto-run-btn btn-danger"
                        onClick={handleStop}
                        style={{ flex: 1, backgroundColor: 'var(--color-danger)', color: 'white', borderColor: 'var(--color-danger)' }}
                    >
                        <XCircle size={18} /> Dừng lại
                    </button>
                )}
            </div>

            {/* Progress */}
            {progress && (
                <motion.div
                    className="auto-workflow-progress"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="auto-progress-text">{progress}</div>
                </motion.div>
            )}

            {/* Error */}
            {error && (
                <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: 'hsl(0, 75%, 55%)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <XCircle size={16} /> {error}
                </div>
            )}

            {/* ═══════ Research Data Display ═══════ */}
            {researchData && (
                <motion.div
                    className="research-result-card"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="research-result-header">
                        <div className="research-result-title">
                            <BookOpen size={16} />
                            <span>Dữ liệu truyện gốc</span>
                            {researchData.originalTitle && <small>— {researchData.originalTitle}</small>}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <button className="btn-icon" onClick={() => { setMode('fanfiction'); handleResearch(); }} title="Làm mới"><RefreshCw size={14} /></button>
                            <button className="btn-icon" onClick={() => clearData('research')} title="Xoá"><Trash2 size={14} /></button>
                        </div>
                    </div>
                    <div className="research-result-body">
                        {researchData.parseError ? (
                            <pre className="research-raw-text">{researchData.rawData?.substring(0, 2000)}</pre>
                        ) : (
                            <div className="research-sections">
                                {researchData.summary && (
                                    <div className="research-section">
                                        <h4><Globe size={14} /> Tóm tắt</h4>
                                        <p>{researchData.summary}</p>
                                    </div>
                                )}
                                {researchData.characters?.length > 0 && (
                                    <div className="research-section">
                                        <h4><Users size={14} /> Nhân vật ({researchData.characters.length})</h4>
                                        <div className="research-tag-list">
                                            {researchData.characters.map((c, i) => (
                                                <span key={i} className="research-tag" title={`${c.personality || ''} | ${c.abilities || ''}`}>
                                                    {c.name} <small>({c.role})</small>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {researchData.powerSystem && (
                                    <div className="research-section">
                                        <h4><Zap size={14} /> Hệ thống sức mạnh</h4>
                                        <p>{researchData.powerSystem}</p>
                                    </div>
                                )}
                                {researchData.terminology?.length > 0 && (
                                    <div className="research-section">
                                        <h4><MessageCircle size={14} /> Thuật ngữ ({researchData.terminology.length})</h4>
                                        <div className="research-tag-list">
                                            {researchData.terminology.map((t, i) => (
                                                <span key={i} className="research-tag-sm">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ═══════ Style Guide Display ═══════ */}
            {styleGuide && (
                <motion.div
                    className="research-result-card"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="research-result-header">
                        <div className="research-result-title">
                            <PenTool size={16} />
                            <span>Hướng dẫn phong cách</span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <button className="btn-icon" onClick={() => { setMode('style'); handleResearch(); }} title="Làm mới"><RefreshCw size={14} /></button>
                            <button className="btn-icon" onClick={() => clearData('style')} title="Xoá"><Trash2 size={14} /></button>
                        </div>
                    </div>
                    <div className="research-result-body">
                        {styleGuide.parseError ? (
                            <pre className="research-raw-text">{styleGuide.rawGuide?.substring(0, 2000)}</pre>
                        ) : (
                            <div className="research-sections">
                                {styleGuide.referenceNovels?.length > 0 && (
                                    <div className="research-section">
                                        <h4><BookOpen size={14} /> Truyện tham khảo</h4>
                                        {styleGuide.referenceNovels.map((n, i) => (
                                            <div key={i} className="research-ref-novel">
                                                <strong>{n.title}</strong> — {n.author}
                                                <p>{n.strengths}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {styleGuide.combatTemplate && (
                                    <div className="research-section">
                                        <h4><Swords size={14} /> Chiến đấu</h4>
                                        <p>{styleGuide.combatTemplate}</p>
                                    </div>
                                )}
                                {styleGuide.genreVocabulary?.length > 0 && (
                                    <div className="research-section">
                                        <h4><MessageCircle size={14} /> Từ vựng thể loại ({styleGuide.genreVocabulary.length})</h4>
                                        <div className="research-tag-list">
                                            {styleGuide.genreVocabulary.map((v, i) => (
                                                <span key={i} className="research-tag-sm">{v}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {styleGuide.taboos?.length > 0 && (
                                    <div className="research-section">
                                        <h4><AlertCircle size={14} /> Cấm kỵ</h4>
                                        <ul>
                                            {styleGuide.taboos.map((t, i) => <li key={i}>{t}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ═══════ Character Research Display (Mode 3) ═══════ */}
            {charResearch && (
                <motion.div
                    className="research-result-card research-char-card"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="research-result-header">
                        <div className="research-result-title">
                            <Users size={16} />
                            <span>Hồ sơ nhân vật chuyên sâu</span>
                            <QualityBadge score={charResearch.qualityScore} />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <button className="btn-icon" onClick={() => { setMode('characters'); handleResearch(); }} title="Làm mới"><RefreshCw size={14} /></button>
                            <button className="btn-icon" onClick={() => clearData('characters')} title="Xoá"><Trash2 size={14} /></button>
                        </div>
                    </div>
                    <div className="research-result-body">
                        {charResearch.parseError ? (
                            <pre className="research-raw-text">{charResearch.rawData?.substring(0, 2000)}</pre>
                        ) : (
                            <div className="research-sections">
                                {charResearch.characters?.map((char, i) => (
                                    <ExpandableSection
                                        key={i}
                                        title={char.name}
                                        icon={Users}
                                        defaultOpen={i === 0}
                                    >
                                        <div className="research-char-profile">
                                            {/* Psychology */}
                                            {char.psychology && (
                                                <div className="research-char-section">
                                                    <div className="research-char-label"><Brain size={12} /> Tâm lý</div>
                                                    <div className="research-char-detail">
                                                        {char.psychology.personality && <p><strong>Tính cách:</strong> {char.psychology.personality}</p>}
                                                        {char.psychology.motivation && <p><strong>Động cơ:</strong> {char.psychology.motivation}</p>}
                                                        {char.psychology.fears && <p><strong>Nỗi sợ:</strong> {char.psychology.fears}</p>}
                                                        {char.psychology.moralCode && <p><strong>Nguyên tắc:</strong> {char.psychology.moralCode}</p>}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Speech */}
                                            {char.speechPatterns && (
                                                <div className="research-char-section">
                                                    <div className="research-char-label"><MessageCircle size={12} /> Cách nói</div>
                                                    <div className="research-char-detail">
                                                        {char.speechPatterns.style && <p>{char.speechPatterns.style}</p>}
                                                        {char.speechPatterns.catchphrases?.length > 0 && (
                                                            <div className="research-tag-list">
                                                                {char.speechPatterns.catchphrases.map((cp, j) => (
                                                                    <span key={j} className="research-tag-sm research-tag-accent">"{cp}"</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Emotional Responses */}
                                            {char.emotionalResponses && (
                                                <div className="research-char-section">
                                                    <div className="research-char-label"><Heart size={12} /> Cảm xúc</div>
                                                    <div className="research-char-emotions">
                                                        {char.emotionalResponses.angry && <span className="research-emotion-tag anger">😠 {char.emotionalResponses.angry}</span>}
                                                        {char.emotionalResponses.happy && <span className="research-emotion-tag happy">😊 {char.emotionalResponses.happy}</span>}
                                                        {char.emotionalResponses.sad && <span className="research-emotion-tag sad">😢 {char.emotionalResponses.sad}</span>}
                                                        {char.emotionalResponses.stressed && <span className="research-emotion-tag stressed">😰 {char.emotionalResponses.stressed}</span>}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Relationships */}
                                            {char.relationships?.length > 0 && (
                                                <div className="research-char-section">
                                                    <div className="research-char-label"><GitBranch size={12} /> Quan hệ</div>
                                                    <div className="research-char-relationships">
                                                        {char.relationships.map((rel, j) => (
                                                            <div key={j} className="research-rel-item">
                                                                <strong>{rel.with}</strong>: <span>{rel.dynamics || rel.type}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Arc */}
                                            {char.arc && (
                                                <div className="research-char-section">
                                                    <div className="research-char-label"><Target size={12} /> Arc phát triển</div>
                                                    <p className="research-char-arc">{char.arc}</p>
                                                </div>
                                            )}
                                        </div>
                                    </ExpandableSection>
                                ))}

                                {charResearch.interactionRules?.length > 0 && (
                                    <div className="research-section">
                                        <h4><Shield size={14} /> Quy tắc tương tác</h4>
                                        <ul>
                                            {charResearch.interactionRules.map((r, i) => <li key={i}>{r}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ═══════ Self-Research Display (Mode 4) ═══════ */}
            {selfResearch && (
                <motion.div
                    className="research-result-card research-self-card"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="research-result-header">
                        <div className="research-result-title">
                            <Brain size={16} />
                            <span>Báo cáo tự phân tích</span>
                            <QualityBadge score={selfResearch.qualityScore} />
                            {selfResearch.chaptersAnalyzed && (
                                <small style={{ marginLeft: '4px' }}>({selfResearch.chaptersAnalyzed} chương)</small>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <button className="btn-icon" onClick={() => { setMode('self'); handleResearch(); }} title="Làm mới"><RefreshCw size={14} /></button>
                            <button className="btn-icon" onClick={() => clearData('self')} title="Xoá"><Trash2 size={14} /></button>
                        </div>
                    </div>
                    <div className="research-result-body">
                        {selfResearch.parseError ? (
                            <pre className="research-raw-text">{selfResearch.rawData?.substring(0, 2000)}</pre>
                        ) : (
                            <div className="research-sections">
                                {/* Plot Holes */}
                                {selfResearch.plotHoles?.length > 0 && (
                                    <div className="research-section research-plothole-section">
                                        <h4><AlertTriangle size={14} /> Lỗ hổng cốt truyện ({selfResearch.plotHoles.length})</h4>
                                        {selfResearch.plotHoles.map((hole, i) => (
                                            <div key={i} className={`research-plothole research-plothole-${hole.severity || 'low'}`}>
                                                <div className="research-plothole-severity">
                                                    {hole.severity === 'high' ? '🔴' : hole.severity === 'medium' ? '🟡' : '🟢'}
                                                </div>
                                                <div className="research-plothole-content">
                                                    <p>{hole.description}</p>
                                                    {hole.chapters?.length > 0 && (
                                                        <small>Chương: {hole.chapters.join(', ')}</small>
                                                    )}
                                                    {hole.suggestion && (
                                                        <div className="research-plothole-fix">💡 {hole.suggestion}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* World Building */}
                                {selfResearch.worldBuilding && (
                                    <ExpandableSection title="Thế giới đã xây dựng" icon={Globe} defaultOpen>
                                        <div className="research-world-summary">
                                            {selfResearch.worldBuilding.setting && (
                                                <p><MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Bối cảnh:</strong> {selfResearch.worldBuilding.setting}</p>
                                            )}
                                            {selfResearch.worldBuilding.powerSystem && (
                                                <p><Zap size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Sức mạnh:</strong> {selfResearch.worldBuilding.powerSystem}</p>
                                            )}
                                            {selfResearch.worldBuilding.establishedRules?.length > 0 && (
                                                <div>
                                                    <strong><Shield size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Quy tắc đã thiết lập:</strong>
                                                    <ul>
                                                        {selfResearch.worldBuilding.establishedRules.map((r, i) => <li key={i}>{r}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {selfResearch.worldBuilding.locations?.length > 0 && (
                                                <div className="research-tag-list">
                                                    {selfResearch.worldBuilding.locations.map((loc, i) => (
                                                        <span key={i} className="research-tag-sm"><MapPin size={10} /> {loc}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </ExpandableSection>
                                )}

                                {/* Foreshadowing */}
                                {selfResearch.foreshadowing?.length > 0 && (
                                    <ExpandableSection title={`Manh mối đã gieo (${selfResearch.foreshadowing.length})`} icon={Eye}>
                                        {selfResearch.foreshadowing.map((f, i) => (
                                            <div key={i} className="research-foreshadow-item">
                                                <div className="research-foreshadow-thread">
                                                    <Compass size={12} /> {f.thread}
                                                </div>
                                                {f.possiblePayoff && (
                                                    <div className="research-foreshadow-payoff">→ {f.possiblePayoff}</div>
                                                )}
                                            </div>
                                        ))}
                                    </ExpandableSection>
                                )}

                                {/* Character Tracker */}
                                {selfResearch.characterTracker?.length > 0 && (
                                    <ExpandableSection title="Theo dõi nhân vật" icon={Users}>
                                        {selfResearch.characterTracker.map((ct, i) => (
                                            <div key={i} className="research-char-track">
                                                <strong>{ct.name}</strong>
                                                <span className={`research-consistency-badge ${ct.consistency === 'nhất quán' ? 'good' : 'warn'}`}>
                                                    {ct.consistency}
                                                </span>
                                                {ct.notes && <small>{ct.notes}</small>}
                                            </div>
                                        ))}
                                    </ExpandableSection>
                                )}

                                {/* Unresolved Conflicts */}
                                {selfResearch.unresolvedConflicts?.length > 0 && (
                                    <div className="research-section">
                                        <h4><Target size={14} /> Xung đột chưa giải quyết</h4>
                                        <ul>
                                            {selfResearch.unresolvedConflicts.map((c, i) => <li key={i}>{c}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {/* Suggested Directions */}
                                {selfResearch.suggestedDirections?.length > 0 && (
                                    <div className="research-section research-suggestions">
                                        <h4><Compass size={14} /> Gợi ý hướng đi</h4>
                                        <ul>
                                            {selfResearch.suggestedDirections.map((d, i) => <li key={i}>{d}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Status indicator */}
            <div className="research-status-bar research-status-bar-4">
                <div className="research-status-item">
                    <span className={`research-status-dot ${researchData ? 'active' : ''}`} />
                    <span>Gốc</span>
                </div>
                <div className="research-status-item">
                    <span className={`research-status-dot ${styleGuide ? 'active' : ''}`} />
                    <span>Style</span>
                </div>
                <div className="research-status-item">
                    <span className={`research-status-dot ${charResearch ? 'active' : ''}`} />
                    <span>NV</span>
                </div>
                <div className="research-status-item">
                    <span className={`research-status-dot ${selfResearch ? 'active' : ''}`} />
                    <span>Self</span>
                </div>
            </div>
        </motion.div>
    );
});
