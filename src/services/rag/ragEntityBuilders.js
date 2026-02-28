// ================================================
// RAG Entity Builders — compact context formatters
// ================================================

/**
 * Estimate token count (rough: 1 token ≈ 3.5 chars for Vietnamese)
 */
export function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 3.5);
}

/**
 * Evaluate Memory Decay multiplier based on chapter distance.
 * Exponential decay: drops to ~50% at distance=10, ~30% at distance=20.
 */
export function evaluateMemoryDecay(distance) {
    if (distance <= 0) return 1.0;
    return Math.max(0.3, Math.exp(-0.0693 * distance));
}

/**
 * Simple keyword overlap scoring between a chunk and a query.
 * Supports Type Priority Multipliers and Memory Decay.
 */
export function scoreRelevance(text, query, options = {}) {
    if (!text || !query) return 0;
    const { priorityMultiplier = 1, memoryDecay = 1 } = options;
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const textLower = text.toLowerCase();
    let baseScore = 0;

    for (const word of queryWords) {
        const matches = (textLower.match(new RegExp(word, 'g')) || []).length;
        baseScore += matches;
    }

    return baseScore * priorityMultiplier * memoryDecay;
}

/**
 * Build character context string — structured with STATIC (lore) + DYNAMIC (state)
 * Inspired by LSR Table Preset #1 (Nhân vật Gần đây) + #2 (Thông tin Nhân vật)
 */
export function buildCharacterContext(characters) {
    if (!characters?.length) return '';
    const lines = characters.map(c => {
        // Static lore — immutable/slow-changing info
        const staticParts = [c.name];
        if (c.gender) staticParts.push(c.gender);
        if (c.age) staticParts.push(`${c.age} tuổi`);
        if (c.role) staticParts.push(c.role);
        if (c.appearance) staticParts.push(`ngoại hình: ${c.appearance}`);
        if (c.bodyFeatures) staticParts.push(`đặc điểm: ${c.bodyFeatures}`);
        if (c.clothingPreference) staticParts.push(`phong cách: ${c.clothingPreference}`);
        if (c.personality) staticParts.push(`tính cách: ${c.personality}`);
        if (c.weakness) staticParts.push(`điểm yếu: ${c.weakness}`);
        if (c.hobbies) staticParts.push(`sở thích: ${c.hobbies}`);
        if (c.longTermGoal) staticParts.push(`mục tiêu DH: ${c.longTermGoal}`);
        if (c.motivation) staticParts.push(`động lực: ${c.motivation}`);
        if (c.abilities) staticParts.push(`năng lực: ${c.abilities}`);
        if (c.relationships) staticParts.push(`QH với MC: ${c.relationships}`);
        if (c.attitudeToProtagonist) staticParts.push(`thái độ MC: ${c.attitudeToProtagonist}`);
        if (c.importantRelationships) staticParts.push(`QH khác: ${c.importantRelationships}`);
        if (c.background) staticParts.push(`lý lịch: ${c.background}`);
        if (c.backgroundSetting) staticParts.push(`bối cảnh: ${c.backgroundSetting}`);
        if (c.description) staticParts.push(c.description);
        if (c.actionHistory) staticParts.push(`📜 lịch sử: ${c.actionHistory}`);

        let line = `• ${staticParts.join(' | ')}`;

        // Dynamic state — fast-changing per-scene info
        const dynParts = [];
        if (c.currentLocation) dynParts.push(`vị trí: ${c.currentLocation}`);
        if (c.currentPosture) dynParts.push(`tư thế: ${c.currentPosture}`);
        if (c.currentClothing) dynParts.push(`trang phục: ${c.currentClothing}`);
        if (c.currentBodyState) dynParts.push(`cơ thể: ${c.currentBodyState}`);
        if (c.currentGoal) dynParts.push(`MT tức thì: ${c.currentGoal}`);
        if (c.currentState) dynParts.push(`trạng thái: ${c.currentState}`);
        if (c.specialStatus) dynParts.push(`đặc biệt: ${c.specialStatus}`);
        if (dynParts.length > 0) {
            line += `\n  ⟳ ${dynParts.join(' | ')}`;
        }

        if (c.notes) line += `\n  ⚠ ${c.notes}`;
        return line;
    });
    return `NHÂN VẬT (${characters.length}):\n${lines.join('\n')}`;
}

