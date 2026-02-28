// ================================================
// AI Writing Module — continueStory, writeChapter, chatWithAI
// ================================================

import { buildRAGContext, buildRAGContextWithEmbeddings, buildSystemInstruction, buildContinuityAnchor, getIndexedDocuments } from '../ragService';
import { getGenreReminder } from '../genrePrompts';
import { OUTLINE_SYSTEM_PROMPT, OUTLINE_EXECUTION_PROMPT, buildCharacterRoster, buildWorldRules, buildNarrativeFlow } from '../defaultOutlinePrompt';
import { autoPrinciples } from '../writingPrinciples';
import { callOrbitAPI, callOrbitAPIStream, buildMessages, simulateDelay, extractContentTag, getGenerationConfig } from '../apiClient';
import { mockResponses } from '../aiMocks';
import { runWritingPipeline } from './aiWritingPipeline';
import { ResearchService } from '../researchService';
import { IdbStorage } from '../../utils/idbStorage';
import { postProcessVietnamese } from '../postProcessing';

/**
 * Continue writing the story with full RAG context
 */
export async function continueStory(apiKey, currentText, story, storyContext = {}, options = {}) {
    const { chapter } = storyContext;
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        const characterNames = story?.database?.characters?.map(c => c.name).join(', ') || 'nhân vật';
        return mockResponses.continueStory(characterNames);
    }

    // Use embedding-powered RAG for semantic context search
    let contextText, coreLorebook, usedEmbeddings = false;
    const genConfig = getGenerationConfig();
    const ragTokenBudget = genConfig.contextSize ? Math.min(genConfig.contextSize / 4, story?.maxInputTokens || 6000) : (story?.maxInputTokens || 6000);
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            currentChapterId: chapter?.id,
            query: currentText?.slice(-200) || '',
            includeContent: true,
            maxTotalTokens: ragTokenBudget,
            userIntent: 'continue_writing'
        });
        contextText = ragResult.contextText;
        coreLorebook = ragResult.coreLorebook;
        usedEmbeddings = ragResult.usedEmbeddings;
    } catch {
        const fallback = buildRAGContext(story, {
            currentChapterId: chapter?.id,
            query: currentText?.slice(-200) || '',
            includeContent: true,
            maxTotalTokens: ragTokenBudget
        });
        contextText = fallback.contextText;
        coreLorebook = fallback.coreLorebook;
    }
    console.log(`📝 continueStory: embedding=${usedEmbeddings}`);

    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\n<custom_persona>\n${directive.systemInstruction}\n</custom_persona>`;
    }

    const lastPart = (currentText || '').slice(-2000);

    // Include chapter outline if available
    let outlineSection = '';
    if (chapter?.outline) {
        outlineSection += `\n\n<chapter_outline>\nBÁM SÁT DÀN Ý SAU KHI VIẾT:\n${chapter.outline}\n</chapter_outline>`;
    }

    // Include scene outline (Dàn ý phân cảnh) if available
    const chapterScenes = story?.database?.scenes?.filter(s => s.chapterId === chapter?.id)?.sort((a, b) => a.order - b.order) || [];
    if (chapterScenes.length > 0) {
        const sceneText = chapterScenes.map((s, i) => `Cảnh ${i + 1}: ${s.name}\n- Mô tả: ${s.description}\n- Nhân vật: ${s.characters}\n- Bối cảnh: ${s.setting}`).join('\n\n');
        outlineSection += `\n\n<scene_outline>\nDÀN Ý PHÂN CẢNH (Hãy bám sát các cảnh này):\n${sceneText}\n</scene_outline>`;
    }

    const genreReminder = getGenreReminder(story);

    // Auto-select writing principles based on current content
    const { injection: principleInjection, sceneType } = autoPrinciples(lastPart, chapter, story);
    console.log(`📐 continueStory: scene=${sceneType}, principles injected=${principleInjection.length > 0}`);

    let prompt = `Bạn là một AI Novelist chuyên nghiệp. Dựa trên NGỮ CẢNH TRUYỆN và các NGUỒN DỮ LIỆU bên dưới, hãy tiếp tục viết câu chuyện. Viết khoảng 300-500 từ.

