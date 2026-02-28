import React, { useState, useEffect } from 'react';
import { useStoryState } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { useDirectives } from '../../context/DirectiveContext';
import { AIService } from '../../services/aiService';
import { AlertCircle, CheckCircle, AlertTriangle, RefreshCw, Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default React.memo(function ConsistencyChecker({ onNavigate }) {
    const { currentStory } = useStoryState();
    const { getNextKey, isKeySet, selectedModel } = useApiKey();
    const { getDirective } = useDirectives();
    const [issues, setIssues] = useState([]);
    const [lastChecked, setLastChecked] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);

    // --- Local rule-based checks ---
    const runLocalChecks = () => {
        if (!currentStory) return;
        const newIssues = [];
        const { characters, settings, timeline, chapters } = currentStory.database;

        // Character checks
        const charNames = {};
        characters.forEach(c => {
            const name = c.name?.trim().toLowerCase();
            if (name) {
                if (charNames[name]) {
                    newIssues.push({ type: 'error', category: 'Nhân vật', message: `Trùng tên nhân vật: "${c.name}"` });
                } else { charNames[name] = true; }
            }
        });
        characters.forEach(c => {
            if (!c.name || c.name.trim() === '') newIssues.push({ type: 'error', category: 'Nhân vật', message: 'Nhân vật thiếu tên' });
            if (!c.role) newIssues.push({ type: 'warning', category: 'Nhân vật', message: `"${c.name || '?'}" thiếu vai trò` });
            if (!c.description) newIssues.push({ type: 'warning', category: 'Nhân vật', message: `"${c.name || '?'}" thiếu mô tả` });
        });

        // Setting checks
        const settingNames = {};
        settings.forEach(s => {
            const name = s.name?.trim().toLowerCase();
            if (name) {
                if (settingNames[name]) newIssues.push({ type: 'error', category: 'Bối cảnh', message: `Trùng tên bối cảnh: "${s.name}"` });
                else settingNames[name] = true;
            }
        });
        settings.forEach(s => {
            if (!s.name?.trim()) newIssues.push({ type: 'error', category: 'Bối cảnh', message: 'Bối cảnh thiếu tên' });
            if (!s.description) newIssues.push({ type: 'warning', category: 'Bối cảnh', message: `"${s.name || '?'}" thiếu mô tả` });
        });

        // Timeline checks
        timeline.forEach(t => {
            if (!t.title?.trim()) newIssues.push({ type: 'error', category: 'Thời gian', message: 'Sự kiện thiếu tiêu đề' });
        });

        // Chapter checks
        chapters.forEach(c => {
            if (!c.title?.trim()) newIssues.push({ type: 'warning', category: 'Chương', message: `Chương ${c.order || '?'} thiếu tiêu đề` });
            if (!c.summary?.trim()) newIssues.push({ type: 'warning', category: 'Chương', message: `"${c.title || 'Chương ?'}" thiếu tóm tắt` });
        });

        setIssues(newIssues);
        setLastChecked(new Date());
    };

    // --- AI-powered deep check ---
    const runAICheck = async () => {
        if (!currentStory) return;
        setLoading(true);
        setAiResult(null);
        try {
            // Gather all chapter content for AI analysis
            const allContent = currentStory.database.chapters
                .map(c => c.content || '')
                .join('\n\n') || currentStory.content || '';

            const result = await AIService.checkConsistency(getNextKey(), allContent, currentStory, { directive: getDirective('checkConsistency'), model: selectedModel });
            setAiResult(result);
        } catch (e) {
            setAiResult({ issues: [{ type: 'error', message: 'Lỗi khi gọi AI: ' + e.message }], warnings: [] });
        } finally { setLoading(false); }
    };

    useEffect(() => { runLocalChecks(); }, [currentStory]);

    if (!currentStory) return (
        <div className="database-container">
            <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Vui lòng chọn hoặc tạo truyện trước.</p>
        </div>
    );

    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    return (
        <motion.div className="database-container" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <ShieldCheck size={22} className="text-primary" /> Kiểm tra Nhất quán
                </h2>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary btn-small" onClick={runLocalChecks}>
                        <RefreshCw size={16} /> Quét lại
                    </button>
                    <button className="btn btn-primary btn-small" onClick={runAICheck} disabled={loading}>
                        {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                        {loading ? 'Đang quét...' : 'Kiểm tra bằng AI'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                {[
                    { label: 'Tổng vấn đề', value: issues.length, color: 'var(--color-text-primary)' },
                    { label: 'Lỗi', value: errorCount, color: 'var(--color-error)' },
                    { label: 'Cảnh báo', value: warningCount, color: 'var(--color-warning)' }
                ].map(s => (
                    <div key={s.label} style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* AI Result */}
            <AnimatePresence>
                {aiResult && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-md)', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                <Sparkles size={16} /> Kết quả AI
                            </div>
                            {(aiResult.issues?.length === 0 && aiResult.warnings?.length === 0) ? (
                                <div style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <CheckCircle size={18} /> AI không tìm thấy mâu thuẫn nào!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                    {aiResult.issues?.map((issue, i) => (
                                        <div key={`ai-err-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)' }}>
                                            <AlertCircle size={16} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '2px' }} />
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{issue.message}</span>
                                        </div>
                                    ))}
                                    {aiResult.warnings?.map((w, i) => (
                                        <div key={`ai-warn-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'rgba(251,191,36,0.08)', borderRadius: 'var(--radius-sm)' }}>
                                            <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{w.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Local Issues List */}
            <div>
                {issues.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-tertiary)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--glass-border)' }}>
                        <CheckCircle size={48} style={{ marginBottom: 'var(--space-md)', color: 'var(--color-success)', opacity: 0.6 }} />
                        <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Tuyệt vời! Không tìm thấy vấn đề nào.</p>
                        <p style={{ fontSize: 'var(--font-size-sm)' }}>Dữ liệu truyện có vẻ nhất quán.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {issues.map((issue, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
                                    padding: 'var(--space-md)',
                                    background: 'var(--glass-bg)',
                                    border: `1px solid var(--glass-border)`,
                                    borderLeft: `3px solid ${issue.type === 'error' ? 'var(--color-error)' : 'var(--color-warning)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    transition: 'background 0.2s'
                                }}
                            >
                                {issue.type === 'error'
                                    ? <AlertCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '1px' }} />
                                    : <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '1px' }} />
                                }
                                <div style={{ flex: 1 }}>
                                    <span style={{
                                        fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: '6px',
                                        background: issue.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                                        color: issue.type === 'error' ? 'var(--color-error)' : 'var(--color-warning)'
                                    }}>
                                        {issue.category}
                                    </span>
                                    <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)' }}>{issue.message}</p>
                                </div>
                                {/* Navigate to related tab */}
                                {onNavigate && (
                                    <button
                                        className="btn-icon"
                                        onClick={() => {
                                            const catMap = { 'Nhân vật': 'characters', 'Bối cảnh': 'settings', 'Thời gian': 'timeline', 'Chương': 'toc' };
                                            onNavigate(catMap[issue.category] || 'home');
                                        }}
                                        style={{ fontSize: 'var(--font-size-xs)', flexShrink: 0, color: 'var(--color-primary)' }}
                                        title="Chuyển tới mục liên quan"
                                    >
                                        Xem
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {lastChecked && (
                <div style={{ marginTop: 'var(--space-md)', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    Lần quét cuối: {lastChecked.toLocaleTimeString()}
                </div>
            )}
        </motion.div>
    );
});