/**
 * Build settings/locations context — compact format
 */
export function buildSettingContext(settings) {
    if (!settings?.length) return '';
    const lines = settings.map(s => {
        const parts = [s.name];
        if (s.type) parts.push(`[${s.type}]`);
        if (s.location) parts.push(s.location);
        if (s.description) parts.push(s.description);
        if (s.spatialStructure) parts.push(`cấu trúc: ${s.spatialStructure}`);
        if (s.logicRules) parts.push(`⚖️ quy tắc: ${s.logicRules}`);
        if (s.timeVariations) parts.push(`🕰️ biến đổi: ${s.timeVariations}`);
        if (s.notes) parts.push(`⚠ ${s.notes}`);
        return `• ${parts.join(' | ')}`;
    });
    return `BỐI CẢNH (${settings.length}):\n${lines.join('\n')}`;
}

/**
 * Build timeline context — compact format
 */
export function buildTimelineContext(timeline) {
    if (!timeline?.length) return '';
    const lines = timeline.map(t => {
        const parts = [t.title];
        if (t.date) parts.push(`[${t.date}]`);
        if (t.description) parts.push(t.description);
        if (t.characters) parts.push(`(${t.characters})`);
        return `• ${parts.join(' | ')}`;
    });
    return `SỰ KIỆN (${timeline.length}):\n${lines.join('\n')}`;
}

/**
 * Build plot points context — compact format
 */
export function buildPlotContext(plots) {
    if (!plots?.length) return '';
    const lines = plots.map(p => {
        const parts = [p.title];
        if (p.type) parts.push(`[${p.type}]`);
        if (p.status) parts.push(`(${p.status})`);
        if (p.description) parts.push(p.description);
        if (p.consequences) parts.push(`hậu quả: ${p.consequences}`);
        if (p.timeline) parts.push(`timeline: ${p.timeline}`);
        return `• ${parts.join(' | ')}`;
    });
    return `CỐT TRUYỆN (${plots.length}):\n${lines.join('\n')}`;
}

/**
 * #0 Current Info — Thông tin hiện tại của câu chuyện (thời gian, địa điểm)
 */
export function buildCurrentInfoContext(story) {
    if (!story?.currentTime && !story?.currentLocation) return '';
    const parts = [];
    if (story.currentTime) parts.push(`Thời gian hiện tại: ${story.currentTime}`);
    if (story.currentLocation) parts.push(`Địa điểm hiện tại: ${story.currentLocation}`);
    return `<current_state>\nTHÔNG TIN HIỆN TẠI:\n${parts.join('\n')}\n</current_state>`;
}

/**
 * Build ability/power context — compact format
 */
export function buildAbilityContext(abilities) {
    if (!abilities?.length) return '';
    const lines = abilities.map(a => {
        const parts = [a.name];
        if (a.owner) parts.push(`[${a.owner}]`);
        if (a.effect) parts.push(a.effect);
        if (a.limitation) parts.push(`⚠ ${a.limitation}`);
        return `• ${parts.join(' | ')}`;
    });
    return `NĂNG LỰC (${abilities.length}):\n${lines.join('\n')}`;
}

/**
 * Build item/inventory context — compact format
 */
export function buildItemContext(items) {
    if (!items?.length) return '';
    const lines = items.map(item => {
        const displayName = item.quantity ? `${item.name} (x${item.quantity})` : item.name;
        const parts = [displayName];
        if (item.owner) parts.push(`[${item.owner}]`);
        if (item.location) parts.push(`ở: ${item.location}`);
        if (item.effect) parts.push(item.effect);
        if (item.limitation) parts.push(`⚠ ${item.limitation}`);
        if (item.origin) parts.push(`nguồn gốc: ${item.origin}`);
        return `• ${parts.join(' | ')}`;
    });
    return `VẬT PHẨM (${items.length}):\n${lines.join('\n')}`;
}

