// ================================================
// Smart Editor Service — Rewrite / Expand / Condense / Suggest
// ================================================

import { buildRAGContext, buildRAGContextWithEmbeddings, buildSystemInstruction } from './ragService';
import { getGenreReminder } from './genrePrompts';
import { callSmartAPI, buildMessages, simulateDelay } from './apiClient';
import { mockResponses } from './aiMocks';

// Shared helper: build lightweight RAG context for smart-editor actions
async function getSmartEditorContext(story, apiKey, selectedText, chapterId) {
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            currentChapterId: chapterId,
            query: selectedText.slice(0, 300),
            includeContent: false
        });
        return ragResult.contextText;
    } catch {
        const fallback = buildRAGContext(story, {
            currentChapterId: chapterId,
            query: selectedText.slice(0, 300),
            includeContent: false
        });
        return fallback.contextText;
    }
}

/**
 * Rewrite selected text with a different tone/style
 */
export async function rewriteText(apiKey, selectedText, story, instruction = '', options = {}) {
    const { model, chapter } = options;
    if (!apiKey) {
        await simulateDelay();
        return mockResponses.rewriteText();
    }

    const contextText = await getSmartEditorContext(story, apiKey, selectedText, chapter?.id);
    const systemInst = await buildSystemInstruction(story);
    const genreReminder = getGenreReminder(story);
    const rewriteDirection = instruction || 'giọng văn khác, tự nhiên hơn';

    const prompt = `Bạn là biên tập viên chuyên nghiệp. Hãy VIẾT LẠI đoạn văn bên dưới theo hướng dẫn.

NGỮ CẢNH TRUYỆN:
${contextText}

ĐOẠN VĂN GỐC:
"${selectedText}"

HƯỚNG DẪN VIẾT LẠI: ${rewriteDirection}

YÊU CẦU:
- Giữ nguyên NỘI DUNG và Ý NGHĨA chính
- Thay đổi giọng văn/phong cách theo hướng dẫn
- Giữ nhất quán với văn phong truyện
- Giữ nguyên tên nhân vật, địa danh
${genreReminder ? `- ${genreReminder}\n` : ''}- Chỉ trả về đoạn văn đã viết lại, KHÔNG giải thích:`;

    const messages = buildMessages(systemInst, prompt);
    return await callSmartAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, { role: 'worker' });
}

/**
 * Expand selected text with more detail
 */
export async function expandText(apiKey, selectedText, story, options = {}) {
    const { model, chapter } = options;
    if (!apiKey) {
        await simulateDelay();
        return mockResponses.expandText();
    }

    const contextText = await getSmartEditorContext(story, apiKey, selectedText, chapter?.id);
    const systemInst = await buildSystemInstruction(story);
    const genreReminder = getGenreReminder(story);

    const prompt = `Bạn là nhà văn chuyên nghiệp. Hãy MỞ RỘNG đoạn văn bên dưới.

NGỮ CẢNH TRUYỆN:
${contextText}

ĐOẠN VĂN GỐC:
"${selectedText}"

YÊU CẦU:
- Thêm chi tiết mô tả (cảm giác, hình ảnh, âm thanh)
- Phát triển cảm xúc nhân vật
- Thêm đối thoại hoặc suy nghĩ nội tâm nếu phù hợp
- Mở rộng gấp 2-3 lần nhưng không lan man
- Giữ nhất quán với văn phong và ngữ cảnh truyện
${genreReminder ? `- ${genreReminder}\n` : ''}- Chỉ trả về đoạn văn đã mở rộng, KHÔNG giải thích:`;

    const messages = buildMessages(systemInst, prompt);
    return await callSmartAPI(apiKey, model || 'gemini-3-flash-preview', messages, 4096, { role: 'worker' });
}

/**
 * Condense selected text to be more concise
 */
export async function condenseText(apiKey, selectedText, story, options = {}) {
    const { model, chapter } = options;
    if (!apiKey) {
        await simulateDelay();
        return mockResponses.condenseText();
    }

    const contextText = await getSmartEditorContext(story, apiKey, selectedText, chapter?.id);
    const systemInst = await buildSystemInstruction(story);
    const genreReminder = getGenreReminder(story);

    const prompt = `Bạn là biên tập viên chuyên nghiệp. Hãy TÓM GỌN đoạn văn bên dưới.

NGỮ CẢNH TRUYỆN:
${contextText}

ĐOẠN VĂN GỐC:
"${selectedText}"

YÊU CẦU:
- Rút ngắn còn 1/2 đến 1/3 độ dài gốc
- GIỮ NGUYÊN các ý chính và tình tiết quan trọng
- Loại bỏ chi tiết thừa, lặp lại, trang trí không cần thiết
- Giữ nhất quán với văn phong truyện
${genreReminder ? `- ${genreReminder}\n` : ''}- Chỉ trả về đoạn văn đã tóm gọn, KHÔNG giải thích:`;

    const messages = buildMessages(systemInst, prompt);
    return await callSmartAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, { role: 'worker' });
}

/**
 * Suggest 3 alternative phrasings for selected text (Wordtune-like).
 * Returns an array of 3 strings.
 */
export async function suggestWordtune(apiKey, selectedText, story, options = {}) {
    const { model, chapter } = options;
    if (!apiKey) {
        await simulateDelay();
        return mockResponses.suggestWordtune();
    }

    const contextText = await getSmartEditorContext(story, apiKey, selectedText, chapter?.id);
    const systemInst = await buildSystemInstruction(story);
    const genreReminder = getGenreReminder(story);

    const prompt = `Bạn là một nhà văn / biên tập viên tiếng Việt chuyên nghiệp. Nhiệm vụ: GỢI Ý 3 CÁCH DIỄN ĐẠT KHÁC cho đoạn văn được chọn.

NGỮ CẢNH TRUYỆN:
${contextText}

ĐOẠN VĂN GỐC:
"${selectedText}"

YÊU CẦU:
- Tạo đúng 3 phiên bản diễn đạt khác nhau, mỗi phiên bản mang một phong vị riêng:
  1. Tự nhiên hơn, mượt mà hơn (giọng kể gần gũi, dễ đọc)
  2. Giàu hình ảnh hơn (thêm chi tiết cảm giác, so sánh, ẩn dụ)
  3. Súc tích, mạnh mẽ hơn (câu ngắn gọn, có lực, cắt bỏ thừa)
- GIỮ NGUYÊN ý nghĩa nội dung gốc
- Giữ nhất quán với văn phong truyện và tên nhân vật, địa danh
${genreReminder ? `- ${genreReminder}\n` : ''}
ĐỊNH DẠNG OUTPUT:
Viết 3 phiên bản, CÁCH NHAU bởi dòng chứa DUY NHẤT ba dấu gạch ngang: ---
KHÔNG đánh số, KHÔNG giải thích, KHÔNG thêm tiêu đề.
Chỉ viết nội dung 3 đoạn văn xen kẽ bởi ---

BẮT ĐẦU:`;

    const messages = buildMessages(systemInst, prompt);
    const raw = await callSmartAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, { role: 'worker' });

    // Parse: split by --- separator
    const variants = raw
        .split(/\n---\n|\n---$|^---\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (variants.length === 0) return [raw.trim()];
    return variants.slice(0, 3);
}
