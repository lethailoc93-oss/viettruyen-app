// ================================================
// RAG Service — Barrel Re-Export
// All functions split into modules under ./rag/
// All functions split into modules under ./rag/
// This file maintains backward compatibility for all consumers
// ================================================
import { ResearchService } from './researchService';
import { IdbStorage } from '../utils/idbStorage';

// Entity builders & utilities
import {
    estimateTokens, evaluateMemoryDecay, scoreRelevance,
    buildCharacterContext, buildSettingContext, buildTimelineContext,
    buildPlotContext, buildCurrentInfoContext, buildAbilityContext,
    buildItemContext, buildOrganizationContext, buildQuestContext,
    buildChapterContext, buildReferenceContext, getRelevantChapterContent,
    getKeywordMatchedChapters,
    extractLorebook
} from './rag/ragEntityBuilders';

// Memory & continuity
import { buildRunningMemory, buildContinuityAnchor } from './rag/ragMemory';

// Search, scoring, packing, embedding RAG
import {
    buildContextualQuery, packContextWithBudget, computeConfidenceScore,
    buildSourceFootnotes, buildExplainability,
    buildRAGContextWithEmbeddings as _buildRAGContextWithEmbeddings,
    invalidateEmbeddingCache,
    getIndexedDocuments
} from './rag/ragSearch';

// Genre instruction builder (used by buildSystemInstruction)
import { buildGenreInstruction } from './genrePrompts';
import { NSFW_INSTRUCTION } from './rag/nsfwInstruction';
import { buildStyleInstruction } from './styleTemplates';
import { buildDifficultyInstruction } from './storyDifficulty';


// ================================================
// Orchestrator Functions (kept here — they use all modules)
// ================================================

/**
 * Build story facts — hard, immutable constraints extracted from story data.
 */
function buildStoryFacts(story) {
    if (!story) return '';
    const db = story.database || {};
    const facts = [];

    if (db.characters?.length) {
        const names = db.characters.map(c => c.name).filter(Boolean);
        if (names.length) facts.push(`【NHÂN VẬT ĐÃ BIẾT】: ${names.join(', ')}`);
    }
    if (db.settings?.length) {
        const names = db.settings.map(s => s.name).filter(Boolean);
        if (names.length) facts.push(`【BỐI CẢNH ĐÃ BIẾT】: ${names.join(', ')}`);
    }
    if (db.timeline?.length) {
        facts.push('\n【SỰ KIỆN QUAN TRỌNG ĐÃ XẢY RA — KHÔNG ĐƯỢC MÂU THUẪN】');
        const sorted = [...db.timeline].sort((a, b) => (a.order || 0) - (b.order || 0));
        sorted.forEach(t => {
            facts.push(`✓ ${t.title}${t.date ? ` [${t.date}]` : ''}: ${t.description ? t.description.slice(0, 150) : ''}`);
        });
    }
    if (db.abilities?.length) {
        const names = db.abilities.map(a => a.name).filter(Boolean);
        if (names.length) facts.push(`\n【NĂNG LỰC ĐÃ BIẾT】: ${names.join(', ')}`);
    }
    if (db.items?.length) {
        const names = db.items.map(i => i.name).filter(Boolean);
        if (names.length) facts.push(`【VẬT PHẨM ĐÃ BIẾT】: ${names.join(', ')}`);
    }
    if (db.organizations?.length) {
        const names = db.organizations.map(o => o.name).filter(Boolean);
        if (names.length) facts.push(`【TỔ CHỨC ĐÃ BIẾT】: ${names.join(', ')}`);
    }
    if (db.quests?.length) {
        const activeQuests = db.quests.filter(q => q.status !== 'completed' && q.status !== 'failed');
        if (activeQuests.length) {
            facts.push('\n【NHIỆM VỤ ĐANG THỰC HIỆN】');
            activeQuests.forEach(q => {
                facts.push(`✓ ${q.title}${q.progress ? ` [${q.progress}]` : ''}${q.assignee ? ` (${q.assignee})` : ''}`);
            });
        }
    }

    if (facts.length === 0) return '';
    return `══════════════════════════════════════\n` +
        `DANH MỤC THỰC THỂ ĐÃ BIẾT (SOURCE OF TRUTH)\n` +
        `⛔ CHỈ SỬ DỤNG CÁC TÊN TRONG DANH SÁCH NÀY. KHÔNG BỊA TÊN MỚI TRỪ KHI RẤT CẦN THIẾT.\n` +
        `══════════════════════════════════════\n` +
        facts.join('\n');
}