/**
 * Build organization/faction context — compact format
 */
export function buildOrganizationContext(organizations) {
    if (!organizations?.length) return '';
    const lines = organizations.map(o => {
        const parts = [o.name];
        if (o.purpose) parts.push(o.purpose);
        if (o.members) parts.push(`[${o.members}]`);
        if (o.traits) parts.push(o.traits);
        return `• ${parts.join(' | ')}`;
    });
    return `TỔ CHỨC (${organizations.length}):\n${lines.join('\n')}`;
}

/**
 * Build quest/schedule context — compact format
 */
export function buildQuestContext(quests) {
    if (!quests?.length) return '';
    const lines = quests.map(q => {
        const parts = [q.title];
        if (q.progress) parts.push(`[${q.progress}]`);
        if (q.assignee) parts.push(q.assignee);
        if (q.description) parts.push(q.description);
        if (q.deadline) parts.push(`⏰ ${q.deadline}`);
        return `• ${parts.join(' | ')}`;
    });
    return `NHIỆM VỤ (${quests.length}):\n${lines.join('\n')}`;
}

/**
 * Build chapter summaries context
 */
export function buildChapterContext(chapters, currentChapterId = null) {
    if (!chapters?.length) return '';
    const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
    const lines = sorted.map(c => {
        const isCurrent = c.id === currentChapterId ? ' ⬅ CHƯƠNG HIỆN TẠI' : '';
        const parts = [`- Chương ${c.order || '?'}: ${c.title || 'Chưa đặt tên'}${isCurrent}`];
        if (c.summary) parts.push(`  Tóm tắt: ${c.summary}`);
        return parts.join('\n');
    });
    return `CÁC CHƯƠNG (${chapters.length}):\n${lines.join('\n')}`;
}

/**
 * Build reference documents context
 */
export function buildReferenceContext(references, query = '', maxTokens = 2000) {
    if (!references?.length) return '';

    let ranked = references.map(r => ({
        ...r,
        score: query ? scoreRelevance(r.content || r.title, query, { priorityMultiplier: 1.0 }) : 1
    }));

    ranked.sort((a, b) => b.score - a.score || (b.createdAt || 0) - (a.createdAt || 0));

    let usedTokens = 0;
    const included = [];
    for (const ref of ranked) {
        const content = ref.content || '';
        const tokens = estimateTokens(content);
        if (usedTokens + tokens > maxTokens && included.length > 0) break;
        included.push(`### ${ref.title || 'Tài liệu'}\n${content}`);
        usedTokens += tokens;
    }

    if (!included.length) return '';
    return `TÀI LIỆU THAM KHẢO (${included.length}/${references.length}):\n${included.join('\n\n')}`;
}

/**
 * Get relevant chapter content (nearby chapters for context)
 */
export function getRelevantChapterContent(chapters, currentChapterId, maxTokens = 3000) {
    if (!chapters?.length) return '';
    const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = sorted.findIndex(c => c.id === currentChapterId);

    const relevant = [];
    if (currentIndex > 0) {
        const prev = sorted[currentIndex - 1];
        if (prev.content) {
            const distance = Math.max(0, (sorted[currentIndex]?.order || 0) - (prev.order || 0));
            const memoryDecay = evaluateMemoryDecay(distance);
            relevant.push({
                label: `Chương ${prev.order}: ${prev.title} (chương trước)`,
                content: prev.content.slice(-1500),
                score: memoryDecay
            });
        }
    }
    if (currentIndex >= 0) {
        const current = sorted[currentIndex];
        if (current.content) {
            relevant.push({
                label: `Chương ${current.order}: ${current.title} (hiện tại)`,
                content: current.content,
                score: 1.0
            });
        }
    }

    if (!relevant.length) return '';

    let result = 'NỘI DUNG LIÊN QUAN:\n';
    let usedTokens = 0;
    for (const r of relevant) {
        const tokens = estimateTokens(r.content);
        if (usedTokens + tokens > maxTokens && usedTokens > 0) {
            result += `\n--- ${r.label} ---\n${r.content.slice(-500)}...\n`;
        } else {
            result += `\n--- ${r.label} ---\n${r.content}\n`;
        }
        usedTokens += tokens;
    }
    return result;
}

