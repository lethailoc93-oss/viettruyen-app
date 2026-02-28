// ================================================
// AI Outline Module — outline generation functions
// ================================================

import { buildRAGContext, buildRAGContextWithEmbeddings, buildSystemInstruction } from '../ragService';
import { getGenreReminder } from '../genrePrompts';
import { OUTLINE_SYSTEM_PROMPT, OUTLINE_EXECUTION_PROMPT, buildCharacterRoster, buildWorldRules, buildNarrativeFlow } from '../defaultOutlinePrompt';
import { callOrbitAPI, buildMessages, simulateDelay } from '../apiClient';
import { mockResponses } from '../aiMocks';

/**
 * Generate story outline with RAG awareness
 */
export async function generateOutline(apiKey, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return mockResponses.generateOutline(story?.genre);
    }

    let contextText;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            query: story?.title || '',
            includeContent: false
        });
        contextText = ragResult.contextText;
    } catch {
        contextText = buildRAGContext(story, { includeContent: false }).contextText;
    }
    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const genreReminder = getGenreReminder(story);

    let prompt = `Dựa trên NGỮ CẢNH TRUYỆN, hãy tạo dàn ý tổng chi tiết.

<story_context>
${contextText}
</story_context>

<requirements>
- Viết bằng tiếng Việt.
- Chia thành 6-10 phần chính.
- Mỗi phần có tiêu đề và mô tả ngắn (2-3 câu).
- Cấu trúc hợp lý: mở đầu → phát triển → cao trào → kết thúc.
- Tận dụng nhân vật, bối cảnh, sự kiện đã có.
- Tạo các tình tiết hấp dẫn và bất ngờ.
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi viết dàn ý vào thẻ <content>.`;

    if (directive?.customInstruction) {
        prompt += `\n\n<custom_instructions>\n${directive.customInstruction}\n</custom_instructions>`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, 3, { signal: options.signal });
}

/**
 * Generate chapter outline with story context — uses strategist framework
 */
export async function generateChapterOutline(apiKey, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return mockResponses.chapterOutline();
    }

    let contextText;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            query: story?.title || '',
            includeContent: false
        });
        contextText = ragResult.contextText;
    } catch {
        contextText = buildRAGContext(story, { includeContent: false }).contextText;
    }
    let systemInst = await buildSystemInstruction(story);
    systemInst += `\n\n${OUTLINE_SYSTEM_PROMPT}`;
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const genreReminder = getGenreReminder(story);
    const characterRoster = buildCharacterRoster(story?.database?.characters);
    const worldRules = buildWorldRules(story);

    let prompt = `Dựa trên NGỮ CẢNH TRUYỆN, hãy tạo dàn ý chương chi tiết cho toàn bộ truyện.

<story_context>
${contextText}
</story_context>

${characterRoster}

${worldRules}

<requirements>
- Viết bằng tiếng Việt.
- Tạo 8-15 chương.
- Format mỗi chương: "Chương [số]: [Tiêu đề] - [Tóm tắt ngắn]"
- Liên kết với nhân vật, bối cảnh đã có.
- Phát triển và cao trào rõ ràng.
- Mỗi hành động nhân vật phải có hệ quả logic và chi phí.
- Nhân vật chỉ hành động dựa trên kiến thức họ có.
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi viết danh sách chương vào thẻ <content>.`;

    if (directive?.customInstruction) {
        prompt += `\n\n<custom_instructions>\n${directive.customInstruction}\n</custom_instructions>`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 3072, 3, { signal: options.signal });
}

/**
 * Generate detailed outline for a SINGLE chapter — serves as writing guide.
 * Uses advanced Grandmaster Strategist framework with:
 * - CHARACTER_ROSTER (knowledge limits, action limits)
 * - WORLD_RULES_AND_MEMORY (pinned canon, world laws)
 * - NARRATIVE_FLOW (previous context, immediate buffer)
 * - PRIORITY_STACK (Logic Audit > Constraint > Continuity > Style > Genre)
 */
