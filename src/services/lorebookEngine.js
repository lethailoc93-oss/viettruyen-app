// ================================================
// Lorebook Engine — Keyword Triggering System
// ================================================
// Quét chat history để tìm keyword matches
// và trả về lorebook entries cần inject vào context.

/**
 * Quét chat history tìm keyword matches từ lorebook entries.
 * @param {string[]} recentTexts Mảng text gần đây (user + AI messages)
 * @param {Object[]} entries Lorebook entries (từ story.database.settings + metaRules)
 * @param {Object} options Cấu hình
 * @returns {Object[]} Mảng entries đã match, sorted by priority
 */
export function scanForMatches(recentTexts, entries, options = {}) {
    const {
        maxEntries = 30,
        scanDepth = 10, // Số tin nhắn gần nhất để scan
    } = options;

    // Ghép các text gần đây thành 1 chuỗi searchable
    const searchText = recentTexts.slice(-scanDepth).join('\n').toLowerCase();

    const matched = [];

    for (const entry of entries) {
        // Skip disabled entries
        if (entry._enabled === false || entry.enabled === false) continue;

        const keywords = extractKeywords(entry);

        // Always Active: không có keywords → luôn inject
        if (keywords.length === 0) {
            if (entry.alwaysActive || entry._alwaysActive) {
                matched.push({ ...entry, _matchType: 'always_active', _matchScore: 100 });
            }
            continue;
        }

        // Check keyword matches
        const matchResult = matchKeywords(searchText, keywords, entry._logic || 'or');
        if (matchResult.matched) {
            matched.push({
                ...entry,
                _matchType: 'keyword',
                _matchScore: matchResult.score,
                _matchedKeywords: matchResult.matchedKeywords,
            });
        }
    }

    // Sort by priority (higher first), then by match score
    matched.sort((a, b) => {
        const pa = a.priority || a._priority || 10;
        const pb = b.priority || b._priority || 10;
        if (pa !== pb) return pb - pa;
        return (b._matchScore || 0) - (a._matchScore || 0);
    });

    return matched.slice(0, maxEntries);
}

/**
 * Trích xuất keywords từ entry (hỗ trợ nhiều format).
 */
function extractKeywords(entry) {
    let keys = [];

    if (Array.isArray(entry.keys)) {
        keys = entry.keys;
    } else if (Array.isArray(entry.key)) {
        keys = entry.key;
    } else if (typeof entry.keywords === 'string' && entry.keywords.trim()) {
        keys = entry.keywords.split(',').map(k => k.trim()).filter(Boolean);
    }

    // Lọc bỏ empty strings
    return keys.filter(k => typeof k === 'string' && k.trim().length > 0);
}

/**
 * Match keywords theo logic AND hoặc OR.
 */
function matchKeywords(searchText, keywords, logic = 'or') {
    const matchedKeywords = [];

    for (const keyword of keywords) {
        const kw = keyword.toLowerCase().trim();
        if (!kw) continue;

        if (searchText.includes(kw)) {
            matchedKeywords.push(keyword);
        }
    }

    if (logic === 'and') {
        return {
            matched: matchedKeywords.length === keywords.length,
            score: matchedKeywords.length,
            matchedKeywords,
        };
    }

    // OR logic (default)
    return {
        matched: matchedKeywords.length > 0,
        score: matchedKeywords.length,
        matchedKeywords,
    };
}

/**
 * Phân loại entry theo position cho prompt injection.
 * @param {Object[]} matchedEntries Entries đã match
 * @returns {Object} { beforeChar: [], afterChar: [], atDepth: {} }
 */
export function categorizeByPosition(matchedEntries) {
    const result = {
        beforeChar: [],  // position 0 hoặc 'before_char'
        afterChar: [],   // position 1 hoặc 'after_char'
        atDepth: {},     // depth N → entries
    };

    for (const entry of matchedEntries) {
        const pos = entry.position ?? entry._position;
        const depth = entry.depth ?? entry._depth;

        if (depth !== undefined && depth > 0) {
            if (!result.atDepth[depth]) result.atDepth[depth] = [];
            result.atDepth[depth].push(entry);
        } else if (pos === 0 || pos === 'before_char') {
            result.beforeChar.push(entry);
        } else {
            result.afterChar.push(entry);
        }
    }

    return result;
}

/**
 * Build context text từ matched entries.
 */
export function buildLorebookContext(matchedEntries) {
    if (matchedEntries.length === 0) return '';

    const parts = matchedEntries.map(entry => {
        const name = entry.name || entry.comment || 'Entry';
        const content = entry.description || entry.content || '';
        return `[${name}]\n${content}`;
    });

    return parts.join('\n\n');
}
