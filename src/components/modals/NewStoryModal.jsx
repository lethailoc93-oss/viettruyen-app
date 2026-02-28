import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { AIService } from '../../services/aiService';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Globe, Users, Layers, CheckCircle,
    ChevronRight, ChevronLeft, Sparkles, X, Palette, Loader2, Wand2, Link, AlertCircle, FileUp
} from 'lucide-react';

const STEPS = [
    { id: 1, label: 'Thông tin cơ bản', icon: BookOpen },
    { id: 2, label: 'Thế giới & Bối cảnh', icon: Globe },
    { id: 3, label: 'Chi tiết Nhân vật chính', icon: Users },
    { id: 4, label: 'Nhân vật & Cốt truyện', icon: Layers }, // Changed icon to differentiate
    { id: 5, label: 'Phong cách & Cấu trúc', icon: Palette },
    { id: 6, label: 'Xác nhận', icon: CheckCircle }
];

const GENRES = [
    // === Thể loại phổ biến ===
    { value: 'fantasy', label: 'Giả tưởng / Fantasy' },
    { value: 'romance', label: 'Tình cảm / Ngôn tình' },
    { value: 'mystery', label: 'Bí ẩn / Trinh thám' },
    { value: 'scifi', label: 'Khoa học viễn tưởng' },
    { value: 'horror', label: 'Kinh dị' },
    { value: 'adventure', label: 'Phiêu lưu' },
    { value: 'historical', label: 'Lịch sử' },
    { value: 'slice_of_life', label: 'Đời thường' },
    { value: 'thriller', label: 'Hồi hộp / Thriller' },
    { value: 'comedy', label: 'Hài hước' },
    { value: 'drama', label: 'Chính kịch' },

    // === Trung Quốc ===
    { value: 'wuxia', label: '🇨🇳 Tiên hiệp / Kiếm hiệp' },
    { value: 'xuanhuan', label: '🇨🇳 Huyền huyễn / Khoa huyền' },
    { value: 'xianxia', label: '🇨🇳 Tiên hiệp chính thống' },
    { value: 'chuyen_khong', label: '🇨🇳 Xuyên không' },
    { value: 'trong_sinh', label: '🇨🇳 Trọng sinh' },
    { value: 'do_thi', label: '🇨🇳 Đô thị' },
    { value: 'cung_dau', label: '🇨🇳 Cung đấu' },

    // === Nhật Bản ===
    { value: 'isekai', label: '🇯🇵 Isekai / Dị giới' },
    { value: 'mecha', label: '🇯🇵 Mecha / Robot' },
    { value: 'mahou_shoujo', label: '🇯🇵 Mahō Shōjo / Phép thuật' },

    // === Hàn Quốc ===
    { value: 'murim', label: '🇰🇷 Murim / Võ lâm Hàn' },
    { value: 'hunter', label: '🇰🇷 Hunter / Thợ săn & Tháp' },
    { value: 'regression', label: '🇰🇷 Hồi quy / Regression' },

    // === Phương Tây (Mỹ / Anh / Pháp) ===
    { value: 'dark_fantasy', label: '🌍 Dark Fantasy' },
    { value: 'urban_fantasy', label: '🌍 Urban Fantasy / Kỳ ảo đô thị' },
    { value: 'cyberpunk', label: '🌍 Cyberpunk' },
    { value: 'steampunk', label: '🌍 Steampunk' },
    { value: 'gothic', label: '🌍 Gothic' },
    { value: 'dystopia', label: '🌍 Dystopia / Phản địa đàng' },
    { value: 'superhero', label: '🌍 Siêu anh hùng' },

    { value: 'other', label: 'Khác' }
];

const WRITING_STYLES = [
    { value: '', label: '— Chọn phong cách —' },
    { value: 'descriptive', label: 'Tả thực chi tiết' },
    { value: 'poetic', label: 'Thơ mộng, lãng mạn' },
    { value: 'fast_paced', label: 'Nhịp nhanh, hành động' },
    { value: 'dialogue_heavy', label: 'Nhiều đối thoại' },
    { value: 'introspective', label: 'Nội tâm, suy tư' },
    { value: 'humorous', label: 'Hài hước, dí dỏm' },
    { value: 'dark', label: 'U tối, kịch tính' },
    { value: 'minimalist', label: 'Tối giản, cô đọng' },
    { value: 'epic', label: 'Hoành tráng, sử thi' },
    { value: 'other', label: 'Khác' }
];

const TARGET_AUDIENCES = [
    { value: '', label: '— Chọn đối tượng —' },
    { value: 'children', label: 'Trẻ em (6-12)' },
    { value: 'teen', label: 'Thanh thiếu niên (13-17)' },
    { value: 'young_adult', label: 'Thanh niên (18-25)' },
    { value: 'adult', label: 'Người trưởng thành (25+)' },
    { value: 'all', label: 'Mọi lứa tuổi' }
];

const OUTPUT_TOKEN_OPTIONS = [
    { value: 2048, label: 'Ngắn (~600 từ | 2048 Tokens)' },
    { value: 4096, label: 'Vừa (~1.200 từ | 4096 Tokens)' },
    { value: 8192, label: 'Dài (~2.500 từ | 8192 Tokens)' },
    { value: 12288, label: 'Rất dài (~3.800 từ | 12288 Tokens)' },
    { value: 16384, label: 'Tối đa (~5.000 từ | 16384 Tokens)' },
    { value: 32768, label: 'Vượt mức (~10.000 từ | 32768 Tokens)' }
];

const NARRATION_POVS = [
    { value: '', label: '— Chọn ngôi kể —' },
    { value: 'first', label: 'Ngôi thứ nhất (Tôi)' },
    { value: 'second', label: 'Ngôi thứ hai (Bạn)' },
    { value: 'third_limited', label: 'Ngôi thứ ba hạn chế' },
    { value: 'third_omni', label: 'Ngôi thứ ba toàn tri' },
    { value: 'multiple', label: 'Đa góc nhìn' }
];

