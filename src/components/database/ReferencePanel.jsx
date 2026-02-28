import { useState, useRef } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { AIService } from '../../services/aiService';
import {
    FileText, Plus, Trash2, Upload, X, FileUp, Edit3, Save, Loader2,
    AlertTriangle, FileJson, File, Scissors, ChevronDown, ChevronRight, Copy,
    Sparkles, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const emptyRef = { title: '', content: '' };

// Limits
const MAX_CHARS_PER_REF = 500_000;
const SUMMARIZE_THRESHOLD = 15_000; // Ask to summarize if > 15k chars
const WARN_CHARS = 100_000;

// Supported file extensions
const SUPPORTED_EXTENSIONS = [
    '.txt', '.md', '.json', '.csv', '.tsv',
    '.html', '.htm', '.xml',
    '.log', '.yml', '.yaml', '.toml', '.ini', '.cfg',
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs',
    '.sql', '.sh', '.bat', '.ps1',
    '.rtf', '.srt', '.vtt', '.tex',
];

const ACCEPT_STRING = SUPPORTED_EXTENSIONS.join(',');

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCharCount(count) {
    if (count < 1000) return `${count}`;
    if (count < 1_000_000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1_000_000).toFixed(1)}M`;
}

// Strip HTML tags
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

// Parse CSV
function parseCsvToText(csv) {
    const lines = csv.split('\n');
    if (lines.length === 0) return csv;
    return lines.join('\n');
}

// Extract content based on file type
function extractContent(text, fileName) {
    const ext = fileName.toLowerCase().split('.').pop();

    switch (ext) {
        case 'html':
        case 'htm':
            return stripHtml(text);
        case 'json': {
            try {
                const obj = JSON.parse(text);
                return JSON.stringify(obj, null, 2);
            } catch {
                return text;
            }
        }
        case 'xml':
            return text;
        case 'csv':
        case 'tsv':
            return parseCsvToText(text);
        case 'rtf':
            return text.replace(/\{\\[^{}]*\}/g, '').replace(/\\[a-z]+\d*\s?/gi, '').replace(/[{}]/g, '').trim();
        default:
            return text;
    }
}

// Split content
function splitContent(content, chunkSize = MAX_CHARS_PER_REF, overlap = 500) {
    if (content.length <= chunkSize) return [content];

    const chunks = [];
    let start = 0;

    while (start < content.length) {
        let end = start + chunkSize;
        if (end < content.length) {
            const lastPara = content.lastIndexOf('\n\n', end);
            const lastLine = content.lastIndexOf('\n', end);
            if (lastPara > start + chunkSize * 0.7) end = lastPara;
            else if (lastLine > start + chunkSize * 0.7) end = lastLine;
        }
        chunks.push(content.slice(start, end));
        start = end - overlap;
    }
    return chunks;
}

export default function ReferencePanel() {
    const { currentStory, referenceOps } = useStory();
    const { apiKey, selectedModel } = useApiKey();

    const [showAdd, setShowAdd] = useState(false);
    const [newRef, setNewRef] = useState({ ...emptyRef });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, fileName: '' });

    const [expandedCards, setExpandedCards] = useState({});

    // Summarization state
    const [fileToSummarize, setFileToSummarize] = useState(null); // { title, content, originalSize, fileName }
    const [isSummarizing, setIsSummarizing] = useState(false);

    // Split state
    const [showSplitOptions, setShowSplitOptions] = useState(false);
    const [splitChunkSize, setSplitChunkSize] = useState(10000);

    // Split + Summarize state
    const [splitSummarizeProgress, setSplitSummarizeProgress] = useState(null); // { current, total, currentTitle }

    const fileInputRef = useRef(null);
    const references = currentStory?.database?.references || [];
    const totalChars = references.reduce((sum, r) => sum + (r.content?.length || 0), 0);

    const toggleCard = (id) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAdd = () => {
        if (newRef.title.trim() && newRef.content.trim()) {
            if (newRef.content.length > MAX_CHARS_PER_REF) {
                const chunks = splitContent(newRef.content);
                chunks.forEach((chunk, i) => {
                    referenceOps.add({
                        title: chunks.length > 1 ? `${newRef.title} (Phần ${i + 1}/${chunks.length})` : newRef.title,
                        content: chunk,
                        createdAt: Date.now()
                    });
                });
            } else {
                referenceOps.add({
                    ...newRef,
                    createdAt: Date.now()
                });
            }
            setNewRef({ ...emptyRef });
            setShowAdd(false);
        }
    };

    const handleEdit = (ref) => {
        setEditingId(ref.id);
        setEditData({ title: ref.title, content: ref.content });
    };

    const handleSave = (id) => {
        referenceOps.update(id, editData);
        setEditingId(null);
    };

    const handleCopyContent = (content) => {
        navigator.clipboard.writeText(content);
    };

    const processImport = (title, content, fileName, originalSize) => {
        if (content.length > MAX_CHARS_PER_REF) {
            const chunks = splitContent(content);
            chunks.forEach((chunk, i) => {
                referenceOps.add({
                    title: chunks.length > 1 ? `${title} (Phần ${i + 1}/${chunks.length})` : title,
                    content: chunk,
                    fileInfo: {
                        originalName: fileName,
                        originalSize: originalSize,
                        partIndex: i,
                        totalParts: chunks.length
                    },
                    createdAt: Date.now()
                });
            });
        } else {
            referenceOps.add({
                title,
                content,
                fileInfo: {
                    originalName: fileName,
                    originalSize: originalSize,
                },
                createdAt: Date.now()
            });
        }
    };

    const handleFileImport = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setImporting(true);
        let importedCount = 0;

        for (const file of files) {
            setImportProgress({ current: importedCount + 1, total: files.length, fileName: file.name });

            // Check support
            const ext = '.' + file.name.toLowerCase().split('.').pop();
            const isSupported = SUPPORTED_EXTENSIONS.includes(ext) || file.type.startsWith('text/') || file.type === 'application/json';

            if (!isSupported) continue;

            try {
                const rawContent = await file.text();
                const content = extractContent(rawContent, file.name);
                const title = file.name.replace(/\.[^/.]+$/, '');

                // Check for summarization threshold
                if (content.length > SUMMARIZE_THRESHOLD) {
                    setFileToSummarize({
                        title,
                        content,
                        fileName: file.name,
                        originalSize: file.size,
                        pendingFiles: files.slice(importedCount + 1) // Keep track if needed, but for simplicity we'll handle one large interruption at a time or just process mostly sync
                    });
                    setImporting(false);
                    e.target.value = '';
                    return; // Stop loop to handle user decision
                }

                processImport(title, content, file.name, file.size);
                importedCount++;

            } catch (err) {
                console.error(err);
            }
        }

        setImporting(false);
        e.target.value = '';
    };

    const handleSummarizeDecision = async (decision) => {
        if (!fileToSummarize) return;

        const { title, content, fileName, originalSize } = fileToSummarize;

        if (decision === 'summarize') {
            setIsSummarizing(true);
            try {
                const summary = await AIService.summarizeReference(apiKey, content, fileName, { model: selectedModel });

                referenceOps.add({
                    title: `${title} (Tóm tắt AI)`,
                    content: summary,
                    fileInfo: {
                        originalName: fileName,
                        originalSize: originalSize,
                        isSummary: true
                    },
                    createdAt: Date.now()
                });
            } catch (error) {
                alert('Lỗi khi tóm tắt: ' + error.message);
            } finally {
                setIsSummarizing(false);
                setFileToSummarize(null);
                setShowSplitOptions(false);
            }
        } else if (decision === 'split') {
            const chunks = splitContent(content, splitChunkSize, Math.min(500, Math.floor(splitChunkSize * 0.05)));
            chunks.forEach((chunk, i) => {
                referenceOps.add({
                    title: `${title} (Phần ${i + 1}/${chunks.length})`,
                    content: chunk,
                    fileInfo: {
                        originalName: fileName,
                        originalSize: originalSize,
                        partIndex: i,
                        totalParts: chunks.length
                    },
                    createdAt: Date.now()
                });
            });
            setFileToSummarize(null);
            setShowSplitOptions(false);
        } else if (decision === 'split-summarize') {
            // Split into chunks, then summarize each chunk SEQUENTIALLY with generous delays
            setIsSummarizing(true);
            const chunks = splitContent(content, splitChunkSize, Math.min(500, Math.floor(splitChunkSize * 0.05)));
            const totalChunks = chunks.length;
            const results = []; // Collect results first, add to DB after all done

            try {
                for (let i = 0; i < totalChunks; i++) {
                    const partTitle = `${title} (Phần ${i + 1}/${totalChunks})`;
                    setSplitSummarizeProgress({ current: i + 1, total: totalChunks, currentTitle: partTitle });

                    let summarized = false;
                    let retries = 0;
                    const maxRetries = 3;

                    while (!summarized && retries < maxRetries) {
                        try {
                            const summary = await AIService.summarizeReference(
                                apiKey,
                                chunks[i],
                                `${fileName} - Phần ${i + 1}/${totalChunks}`,
                                { model: selectedModel }
                            );

                            results.push({
                                title: `${partTitle} (Tóm tắt)`,
                                content: summary,
                                fileInfo: {
                                    originalName: fileName,
                                    originalSize: originalSize,
                                    partIndex: i,
                                    totalParts: totalChunks,
                                    isSummary: true,
                                    isSplitSummary: true
                                },
                                createdAt: Date.now()
                            });
                            summarized = true;
                        } catch (chunkError) {
                            retries++;
                            const isRateLimit = chunkError.message?.includes('429') ||
                                chunkError.message?.includes('overloaded') ||
                                chunkError.message?.includes('quota') ||
                                chunkError.message?.includes('RESOURCE_EXHAUSTED');

                            if (isRateLimit && retries < maxRetries) {
                                // Exponential backoff: 5s, 10s, 20s
                                const backoffMs = 5000 * Math.pow(2, retries - 1);
                                setSplitSummarizeProgress({
                                    current: i + 1, total: totalChunks,
                                    currentTitle: `${partTitle} — Đợi ${backoffMs / 1000}s do quá tải API...`
                                });
                                await new Promise(resolve => setTimeout(resolve, backoffMs));
                            } else {
                                // Non-rate-limit error or max retries reached: save original
                                console.error(`Lỗi tóm tắt phần ${i + 1} (lần ${retries}):`, chunkError);
                                results.push({
                                    title: `${partTitle} (Gốc - lỗi tóm tắt)`,
                                    content: chunks[i],
                                    fileInfo: {
                                        originalName: fileName,
                                        originalSize: originalSize,
                                        partIndex: i,
                                        totalParts: totalChunks,
                                        summarizeFailed: true
                                    },
                                    createdAt: Date.now()
                                });
                                summarized = true; // Move on
                            }
                        }
                    }

                    // Generous delay between API calls to avoid rate limiting (3 seconds)
                    if (i < totalChunks - 1) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }

                // Batch add all results to DB at the end
                for (const result of results) {
                    referenceOps.add(result);
                }
            } catch (error) {
                alert('Lỗi khi chia nhỏ và tóm tắt: ' + error.message);
            } finally {
                setIsSummarizing(false);
                setSplitSummarizeProgress(null);
                setFileToSummarize(null);
                setShowSplitOptions(false);
            }
        } else if (decision === 'original') {
            processImport(title, content, fileName, originalSize);
            setFileToSummarize(null);
            setShowSplitOptions(false);
        } else {
            // Cancel
            setFileToSummarize(null);
            setShowSplitOptions(false);
        }
    };

    // Drag and drop handlers...
    const [isDragging, setIsDragging] = useState(false);
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFileImport({ target: { files: e.dataTransfer.files, value: '' } });
    };

    if (!currentStory) return (
        <div className="database-container">
            <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                Vui lòng chọn hoặc tạo truyện trước.
            </p>
        </div>
    );

    return (
        <motion.div
            className="database-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag overlay -- SAME as before */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(138, 80, 255, 0.1)',
                            border: '3px dashed var(--color-primary)', borderRadius: 'var(--radius-xl)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, pointerEvents: 'none'
                        }}
                    >
                        <div style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
                            <Upload size={48} style={{ marginBottom: 'var(--space-md)' }} />
                            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Thả file vào đây</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HEADER */}
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <FileText size={22} className="text-primary" /> Tài liệu tham khảo
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                        ({references.length})
                    </span>
                </h2>
                <div className="flex gap-sm">
                    <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer' }}>
                        {importing ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                        Import file
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT_STRING}
                            multiple
                            onChange={handleFileImport}
                            style={{ display: 'none' }}
                        />
                    </label>
                    <button className="btn btn-primary btn-small" onClick={() => setShowAdd(true)}>
                        <Plus size={16} /> Thêm
                    </button>
                </div>
            </div>

            {/* Summarization Modal/Dialog */}
            <AnimatePresence>
                {fileToSummarize && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                width: '500px', maxWidth: '90%',
                                background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                            }}
                        >
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                <Sparkles size={20} style={{ color: 'var(--color-accent)' }} />
                                Phát hiện file lớn
                            </h3>

                            <div style={{
                                background: 'var(--glass-bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-md)', border: '1px solid var(--glass-border)'
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{fileToSummarize.title}</div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                                    {formatSize(fileToSummarize.originalSize)} • {formatCharCount(fileToSummarize.content.length)} ký tự
                                </div>
                            </div>

                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
                                File này có nội dung khá dài. Bạn có muốn <strong>AI tóm tắt</strong> lại các thông tin quan trọng (nhân vật, bối cảnh, sự kiện) để tiết kiệm dung lượng và giúp AI đọc nhanh hơn không?
                            </p>

                            {isSummarizing ? (
                                <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--color-accent)' }}>
                                    <Loader2 size={24} className="spin" style={{ marginBottom: 'var(--space-sm)' }} />
                                    {splitSummarizeProgress ? (
                                        <>
                                            <div style={{ fontWeight: 600 }}>Đang tóm tắt phần {splitSummarizeProgress.current}/{splitSummarizeProgress.total}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', marginTop: '4px', color: 'var(--color-text-tertiary)' }}>
                                                {splitSummarizeProgress.currentTitle}
                                            </div>
                                            <div style={{
                                                marginTop: 'var(--space-sm)',
                                                height: '4px',
                                                background: 'rgba(255,255,255,0.1)',
                                                borderRadius: '2px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${(splitSummarizeProgress.current / splitSummarizeProgress.total) * 100}%`,
                                                    background: 'var(--gradient-primary)',
                                                    borderRadius: '2px',
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                        </>
                                    ) : (
                                        <div>Đang phân tích và tóm tắt...</div>
                                    )}
                                </div>
                            ) : showSplitOptions ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xs)' }}>
                                        Chọn kích thước mỗi phần:
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                        {[5000, 10000, 20000, 50000].map(size => (
                                            <button
                                                key={size}
                                                className={`btn btn-small ${splitChunkSize === size ? 'btn-primary' : 'btn-secondary'}`}
                                                onClick={() => setSplitChunkSize(size)}
                                                style={{ flex: '1 1 auto', minWidth: '80px' }}
                                            >
                                                {formatCharCount(size)} ký tự
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{
                                        background: 'rgba(139,92,246,0.08)', padding: 'var(--space-sm) var(--space-md)',
                                        borderRadius: 'var(--radius-md)', border: '1px solid rgba(139,92,246,0.15)',
                                        fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center'
                                    }}>
                                        File sẽ được chia thành <strong style={{ color: 'var(--color-primary)' }}>
                                            {Math.ceil(fileToSummarize.content.length / splitChunkSize)} phần
                                        </strong> (~{formatCharCount(splitChunkSize)} ký tự/phần)
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                        <button className="btn btn-primary" onClick={() => handleSummarizeDecision('split-summarize')} disabled={!apiKey} style={{ width: '100%' }} title={!apiKey ? 'Cần API Key' : ''}>
                                            <Sparkles size={16} /> Chia nhỏ + Tóm tắt AI từng phần
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => handleSummarizeDecision('split')} style={{ width: '100%' }}>
                                            <Scissors size={16} /> Chia nhỏ (giữ nguyên nội dung)
                                        </button>
                                        <button className="btn-ghost" onClick={() => setShowSplitOptions(false)} style={{ fontSize: 'var(--font-size-xs)' }}>
                                            ← Quay lại
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleSummarizeDecision('summarize')}
                                        disabled={!apiKey}
                                        title={!apiKey ? "Cần nhập API Key" : ""}
                                    >
                                        <Sparkles size={16} /> Tóm tắt với AI (Khuyên dùng)
                                    </button>

                                    <button className="btn btn-secondary" onClick={() => setShowSplitOptions(true)}>
                                        <Scissors size={16} /> Chia nhỏ thành nhiều phần
                                    </button>

                                    <button className="btn btn-secondary" onClick={() => handleSummarizeDecision('original')}>
                                        <FileText size={16} /> Giữ nguyên bản gốc
                                    </button>

                                    <button className="btn-ghost" onClick={() => handleSummarizeDecision('cancel')} style={{ marginTop: 'var(--space-xs)' }}>
                                        Hủy bỏ
                                    </button>
                                </div>
                            )}

                            {!apiKey && (
                                <div style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', textAlign: 'center' }}>
                                    ⚠️ Chưa có API Key. Vui lòng nhập key để dùng tính năng tóm tắt.
                                </div>
                            )}

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* INFO & LIST (Keep existing logic) */}
            <div style={{
                padding: 'var(--space-sm) var(--space-md)',
                background: 'rgba(139,92,246,0.06)',
                border: '1px solid rgba(139,92,246,0.15)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-md)',
                lineHeight: 1.5,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <FileUp size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <span>Hỗ trợ nhiều định dạng. File {'>'}{formatCharCount(SUMMARIZE_THRESHOLD)} ký tự sẽ được gợi ý tóm tắt hoặc chia nhỏ.</span>
                </div>
            </div>

            {/* Existing lists and Add Form ... */}
            {/* Im reusing the previous render logic for cards, just updating the return statement wrapper */}

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-lg)', background: 'var(--glass-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Tiêu đề</label>
                                <input className="form-input" value={newRef.title} onChange={e => setNewRef(p => ({ ...p, title: e.target.value }))} placeholder="VD: World-building notes..." />
                            </div>
                            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 0 }}>Nội dung</label>
                                    {newRef.content.length > 0 && (
                                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                                            {formatCharCount(newRef.content.length)} ký tự
                                        </span>
                                    )}
                                </div>
                                <textarea className="form-textarea" value={newRef.content} onChange={e => setNewRef(p => ({ ...p, content: e.target.value }))} rows={10} style={{ minHeight: '200px' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAdd(false); setNewRef({ ...emptyRef }); }}><X size={14} /> Hủy</button>
                                <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={!newRef.title.trim() || !newRef.content.trim()}><Plus size={14} /> Thêm</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {references.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center', padding: 'var(--space-3xl)',
                        color: 'var(--color-text-tertiary)', border: '2px dashed var(--glass-border)',
                        borderRadius: 'var(--radius-xl)', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                    <p>Kéo thả file hoặc click để nhập tài liệu</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {references.map((ref, i) => {
                        const isExpanded = expandedCards[ref.id];
                        const charCount = (ref.content || '').length;

                        return (
                            <motion.div key={ref.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                style={{
                                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-lg)', overflow: 'hidden'
                                }}>
                                {editingId === ref.id ? (
                                    <div style={{ padding: 'var(--space-lg)' }}>
                                        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <input className="form-input" value={editData.title} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <textarea className="form-textarea" value={editData.content} onChange={e => setEditData(p => ({ ...p, content: e.target.value }))} rows={10} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                            <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} /></button>
                                            <button className="btn btn-primary btn-small" onClick={() => handleSave(ref.id)}><Save size={14} /> Lưu</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="card-header" onClick={() => toggleCard(ref.id)} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1, minWidth: 0 }}>
                                                {isExpanded ? <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--color-text-tertiary)' }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--color-text-tertiary)' }} />}
                                                {ref.fileInfo?.isSummary ? <Sparkles size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} /> : <FileText size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <span className="card-title">{ref.title}</span>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', display: 'flex', gap: 'var(--space-md)' }}>
                                                        <span>{formatCharCount(charCount)} ký tự</span>
                                                        {ref.fileInfo?.isSummary && <span style={{ color: 'var(--color-accent)' }}>• Được tóm tắt bởi AI</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="card-actions" onClick={e => e.stopPropagation()}>
                                                <button className="btn-icon" onClick={() => handleCopyContent(ref.content)}><Copy size={14} /></button>
                                                <button className="btn-icon" onClick={() => handleEdit(ref)}><Edit3 size={16} /></button>
                                                <button className="btn-icon" onClick={() => { if (window.confirm('Xóa tài liệu này?')) referenceOps.delete(ref.id); }} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                                    <div className="card-content">
                                                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--font-size-sm)', lineHeight: 1.6, color: 'var(--color-text-secondary)', padding: 'var(--space-sm)', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', wordBreak: 'break-word' }}>
                                                            {ref.content}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