/**
 * Build complete RAG context for a story.
 * Now injects FULL entity detail (characters, abilities, items, settings, etc.)
 * in addition to story facts and running memory.
 */
export function buildRAGContext(story, options = {}) {
    if (!story) return { contextText: '', stats: {} };

    const {
        currentChapterId = null,
        query = '',
        maxTotalTokens = story?.maxInputTokens || 15000,
        includeContent = true,
        includeReferences = true
    } = options;

    const db = story.database || {};
    const sections = [];
    const stats = {
        characters: db.characters?.length || 0,
        settings: db.settings?.length || 0,
        timeline: db.timeline?.length || 0,
        plots: db.plots?.length || 0,
        chapters: db.chapters?.length || 0,
        references: db.references?.length || 0
    };

    // === Priority 0: Story Facts (entity name registry) ===
    const factsCtx = buildStoryFacts(story);
    if (factsCtx) sections.push(factsCtx);

    // === Priority 0.5: Active Lorebook & MVU ===
    let textToScan = query || '';
    const currentChapter = db.chapters?.find(c => c.id === currentChapterId);
    let currentChapterNumber = null;
    if (currentChapter) {
        currentChapterNumber = currentChapter.order || (db.chapters.findIndex(c => c.id === currentChapterId) + 1);
    }

    if (currentChapter?.content) textToScan += ' ' + currentChapter.content.slice(-3000);

    // Core Lorebook (Depth 0) that must be passed to the bottom of the prompt
    let coreLorebook = '';

    const extracted = extractLorebook(textToScan, db, currentChapterNumber, {
        currentLocation: story.currentLocation || '',
        currentTime: story.currentTime || ''
    });

    if (extracted.contextOutput) sections.push(extracted.contextOutput);
    if (extracted.coreOutput) coreLorebook = extracted.coreOutput;

    // === Priority 0.6: Active Foreshadowing Seeds ===
    const foreshadowings = db.foreshadowings?.filter(f => f.status === 'active' || !f.status) || [];
    if (foreshadowings.length > 0) {
        const fLines = foreshadowings.slice(0, 10).map((f, i) => {
            let line = `${i + 1}. 🌱 "${f.hint || f.name}"`;
            if (f.plantedChapter) line += ` (gieo ở chương ${f.plantedChapter})`;
            if (f.targetEvent) line += ` → mục tiêu: ${f.targetEvent}`;
            return line;
        });
        sections.push(
            `══════════════════════════════════════\n` +
            `【PHỤC BÚT ĐANG HOẠT ĐỘNG — NHẬN BIẾT & GỢI Ý KHI PHÙ HỢP】\n` +
            `══════════════════════════════════════\n` +
            fLines.join('\n') +
            `\n⚡ Khi viết, nếu bối cảnh phù hợp → gợi nhẹ 1 manh mối. KHÔNG kích hoạt tất cả cùng lúc.`
        );
    }

    // === Priority 1: Running Memory (chronological recap) ===
    const runningMemCtx = buildRunningMemory(story, currentChapterId);
    if (runningMemCtx) sections.push(runningMemCtx);

    // === Priority 2: Current Info (time + location) ===
    const currentInfoCtx = buildCurrentInfoContext(story);
    if (currentInfoCtx) sections.push(currentInfoCtx);

    // === Story meta ===
    const meta = [];
    if (story.title) meta.push(`Tên truyện: ${story.title}`);
    const genreDisplay = story.genres?.length > 0 ? story.genres.join(', ') : (story.genre || '');
    const customGenreDisplay = story.customGenres?.trim() ? ` + ${story.customGenres.trim()}` : '';
    if (genreDisplay || customGenreDisplay) meta.push(`Thể loại: ${genreDisplay}${customGenreDisplay}`);
    if (story.outlines?.overall) meta.push(`Dàn ý tổng: ${story.outlines.overall.slice(0, 500)}`);
    if (meta.length) sections.push(`THÔNG TIN TRUYỆN:\n${meta.join('\n')}`);

    // === World-building context (from story wizard) ===
    const worldParts = [];
    if (story.timePeriod?.trim()) worldParts.push(`⏳ Thời đại / Kỷ nguyên: ${story.timePeriod.trim()}`);
    if (story.technologyLevel?.trim()) worldParts.push(`🔧 Trình độ công nghệ: ${story.technologyLevel.trim()}`);
    if (story.mainLocations?.trim()) worldParts.push(`📍 Địa điểm chính: ${story.mainLocations.trim()}`);
    if (story.worldRules?.trim()) worldParts.push(`⚙️ Hệ thống sức mạnh / Quy tắc: ${story.worldRules.trim()}`);
    if (story.cultivationLevels?.trim()) worldParts.push(`🏔️ Phân cấp cảnh giới / Level:\n${story.cultivationLevels.trim()}`);
    if (story.powerSystemDetails?.trim()) worldParts.push(`📋 Chi tiết hệ thống:\n${story.powerSystemDetails.trim()}`);
    if (story.worldHistory?.trim()) worldParts.push(`📜 Lịch sử thế giới: ${story.worldHistory.trim()}`);
    if (story.factionsRaces?.trim()) worldParts.push(`⚔️ Chủng tộc / Phe phái: ${story.factionsRaces.trim()}`);
    if (story.religionCulture?.trim()) worldParts.push(`🏛️ Tôn giáo / Văn hóa: ${story.religionCulture.trim()}`);
    if (story.economyLife?.trim()) worldParts.push(`💰 Kinh tế / Đời sống: ${story.economyLife.trim()}`);
    if (worldParts.length > 0) {
        sections.push(
            `══════════════════════════════════════\n` +
            `BỐI CẢNH & THẾ GIỚI (BẮT BUỘC TUÂN THỦ — KHÔNG ĐƯỢC THAY ĐỔI)\n` +
            `══════════════════════════════════════\n` +
            worldParts.join('\n\n')
        );
    }

    // === Character & Plot summary (from story wizard) ===
    const storyParts = [];
    if (story.protagonist?.trim()) storyParts.push(`👤 Nhân vật chính:\n${story.protagonist.trim()}`);
    // Merge antagonist + supportingCharacters into one field
    const charParts = [];
    if (story.antagonist?.trim()) charParts.push(story.antagonist.trim());
    if (story.supportingCharacters?.trim()) charParts.push(story.supportingCharacters.trim());
    if (charParts.length > 0) storyParts.push(`👥 Nhân vật phụ & phản diện:\n${charParts.join('\n')}`);
    if (story.characterRelationships?.trim()) storyParts.push(`🔗 Quan hệ nhân vật: ${story.characterRelationships.trim()}`);
    if (story.mainConflict?.trim()) storyParts.push(`⚡ Xung đột chính: ${story.mainConflict.trim()}`);
    if (story.subConflicts?.trim()) storyParts.push(`💫 Xung đột phụ: ${story.subConflicts.trim()}`);
    if (story.plotTwists?.trim()) storyParts.push(`🔀 Twist: ${story.plotTwists.trim()}`);
    if (story.endingType?.trim()) storyParts.push(`🎬 Kiểu kết thúc: ${story.endingType.trim()}`);
    if (storyParts.length > 0) {
        sections.push(
            `══════════════════════════════════════\n` +
            `CỐT TRUYỆN & NHÂN VẬT TỔNG QUAN\n` +
            `══════════════════════════════════════\n` +
            storyParts.join('\n')
        );
    }

    // === Style summary (from story wizard) ===
    const styleParts = [];
    if (story.toneAtmosphere?.trim()) styleParts.push(`🎭 Tone: ${story.toneAtmosphere.trim()}`);
    if (story.mainThemes?.trim()) styleParts.push(`📚 Chủ đề: ${story.mainThemes.trim()}`);
    if (story.writingStyle?.trim()) styleParts.push(`✍️ Văn phong: ${story.writingStyle.trim()}`);
    if (story.narrationPov?.trim()) styleParts.push(`👁️ Ngôi kể: ${story.narrationPov.trim()}`);
    if (story.pacing?.trim()) styleParts.push(`⏱️ Nhịp độ: ${story.pacing.trim()}`);
    if (story.specialLanguage?.trim()) styleParts.push(`🗣️ Ngôn ngữ đặc biệt: ${story.specialLanguage.trim()}`);
    if (styleParts.length > 0) {
        sections.push(`PHONG CÁCH VIẾT:\n${styleParts.join('\n')}`);
    }

    // === Style reference (learned from sample file — wizard) ===
    if (story.styleReference?.trim()) {
        sections.push(
            `══════════════════════════════════════\n` +
            `VĂN PHONG THAM KHẢO — BẮT CHƯỚC CHÍNH XÁC CÁCH VIẾT NÀY\n` +
            `══════════════════════════════════════\n` +
            story.styleReference.trim()
        );
    }

    // === Style Library (multiple learned styles from StoryRules) ===
    const styleLib = Array.isArray(story.styleLibrary) ? story.styleLibrary : [];
    if (styleLib.length > 0) {
        const libContent = styleLib.map((entry, i) =>
            `[Mẫu ${i + 1}: ${entry.fileName}]\n${entry.content}`
        ).join('\n\n---\n\n');
        sections.push(
            `══════════════════════════════════════\n` +
            `KHO VĂN PHONG ĐÃ HỌC (${styleLib.length} mẫu) — BẮT CHƯỚC CÁCH VIẾT NÀY\n` +
            `══════════════════════════════════════\n` +
            libContent
        );
    }


    // === Priority 3: Entity detail injection (budget-aware) ===
    // Ordered by importance for AI memory
    let currentTokens = estimateTokens(sections.join('\n\n'));
    // Increased entity budget cap to support more world-building data
    const entityBudget = Math.min(maxTotalTokens * 0.4, 6000);
    let entityTokensUsed = 0;

    const entitySections = [
        { builder: () => buildCharacterContext(db.characters), label: 'characters' },
        { builder: () => buildAbilityContext(db.abilities), label: 'abilities' },
        { builder: () => buildItemContext(db.items), label: 'items' },
        { builder: () => buildSettingContext(db.settings), label: 'settings' },
        { builder: () => buildTimelineContext(db.timeline), label: 'timeline' },
        { builder: () => buildOrganizationContext(db.organizations), label: 'organizations' },
        { builder: () => buildQuestContext(db.quests), label: 'quests' },
        { builder: () => buildPlotContext(db.plots), label: 'plots' },
    ];

    for (const { builder } of entitySections) {
        const ctx = builder();
        if (!ctx) continue;
        const tokens = estimateTokens(ctx);
        if (entityTokensUsed + tokens > entityBudget && entityTokensUsed > 0) break;
        sections.push(ctx);
        entityTokensUsed += tokens;
    }
    currentTokens += entityTokensUsed;

    // === Content injection ===
    const remainingTokens = maxTotalTokens - currentTokens;

    if (includeContent && remainingTokens > 500) {
        // Increased content budget cap
        const contentBudget = Math.min(remainingTokens * 0.6, 6000);
        const contentCtx = getRelevantChapterContent(db.chapters, currentChapterId, contentBudget);
        if (contentCtx) {
            sections.push(contentCtx);
            currentTokens += estimateTokens(contentCtx);
            const chapter = db.chapters?.find(c => c.id === currentChapterId);
            if (chapter && typeof chapter.content === 'string') {
                sections.push(`【NỘI DUNG CHƯƠNG ĐANG VIẾT】\n${chapter.content}`);
                currentTokens += estimateTokens(chapter.content);
            }
        }
    }

    const remainingAfterContent = maxTotalTokens - estimateTokens(sections.join('\n\n'));

    // === Keyword-matched chapter injection ===
    if (includeContent && remainingAfterContent > 1000) {
        const currentChapter = db.chapters?.find(c => c.id === currentChapterId);
        const kwQueryText = [
            currentChapter?.outline || '',
            currentChapter?.title || '',
            currentChapter?.content?.slice(-1000) || '',
            query || ''
        ].filter(Boolean).join(' ');

        if (kwQueryText.trim().length > 10) {
            const kwBudget = Math.min(remainingAfterContent * 0.5, 4000);
            const kwCtx = getKeywordMatchedChapters(db.chapters, currentChapterId, kwQueryText, kwBudget);
            if (kwCtx) sections.push(kwCtx);
        }
    }

    const remainingAfterKw = maxTotalTokens - estimateTokens(sections.join('\n\n'));
    if (includeReferences && remainingAfterKw > 200) {
        // Increased reference budget cap
        const refCtx = buildReferenceContext(db.references, query, Math.min(remainingAfterKw, 4000));
        if (refCtx) sections.push(refCtx);
    }

    const contextText = sections.join('\n\n');
    return { contextText, coreLorebook, stats, estimatedTokens: estimateTokens(contextText) };
}

