// ================================================
// Chekhov's Gun Tracker
// Scans story database to find "forgotten" items, seeds, and quests
// ================================================

/**
 * Scan the story database and identify:
 * 1. Items that haven't been used/mentioned recently
 * 2. Foreshadowing seeds that are still "active" but old
 * 3. Quests that are stalled
 * 4. Characters that disappeared
 *
 * @param {Object} story - The full story object
 * @param {string} currentChapterId - The chapter currently being written
 * @returns {Array<Object>} suggestions: [{ type, icon, name, detail, plantedChapter, chaptersSinceLastUse, urgency }]
 */
export function scanChekhovsGuns(story, currentChapterId = null) {
    if (!story?.database) return [];

    const db = story.database;
    const chapters = db.chapters || [];
    const sortedChapters = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Determine current chapter number
    const currentChapter = currentChapterId
        ? sortedChapters.find(c => c.id === currentChapterId)
        : sortedChapters[sortedChapters.length - 1];
    const currentChapterNum = currentChapter?.order || sortedChapters.length;

    // Gather recent text (last 3 chapters) for "recently mentioned" check
    const recentChapters = sortedChapters.slice(-3);
    const recentText = recentChapters
        .map(c => (c.content || '') + ' ' + (c.summary || ''))
        .join(' ')
        .toLowerCase();

    const suggestions = [];

    // === 1. Unused Items ===
    const items = db.items || [];
    items.forEach(item => {
        const name = item.name || '';
        if (!name || name.length < 2) return;
        const nameLower = name.toLowerCase();

        // Check if mentioned recently
        if (!recentText.includes(nameLower)) {
            // Find which chapter it first appeared
            const plantedChapter = findFirstMention(sortedChapters, nameLower);
            const gap = plantedChapter ? currentChapterNum - plantedChapter : null;

            if (gap && gap >= 3) {
                suggestions.push({
                    type: 'item',
                    icon: '🎒',
                    name: item.name,
                    detail: item.effect || item.description || '',
                    plantedChapter,
                    chaptersSinceLastUse: gap,
                    urgency: gap >= 10 ? 'high' : gap >= 5 ? 'medium' : 'low',
                    suggestion: `"${item.name}" xuất hiện ở chương ${plantedChapter} nhưng ${gap} chương chưa được nhắc lại.`
                });
            }
        }
    });

    // === 2. Active Foreshadowing Seeds ===
    const foreshadowings = (db.foreshadowings || []).filter(f => f.status === 'active' || !f.status);
    foreshadowings.forEach(f => {
        const planted = f.plantedChapter || null;
        const gap = planted ? currentChapterNum - planted : null;

        if (gap && gap >= 5) {
            suggestions.push({
                type: 'foreshadowing',
                icon: '🌱',
                name: f.hint || f.name || 'Manh mối',
                detail: f.targetEvent || '',
                plantedChapter: planted,
                chaptersSinceLastUse: gap,
                urgency: gap >= 15 ? 'high' : gap >= 8 ? 'medium' : 'low',
                suggestion: `Phục bút "${f.hint || f.name}" gieo ở chương ${planted}, đã ${gap} chương chưa kích hoạt.`
            });
        }
    });

    // === 3. Stalled Quests ===
    const quests = db.quests || [];
    quests.forEach(q => {
        if (q.progress === 'completed' || q.progress === 'done') return;
        const nameLower = (q.title || q.name || '').toLowerCase();
        if (!nameLower || nameLower.length < 2) return;

        if (!recentText.includes(nameLower)) {
            suggestions.push({
                type: 'quest',
                icon: '📋',
                name: q.title || q.name,
                detail: q.description || '',
                plantedChapter: null,
                chaptersSinceLastUse: null,
                urgency: 'medium',
                suggestion: `Nhiệm vụ "${q.title || q.name}" chưa hoàn thành và không được nhắc gần đây.`
            });
        }
    });

    // === 4. Disappeared Characters ===
    const characters = db.characters || [];
    characters.forEach(c => {
        if (c.isMain) return; // Skip protagonist
        const nameLower = (c.name || '').toLowerCase();
        if (!nameLower || nameLower.length < 2) return;

        // Only flag if character has appeared before but not recently
        const firstAppeared = findFirstMention(sortedChapters, nameLower);
        if (firstAppeared && !recentText.includes(nameLower)) {
            const gap = currentChapterNum - firstAppeared;
            if (gap >= 5) {
                suggestions.push({
                    type: 'character',
                    icon: '👤',
                    name: c.name,
                    detail: c.role || '',
                    plantedChapter: firstAppeared,
                    chaptersSinceLastUse: gap,
                    urgency: gap >= 10 ? 'medium' : 'low',
                    suggestion: `${c.name} (${c.role || 'nhân vật'}) biến mất từ chương ${firstAppeared} (${gap} chương).`
                });
            }
        }
    });

    // Sort by urgency (high > medium > low)
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2));

    return suggestions;
}

/**
 * Find the first chapter that mentions a keyword.
 */
function findFirstMention(sortedChapters, keyword) {
    for (const ch of sortedChapters) {
        const text = ((ch.content || '') + ' ' + (ch.summary || '')).toLowerCase();
        if (text.includes(keyword)) {
            return ch.order || 1;
        }
    }
    return null;
}
