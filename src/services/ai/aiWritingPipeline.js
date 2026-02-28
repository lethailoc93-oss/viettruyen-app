// ================================================
// AI Writing Pipeline — Scene-by-Scene + Auto-Editor
// Replaces monolithic chapter writing with multi-step pipeline:
//   1. Split outline into scenes
//   2. Write each scene sequentially
//   3. Auto-critique & refine
// ================================================

import { callOrbitAPI, callOrbitAPIStream, buildMessages, extractContentTag, getGenerationConfig } from '../apiClient';
import { autoPrinciples } from '../writingPrinciples';
import { EmbeddingService } from '../embeddingService';

// ════════════════════════════════════════════
// SCENE SPLITTING — Parse outline into scenes
// ════════════════════════════════════════════

/**
 * Request AI to split a chapter outline into structured scenes.
 * Returns an array of scene objects.
 */
export async function generateScenePlan(apiKey, chapterBlueprint, chapter, systemInst, model, options = {}) {
    const prompt = `Dựa trên DÀN Ý CHƯƠNG bên dưới, hãy chia thành 3-5 PHÂN CẢNH (SCENES) riêng biệt.

<chapter_outline>
${chapterBlueprint}
</chapter_outline>

<chapter_info>
Chương ${chapter.order || '?'}: ${chapter.title || 'Chưa đặt tên'}
Tóm tắt: ${chapter.summary || 'Chưa có'}
</chapter_info>

YÊU CẦU:
- Mỗi phân cảnh là một đơn vị kịch tính độc lập, có mở - thân - đóng riêng.
- Phân cảnh đầu tiên PHẢI là HOOK (mở đầu cuốn hút).
- Phân cảnh cuối PHẢI là BEAT END (cliffhanger hoặc chuyển tiếp).
- Mỗi cảnh chỉ tập trung vào 1-2 sự kiện chính, KHÔNG nhồi nhét.

FORMAT BẮT BUỘC (để parser đọc được):

## CẢNH 1: [Tên cảnh] — [Loại: Hook/Development/Highlight/Beat End]
- Mục tiêu: [Mục tiêu kịch tính chính của cảnh này]
- Nhân vật: [Tên các nhân vật xuất hiện]
- Bối cảnh: [Địa điểm, thời gian, không khí]
- Cảm xúc: [Tone cảm xúc chủ đạo]
- Hành động: [Mô tả ngắn gọn diễn biến chính]
- Kết nối: [Cảnh này nối với cảnh sau như thế nào]

## CẢNH 2: ...
(tiếp tục cho đến hết)

⛔ KHÔNG viết nội dung truyện. Chỉ lập KẾ HOẠCH.
⛔ KHÔNG thêm nhân vật/sự kiện không có trong dàn ý gốc.`;

    const messages = buildMessages(systemInst, prompt);
    const raw = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, 3, { signal: options.signal });
    return parseScenePlan(raw);
}

/**
 * Parse AI-generated scene plan into structured objects.
 */
