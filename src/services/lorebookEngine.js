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
        enableSemanticFallback = true, // R-1: Hybrid lorebook — semantic fallback for unmatched entries
    } = options;

    // Ghép các text gần đây thành 1 chuỗi searchable
    const searchText = recentTexts.slice(-scanDepth).join('\n').toLowerCase();

    const matched = [];
    const unmatchedWithContent = []; // For semantic fallback

    for (const entry of entries) {
        // Skip disabled entries
        if (entry._enabled === false || entry.enabled === false) continue;

        // 🔴 FIX: constant entries luôn được inject bất kể keyword
        if (entry.constant === true) {
            matched.push({ ...entry, _matchType: 'constant', _matchScore: 200 });
            continue;
        }

        const keywords = extractKeywords(entry);

        // Always Active: không có keywords → luôn inject
        if (keywords.length === 0) {
            if (entry.alwaysActive || entry._alwaysActive) {
                matched.push({ ...entry, _matchType: 'always_active', _matchScore: 100 });
            }
            continue;
        }

        // 🔴 FIX: Hỗ trợ match_whole_words
        const useWholeWords = entry.match_whole_words || false;

        // Check primary keyword matches
        const matchResult = matchKeywords(searchText, keywords, 'or', useWholeWords);
        if (!matchResult.matched) {
            // R-1: Collect unmatched entries for semantic fallback
            if (enableSemanticFallback && (entry.description || entry.content)) {
                unmatchedWithContent.push(entry);
            }
            continue;
        }

        // 🔴 FIX: selective + secondary_keys → AND logic
        if (entry.selective && entry.secondary_keys && entry.secondary_keys.length > 0) {
            const secondaryResult = matchKeywords(searchText, entry.secondary_keys, 'and', useWholeWords);
            if (!secondaryResult.matched) continue;
            // Cả hai đều match
            matched.push({
                ...entry,
                _matchType: 'selective',
                _matchScore: matchResult.score + secondaryResult.score,
                _matchedKeywords: [...matchResult.matchedKeywords, ...secondaryResult.matchedKeywords],
            });
        } else {
            matched.push({
                ...entry,
                _matchType: 'keyword',
                _matchScore: matchResult.score,
                _matchedKeywords: matchResult.matchedKeywords,
            });
        }
    }

    // ─── R-1: Hybrid Semantic Fallback ───
    // For entries that didn't match keywords, check if their content is contextually relevant
    if (enableSemanticFallback && unmatchedWithContent.length > 0 && matched.length < maxEntries) {
        const recentWords = new Set(searchText.split(/\s+/).filter(w => w.length > 2));
        const slotsLeft = maxEntries - matched.length;

        const semanticCandidates = unmatchedWithContent.map(entry => {
            const desc = ((entry.description || '') + ' ' + (entry.content || '')).toLowerCase();
            const descWords = desc.split(/\s+/).filter(w => w.length > 2);
            // Count overlapping meaningful words (lightweight semantic similarity)
            let overlap = 0;
            for (const word of descWords) {
                if (recentWords.has(word)) overlap++;
            }
            // R-4: Scene-aware boost — if entry has tags matching detected scene type
            const tags = (entry.tags || []).join(' ').toLowerCase();
            const sceneBoost = /combat|chiến|đánh/.test(searchText) && /combat|chiến|vũ khí|weapon/.test(tags) ? 3 :
                /romance|tình|yêu/.test(searchText) && /romance|tình|love/.test(tags) ? 3 :
                    /magic|phép|thuật/.test(searchText) && /magic|phép|thuật/.test(tags) ? 3 : 0;

            return { entry, relevance: overlap + sceneBoost };
        }).filter(c => c.relevance >= 3) // At least 3 overlapping words
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, Math.min(5, slotsLeft));

        for (const { entry, relevance } of semanticCandidates) {
            matched.push({
                ...entry,
                _matchType: 'semantic',
                _matchScore: relevance,
                _matchedKeywords: ['(semantic)'],
            });
        }
    }

    // Sort by priority (higher first), then by match score, then by insertion_order
    matched.sort((a, b) => {
        const pa = a.priority || a._priority || 10;
        const pb = b.priority || b._priority || 10;
        if (pa !== pb) return pb - pa;
        const sa = b._matchScore || 0;
        const sb = a._matchScore || 0;
        if (sa !== sb) return sa - sb;
        // 🟡 FIX: insertion_order as tiebreaker (lower = earlier)
        const oa = a.insertionOrder ?? a._insertion_order ?? 100;
        const ob = b.insertionOrder ?? b._insertion_order ?? 100;
        return oa - ob;
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
 * Match keywords theo logic AND hoặc OR, hỗ trợ (+) bắt buộc và (-) cấm.
 * Tương thích với logic trong UI LorebookFields.jsx
 */
function matchKeywords(searchText, keywords, logic = 'or', wholeWords = false) {
    const matchedKeywords = [];

    // Tách các keywords thành từng nhóm (bằng dấu phẩy)
    const keywordGroups = keywords.map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

    // Nếu mảng keyword là do chuỗi split ra mà đã mất +, - do extractKeywords split(',')
    // -> extractKeywords ở trên đang lỡ split(','), ta phải gộp logic lại.
    // Nhưng vì params `keywords` truyền vào đây là mảng các chuỗi, ví dụ: ["phép thuật +lửa", "-nước"]
    // nếu nó đã bị extractKeywords chia sai thì sẽ lỗi.
    // Rất may extractKeywords chỉ tách theo ',' (ví dụ: "a +b, c" -> ["a +b", "c"]) nên từng phần tử là 1 group hợp lệ.

    for (const group of keywordGroups) {
        if (!group) continue;

        const tokens = group.split(/\s+/);
        const requiredWords = [];
        const forbiddenWords = [];
        const normalWords = [];

        tokens.forEach(token => {
            if (token.startsWith('+') && token.length > 1) {
                requiredWords.push(token.substring(1));
            } else if (token.startsWith('-') && token.length > 1) {
                forbiddenWords.push(token.substring(1));
            } else {
                normalWords.push(token);
            }
        });

        // Helper check từ trong đoạn text (hỗ trợ whole words)
        const checkWordInText = (word) => {
            try {
                if (wholeWords) {
                    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // Word-boundary cho Unicode (ví Tiếng Việt)
                    const regex = new RegExp(`(?:^|[^\\p{L}\\p{M}\\p{N}_])${escaped}(?:[^\\p{L}\\p{M}\\p{N}_]|$)`, 'iu');
                    return regex.test(searchText);
                } else {
                    return searchText.includes(word);
                }
            } catch (e) {
                return searchText.includes(word);
            }
        };

        // 1. Kiểm tra từ cấm. Nếu có bất kỳ từ cấm nào xuất hiện, group này failed.
        let groupHasForbidden = false;
        for (const fWord of forbiddenWords) {
            if (checkWordInText(fWord)) {
                groupHasForbidden = true;
                break;
            }
        }
        if (groupHasForbidden) continue;

        // 2. Kiểm tra từ bắt buộc. Nếu có bất kỳ từ bắt buộc nào KHÔNG có, group này failed.
        let allRequiredMet = true;
        for (const rWord of requiredWords) {
            if (!checkWordInText(rWord)) {
                allRequiredMet = false;
                break;
            }
        }
        if (!allRequiredMet) continue;

        // 3. Kiểm tra từ bình thường
        let normalMet = true;
        if (normalWords.length > 0 && requiredWords.length === 0) {
            // Nếu chỉ có normal words, phải match chuỗi ghép của chúng
            normalMet = checkWordInText(normalWords.join(' '));
        }

        if (allRequiredMet && normalMet) {
            matchedKeywords.push(group); // Group này đã thỏa mãn
        }
    }

    if (logic === 'and') {
        return {
            matched: matchedKeywords.length === keywords.length && keywords.length > 0,
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
