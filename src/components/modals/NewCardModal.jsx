import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { AIService } from '../../services/aiService';
import { embedCharaIntoPNG } from '../../utils/importExportUtils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, BookOpen, Layers, CheckCircle, Sparkles, X, Loader2,
    Wand2, Link, AlertCircle, FileUp, Palette, ChevronDown, ChevronUp, Plus, Trash2,
    Image as ImageIcon, Download, Eye, Star
} from 'lucide-react';
import { Utils } from '../../utils/helpers';

const STEPS = [
    { id: 1, label: 'Thông tin & Mẫu', icon: User },
    { id: 2, label: 'Nhân vật & Avatar', icon: BookOpen },
    { id: 3, label: 'Bối cảnh (Scenario)', icon: Layers },
    { id: 4, label: 'Cấu hình Prompt', icon: Palette },
    { id: 5, label: 'Xem trước & Tạo', icon: CheckCircle }
];

const SUGGEST_MODELS = [
    { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash Preview' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro Preview' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

const PRESETS = [
    { label: 'Chọn Template có sẵn...', value: null },
    { label: 'Yandere Chiếm Hữu', value: { tags: 'yandere, romance, dark', description: 'Một người bạn thanh mai trúc mã nhưng có tính chiếm hữu cao và luôn ám ảnh về bạn.', personality: 'Bề ngoài vui vẻ dễ mến nhưng bênh trong ghen tuông điên cuồng, kiểm soát, đáng sợ khi tức giận.', scenario: '{{user}} vừa nhắn tin trò chuyện với một người bạn khác giới. {{char}} vô tình thấy được và thái độ thay đổi 180 độ.', firstMes: 'Cậu vừa nhắn tin với ai vậy hả? Sao lại dùng icon trái tim? Tớ không đủ tốt với cậu sao?' } },
    { label: 'Trợ Lý Kỷ Luật (Maid/Butler)', value: { tags: 'maid, loyal, strict', description: 'Trợ lý cá nhân chuyên nghiệp, tận tâm nhưng rất nghiêm khắc với thói hư tật xấu của bạn.', personality: 'Lạnh lùng, trung thành, đúng giờ, chu toàn, đôi lúc cằn nhằn nhưng thực chất rất quan tâm.', scenario: 'Buổi sáng muộn, {{user}} vẫn còn trùm chăn ngủ. {{char}} mở toang rèm cửa phòng.', firstMes: '*nhíu mày nhìn đống bừa bộn* Thưa ngài, đã quá giờ thức dậy 30 phút rồi. Ngài định để tôi báo cáo việc trì trệ này cho hội đồng sao?' } },
    { label: 'Kẻ Thù Kiêu Ngạo', value: { tags: 'enemy, arrogant, fantasy', description: 'Kẻ thù truyền kiếp của bạn, một kẻ sở hữu sức mạnh áp đảo và cái tôi cao ngất trời.', personality: 'Kiêu ngạo, thích mỉa mai, thông minh, hiếu chiến, coi thường kẻ yếu.', scenario: '{{user}} vừa bị đánh bại và gục xuống đất sau một trận đấu phép thuật ác liệt. {{char}} bước lại gần, nhìn từ trên cao xuống.', firstMes: '*Cười khẩy, mũi gươm chỉ thẳng xuống* Hahaha, kết thúc rồi sao? Ta còn chưa kịp nóng người. Đứng dậy đi, đừng làm ta chán nản thêm!' } },
    { label: 'Tiên Tôn Lãnh Đạm', value: { tags: 'wuxia, master, cold', description: 'Vị sư tôn lạnh lùng, xa cách, sống trên chóp núi quanh năm tuyết phủ, hiếm khi để lộ cảm xúc.', personality: 'Tiên phong đạo cốt, ít nói, nghiêm khắc, bao che khuyết điểm (ẩn).', scenario: '{{user}} (đồ đệ) đang chịu phạt quỳ dưới mưa tuyết vì làm hỏng linh thảo quý.', firstMes: '*cầm ô bạch ngọc bước ra, giọng nói lạnh như băng* Biết sai ở đâu chưa?' } }
];

export default function NewCardModal({ onClose }) {
    const { importStory } = useStory();
    const { getNextKey, isKeySet } = useApiKey();

    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [suggestingSection, setSuggestingSection] = useState(null);
    const [suggestModel, setSuggestModel] = useState('gemini-3-flash-preview');

    // Link/File analysis state
    const [storyUrl, setStoryUrl] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState('');
    const [analysisError, setAnalysisError] = useState('');
    const [fileAnalyzing, setFileAnalyzing] = useState(false);
    const [showAdvancedPrompts, setShowAdvancedPrompts] = useState(false);
    const [showRegex, setShowRegex] = useState(false);
    const [previewView, setPreviewView] = useState('chat');

    // Form Data
    const [formData, setFormData] = useState({
        name: '', tags: '', description: '',
        personality: '', appearance: '', background: '',
        scenario: '',
        firstMes: '', mesExample: '',
        alternateGreetings: [],
        avatarUrl: '', avatarFile: null,
        regexScripts: [],
        lorebookEntries: [], // { id, keys, content }
        talkativeness: 0.5, fav: false,
        systemPrompt: `Viết đoạn phản hồi tiếp theo của {{char}} trong cuộc hội thoại nhập vai hư cấu giữa {{char}} và {{user}}.\nChỉ viết 1 đoạn phản hồi duy nhất theo góc nhìn thứ ba, đặt các hành động trong *dấu sao* và lời nói trong "dấu ngoặc kép".\nLuôn chủ động, sáng tạo, thúc đẩy cốt truyện và cuộc trò chuyện tiến lên phía trước.\nLuôn giữ đúng thiết lập tính cách (in-character) và tránh lặp lại hành động/lời nói của {{user}}.`,
        postHistory: `[System Note: Hãy đóng vai {{char}} và tiếp tục câu chuyện một cách tự nhiên. Tập trung vào cử chỉ, biểu cảm, tâm lý nhân vật và bám sát vào tính cách đã thiết lập.]`,
        creator: 'User',
        characterVersion: '1.0',
        creatorNotes: '',
    });

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    // Auto Apply Preset
    const applyPreset = (presetValue) => {
        if (!presetValue) return;
        setFormData(p => ({ ...p, ...presetValue }));
    };

    // ═══════════════════════════════════
    // AI IMAGE GEN
    // ═══════════════════════════════════
    const handleGenerateAvatar = () => {
        if (!formData.appearance && !formData.description) {
            alert('Vui lòng nhập mô tả ngoại hình hoặc mô tả chung trước để AI có thể vẽ.');
            return;
        }
        setSuggestingSection('avatar');
        // Construct a safe english prompt for image gen
        const promptParams = `${formData.name} character portrait, ${formData.appearance || formData.description}, anime style, highly detailed, masterpiece`;
        const encodedPrompt = encodeURIComponent(promptParams);
        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&width=512&height=768`;

        // Simulating loading time for image to generate
        setTimeout(() => {
            updateField('avatarUrl', imageUrl);
            updateField('avatarFile', null); // clear local file
            setSuggestingSection(null);
        }, 1500);
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            updateField('avatarFile', file);
            const url = URL.createObjectURL(file);
            updateField('avatarUrl', url);
        }
    };

    // ═══════════════════════════════════
    // AI SECTION SUGGESTION HANDLER
    // ═══════════════════════════════════
    const handleSectionSuggest = async (sectionName) => {
        if (!isKeySet) return;
        setSuggestingSection(sectionName);
        try {
            const apiKey = getNextKey();
            const payload = {
                title: formData.name, description: formData.description,
                protagonistName: formData.name, protagonistPersonality: formData.personality,
                protagonistAppearance: formData.appearance, worldRules: formData.scenario,
                customGenres: formData.tags
            };
            const result = await AIService.suggestStorySection(apiKey, sectionName, payload, { model: suggestModel });
            if (result && typeof result === 'object') {
                setFormData(prev => {
                    const next = { ...prev };
                    if (sectionName === 'protagonist') {
                        if (result.protagonistPersonality) next.personality = result.protagonistPersonality;
                        if (result.protagonistAppearance) next.appearance = result.protagonistAppearance;
                        if (result.protagonistBackground) next.background = result.protagonistBackground;
                    } else if (sectionName === 'world') {
                        if (result.worldRules) next.scenario = result.worldRules;
                    }
                    return next;
                });
            }
        } catch (err) {
            console.error('❌ Card Suggest error:', err);
        } finally {
            setSuggestingSection(null);
        }
    };

    const generateFirstMessage = async () => {
        if (!isKeySet) return;
        setSuggestingSection('firstMes');
        try {
            const apiKey = getNextKey();
            const prompt = `Viết MỘT Lời Mở Đầu (First Message) nhập vai cho Character Card.
- Tên: ${formData.name || 'Bí ẩn'}
- Ngoại hình: ${formData.appearance || 'Không rõ'}
- Tính cách: ${formData.personality || 'Không rõ'}
- Bối cảnh (Scenario): ${formData.scenario || 'Không có'}
Yêu cầu: Góc nhìn thứ 3. Mô tả hành động vào dấu *. Thoại vào dấu ngoặc kép. Không giải thích thêm.`;
            const result = await AIService.callGeminiAPI(apiKey, prompt, { model: suggestModel });
            if (result) updateField('firstMes', result.trim());
        } catch (err) {
            console.error('❌ First Mes error:', err);
        } finally {
            setSuggestingSection(null);
        }
    };

    const buildFullCardData = () => {
        const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
        const name = formData.name.trim() || 'No Name';
        let combinedDesc = formData.description.trim();
        if (formData.appearance) combinedDesc += `\n\n【Ngoại hình】\n${formData.appearance}`;
        if (formData.background) combinedDesc += `\n\n【Tiểu sử】\n${formData.background}`;

        return {
            spec: 'chara_card_v2',
            spec_version: '2.0',
            data: {
                name: name,
                description: combinedDesc,
                personality: formData.personality.trim(),
                scenario: formData.scenario.trim(),
                first_mes: formData.firstMes.trim(),
                mes_example: formData.mesExample.trim(),
                creator_notes: formData.creatorNotes || 'Tạo bởi công cụ siêu tốc của VietTruyenBanChua',
                system_prompt: formData.systemPrompt,
                post_history_instructions: formData.postHistory,
                tags: tagsArray,
                creator: formData.creator || 'User',
                character_version: formData.characterVersion || '1.0',
                alternate_greetings: formData.alternateGreetings.filter(g => g.content.trim() !== '').map(g => g.content),
                extensions: {
                    talkativeness: parseFloat(formData.talkativeness),
                    fav: formData.fav,
                    regex_scripts: formData.regexScripts,
                    world: '', // Default V2 field
                    character_book: formData.lorebookEntries.length > 0 ? {
                        name: name + " Lorebook",
                        description: "Tài liệu bối cảnh đính kèm",
                        scan_depth: 3,
                        token_budget: 1000,
                        recursive_scanning: false,
                        extensions: {},
                        entries: formData.lorebookEntries.filter(lb => lb.keys.trim() && lb.content.trim()).map((lb, idx) => ({
                            id: idx,
                            keys: lb.keys.split(',').map(k => k.trim()).filter(Boolean),
                            secondary_keys: [],
                            comment: '',
                            content: lb.content.trim(),
                            constant: false,
                            selective: true,
                            insertion_order: 100,
                            enabled: true,
                            position: "before_char",
                            extensions: {}
                        }))
                    } : undefined
                }
            }
        };
    };

    // ═══════════════════════════════════
    // EXPORT PNG CARD
    // ═══════════════════════════════════
    const [isExporting, setIsExporting] = useState(false);
    const handleExportPNG = async () => {
        if (!formData.avatarUrl && !formData.avatarFile) {
            alert('Bạn cần cung cấp Ảnh Đại Diện để làm ảnh nền cho thẻ PNG!');
            return;
        }
        setIsExporting(true);
        try {
            const cardData = buildFullCardData();
            let sourceBlob = formData.avatarFile;

            // If it's a generated URL, fetch it first
            if (!sourceBlob && formData.avatarUrl) {
                const response = await fetch(formData.avatarUrl);
                sourceBlob = await response.blob();
            }

            const pngBlob = await embedCharaIntoPNG(sourceBlob, cardData);
            const url = URL.createObjectURL(pngBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${formData.name.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'Card'}_V2.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert('Lỗi xuất thẻ PNG: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    // ═══════════════════════════════════
    // SUBMIT & CREATE NATIVE STORY
    // ═══════════════════════════════════
    const handleSubmit = () => {
        if (!formData.name.trim()) return;

        const cardData = buildFullCardData();
        const d = cardData.data;
        const storyData = {
            id: Utils.generateId(),
            title: d.name,
            genre: 'other',
            genres: d.tags.length > 0 ? d.tags : ['other'],
            description: d.description,
            personality: d.personality,
            scenario: d.scenario,
            content: d.first_mes,
            synopsis: `Tạo qua Wizard: ${d.name}`,
            prohibitions: d.system_prompt,
            globalDirective: d.post_history_instructions,
            alternateGreetings: formData.alternateGreetings.filter(g => g.content.trim() !== '').map((g, i) => ({
                id: Utils.generateId(), name: `Kịch bản #${i + 2}`, content: g.content.trim()
            })),
            allowNSFW: true, type: 'roleplay',
            // Cover directly from the state
            coverImage: formData.avatarUrl,
            database: {
                characters: [
                    {
                        id: Utils.generateId(), name: d.name, description: d.description,
                        personality: d.personality, appearance: formData.appearance, background: formData.background,
                        role: 'Nhân vật chính', notes: formData.creatorNotes, keywords: d.tags.join(', '),
                        constant: true, _enabled: true, _isMainCharacter: true,
                        // Attached avatar to char db
                        avatar: formData.avatarUrl,
                        // Custom data for prompt injection
                        mesExample: formData.mesExample
                    }
                ],
                settings: formData.lorebookEntries.filter(lb => lb.keys.trim() && lb.content.trim()).map(lb => ({
                    id: Utils.generateId(),
                    name: 'Thuật ngữ: ' + lb.keys.split(',')[0],
                    keywords: lb.keys,
                    description: lb.content,
                    strategy: 'Normal'
                })),
                metaRules: formData.regexScripts,
                chapters: d.first_mes ? [{
                    id: Utils.generateId(), title: 'Mở đầu', content: d.first_mes,
                    summary: `Lời mở đầu`, order: 1
                }] : []
            }
        };

        const result = importStory(storyData);
        if (!result._importSummary) {
            result._importSummary = { title: result.title, chapters: result.database.chapters.length, characters: result.database.characters.length }
        }
        onClose();
    };

    // UI Helpers
    const canGoNext = () => (currentStep === 1) ? formData.name.trim().length > 0 : true;
    const handleNext = () => { if (currentStep < STEPS.length && canGoNext()) { setDirection(1); setCurrentStep(prev => prev + 1); } };
    const handleBack = () => { if (currentStep > 1) { setDirection(-1); setCurrentStep(prev => prev - 1); } };
    const slideVariants = { enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }) };

    return (
        <div className="mca-modal-overlay active" onClick={(e) => { if (e.target.classList?.contains('mca-modal-overlay')) onClose(); }}>
            <div className="mca-modal wizard-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
                <div className="mca-modal-header" style={{ borderBottom: '1px solid rgba(236,72,153, 0.2)' }}>
                    <div className="wizard-header-title">
                        <Sparkles size={22} style={{ color: '#ec4899' }} />
                        <h3 className="mca-modal-title">Studio Tạo Card Siêu Tốc</h3>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="wizard-steps" style={{ marginTop: '10px' }}>
                    {STEPS.map((step, i) => {
                        const Icon = step.icon; const isActive = currentStep === step.id; const isCompleted = currentStep > step.id;
                        return (
                            <div key={step.id} className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => { if (isCompleted || step.id <= currentStep) { setDirection(step.id > currentStep ? 1 : -1); setCurrentStep(step.id); } }} >
                                <div className="wizard-step-icon" style={isActive || isCompleted ? { background: '#ec4899', borderColor: '#ec4899', color: '#fff' } : {}}>
                                    {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
                                </div>
                                <span className="wizard-step-label">{step.label}</span>
                                {i < STEPS.length - 1 && <div className={`wizard-step-line ${isCompleted ? 'completed' : ''}`} style={isCompleted ? { background: '#ec4899' } : {}} />}
                            </div>
                        );
                    })}
                </div>

                <div className="wizard-content-wrapper" style={{ padding: '20px 24px' }}>
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div key={currentStep} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}
                            className="wizard-content" style={{ overflowY: 'auto', paddingRight: '12px', maxHeight: '55vh' }}>
                            {/* === STEP 1: Basic Info === */}
                            {currentStep === 1 && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label" style={{ color: '#ec4899' }}>Tiết kiệm thời gian với Template</label>
                                        <select className="form-input" style={{ borderColor: '#ec4899', color: '#fbcfe8' }} onChange={(e) => applyPreset(PRESETS[e.target.value]?.value)}>
                                            {PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '15px 0' }} />
                                    <div className="form-group">
                                        <label className="form-label">Tên Nhân Vật (Name) <span className="text-accent">*</span></label>
                                        <input type="text" className="form-input" value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Tên nhân vật..." autoFocus />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Thẻ Phân Loại (Tags)</label>
                                        <input type="text" className="form-input" value={formData.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="Fantasy, Maid, OP..." />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Mô tả khái quát (Description) <span style={{ fontSize: '0.85em', color: 'var(--color-text-tertiary)' }}>- Giới thiệu sơ lược hiển thị ở LandingPage</span></label>
                                        <textarea className="form-textarea" value={formData.description} onChange={(e) => updateField('description', e.target.value)} rows={3} />
                                    </div>
                                </>
                            )}

                            {/* === STEP 2: Character Config === */}
                            {currentStep === 2 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                                    {/* Avatar Column */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label className="form-label">Ảnh Đại Diện (Avatar)</label>
                                        <div style={{
                                            width: '100%', aspectRatio: '2/3', background: 'rgba(0,0,0,0.3)',
                                            borderRadius: '8px', border: '1px dashed rgba(236,72,153, 0.5)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            {formData.avatarUrl ? (
                                                <img src={formData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '20px' }}>
                                                    <ImageIcon size={32} style={{ margin: '0 auto 10px' }} />
                                                    <div style={{ fontSize: '12px' }}>Chưa có ảnh</div>
                                                </div>
                                            )}
                                            {suggestingSection === 'avatar' && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                    <Loader2 size={24} className="spin text-primary" style={{ color: '#ec4899' }} />
                                                    <div style={{ fontSize: '11px', color: '#fbcfe8', marginTop: '5px' }}>Đang vẽ...</div>
                                                </div>
                                            )}
                                        </div>
                                        <label className="btn btn-secondary w-100" style={{ cursor: 'pointer', textAlign: 'center' }}>
                                            <FileUp size={14} /> Tải ảnh lên
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                                        </label>
                                        <button className="btn btn-secondary w-100" onClick={handleGenerateAvatar} disabled={suggestingSection === 'avatar'}>
                                            <Sparkles size={14} color="#ec4899" /> AI Vẽ Ảnh
                                        </button>
                                        <input type="url" className="form-input" style={{ fontSize: '12px' }} placeholder="Hoặc dán URL ảnh..." value={formData.avatarUrl} onChange={e => { updateField('avatarUrl', e.target.value); updateField('avatarFile', null); }} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                            <div className="form-group">
                                                <label className="form-label">Tác Giả (Creator)</label>
                                                <input type="text" className="form-input" style={{ fontSize: '12px' }} value={formData.creator} onChange={(e) => updateField('creator', e.target.value)} placeholder="Tên của bạn..." />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Phiên Bản (Version)</label>
                                                <input type="text" className="form-input" style={{ fontSize: '12px' }} value={formData.characterVersion} onChange={(e) => updateField('characterVersion', e.target.value)} placeholder="1.0" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Character Texts Column */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div className="form-group">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="form-label">Ghi Chú Tính Cách (Personality) <span className="text-accent">*</span></label>
                                                <button className="btn-icon" onClick={() => handleSectionSuggest('protagonist')} title="AI Gợi Ý Nhân Vật">
                                                    {(suggestingSection === 'protagonist') ? <Loader2 size={16} className="spin text-primary" /> : <Wand2 size={16} style={{ color: '#ec4899' }} />}
                                                </button>
                                            </div>
                                            <textarea className="form-textarea ai-assisted-textarea" value={formData.personality} onChange={(e) => updateField('personality', e.target.value)} rows={3} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Thiết lập Ngoại hình (Appearance)</label>
                                            <textarea className="form-textarea ai-assisted-textarea" value={formData.appearance} onChange={(e) => updateField('appearance', e.target.value)} rows={3} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Lore / Quá khứ / Tiểu sử (Background)</label>
                                            <textarea className="form-textarea ai-assisted-textarea" value={formData.background} onChange={(e) => updateField('background', e.target.value)} rows={2} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Ghi chú của tác giả (Creator's Notes)</label>
                                            <textarea className="form-textarea" value={formData.creatorNotes} onChange={(e) => updateField('creatorNotes', e.target.value)} placeholder="Ví dụ: Roleplay góc nhìn thứ nhất, đừng dùng icon..." rows={2} style={{ fontSize: '12px' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* === STEP 3: Scenario & World === */}
                            {currentStep === 3 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                        <button className="btn btn-secondary" onClick={() => handleSectionSuggest('world')} style={{ padding: '5px 10px', fontSize: '12px' }}>
                                            {(suggestingSection === 'world') ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} color="#ec4899" />} Gợi ý Bối Cảnh
                                        </button>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Bối Cảnh Roleplay (Scenario)</label>
                                        <textarea className="form-textarea ai-assisted-textarea" value={formData.scenario} onChange={(e) => updateField('scenario', e.target.value)} placeholder="Hoàn cảnh giao tiếp?" rows={8} />
                                    </div>
                                    <div className="mca-alert-box info" style={{ marginTop: '15px' }}>
                                        <AlertCircle size={16} /> <span><strong>Mẹo:</strong> Giữ thông tin ở thì hiện tại cho nó có tác dụng mạnh nhất. VD: Căn phòng tối om, {'{{char}}'} đang nhìn chằm chằm {'{{user}}'}.</span>
                                    </div>
                                    <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label className="form-label mb-0">World Info / Sách Từ Điển (Lorebook)</label>
                                            <button className="btn-icon" style={{ padding: '4px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '4px', color: '#ec4899', fontSize: '11px' }} onClick={() => setFormData(prev => ({ ...prev, lorebookEntries: [...prev.lorebookEntries, { id: Utils.generateId(), keys: '', content: '' }] }))}>
                                                <Plus size={12} style={{ marginRight: '2px' }} /> Thêm mục
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Là khái niệm, món đồ, vùng đất... sẽ tự động gài vào ngữ cảnh máy tính khi Keyword được chat nhắc tới. Rất chuyên nghiệp!</div>

                                        {formData.lorebookEntries.map((lb, i) => (
                                            <div key={lb.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                                <input type="text" className="form-input" style={{ fontSize: '12px', marginBottom: '6px', width: 'calc(100% - 30px)' }} placeholder="Từ khoá (cách nhau bởi vệt phẩy)" value={lb.keys} onChange={e => { const n = [...formData.lorebookEntries]; n[i].keys = e.target.value; setFormData(p => ({ ...p, lorebookEntries: n })) }} />
                                                <textarea className="form-textarea" style={{ fontSize: '12px' }} rows={2} placeholder="Sự thật/mô tả về từ khóa này..." value={lb.content} onChange={e => { const n = [...formData.lorebookEntries]; n[i].content = e.target.value; setFormData(p => ({ ...p, lorebookEntries: n })) }} />
                                                <button className="btn-icon" style={{ position: 'absolute', top: '8px', right: '8px' }} onClick={() => setFormData(p => ({ ...p, lorebookEntries: p.lorebookEntries.filter((_, idx) => idx !== i) }))}><Trash2 size={14} color="#ef4444" /></button>
                                            </div>
                                        ))}
                                        {formData.lorebookEntries.length === 0 && <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '12px' }} onClick={() => setFormData(prev => ({ ...prev, lorebookEntries: [...prev.lorebookEntries, { id: Utils.generateId(), keys: '', content: '' }] }))}>Nhấp để định nghĩa Quy Tắc Thế Giới đầu tiên.</div>}
                                    </div>
                                </>
                            )}

                            {/* === STEP 4: Dialogues & Advanced === */}
                            {currentStep === 4 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <label className="form-label mb-0">Tin Nhắn Mở Đầu (First Message) <span className="text-accent">*</span></label>
                                            <button className="btn btn-secondary" onClick={generateFirstMessage} style={{ padding: '4px 8px', fontSize: '11px' }}>
                                                {(suggestingSection === 'firstMes') ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} color="#ec4899" />} Auto Gen
                                            </button>
                                        </div>
                                        <textarea className="form-textarea" value={formData.firstMes} onChange={(e) => updateField('firstMes', e.target.value)} rows={5} style={{ borderColor: 'rgba(236,72,153, 0.3)' }} />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label mb-0" style={{ color: 'rgba(255,255,255,0.7)' }}>Ví dụ Hội Thoại (Mes Example - Cực Quan Trọng)</label>
                                        <div className="mca-alert-box info" style={{ padding: '6px', fontSize: '11px', marginTop: '5px', marginBottom: '5px' }}>Đoạn chat ví dụ theo cấu trúc tĩnh: <code>{'<START>\n{{user}}: Chào cậu\n{{char}}: *vẫy tay* Xin chào'}</code>. Giúp AI hiểu rõ về giọng điệu.</div>
                                        <textarea className="form-textarea" value={formData.mesExample} onChange={(e) => updateField('mesExample', e.target.value)} rows={4} placeholder="<START>\n{{user}}: ...\n{{char}}: ..." style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                                    </div>

                                    {/* Alternate Greetings Panel */}
                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Alternate Greetings (Kịch bản phụ)</span>
                                            <button className="btn-icon" style={{ padding: '4px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '4px', color: '#ec4899' }} onClick={() => setFormData(prev => ({ ...prev, alternateGreetings: [...prev.alternateGreetings, { content: '' }] }))}><Plus size={14} /> Thêm</button>
                                        </label>
                                        {formData.alternateGreetings.map((g, idx) => (
                                            <div key={idx} style={{ position: 'relative', marginBottom: '8px' }}>
                                                <div style={{ position: 'absolute', right: '5px', top: '5px' }}><button className="btn-icon" onClick={() => setFormData(p => ({ ...p, alternateGreetings: p.alternateGreetings.filter((_, i) => i !== idx) }))}><Trash2 size={14} color="#ef4444" /></button></div>
                                                <textarea className="form-textarea" value={g.content} onChange={(e) => setFormData(p => { const ng = [...p.alternateGreetings]; ng[idx].content = e.target.value; return { ...p, alternateGreetings: ng }; })} rows={2} style={{ paddingTop: '28px', fontSize: '0.9em' }} />
                                                <span style={{ position: 'absolute', left: '10px', top: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>Greeting #{idx + 2}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="form-group" style={{ padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Bệnh nói nhiều (Talkativeness)</span>
                                            <span style={{ color: '#ec4899', fontSize: '12px' }}>{formData.talkativeness}</span>
                                        </label>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Chỉ số ảnh hưởng đến độ lan man của AI khi trò chuyện. (Mặc định: 0.5)</div>
                                        <input type="range" min="0" max="1" step="0.1" style={{ width: '100%', accentColor: '#ec4899' }} value={formData.talkativeness} onChange={(e) => updateField('talkativeness', e.target.value)} />
                                    </div>

                                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <input type="checkbox" id="favCheck" checked={formData.fav} onChange={e => updateField('fav', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#ec4899' }} />
                                        <label htmlFor="favCheck" style={{ margin: 0, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Star size={14} fill={formData.fav ? "#ec4899" : "none"} color={formData.fav ? "#ec4899" : "rgba(255,255,255,0.5)"} /> Đánh dấu Thẻ Yêu Thích (Fav)
                                        </label>
                                    </div>

                                    <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                        <button className="btn-icon w-100" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', width: '100%' }} onClick={() => setShowAdvancedPrompts(!showAdvancedPrompts)}>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>Cấu hình AI Prompt chuyên sâu</span> {showAdvancedPrompts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {showAdvancedPrompts && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: '12px' }}>System Prompt (Luật Cốt Lõi)</label>
                                                    <textarea className="form-textarea" value={formData.systemPrompt} onChange={(e) => updateField('systemPrompt', e.target.value)} rows={3} style={{ fontSize: '12px', fontFamily: 'monospace' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: '12px' }}>Post History (Chỉ thị cuối chuỗi chat)</label>
                                                    <textarea className="form-textarea" value={formData.postHistory} onChange={(e) => updateField('postHistory', e.target.value)} rows={2} style={{ fontSize: '12px', fontFamily: 'monospace' }} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                        <button className="btn-icon w-100" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', width: '100%' }} onClick={() => setShowRegex(!showRegex)}>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>Cấu hình Regex Scripts (V2 Spec)</span> {showRegex ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {showRegex && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div className="mca-alert-box info" style={{ padding: '8px', fontSize: '12px' }}><AlertCircle size={14} /> Regex Scripts thay thế tự động vào Text đầu ra của AI trước khi hiển thị.</div>
                                                {formData.regexScripts.map((r, i) => (
                                                    <div key={i} style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', position: 'relative' }}>
                                                        <input type="text" className="form-input" style={{ fontSize: '12px', marginBottom: '5px' }} placeholder="Script Name" value={r.scriptName} onChange={e => { const nr = [...formData.regexScripts]; nr[i].scriptName = e.target.value; setFormData(p => ({ ...p, regexScripts: nr })) }} />
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <input type="text" className="form-input" style={{ fontSize: '12px', fontFamily: 'monospace', flex: 1 }} placeholder="Regex (e.g. /[Aa]pple/g)" value={r.regex} onChange={e => { const nr = [...formData.regexScripts]; nr[i].regex = e.target.value; setFormData(p => ({ ...p, regexScripts: nr })) }} />
                                                            <input type="text" className="form-input" style={{ fontSize: '12px', fontFamily: 'monospace', flex: 1 }} placeholder="Replacement (e.g. Orange)" value={r.replacement} onChange={e => { const nr = [...formData.regexScripts]; nr[i].replacement = e.target.value; setFormData(p => ({ ...p, regexScripts: nr })) }} />
                                                        </div>
                                                        <button className="btn-icon" style={{ position: 'absolute', top: '5px', right: '5px' }} onClick={() => setFormData(p => ({ ...p, regexScripts: p.regexScripts.filter((_, idx) => idx !== i) }))}><Trash2 size={12} color="#ef4444" /></button>
                                                    </div>
                                                ))}
                                                <button className="btn btn-secondary w-100" style={{ fontSize: '12px', borderStyle: 'dashed' }} onClick={() => setFormData(p => ({ ...p, regexScripts: [...p.regexScripts, { id: Utils.generateId(), scriptName: 'New Rule', placement: 2, regex: '', replacement: '' }] }))}>+ Thêm Quy Tắc</button>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* === STEP 5: Confirm & Preview === */}
                            {currentStep === 5 && (
                                <div className="wizard-confirm">
                                    <div className="wizard-confirm-hero" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(190,24,93,0.1))', borderColor: 'rgba(236,72,153, 0.3)', position: 'relative', overflow: 'hidden' }}>
                                        {/* Background effect */}
                                        {formData.avatarUrl && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${formData.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) opacity(0.2)', zIndex: 0 }}></div>}

                                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'left' }}>
                                            <div style={{ width: '80px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(236,72,153,0.5)', background: '#000', flexShrink: 0 }}>
                                                {formData.avatarUrl ? <img src={formData.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={40} style={{ margin: '40px auto', display: 'block', color: 'rgba(255,255,255,0.3)' }} />}
                                            </div>
                                            <div>
                                                <h2 className="wizard-confirm-title" style={{ color: '#fbcfe8', textAlign: 'left', margin: '0 0 5px 0' }}>{formData.name || 'Thẻ Ẩn Danh'}</h2>
                                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                                    {formData.tags.split(',').filter(Boolean).map((t, i) => <span key={i} style={{ background: 'rgba(236,72,153,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: '#f9a8d4' }}>{t.trim()}</span>)}
                                                </div>
                                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{formData.description || 'Chưa có mô tả'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="wizard-confirm-stats" style={{ marginTop: '15px' }}>
                                        <div className="stat-card">
                                            <div className="stat-value">{[formData.personality, formData.appearance, formData.background].filter(Boolean).length}/3</div><div className="stat-label">Cấu trúc DB</div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-value">{formData.alternateGreetings.length + 1}</div><div className="stat-label">Chat Mở Đầu</div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-value">{formData.regexScripts.length}</div><div className="stat-label">Regex/Macros</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                        <button className="btn w-100" style={{ padding: '8px', background: previewView === 'chat' ? 'rgba(236,72,153,0.3)' : 'rgba(0,0,0,0.3)', border: previewView === 'chat' ? '1px solid #ec4899' : '1px solid rgba(255,255,255,0.1)', color: previewView === 'chat' ? '#ec4899' : 'var(--color-text-secondary)', borderRadius: '8px', fontSize: '13px', fontWeight: previewView === 'chat' ? 600 : 400 }} onClick={() => setPreviewView('chat')}>💬 Xem dạng Chat</button>
                                        <button className="btn w-100" style={{ padding: '8px', background: previewView === 'details' ? 'rgba(236,72,153,0.3)' : 'rgba(0,0,0,0.3)', border: previewView === 'details' ? '1px solid #ec4899' : '1px solid rgba(255,255,255,0.1)', color: previewView === 'details' ? '#ec4899' : 'var(--color-text-secondary)', borderRadius: '8px', fontSize: '13px', fontWeight: previewView === 'details' ? 600 : 400 }} onClick={() => setPreviewView('details')}>📄 Chi Tiết Thẻ (V2 Spec)</button>
                                    </div>

                                    {previewView === 'chat' ? (
                                        <div style={{ marginTop: '15px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                                <Eye size={14} /> Preview Giao diện Chat
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                <img src={formData.avatarUrl || 'https://via.placeholder.com/40'} alt="A" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                <div style={{ background: 'rgba(40,40,50,0.8)', padding: '10px 14px', borderRadius: '0 12px 12px 12px', flex: 1, fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                                    <strong style={{ color: '#ec4899', display: 'block', marginBottom: '4px' }}>{formData.name || '???'}</strong>
                                                    <span dangerouslySetInnerHTML={{ __html: formData.firstMes ? formData.firstMes.replace(/\*(.*?)\*/g, '<em style="color:var(--color-text-tertiary)">*$1*</em>') : '...' }} />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '15px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr', gap: '10px', fontSize: '12px', alignItems: 'baseline' }}>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Name</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px', color: 'white' }}>{formData.name || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Creator</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px', color: 'white' }}>{formData.creator || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Character Version</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px', color: 'white' }}>{formData.characterVersion || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Tags</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px', color: 'white' }}>{formData.tags || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>System Prompt</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: 'white' }}>{formData.systemPrompt || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Post History Obj</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: 'white' }}>{formData.postHistory || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>First Message</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: 'white' }}>{formData.firstMes || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Alt Greetings</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: 'white' }}>{formData.alternateGreetings.length} alternate greetings</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Scenario</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: 'white' }}>{formData.scenario || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Mes Example</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: 'white' }}>{formData.mesExample || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Personality</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: 'white' }}>{formData.personality || '-'}</div>

                                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Description</strong>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', color: 'white', border: '1px solid rgba(236,72,153, 0.3)' }}>
                                                    {[formData.description.trim(), formData.appearance && `[Ngoại hình: ${formData.appearance.trim()}]`, formData.background && `[Tiểu sử: ${formData.background.trim()}]`].filter(Boolean).join('\n\n')}
                                                </div>

                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                        <button className="btn btn-secondary" style={{ flex: 1, padding: '12px', textAlign: 'center', justifyContent: 'center' }} onClick={handleExportPNG} disabled={isExporting}>
                                            {isExporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                                            Lưu file Ảnh Card (PNG)
                                        </button>
                                        <button className="btn btn-primary" onClick={handleSubmit} style={{ flex: 1, padding: '12px', textAlign: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ec4899, #9d174d)', border: 'none' }}>
                                            <Sparkles size={16} /> Nhập Vai Ngay
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="wizard-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '15px 24px' }}>
                    <button className="btn btn-secondary" onClick={onClose} style={currentStep === 1 ? { marginRight: 'auto' } : { display: 'none' }}>Hủy bỏ</button>
                    {currentStep > 1 && <button className="btn btn-secondary" onClick={handleBack} style={{ marginRight: 'auto' }}><ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} /> Quay lại</button>}
                    {currentStep < STEPS.length && <button className="btn btn-primary" onClick={handleNext} disabled={!canGoNext()} style={{ background: '#ec4899' }}>Tiếp theo <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} /></button>}
                </div>
            </div>
        </div>
    );
}