/**
 * Build a light RAG context for hybrid search background.
 */
export function buildLightContext(story, options = {}) {
    if (!story) return { contextText: '', stats: {} };

    const { currentChapterId = null } = options;
    const db = story.database || {};
    const sections = [];

    const factsCtx = buildStoryFacts(story);
    if (factsCtx) sections.push(factsCtx);

    const runningMemCtx = buildRunningMemory(story, currentChapterId);
    if (runningMemCtx) sections.push(runningMemCtx);

    const currentInfoCtx = buildCurrentInfoContext(story);
    if (currentInfoCtx) sections.push(currentInfoCtx);

    let coreLorebook = '';
    const currentChapter = db.chapters?.find(c => c.id === currentChapterId);
    let currentChapterNumber = null;
    let textToScan = '';
    if (currentChapter) {
        currentChapterNumber = currentChapter.order || (db.chapters.findIndex(c => c.id === currentChapterId) + 1);
        textToScan = currentChapter.content?.slice(-3000) || '';
    }

    const activeLorebookCtx = extractLorebook(textToScan, db, currentChapterNumber, {
        currentLocation: story.currentLocation || '',
        currentTime: story.currentTime || ''
    });

    if (activeLorebookCtx.contextOutput) sections.push(activeLorebookCtx.contextOutput);
    if (activeLorebookCtx.coreOutput) coreLorebook = activeLorebookCtx.coreOutput;

    const contextText = sections.join('\n\n');
    return {
        contextText,
        coreLorebook,
        stats: {
            characters: db.characters?.length || 0,
            settings: db.settings?.length || 0,
            timeline: db.timeline?.length || 0,
            chapters: db.chapters?.length || 0
        },
        estimatedTokens: estimateTokens(contextText)
    };
}