/**
 * Get keyword-matched chapters: find chapters whose keywords overlap
 * with the current context (outline, content, query).
 * Returns full content of the most relevant chapters within budget.
 *
 * @param {Array} chapters - All chapters in the story
 * @param {string} currentChapterId - ID of the chapter being written
 * @param {string} queryText - Current chapter outline + recent content to match against
 * @param {number} maxTokens - Token budget for matched chapter content
 * @returns {string} Formatted context with matched chapter content
 */
export function getKeywordMatchedChapters(chapters, currentChapterId, queryText, maxTokens = 4000) {
    if (!chapters?.length || !queryText) return '';

    const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIdx = sorted.findIndex(c => c.id === currentChapterId);
    const queryLower = queryText.toLowerCase();

    // Score each previous chapter by keyword overlap
    const scored = [];
    for (let i = 0; i < sorted.length; i++) {
        const ch = sorted[i];
        // Skip current chapter and chapters without keywords
        if (ch.id === currentChapterId || !ch.keywords?.length || !ch.content) continue;
        // Skip the immediately previous chapter (already included by getRelevantChapterContent)
        if (currentIdx > 0 && i === currentIdx - 1) continue;

        let matchCount = 0;
        const matchedKws = [];
        for (const kw of ch.keywords) {
            const kwLower = kw.toLowerCase().trim();
            if (kwLower.length < 2) continue;
            if (queryLower.includes(kwLower)) {
                matchCount++;
                matchedKws.push(kw);
            }
        }

        if (matchCount > 0) {
            scored.push({
                chapter: ch,
                matchCount,
                matchedKws,
                index: i
            });
        }
    }

    if (scored.length === 0) return '';

    // Sort by match count descending
    scored.sort((a, b) => b.matchCount - a.matchCount);

    // Pack top chapters within budget
    let usedTokens = 0;
    const included = [];
    for (const item of scored) {
        const contentTokens = estimateTokens(item.chapter.content);
        // If full content is too big, take only the most relevant parts
        let contentToInclude = item.chapter.content;
        if (contentTokens > maxTokens * 0.6) {
            // Take first 500 chars + last 1500 chars for context
            contentToInclude = item.chapter.content.slice(0, 500) + '\n...\n' + item.chapter.content.slice(-1500);
        }
        const tokens = estimateTokens(contentToInclude);
        if (usedTokens + tokens > maxTokens && included.length > 0) break;

        included.push({
            label: `Chương ${item.chapter.order || '?'}: ${item.chapter.title || 'Chưa đặt tên'}`,
            matchedKws: item.matchedKws,
            content: contentToInclude
        });
        usedTokens += tokens;
        // Max 2 keyword-matched chapters to avoid overwhelming context
        if (included.length >= 2) break;
    }

    if (included.length === 0) return '';

    const lines = included.map(inc =>
        `--- ${inc.label} [🏷️ ${inc.matchedKws.join(', ')}] ---\n${inc.content}`
    );

    console.log(`🏷️ Keyword-matched ${included.length} chapter(s): ${included.map(i => i.label).join(', ')}`);

    return `\n【NỘI DUNG CHƯƠNG LIÊN QUAN (KEYWORD-MATCHED)】\n${lines.join('\n\n')}`;
}

/**
 * Build rich detail string for an entity based on its type — includes ALL relevant fields.
 */