<story_context>
${contextText}
</story_context>

${chapter ? `<current_chapter>\nTiêu đề: ${chapter.title} (Tóm tắt: ${chapter.summary || 'không có'})\n</current_chapter>` : ''}${outlineSection}

<current_content>
${lastPart || '(Truyện chưa có nội dung, hãy bắt đầu viết mở đầu)'}
</current_content>

${coreLorebook ? `${coreLorebook}\n\n` : ''}<requirements>
- Bám sát văn phong hiện tại.
- ${chapter?.outline ? '⭐ BẮT BUỘC viết theo <chapter_outline> — phát triển nội dung theo đúng các mục.' : 'Phát triển tình tiết hợp lý, dựa trên cốt truyện và dàn ý.'}
- Giữ nhất quán với thông tin nhân vật và bối cảnh đã thiết lập.
- Tận dụng tài liệu tham khảo nếu liên quan.
${genreReminder ? `- ${genreReminder}\n` : ''}- ⚠️ KIỂM TRA các [Nguồn] đã cung cấp trước khi nhắc lại thông tin (tên, tuổi, ngoại hình).
- ⚠️ KHÔNG bịa thêm nhân vật mới, địa điểm mới, hoặc sự kiện không có trong dữ liệu.
- ⛔ CHỐNG VĂN MẪU: KHÔNG kết đoạn bằng câu triết lý/cảm nhận/tổng kết. Show, don't tell.
</requirements>`;

    // Inject auto-selected writing principles
    if (principleInjection) {
        prompt += `\n\n<dynamic_principles>\n${principleInjection}\n</dynamic_principles>`;
    }

    if (directive?.customInstruction) {
        prompt += `\n\n<custom_instructions>\n${directive.customInstruction}\n</custom_instructions>`;
    }

    if (genConfig.showReasoning) {
        prompt += `\n\nTRƯỚC KHI VIẾT, SUY NGHĨ TRONG THẺ <thinking> (phân tích kỹ, 7 bước):

BƯỚC 1 — VỊ TRÍ: Đoạn cuối <current_content> đang ở đâu? Câu đầu viết tiếp phải nối mạch tự nhiên.
BƯỚC 2 — HƯỚNG ĐI: Tham chiếu <chapter_outline> — tiếp theo cần phát triển gì? Mục tiêu kịch tính?
BƯỚC 3 — TƯ NGÃ NHÂN VẬT: Mỗi nhân vật đang hoạt động:
  - "Mặt ngoài": biểu hiện, thái độ, lời nói CỐ TÌNH cho thấy.
  - "Mặt trong" (tư ngã): suy nghĩ thật, nỗi sợ, ham muốn ẩn giấu.
  - Hành vi dựa trên tư ngã + hoàn cảnh, KHÔNG phải "kịch bản cần gì".
BƯỚC 4 — GIÁC QUAN: Chọn ít nhất 3 giác quan. GHI CỤ THỂ chi tiết sẽ dùng.
BƯỚC 5 — NHẤT QUÁN: Có mâu thuẫn gì với <story_context>? Nhân vật có hành động vượt khả năng?
BƯỚC 6 — ANTI-CLICHÉ: Kế hoạch có rơi vào: kết bằng triết lý? Cảm xúc sáo? Nhân vật toàn tri?
BƯỚC 7 — KẾ HOẠCH: 3-5 beat chính sẽ viết, mỗi beat ~1 dòng.