/**
 * Build a system instruction for AI that includes full story awareness.
 */
export async function buildSystemInstruction(story) {
    if (!story) return '';

    const genreInstruction = buildGenreInstruction(story);
    const genreDisplay = story.genres?.length > 0 ? story.genres.join(', ') : (story.genre || 'chung');

    return `Bạn là trợ lý viết truyện AI. Truyện: "${story.title || 'chưa đặt tên'}" — thể loại: "${genreDisplay}".

══════════════════════════════════════════════════
GIAO THỨC HOẠT ĐỘNG — BẮT BUỘC TUÂN THỦ
══════════════════════════════════════════════════

【1. CHỈ CHÍNH XÁC THỰC TẾ & KHÔNG ẢO GIÁC】
- BẮT BUỘC tra cứu DỮ LIỆU GỐC trước khi viết.
- KHÔNG tự ý bịa thêm: tên người, địa điểm, sự kiện, năng lực, tổ chức nếu không có trong dữ liệu.
- Nếu không có đủ thông tin, viết né tránh/chung chung, KHÔNG đoán bừa.
- Ưu tiên DỮ LIỆU GỐC tuyệt đối nếu có xung đột nội dung.

【2. TRUNG LẬP & TỐI ƯU HÓA HOẠT ĐỘNG】
- Trả lời ĐÚNG yêu cầu theo từng chữ. CHỈ xuất nội dung yêu cầu.
- KHÔNG xin lỗi ("Tôi xin lỗi..."). KHÔNG chào hỏi ("Xin chào...").
- KHÔNG thêm cảm xúc, đồng cảm hay giải thích ngoài giới hạn trừ khi yêu cầu rõ.
- KHÔNG tự ý đề xuất nội dung ngoài phạm vi (không hỏi "bạn có muốn nghe thêm không").

【3. XÂY DỰNG NHÂN VẬT THỰC TẾ & LOGIC NHÂN QUẢ】
- BẮT BUỘC tuân thủ logic tình huống: Thái độ của mọi người xung quanh (NPC) phải tương xứng với địa vị, sức mạnh thực tế của nhân vật ở hiện tại.
- KHÔNG để thế giới "xoay quanh" nhân vật chính. Nhân vật phụ sinh hoạt độc lập.
- Thắng lợi phải đến từ chuẩn bị/nỗ lực, không phải từ may mắn lố bịch hoặc "sáng kiến" vô cớ.
- Cấm power-creep đột ngột. Cấm "thần thánh hóa" nhân vật chính khi chưa đủ thực lực.

【4. CHỐNG LẬM VĂN PHONG SẢNG VĂN/CŨ KỸ】
- KHÔNG "vả mặt", "đấu giá vô hạn", "thu hoạch ngẫu nhiên lúc cần". 
- KHÔNG dùng ngôn từ tiên hiệp (hắn, y, đạo hữu, tiền bối...) nếu KHÔNG PHẢI truyện tu tiên/huyền huyễn phương Đông.
- Văn phong tự nhiên, phù hợp bối cảnh, đối thoại giống người sống.

【5. CẤM VĂN MẪU & CÂU KẾT CẢM NHẬN (CRINGE)】
- KHÔNG KẾT ĐOẠN bằng bình luận/nhận xét/tổng kết đạo đức. (VD CẤM: "Đó là bài học...", "Trong khoảnh khắc ấy...", "Và thế là...").
- KHÔNG để narrator trực tiếp đánh giá cảm xúc tình huống ("Thật kỳ lạ biết bao").
- ĐÚNG: Kết đoạn bằng HÀNH ĐỘNG cụ thể, ĐỐI THOẠI, hoặc SỰ KIỆN đang tiếp diễn (Show, don't tell).

${genreInstruction}` +
        // Setting enforcement — ensure AI respects the world's cultural/temporal context
        (() => {
            const settingParts = [];
            if (story.timePeriod?.trim()) settingParts.push(`Thời đại: ${story.timePeriod.trim()}`);
            if (story.mainLocations?.trim()) settingParts.push(`Địa điểm: ${story.mainLocations.trim()}`);
            if (settingParts.length > 0) {
                return `\n\n【6. BỐI CẢNH BẮT BUỘC — KHÔNG ĐƯỢC THAY ĐỔI】\n` +
                    settingParts.join('\n') + '\n' +
                    `- BẮT BUỘC tên nhân vật, địa danh, xưng hô, tiền tệ, ứng dụng, phong tục PHÙ HỢP với bối cảnh trên.\n` +
                    `- VD: Nếu bối cảnh là Trung Quốc → dùng tên Trung Quốc (Lý Minh, Trần Hạo...), WeChat (không phải Zalo), nhân dân tệ (không phải VNĐ).\n` +
                    `- VD: Nếu bối cảnh là phương Tây → dùng tên phương Tây, đơn vị tiền phương Tây.\n` +
                    `- KHÔNG MẶC ĐỊNH sang bối cảnh Việt Nam trừ khi truyện rõ ràng ở Việt Nam.`;
            }
            return '';
        })() +
        (story.prohibitions?.trim()
            ? `\n\n══════════════════════════════════════════════════\n【ĐIỀU CẤM — BẮT BUỘC TUÂN THỦ】\n══════════════════════════════════════════════════\n${story.prohibitions.trim()}`
            : '') +
        // Anti-Cliché rules from user (inspired by Gemini Preset worldbook)
        (story.antiCliches?.length > 0
            ? `\n\n══════════════════════════════════════════════════\n【CHỐNG SÁO MÒN — TÁC GIẢ YÊU CẦU TRÁNH】\n══════════════════════════════════════════════════\n${story.antiCliches.map((r, i) => `${i + 1}. ❌ ${r}`).join('\n')}`
            : '') +
        // Style template injection
        buildStyleInstruction(story) +
        // Difficulty/tone injection
        buildDifficultyInstruction(story) +
        // Kỹ thuật tự sự & Rules đặc biệt
        ((story.enableMontage || story.enableFlashback || story.enableSensory || story.enableShowDontSmell || story.enableAntiGeminism || story.enableDynamicNpc || story.enableMultiPov) ? `\n\n══════════════════════════════════════════════════\n【KỸ THUẬT TỰ SỰ & MÔ TẢ NÂNG CAO】\n══════════════════════════════════════════════════` +
            (story.enableMontage ? `\n📐 MONTAGE SONG SONG: Khi nhân vật quay lại sau khi vắng mặt, XEN KẼ đoạn ngắn cho thấy\n   những gì xảy ra ở nơi khác / với nhân vật khác trong lúc nhân vật chính vắng mặt.\n   Dùng kiểu viết montage: cảnh ngắn, nhịp nhanh, mỗi cảnh 2-3 câu.` : '') +
            (story.enableFlashback ? `\n🕰️ HỒI ỨC (FLASHBACK): Khi hành vi nhân vật cần giải thích sâu hơn, XEN KẼ đoạn hồi ức\n   ngắn (2-5 câu) bằng chữ nghiêng hoặc dấu hiệu rõ ("Hắn nhớ lại...", fragment quá khứ).\n   Hồi ức phải LIÊN QUAN TRỰC TIẾP đến hành động hiện tại — KHÔNG hồi ức lung tung.` : '') +
            (story.enableSensory ? `\n👁 NGŨ GIÁC (SHOW, DON'T TELL): ƯU TIÊN lột tả cảm xúc và trạng thái thông qua giác quan (thấy, nghe, ngửi, chạm, nếm) và ngôn ngữ cơ thể. Tránh gọi tên cảm xúc trực tiếp khi có thể (VD: thay "hắn tức giận" → "mặt hắn đỏ gay, tay nắm chặt"). Tuy nhiên, ĐƯỢC PHÉP dùng exposition ngắn gọn khi cần cung cấp bối cảnh, lịch sử, hệ thống. Chỉ dùng 1-2 giác quan nổi bật nhất mỗi cảnh, KHÔNG nhồi nhét đủ 5 giác quan.` : '') +
            (story.enableShowDontSmell ? `\n🚫 HẠN CHẾ KHỨU GIÁC (SHOW, DON'T SMELL): TUYỆT ĐỐI TRÁNH miêu tả khứu giác/mùi vị rập khuôn (như "mùi xà phòng", "mùi mồ hôi", "mùi máu", "mùi nam tính"). KHÔNG dùng mùi hương để ví von trừu tượng (như "mùi vị cõi chết"). Thay vào đó, hãy miêu tả NGUỒN GỐC của mùi hương thông qua hình ảnh thị giác (Ví dụ: thay vì viết "mùi máu nồng nặc", hãy tả "máu rỉ ra thành vũng trên sàn nhà").` : '') +
            (story.enableAntiGeminism ? `\n🤖 CHỐNG NGÔN TỪ AI (ANTI-GEMINISM): TUYỆT ĐỐI CẤM các cụm từ sáo rỗng sau:\n  [EN] "shivers down spine", "circled someone", "playful challenge", "air charged with", "air thick with", "air crackled", "stark", "ball is in your court", "game on", "choice is yours", "arousal pooling in belly", "torn between", "world narrowed", "pupils blown wide", "tongue darting out", "grasping chin to meet gaze", "biting someone's lip", "the night is still young".\n  [VI] "ký ức như thủy triều ập đến", "trán lấm tấm mồ hôi lạnh", "đau nhức như xé toạc từng thớ thịt", "gào thét trong lòng", "tim như bị bóp nghẹt", "không khí đặc quánh", "toàn thân run rẩy", "đông cứng tại chỗ", "ánh mắt sắc như dao", "mỉm cười bí ẩn", "thử thách đạo đức", "ranh giới đạo đức".` : '') +
            (story.enableDynamicNpc ? `\n👥 THẾ GIỚI ĐỘNG (BACKGROUND NPC): Hãy ngầm phát triển cốt truyện/mục tiêu cho các nhân vật phụ ngay cả khi họ không xuất hiện trong cảnh hiện tại. Khi họ xuất hiện lại, họ phải có sự thay đổi/tiến triển hợp lý so với lần cuối gặp mặt.` : '') +
            (story.enableMultiPov ? `\n🔄 ĐA GÓC NHÌN (MULTI-POV): Khuyến khích chuyển đổi góc nhìn mượt mà giữa các tuyến nhân vật/phe phái khác nhau trong thế giới để tạo sự đa chiều. Không bị trói buộc 100% thời lượng vào nhân vật chính.` : '') +
            (story.enableSlowBurn ? `\n⏳ TIẾN TRIỂN CHẬM RÃI (SLOW BURN & REALISTIC): Mọi diễn biến tâm lý, tình cảm, sự kính trọng, thù hận HOẶC sức mạnh PHẢI được bồi đắp từ từ qua nhiều sự kiện. TUYỆT ĐỐI KHÔNG đốt cháy giai đoạn (ví dụ: cấm nhân vật vừa gặp đã yêu/căm ghét, cấm kẻ yếu làm trò táo bạo ngay lập tức mà không bị hậu quả).` : '') : '') +
        (story.allowNSFW
            ? `\n\n══════════════════════════════════════════════════\n${NSFW_INSTRUCTION}` + (story.enableFetish ? `\n\n🔥 MÔ TẢ TÌNH DỤC / GỢI DỤC (FETISH & SENSATIONS): Trong các cảnh thân mật, hãy BẮT BUỘC chọn 1 hoặc 2 ví dụ cảm giác mãnh liệt dể miêu tả, TÍCH CỰC THAY ĐỔI CÁC VÍ DỤ để giữ văn phong bạo dạn và không lặp lại:\n  - Bề ngoài: Cơ thể nóng ran, cô bé ướt át dâm thủy, dương vật cương cứng tột độ, âm vật sưng phồng/nhói giật, rỉ tinh dịch.\n  - Bên trong: Cổ tử cung/vách âm đạo tiết nhiều dâm thủy, cảm giác bên trong nhào lộn tinh dịch, âm đạo co bóp liên hồi, lỗ hậu vô thức co rút.\n  - Cảm giác chi tiết: Hai mép thịt hé mở với sợi dâm thủy kéo tia, cảm giác râm ran ngứa ngáy lan tỏa, sự thèm khát tột độ đòi lấp đầy.` : '')
            : '') +
        (story.globalDirective?.trim()
            ? `\n\n══════════════════════════════════════════════════\n【CHỈ ĐẠO TOÀN CỤC TỪ TÁC GIẢ】\n══════════════════════════════════════════════════\n${story.globalDirective.trim()}`
            : '') +
        await (async () => {
            // Inject research data if available (all 4 modes + quickStyle fallback)
            try {
                const rd = await IdbStorage.getItem(`research_${story.id}`);
                let sg = await IdbStorage.getItem(`styleGuide_${story.id}`);
                const cr = await IdbStorage.getItem(`charResearch_${story.id}`);
                const sr = await IdbStorage.getItem(`selfResearch_${story.id}`);

                // Fallback: if no full styleGuide, try quickStyle from auto-research
                let quickStyleSection = '';
                if (!sg) {
                    const qs = await IdbStorage.getItem(`quickStyle_${story.id}`);
                    if (qs && qs.styleAnalysis) {
                        quickStyleSection = `\n\n【PHONG CÁCH VIẾT THAM KHẢO — Quick Research từ "${qs.sourceTitle}"】\n${qs.styleAnalysis}`;
                    }
                }

                const researchPrompt = ResearchService.buildResearchPrompt(rd, sg, cr, sr);
                if (researchPrompt || quickStyleSection) {
                    return `\n\n══════════════════════════════════════════════════\n【DỮ LIỆU NGHIÊN CỨU TỰ ĐỘNG — ÁP DỤNG KHI VIẾT】\n══════════════════════════════════════════════════\n${researchPrompt || ''}${quickStyleSection}`;
                }
            } catch (e) { /* ignore parse errors */ }
            return '';
        })();
}

