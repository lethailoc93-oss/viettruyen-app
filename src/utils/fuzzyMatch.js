// ================================================
// Fuzzy Name Matching — Vietnamese-aware entity dedup
// ================================================

/**
 * Normalize Vietnamese string for comparison.
 * Removes diacritics, lowercases, trims, collapses whitespace.
 */
export function normalizeVietnamese(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/\s+/g, ' ');
}

/**
 * Calculate word overlap ratio between two strings.
 * Returns 0..1 where 1 = perfect overlap.
 */
function wordOverlap(a, b) {
    const wordsA = new Set(normalizeVietnamese(a).split(' ').filter(Boolean));
    const wordsB = new Set(normalizeVietnamese(b).split(' ').filter(Boolean));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let overlap = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
    }
    return overlap / Math.max(wordsA.size, wordsB.size);
}

/**
 * Check if one name contains the other (after normalization).
 * Handles cases like "Lý Hạo" matching "Lý Hạo Thiên".
 */
function containsMatch(nameA, nameB) {
    const a = normalizeVietnamese(nameA);
    const b = normalizeVietnamese(nameB);
    return a.includes(b) || b.includes(a);
}

/**
 * Fuzzy match a name against a list of existing names.
 * Uses 3-level strategy: exact → contains → word-overlap.
 *
 * @param {string} name - The new name to check
 * @param {string[]} existingNames - Array of existing names
 * @param {number} threshold - Word overlap threshold (default 0.6)
 * @returns {{ matched: boolean, matchedName: string|null, matchType: string }}
 */
export function fuzzyNameMatch(name, existingNames, threshold = 0.6) {
    if (!name || !existingNames?.length) return { matched: false, matchedName: null, matchType: 'none' };

    const normName = normalizeVietnamese(name);

    // Level 1: Exact match (after normalization)
    for (const existing of existingNames) {
        if (normalizeVietnamese(existing) === normName) {
            return { matched: true, matchedName: existing, matchType: 'exact' };
        }
    }

    // Level 2: Contains match (one name includes the other)
    for (const existing of existingNames) {
        if (containsMatch(name, existing)) {
            // Only match if the shorter name is at least 2 chars
            const shorter = name.length < existing.length ? name : existing;
            if (shorter.trim().length >= 2) {
                return { matched: true, matchedName: existing, matchType: 'contains' };
            }
        }
    }

    // Level 3: Word overlap
    let bestMatch = null;
    let bestScore = 0;
    for (const existing of existingNames) {
        const score = wordOverlap(name, existing);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = existing;
        }
    }
    if (bestScore >= threshold) {
        return { matched: true, matchedName: bestMatch, matchType: 'overlap' };
    }

    return { matched: false, matchedName: null, matchType: 'none' };
}

/**
 * Find an existing entity by fuzzy matching its name.
 *
 * @param {string} name - Name to search for
 * @param {Array<Object>} entities - Array of entity objects
 * @param {string} nameKey - Key used for name in entity objects (default 'name')
 * @param {number} threshold - Fuzzy match threshold (default 0.6)
 * @returns {Object|null} The matched entity or null
 */
export function fuzzyFindEntity(name, entities, nameKey = 'name', threshold = 0.6) {
    if (!name || !entities?.length) return null;

    const names = entities.map(e => e[nameKey]).filter(Boolean);
    const { matched, matchedName } = fuzzyNameMatch(name, names, threshold);
    if (!matched || !matchedName) return null;

    return entities.find(e =>
        e[nameKey] && normalizeVietnamese(e[nameKey]) === normalizeVietnamese(matchedName)
    ) || null;
}

/**
 * Deduplicate timeline events by checking word overlap with existing events.
 * Prevents the same event from being added multiple times across chapters.
 *
 * @param {Array<Object>} newEvents - New timeline events from scan
 * @param {Array<Object>} existingEvents - Existing timeline events in database
 * @param {number} threshold - Overlap threshold (default 0.5, lower because descriptions vary)
 * @returns {Array<Object>} Only the truly new events
 */
export function deduplicateTimelineEvents(newEvents, existingEvents, threshold = 0.5) {
    if (!newEvents?.length) return [];
    if (!existingEvents?.length) return newEvents;

    return newEvents.filter(newEvt => {
        const newTitle = newEvt.title || newEvt.name || '';
        const newDesc = newEvt.description || '';
        const newText = `${newTitle} ${newDesc}`;

        for (const existing of existingEvents) {
            const existTitle = existing.title || existing.name || '';
            const existDesc = existing.description || '';
            const existText = `${existTitle} ${existDesc}`;

            // Check title similarity first (fast path)
            if (newTitle && existTitle) {
                const titleOverlap = wordOverlap(newTitle, existTitle);
                if (titleOverlap >= 0.7) return false; // Very similar titles → duplicate
            }

            // Check full text overlap
            const textOverlap = wordOverlap(newText, existText);
            if (textOverlap >= threshold) return false; // Too similar → duplicate
        }
        return true; // Truly new event
    });
}
