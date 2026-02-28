// ================================================
// Auto-Summarization Service
// Automatically summarizes chapters and tracks plot progress
// ================================================

import { AIService } from '../aiService';

/**
 * Auto-summarize a chapter after writing.
 * Uses existing AIService.summarizeChapter under the hood.
 * Returns the summary text (caller is responsible for saving to DB).
 *
 * @param {string} apiKey
 * @param {Object} chapter - The chapter object { id, title, order, content }
 * @param {string} chapterContent - The current content text
 * @param {Object} story - The full story object
 * @param {Object} options - { model, signal }
 * @returns {Promise<string>} Summary text
 */
export async function autoSummarizeChapter(apiKey, chapter, chapterContent, story, options = {}) {
    if (!chapterContent || chapterContent.trim().length < 100) {
        return ''; // Too short to summarize
    }

    try {
        const result = await AIService.summarizeChapter(
            apiKey,
            chapter,
            chapterContent,
            story,
            { model: options.model, signal: options.signal }
        );
        // Clean up the result — remove header if present
        let summary = result || '';
        summary = summary.replace(/^📝\s*TÓM TẮT CHƯƠNG[^\n]*\n*/i, '').trim();
        return summary;
    } catch (err) {
        console.warn('[AutoSummarize] Chapter summarization failed:', err.message);
        return '';
    }
}

/**
 * Summarize plot progress across multiple chapters.
 * Called every N chapters to create a "plot_progress" entry.
 * This tracks individual plotlines (romance, mystery, conflict, etc.)
 *
 * @param {string} apiKey
 * @param {Object} story - Full story object
 * @param {number} upToChapter - Chapter number to summarize up to
 * @param {Object} options - { model, signal }
 * @returns {Promise<Object|null>} { id, upToChapter, plotlines: [...], createdAt }
 */
export async function summarizePlotProgress(apiKey, story, upToChapter, options = {}) {
    const db = story?.database || {};
    const chapters = db.chapters || [];
    if (chapters.length < 3) return null; // Not enough to track plotlines

    // Gather chapter summaries for context
    const sorted = [...chapters]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .filter(c => (c.order || 0) <= upToChapter);

    const chapterSummaries = sorted.map(c => {
        const label = `Chương ${c.order || '?'}: ${c.title || ''}`;
        return `${label}\n${c.summary || c.recap || '(chưa có tóm tắt)'}`;
    }).join('\n\n');

    // Gather known plots
    const plotNames = (db.plots || []).map(p => p.name || p.title).filter(Boolean);

    // Build prompt
    const prompt = `Bạn là biên tập viên chuyên nghiệp. Hãy phân tích tiến độ các tuyến truyện.

TRUYỆN: ${story.title || ''}
THỂ LOẠI: ${story.genre || ''}

CÁC TUYẾN TRUYỆN ĐÃ BIẾT:
${plotNames.length > 0 ? plotNames.map((p, i) => `${i + 1}. ${p}`).join('\n') : '(Chưa có — hãy tự phát hiện từ nội dung)'}

TÓM TẮT CÁC CHƯƠNG (1 → ${upToChapter}):
${chapterSummaries}

YÊU CẦU:
Phân tích và tóm tắt tiến độ từng tuyến truyện. Mỗi tuyến gồm:
- Tên tuyến
- Tình trạng hiện tại (đang leo thang / đỉnh điểm / hạ nhiệt / chưa khai thác)
- Tóm tắt 1-2 câu về diễn biến mới nhất
- Các hạt giống chưa nổ (Chekhov's Gun) nếu có

Trả về đúng JSON:
{
  "plotlines": [
    {
      "name": "Tên tuyến truyện",
      "status": "escalating|climax|cooling|dormant",
      "summary": "Tóm tắt ngắn",
      "unresolvedSeeds": ["seed1", "seed2"]
    }
  ],
  "overallArc": "Mô tả tổng thể hướng đi của truyện trong 1-2 câu"
}`;

    try {
        const { callOrbitAPI, buildMessages } = await import('../apiClient');
        const messages = buildMessages('Bạn là trợ lý biên tập tiểu thuyết. Trả về JSON hợp lệ.', prompt);
        const rawResult = await callOrbitAPI(
            apiKey,
            options.model || 'gemini-3-flash-preview',
            messages,
            2048,
            3,
            { signal: options.signal }
        );

        // Parse JSON
        const jsonMatch = rawResult.match(/\{[\s\S]*"plotlines"[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                upToChapter,
                plotlines: parsed.plotlines || [],
                overallArc: parsed.overallArc || '',
                createdAt: new Date().toISOString()
            };
        }
        return null;
    } catch (err) {
        console.warn('[AutoSummarize] Plot progress failed:', err.message);
        return null;
    }
}

/**
 * Check if plot progress summarization should run.
 * Runs every INTERVAL chapters (default: 5).
 */
export function shouldRunPlotProgress(chapterNumber, interval = 5) {
    return chapterNumber > 0 && chapterNumber % interval === 0;
}