function buildEntityDetails(entity, type) {
    const details = [];

    // Common fields
    if (entity.description) details.push(entity.description);
    if (entity.effect) details.push(`Công dụng: ${entity.effect}`);
    if (entity.purpose) details.push(`Mục đích: ${entity.purpose}`);

    // Character-specific
    if (type === 'Nhân vật') {
        if (entity.role) details.push(`Vai trò: ${entity.role}`);
        if (entity.personality) details.push(`Tính cách: ${entity.personality}`);
        if (entity.relationships) details.push(`QH với MC: ${entity.relationships}`);
        if (entity.importantRelationships) details.push(`QH khác: ${entity.importantRelationships}`);
        if (entity.abilities) details.push(`Năng lực: ${entity.abilities}`);
        if (entity.weakness) details.push(`Điểm yếu: ${entity.weakness}`);
        if (entity.actionHistory) details.push(`📜 Lịch sử: ${entity.actionHistory}`);
        // Dynamic state
        const dynParts = [];
        if (entity.currentLocation) dynParts.push(`vị trí: ${entity.currentLocation}`);
        if (entity.currentState) dynParts.push(`trạng thái: ${entity.currentState}`);
        if (entity.currentGoal) dynParts.push(`MT tức thì: ${entity.currentGoal}`);
        if (entity.specialStatus) dynParts.push(`đặc biệt: ${entity.specialStatus}`);
        if (dynParts.length > 0) details.push(`⟳ ${dynParts.join(' | ')}`);
    }

    // Setting-specific
    if (type === 'Bối cảnh') {
        if (entity.logicRules) details.push(`⚖️ Quy tắc: ${entity.logicRules}`);
        if (entity.timeVariations) details.push(`🕰️ Biến đổi: ${entity.timeVariations}`);
        if (entity.spatialStructure) details.push(`Cấu trúc: ${entity.spatialStructure}`);
    }

    // Item-specific
    if (type === 'Vật phẩm') {
        if (entity.quantity) details.push(`Số lượng: ${entity.quantity}`);
        if (entity.owner) details.push(`Sở hữu: ${entity.owner}`);
        if (entity.limitation) details.push(`⚠ Hạn chế: ${entity.limitation}`);
        if (entity.origin) details.push(`Nguồn gốc: ${entity.origin}`);
    }

    // Ability-specific
    if (type === 'Năng lực') {
        if (entity.owner) details.push(`Người dùng: ${entity.owner}`);
        if (entity.limitation) details.push(`⚠ Hạn chế: ${entity.limitation}`);
    }

    // Organization-specific
    if (type === 'Tổ chức') {
        if (entity.members) details.push(`Thành viên: ${entity.members}`);
        if (entity.traits) details.push(`Đặc điểm: ${entity.traits}`);
    }

    // Plot-specific
    if (type === 'Sự kiện') {
        if (entity.consequences) details.push(`Hậu quả: ${entity.consequences}`);
        if (entity.timeline) details.push(`Timeline: ${entity.timeline}`);
    }

    // MetaRules-specific
    if (type === 'Quy tắc') {
        if (entity.narrativeStyle) details.push(`Phong cách: ${entity.narrativeStyle}`);
        if (entity.logicLimits) details.push(`Giới hạn: ${entity.logicLimits}`);
        if (entity.dynamicUpdates) details.push(`Cập nhật: ${entity.dynamicUpdates}`);
    }

    // State — always at the end (MVU)
    if (entity.state) details.push(`🟢 TRẠNG THÁI HIỆN TẠI (MVU): ${entity.state}`);

    return details.join(' | ');
}

/**
 * Evaluate dynamic chapter-based trigger conditions
 * Syntax supported in keywords or triggerCondition fields:
 * "chuong: 1, 3, 5", "chap: 1-5", "chapter: >10", "chuong: <5"
 */
function evaluateChapterCondition(conditionStr, currentChapterNumber) {
    if (currentChapterNumber === null || !conditionStr) return false;

    // Normalize string: lowercase, remove accents
    const normalized = conditionStr.toLowerCase()
        .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
        .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
        .replace(/ì|í|ị|ỉ|ĩ/g, 'i')
        .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
        .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
        .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
        .replace(/đ/g, 'd');

    // Regex to find trigger patterns: (chuong|chap|chapter)[:\s]+([0-9,\-\s><]+)
    const regex = /(?:chuong|chap|chapter)[:\s]+([0-9,\-\s><]+)/g;
    let match;
    let isTriggered = false;

    while ((match = regex.exec(normalized)) !== null) {
        const expression = match[1].trim();

        // Split by commas for multiple conditions
        const parts = expression.split(',').map(p => p.trim());

        for (const part of parts) {
            if (!part) continue;

            if (part.startsWith('>')) {
                const num = parseInt(part.substring(1));
                if (!isNaN(num) && currentChapterNumber > num) isTriggered = true;
            } else if (part.startsWith('<')) {
                const num = parseInt(part.substring(1));
                if (!isNaN(num) && currentChapterNumber < num) isTriggered = true;
            } else if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n));
                if (!isNaN(start) && !isNaN(end) && currentChapterNumber >= start && currentChapterNumber <= end) isTriggered = true;
            } else {
                const num = parseInt(part);
                if (!isNaN(num) && currentChapterNumber === num) isTriggered = true;
            }
        }
    }

    return isTriggered;
}