function parseScenePlan(rawText) {
    const scenes = [];
    // Split by ## CẢNH headers
    const parts = rawText.split(/##\s*CẢNH\s*\d+\s*:/i).filter(p => p.trim());

    parts.forEach((part, index) => {
        const lines = part.trim().split('\n');
        const headerLine = lines[0] || '';

        // Extract title and type from header "Tên cảnh — Loại"
        const headerMatch = headerLine.match(/^(.+?)(?:\s*[—\-–]\s*(.+))?$/);
        const title = headerMatch?.[1]?.trim() || `Cảnh ${index + 1}`;
        const sceneType = headerMatch?.[2]?.trim() || 'Development';

        // Extract fields
        const getField = (label) => {
            const line = lines.find(l => l.trim().startsWith(`- ${label}:`));
            return line ? line.replace(new RegExp(`^\\s*-\\s*${label}:\\s*`, 'i'), '').trim() : '';
        };

        scenes.push({
            id: index + 1,
            title,
            type: sceneType,
            goal: getField('Mục tiêu'),
            characters: getField('Nhân vật'),
            setting: getField('Bối cảnh'),
            emotion: getField('Cảm xúc'),
            action: getField('Hành động'),
            connection: getField('Kết nối'),
            raw: part.trim(),
        });
    });

    // Fallback: if parsing failed, create a single scene from the whole text
    if (scenes.length === 0) {
        scenes.push({
            id: 1,
            title: 'Toàn bộ chương',
            type: 'Full',
            goal: '',
            characters: '',
            setting: '',
            emotion: '',
            action: '',
            connection: '',
            raw: rawText,
        });
    }

    return scenes;
}

// ════════════════════════════════════════════
// SCENE WRITING — Write one scene at a time
// ════════════════════════════════════════════

/**
 * Write a single scene with full context from previous scenes.
 * @param {string} apiKey
 * @param {Object} scene - Scene object from parseScenePlan
 * @param {string[]} prevSceneTexts - Text of previously written scenes
 * @param {Object} ctx - { contextText, systemInst, chapter, story, genreReminder, continuityAnchor }
 * @param {Object} options - { model, directive, onStream, signal }
 */
export async function writeScene(apiKey, scene, prevSceneTexts, ctx, options = {}) {
    const { contextText, systemInst, chapter, story, genreReminder, continuityAnchor, indexedDocuments } = ctx;
    const { model, directive, onStream, signal } = options;
    const writeTokens = story?.maxOutputTokens || 4096;

    // ── Per-Scene Micro-RAG: targeted context for this specific scene ──
    let sceneSpecificContext = '';
    try {
        if (apiKey && indexedDocuments && indexedDocuments.length > 0) {
            const sceneQuery = [scene.characters, scene.setting, scene.goal, scene.action]
                .filter(Boolean).join(' ').slice(0, 300);
            if (sceneQuery.trim()) {
                const sceneResults = await EmbeddingService.hybridSearch(
                    apiKey, sceneQuery, indexedDocuments,
                    { topK: 5, storyId: story?.id || 'unknown', currentChapterOrder: chapter?.order || 0 }
                );
                if (sceneResults.length > 0) {
                    sceneSpecificContext = sceneResults
                        .map(r => r.text).join('\n')
                        .slice(0, 2000);
                    console.log(`🎯 Scene ${scene.id} micro-RAG: ${sceneResults.length} results, ${sceneSpecificContext.length} chars`);
                }
            }
        }
    } catch (err) {
        console.warn(`⚠️ Scene ${scene.id} micro-RAG failed:`, err.message);
    }

    // Auto-select writing principles based on scene content
    const principleSource = scene.raw || scene.goal || scene.title || '';
    const { injection: principleInjection, sceneType: detectedType } = autoPrinciples(principleSource, chapter, story);
    console.log(`🎬 writeScene #${scene.id}: type=${scene.type}, detected=${detectedType}`);

    // Build continuity from previous scenes
    const prevContext = prevSceneTexts.length > 0
        ? prevSceneTexts.slice(-1)[0].slice(-800) // Last 800 chars of previous scene
        : '';

    let prompt = `Bạn đang viết PHÂN CẢNH ${scene.id} của chương. Viết CHÍNH XÁC cảnh này, không viết thêm cảnh khác.

<story_context>
${contextText}
</story_context>

${sceneSpecificContext ? `<scene_specific_context>\nDỮ LIỆU LIÊN QUAN TRỰC TIẾP ĐẾN CẢNH NÀY (ưu tiên cao):\n${sceneSpecificContext}\n</scene_specific_context>\n` : ''}
${continuityAnchor ? `<continuity_anchor>\n${continuityAnchor}\n</continuity_anchor>\n` : ''}
<chapter_info>
Chương ${chapter.order || '?'}: ${chapter.title || 'Chưa đặt tên'}
</chapter_info>

<current_scene>
PHÂN CẢNH ${scene.id}: ${scene.title} — ${scene.type}
- Mục tiêu: ${scene.goal}
- Nhân vật: ${scene.characters}
- Bối cảnh: ${scene.setting}
- Cảm xúc: ${scene.emotion}
- Hành động: ${scene.action}
- Kết nối cảnh sau: ${scene.connection}
</current_scene>

${prevContext ? `<previous_scene_ending>
NỘI DUNG CUỐI CẢNH TRƯỚC (viết tiếp nối từ đây):
${prevContext}
</previous_scene_ending>` : '<first_scene>Đây là cảnh MỞ ĐẦU chương. Tạo HOOK cuốn hút ngay từ câu đầu tiên.</first_scene>'}

${ctx.coreLorebook ? `${ctx.coreLorebook}\n\n` : ''}<requirements>
- Viết 400-600 từ cho cảnh này.
- ${prevContext ? '⭐ BẮT BUỘC nối mạch văn từ <previous_scene_ending>. KHÔNG lặp lại nội dung đã viết.' : '⭐ Mở đầu với HOOK cuốn hút — không mở bằng miêu tả cảnh vật sáo rỗng.'}
- 🎯 Tập trung 100% vào mục tiêu của cảnh này. KHÔNG chen nội dung của cảnh khác.
- Bao gồm đối thoại tự nhiên giữa các nhân vật.
- Sử dụng TỐI THIỂU 3 giác quan (thị giác, thính giác, khứu giác, xúc giác, vị giác).
${genreReminder ? `- ${genreReminder}\n` : ''}- ⛔ KHÔNG bịa thêm nhân vật, địa điểm, sự kiện không có trong dữ liệu.
- ⛔ CHỐNG VĂN MẪU: KHÔNG kết bằng câu triết lý/tổng kết. Show, don't tell.
- 📌 KHÔNG chèn [Nguồn N] inline.
</requirements>`;

    // Inject auto-selected writing principles
    if (principleInjection) {
        prompt += `\n\n<dynamic_principles>\n${principleInjection}\n</dynamic_principles>`;
    }

    if (directive?.customInstruction) {
        prompt += `\n\n<custom_instructions>\n${directive.customInstruction}\n</custom_instructions>`;
    }

    const genConfig = getGenerationConfig();
    if (genConfig.showReasoning) {
        prompt += `\n\nTRƯỚC KHI VIẾT, SUY NGHĨ TRONG THẺ <thinking> (phân tích kỹ, 7 bước):

BƯỚC 1 — NỐI MẠCH: Cảnh trước kết thúc ở đâu? Câu đầu tiên phải nối mạch tự nhiên.
BƯỚC 2 — MỤC TIÊU: Mục tiêu kịch tính cụ thể của cảnh này? Kết thúc cảnh phải đạt được gì?
BƯỚC 3 — TƯ NGÃ NHÂN VẬT: Mỗi nhân vật trong cảnh:
  - "Mặt ngoài" (biểu hiện): thái độ, lời nói, cử chỉ họ CỐ TÌNH cho người khác thấy.
  - "Mặt trong" (tư ngã): suy nghĩ thật, nỗi sợ, ham muốn ẩn giấu, quá khứ ảnh hưởng.
  - Hành vi dựa trên tư ngã, KHÔNG phải dựa trên "kịch bản cần nhân vật làm gì".
BƯỚC 4 — GIÁC QUAN: Chọn ít nhất 3 giác quan. GHI CỤ THỂ: Thấy gì? Nghe gì? Ngửi/Sờ/Nếm gì?
BƯỚC 5 — KIỂM TRA NHẤT QUÁN: Có thông tin nào trong <story_context> mâu thuẫn với kế hoạch? Nhân vật có hành động vượt khả năng?
BƯỚC 6 — ANTI-CLICHÉ: Kiểm tra kế hoạch có rơi vào: kết bằng triết lý? Cảm xúc "sáo"? Nhân vật toàn tri? Deus ex machina?
BƯỚC 7 — KẾ HOẠCH VIẾT: Liệt kê 3-5 beat chính của cảnh, mỗi beat ~1 dòng.

Sau khi suy nghĩ, viết nội dung cảnh trong thẻ <content>.
ĐỪNG xưng hô hay giải thích thêm ở ngoài hai thẻ này.`;
    } else {
        prompt += `\n\nTRẢ VỀ TRỰC TIẾP NỘI DUNG CẢNH. KHÔNG giải thích, KHÔNG bình luận thêm.`;
    }

    const messages = buildMessages(systemInst, prompt);

    let result;
    if (onStream) {
        result = await callOrbitAPIStream(apiKey, model || 'gemini-3-flash-preview', messages, writeTokens, onStream, { signal });
    } else {
        result = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, writeTokens, 3, { signal });
    }

    let text = typeof result === 'object' ? (result.text || '') : result;
    text = extractContentTag(text);
    return text;
}