Sau khi suy nghĩ, cung cấp nội dung truyện tiếp theo trong thẻ <content>.
ĐỪNG xưng hô hay giải thích thêm ở ngoài hai thẻ này.`;
    } else {
        prompt += `\n\nTRẢ VỀ TRỰC TIẾP NỘI DUNG. KHÔNG giải thích, KHÔNG bình luận thêm.`;
    }

    const messages = buildMessages(systemInst, prompt);

    // Prefill: chèn assistant message mồi nếu được bật
    if (genConfig.prefillEnabled && genConfig.prefillContent?.trim()) {
        messages.push({ role: 'assistant', content: genConfig.prefillContent.trim() });
    }

    // Streaming toggle: nếu bật streaming VÀ có callback thì dùng stream
    let rawResponse;
    if (genConfig.streaming && options.onStream) {
        rawResponse = await callOrbitAPIStream(apiKey, model || 'gemini-3-flash-preview', messages, story?.maxOutputTokens || 3072, options.onStream, { signal: options.signal });
    } else {
        rawResponse = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, story?.maxOutputTokens || 3072, 3, { signal: options.signal });
    }

    // showReasoning: giữ nguyên thinking tag nếu bật
    if (genConfig.showReasoning) {
        const raw = (genConfig.prefillEnabled && genConfig.prefillContent?.trim())
            ? genConfig.prefillContent.trim() + rawResponse
            : rawResponse;
        return postProcessVietnamese(raw);
    }
    const extracted = extractContentTag(rawResponse);
    const result = (genConfig.prefillEnabled && genConfig.prefillContent?.trim())
        ? genConfig.prefillContent.trim() + extracted
        : extracted;
    return postProcessVietnamese(result);
}

/**
 * Chat with AI to generate content based on instructions
 */
export async function chatWithAI(apiKey, userRequest, story, currentChapterContent, history = [], options = {}) {
    const { model, chapterOutline } = options;

    if (!apiKey) {
        await simulateDelay();
        return `[MOCK AI] Đã nhận yêu cầu: "${userRequest}". Đây là đoạn viết thử nghiệm dựa trên yêu cầu của bạn.`;
    }

    // Use embedding-powered RAG for semantic context search
    let contextText, coreLorebook, usedEmbeddings = false;
    const genConfig = getGenerationConfig();
    const ragTokenBudget = genConfig.contextSize ? Math.min(genConfig.contextSize / 4, story?.maxInputTokens || 6000) : (story?.maxInputTokens || 6000);
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            query: userRequest,
            includeContent: true,
            chatHistory: history,
            maxTotalTokens: ragTokenBudget,
            userIntent: 'chat'
        });
        contextText = ragResult.contextText;
        coreLorebook = ragResult.coreLorebook;
        usedEmbeddings = ragResult.usedEmbeddings;
    } catch {
        const fallback = buildRAGContext(story, {
            query: userRequest,
            includeContent: true,
            maxTotalTokens: ragTokenBudget
        });
        contextText = fallback.contextText;
        coreLorebook = fallback.coreLorebook;
    }
    console.log(`💬 chatWithAI: embedding=${usedEmbeddings}`);

    let systemInst = await buildSystemInstruction(story);
    systemInst += `\n\n<task_rules>
NHIỆM VỤ: Trả lời yêu cầu người dùng. Viết nội dung dựa trên ngữ cảnh truyện và các [Nguồn] đã cung cấp.
⛔ QUY TẮC GROUNDING:
- Chỉ sử dụng thông tin từ các [Nguồn] được cung cấp.
- Nếu dùng thông tin từ nguồn, ghi nhận nguồn đó.
- Nếu không có thông tin → nói rõ "Không đủ dữ liệu" thay vì đoán.
⛔ KHÔNG thêm lời chào, xin lỗi, hay gợi ý ngoài yêu cầu.
</task_rules>`;

    // Include chapter outline in system instruction if available
    let outlineContent = '';
    if (chapterOutline) {
        outlineContent += `DÀN Ý CHƯƠNG HIỆN TẠI:\n${chapterOutline}\n`;
    }
    const chapterScenes = options.chapterScenes || [];
    if (chapterScenes.length > 0) {
        outlineContent += `\nDÀN Ý PHÂN CẢNH:\n${chapterScenes.map((s, i) => `Cảnh ${i + 1}: ${s.name}\n- Mô tả: ${s.description}\n- Nhân vật: ${s.characters}\n- Bối cảnh: ${s.setting}`).join('\n\n')}`;
    }

    if (outlineContent) {
        systemInst += `\n\n<chapter_outline>\n${outlineContent}\n</chapter_outline>\n\n⭐ Khi người dùng yêu cầu viết nội dung, BẮT BUỘC phải viết theo dàn ý chương/phân cảnh ở trên.`;
    }

    // Build OpenAI-style messages array with history
    const messages = [];
    messages.push({ role: 'system', content: systemInst });

    // Add context as a system-level message
    messages.push({ role: 'system', content: `<story_context>\n${contextText}\n</story_context>\n\n<current_chapter_content>\n${(currentChapterContent || '').slice(-1500)}\n</current_chapter_content>` });

    // Add recent chat history (last 5)
    history.slice(-5).forEach(msg => {
        messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
    });

    // Add new user message with injected rules
    let finalUserMsg = userRequest;

    if (genConfig.showReasoning) {
        finalUserMsg += `\n\nTRƯỚC KHI TRẢ LỜI, SUY NGHĨ TRONG THẺ <thinking> (5 bước):