/**
 * Evaluate location-based trigger conditions.
 * Syntax: "diadiem: Rừng tối", "location: Temple", "vitri: Cung điện"
 * Supports multiple values: "diadiem: Rừng tối, Hang động"
 */
function evaluateLocationCondition(conditionStr, currentLocation) {
    if (!currentLocation || !conditionStr) return false;
    const normalized = conditionStr.toLowerCase();
    const locLower = currentLocation.toLowerCase();

    // Pattern: (diadiem|location|vitri|noi)[:\s]+(.+?)(?:\||$|\n)
    const regex = /(?:diadiem|địa điểm|dia diem|location|vitri|vị trí|vi tri|noi|nơi)[:\s]+([^|\n]+)/gi;
    let match;
    while ((match = regex.exec(conditionStr)) !== null) {
        const locations = match[1].split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
        for (const loc of locations) {
            // Fuzzy match: either side contains the other
            if (locLower.includes(loc) || loc.includes(locLower)) return true;
        }
    }
    return false;
}

/**
 * Evaluate time-based trigger conditions.
 * Syntax: "thoigian: ban đêm", "time: sáng sớm", "luc: nửa đêm"
 * Supports aliases: "ngày" → [ban ngày, buổi sáng, buổi trưa, buổi chiều]
 *                 "đêm" → [ban đêm, nửa đêm, buổi tối, đêm khuya]
 */
