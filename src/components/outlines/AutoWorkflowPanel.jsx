import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { useDirectives } from '../../context/DirectiveContext';
import {
    Zap, Play, Pause, Square, PenTool, Loader2, AlertCircle, CheckCircle,
    XCircle, Info, Settings, Trash2, Eye, EyeOff, BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AutoWorkflowRunner } from '../../services/autoWorkflowService';
import { IdbStorage } from '../../utils/idbStorage';

const DEFAULT_CONFIG = {
    chapterCount: 1,        // 0 = infinite
    delayBetweenChapters: 3, // seconds
    autoOutline: true,
};

export default React.memo(function AutoWorkflowPanel() {
    const { currentStory } = useStoryState();
    const dispatch = useStoryDispatch();
    const { getNextKey, isKeySet, selectedModel } = useApiKey();
    const { getDirective } = useDirectives();

    // Config
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    // Runner state
    const [runnerStatus, setRunnerStatus] = useState('idle');
    const [currentChapter, setCurrentChapter] = useState(0);
    const [progressMsg, setProgressMsg] = useState('');
    const [logs, setLogs] = useState([]);
    const [liveContent, setLiveContent] = useState('');
    const [liveChapterTitle, setLiveChapterTitle] = useState('');
    const [showLivePreview, setShowLivePreview] = useState(true);

    const runnerRef = useRef(null);
    const logsEndRef = useRef(null);
    const livePreviewRef = useRef(null);

    // ★ Ref to always have the latest story state (fixes stale closure)
    const storyRef = useRef(currentStory);
    useEffect(() => { storyRef.current = currentStory; }, [currentStory]);

    // Load saved config
    useEffect(() => {
        if (currentStory) {
            (async () => {
                const saved = await IdbStorage.getItem(`autoConfig_${currentStory.id}`);
                if (saved) setConfig({ ...DEFAULT_CONFIG, ...saved });
            })();
        }
    }, [currentStory?.id]);

    // Save config
    const saveConfig = useCallback(async (newConfig) => {
        setConfig(newConfig);
        if (currentStory) {
            await IdbStorage.setItem(`autoConfig_${currentStory.id}`, newConfig);
        }
    }, [currentStory]);

    // Auto-scroll
    useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
    useEffect(() => {
        if (livePreviewRef.current) livePreviewRef.current.scrollTop = livePreviewRef.current.scrollHeight;
    }, [liveContent]);

    // ─── Runner controls ───

    const handleStart = useCallback(() => {
        if (!isKeySet) {
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('vi-VN'), level: 'error', message: '❌ Vui lòng nhập API key trước!' }]);
            return;
        }

        setLogs([]);
        setCurrentChapter(0);
        setProgressMsg('');
        setLiveContent('');
        setLiveChapterTitle('');

        const runner = new AutoWorkflowRunner(config, {
            getApiKey: () => getNextKey(),
            getStory: () => storyRef.current, // ★ Always get latest state via ref
            getModel: () => selectedModel,
            getDirective: getDirective,
            // Dispatch operations
            updateOverallOutline: dispatch.updateOverallOutline,
            chapterOps: dispatch.chapterOps,
            sceneOps: dispatch.sceneOps,
            addCharacter: dispatch.addCharacter,
            updateCharacter: dispatch.updateCharacter,
            settingOps: dispatch.settingOps,
            timelineOps: dispatch.timelineOps,
            abilityOps: dispatch.abilityOps,
            itemOps: dispatch.itemOps,
            organizationOps: dispatch.organizationOps,
            foreshadowingOps: dispatch.foreshadowingOps,
            updateCurrentInfo: dispatch.updateCurrentInfo,
            updateChapterOutline: dispatch.updateChapterOutline,
            // Callbacks
            onProgress: (msg) => setProgressMsg(msg),
            onLog: (entry) => setLogs(prev => [...prev, entry]),
            onStatusChange: (status) => setRunnerStatus(status),
            onLiveContent: (chunk, chTitle) => {
                if (chTitle) setLiveChapterTitle(chTitle);
                setLiveContent(prev => prev + chunk);
            },
            onChapterWriteStart: (chTitle) => {
                setLiveContent('');
                setLiveChapterTitle(chTitle);
                setCurrentChapter(prev => prev + 1);
            },
            onComplete: () => {
                setProgressMsg('');
            },
        });

        runnerRef.current = runner;
        runner.start();
    }, [config, isKeySet, getNextKey, currentStory, selectedModel, getDirective, dispatch]);

    const handlePause = () => runnerRef.current?.pause();
    const handleResume = () => runnerRef.current?.resume();
    const handleStop = () => runnerRef.current?.stop();

    // ─── Render ───

    if (!currentStory) {
        return (
            <div className="database-container">
                <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                    Vui lòng chọn hoặc tạo truyện trước.
                </p>
            </div>
        );
    }

    const isRunning = runnerStatus === 'running';
    const isPaused = runnerStatus === 'paused';
    const isActive = isRunning || isPaused;
    const isInfinite = config.chapterCount === 0;

    return (
        <motion.div
            className="auto-workflow-wrapper"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="database-header" style={{ marginBottom: 'var(--space-md)' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Zap size={22} className="text-primary" />
                    Viết tự động
                </h2>
            </div>

            <div className="auto-workflow-grid">

                {/* ══════ LEFT: Progress Panel ══════ */}
                <div className="auto-workflow-left">
                    <div className="auto-left-header">
                        <Loader2 size={14} />
                        <span>Tiến trình</span>
                    </div>

                    {/* Controls */}
                    <div className="auto-workflow-controls">
                        {!isActive ? (
                            <button
                                className="btn btn-primary auto-run-btn"
                                onClick={handleStart}
                            >
                                <Play size={18} />
                                Chạy ({isInfinite ? '∞' : config.chapterCount} chương)
                            </button>
                        ) : (
                            <div className="auto-control-group">
                                {isRunning ? (
                                    <button className="btn btn-warning auto-ctrl-btn" onClick={handlePause}>
                                        <Pause size={14} /> Dừng
                                    </button>
                                ) : (
                                    <button className="btn btn-primary auto-ctrl-btn" onClick={handleResume}>
                                        <Play size={14} /> Tiếp
                                    </button>
                                )}
                                <button className="btn btn-danger auto-ctrl-btn" onClick={handleStop}>
                                    <Square size={14} /> Hủy
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Progress */}
                    {isActive && (
                        <div className="auto-workflow-progress">
                            {!isInfinite && (
                                <div className="auto-progress-bar">
                                    <div
                                        className="auto-progress-fill"
                                        style={{ width: `${(currentChapter / config.chapterCount) * 100}%` }}
                                    />
                                </div>
                            )}
                            <div className="auto-progress-text">
                                <BookOpen size={14} style={{ flexShrink: 0 }} />
                                <span>
                                    {isInfinite
                                        ? `Chương ${currentChapter} (vô hạn)`
                                        : `Chương ${currentChapter}/${config.chapterCount}`
                                    }
                                </span>
                            </div>
                            {progressMsg && (
                                <div className="auto-progress-detail">{progressMsg}</div>
                            )}
                        </div>
                    )}

                    {/* Live Preview */}
                    {liveContent.length > 0 && (
                        <div className="auto-live-preview">
                            <div className="auto-live-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                    <PenTool size={12} />
                                    <span>{liveChapterTitle || 'Đang viết...'}</span>
                                    <span className="auto-live-count">{liveContent.length.toLocaleString()} ký tự</span>
                                </div>
                                <button className="btn-icon" onClick={() => setShowLivePreview(!showLivePreview)} title={showLivePreview ? 'Ẩn' : 'Hiện'}>
                                    {showLivePreview ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                            </div>
                            {showLivePreview && (
                                <div className="auto-live-body" ref={livePreviewRef}>
                                    {liveContent || '...'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Completion */}
                    {runnerStatus === 'completed' && logs.length > 0 && (
                        <div className="auto-workflow-complete">
                            <CheckCircle size={16} />
                            <span>Hoàn thành!</span>
                        </div>
                    )}

                    {/* Logs */}
                    {logs.length > 0 && (
                        <div className="auto-workflow-logs">
                            <div className="auto-logs-header">
                                <span>Nhật ký ({logs.length})</span>
                                <button className="btn-icon" onClick={() => setLogs([])} title="Xoá log">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <div className="auto-logs-list">
                                {logs.map((log, i) => (
                                    <div key={i} className={`auto-log-entry auto-log-${log.level}`}>
                                        <span className="auto-log-time">{log.time}</span>
                                        <span className="auto-log-icon">
                                            {log.level === 'error' ? <XCircle size={10} /> :
                                                log.level === 'success' ? <CheckCircle size={10} /> :
                                                    log.level === 'warn' ? <AlertCircle size={10} /> :
                                                        <Info size={10} />}
                                        </span>
                                        <span className="auto-log-message">{log.message}</span>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!isActive && logs.length === 0 && liveContent.length === 0 && (
                        <div className="auto-left-empty">
                            <Info size={18} />
                            <span>Bấm "Chạy" để AI viết liên tục từng chương một. Tiến trình sẽ hiện ở đây.</span>
                        </div>
                    )}
                </div>

                {/* ══════ RIGHT: Config Panel ══════ */}
                <div className="auto-workflow-right">
                    <div className="auto-workflow-settings-inner">
                        <div className="auto-right-section-title">
                            <Settings size={14} />
                            <span>Cài đặt</span>
                        </div>

                        <div className="auto-setting-row">
                            <label>Số chương cần viết</label>
                            <div className="auto-setting-input-group">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={config.chapterCount}
                                    onChange={e => saveConfig({ ...config, chapterCount: parseInt(e.target.value) || 0 })}
                                    disabled={isActive}
                                    className="form-input auto-setting-input"
                                />
                                <span className="auto-setting-hint">0 = vô hạn</span>
                            </div>
                        </div>

                        <div className="auto-setting-row">
                            <label>Nghỉ giữa các chương</label>
                            <div className="auto-setting-input-group">
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={config.delayBetweenChapters}
                                    onChange={e => saveConfig({ ...config, delayBetweenChapters: parseInt(e.target.value) || 0 })}
                                    disabled={isActive}
                                    className="form-input auto-setting-input"
                                />
                                <span className="auto-setting-hint">giây</span>
                            </div>
                        </div>

                        <div className="auto-setting-row" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={config.autoOutline}
                                    onChange={e => saveConfig({ ...config, autoOutline: e.target.checked })}
                                    disabled={isActive}
                                    style={{ accentColor: 'var(--color-primary)' }}
                                />
                                Tự tạo dàn ý nếu chưa có
                            </label>
                        </div>
                    </div>

                    {/* Quick info */}
                    <div style={{ padding: 'var(--space-sm)', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
                        <p>💡 <strong>Quy trình mỗi chương:</strong></p>
                        <p>1. Tìm chương chưa viết (hoặc tạo mới)</p>
                        <p>2. Tự tạo dàn ý nếu cần</p>
                        <p>3. Viết nội dung (streaming)</p>
                        <p>4. Quét dữ liệu tự động</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
});