BƯỚC 1 — PHÂN TÍCH: Yêu cầu cụ thể là gì? Viết nội dung? Gợi ý? Phân tích? Sửa lỗi?
BƯỚC 2 — NGỮ CẢNH: Kiểm tra <story_context> — có thông tin nào liên quan? Nhân vật nào đang hoạt động?
BƯỚC 3 — TƯ NGÃ (nếu viết nội dung): Nhân vật hành xử theo "mặt trong" (động cơ ẩn, nỗi sợ, ham muốn) — KHÔNG theo "kịch bản cần gì".
BƯỚC 4 — ANTI-CLICHÉ: Tránh kết bằng triết lý, cảm xúc sáo, giải quyết quá dễ.
BƯỚC 5 — KẾ HOẠCH: Liệt kê 2-3 ý chính sẽ viết.

Sau khi suy nghĩ, xuất câu trả lời trong thẻ <content>.
ĐỪNG xưng hô hay giải thích thêm ở ngoài hai thẻ này.`;
    } else {
        finalUserMsg += `\n\nTRẢ VỀ TRỰC TIẾP CÂU TRẢ LỜI. KHÔNG giải thích, KHÔNG bình luận thêm.`;
    }

    if (coreLorebook) {
        finalUserMsg = `${coreLorebook}\n\n${finalUserMsg}`;
    }

    messages.push({ role: 'user', content: finalUserMsg });

    // Prefill: chèn assistant message mồi nếu được bật
    if (genConfig.prefillEnabled && genConfig.prefillContent?.trim()) {
        messages.push({ role: 'assistant', content: genConfig.prefillContent.trim() });
    }

    // useWebSearch: đọc từ config thay vì hardcode
    const rawResponse = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, story?.maxOutputTokens || 3072, 5, { useWebSearch: genConfig.useWebSearch, signal: options.signal });

    // showReasoning: giữ nguyên thinking tag nếu bật
    if (genConfig.showReasoning) return postProcessVietnamese(rawResponse);
    return postProcessVietnamese(extractContentTag(rawResponse));
}

/**
 * Write an entire chapter with full RAG context.
 * Uses 2 sequential API calls:
 *   1) Generate a detailed chapter outline (blueprint)
 *   2) Write the chapter based on that outline
 * options.onProgress(step, message) — optional callback for UI status updates
 */
export async function writeChapter(apiKey, chapter, story, options = {}) {
    const { directive, model, onProgress, onStream, useWebSearch, resumeText } = options;
    const outlineTokens = story?.maxOutputTokens ? Math.min(story.maxOutputTokens, 4096) : 4096;
    const writeTokens = story?.maxOutputTokens || 8192;

    if (!apiKey) {
        await simulateDelay();
        return `# ${chapter.title || 'Chương mới'}\n\n(Cần nhập API key để AI viết chương.)`;
    }

    // ════════════════════════════════════════════
    // TIỀN XỬ LÝ: Thu thập & chuẩn bị dữ liệu
    // ════════════════════════════════════════════

    // Step 0a: RAG context search
    if (onProgress) onProgress('rag', '🔍 Đang tìm kiếm thông tin liên quan...');
    console.log('🔍 writeChapter: Searching for relevant context...');

    let contextText, usedEmbeddings = false;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            currentChapterId: chapter.id,
            includeContent: true,
            maxTotalTokens: story?.maxInputTokens || 12000,
            userIntent: 'write_chapter',
            onIndexProgress: (current, total) => {
                if (onProgress) {
                    onProgress('rag', `🔍 Đang index: ${current}/${total} chunks...`);
                }
            }
        });
        contextText = ragResult.contextText;
        usedEmbeddings = ragResult.usedEmbeddings;
    } catch {
        const fallback = buildRAGContext(story, {
            currentChapterId: chapter.id,
            includeContent: true,
            maxTotalTokens: story?.maxInputTokens || 12000
        });
        contextText = fallback.contextText;
    }
    console.log(`📖 writeChapter: embedding=${usedEmbeddings}`);

    // Step 0d: Quick Research (Extension-powered) — mỗi chương đọc thêm nội dung mới
    // Skip nếu đã có full styleGuide (từ Research thủ công), vẫn chạy nếu chỉ có quickStyle
    try {
        const existingFullStyle = await IdbStorage.getItem(`styleGuide_${story.id}`);
        if (!existingFullStyle) {
            // Check if Extension is available
            try {
                const healthResp = await fetch('http://localhost:8080/health', { signal: AbortSignal.timeout(2000) });
                if (healthResp.ok) {
                    const health = await healthResp.json();
                    if (health.extensionConnected) {
                        const existingQuickStyle = await IdbStorage.getItem(`quickStyle_${story.id}`);
                        if (onProgress) onProgress('quick_research', '🔍 Extension: Tìm truyện tham khảo...');
                        console.log('🔍 writeChapter: Extension available, running Quick Research...');
                        const quickResult = await ResearchService.quickStyleResearch(apiKey, story, {
                            model,
                            existingData: existingQuickStyle, // truyền data cũ để tránh đọc lại chương đã đọc
                            onProgress: (msg) => onProgress?.('quick_research', msg),
                            signal: options.signal,
                        });
                        if (quickResult) {
                            await IdbStorage.setItem(`quickStyle_${story.id}`, quickResult);
                            console.log('✅ writeChapter: Quick Research saved to IDB');
                        }
                    }
                }
            } catch (healthErr) {
                // Extension not running — skip silently
                console.log('🔍 writeChapter: Extension not available, skipping Quick Research');
            }
        } else {
            console.log('📚 writeChapter: Full style guide exists, skipping Quick Research');
        }
    } catch (qrErr) {
        console.warn('🔍 writeChapter: Quick Research check failed:', qrErr.message);
    }

    // Step 0b: Build system instruction & gather story facts
    if (onProgress) onProgress('system', '📚 Đang xử lý ngữ cảnh truyện...');
    console.log('📚 writeChapter: Building system instruction...');

    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const genreReminder = getGenreReminder(story);

    // Step 0c: Analyze previous chapters
    if (onProgress) onProgress('chapters', '📖 Đang phân tích các chương trước...');
    console.log('📖 writeChapter: Analyzing previous chapters...');

    const chapters = story?.database?.chapters || [];
    const prevChapters = chapters
        .filter(c => (c.order || 0) < (chapter.order || 0))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    const prevSummary = prevChapters
        .map(c => `Chương ${c.order}: ${c.title} — ${c.summary || '(không có tóm tắt)'}`)
        .join('\n');

    console.log(`📖 writeChapter: Found ${prevChapters.length} previous chapters`);

    // ════════════════════════════════════════════
    // BƯỚC 1: Lập dàn ý chi tiết cho chương
    // ════════════════════════════════════════════
    if (onProgress) onProgress('outline', '📋 Bước 1/2: Đang lập dàn ý chi tiết...');
    console.log('📋 writeChapter Step 1: Generating outline...');

    // Use existing outline if available, otherwise generate one
    let chapterBlueprint = chapter.outline || '';

    if (!chapterBlueprint) {
        // Build structured sections from story data (advanced strategist framework)
        const characterRoster = buildCharacterRoster(story?.database?.characters);
        const worldRules = buildWorldRules(story);
        const lastChapterContent = prevChapters.length > 0
            ? (prevChapters[prevChapters.length - 1].content || '').slice(-500)
            : '';
        const narrativeFlow = buildNarrativeFlow(prevSummary, lastChapterContent, chapter);

        const chapterScenes = story?.database?.scenes?.filter(s => s.chapterId === chapter.id)?.sort((a, b) => a.order - b.order) || [];
        let sceneText = '';
        if (chapterScenes.length > 0) {
            sceneText = `\n<CURRENT_SCENE_OUTLINE>\nNGƯỜI DÙNG ĐÃ ĐỊNH NGHĨA CÁC PHÂN CẢNH SAU, BẮT BUỘC PHẢI BAO GỒM VÀO KẾ HOẠCH:\n${chapterScenes.map((s, i) => `Cảnh ${i + 1}: ${s.name}\n- Mô tả: ${s.description}\n- Nhân vật: ${s.characters}\n- Bối cảnh: ${s.setting}`).join('\n\n')}\n</CURRENT_SCENE_OUTLINE>\n`;
        }

        const outlinePrompt = `Hãy tạo KẾ HOẠCH HÀNH ĐỘNG (DÀN Ý CHI TIẾT) cho chương sau, sử dụng framework phân tích chiến lược.

${contextText}

<STORY_META>
<CURRENT_CHAPTER_GOAL>
Chương ${chapter.order || '?'}: ${chapter.title || 'Chưa có tiêu đề'}
Tóm tắt mục tiêu: ${chapter.summary || 'Chưa có tóm tắt'}
</CURRENT_CHAPTER_GOAL>
${sceneText}</STORY_META>

${characterRoster}

${worldRules}

${narrativeFlow}

YÊU CẦU OUTPUT:
- Viết bằng tiếng Việt
- Tuân thủ format: BƯỚC 0 (Logic Audit) → PHÂN TÍCH TÌNH HUỐNG → KẾ HOẠCH TRIỂN KHAI (Hook → Development → Highlight → Beat End) → GHI CHÚ CHO WRITER AI
- Mỗi phân đoạn phải có: bối cảnh, nhân vật, hành động, đối thoại, cảm xúc, mục tiêu
- Chỉ rõ GIỚI HẠN KIẾN THỨC và CÁI GIÁ PHẢI TRẢ
- ⛔ Chỉ sử dụng nhân vật, bối cảnh, sự kiện đã có trong DỮ LIỆU GỐC
${genreReminder ? `- ${genreReminder}\n` : ''}
${OUTLINE_EXECUTION_PROMPT}

HÃY BẮT ĐẦU PHÂN TÍCH VÀ LẬP DÀN Ý:`;

        // Use strategist system prompt for outline generation
        let outlineSystemInst = systemInst + `\n\n${OUTLINE_SYSTEM_PROMPT}`;
        const outlineMessages = buildMessages(outlineSystemInst, outlinePrompt);
        chapterBlueprint = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', outlineMessages, outlineTokens, 3, { signal: options.signal });
        console.log('📋 writeChapter Step 1: Strategic outline generated ✓');
    } else {
        if (onProgress) onProgress('outline_skip', '📋 Bước 1/2: Sử dụng dàn ý có sẵn ✓');
        console.log('📋 writeChapter Step 1: Using existing outline ✓');
    }

    // Skip outline generation completely if we are resuming (we assume outline is already handled)
    if (resumeText) {
        if (onProgress) onProgress('resume', '♻️ Khôi phục tiến trình đang viết dở...');
        console.log('♻️ writeChapter: Resuming from partial text...');
    }

    // ════════════════════════════════════════════
    // BƯỚC 2-4: Pipeline viết theo phân cảnh + Phê bình tự động
    // ════════════════════════════════════════════
    if (onProgress) onProgress('pipeline', '🎬 Khởi động Pipeline viết chương...');
    console.log('🎬 writeChapter: Starting scene-by-scene pipeline...');

    // Build continuity anchor from previous chapter
    const continuityAnchor = buildContinuityAnchor(story, chapter);

    // If resuming, fall back to legacy single-call mode (pipeline doesn't support resume)
    if (resumeText) {
        // We only extract coreLorebook if we need to pass it manually to legacy pipeline
        const lightFallback = buildRAGContext(story, { currentChapterId: chapter.id });
        return await _legacyWriteChapter(apiKey, chapterBlueprint, {
            contextText, systemInst: systemInst, chapter, story,
            genreReminder, continuityAnchor, resumeText, coreLorebook: lightFallback.coreLorebook
        }, options);
    }

    // Run the full pipeline: Scene Plan → Write Scenes → Critique → Refine
    const pipelineResult = await runWritingPipeline(apiKey, chapterBlueprint, {
        contextText,
        systemInst: systemInst,
        chapter,
        story,
        genreReminder,
        continuityAnchor,
        indexedDocuments: getIndexedDocuments(story?.id || 'unknown'),
    }, {
        model,
        directive,
        onProgress,
        onStream,
        signal: options.signal,
        useWebSearch,
    });

    if (onProgress) onProgress('done', '✅ Hoàn thành!');
    console.log('✍️ writeChapter: Pipeline complete ✓');

    return { text: pipelineResult.text, webSources: pipelineResult.webSources || [] };
}