function evaluateTimeCondition(conditionStr, currentTime) {
    if (!currentTime || !conditionStr) return false;
    const timeLower = currentTime.toLowerCase();

    const regex = /(?:thoigian|thời gian|thoi gian|time|luc|lúc|khi)[:\s]+([^|\n]+)/gi;
    let match;
    while ((match = regex.exec(conditionStr)) !== null) {
        const times = match[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        for (const t of times) {
            // Direct match
            if (timeLower.includes(t) || t.includes(timeLower)) return true;
            // Alias expansion
            const dayAliases = ['ban ngày', 'buổi sáng', 'buổi trưa', 'buổi chiều', 'sáng', 'trưa', 'chiều'];
            const nightAliases = ['ban đêm', 'nửa đêm', 'buổi tối', 'đêm khuya', 'tối', 'đêm'];
            if ((t === 'ngày' || t === 'ngay') && dayAliases.some(a => timeLower.includes(a))) return true;
            if ((t === 'đêm' || t === 'dem') && nightAliases.some(a => timeLower.includes(a))) return true;
        }
    }
    return false;
}

/**
 * Extract matched Lorebook entries based on keywords + always-active flag.
 * Scans `text` to find entities that have `keywords` and matches them.
 * Also parses dynamic chapter/location/time conditions.
 * Also injects any entities with `alwaysActive` flag set.
 * Respects `insertionOrder` and `priority` for output ordering.
 *
 * @param {string} text - Text to scan for keyword matches
 * @param {Object} db - Story database
 * @param {number|null} currentChapterNumber - Current chapter number
 * @param {Object} contextInfo - { currentLocation, currentTime } from story state
 */
export function extractLorebook(text, db, currentChapterNumber = null, contextInfo = {}) {
    if (!db) return '';
    const targetText = (text || '').toLowerCase();
    const activeEntries = []; // { type, name, info, insertionOrder, priority, alwaysActive }
    const { currentLocation, currentTime } = contextInfo;

    const checkAndAdd = (entities, type) => {
        if (!entities?.length) return;
        entities.forEach(entity => {
            const name = entity.name || entity.title || '';
            if (!name) return;

            // Check always-active first (if strategy is Constant)
            const isAlwaysActive = !!entity.alwaysActive || entity.strategy === 'Constant';

            // Check dynamic chapter triggers
            let isDynamicTrigger = false;
            let triggerType = ''; // 'chapter', 'location', 'time'
            const textToParse = [entity.keywords || '', entity.triggerCondition || ''].join(' ');
            if (textToParse) {
                if (currentChapterNumber !== null && evaluateChapterCondition(textToParse, currentChapterNumber)) {
                    isDynamicTrigger = true;
                    triggerType = 'chapter';
                }
                if (!isDynamicTrigger && currentLocation && evaluateLocationCondition(textToParse, currentLocation)) {
                    isDynamicTrigger = true;
                    triggerType = 'location';
                }
                if (!isDynamicTrigger && currentTime && evaluateTimeCondition(textToParse, currentTime)) {
                    isDynamicTrigger = true;
                    triggerType = 'time';
                }
            }

            // Check keyword match with Advanced Logic (AND/NOT) & Whole Words
            let isKeywordMatch = false;
            let hasForbiddenKeyword = false;

            // PERFORMANCE OPTIMIZATION: If the entity is already Constant/Always Active,
            // we ONLY need to check for Forbidden Keywords (NOT logic). If there are no 
            // forbidden keywords defined, we can skip the entire Regex block!
            let hasForbiddenDefined = false;
            if (entity.keywords) {
                hasForbiddenDefined = entity.keywords.includes('-');
            }

            if (entity.keywords && targetText && (!isAlwaysActive || hasForbiddenDefined)) {
                // Split by comma for separate trigger rules (OR logic between commas)
                const keywordGroups = entity.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

                // For each comma-separated group, evaluate advanced logic (AND/NOT inside the group)
                for (const group of keywordGroups) {
                    if (group.includes('chuơng') || group.includes('chương') || group.includes('chuong') || group.includes('chap')) continue;

                    // Parse the group into REQUIRED (+), FORBIDDEN (-), and NORMAL words
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

                    // Helper function to check if a word exists in the text as a WHOLE WORD
                    const checkWordInText = (word) => {
                        try {
                            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const regex = new RegExp(`(?:^|[^\\p{L}\\p{M}\\p{N}_])${escapedWord}(?:[^\\p{L}\\p{M}\\p{N}_]|$)`, 'iu');
                            return regex.test(targetText);
                        } catch (e) {
                            return targetText.includes(word);
                        }
                    };

                    // Evaluate FORBIDDEN words (if ANY forbidden word is present, this group fails immediately)
                    let groupHasForbidden = false;
                    for (const fWord of forbiddenWords) {
                        if (checkWordInText(fWord)) {
                            groupHasForbidden = true;
                            hasForbiddenKeyword = true;
                            break;
                        }
                    }
                    if (groupHasForbidden) continue;

                    // If it's Always Active, we only cared about finding forbidden words. We can skip the rest.
                    if (isAlwaysActive) {
                        isKeywordMatch = true;
                        continue;
                    }

                    // Evaluate REQUIRED words (AND logic: ALL required words must be present)
                    let allRequiredMet = true;
                    for (const rWord of requiredWords) {
                        if (!checkWordInText(rWord)) {
                            allRequiredMet = false;
                            break;
                        }
                    }
                    if (!allRequiredMet) continue;

                    // Evaluate NORMAL words (If there are normal words, at least ONE must match if there are no required words)
                    let normalMet = true;
                    if (normalWords.length > 0 && requiredWords.length === 0) {
                        const joinedNormal = normalWords.join(' ');
                        normalMet = checkWordInText(joinedNormal);
                    }

                    // If we reach here, and required are met, and normal are met, we have a match!
                    if (allRequiredMet && normalMet) {
                        isKeywordMatch = true;
                        break;
                    }
                }
            }

            // Also match by entity name (auto secondary key) if no forbidden keywords were triggered
            if (!isKeywordMatch && !hasForbiddenKeyword && targetText && name.length >= 2 && !isAlwaysActive) {
                const checkWordInText = (word) => {
                    try {
                        const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(?:^|[^\\p{L}\\p{M}\\p{N}_])${escapedWord}(?:[^\\p{L}\\p{M}\\p{N}_]|$)`, 'iu');
                        return regex.test(targetText);
                    } catch (e) {
                        return targetText.includes(word.toLowerCase());
                    }
                };
                isKeywordMatch = checkWordInText(name);
            }

            // A forbidden keyword explicitly blocks the entity even if it's "Always Active"
            if (hasForbiddenKeyword) {
                isKeywordMatch = false;
            } else if (isAlwaysActive || isDynamicTrigger || isKeywordMatch) {
                const detailStr = buildEntityDetails(entity, type);

                // Show visual indicator of why it was triggered
                let triggerIcon = '🔑'; // Keyword
                if (isAlwaysActive) triggerIcon = '🔒'; // Always on
                else if (isDynamicTrigger && !isKeywordMatch) {
                    if (triggerType === 'location') triggerIcon = '📍'; // Location trigger
                    else if (triggerType === 'time') triggerIcon = '⏰'; // Time trigger
                    else triggerIcon = '🗓️'; // Chapter trigger
                }

                const info = `[${type}] ${name} ${triggerIcon}: ${detailStr}`;

                activeEntries.push({
                    type,
                    name,
                    info,
                    insertionOrder: parseInt(entity.insertionOrder) || 100, // Default Order is 100
                    priority: parseInt(entity.priority) || 30, // Default to 30 (Reference) if not set
                    alwaysActive: isAlwaysActive
                });
            }
        });
    };

    checkAndAdd(db.characters, 'Nhân vật');
    checkAndAdd(db.settings, 'Bối cảnh');
    checkAndAdd(db.items, 'Vật phẩm');
    checkAndAdd(db.abilities, 'Năng lực');
    checkAndAdd(db.organizations, 'Tổ chức');
    checkAndAdd(db.plots, 'Sự kiện');
    if (db.metaRules) checkAndAdd(db.metaRules, 'Quy tắc');

    if (activeEntries.length > 0) {
        // Sort: always-active first, then by priority (desc), then by insertionOrder (asc)
        activeEntries.sort((a, b) => {
            if (a.alwaysActive !== b.alwaysActive) return a.alwaysActive ? -1 : 1;
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.insertionOrder - b.insertionOrder;
        });

        // Group by Priority Tiers
        const coreRules = []; // Priority 71-100 (Depth 0)
        const worldPhysics = []; // Priority 31-70
        const references = []; // Priority 1-30

        activeEntries.forEach(entry => {
            if (entry.priority >= 71) coreRules.push(entry.info);
            else if (entry.priority >= 31) worldPhysics.push(entry.info);
            else references.push(entry.info);
        });

        let contextOutput = '';
        let coreOutput = '';

        if (references.length > 0) {
            contextOutput += `\n【THÔNG TIN THAM KHẢO PHỤ (WORLDBOOK - PRIORITY THẤP)】\n${references.join('\n')}`;
        }

        if (worldPhysics.length > 0) {
            contextOutput += `\n\n【KIẾN THỨC VẬT LÝ / THẾ GIỚI (WORLDBOOK - PRIORITY CAO)】\n${worldPhysics.join('\n')}`;
        }

        if (coreRules.length > 0) {
            coreOutput += `\n══════════════════════════════════════\n【LUẬT CỐT LÕI BẮT BUỘC / CẤM KỴ (WORLDBOOK - PRIORITY TỐI ĐA)】\n⛔ AI TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM TRÁI CÁC ĐIỀU SAU:\n══════════════════════════════════════\n${coreRules.join('\n')}`;
        }

        return {
            contextOutput: contextOutput ? `<active_lorebook>\n${contextOutput}\n</active_lorebook>` : '',
            coreOutput: coreOutput ? `<core_lorebook>\n${coreOutput}\n</core_lorebook>` : ''
        };
    }

    return { contextOutput: '', coreOutput: '' };
}
