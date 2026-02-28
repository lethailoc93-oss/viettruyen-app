// ================================================
// RAG Memory — Running Memory & Continuity Anchor
// ================================================

/**
 * Build a running memory recap — a chronological summary of everything
 * that has happened in the story up to the current chapter.
 * This ensures AI never "forgets" past events.
 *
 * @param {Object} story - The currentStory object
 * @param {string} [currentChapterId] - ID of the chapter being written
 * @returns {string} Formatted running memory block
 */
export function buildRunningMemory(story, currentChapterId = null) {
    if (!story?.database?.chapters?.length) return '';

    const chapters = story.database.chapters;
    const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIdx = currentChapterId
        ? sorted.findIndex(c => c.id === currentChapterId)
        : sorted.length;

    const prevChapters = currentIdx > 0 ? sorted.slice(0, currentIdx) : [];
    if (prevChapters.length === 0) return '';

    const recapLines = prevChapters.map(c => {
        const chLabel = `Chương ${c.order || '?'}: ${c.title || 'Chưa đặt tên'}`;
        const kwTag = c.keywords?.length ? ` [🏷️ ${c.keywords.join(', ')}]` : '';
        if (c.recap) {
            return `• ${chLabel}${kwTag}\n  Tóm tắt: ${c.summary || '(không có)'}\n  Trạng thái cuối: ${c.recap}`;
        }
        if (c.summary) {
            return `• ${chLabel}${kwTag}\n  ${c.summary}`;
        }
        if (c.content) {
            return `• ${chLabel}${kwTag}\n  (chưa có tóm tắt — đã viết ${c.content.length} ký tự)`;
        }
        return `• ${chLabel} — (trống)`;
    });

    let memoryBlock = `<running_memory>\nĐÂY LÀ NHỮNG GÌ ĐÃ XẢY RA — AI PHẢI NHỚ VÀ KHÔNG ĐƯỢC MÂU THUẪN:\n${recapLines.join('\n')}`;

    // Inject latest plot progress (if available)
    const plotProgressArr = story.database?.plotProgress || [];
    if (plotProgressArr.length > 0) {
        const latest = plotProgressArr[plotProgressArr.length - 1];
        if (latest.plotlines?.length > 0) {
            const plotLines = latest.plotlines.map(pl => {
                const statusMap = { escalating: '📈 Leo thang', climax: '🔥 Đỉnh điểm', cooling: '📉 Hạ nhiệt', dormant: '💤 Chưa khai thác' };
                let line = `  • ${pl.name} [${statusMap[pl.status] || pl.status}]: ${pl.summary || ''}`;
                if (pl.unresolvedSeeds?.length > 0) {
                    line += `\n    🌱 Chekhov's Gun: ${pl.unresolvedSeeds.join(', ')}`;
                }
                return line;
            });
            memoryBlock += `\n\n【TIẾN ĐỘ TUYẾN TRUYỆN — Cập nhật đến chương ${latest.upToChapter || '?'}】\n${plotLines.join('\n')}`;
            if (latest.overallArc) {
                memoryBlock += `\n📌 Hướng đi tổng: ${latest.overallArc}`;
            }
        }
    }

    memoryBlock += `\n</running_memory>`;
    return memoryBlock;
}

/**
 * Build a continuity anchor — tells AI exactly where the previous chapter
 * left off: the last paragraph, active characters, and emotional state.
 * This prevents AI from "resetting" or writing disconnected content.
 *
 * @param {Object} story - The currentStory object
 * @param {Object} currentChapter - The chapter being written
 * @returns {string} Formatted continuity anchor block
 */
export function buildContinuityAnchor(story, currentChapter) {
    if (!story?.database?.chapters?.length || !currentChapter) return '';

    const chapters = story.database.chapters;
    const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIdx = sorted.findIndex(c => c.id === currentChapter.id);

    if (currentIdx <= 0) return '';

    const prevChapter = sorted[currentIdx - 1];
    if (!prevChapter.content && !prevChapter.summary) return '';

    const parts = [];

    if (prevChapter.content) {
        const lastPart = prevChapter.content.slice(-500).trim();
        parts.push(`ĐOẠN CUỐI CHƯƠNG TRƯỚC (viết tiếp từ đây, KHÔNG lặp lại nội dung này):\n"${lastPart}"`);
    }

    if (prevChapter.recap) {
        parts.push(`TRẠNG THÁI KẾT THÚC: ${prevChapter.recap}`);
    } else if (prevChapter.summary) {
        parts.push(`TÓM TẮT CHƯƠNG TRƯỚC: ${prevChapter.summary}`);
    }

    const characters = story.database.characters || [];
    if (characters.length > 0 && prevChapter.content) {
        const lastText = prevChapter.content.slice(-800).toLowerCase();
        const activeChars = characters
            .filter(c => c.name && lastText.includes(c.name.toLowerCase()))
            .map(c => c.name);
        if (activeChars.length > 0) {
            parts.push(`NHÂN VẬT ĐANG HOẠT ĐỘNG: ${activeChars.join(', ')}`);
        }
    }

    if (parts.length === 0) return '';
    return `<continuity_anchor>\n${parts.join('\n\n')}\n</continuity_anchor>`;
}