// ================================================
// Wrapper for buildRAGContextWithEmbeddings
// (Resolves circular dependency by passing orchestrator functions)
// ================================================
export async function buildRAGContextWithEmbeddings(story, apiKey, options = {}) {
    return _buildRAGContextWithEmbeddings(story, apiKey, options, {
        buildRAGContext,
        buildLightContext
    });
}

// ================================================
// Re-export everything for backward compatibility
// ================================================
export {
    // Entity builders
    estimateTokens, evaluateMemoryDecay, scoreRelevance,
    buildCharacterContext, buildSettingContext, buildTimelineContext,
    buildPlotContext, buildCurrentInfoContext, buildAbilityContext,
    buildItemContext, buildOrganizationContext, buildQuestContext,
    buildChapterContext, buildReferenceContext, getRelevantChapterContent,
    getKeywordMatchedChapters,
    extractLorebook,
    // Memory
    buildRunningMemory, buildContinuityAnchor,
    // Search
    buildContextualQuery, packContextWithBudget, computeConfidenceScore,
    buildSourceFootnotes, buildExplainability,
    invalidateEmbeddingCache,
    getIndexedDocuments
};

// ================================================
// Unified RAGService object (backward compatible)
// ================================================
export const RAGService = {
    buildRAGContext,
    buildRAGContextWithEmbeddings,
    buildContextualQuery,
    buildSystemInstruction,
    buildRunningMemory,
    buildContinuityAnchor,
    packContextWithBudget,
    computeConfidenceScore,
    buildSourceFootnotes,
    buildExplainability,
    estimateTokens,
    scoreRelevance,
    invalidateEmbeddingCache,
    getIndexedDocuments,
    extractLorebook
};
