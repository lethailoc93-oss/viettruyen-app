// ================================================
// AI Prompt Module — buildPromptForAction, sendRawPrompt
// ================================================

import { buildRAGContext, buildRAGContextWithEmbeddings, buildSystemInstruction } from '../ragService';
import { getGenreReminder } from '../genrePrompts';
import { callOrbitAPI, buildMessages, simulateDelay, getGenerationConfig } from '../apiClient';

/**
 * Build prompt for an action WITHOUT calling the API.
 * Used for prompt preview/edit before sending.
 * Returns { systemInstruction, userPrompt }
 */
export async function buildPromptForAction(action, params = {}) {
    const { apiKey, story, content, chapter, currentChapterContent, chapterOutline, model } = params;

    let contextText = '';
    try {
        if (apiKey) {
            const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
                currentChapterId: chapter?.id,
                query: content?.slice?.(-200) || '',
                includeContent: true
            });
            contextText = ragResult.contextText;
        }
    } catch {
        const fallback = buildRAGContext(story, {
            currentChapterId: chapter?.id,
            query: content?.slice?.(-200) || '',
            includeContent: true
        });
        contextText = fallback.contextText;
    }

    let systemInst = await buildSystemInstruction(story);
    let userPrompt = '';
    const genreReminder = getGenreReminder(story);

    switch (action) {
        case 'continue': {
            const lastPart = (content || '').slice(-2000);

            let outlineSection = '';
            if (chapter?.outline) {
                outlineSection += `\n\n<chapter_outline>\nBÁM SÁT DÀN Ý SAU KHI VIẾT:\n${chapter.outline}\n</chapter_outline>`;
            }

            const chapterScenes = story?.database?.scenes?.filter(s => s.chapterId === chapter?.id)?.sort((a, b) => a.order - b.order) || [];
            if (chapterScenes.length > 0) {
                const sceneText = chapterScenes.map((s, i) => `Cảnh ${i + 1}: ${s.name}\n- Mô tả: ${s.description}\n- Nhân vật: ${s.characters}\n- Bối cảnh: ${s.setting}`).join('\n\n');
                outlineSection += `\n\n<scene_outline>\nDÀN Ý PHÂN CẢNH (Hãy bám sát các cảnh này):\n${sceneText}\n</scene_outline>`;
            }

            userPrompt = `Bạn là một AI Novelist chuyên nghiệp. Dựa trên NGỮ CẢNH TRUYỆN và các NGUỒN DỮ LIỆU bên dưới, hãy tiếp tục viết câu chuyện. Viết khoảng 300-500 từ.

<story_context>
${contextText}
</story_context>

${chapter ? `<current_chapter>\nTiêu đề: ${chapter.title} (Tóm tắt: ${chapter.summary || 'không có'})\n</current_chapter>` : ''}${outlineSection}

<current_content>
${lastPart || '(Truyện chưa có nội dung, hãy bắt đầu viết mở đầu)'}
</current_content>

<requirements>
- Bám sát văn phong hiện tại.
- ${chapter?.outline ? '⭐ BẮT BUỘC viết theo <chapter_outline> — phát triển nội dung theo đúng các mục.' : 'Phát triển tình tiết hợp lý, dựa trên cốt truyện và dàn ý.'}
- Giữ nhất quán với thông tin nhân vật và bối cảnh đã thiết lập.
${genreReminder ? `- ${genreReminder}\n` : ''}- ⚠️ KHÔNG bịa thêm nhân vật mới, địa điểm mới, hoặc sự kiện không có trong dữ liệu.
</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi cung cấp nội dung truyện tiếp theo trong thẻ <content>.`;
            break;
        }
        case 'summarize': {
            const textToSummarize = (content || '').slice(-3000);
            userPrompt = `Hãy tóm tắt đoạn văn bên dưới thành một bản tóm tắt ngắn gọn, giữ lại các tình tiết quan trọng.

<story_context>
${contextText}
</story_context>

<current_text>
${textToSummarize}
</current_text>

<requirements>
- Tóm tắt ngắn gọn, cô đọng.
- Giữ lại các sự kiện và tình tiết quan trọng.
${chapter ? `- Đây là nội dung thuộc chương: ${chapter.title}` : ''}
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi đưa bản tóm tắt vào thẻ <content>.`;
            break;
        }
        case 'sceneDesc': {
            const sceneContent = (content || '').slice(-1500);
            userPrompt = `Hãy viết mô tả cảnh chi tiết dựa trên đoạn văn bên dưới.

<story_context>
${contextText}
</story_context>

<current_text>
${sceneContent}
</current_text>

<requirements>
- Mô tả không gian, ánh sáng, âm thanh, mùi vị.
- Tạo bầu không khí phù hợp với cảm xúc đoạn truyện.
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi đưa mô tả cảnh vào thẻ <content>.`;
            break;
        }
        case 'plot': {
            const plotContent = (content || '').slice(-1500);
            userPrompt = `Hãy gợi ý phát triển cốt truyện dựa trên ngữ cảnh và nội dung hiện tại.

<story_context>
${contextText}
</story_context>

<current_text>
${plotContent}
</current_text>

<requirements>
- Đề xuất 2-3 hướng phát triển cốt truyện tiếp theo.
- Mỗi hướng cần chi tiết và hợp lý với ngữ cảnh.
- Giữ nhất quán với nhân vật và bối cảnh.
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi đưa gợi ý vào thẻ <content>.`;
            break;
        }
        case 'improve': {
            const improveContent = (content || '').slice(-1500);
            userPrompt = `Bạn là biên tập viên chuyên nghiệp. Hãy phân tích và gợi ý cải thiện đoạn văn, đồng thời kiểm tra tính nhất quán với ngữ cảnh truyện.

<story_context>
${contextText}
</story_context>

<current_text>
${improveContent || '(chưa có nội dung)'}
</current_text>

<requirements>
- Nhận xét về điểm mạnh.
- Kiểm tra nhất quán với thông tin nhân vật/bối cảnh.
- Chỉ ra điểm cần cải thiện.
- Gợi ý cách viết lại một số câu.
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi đưa bài phân tích vào thẻ <content>.`;
            break;
        }
        case 'chat': {
            systemInst += `\n\nNHIỆM VỤ: Trả lời yêu cầu người dùng. Viết nội dung dựa trên ngữ cảnh truyện.`;
            if (chapterOutline) {
                systemInst += `\n\nDÀN Ý CHƯƠNG HIỆN TẠI:\n${chapterOutline}`;
            }
            userPrompt = `<story_context>
${contextText}
</story_context>

<current_chapter_content>
${(currentChapterContent || '').slice(-1500)}
</current_chapter_content>

Hãy suy nghĩ trong thẻ <thinking> trước khi đưa câu trả lời vào thẻ <content>.`;
            break;
        }
        case 'rewrite': {
            const rewriteInstruction = params.instruction || 'giọng văn khác';
            userPrompt = `Bạn là biên tập viên chuyên nghiệp. Hãy VIẾT LẠI đoạn văn bên dưới theo yêu cầu: ${rewriteInstruction}.

<story_context>
${contextText}
</story_context>

<current_text>
${params.selectedText}
</current_text>

<requirements>
- Viết lại theo yêu cầu: ${rewriteInstruction}
- GIỮ NGUYÊN nội dung, ý nghĩa và các sự kiện.
- Giữ nhất quán với văn phong truyện.
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi trả về đoạn văn viết lại vào thẻ <content>.`;
            break;
        }
        case 'expand': {
            userPrompt = `Bạn là biên tập viên chuyên nghiệp. Hãy MỞ RỘNG đoạn văn bên dưới.

<story_context>
${contextText}
</story_context>

<current_text>
${params.selectedText}
</current_text>

<requirements>
- Mở rộng chi tiết hơn (gấp 2-3 lần).
- Thêm miêu tả cảm xúc, hành động, đối thoại.
- GIỮ NGUYÊN các sự kiện và ý chính.
- Giữ nhất quán với văn phong truyện.
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi trả về đoạn văn mở rộng vào thẻ <content>.`;
            break;
        }
        case 'condense': {
            userPrompt = `Bạn là biên tập viên chuyên nghiệp. Hãy TÓM GỌN đoạn văn bên dưới.

<story_context>
${contextText}
</story_context>

<current_text>
${params.selectedText}
</current_text>

<requirements>
- Rút ngắn còn 1/2 đến 1/3 độ dài gốc.
- GIỮ NGUYÊN các ý chính và tình tiết quan trọng.
- Loại bỏ chi tiết thừa, lặp lại, trang trí không cần thiết.
- Giữ nhất quán với văn phong truyện.
${genreReminder ? `- ${genreReminder}\n` : ''}</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi trả về đoạn văn tóm gọn vào thẻ <content>.`;
            break;
        }
        default:
            userPrompt = content || '';
    }

    const genConfig = getGenerationConfig();
    if (!genConfig.showReasoning) {
        userPrompt = userPrompt.replace(/Hãy suy nghĩ trong thẻ <thinking> trước khi .*? trong thẻ <content>\./g, 'TRẢ VỀ TRỰC TIẾP KẾT QUẢ. KHÔNG giải thích, KHÔNG bình luận thêm.');
    }

    return { systemInstruction: systemInst, userPrompt };
}

/**
 * Send a pre-built (possibly edited) prompt to AI directly.
 * Used after prompt preview/edit.
 */
export async function sendRawPrompt(apiKey, systemInstruction, userPrompt, options = {}) {
    const { model, maxTokens = 2048 } = options;

    if (!apiKey) {
        await simulateDelay();
        return '[MOCK] Kết quả AI giả lập cho prompt đã chỉnh sửa.';
    }

    const messages = buildMessages(systemInstruction, userPrompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, maxTokens);
}