export async function generateSingleChapterOutline(apiKey, chapter, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return `📋 DÀN Ý CHI TIẾT — Chương ${chapter.order || '?'}: ${chapter.title || 'Chưa đặt tên'}\n\n=== BƯỚC 0: THẨM ĐỊNH LOGIC ===\n(Cần API key để phân tích)\n\n=== PHÂN TÍCH TÌNH HUỐNG ===\n- Hiện trạng: [Phân tích nhân vật]\n- Địa điểm: [Bối cảnh]\n\n=== KẾ HOẠCH TRIỂN KHAI ===\n1. Mở đầu (Hook): [Thu hút + đặt vấn đề]\n2. Diễn biến (Development): [Hành động – phản ứng]\n3. Cao trào (Highlight): [Xung đột đỉnh điểm]\n4. Kết thúc nhịp (Beat End): [Trạng thái mới]\n\n=== GHI CHÚ CHO WRITER AI ===\n- Giọng văn: [Tùy thể loại]\n- Lỗi cần tránh: nhân vật toàn tri, plot armor`;
    }

    // Get context with content from previous chapters — use embedding RAG for precision
    let contextText;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            currentChapterId: chapter.id,
            query: `${chapter.title || ''} ${chapter.summary || ''}`,
            includeContent: true,
            maxTotalTokens: 4000
        });
        contextText = ragResult.contextText;
    } catch {
        contextText = buildRAGContext(story, {
            currentChapterId: chapter.id,
            includeContent: true,
            maxTotalTokens: 4000
        }).contextText;
    }

    // Build strategist system instruction
    let systemInst = await buildSystemInstruction(story);
    systemInst += `\n\n${OUTLINE_SYSTEM_PROMPT}`;
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    // Get previous chapters for continuity
    const chapters = story?.database?.chapters || [];
    const prevChapters = chapters
        .filter(c => (c.order || 0) < (chapter.order || 0))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    const prevSummary = prevChapters
        .map(c => `Chương ${c.order}: ${c.title} — ${c.summary || '(không có tóm tắt)'}`)
        .join('\n');

    const genreReminder = getGenreReminder(story);

    // Build structured sections from story data
    const characterRoster = buildCharacterRoster(story?.database?.characters);
    const worldRules = buildWorldRules(story);
    const lastChapterContent = prevChapters.length > 0
        ? (prevChapters[prevChapters.length - 1].content || '').slice(-500)
        : '';
    const narrativeFlow = buildNarrativeFlow(prevSummary, lastChapterContent, chapter);

    let prompt = `Hãy tạo KẾ HOẠCH HÀNH ĐỘNG (DÀN Ý CHI TIẾT) cho chương sau, sử dụng framework phân tích chiến lược.

<story_context>
${contextText}
</story_context>

<current_chapter_goal>
Chương ${chapter.order || '?'}: ${chapter.title || 'Chưa có tiêu đề'}
Tóm tắt mục tiêu: ${chapter.summary || 'Chưa có tóm tắt'}
${chapter.content ? `Nội dung hiện tại (đoạn đầu): ${chapter.content.slice(0, 500)}...` : ''}
</current_chapter_goal>

${characterRoster}

${worldRules}

${narrativeFlow}

<requirements>
- Viết bằng tiếng Việt.
- Tuân thủ format: BƯỚC 0 (Logic Audit) → PHÂN TÍCH TÌNH HUỐNG → KẾ HOẠCH TRIỂN KHAI (Hook → Development → Highlight → Beat End) → GHI CHÚ CHO WRITER AI
- Mỗi phân đoạn phải có: bối cảnh, nhân vật, hành động, đối thoại, cảm xúc, mục tiêu.
- Chỉ rõ GIỚI HẠN KIẾN THỨC của nhân vật trong tình huống này.
- Chỉ rõ CÁI GIÁ PHẢI TRẢ cho mỗi quyết định quan trọng.
- Dàn ý phải đủ chi tiết để viết thành chương 800-1500 từ.
- ⛔ Chỉ sử dụng nhân vật, bối cảnh, sự kiện đã có trong dữ liệu.
${genreReminder ? `- ${genreReminder}\n` : ''}
${OUTLINE_EXECUTION_PROMPT}
</requirements>

HÃY BẮT ĐẦU PHÂN TÍCH VÀ LẬP DÀN Ý TRONG THẺ <content>:`;

    if (directive?.customInstruction) {
        prompt += `\n\n<custom_instructions>\n${directive.customInstruction}\n</custom_instructions>`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 4096, 3, { signal: options.signal });
}

/**
 * Generate scene outline for a specific chapter
 */
export async function generateSceneOutline(apiKey, chapterTitle, chapterSummary, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return mockResponses.sceneOutline();
    }

    let contextText;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            query: `${chapterTitle || ''} ${chapterSummary || ''}`,
            includeContent: false
        });
        contextText = ragResult.contextText;
    } catch {
        contextText = buildRAGContext(story, { includeContent: false }).contextText;
    }
    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const genreReminder = getGenreReminder(story);

    let prompt = `Dựa trên NGỮ CẢNH TRUYỆN, hãy tạo dàn ý phân cảnh${chapterTitle ? ` cho chương "${chapterTitle}"` : ''}.

<story_context>
${contextText}
</story_context>

${chapterSummary ? `<chapter_summary>\n${chapterSummary}\n</chapter_summary>\n` : ''}
<requirements>
- Viết bằng tiếng Việt.
- Tạo 5-8 cảnh chi tiết.
- Mỗi cảnh phải có mô tả DÀI VÀ CHI TIẾT (ít nhất 3-5 câu), bao gồm: diễn biến cảnh, tâm trạng nhân vật, bầu không khí, mục tiêu cảnh.
- Xác định rõ: tên cảnh, nhân vật tham gia (kèm vai trò/động lực), bối cảnh cụ thể.
- Nhịp điệu: cảnh tĩnh xen kẽ cảnh động.
- Mỗi cảnh phải chỉ rõ XUNG ĐỘT hoặc MỤC TIÊU CHÍNH.
${genreReminder ? `- ${genreReminder}\n` : ''}
⛔ QUAN TRỌNG: Trả về kết quả dưới dạng JSON array (không markdown formatting block, KHÔNG kèm \`\`\`json):
[
  {
    "name": "Tên cảnh ngắn gọn",
    "description": "Mô tả chi tiết (3-5 câu)",
    "characters": "Nhân vật 1 (vai trò/hành động), Nhân vật 2 (vai trò/hành động)",
    "setting": "Mô tả bối cảnh cụ thể"
  }
]
</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi trả về chuỗi JSON thuần.`;

    if (directive?.customInstruction) {
        prompt += `\n\n<custom_instructions>\n${directive.customInstruction}\n</custom_instructions>`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 4096, 3, { signal: options.signal });
}