/**
 * Legacy single-call chapter writing — used as fallback for resume mode.
 */
async function _legacyWriteChapter(apiKey, chapterBlueprint, ctx, options = {}) {
    const { contextText, systemInst, chapter, story, genreReminder, continuityAnchor, resumeText, coreLorebook } = ctx;
    const { directive, model, onProgress, onStream, useWebSearch } = options;
    const writeTokens = story?.maxOutputTokens || 8192;

    if (onProgress) onProgress('writing', '✍️ Đang viết tiếp nội dung chương (legacy)...');
    console.log('✍️ _legacyWriteChapter: Writing with resume text...');

    // Auto-select writing principles
    const principleSource = chapterBlueprint || chapter.summary || chapter.title || '';
    const { injection: principleInjection } = autoPrinciples(principleSource, chapter, story);

    // Build scene outline section if it exists
    const chapterScenes = story?.database?.scenes?.filter(s => s.chapterId === chapter?.id)?.sort((a, b) => a.order - b.order) || [];
    let sceneText = '';
    if (chapterScenes.length > 0) {
        sceneText = `\n\n<scene_outline>\nDÀN Ý PHÂN CẢNH (BẮT BUỘC VIẾT THEO CÁC CẢNH NÀY):\n${chapterScenes.map((s, i) => `Cảnh ${i + 1}: ${s.name}\n- Mô tả: ${s.description}\n- Nhân vật: ${s.characters}\n- Bối cảnh: ${s.setting}`).join('\n\n')}\n</scene_outline>`;
    }

    let writePrompt = `Dựa trên NGỮ CẢNH TRUYỆN và DÀN Ý CHI TIẾT bên dưới, hãy viết trọn vẹn nội dung cho chương.

<story_context>
${contextText}
</story_context>

${continuityAnchor ? `<continuity_anchor>\n${continuityAnchor}\n</continuity_anchor>\n` : ''}
<chapter_goal>
CHƯƠNG CẦN VIẾT:
- Chương ${chapter.order || '?'}: ${chapter.title || 'Chưa có tiêu đề'}
- Tóm tắt: ${chapter.summary || 'Chưa có tóm tắt'}
</chapter_goal>

<chapter_outline>
DÀN Ý CHI TIẾT (BẮT BUỘC VIẾT THEO):
${chapterBlueprint}
</chapter_outline>${sceneText}

<current_content>
NỘI DUNG ĐÃ VIẾT DỞ DANG (Hãy tiếp tục từ đây):
${resumeText.slice(-3000)}
</current_content>

${coreLorebook ? `${coreLorebook}\n\n` : ''}<requirements>
- Viết bằng tiếng Việt, văn phong sáng tạo, hấp dẫn.
- ⭐ BẮT BUỘC viết TIẾP NỐI ngay lập tức từ đoạn cuối của <current_content>. KHÔNG lặp lại những gì đã viết.
- ⭐ BẮT BUỘC viết theo từng mục trong <chapter_outline>${sceneText ? ' và <scene_outline>' : ''}.
- Bao gồm đối thoại tự nhiên giữa các nhân vật.
- Mô tả cảnh vật, cảm xúc, hành động sinh động.
${genreReminder ? `- ${genreReminder}\n` : ''}- ⛔ BẮT BUỘC nhất quán với DỮ LIỆU GỐC.
- ⛔ KHÔNG bịa thêm nhân vật, địa điểm, sự kiện không có trong cơ sở dữ liệu.
- ⛔ CHỐNG VĂN MẪU: KHÔNG kết đoạn bằng câu triết lý/cảm nhận/tổng kết. Show, don't tell.
</requirements>`;

    if (principleInjection) {
        writePrompt += `\n\n<dynamic_principles>\n${principleInjection}\n</dynamic_principles>`;
    }
    if (directive?.customInstruction) {
        writePrompt += `\n\n<custom_instructions>\n${directive.customInstruction}\n</custom_instructions>`;
    }

    const genConfig = getGenerationConfig();
    if (genConfig.showReasoning) {
        writePrompt += `\n\nTRƯỚC KHI VIẾT, SUY NGHĨ TRONG THẺ <thinking> (phân tích kỹ, 7 bước):

BƯỚC 1 — NỐI MẠCH: Đoạn cuối <current_content> kết thúc ở đâu? Viết tiếp nối mạch tự nhiên.
BƯỚC 2 — MỤC TIÊU: Mục tiêu kịch tính chính của phần tiếp theo là gì?
BƯỚC 3 — TƯ NGÃ: Mỗi nhân vật đang hoạt động:
  - "Mặt ngoài" vs "Mặt trong" (tư ngã thật).
  - Hành vi dựa trên tư ngã + hoàn cảnh, KHÔNG dựa trên kịch bản.
BƯỚC 4 — GIÁC QUAN: Chọn 3+ giác quan cụ thể.
BƯỚC 5 — NHẤT QUÁN: Kiểm tra mâu thuẫn với dữ liệu gốc.
BƯỚC 6 — ANTI-CLICHÉ: Tránh kết triết lý, cảm xúc sáo, toàn tri.
BƯỚC 7 — KẾ HOẠCH: 3-5 beat chính, mỗi beat ~1 dòng.

Sau khi suy nghĩ, viết nội dung chương trong thẻ <content>.
ĐỪNG xưng hô hay giải thích thêm ở ngoài hai thẻ này.`;
    } else {
        writePrompt += `\n\nTRẢ VỀ TRỰC TIẾP NỘI DUNG. KHÔNG giải thích, KHÔNG bình luận thêm.`;
    }

    const writeMessages = buildMessages(systemInst, writePrompt);
    const webSearchOpts = useWebSearch ? { useWebSearch: true, signal: options.signal } : { signal: options.signal };
    let result;
    if (onStream) {
        result = await callOrbitAPIStream(apiKey, model || 'gemini-3-flash-preview', writeMessages, writeTokens, onStream, webSearchOpts);
    } else {
        result = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', writeMessages, writeTokens, 5, webSearchOpts);
    }

    let chapterText = typeof result === 'object' ? (result.text || '') : result;
    chapterText = postProcessVietnamese(extractContentTag(chapterText));

    if (onProgress) onProgress('done', '✅ Hoàn thành!');
    return { text: chapterText, webSources: [] };
}