// ════════════════════════════════════════════
// AUTO-EDITOR — Critique & Refine
// ════════════════════════════════════════════

/**
 * AI Editor critiques the full chapter against 6 Pulitzer rules.
 * Returns structured critique with severity scores.
 */
export async function critiqueChapter(apiKey, fullText, outline, story, options = {}) {
    const { model, signal } = options;

    const prompt = `Bạn là một BIÊN TẬP VIÊN KHÓ TÍNH cấp Pulitzer. Nhiệm vụ: Quét bản thảo chương dưới đây và phê bình THẲNG THẮN.

<manuscript>
${fullText.slice(0, 6000)}
</manuscript>

<original_outline>
${(outline || '').slice(0, 1500)}
</original_outline>

ĐÁNH GIÁ THEO 6 TIÊU CHÍ (mỗi tiêu chí cho điểm 1-10):

1. **NHẬP TÂM (Immersion)**: POV có nhất quán? Có yếu tố ngoài dự tính của nhân vật? Nhân vật có "toàn tri" bất hợp lý không?
2. **LỆCH HỆ SINH THÁI (World Reaction)**: Hành động nhân vật có tạo dấu ấn lên thế giới? Có NPC nào thay đổi hành vi? Có trật tự nào bị phá vỡ?
3. **GIÁC QUAN (Sensory)**: Có ≥3 giác quan? Miêu tả có sắc sảo hay chỉ "hắn rất mạnh"?
4. **KHÔNG GIẢNG ĐẠO (No Preaching)**: Có câu triết lý sáo rỗng? Có "gán nhãn" cảm xúc không? Show vs Tell?
5. **VĂN PHONG (Prose Quality)**: Câu chữ có rắn chắc? Có đoạn thừa/filler? Đối thoại có tự nhiên?
6. **PULITZER CHECK**: Nhân vật thắng trơn tru quá không? Có "cái giá phải trả"? Thế giới có bị biến đổi vĩnh viễn?

FORMAT OUTPUT BẮT BUỘC:
<critique>
ĐIỂM_TỔNG: [số từ 1-10]
NGHIÊM_TRỌNG: [true/false — true nếu có tiêu chí nào ≤ 4]

## Tiêu chí 1: NHẬP TÂM — [điểm]/10
[Nhận xét ngắn]
[Đoạn văn có vấn đề (trích dẫn nếu có)]

## Tiêu chí 2: LỆCH HỆ SINH THÁI — [điểm]/10
...

## Tiêu chí 3: GIÁC QUAN — [điểm]/10
...

## Tiêu chí 4: KHÔNG GIẢNG ĐẠO — [điểm]/10
...

## Tiêu chí 5: VĂN PHONG — [điểm]/10
...

## Tiêu chí 6: PULITZER CHECK — [điểm]/10
...

## GỢI Ý SỬA
[Liệt kê cụ thể các đoạn cần sửa và cách sửa]
</critique>`;

    const systemInst = `Bạn là Biên Tập Viên Pulitzer — chuyên phê bình tiểu thuyết tiếng Việt. 
Bạn GHÉT: văn mẫu, nhân vật toàn tri, sốc rẻ tiền, giảng đạo.
Bạn YÊU: chi tiết giác quan sắc sảo, hậu quả không đảo ngược, nhân vật có điểm mù.
Phê bình THẲNG THẮN, không nịnh. Nếu hay thì khen, nếu dở thì chê cho xác đáng.`;

    const messages = buildMessages(systemInst, prompt);
    const raw = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, 3, { signal });
    return parseCritique(raw);
}

