import React, { useState, useEffect, useRef } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import { ShieldAlert, ScrollText, Save, Check, Gauge, Database, Sparkles, Palette, Swords, Ban, FileUp, Loader2, Trash2, Eye, EyeOff, BookOpen, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { STYLE_TEMPLATES } from '../../services/styleTemplates';
import { DIFFICULTY_LEVELS } from '../../services/storyDifficulty';
import { buildGenreDefaults } from '../../services/genreDefaults';
import { useApiKey } from '../../context/ApiKeyContext';
import { AIService } from '../../services/aiService';
import { parsePresetFile } from '../../utils/importExportUtils';
import { AUTHOR_PROFILES } from '../../services/authorStyleProfiles';
import { DESCRIPTOR_CATEGORIES } from '../../services/descriptorLibrary';

const OUTPUT_PRESETS = [
    { label: 'Ngắn', value: 2048 },
    { label: 'Vừa', value: 4096 },
    { label: 'Dài', value: 8192 },
    { label: 'Rất dài', value: 12288 },
    { label: 'Tối đa', value: 16384 },
    { label: 'Vượt mức', value: 32768 },
];

const INPUT_PRESETS = [
    { label: 'Tiết kiệm', value: 4000 },
    { label: 'Cơ bản', value: 12000 },
    { label: 'Mở rộng', value: 50000 },
    { label: 'Khổng lồ', value: 200000 },
    { label: 'Tối đa (1M)', value: 1000000 },
];

// ═══════════════════════════════════════════════
// Style Learning Library sub-component
// ═══════════════════════════════════════════════
function StyleLibrarySection({ currentStory, updateStoryField, isKeySet, getNextKey }) {
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const styleLibrary = currentStory?.styleLibrary || [];

    const handleLearnFromFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !isKeySet || analyzing) return;
        event.target.value = '';

        setAnalyzing(true);
        setProgress('📂 Đang đọc file...');

        try {
            let textContent = '';
            const fileName = file.name;
            const ext = fileName.split('.').pop()?.toLowerCase();

            if (ext === 'txt') {
                textContent = await file.text();
            } else if (ext === 'epub') {
                setProgress('📦 Đang giải nén EPUB...');
                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(file);
                const textParts = [];
                const entries = Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b));
                for (const [path, zipEntry] of entries) {
                    if (zipEntry.dir) continue;
                    if (/\.(xhtml|html|htm|xml)$/i.test(path) && !/^META-INF/i.test(path) && !/content\.opf$/i.test(path) && !/toc\./i.test(path)) {
                        const html = await zipEntry.async('string');
                        const text = html
                            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                            .replace(/<[^>]+>/g, '\n')
                            .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
                            .replace(/\n{3,}/g, '\n\n').trim();
                        if (text.length > 50) textParts.push(text);
                    }
                }
                textContent = textParts.join('\n\n---\n\n');
            } else {
                throw new Error('Chỉ hỗ trợ .txt và .epub');
            }

            if (textContent.length < 200) throw new Error('File quá ngắn để phân tích văn phong.');

            setProgress(`🎨 AI đang phân tích văn phong từ "${fileName}"...`);

            const apiKey = getNextKey();
            const styleText = await AIService.analyzeWritingStyle(apiKey, textContent, {
                model: 'gemini-3-flash-preview',
                onProgress: (msg) => setProgress(msg),
                fileName,
            });

            if (styleText) {
                const newEntry = {
                    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    fileName,
                    learnedAt: new Date().toISOString(),
                    charCount: textContent.length,
                    knowledgeLength: styleText.length,
                    content: styleText,
                };
                updateStoryField('styleLibrary', [...styleLibrary, newEntry]);
                setProgress(`✅ Đã học văn phong từ "${fileName}"!`);
                setTimeout(() => setProgress(''), 3000);
            }
        } catch (err) {
            console.error('❌ Style learn error:', err);
            setProgress(`❌ ${err.message}`);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleDelete = (id) => {
        updateStoryField('styleLibrary', styleLibrary.filter(e => e.id !== id));
    };

    const formatDate = (iso) => {
        try { return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return iso; }
    };

    const formatSize = (chars) => {
        if (chars >= 1000000) return `${(chars / 1000000).toFixed(1)}M`;
        if (chars >= 1000) return `${(chars / 1000).toFixed(0)}K`;
        return `${chars}`;
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, hsla(270, 70%, 50%, 0.08), hsla(200, 80%, 50%, 0.08))',
            border: '1px solid hsla(270, 70%, 50%, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md)',
            marginTop: 'var(--space-lg)',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)', color: 'hsl(270, 70%, 65%)'
            }}>
                <BookOpen size={18} />
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                    📖 Kho Văn Phong (Style Library)
                </h3>
                <span style={{
                    marginLeft: 'auto', fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-tertiary)', fontWeight: 400
                }}>
                    {styleLibrary.length} mẫu đã học
                </span>
            </div>
            <p style={{
                color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)',
                marginBottom: 'var(--space-md)', lineHeight: 1.4
            }}>
                Upload file truyện mẫu để AI <strong>phân tích và học cách viết</strong> (nhịp điệu, cấu trúc câu, giọng văn, kỹ thuật dẫn dắt...).
                Tất cả mẫu đã học sẽ được inject vào prompt khi AI viết truyện.
            </p>

            {/* Upload Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 18px', fontSize: 'var(--font-size-sm)', fontWeight: 600,
                    background: analyzing ? 'rgba(168, 85, 247, 0.3)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                    cursor: analyzing || !isKeySet ? 'not-allowed' : 'pointer',
                    opacity: analyzing || !isKeySet ? 0.5 : 1,
                    transition: 'all 0.2s', boxShadow: '0 2px 8px hsla(270, 70%, 50%, 0.3)'
                }}>
                    {analyzing
                        ? <><Loader2 size={15} className="spin" /> Đang phân tích...</>
                        : <><FileUp size={15} /> Tải file TXT / EPUB</>}
                    <input
                        type="file" accept=".txt,.epub"
                        onChange={handleLearnFromFile}
                        disabled={analyzing || !isKeySet}
                        style={{ display: 'none' }}
                    />
                </label>
                {progress && (
                    <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: progress.startsWith('❌') ? '#f87171' : 'rgba(255,255,255,0.6)',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        {analyzing && <Loader2 size={12} className="spin" />}
                        {progress}
                    </span>
                )}
            </div>

            {/* Learned Files List */}
            {styleLibrary.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {styleLibrary.map((entry) => (
                        <div key={entry.id} style={{
                            background: 'var(--glass-bg)',
                            border: expandedId === entry.id ? '1px solid hsl(270, 60%, 50%)' : '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden', transition: 'border-color 0.2s'
                        }}>
                            {/* Header row */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 12px', cursor: 'pointer'
                            }} onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                                <BookOpen size={14} style={{ color: 'hsl(270, 60%, 65%)', flexShrink: 0 }} />
                                <span style={{
                                    flex: 1, fontSize: 'var(--font-size-sm)', fontWeight: 600,
                                    color: 'var(--color-text-primary)', overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {entry.fileName}
                                </span>
                                <span style={{
                                    fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {formatSize(entry.charCount)} ký tự
                                </span>
                                <span style={{
                                    fontSize: 'var(--font-size-xs)', color: 'hsl(270, 60%, 65%)',
                                    whiteSpace: 'nowrap', fontWeight: 600
                                }}>
                                    {formatSize(entry.knowledgeLength)} kiến thức
                                </span>
                                <span style={{
                                    fontSize: '10px', color: 'var(--color-text-tertiary)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {formatDate(entry.learnedAt)}
                                </span>
                                {expandedId === entry.id ? <EyeOff size={14} style={{ color: 'var(--color-text-tertiary)' }} /> : <Eye size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                    title="Xóa mẫu này"
                                    style={{
                                        padding: '4px', background: 'none', border: 'none',
                                        color: 'hsl(0, 70%, 60%)', cursor: 'pointer', borderRadius: '4px',
                                        transition: 'background 0.15s'
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Expanded content */}
                            {expandedId === entry.id && (
                                <div style={{
                                    padding: '0 12px 12px',
                                    borderTop: '1px solid var(--glass-border)'
                                }}>
                                    <pre style={{
                                        margin: '10px 0 0', padding: '10px',
                                        background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)',
                                        lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                        maxHeight: '300px', overflow: 'auto'
                                    }}>
                                        {entry.content}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {styleLibrary.length === 0 && !analyzing && (
                <div style={{
                    padding: 'var(--space-lg)', textAlign: 'center',
                    color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)',
                    background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--glass-border)'
                }}>
                    📚 Chưa có mẫu văn phong nào. Upload file truyện để AI bắt đầu học!
                </div>
            )}

            {!isKeySet && (
                <div style={{
                    marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-xs)',
                    color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    ⚠️ Cần cấu hình API key để sử dụng tính năng này
                </div>
            )}
        </div>
    );
}

export default React.memo(function StoryRules() {
    const { currentStory } = useStoryState();
    const { updateStoryRules, updateStoryField } = useStoryDispatch();
    const { getNextKey, isKeySet } = useApiKey();
    const [prohibitions, setProhibitions] = useState('');
    const [globalDirective, setGlobalDirective] = useState('');
    const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
    const [maxInputTokens, setMaxInputTokens] = useState(12000);
    const [autoApplyPrinciples, setAutoApplyPrinciples] = useState(true);
    const [allowNSFW, setAllowNSFW] = useState(false);
    const [styleTemplate, setStyleTemplate] = useState('');
    const [difficulty, setDifficulty] = useState('balanced');
    const [antiClicheText, setAntiClicheText] = useState('');
    const [customStyleInstruction, setCustomStyleInstruction] = useState('');
    const [enableMontage, setEnableMontage] = useState(false);
    const [enableFlashback, setEnableFlashback] = useState(false);
    const [foreshadowHint, setForeshadowHint] = useState('');
    const [foreshadowTarget, setForeshadowTarget] = useState('');
    const [enableSensory, setEnableSensory] = useState(false);
    const [enableDynamicNpc, setEnableDynamicNpc] = useState(false);
    const [enableMultiPov, setEnableMultiPov] = useState(false);
    const [enableFetish, setEnableFetish] = useState(false);
    const [enableShowDontSmell, setEnableShowDontSmell] = useState(false);
    const [enableAntiGeminism, setEnableAntiGeminism] = useState(false);
    const [enableSlowBurn, setEnableSlowBurn] = useState(false);
    const [authorProfile, setAuthorProfile] = useState('');
    const [customAuthorInstruction, setCustomAuthorInstruction] = useState('');
    const [descriptorCategories, setDescriptorCategories] = useState([]);
    const [customAvoidListText, setCustomAvoidListText] = useState('');
    const [saveStatus, setSaveStatus] = useState('saved');
    const saveTimerRef = useRef(null);

    useEffect(() => {
        setProhibitions(currentStory?.prohibitions || '');
        setGlobalDirective(currentStory?.globalDirective || '');
        setMaxOutputTokens(currentStory?.maxOutputTokens || 8192);
        setMaxInputTokens(currentStory?.maxInputTokens || 12000);
        setAutoApplyPrinciples(currentStory?.autoApplyPrinciples !== false);
        setAllowNSFW(currentStory?.allowNSFW || false);
        setStyleTemplate(currentStory?.styleTemplate || '');
        setDifficulty(currentStory?.difficulty || 'balanced');
        setAntiClicheText((currentStory?.antiCliches || []).join('\n'));
        setCustomStyleInstruction(currentStory?.customStyleInstruction || '');
        setEnableMontage(currentStory?.enableMontage || false);
        setEnableFlashback(currentStory?.enableFlashback || false);
        setEnableSensory(currentStory?.enableSensory || false);
        setEnableDynamicNpc(currentStory?.enableDynamicNpc || false);
        setEnableMultiPov(currentStory?.enableMultiPov || false);
        setEnableFetish(currentStory?.enableFetish || false);
        setEnableShowDontSmell(currentStory?.enableShowDontSmell || false);
        setEnableAntiGeminism(currentStory?.enableAntiGeminism || false);
        setEnableSlowBurn(currentStory?.enableSlowBurn || false);
        setAuthorProfile(currentStory?.authorProfile || '');
        setCustomAuthorInstruction(currentStory?.customAuthorInstruction || '');
        setDescriptorCategories(currentStory?.descriptorCategories || []);
        setCustomAvoidListText((currentStory?.customAvoidList || []).join('\n'));
        setSaveStatus('saved');
    }, [currentStory?.id]);

    // Collect all current values into save call
    const doSave = (overrides = {}) => {
        const vals = {
            prohibitions, globalDirective, maxOutputTokens, maxInputTokens,
            autoApplyPrinciples, allowNSFW, styleTemplate, difficulty,
            antiClicheText, customStyleInstruction, enableMontage, enableFlashback,
            authorProfile, customAuthorInstruction, descriptorCategories, customAvoidListText,
            enableSensory, enableDynamicNpc, enableMultiPov, enableFetish, enableShowDontSmell, enableAntiGeminism, enableSlowBurn, ...overrides
        };
        const antiCliches = vals.antiClicheText.split('\n').map(l => l.trim()).filter(Boolean);
        const customAvoidList = vals.customAvoidListText.split('\n').map(l => l.trim()).filter(Boolean);
        updateStoryRules({
            prohibitions: vals.prohibitions, globalDirective: vals.globalDirective,
            maxOutputTokens: vals.maxOutputTokens, maxInputTokens: vals.maxInputTokens,
            autoApplyPrinciples: vals.autoApplyPrinciples, allowNSFW: vals.allowNSFW,
            styleTemplate: vals.styleTemplate, difficulty: vals.difficulty,
            antiCliches, customStyleInstruction: vals.customStyleInstruction,
            enableMontage: vals.enableMontage, enableFlashback: vals.enableFlashback,
            enableSensory: vals.enableSensory, enableDynamicNpc: vals.enableDynamicNpc,
            enableMultiPov: vals.enableMultiPov, enableFetish: vals.enableFetish,
            enableShowDontSmell: vals.enableShowDontSmell, enableAntiGeminism: vals.enableAntiGeminism,
            enableSlowBurn: vals.enableSlowBurn,
            authorProfile: vals.authorProfile, customAuthorInstruction: vals.customAuthorInstruction,
            descriptorCategories: vals.descriptorCategories, customAvoidList
        });
    };

    const triggerAutoSave = (overrides = {}) => {
        setSaveStatus('unsaved');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            doSave(overrides);
            setSaveStatus('saving');
            setTimeout(() => setSaveStatus('saved'), 600);
        }, 1500);
    };

    const handleProhibitionsChange = (val) => { setProhibitions(val); triggerAutoSave({ prohibitions: val }); };
    const handleDirectiveChange = (val) => { setGlobalDirective(val); triggerAutoSave({ globalDirective: val }); };
    const handleOutputTokenChange = (val) => { const v = Number(val); setMaxOutputTokens(v); triggerAutoSave({ maxOutputTokens: v }); };
    const handleInputTokenChange = (val) => { const v = Number(val); setMaxInputTokens(v); triggerAutoSave({ maxInputTokens: v }); };
    const handlePrinciplesToggle = () => { const v = !autoApplyPrinciples; setAutoApplyPrinciples(v); triggerAutoSave({ autoApplyPrinciples: v }); };
    const handleNSFWToggle = () => { const v = !allowNSFW; setAllowNSFW(v); triggerAutoSave({ allowNSFW: v }); };
    const handleStyleChange = (id) => { setStyleTemplate(id); triggerAutoSave({ styleTemplate: id }); };
    const handleDifficultyChange = (id) => { setDifficulty(id); triggerAutoSave({ difficulty: id }); };
    const handleAntiClicheChange = (val) => { setAntiClicheText(val); triggerAutoSave({ antiClicheText: val }); };
    const handleCustomStyleChange = (val) => { setCustomStyleInstruction(val); triggerAutoSave({ customStyleInstruction: val }); };
    const handleMontageToggle = () => { const v = !enableMontage; setEnableMontage(v); triggerAutoSave({ enableMontage: v }); };
    const handleFlashbackToggle = () => { const v = !enableFlashback; setEnableFlashback(v); triggerAutoSave({ enableFlashback: v }); };
    const handleSensoryToggle = () => { const v = !enableSensory; setEnableSensory(v); triggerAutoSave({ enableSensory: v }); };
    const handleDynamicNpcToggle = () => { const v = !enableDynamicNpc; setEnableDynamicNpc(v); triggerAutoSave({ enableDynamicNpc: v }); };
    const handleMultiPovToggle = () => { const v = !enableMultiPov; setEnableMultiPov(v); triggerAutoSave({ enableMultiPov: v }); };
    const handleFetishToggle = () => { const v = !enableFetish; setEnableFetish(v); triggerAutoSave({ enableFetish: v }); };
    const handleShowDontSmellToggle = () => { const v = !enableShowDontSmell; setEnableShowDontSmell(v); triggerAutoSave({ enableShowDontSmell: v }); };
    const handleAntiGeminismToggle = () => { const v = !enableAntiGeminism; setEnableAntiGeminism(v); triggerAutoSave({ enableAntiGeminism: v }); };
    const handleSlowBurnToggle = () => { const v = !enableSlowBurn; setEnableSlowBurn(v); triggerAutoSave({ enableSlowBurn: v }); };
    const handleAuthorProfileChange = (id) => { setAuthorProfile(id); triggerAutoSave({ authorProfile: id }); };
    const handleCustomAuthorChange = (val) => { setCustomAuthorInstruction(val); triggerAutoSave({ customAuthorInstruction: val }); };
    const handleDescriptorToggle = (catId) => {
        const newCats = descriptorCategories.includes(catId)
            ? descriptorCategories.filter(c => c !== catId)
            : [...descriptorCategories, catId];
        setDescriptorCategories(newCats);
        triggerAutoSave({ descriptorCategories: newCats });
    };
    const handleCustomAvoidListChange = (val) => { setCustomAvoidListText(val); triggerAutoSave({ customAvoidListText: val }); };

    const { foreshadowingOps } = useStoryDispatch();
    const foreshadowings = currentStory?.database?.foreshadowings || [];
    const handleAddForeshadow = () => {
        if (!foreshadowHint.trim()) return;
        const currentChapterNum = (currentStory?.database?.chapters?.length || 0);
        foreshadowingOps.add({
            name: foreshadowHint.trim(),
            hint: foreshadowHint.trim(),
            targetEvent: foreshadowTarget.trim() || '',
            plantedChapter: currentChapterNum || 1,
            status: 'active'
        });
        setForeshadowHint('');
        setForeshadowTarget('');
    };
    const handleResolveForeshadow = (id) => { foreshadowingOps.update(id, { status: 'resolved' }); };
    const handleDeleteForeshadow = (id) => { foreshadowingOps.delete(id); };

    // Genre-based auto-defaults
    const handleApplyGenreDefaults = () => {
        const defaults = buildGenreDefaults(currentStory);
        if (defaults.styleTemplate) {
            setStyleTemplate(defaults.styleTemplate);
        }
        setDifficulty(defaults.difficulty);
        const newAntiCliche = defaults.antiCliches.join('\n');
        setAntiClicheText(newAntiCliche);
        triggerAutoSave({
            styleTemplate: defaults.styleTemplate || styleTemplate,
            difficulty: defaults.difficulty,
            antiClicheText: newAntiCliche
        });
    };

    const handleSave = () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        doSave();
        setSaveStatus('saving');
        setTimeout(() => setSaveStatus('saved'), 600);
    };

    const handleImportPreset = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const preset = await parsePresetFile(file);

                let overrides = {};
                let messages = [];

                if (preset.data.globalDirective) {
                    const currentDir = globalDirective;
                    const newDir = currentDir ? currentDir + '\n\n' + preset.data.globalDirective : preset.data.globalDirective;
                    setGlobalDirective(newDir);
                    overrides.globalDirective = newDir;
                    messages.push('Chỉ thị viết (System Prompt/Instruct)');
                }

                if (preset.data.maxOutputTokens) {
                    // Cap at our limits
                    let val = Math.min(Math.max(preset.data.maxOutputTokens, 1024), 32768);
                    setMaxOutputTokens(val);
                    overrides.maxOutputTokens = val;
                    messages.push(`Output Tokens (${val})`);
                }

                if (preset.data.maxInputTokens) {
                    let val = Math.min(Math.max(preset.data.maxInputTokens, 2000), 1000000);
                    setMaxInputTokens(val);
                    overrides.maxInputTokens = val;
                    messages.push(`Input Tokens (${val})`);
                }

                if (Object.keys(overrides).length > 0) {
                    triggerAutoSave(overrides);
                    alert(`✅ Đã nhập Preset AI thành công!\nCác thông số được cập nhật:\n- ${messages.join('\n- ')}`);
                } else {
                    alert('⚠️ Không tìm thấy dữ liệu phù hợp trong file Preset này.');
                }

            } catch (err) {
                alert('Lỗi nhập Preset: ' + err.message);
            }
        };
        input.click();
    };

    const estimateWords = (tokens) => {
        const low = Math.round(tokens / 3.5);
        const high = Math.round(tokens / 2.8);
        return `~${low.toLocaleString()}-${high.toLocaleString()}`;
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

    const TokenSlider = ({ label, icon: Icon, color, value, onChange, presets, min, max, step, defaultVal, description }) => (
        <div style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
                color
            }}>
                <Icon size={18} />
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                    {label}
                </h3>
            </div>
            <p style={{
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-xs)',
                marginBottom: 'var(--space-md)',
                lineHeight: 1.4
            }}>
                {description}
            </p>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: 'var(--space-sm)' }}>
                {presets.map(p => (
                    <button
                        key={p.value}
                        onClick={() => onChange(p.value)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: value === p.value ? `2px solid ${color}` : '1px solid var(--glass-border)',
                            background: value === p.value ? `${color}22` : 'var(--glass-bg)',
                            color: value === p.value ? color : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: value === p.value ? 700 : 400,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{ flex: 1, accentColor: color }}
                />
                <span style={{
                    fontFamily: 'monospace',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 700,
                    color,
                    minWidth: '80px',
                    textAlign: 'right'
                }}>
                    {value.toLocaleString()}
                </span>
            </div>

            <div style={{
                marginTop: '6px',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>Ước tính: <strong>{estimateWords(value)}</strong> từ tiếng Việt</span>
                <span style={{ opacity: 0.6 }}>Mặc định: {defaultVal.toLocaleString()}</span>
            </div>
        </div>
    );

    return (
        <motion.div
            className="database-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <ShieldAlert size={22} className="text-primary" />
                    Quy tắc AI toàn truyện
                </h2>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary btn-small" onClick={handleImportPreset} title="Nhập file cấu hình AI (Instruct, Context, API Settings)">
                        <Upload size={16} /> Nhập Preset AI
                    </button>
                    <button className="btn btn-primary btn-small" onClick={handleSave}>
                        {saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />}
                        {saveStatus === 'saved' ? 'Đã lưu' : saveStatus === 'saving' ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>

            <p style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--space-lg)',
                lineHeight: 1.5
            }}>
                Các quy tắc này sẽ được áp dụng cho <strong>TẤT CẢ</strong> thao tác AI: viết chương, lập dàn ý, chat, gợi ý.
            </p>

            {/* Output Token Limit */}
            <TokenSlider
                label="⚡ Ngân sách Token Output"
                icon={Gauge}
                color="hsl(160, 80%, 50%)"
                value={maxOutputTokens}
                onChange={handleOutputTokenChange}
                presets={OUTPUT_PRESETS}
                min={1024}
                max={32768}
                step={512}
                defaultVal={8192}
                description="Số token tối đa AI được phép trả về. Token cao hơn = AI viết dài và chi tiết hơn, nhưng tốn nhiều thời gian hơn."
            />

            {/* Input Token Limit */}
            <TokenSlider
                label="📥 Ngân sách Token Input (RAG Context)"
                icon={Database}
                color="hsl(220, 80%, 60%)"
                value={maxInputTokens}
                onChange={handleInputTokenChange}
                presets={INPUT_PRESETS}
                min={2000}
                max={1000000}
                step={2000}
                defaultVal={12000}
                description="Lượng dữ liệu ngữ cảnh (nhân vật, chương trước, bối cảnh, tài liệu) gửi cho AI. Cao hơn = AI có nhiều thông tin hơn để suy nghĩ, nhưng tốn token hơn."
            />

            {/* Auto-Apply Genre Defaults */}
            {currentStory?.genres?.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, hsla(280, 70%, 60%, 0.08), hsla(190, 80%, 55%, 0.08))',
                    border: '1px solid hsla(280, 70%, 60%, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-md)',
                    marginBottom: 'var(--space-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-md)',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                            marginBottom: '4px', color: 'hsl(280, 70%, 60%)', fontWeight: 600,
                            fontSize: 'var(--font-size-sm)'
                        }}>
                            ✨ Gợi ý tự động từ thể loại
                        </div>
                        <p style={{
                            margin: 0, color: 'var(--color-text-tertiary)',
                            fontSize: 'var(--font-size-xs)', lineHeight: 1.4
                        }}>
                            Tự động điền phong cách văn, độ khó, và quy tắc chống sáo mòn dựa trên thể loại:{' '}
                            <strong style={{ color: 'var(--color-text-secondary)' }}>
                                {currentStory.genres.join(', ')}
                            </strong>
                        </p>
                    </div>
                    <button
                        onClick={handleApplyGenreDefaults}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'linear-gradient(135deg, hsl(280, 70%, 55%), hsl(190, 80%, 50%))',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 'var(--font-size-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px hsla(280, 70%, 55%, 0.3)'
                        }}
                    >
                        ✨ Áp dụng gợi ý
                    </button>
                </div>
            )}

            {/* Style Template Selector */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)',
                    color: 'hsl(280, 70%, 60%)'
                }}>
                    <Palette size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        🎨 Phong cách văn
                    </h3>
                </div>
                <p style={{
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--font-size-xs)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.4
                }}>
                    Chọn phong cách văn để AI viết theo. Inject vào system prompt cho mọi thao tác AI.
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => handleStyleChange('')}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: !styleTemplate ? '2px solid hsl(280, 70%, 60%)' : '1px solid var(--glass-border)',
                            background: !styleTemplate ? 'hsla(280, 70%, 60%, 0.12)' : 'var(--glass-bg)',
                            color: !styleTemplate ? 'hsl(280, 70%, 60%)' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: !styleTemplate ? 700 : 400,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        🔄 Mặc định
                    </button>
                    {STYLE_TEMPLATES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleStyleChange(t.id)}
                            title={t.description}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 'var(--radius-md)',
                                border: styleTemplate === t.id ? '2px solid hsl(280, 70%, 60%)' : '1px solid var(--glass-border)',
                                background: styleTemplate === t.id ? 'hsla(280, 70%, 60%, 0.12)' : 'var(--glass-bg)',
                                color: styleTemplate === t.id ? 'hsl(280, 70%, 60%)' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: styleTemplate === t.id ? 700 : 400,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {t.icon} {t.name}
                        </button>
                    ))}
                </div>
                {styleTemplate && (
                    <div style={{
                        marginTop: 'var(--space-sm)',
                        padding: 'var(--space-sm)',
                        background: 'hsla(280, 70%, 60%, 0.06)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5
                    }}>
                        <strong>{STYLE_TEMPLATES.find(t => t.id === styleTemplate)?.icon} {STYLE_TEMPLATES.find(t => t.id === styleTemplate)?.name}:</strong>{' '}
                        {STYLE_TEMPLATES.find(t => t.id === styleTemplate)?.description}
                    </div>
                )}
                {styleTemplate === 'custom' && (
                    <textarea
                        className="editor-textarea"
                        value={customStyleInstruction}
                        onChange={(e) => handleCustomStyleChange(e.target.value)}
                        placeholder="Mô tả phong cách văn tùy chỉnh của bạn..."
                        style={{
                            minHeight: '80px',
                            marginTop: 'var(--space-sm)',
                            fontFamily: 'var(--font-family-primary)',
                            fontSize: 'var(--font-size-sm)',
                            borderColor: 'hsl(280, 60%, 40%, 0.3)',
                        }}
                    />
                )}
            </div>

            {/* Author Style Profile Selector */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)', color: 'hsl(200, 80%, 55%)'
                }}>
                    <Sparkles size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        ✍️ Hồ sơ tác giả
                    </h3>
                </div>
                <p style={{
                    color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)',
                    marginBottom: 'var(--space-md)', lineHeight: 1.4
                }}>
                    Chọn phong cách tác giả để AI viết theo. Mỗi hồ sơ chứa hướng dẫn chi tiết về cấu trúc câu, đối thoại, miêu tả, và từ vựng đặc trưng.
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => handleAuthorProfileChange('')}
                        style={{
                            padding: '8px 14px', borderRadius: 'var(--radius-md)',
                            border: !authorProfile ? '2px solid hsl(200, 80%, 55%)' : '1px solid var(--glass-border)',
                            background: !authorProfile ? 'hsla(200, 80%, 55%, 0.12)' : 'var(--glass-bg)',
                            color: !authorProfile ? 'hsl(200, 80%, 55%)' : 'var(--color-text-secondary)',
                            cursor: 'pointer', fontSize: 'var(--font-size-xs)',
                            fontWeight: !authorProfile ? 700 : 400, transition: 'all 0.15s ease'
                        }}
                    >
                        🔄 Không chọn
                    </button>
                    {AUTHOR_PROFILES.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleAuthorProfileChange(p.id)}
                            title={`${p.name} — ${p.era}`}
                            style={{
                                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                                border: authorProfile === p.id ? '2px solid hsl(200, 80%, 55%)' : '1px solid var(--glass-border)',
                                background: authorProfile === p.id ? 'hsla(200, 80%, 55%, 0.12)' : 'var(--glass-bg)',
                                color: authorProfile === p.id ? 'hsl(200, 80%, 55%)' : 'var(--color-text-secondary)',
                                cursor: 'pointer', fontSize: 'var(--font-size-xs)',
                                fontWeight: authorProfile === p.id ? 700 : 400, transition: 'all 0.15s ease'
                            }}
                        >
                            {p.icon} {p.name}
                        </button>
                    ))}
                    <button
                        onClick={() => handleAuthorProfileChange('custom')}
                        title="Tự định nghĩa phong cách riêng"
                        style={{
                            padding: '8px 14px', borderRadius: 'var(--radius-md)',
                            border: authorProfile === 'custom' ? '2px solid hsl(200, 80%, 55%)' : '1px solid var(--glass-border)',
                            background: authorProfile === 'custom' ? 'hsla(200, 80%, 55%, 0.12)' : 'var(--glass-bg)',
                            color: authorProfile === 'custom' ? 'hsl(200, 80%, 55%)' : 'var(--color-text-secondary)',
                            cursor: 'pointer', fontSize: 'var(--font-size-xs)',
                            fontWeight: authorProfile === 'custom' ? 700 : 400, transition: 'all 0.15s ease'
                        }}
                    >
                        ✏️ Tùy chỉnh
                    </button>
                </div>
                {authorProfile && authorProfile !== 'custom' && (() => {
                    const p = AUTHOR_PROFILES.find(a => a.id === authorProfile);
                    if (!p) return null;
                    return (
                        <div style={{
                            marginTop: 'var(--space-sm)', padding: 'var(--space-sm)',
                            background: 'hsla(200, 80%, 55%, 0.06)', borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6
                        }}>
                            <strong>{p.icon} {p.name}</strong> — {p.era}<br />
                            📝 Câu: {p.sentenceStyle}<br />
                            💬 Đối thoại: {p.dialogueStyle?.slice(0, 80)}...
                        </div>
                    );
                })()}
                {authorProfile === 'custom' && (
                    <textarea
                        className="editor-textarea"
                        value={customAuthorInstruction}
                        onChange={(e) => handleCustomAuthorChange(e.target.value)}
                        placeholder="Mô tả phong cách tác giả tùy chỉnh của bạn...\n\nVí dụ:\n- Câu ngắn, nhịp nhanh\n- Đối thoại sắc bén, ít mô tả\n- Kết thúc chương bằng cliffhanger"
                        style={{
                            minHeight: '80px', marginTop: 'var(--space-sm)',
                            fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-sm)',
                            borderColor: 'hsl(200, 60%, 40%, 0.3)'
                        }}
                    />
                )}
            </div>

            {/* Descriptor Optimization */}
            <div style={{
                background: 'linear-gradient(135deg, hsla(330, 70%, 50%, 0.08), hsla(30, 90%, 55%, 0.08))',
                border: '1px solid hsla(330, 70%, 50%, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)', color: 'hsl(330, 70%, 60%)'
                }}>
                    <Sparkles size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        🎯 Tối ưu mô tả (Descriptor Optimizer)
                    </h3>
                </div>
                <p style={{
                    color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)',
                    marginBottom: 'var(--space-md)', lineHeight: 1.4
                }}>
                    Bật các hạng mục để AI nhận <strong>hướng dẫn mô tả đa dạng</strong> + danh sách sáo ngữ cần tránh. Hệ thống tự động phát hiện loại cảnh đang viết và inject instruction phù hợp.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                    {DESCRIPTOR_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleDescriptorToggle(cat.id)}
                            title={cat.clicheList.slice(0, 3).map(c => `"${c}"`).join(', ') + '...'}
                            style={{
                                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                                border: descriptorCategories.includes(cat.id)
                                    ? '2px solid hsl(330, 70%, 60%)'
                                    : '1px solid var(--glass-border)',
                                background: descriptorCategories.includes(cat.id)
                                    ? 'hsla(330, 70%, 60%, 0.12)'
                                    : 'var(--glass-bg)',
                                color: descriptorCategories.includes(cat.id)
                                    ? 'hsl(330, 70%, 60%)'
                                    : 'var(--color-text-secondary)',
                                cursor: 'pointer', fontSize: 'var(--font-size-xs)',
                                fontWeight: descriptorCategories.includes(cat.id) ? 700 : 400,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {cat.icon} {cat.label.split(' — ')[0]}
                        </button>
                    ))}
                </div>
                {descriptorCategories.length > 0 && (
                    <div style={{
                        padding: 'var(--space-sm)', background: 'hsla(330, 70%, 60%, 0.06)',
                        borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)', lineHeight: 1.5
                    }}>
                        ✅ Đang bật <strong>{descriptorCategories.length}</strong> hạng mục. AI sẽ nhận hướng dẫn mô tả đa dạng + danh sách cụm từ cần tránh cho mỗi hạng mục.
                    </div>
                )}

                {/* Custom Avoid List */}
                <div style={{ marginTop: 'var(--space-md)' }}>
                    <label style={{
                        fontSize: 'var(--font-size-xs)', fontWeight: 600,
                        color: 'hsl(330, 70%, 60%)', display: 'block', marginBottom: '4px'
                    }}>
                        🚫 Cụm từ tùy chỉnh cần tránh
                    </label>
                    <textarea
                        className="editor-textarea"
                        value={customAvoidListText}
                        onChange={(e) => handleCustomAvoidListChange(e.target.value)}
                        placeholder={'Mỗi dòng một cụm từ AI không nên dùng...\n\nVí dụ:\ntrắng như tuyết\nnhũ hoa hồng\nký ức ùa về'}
                        style={{
                            minHeight: '60px', fontFamily: 'var(--font-family-primary)',
                            fontSize: 'var(--font-size-sm)',
                            borderColor: 'hsl(330, 60%, 40%, 0.3)'
                        }}
                    />
                </div>
            </div>

            {/* Difficulty Selector */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)',
                    color: 'hsl(30, 90%, 55%)'
                }}>
                    <Swords size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        ⚔️ Độ khó câu chuyện
                    </h3>
                </div>
                <p style={{
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--font-size-xs)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.4
                }}>
                    Ảnh hưởng cách AI xử lý chiến thắng, thất bại, và hậu quả.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {DIFFICULTY_LEVELS.map(d => (
                        <button
                            key={d.id}
                            onClick={() => handleDifficultyChange(d.id)}
                            title={d.description}
                            style={{
                                flex: '1 1 120px',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-md)',
                                border: difficulty === d.id ? '2px solid hsl(30, 90%, 55%)' : '1px solid var(--glass-border)',
                                background: difficulty === d.id ? 'hsla(30, 90%, 55%, 0.12)' : 'var(--glass-bg)',
                                color: difficulty === d.id ? 'hsl(30, 90%, 55%)' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: difficulty === d.id ? 700 : 400,
                                transition: 'all 0.15s ease',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '1.2em', marginBottom: '2px' }}>{d.icon}</div>
                            {d.name}
                        </button>
                    ))}
                </div>
                {difficulty && difficulty !== 'balanced' && (
                    <div style={{
                        marginTop: 'var(--space-sm)',
                        padding: 'var(--space-sm)',
                        background: 'hsla(30, 90%, 55%, 0.06)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5
                    }}>
                        <strong>{DIFFICULTY_LEVELS.find(l => l.id === difficulty)?.icon} {DIFFICULTY_LEVELS.find(l => l.id === difficulty)?.name}:</strong>{' '}
                        {DIFFICULTY_LEVELS.find(l => l.id === difficulty)?.description}
                    </div>
                )}
            </div>

            {/* Anti-Cliché Rules */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)',
                    color: 'hsl(45, 90%, 55%)'
                }}>
                    <Ban size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        🚫 Chống sáo mòn (Anti-Cliché)
                    </h3>
                </div>
                <p style={{
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--font-size-xs)',
                    marginBottom: 'var(--space-sm)',
                    lineHeight: 1.4
                }}>
                    Liệt kê những kiểu viết/cliché bạn <strong>KHÔNG muốn AI viết</strong>. Mỗi dòng = 1 quy tắc.
                </p>
                <textarea
                    className="editor-textarea"
                    value={antiClicheText}
                    onChange={(e) => handleAntiClicheChange(e.target.value)}
                    placeholder={"Nhập mỗi dòng một kiểu viết cần tránh...\n\nVí dụ:\nKhông kết đoạn bằng câu triết lý\nKhông dùng \"ánh mắt sắc như dao\"\nKhông viết \"toàn thân run rẩy\"\nKhông để nhân vật chính luôn thắng"}
                    style={{
                        minHeight: '100px',
                        fontFamily: 'var(--font-family-primary)',
                        fontSize: 'var(--font-size-sm)',
                        borderColor: 'hsl(45, 60%, 40%, 0.3)',
                    }}
                />
                {antiClicheText.trim() && (
                    <div style={{
                        marginTop: 'var(--space-xs)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)'
                    }}>
                        {antiClicheText.split('\n').filter(l => l.trim()).length} quy tắc chống sáo mòn
                    </div>
                )}
            </div>

            {/* Prohibitions */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)',
                    color: 'hsl(0, 80%, 60%)'
                }}>
                    <ShieldAlert size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        🚫 Khung cấm
                    </h3>
                </div>
                <p style={{
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--font-size-xs)',
                    marginBottom: 'var(--space-sm)',
                    lineHeight: 1.4
                }}>
                    Những điều AI <strong>KHÔNG ĐƯỢC LÀM</strong> khi viết truyện này.
                    <br />
                    <em>Ví dụ: "Không viết cảnh máu me quá mức", "Không cho nhân vật A chết"...</em>
                </p>
                <textarea
                    className="editor-textarea"
                    value={prohibitions}
                    onChange={(e) => handleProhibitionsChange(e.target.value)}
                    placeholder={"Nhập các điều cấm cho AI, mỗi dòng một điều cấm...\n\nVí dụ:\n- Không được giết nhân vật chính\n- Không viết cảnh tình cảm quá mức\n- Không dùng văn phong tiên hiệp"}
                    style={{
                        minHeight: '120px',
                        fontFamily: 'var(--font-family-primary)',
                        fontSize: 'var(--font-size-sm)',
                        borderColor: 'hsl(0, 60%, 40%, 0.3)',
                    }}
                />
            </div>

            {/* Global Directives */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)',
                    color: 'hsl(220, 80%, 60%)'
                }}>
                    <ScrollText size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        📋 Chỉ thị viết
                    </h3>
                </div>
                <p style={{
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--font-size-xs)',
                    marginBottom: 'var(--space-sm)',
                    lineHeight: 1.4
                }}>
                    Các yêu cầu AI <strong>PHẢI TUÂN THỦ</strong> khi viết.
                    <br />
                    <em>Ví dụ: "Viết theo phong cách noir", "Giữ nhịp độ nhanh"...</em>
                </p>
                <textarea
                    className="editor-textarea"
                    value={globalDirective}
                    onChange={(e) => handleDirectiveChange(e.target.value)}
                    placeholder={"Nhập các chỉ thị cho AI, mỗi dòng một yêu cầu...\n\nVí dụ:\n- Viết văn phong hiện đại, tự nhiên\n- Đối thoại phải sắc bén, ngắn gọn\n- Mỗi chương kết thúc bằng cliffhanger"}
                    style={{
                        minHeight: '120px',
                        fontFamily: 'var(--font-family-primary)',
                        fontSize: 'var(--font-size-sm)',
                        borderColor: 'hsl(220, 60%, 40%, 0.3)',
                    }}
                />
            </div>

            {/* Montage & Flashback Toggles */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginTop: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)',
                    color: 'hsl(190, 80%, 55%)'
                }}>
                    <ScrollText size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        🎬 Kỹ thuật tự sự
                    </h3>
                </div>

                {/* Montage Toggle */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 'var(--space-md)', marginBottom: 'var(--space-md)'
                }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>📐 Montage song song</strong>
                        <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                            Xen kẽ cảnh ngắn cho thấy sự kiện ở nơi khác khi nhân vật chính vắng mặt.
                        </p>
                    </div>
                    <button
                        onClick={handleMontageToggle}
                        style={{
                            width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                            cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                            background: enableMontage ? 'hsl(190, 80%, 55%)' : 'var(--glass-border)', flexShrink: 0
                        }}
                    >
                        <span style={{
                            display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                            background: '#fff', position: 'absolute', top: '3px',
                            left: enableMontage ? '27px' : '3px', transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>

                {/* Flashback Toggle */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 'var(--space-md)'
                }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>🕰️ Hồi ức (Flashback)</strong>
                        <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                            AI xen kẽ đoạn hồi ức ngắn khi hành vi nhân vật cần giải thích sâu hơn.
                        </p>
                    </div>
                    <button
                        onClick={handleFlashbackToggle}
                        style={{
                            width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                            cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                            background: enableFlashback ? 'hsl(190, 80%, 55%)' : 'var(--glass-border)', flexShrink: 0
                        }}
                    >
                        <span style={{
                            display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                            background: '#fff', position: 'absolute', top: '3px',
                            left: enableFlashback ? '27px' : '3px', transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>

                {/* Sensory Toggle */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 'var(--space-md)', marginTop: 'var(--space-md)'
                }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>👁 Mô tả Ngũ giác (Show, don't tell)</strong>
                        <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                            Buộc AI dùng 5 giác quan và hành động để lột tả trạng thái, hạn chế kể lể cảm xúc trực tiếp. (Từ preset Thần Mèo)
                        </p>
                    </div>
                    <button
                        onClick={handleSensoryToggle}
                        style={{
                            width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                            cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                            background: enableSensory ? 'hsl(190, 80%, 55%)' : 'var(--glass-border)', flexShrink: 0
                        }}
                    >
                        <span style={{
                            display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                            background: '#fff', position: 'absolute', top: '3px',
                            left: enableSensory ? '27px' : '3px', transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>

                {/* DynamicNPC Toggle */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 'var(--space-md)', marginTop: 'var(--space-md)'
                }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>👥 Thế giới động (NPC Background)</strong>
                        <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                            AI ngầm phát triển cốt truyện cho các nhân vật không xuất hiện trong cảnh hiện tại để thế giới sống động hơn.
                        </p>
                    </div>
                    <button
                        onClick={handleDynamicNpcToggle}
                        style={{
                            width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                            cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                            background: enableDynamicNpc ? 'hsl(190, 80%, 55%)' : 'var(--glass-border)', flexShrink: 0
                        }}
                    >
                        <span style={{
                            display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                            background: '#fff', position: 'absolute', top: '3px',
                            left: enableDynamicNpc ? '27px' : '3px', transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>

                {/* MultiPov Toggle */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 'var(--space-md)', marginTop: 'var(--space-md)'
                }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>🔄 Đa góc nhìn (Multi-POV)</strong>
                        <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                            Cảnh chuyển mượt mà giữa các tuyến nhân vật khác nhau, tránh việc khóa góc nhìn chỉ ở một người.
                        </p>
                    </div>
                    <button
                        onClick={handleMultiPovToggle}
                        style={{
                            width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                            cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                            background: enableMultiPov ? 'hsl(190, 80%, 55%)' : 'var(--glass-border)', flexShrink: 0
                        }}
                    >
                        <span style={{
                            display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                            background: '#fff', position: 'absolute', top: '3px',
                            left: enableMultiPov ? '27px' : '3px', transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>

                {/* Slow Burn Toggle */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 'var(--space-md)', marginTop: 'var(--space-md)'
                }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>⏳ Tiến triển chậm (Slow Burn & Realistic)</strong>
                        <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                            Buộc AI tuân thủ logic nhân quả chặt chẽ. Xây dựng diễn biến tâm lý, tình cảm/thù hận từ từ qua nhiều sự kiện, tránh nhảy cóc bứt phá vô lý.
                        </p>
                    </div>
                    <button
                        onClick={handleSlowBurnToggle}
                        style={{
                            width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                            cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                            background: enableSlowBurn ? 'hsl(190, 80%, 55%)' : 'var(--glass-border)', flexShrink: 0
                        }}
                    >
                        <span style={{
                            display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                            background: '#fff', position: 'absolute', top: '3px',
                            left: enableSlowBurn ? '27px' : '3px', transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>
            </div>

            {/* Show Dont Smell Toggle */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 'var(--space-md)', marginTop: 'var(--space-md)'
            }}>
                <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>🚫 Hạn chế Khứu giác (Show, don't smell)</strong>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                        Buộc AI miêu tả nguồn gốc vật lý của mùi hương thay vì gọi tên trực tiếp các mùi rập khuôn.
                    </p>
                </div>
                <button
                    onClick={handleShowDontSmellToggle}
                    style={{
                        width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                        cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                        background: enableShowDontSmell ? 'hsl(190, 80%, 55%)' : 'var(--glass-border)', flexShrink: 0
                    }}
                >
                    <span style={{
                        display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                        background: '#fff', position: 'absolute', top: '3px',
                        left: enableShowDontSmell ? '27px' : '3px', transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                </button>
            </div>

            {/* Anti Geminism Toggle */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 'var(--space-md)', marginTop: 'var(--space-md)'
            }}>
                <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>🤖 Chống ngôn từ AI (Anti-Geminism)</strong>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                        Chặn triệt để các cụm từ sáo rỗng thường thấy của AI (ví dụ: "shivers down spine", "air crackled").
                    </p>
                </div>
                <button
                    onClick={handleAntiGeminismToggle}
                    style={{
                        width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                        cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                        background: enableAntiGeminism ? 'hsl(190, 80%, 55%)' : 'var(--glass-border)', flexShrink: 0
                    }}
                >
                    <span style={{
                        display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                        background: '#fff', position: 'absolute', top: '3px',
                        left: enableAntiGeminism ? '27px' : '3px', transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                </button>
            </div>

            {/* Foreshadowing Manager */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginTop: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)',
                    color: 'hsl(140, 70%, 50%)'
                }}>
                    <Sparkles size={18} />
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        🌱 Phục bút (Foreshadowing)
                    </h3>
                </div>
                <p style={{
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--font-size-xs)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.4
                }}>
                    Quản lý những "hạt giống" đã gieo trong truyện. AI sẽ gợi ý manh mối khi bối cảnh phù hợp.
                </p>

                {/* Quick Add */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: 'var(--space-sm)' }}>
                    <input
                        type="text"
                        value={foreshadowHint}
                        onChange={(e) => setForeshadowHint(e.target.value)}
                        placeholder="Manh mối đã gieo (VD: vết sẹo bí ẩn)"
                        style={{
                            flex: 2, padding: '8px 12px',
                            background: 'var(--color-bg-primary)', border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                            fontSize: 'var(--font-size-xs)'
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddForeshadow()}
                    />
                    <input
                        type="text"
                        value={foreshadowTarget}
                        onChange={(e) => setForeshadowTarget(e.target.value)}
                        placeholder="Mục tiêu kích hoạt (tùy chọn)"
                        style={{
                            flex: 2, padding: '8px 12px',
                            background: 'var(--color-bg-primary)', border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                            fontSize: 'var(--font-size-xs)'
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddForeshadow()}
                    />
                    <button
                        onClick={handleAddForeshadow}
                        disabled={!foreshadowHint.trim()}
                        style={{
                            padding: '8px 16px', borderRadius: 'var(--radius-md)',
                            border: 'none', cursor: foreshadowHint.trim() ? 'pointer' : 'not-allowed',
                            background: foreshadowHint.trim() ? 'hsl(140, 70%, 50%)' : 'var(--glass-border)',
                            color: '#fff', fontSize: 'var(--font-size-xs)', fontWeight: 600,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        + Thêm
                    </button>
                </div>

                {/* Existing Seeds */}
                {foreshadowings.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {foreshadowings.map(f => (
                            <div key={f.id} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '6px 10px', borderRadius: 'var(--radius-md)',
                                background: f.status === 'resolved' ? 'hsla(0,0%,50%,0.08)' : 'hsla(140, 70%, 50%, 0.06)',
                                fontSize: 'var(--font-size-xs)',
                                opacity: f.status === 'resolved' ? 0.5 : 1
                            }}>
                                <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>
                                    {f.status === 'resolved' ? '✅' : '🌱'} {f.hint || f.name}
                                    {f.targetEvent && <span style={{ color: 'var(--color-text-tertiary)' }}> → {f.targetEvent}</span>}
                                    {f.plantedChapter && <span style={{ color: 'var(--color-text-tertiary)' }}> (ch.{f.plantedChapter})</span>}
                                </span>
                                {f.status !== 'resolved' && (
                                    <button onClick={() => handleResolveForeshadow(f.id)} title="Đánh dấu đã kích hoạt"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'hsl(140, 70%, 50%)', fontSize: '14px' }}>
                                        ✅
                                    </button>
                                )}
                                <button onClick={() => handleDeleteForeshadow(f.id)} title="Xóa"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'hsl(0, 70%, 60%)', fontSize: '14px' }}>
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {foreshadowings.length === 0 && (
                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', fontStyle: 'italic', margin: 0 }}>
                        Chưa có phục bút nào. Thêm manh mối bạn đã gieo trong truyện để AI nhận biết.
                    </p>
                )}
            </div>

            {/* Auto-Apply Writing Principles Toggle */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginTop: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-md)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                        <Sparkles size={18} style={{ color: 'hsl(45, 90%, 55%)' }} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'hsl(45, 90%, 55%)' }}>
                                ✨ Tự động áp dụng nguyên lý viết
                            </h3>
                            <p style={{
                                margin: '4px 0 0',
                                color: 'var(--color-text-tertiary)',
                                fontSize: 'var(--font-size-xs)',
                                lineHeight: 1.4
                            }}>
                                AI tự động nhận diện loại cảnh và áp dụng nguyên lý viết phù hợp.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handlePrinciplesToggle}
                        style={{
                            width: '52px',
                            height: '28px',
                            borderRadius: '14px',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s ease',
                            background: autoApplyPrinciples ? 'hsl(45, 90%, 55%)' : 'var(--glass-border)',
                            flexShrink: 0
                        }}
                    >
                        <span style={{
                            display: 'block',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: autoApplyPrinciples ? '27px' : '3px',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>
                {autoApplyPrinciples && (
                    <div style={{
                        marginTop: 'var(--space-sm)',
                        padding: 'var(--space-sm)',
                        background: 'hsla(45, 90%, 55%, 0.08)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5
                    }}>
                        <strong>Đang hoạt động:</strong> AI sẽ chọn 3-5 nguyên lý phù hợp cho từng đoạn viết:
                        <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                            <li>⚔️ chiến đấu, 💬 đối thoại, 🧠 nội tâm, 🎨 mô tả, 💕 lãng mạn...</li>
                            <li>Genre-specific boosting theo thể loại truyện</li>
                            <li>Nhịp độ và phong cách viết phù hợp ngữ cảnh</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* NSFW Toggle */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                marginTop: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-md)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                        <ShieldAlert size={18} style={{ color: 'hsl(340, 80%, 60%)' }} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'hsl(340, 80%, 60%)' }}>
                                🔞 Cho phép nội dung người lớn (NSFW)
                            </h3>
                            <p style={{
                                margin: '4px 0 0',
                                color: 'var(--color-text-tertiary)',
                                fontSize: 'var(--font-size-xs)',
                                lineHeight: 1.4
                            }}>
                                Cho phép AI mô tả chi tiết nhạy cảm khi phù hợp với bối cảnh truyện.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleNSFWToggle}
                        style={{
                            width: '52px',
                            height: '28px',
                            borderRadius: '14px',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s ease',
                            background: allowNSFW ? 'hsl(340, 80%, 60%)' : 'var(--glass-border)',
                            flexShrink: 0
                        }}
                    >
                        <span style={{
                            display: 'block',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: allowNSFW ? '27px' : '3px',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>
                {allowNSFW && (
                    <div style={{
                        marginTop: 'var(--space-md)',
                        paddingTop: 'var(--space-md)',
                        borderTop: '1px solid hsla(340, 80%, 60%, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                            <div style={{ width: 18 }}></div>
                            <div>
                                <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>🔥 Fetish & Sensations</strong>
                                <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                                    Buộc AI miêu tả luân phiên và chi tiết các phản ứng sinh lý mạnh mẽ/bên trong cơ thể.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleFetishToggle}
                            style={{
                                width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                                cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                                background: enableFetish ? 'hsl(340, 80%, 60%)' : 'var(--glass-border)', flexShrink: 0
                            }}
                        >
                            <span style={{
                                display: 'block', width: '22px', height: '22px', borderRadius: '50%',
                                background: '#fff', position: 'absolute', top: '3px',
                                left: enableFetish ? '27px' : '3px', transition: 'left 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }} />
                        </button>
                    </div>
                )}
            </div>

            {/* ═══════════ Style Learning Library ═══════════ */}
            <StyleLibrarySection
                currentStory={currentStory}
                updateStoryField={updateStoryField}
                isKeySet={isKeySet}
                getNextKey={getNextKey}
            />
        </motion.div >
    );
});