const PACING_OPTIONS = [
    { value: '', label: '— Chọn nhịp truyện —' },
    { value: 'slow', label: 'Chậm rãi, sâu lắng' },
    { value: 'moderate', label: 'Vừa phải, cân bằng' },
    { value: 'fast', label: 'Nhanh, kịch tính' },
    { value: 'varying', label: 'Thay đổi theo arc' }
];

const ENDING_TYPES = [
    { value: '', label: '— Chọn kiểu kết thúc —' },
    { value: 'happy', label: 'Kết thúc có hậu (Happy ending)' },
    { value: 'sad', label: 'Kết thúc buồn (Tragic)' },
    { value: 'open', label: 'Kết thúc mở (Open ending)' },
    { value: 'bittersweet', label: 'Vừa vui vừa buồn (Bittersweet)' },
    { value: 'twist', label: 'Kết thúc bất ngờ (Plot twist)' },
    { value: 'undecided', label: 'Chưa quyết định' }
];

export default function NewStoryModal({ onClose }) {
    const { createStory } = useStory();
    const { getNextKey, isKeySet, selectedModel } = useApiKey();
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [suggestingSection, setSuggestingSection] = useState(null);
    const [suggestModel, setSuggestModel] = useState('gemini-3-flash-preview');

    // Link analysis state
    const [storyUrl, setStoryUrl] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState('');
    const [analysisError, setAnalysisError] = useState('');
    const [linkChapterCount, setLinkChapterCount] = useState(3);
    const [linkDelayMs, setLinkDelayMs] = useState(0);

    // File analysis state
    const [fileAnalyzing, setFileAnalyzing] = useState(false);

    const SUGGEST_MODELS = [
        { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash Preview' },
        { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro Preview' },
        { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ];

    const [formData, setFormData] = useState({
        // Step 1: Basic
        title: '',
        genres: ['fantasy'],
        customGenres: '',
        description: '',
        // Step 2: World
        timePeriod: '',
        mainLocations: '',
        worldRules: '',
        cultivationLevels: '',
        powerSystemDetails: '',
        worldHistory: '',
        factionsRaces: '',
        religionCulture: '',
        economyLife: '',
        technologyLevel: '',
        // Step 3: Protagonist Details
        protagonistName: '',
        protagonistRole: '',
        protagonistStrengths: '',
        protagonistWeaknesses: '',
        protagonistPersonality: '',
        protagonistAppearance: '',
        protagonistBackground: '',
        protagonistGoal: '',
        // Step 4: Characters & Plot
        antagonist: '',
        supportingCharacters: '',
        characterRelationships: '',
        mainConflict: '',
        subConflicts: '',
        plotTwists: '',
        endingType: '',
        // Step 5: Style & Structure
        toneAtmosphere: '',
        mainThemes: '',
        writingStyle: '',
        narrationPov: '',
        pacing: '',
        targetAudience: '',
        inspirations: '',
        specialLanguage: '',
        styleReference: '',
        plannedChapters: '',
        maxOutputTokens: 8192,
        synopsis: ''
    });

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // ═══════════════════════════════════
    // AI SECTION SUGGESTION HANDLER
    // ═══════════════════════════════════
    const handleSectionSuggest = async (sectionName) => {
        if (!isKeySet) return;
        setSuggestingSection(sectionName);
        try {
            const apiKey = getNextKey();
            console.log(`🪄 Section suggest: "${sectionName}" with model "${suggestModel}"`);
            const result = await AIService.suggestStorySection(apiKey, sectionName, formData, { model: suggestModel });
            if (result && typeof result === 'object') {
                setFormData(prev => {
                    const next = { ...prev };
                    for (const [key, val] of Object.entries(result)) {
                        if (val && typeof val === 'string' && val.trim()) {
                            next[key] = val.trim();
                        }
                    }
                    return next;
                });
                console.log(`🪄 Section suggest: Filled ${Object.keys(result).length} fields`);
            }
        } catch (err) {
            console.error('❌ Section suggest error:', err);
        } finally {
            setSuggestingSection(null);
        }
    };

    // Section suggest bar component
    const renderSectionSuggestBar = (sectionName, label) => {
        if (!isKeySet) return null;
        const isLoading = suggestingSection === sectionName;
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', marginBottom: '12px',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px'
            }}>
                <Wand2 size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#a78bfa', flexShrink: 0 }}>Model:</span>
                <select
                    value={suggestModel}
                    onChange={(e) => setSuggestModel(e.target.value)}
                    disabled={!!suggestingSection}
                    style={{
                        padding: '3px 6px', fontSize: '11px',
                        background: 'rgba(30,30,40,0.8)', color: '#e2e8f0',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '4px', outline: 'none',
                        cursor: suggestingSection ? 'wait' : 'pointer'
                    }}
                >
                    {SUGGEST_MODELS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => handleSectionSuggest(sectionName)}
                    disabled={isLoading || !!suggestingSection}
                    style={{
                        marginLeft: 'auto',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '5px 14px', fontSize: '12px', fontWeight: 600,
                        background: isLoading ? 'rgba(139, 92, 246, 0.3)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        color: '#fff',
                        border: 'none', borderRadius: '6px',
                        cursor: isLoading || suggestingSection ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: suggestingSection && !isLoading ? 0.5 : 1
                    }}
                >
                    {isLoading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                    {isLoading ? 'Đang gợi ý...' : `✨ Gợi ý toàn bộ ${label}`}
                </button>
            </div>
        );
    };

    // ═══════════════════════════════════
    // LINK ANALYSIS HANDLER
    // ═══════════════════════════════════
    const handleAnalyzeUrl = async () => {
        if (!storyUrl.trim() || !isKeySet || analyzing) return;
        setAnalyzing(true);
        setAnalysisProgress('🔗 Đang khởi tạo...');
        setAnalysisError('');
        try {
            const apiKey = getNextKey();
            const result = await AIService.analyzeStoryFromUrl(apiKey, storyUrl.trim(), {
                model: suggestModel,
                onProgress: (msg) => setAnalysisProgress(msg),
                chapterCount: linkChapterCount,
                delayMs: linkDelayMs,
            });
            if (result && typeof result === 'object') {
                setFormData(prev => {
                    const next = { ...prev };
                    for (const [key, val] of Object.entries(result)) {
                        if (key === 'genres' && Array.isArray(val) && val.length > 0) {
                            next.genres = val;
                        } else if (val && typeof val === 'string' && val.trim()) {
                            next[key] = val.trim();
                        }
                    }
                    return next;
                });
                setAnalysisProgress(`✅ Đã phân tích và điền ${Object.keys(result).filter(k => result[k]).length} trường!`);
                console.log('🔗 analyzeUrl: Filled fields:', Object.keys(result).filter(k => result[k]));
            }
        } catch (err) {
            console.error('❌ Link analysis error:', err);
            setAnalysisError(err.message || 'Đã xảy ra lỗi khi phân tích link.');
            setAnalysisProgress('');
        } finally {
            setAnalyzing(false);
        }
    };

    // ═══════════════════════════════════
    // FILE ANALYSIS HANDLER (TXT / EPUB)
    // ═══════════════════════════════════
    const handleAnalyzeFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !isKeySet || fileAnalyzing) return;

        // Reset file input so the same file can be re-selected
        event.target.value = '';

        setFileAnalyzing(true);
        setAnalysisProgress('📂 Đang đọc file...');
        setAnalysisError('');

        try {
            let textContent = '';
            const fileName = file.name;
            const ext = fileName.split('.').pop()?.toLowerCase();

            if (ext === 'txt') {
                textContent = await file.text();
            } else if (ext === 'epub') {
                // EPUB is a ZIP containing XHTML files
                setAnalysisProgress('📦 Đang giải nén EPUB...');
                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(file);

                // Find and extract text from content files (XHTML/HTML)
                const textParts = [];
                const entries = Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b));
                for (const [path, zipEntry] of entries) {
                    if (zipEntry.dir) continue;
                    if (/\.(xhtml|html|htm|xml)$/i.test(path) && !/^META-INF/i.test(path) && !/content\.opf$/i.test(path) && !/toc\./i.test(path)) {
                        const html = await zipEntry.async('string');
                        // Strip HTML tags to get plain text
                        const text = html
                            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                            .replace(/<[^>]+>/g, '\n')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();
                        if (text.length > 50) {
                            textParts.push(text);
                        }
                    }
                }
                textContent = textParts.join('\n\n---\n\n');
                if (!textContent || textContent.length < 100) {
                    throw new Error('Không thể trích xuất nội dung từ file EPUB. File có thể bị mã hóa (DRM).');
                }
            } else {
                throw new Error(`Định dạng file .${ext} không được hỗ trợ. Chỉ hỗ trợ .txt và .epub`);
            }

            setAnalysisProgress(`📖 Đã đọc ${(textContent.length / 1000).toFixed(0)}K ký tự. AI đang phân tích...`);

            const apiKey = getNextKey();
            const result = await AIService.analyzeStoryFromFile(apiKey, textContent, {
                model: suggestModel,
                onProgress: (msg) => setAnalysisProgress(msg),
                fileName,
            });

            if (result && typeof result === 'object') {
                setFormData(prev => {
                    const next = { ...prev };
                    for (const [key, val] of Object.entries(result)) {
                        if (key === 'genres' && Array.isArray(val) && val.length > 0) {
                            next.genres = val;
                        } else if (val && typeof val === 'string' && val.trim()) {
                            next[key] = val.trim();
                        }
                    }
                    return next;
                });
                setAnalysisProgress(`✅ Đã phân tích file "${fileName}" và điền ${Object.keys(result).filter(k => result[k]).length} trường!`);
                console.log('📂 analyzeFile: Filled fields:', Object.keys(result).filter(k => result[k]));
            }
        } catch (err) {
            console.error('❌ File analysis error:', err);
            setAnalysisError(err.message || 'Đã xảy ra lỗi khi phân tích file.');
            setAnalysisProgress('');
        } finally {
            setFileAnalyzing(false);
        }
    };

    // ═══════════════════════════════════
    // LEARN WRITING STYLE FROM FILE
    // ═══════════════════════════════════
    const [styleAnalyzing, setStyleAnalyzing] = useState(false);
    const [styleProgress, setStyleProgress] = useState('');

    const handleLearnStyle = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !isKeySet || styleAnalyzing) return;
        event.target.value = '';

        setStyleAnalyzing(true);
        setStyleProgress('📂 Đang đọc file...');

        try {
            let textContent = '';
            const fileName = file.name;
            const ext = fileName.split('.').pop()?.toLowerCase();

            if (ext === 'txt') {
                textContent = await file.text();
            } else if (ext === 'epub') {
                setStyleProgress('📦 Đang giải nén EPUB...');
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
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();
                        if (text.length > 50) textParts.push(text);
                    }
                }
                textContent = textParts.join('\n\n---\n\n');
            } else {
                throw new Error(`Chỉ hỗ trợ .txt và .epub`);
            }

            if (textContent.length < 200) {
                throw new Error('Nội dung file quá ngắn để phân tích văn phong.');
            }

            setStyleProgress(`🎨 AI đang phân tích văn phong từ "${fileName}"...`);

            const apiKey = getNextKey();
            const styleText = await AIService.analyzeWritingStyle(apiKey, textContent, {
                model: suggestModel,
                onProgress: (msg) => setStyleProgress(msg),
                fileName,
            });

            if (styleText) {
                updateField('styleReference', styleText);
                setStyleProgress(`✅ Đã học văn phong từ "${fileName}"!`);
            }
        } catch (err) {
            console.error('❌ Style analysis error:', err);
            setStyleProgress(`❌ ${err.message}`);
        } finally {
            setStyleAnalyzing(false);
        }
    };

    const canGoNext = () => {
        if (currentStep === 1) return formData.title.trim().length > 0;
        return true;
    };

    const totalSteps = STEPS.length;

    const handleNext = () => {
        if (currentStep < totalSteps && canGoNext()) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setDirection(-1);
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (formData.title.trim()) {
            createStory({
                ...formData,
                title: formData.title.trim(),
                plannedChapters: formData.plannedChapters ? parseInt(formData.plannedChapters, 10) : 0,
                maxOutputTokens: formData.maxOutputTokens ? parseInt(formData.maxOutputTokens, 10) : 8192
            });
            onClose();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (currentStep < totalSteps && canGoNext()) handleNext();
            else if (currentStep === totalSteps) handleSubmit();
        }
    };

    const getLabel = (list, val) => list.find(i => i.value === val)?.label || val;

    const slideVariants = {
        enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 })
    };

    // Helper to count filled fields for summary
    const filledWorldFields = [formData.timePeriod, formData.mainLocations, formData.worldRules, formData.cultivationLevels, formData.powerSystemDetails, formData.worldHistory, formData.factionsRaces, formData.religionCulture, formData.economyLife, formData.technologyLevel].filter(Boolean).length;
    const filledOtherCharAndPlotFields = [formData.supportingCharacters, formData.characterRelationships].filter(Boolean).length;
    const filledStyleFields = [formData.toneAtmosphere, formData.mainThemes, formData.writingStyle, formData.narrationPov, formData.pacing, formData.targetAudience, formData.inspirations, formData.specialLanguage, formData.plannedChapters, formData.maxOutputTokens, formData.synopsis, formData.styleReference].filter(Boolean).length;

    return (
        <div className="mca-modal-overlay active" onClick={(e) => { if (e.target.classList?.contains('mca-modal-overlay')) onClose(); }}>
            <div className="mca-modal wizard-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="mca-modal-header">
                    <div className="wizard-header-title">
                        <Sparkles size={22} className="text-primary" />
                        <h3 className="mca-modal-title">Tạo truyện mới</h3>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Step Indicator */}
                <div className="wizard-steps">
                    {STEPS.map((step, i) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        return (
                            <div
                                key={step.id}
                                className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => {
                                    if (isCompleted || step.id <= currentStep) {
                                        setDirection(step.id > currentStep ? 1 : -1);
                                        setCurrentStep(step.id);
                                    }
                                }}
                            >
                                <div className="wizard-step-icon">
                                    {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
                                </div>
                                <span className="wizard-step-label">{step.label}</span>
                                {i < STEPS.length - 1 && <div className={`wizard-step-line ${isCompleted ? 'completed' : ''}`} />}
                            </div>
                        );
                    })}
                </div>

                {/* Step Content */}
                <div className="wizard-content-wrapper" onKeyDown={handleKeyDown}>
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="wizard-content"
                        >
                            {/* ========== STEP 1: Basic Info ========== */}
                            {currentStep === 1 && (
                                <>
                                    <p className="wizard-step-desc">Hãy bắt đầu với những thông tin cơ bản về câu chuyện của bạn.</p>
                                    <div className="form-group">
                                        <label className="form-label">Tên truyện <span className="text-accent">*</span></label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.title}
                                            onChange={(e) => updateField('title', e.target.value)}
                                            placeholder="Nhập tên truyện..."
                                            autoFocus
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Thể loại</label>
                                        <div className="genre-grid">
                                            {GENRES.map(g => (
                                                <button
                                                    key={g.value}
                                                    type="button"
                                                    className={`genre-chip ${formData.genres.includes(g.value) ? 'active' : ''}`}
                                                    onClick={() => {
                                                        const newGenres = formData.genres.includes(g.value)
                                                            ? formData.genres.filter(i => i !== g.value)
                                                            : [...formData.genres, g.value];
                                                        updateField('genres', newGenres);
                                                    }}
                                                >
                                                    {g.label}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Custom genre input when 'Khác' is selected */}
                                        {formData.genres.includes('other') && (
                                            <div style={{ marginTop: '10px' }}>
                                                <label className="form-label" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                                                    Nhập thể loại tùy chỉnh <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(cách nhau bằng dấu phẩy)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.customGenres}
                                                    onChange={(e) => updateField('customGenres', e.target.value)}
                                                    placeholder="VD: Hệ thống, Tu chân, LitRPG, Đồng nhân, Livestream..."
                                                    style={{
                                                        borderColor: 'rgba(139, 92, 246, 0.3)',
                                                        background: 'rgba(139, 92, 246, 0.05)'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Mô tả ngắn</label>
                                        <textarea
                                            className="form-textarea"
                                            value={formData.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            placeholder="Vài dòng mô tả tổng quan về câu chuyện của bạn..."
                                            rows={3}
                                        />
                                    </div>

                                    {/* ─── Link Analysis Section ─── */}
                                    <div className="link-analysis-section">
                                        <div className="link-analysis-header">
                                            <Link size={16} />
                                            <span>📎 Nhập link truyện tham khảo (tùy chọn)</span>
                                        </div>
                                        <div className="link-analysis-desc">
                                            <p>Dán link truyện để AI tự động quét bối cảnh và điền form. Hỗ trợ <strong>sangtacviet</strong> và các trang web khác.</p>
                                            <p className="link-proxy-note" style={{ marginTop: '6px', color: '#fbbf24', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span><strong>Lưu ý:</strong> Cần chạy <strong>App Server (Browser Extension)</strong> để ứng dụng có thể tự động vượt màn chắn Cloudflare và quét nội dung trang web. (Xem mục cài đặt AI & API nếu chưa có)</span>
                                            </p>
                                        </div>
                                        <div className="link-analysis-row">
                                            <input
                                                type="url"
                                                className="form-input link-url-input"
                                                value={storyUrl}
                                                onChange={(e) => { setStoryUrl(e.target.value); setAnalysisError(''); }}
                                                placeholder="https://sangtacviet.vip/truyen/ten-truyen..."
                                                disabled={analyzing}
                                            />
                                            <select
                                                value={suggestModel}
                                                onChange={(e) => setSuggestModel(e.target.value)}
                                                disabled={analyzing}
                                                className="link-model-select"
                                            >
                                                {SUGGEST_MODELS.map(m => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="btn btn-link-analyze"
                                                onClick={handleAnalyzeUrl}
                                                disabled={!storyUrl.trim() || !isKeySet || analyzing}
                                            >
                                                {analyzing
                                                    ? <><Loader2 size={14} className="spin" /> Đang quét...</>
                                                    : <><Sparkles size={14} /> 🔍 Quét & Phân tích</>}
                                            </button>
                                        </div>
                                        {/* Settings row: chapter count & delay */}
                                        <div className="link-settings-row">
                                            <div className="link-setting">
                                                <label>Số chương đọc:</label>
                                                <select
                                                    value={linkChapterCount}
                                                    onChange={(e) => setLinkChapterCount(parseInt(e.target.value, 10))}
                                                    disabled={analyzing}
                                                    className="link-setting-select"
                                                >
                                                    {[1, 2, 3, 5, 7, 10, 15, 20].map(n => (
                                                        <option key={n} value={n}>{n} chương</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="link-setting">
                                                <label>Nghỉ giữa chương:</label>
                                                <select
                                                    value={linkDelayMs}
                                                    onChange={(e) => setLinkDelayMs(parseInt(e.target.value, 10))}
                                                    disabled={analyzing}
                                                    className="link-setting-select"
                                                >
                                                    <option value={0}>Không nghỉ (proxy có sẵn anti-ban)</option>
                                                    <option value={2000}>2 giây</option>
                                                    <option value={3000}>3 giây</option>
                                                    <option value={5000}>5 giây</option>
                                                    <option value={8000}>8 giây</option>
                                                    <option value={10000}>10 giây</option>
                                                    <option value={15000}>15 giây</option>
                                                </select>
                                            </div>
                                        </div>
                                        {/* Progress */}
                                        {analysisProgress && (
                                            <div className="link-analysis-progress">
                                                {(analyzing || fileAnalyzing) && <Loader2 size={14} className="spin" />}
                                                <span>{analysisProgress}</span>
                                            </div>
                                        )}
                                        {/* Error */}
                                        {analysisError && (
                                            <div className="link-analysis-error">
                                                <AlertCircle size={14} />
                                                <span>{analysisError}</span>
                                            </div>
                                        )}
                                        {/* No API key warning */}
                                        {!isKeySet && (
                                            <div className="link-analysis-warning">
                                                ⚠️ Cần cấu hình API key để sử dụng tính năng này
                                            </div>
                                        )}

                                        {/* ─── File Upload Section ─── */}
                                        <div style={{
                                            marginTop: '12px',
                                            paddingTop: '12px',
                                            borderTop: '1px solid rgba(255,255,255,0.08)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <FileUp size={14} />
                                                Hoặc tải file truyện:
                                            </span>
                                            <label
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                                                    background: fileAnalyzing ? 'rgba(59, 130, 246, 0.3)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                    color: '#fff',
                                                    border: 'none', borderRadius: '6px',
                                                    cursor: fileAnalyzing || !isKeySet ? 'not-allowed' : 'pointer',
                                                    opacity: fileAnalyzing || !isKeySet ? 0.5 : 1,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {fileAnalyzing
                                                    ? <><Loader2 size={14} className="spin" /> Đang quét...</>
                                                    : <><FileUp size={14} /> 📂 Chọn file TXT / EPUB</>}
                                                <input
                                                    type="file"
                                                    accept=".txt,.epub"
                                                    onChange={handleAnalyzeFile}
                                                    disabled={fileAnalyzing || !isKeySet}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                                                AI sẽ đọc nội dung và tự điền tất cả các trường
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== STEP 2: World & Setting ========== */}
                            {currentStep === 2 && (
                                <>
                                    <p className="wizard-step-desc">Xây dựng thế giới chi tiết — càng nhiều thông tin, AI càng viết chính xác hơn.</p>
                                    {renderSectionSuggestBar('world', 'Thế giới')}

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">🌍 Không gian & Thời gian</h4>
                                        <div className="wizard-row">
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Thời đại / Kỷ nguyên</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.timePeriod}
                                                    onChange={(e) => updateField('timePeriod', e.target.value)}
                                                    placeholder="VD: Việt Nam thế kỷ 15, Tương lai 3000..."
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Trình độ công nghệ</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.technologyLevel}
                                                    onChange={(e) => updateField('technologyLevel', e.target.value)}
                                                    placeholder="VD: Trung cổ, Hiện đại, Siêu tương lai..."
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Địa điểm chính</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.mainLocations}
                                                onChange={(e) => updateField('mainLocations', e.target.value)}
                                                placeholder="Mô tả các địa điểm quan trọng. VD: Kinh thành Thăng Long với cung điện hoàng gia, khu rừng cấm phía Bắc nơi trú ngụ của yêu quái, ngôi làng ven sông..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">⚙️ Quy tắc & Hệ thống</h4>
                                        <div className="form-group">
                                            <label className="form-label">Hệ thống phép thuật / Sức mạnh đặc biệt</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.worldRules}
                                                onChange={(e) => updateField('worldRules', e.target.value)}
                                                placeholder="Phép thuật hoạt động thế nào? Có giới hạn gì? VD: Phép thuật dựa trên ngũ hành, người dùng mất sinh lực khi sử dụng, chỉ huyết thống đặc biệt mới kích hoạt..."
                                                rows={2}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">🏔️ Phân cấp Cảnh giới / Level</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.cultivationLevels}
                                                onChange={(e) => updateField('cultivationLevels', e.target.value)}
                                                placeholder="Liệt kê các cảnh giới/level từ thấp tới cao. VD:
• Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Đại Thừa → Tiên
• Mỗi cảnh giới chia 9 tầng (Sơ kỳ → Trung kỳ → Hậu kỳ → Đại Viên Mãn)
• Hoặc: F → E → D → C → B → A → S → SS → SSS"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">📋 Chi tiết hệ thống (công dụng & cách dùng)</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.powerSystemDetails}
                                                onChange={(e) => updateField('powerSystemDetails', e.target.value)}
                                                placeholder="Mô tả chi tiết cách hệ thống vận hành. VD:
• Tu luyện: Hấp thu linh khí → ngưng tụ linh lực → đột phá cảnh giới
• Hạn chế: Mỗi lần đột phá có tỷ lệ thất bại, thất bại gây tẩu hỏa nhập ma
• Vật phẩm hỗ trợ: Linh thạch (tiền tệ + tu luyện), Đan dược (hồi phục + đột phá)
• Kỹ năng: Chia thành Thiên - Địa - Huyền - Hoàng, mỗi cấp 3 bậc"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Lịch sử thế giới & Sự kiện quan trọng</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.worldHistory}
                                                onChange={(e) => updateField('worldHistory', e.target.value)}
                                                placeholder="Các sự kiện lịch sử ảnh hưởng đến câu chuyện. VD: 100 năm trước có cuộc Đại Chiến giữa người và ma, dẫn đến hiệp ước ngừng bắn..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">👥 Xã hội & Văn hóa</h4>
                                        <div className="form-group">
                                            <label className="form-label">Chủng tộc / Phe phái / Tổ chức</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.factionsRaces}
                                                onChange={(e) => updateField('factionsRaces', e.target.value)}
                                                placeholder="Các nhóm/phe phái tồn tại trong thế giới. VD: Hội Kiếm Khách, Giáo phái Hắc Ám, Tộc Tiên, Vương quốc phía Nam..."
                                                rows={2}
                                            />
                                        </div>
                                        <div className="wizard-row">
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Tôn giáo / Tín ngưỡng / Văn hóa</label>
                                                <textarea
                                                    className="form-textarea"
                                                    value={formData.religionCulture}
                                                    onChange={(e) => updateField('religionCulture', e.target.value)}
                                                    placeholder="Phong tục, tập quán, đời sống tâm linh..."
                                                    rows={2}
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Kinh tế & Đời sống</label>
                                                <textarea
                                                    className="form-textarea"
                                                    value={formData.economyLife}
                                                    onChange={(e) => updateField('economyLife', e.target.value)}
                                                    placeholder="Sinh kế, tài nguyên, đẳng cấp xã hội..."
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== STEP 3: Protagonist Details ========== */}
                            {currentStep === 3 && (
                                <>
                                    <p className="wizard-step-desc">Xây dựng nhân vật chính chi tiết để tránh tạo ra nhân vật "quá hoàn hảo" (Overpowered).</p>
                                    {renderSectionSuggestBar('protagonist', 'Nhân vật chính')}

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">👤 Thông tin cơ bản</h4>
                                        <div className="wizard-row">
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Tên nhân vật <span className="text-accent">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.protagonistName}
                                                    onChange={(e) => updateField('protagonistName', e.target.value)}
                                                    placeholder="VD: Nguyễn Văn A"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Vai trò / Nghề nghiệp</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.protagonistRole}
                                                    onChange={(e) => updateField('protagonistRole', e.target.value)}
                                                    placeholder="VD: Học sinh, Thợ săn quỷ..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">⚖️ Cân bằng nhân vật</h4>
                                        <div className="wizard-row">
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label text-success">Điểm mạnh / Khả năng đặc biệt</label>
                                                <textarea
                                                    className="form-textarea"
                                                    value={formData.protagonistStrengths}
                                                    onChange={(e) => updateField('protagonistStrengths', e.target.value)}
                                                    placeholder="Sức mạnh, tài năng, ưu điểm..."
                                                    rows={3}
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label text-danger">Điểm yếu / Hạn chế (QUAN TRỌNG)</label>
                                                <textarea
                                                    className="form-textarea"
                                                    value={formData.protagonistWeaknesses}
                                                    onChange={(e) => updateField('protagonistWeaknesses', e.target.value)}
                                                    placeholder="Điểm yếu chí mạng, nỗi sợ, khuyết điểm tính cách... Giúp nhân vật chân thực hơn."
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">🧠 Tâm lý & Bối cảnh</h4>
                                        <div className="form-group">
                                            <label className="form-label">Tính cách & Nội tâm</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.protagonistPersonality}
                                                onChange={(e) => updateField('protagonistPersonality', e.target.value)}
                                                placeholder="Hướng nội/ngoại, dễ nóng giận, trầm tính..."
                                                rows={2}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Mục tiêu tối thượng (Goal)</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.protagonistGoal}
                                                onChange={(e) => updateField('protagonistGoal', e.target.value)}
                                                placeholder="Nhân vật muốn đạt được điều gì nhất?"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== STEP 4: Characters & Plot (Auxiliary) ========== */}
                            {currentStep === 4 && (
                                <>
                                    <p className="wizard-step-desc">Xây dựng các nhân vật khác — chỉ cần giới thiệu cơ bản, các diễn biến sẽ phát triển khi viết truyện.</p>
                                    {renderSectionSuggestBar('characters_plot', 'Nhân vật & Cốt truyện')}

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">🧑 Nhân vật khác</h4>
                                        {/* Removed Protagonist field */}
                                        <div className="form-group">
                                            <label className="form-label">Nhân vật phụ quan trọng (bao gồm phản diện / đối thủ)</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.supportingCharacters}
                                                onChange={(e) => updateField('supportingCharacters', e.target.value)}
                                                placeholder="Liệt kê các nhân vật phụ, phản diện, đối thủ và vai trò. VD: Quách Tĩnh - sư huynh, chính trực, mạnh nhưng chậm. Hoàng Dược Sư - phản diện tiềm ẩn, kỳ tài cô độc. Lan - bạn thân, hài hước, giỏi phép thuật gió."
                                                rows={3}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Mối quan hệ giữa các nhân vật</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.characterRelationships}
                                                onChange={(e) => updateField('characterRelationships', e.target.value)}
                                                placeholder="Mô tả mối quan hệ, liên minh, xung đột giữa nhân vật. VD: Minh & Lan có tình cảm ngầm. Sư phụ Trần thực ra là ông nội Minh."
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== STEP 5: Style & Structure ========== */}
                            {currentStep === 5 && (
                                <>
                                    <p className="wizard-step-desc">Thiết lập phong cách viết và cấu trúc truyện.</p>
                                    {renderSectionSuggestBar('style', 'Phong cách')}

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">🎨 Phong cách & Giọng văn</h4>
                                        <div className="wizard-row">
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Tông giọng / Bầu không khí</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.toneAtmosphere}
                                                    onChange={(e) => updateField('toneAtmosphere', e.target.value)}
                                                    placeholder="VD: U tối, huyền bí, hài hước nhẹ..."
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Chủ đề chính</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.mainThemes}
                                                    onChange={(e) => updateField('mainThemes', e.target.value)}
                                                    placeholder="VD: Tình bạn, sự phản bội, hy sinh..."
                                                />
                                            </div>
                                        </div>
                                        <div className="wizard-row">
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Phong cách viết</label>
                                                <select className="form-select" value={formData.writingStyle} onChange={(e) => updateField('writingStyle', e.target.value)}>
                                                    {WRITING_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Ngôi kể chuyện</label>
                                                <select className="form-select" value={formData.narrationPov} onChange={(e) => updateField('narrationPov', e.target.value)}>
                                                    {NARRATION_POVS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="wizard-row">
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Nhịp độ truyện</label>
                                                <select className="form-select" value={formData.pacing} onChange={(e) => updateField('pacing', e.target.value)}>
                                                    {PACING_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Đối tượng độc giả</label>
                                                <select className="form-select" value={formData.targetAudience} onChange={(e) => updateField('targetAudience', e.target.value)}>
                                                    {TARGET_AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tác phẩm tham khảo / Nguồn cảm hứng</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.inspirations}
                                                onChange={(e) => updateField('inspirations', e.target.value)}
                                                placeholder="VD: Harry Potter, Naruto, Truyện Kiều, Dune..."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Ngôn ngữ / Phương ngữ đặc biệt</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.specialLanguage}
                                                onChange={(e) => updateField('specialLanguage', e.target.value)}
                                                placeholder="VD: Sử dụng ngôn ngữ cổ phong, phương ngữ miền Trung, tiếng lóng đường phố..."
                                            />
                                        </div>
                                    </div>

                                    {/* ─── Style Learning from File ─── */}
                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">📖 Học văn phong từ file mẫu</h4>
                                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
                                            Tải lên file truyện mẫu để AI phân tích và bắt chước cách viết (câu cú, từ vựng, giọng văn, kỹ thuật...)
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                            <label
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '7px 16px', fontSize: '13px', fontWeight: 600,
                                                    background: styleAnalyzing ? 'rgba(168, 85, 247, 0.3)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                                    color: '#fff',
                                                    border: 'none', borderRadius: '8px',
                                                    cursor: styleAnalyzing || !isKeySet ? 'not-allowed' : 'pointer',
                                                    opacity: styleAnalyzing || !isKeySet ? 0.5 : 1,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {styleAnalyzing
                                                    ? <><Loader2 size={14} className="spin" /> Đang phân tích...</>
                                                    : <><FileUp size={14} /> 📂 Chọn file TXT / EPUB</>}
                                                <input
                                                    type="file"
                                                    accept=".txt,.epub"
                                                    onChange={handleLearnStyle}
                                                    disabled={styleAnalyzing || !isKeySet}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            {styleProgress && (
                                                <span style={{ fontSize: '12px', color: styleProgress.startsWith('❌') ? '#f87171' : 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {styleAnalyzing && <Loader2 size={12} className="spin" />}
                                                    {styleProgress}
                                                </span>
                                            )}
                                        </div>
                                        {formData.styleReference && (
                                            <div className="form-group">
                                                <label className="form-label">🎯 Văn phong đã học (có thể chỉnh sửa)</label>
                                                <textarea
                                                    className="form-textarea"
                                                    value={formData.styleReference}
                                                    onChange={(e) => updateField('styleReference', e.target.value)}
                                                    rows={6}
                                                    style={{ fontSize: '12px', lineHeight: '1.5' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => updateField('styleReference', '')}
                                                    style={{
                                                        marginTop: '6px', padding: '4px 10px', fontSize: '11px',
                                                        background: 'rgba(239,68,68,0.15)', color: '#f87171',
                                                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✕ Xóa văn phong đã học
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="wizard-subsection">
                                        <h4 className="wizard-subsection-title">📐 Cấu trúc truyện</h4>
                                        <div className="wizard-row">
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Số chương dự kiến</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={formData.plannedChapters}
                                                    onChange={(e) => updateField('plannedChapters', e.target.value)}
                                                    placeholder="VD: 20"
                                                    min="0"
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Ngân sách Token (Độ dài)</label>
                                                <select className="form-select" value={formData.maxOutputTokens} onChange={(e) => updateField('maxOutputTokens', parseInt(e.target.value, 10))}>
                                                    {OUTPUT_TOKEN_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tóm tắt cốt truyện tổng quan</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.synopsis}
                                                onChange={(e) => updateField('synopsis', e.target.value)}
                                                placeholder="Tóm tắt toàn bộ câu chuyện từ đầu đến cuối, bao gồm các mốc chính và hướng phát triển..."
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== STEP 6: Confirmation ========== */}
                            {currentStep === 6 && (
                                <>
                                    <p className="wizard-step-desc">Kiểm tra lại thông tin trước khi tạo truyện. Bạn có thể quay lại sửa bất cứ lúc nào.</p>
                                    <div className="wizard-summary">
                                        {/* Basic Info */}
                                        <div className="summary-card">
                                            <div className="summary-card-header">📖 Thông tin cơ bản</div>
                                            <div className="summary-section">
                                                <div className="summary-label">Tên truyện</div>
                                                <div className="summary-value highlight">{formData.title}</div>
                                            </div>
                                            <div className="summary-section">
                                                <div className="summary-label">Thể loại</div>
                                                <div className="summary-value">
                                                    {formData.genres.map(g => getLabel(GENRES, g)).join(', ')}
                                                    {formData.customGenres && ` — Tùy chỉnh: ${formData.customGenres}`}
                                                </div>
                                            </div>
                                            {formData.description && (
                                                <div className="summary-section">
                                                    <div className="summary-label">Mô tả</div>
                                                    <div className="summary-value">{formData.description}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* World */}
                                        {filledWorldFields > 0 && (
                                            <div className="summary-card">
                                                <div className="summary-card-header">🌍 Thế giới ({filledWorldFields}/10 mục)</div>
                                                {formData.timePeriod && <SummaryRow label="Thời đại" value={formData.timePeriod} />}
                                                {formData.technologyLevel && <SummaryRow label="Công nghệ" value={formData.technologyLevel} />}
                                                {formData.mainLocations && <SummaryRow label="Địa điểm" value={formData.mainLocations} />}
                                                {formData.worldRules && <SummaryRow label="Hệ thống quy tắc" value={formData.worldRules} />}
                                                {formData.cultivationLevels && <SummaryRow label="Phân cấp cảnh giới" value={formData.cultivationLevels} />}
                                                {formData.powerSystemDetails && <SummaryRow label="Chi tiết hệ thống" value={formData.powerSystemDetails} />}
                                                {formData.worldHistory && <SummaryRow label="Lịch sử" value={formData.worldHistory} />}
                                                {formData.factionsRaces && <SummaryRow label="Phe phái" value={formData.factionsRaces} />}
                                                {formData.religionCulture && <SummaryRow label="Văn hóa" value={formData.religionCulture} />}
                                                {formData.economyLife && <SummaryRow label="Kinh tế" value={formData.economyLife} />}
                                            </div>
                                        )}

                                        {/* Protagonist Summary */}
                                        {(formData.protagonistName || formData.protagonistRole || formData.protagonistStrengths || formData.protagonistWeaknesses || formData.protagonistGoal) && (
                                            <div className="summary-card">
                                                <div className="summary-card-header">👤 Nhân vật chính</div>
                                                {formData.protagonistName && <SummaryRow label="Tên" value={formData.protagonistName} />}
                                                {formData.protagonistRole && <SummaryRow label="Vai trò" value={formData.protagonistRole} />}
                                                {formData.protagonistStrengths && <SummaryRow label="Điểm mạnh" value={formData.protagonistStrengths} />}
                                                {formData.protagonistWeaknesses && <SummaryRow label="Điểm yếu" value={formData.protagonistWeaknesses} />}
                                                {formData.protagonistGoal && <SummaryRow label="Mục tiêu" value={formData.protagonistGoal} />}
                                            </div>
                                        )}

                                        {/* Other Characters & Plot */}
                                        {filledOtherCharAndPlotFields > 0 && (
                                            <div className="summary-card">
                                                <div className="summary-card-header">👥 Nhân vật khác ({filledOtherCharAndPlotFields}/2 mục)</div>
                                                {formData.supportingCharacters && <SummaryRow label="Nhân vật phụ & phản diện" value={formData.supportingCharacters} />}
                                                {formData.characterRelationships && <SummaryRow label="Mối quan hệ" value={formData.characterRelationships} />}
                                            </div>
                                        )}

                                        {/* Style & Structure */}
                                        {filledStyleFields > 0 && (
                                            <div className="summary-card">
                                                <div className="summary-card-header">🎨 Phong cách & Cấu trúc ({filledStyleFields}/11 mục)</div>
                                                {formData.toneAtmosphere && <SummaryRow label="Tông giọng" value={formData.toneAtmosphere} />}
                                                {formData.mainThemes && <SummaryRow label="Chủ đề" value={formData.mainThemes} />}
                                                {formData.writingStyle && <SummaryRow label="Phong cách" value={getLabel(WRITING_STYLES, formData.writingStyle)} />}
                                                {formData.narrationPov && <SummaryRow label="Ngôi kể" value={getLabel(NARRATION_POVS, formData.narrationPov)} />}
                                                {formData.pacing && <SummaryRow label="Nhịp độ" value={getLabel(PACING_OPTIONS, formData.pacing)} />}
                                                {formData.targetAudience && <SummaryRow label="Đối tượng" value={getLabel(TARGET_AUDIENCES, formData.targetAudience)} />}
                                                {formData.inspirations && <SummaryRow label="Tham khảo" value={formData.inspirations} />}
                                                {formData.specialLanguage && <SummaryRow label="Ngôn ngữ" value={formData.specialLanguage} />}
                                                {formData.styleReference && <SummaryRow label="📖 Văn phong tham khảo" value={formData.styleReference.slice(0, 200) + '...'} />}
                                                {formData.plannedChapters && <SummaryRow label="Số chương" value={`${formData.plannedChapters} chương`} />}
                                                {formData.maxOutputTokens && <SummaryRow label="Ngân sách Token" value={getLabel(OUTPUT_TOKEN_OPTIONS, formData.maxOutputTokens)} />}
                                                {formData.synopsis && <SummaryRow label="Tóm tắt" value={formData.synopsis} />}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Navigation */}
                <div className="mca-modal-footer wizard-footer">
                    <div className="wizard-footer-left">
                        {currentStep > 1 && (
                            <button type="button" className="btn btn-secondary" onClick={handleBack}>
                                <ChevronLeft size={16} /> Quay lại
                            </button>
                        )}
                    </div>
                    <div className="wizard-footer-right">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        {currentStep < totalSteps ? (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleNext}
                                disabled={!canGoNext()}
                            >
                                Tiếp theo <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary btn-create"
                                onClick={handleSubmit}
                            >
                                <Sparkles size={16} /> Tạo truyện
                            </button>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}

function SummaryRow({ label, value }) {
    return (
        <div className="summary-section">
            <div className="summary-label">{label}</div>
            <div className="summary-value">{value}</div>
        </div>
    );
}