/**
 * Parse critique response into structured object.
 */
function parseCritique(rawText) {
    // Extract content within <critique> tags if present
    const critiqueMatch = rawText.match(/<critique>([\s\S]*?)<\/critique>/i);
    const text = critiqueMatch ? critiqueMatch[1] : rawText;

    // Extract overall score
    const scoreMatch = text.match(/ĐIỂM_TỔNG:\s*(\d+)/i);
    const overallScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 7;

    // Extract severity
    const severeMatch = text.match(/NGHIÊM_TRỌNG:\s*(true|false)/i);
    const isSevere = severeMatch ? severeMatch[1].toLowerCase() === 'true' : overallScore <= 5;

    // Extract suggestions section
    const suggestMatch = text.match(/##\s*GỢI Ý SỬA\s*\n([\s\S]*?)$/i);
    const suggestions = suggestMatch ? suggestMatch[1].trim() : '';

    return {
        overallScore,
        isSevere,
        suggestions,
        fullCritique: text.trim(),
    };
}

/**
 * Refine chapter based on critique feedback.
 * Only called when critique finds severe issues (score ≤ 5).
 */
export async function refineChapter(apiKey, fullText, critique, systemInst, options = {}) {
    const { model, signal, onStream } = options;
    const writeTokens = options.maxTokens || 8192;

    const prompt = `Bạn là nhà văn đang CHỈNH SỬA bản thảo dựa trên phê bình của biên tập viên.

<current_manuscript>
${fullText}
</current_manuscript>

<editor_critique>
${critique.fullCritique}
</editor_critique>

<editor_suggestions>
${critique.suggestions}
</editor_suggestions>

YÊU CẦU:
- Viết lại TOÀN BỘ chương đã được chỉnh sửa. Không trả lời biên tập viên, chỉ viết lại văn bản.
- SỬA các vấn đề biên tập viên chỉ ra, đặc biệt:
  • Thêm chi tiết giác quan nếu thiếu
  • Xóa câu "giảng đạo" / triết lý sáo rỗng
  • Thay "gán nhãn" cảm xúc bằng hành vi cụ thể (Show, don't tell)
  • Thêm "cái giá phải trả" nếu nhân vật thắng quá trơn tru
  • Sửa đối thoại cho tự nhiên hơn
- GIỮ NGUYÊN cốt truyện, nhân vật, diễn biến chính. Chỉ cải thiện văn phong và kỹ thuật.
- Giữ nguyên hoặc tăng độ dài chương.

Viết bản sửa trong thẻ <content>.
ĐỪNG giải thích hay bình luận gì thêm ngoài thẻ <content>.`;

    const messages = buildMessages(systemInst, prompt);

    let result;
    if (onStream) {
        result = await callOrbitAPIStream(apiKey, model || 'gemini-3-flash-preview', messages, writeTokens, onStream, { signal });
    } else {
        result = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, writeTokens, 3, { signal });
    }

    let text = typeof result === 'object' ? (result.text || '') : result;
    text = extractContentTag(text);
    return text;
}

