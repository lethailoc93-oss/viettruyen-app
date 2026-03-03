// ================================================
// Memory Summarizer — Long-term memory enhancement
// ================================================
// Tự động tóm tắt các tin nhắn cũ thành "trí nhớ dài hạn"
// để AI không bị "mất trí" khi chat quá dài.
//
// Cơ chế:
//   1. Khi số tin nhắn vượt ngưỡng → gọi AI tóm tắt các tin nhắn cũ
//   2. Lưu bản tóm tắt vào IndexedDB
//   3. Chèn bản tóm tắt vào system prompt khi lắp ráp prompt

import { get, set } from 'idb-keyval';
import { callOrbitAPI, getGenerationConfig } from './apiClient';

const SUMMARY_THRESHOLD = 20; // Bao nhiêu tin nhắn thì bắt đầu tóm tắt
const MESSAGES_TO_SUMMARIZE = 10; // Mỗi lần tóm tắt bao nhiêu tin nhắn cũ nhất
const MAX_SUMMARY_LENGTH = 2000; // Giới hạn ký tự bản tóm tắt

/**
 * Get the stored memory summary for a story.
 * @param {string} storyId
 * @returns {Promise<Object|null>} { summary, lastSummarizedIdx, timestamp }
 */
export async function getMemorySummary(storyId) {
    try {
        return await get(`rp_memory_${storyId}`) || null;
    } catch {
        return null;
    }
}

/**
 * Save a memory summary for a story.
 */
export async function saveMemorySummary(storyId, data) {
    await set(`rp_memory_${storyId}`, {
        ...data,
        timestamp: Date.now(),
    });
}

/**
 * Clear memory summary for a story.
 */
export async function clearMemorySummary(storyId) {
    try {
        const { del } = await import('idb-keyval');
        await del(`rp_memory_${storyId}`);
    } catch { /* ignore */ }
}

/**
 * Build the summarization prompt.
 * @param {Array} messages - messages to summarize
 * @param {string} existingSummary - previous summary to extend
 * @param {string} charName
 * @param {string} userName
 */
function buildSummarizationPrompt(messages, existingSummary, charName, userName) {
    const chatText = messages.map(m => {
        const speaker = m.role === 'char' || m.role === 'assistant' ? charName : userName;
        return `${speaker}: ${m.content}`;
    }).join('\n');

    let instruction = `Bạn là hệ thống tóm tắt cuộc trò chuyện nhập vai. Hãy tạo bản tóm tắt theo các quy tắc:

1. Viết ngắn gọn nhưng giữ lại MỌI thông tin quan trọng:
   - Sự kiện chính đã xảy ra
   - Thay đổi quan hệ giữa các nhân vật
   - Vật phẩm, địa điểm, NPC quan trọng
   - Trạng thái cảm xúc, hành động đáng nhớ
2. Viết dạng đoạn văn (KHÔNG dùng bullet points)
3. Dùng tên nhân vật cụ thể (${charName}, ${userName})
4. Giới hạn dưới 500 từ
5. Viết bằng tiếng Việt`;

    if (existingSummary) {
        instruction += `\n\n[Bản tóm tắt trước đó]\n${existingSummary}\n\n[Đoạn hội thoại mới cần tóm tắt thêm]\n${chatText}\n\nHãy kết hợp bản tóm tắt cũ với đoạn mới thành MỘT bản tóm tắt thống nhất.`;
    } else {
        instruction += `\n\n[Đoạn hội thoại cần tóm tắt]\n${chatText}`;
    }

    return instruction;
}

/**
 * Check if memory summarization should run, and if so, summarize.
 * Called after each AI response.
 * 
 * @param {Object} params
 * @param {string} params.storyId
 * @param {Array} params.messages - current chat messages
 * @param {string} params.apiKey
 * @param {string} params.charName
 * @param {string} params.userName
 * @param {Function} params.onSummaryUpdate - callback when summary is updated
 * @returns {Promise<boolean>} true if summarization was triggered
 */
export async function checkAndSummarize({
    storyId,
    messages,
    apiKey,
    charName,
    userName,
    onSummaryUpdate,
}) {
    if (!storyId || !apiKey || !messages) return false;

    // Filter out system messages (slash command results)
    const chatMessages = messages.filter(m => m.role !== 'system');

    const existing = await getMemorySummary(storyId);
    const lastIdx = existing?.lastSummarizedIdx || 0;
    const unsummarized = chatMessages.length - lastIdx;

    // Not enough new messages to summarize
    if (unsummarized < SUMMARY_THRESHOLD) return false;

    // Get the messages that need summarizing
    const toSummarize = chatMessages.slice(lastIdx, lastIdx + MESSAGES_TO_SUMMARIZE);
    if (toSummarize.length === 0) return false;

    try {
        const genConfig = getGenerationConfig();
        const model = genConfig.model || 'gemini-3-flash-preview';

        const prompt = buildSummarizationPrompt(
            toSummarize,
            existing?.summary || '',
            charName,
            userName
        );

        const response = await callOrbitAPI(
            apiKey,
            model,
            [{ role: 'user', content: prompt }],
            800, // max tokens for summary
            2    // retries
        );

        if (response) {
            const trimmed = response.substring(0, MAX_SUMMARY_LENGTH);
            const newData = {
                summary: trimmed,
                lastSummarizedIdx: lastIdx + toSummarize.length,
                messageCount: chatMessages.length,
            };

            await saveMemorySummary(storyId, newData);
            onSummaryUpdate?.(newData);

            if (import.meta.env.DEV) {
                console.log(`[MemorySummarizer] Summarized ${toSummarize.length} messages. Total summarized: ${newData.lastSummarizedIdx}`);
            }
            return true;
        }
    } catch (err) {
        console.error('[MemorySummarizer] Error:', err.message);
    }

    return false;
}

/**
 * Format memory summary for inclusion in system prompt.
 * @param {Object|null} memory - the stored memory data
 * @returns {string} formatted text for prompt injection, or empty string
 */
export function formatMemoryForPrompt(memory) {
    if (!memory?.summary) return '';
    return `[Trí nhớ dài hạn — Tóm tắt sự kiện đã xảy ra]\n${memory.summary}`;
}