// ════════════════════════════════════════════
// PIPELINE ORCHESTRATOR
// ════════════════════════════════════════════

/**
 * Full writing pipeline: Scene Plan → Write Scenes → Critique → Refine
 * 
 * @param {string} apiKey
 * @param {string} chapterBlueprint - Generated or existing outline
 * @param {Object} ctx - { contextText, systemInst, chapter, story, genreReminder, continuityAnchor }
 * @param {Object} options - { model, directive, onProgress, onStream, signal, useWebSearch }
 * @returns {{ text: string, webSources: string[], critique: Object|null }}
 */
export async function runWritingPipeline(apiKey, chapterBlueprint, ctx, options = {}) {
    const { onProgress, onStream, model, directive, signal } = options;
    const { chapter, story, systemInst } = ctx;

    // ─── Step 1: Split outline into scenes (or use existing) ───
    const chapterScenes = story?.database?.scenes?.filter(s => s.chapterId === chapter.id)?.sort((a, b) => a.order - b.order) || [];
    let scenes = [];

    if (chapterScenes.length > 0) {
        if (onProgress) onProgress('scene_plan', '🎬 Bước 1/3: Chuẩn bị phân cảnh (Dùng dàn ý có sẵn)...');
        console.log('🎬 Pipeline Step 1: Using user-defined scene plan...');

        scenes = chapterScenes.map((s, i) => ({
            id: i + 1,
            title: s.name || `Cảnh ${i + 1}`,
            type: 'User Defined',
            goal: s.description || 'Tiến triển cốt truyện theo dàn ý',
            characters: s.characters || 'Các nhân vật trong cảnh',
            setting: s.setting || 'Bối cảnh hiện tại',
            emotion: 'Phù hợp với diễn biến',
            action: 'Theo mô tả phân cảnh',
            connection: 'Chuyển tiếp tự nhiên sang cảnh sau',
            raw: `Tên: ${s.name}\nMô tả: ${s.description}\nNhân vật: ${s.characters}\nBối cảnh: ${s.setting}`
        }));

        if (onProgress) onProgress('scene_plan_done', `🎬 Sử dụng ${scenes.length} phân cảnh đã có ✓`);
    } else {
        if (onProgress) onProgress('scene_plan', '🎬 Bước 1/3: Đang chia phân cảnh từ dàn ý...');
        console.log('🎬 Pipeline Step 1: Generating scene plan...');

        scenes = await generateScenePlan(apiKey, chapterBlueprint, chapter, systemInst, model, { signal });
        console.log(`🎬 Pipeline Step 1: ${scenes.length} scenes planned ✓`);

        if (onProgress) onProgress('scene_plan_done', `🎬 Tự động chia thành ${scenes.length} phân cảnh ✓`);
    }

    // ─── Step 2: Write each scene sequentially ───
    const sceneTexts = [];
    let streamAccumulator = '';

    for (let i = 0; i < scenes.length; i++) {
        if (signal?.aborted) break;

        const scene = scenes[i];
        if (onProgress) onProgress('writing_scene', `✍️ Bước 2/3: Viết cảnh ${i + 1}/${scenes.length}: ${scene.title}...`);
        console.log(`✍️ Pipeline Step 2: Writing scene ${i + 1}/${scenes.length}: ${scene.title}`);

        // For streaming, we wrap the onStream to track accumulated text
        let sceneOnStream = null;
        if (onStream) {
            sceneOnStream = (chunk) => {
                streamAccumulator += chunk;
                onStream(chunk);
            };
        }

        const sceneText = await writeScene(apiKey, scene, sceneTexts, ctx, {
            model,
            directive,
            onStream: sceneOnStream,
            signal,
        });

        // If not streaming, sceneText is the result. If streaming, it's also there.
        sceneTexts.push(sceneText);
        console.log(`✍️ Pipeline Step 2: Scene ${i + 1} written (${sceneText.length} chars) ✓`);

        // Small transition between scenes for streaming display
        if (onStream && i < scenes.length - 1) {
            onStream('\n\n');
            streamAccumulator += '\n\n';
        }
    }

    // Combine all scenes
    let fullChapterText = onStream ? streamAccumulator : sceneTexts.join('\n\n');
    console.log(`✍️ Pipeline Step 2: All scenes combined (${fullChapterText.length} chars) ✓`);

    // ─── Step 3: Auto-Editor Critique ───
    if (onProgress) onProgress('critique', '🔍 Bước 3/3: Biên tập viên đang phê bình...');
    console.log('🔍 Pipeline Step 3: Auto-Editor critiquing...');

    let critique = null;
    try {
        critique = await critiqueChapter(apiKey, fullChapterText, chapterBlueprint, story, { model, signal });
        console.log(`🔍 Pipeline Step 3: Score=${critique.overallScore}/10, Severe=${critique.isSevere}`);

        if (onProgress) {
            onProgress('critique_done', `🔍 Phê bình: ${critique.overallScore}/10 ${critique.isSevere ? '⚠️ Cần sửa' : '✅ Đạt'}`);
        }

        // Only refine if critique finds severe issues
        if (critique.isSevere && !signal?.aborted) {
            if (onProgress) onProgress('refine', '✨ Đang tinh chỉnh dựa trên phê bình...');
            console.log('✨ Pipeline Step 3b: Refining based on critique...');

            // For refine, if streaming, we need to reset and re-stream
            let refineAccumulator = '';
            let refineOnStream = null;
            if (onStream) {
                // Signal UI to clear and re-stream the refined version
                // We'll prepend a special marker so UI knows to replace
                refineOnStream = (chunk) => {
                    refineAccumulator += chunk;
                    // Don't call onStream here — we replace at the end
                };
            }

            const refinedText = await refineChapter(apiKey, fullChapterText, critique, systemInst, {
                model,
                signal,
                maxTokens: story?.maxOutputTokens || 8192,
            });

            if (refinedText && refinedText.length > fullChapterText.length * 0.5) {
                // Only accept refinement if it's substantial enough
                fullChapterText = refinedText;
                console.log(`✨ Pipeline Step 3b: Refined (${refinedText.length} chars) ✓`);
            } else {
                console.log('✨ Pipeline Step 3b: Refinement too short, keeping original');
            }
        }
    } catch (critiqueErr) {
        console.warn('🔍 Pipeline Step 3: Critique failed, using original text:', critiqueErr.message);
        // Critique failure is non-fatal
    }

    if (onProgress) onProgress('done', '✅ Pipeline hoàn thành!');
    console.log('✅ Pipeline complete!');

    return {
        text: fullChapterText,
        webSources: [],
        critique,
    };
}
