// ================================================
// Card Import Service — Nhập Card → Tạo Bộ Truyện
// ================================================
// Chuyển đổi Character Card (PNG/JSON, V1/V2/V3) thành
// một bộ truyện hoàn chỉnh với đầy đủ dữ liệu.

import { Utils } from '../utils/helpers';
import { extractCharaFromPNG, convertCardToCharacter } from '../utils/importExportUtils';

// ═══════════════════════════════════════════════════
// Entry Type Constants
// ═══════════════════════════════════════════════════
const ENTRY_TYPE = {
    WORLD: 'world',           // Vùng miền, địa lý, bản đồ
    CHARACTER: 'character',   // Thẻ hồ sơ nhân vật
    GAME_SYSTEM: 'game_system', // Hệ thống game (chiến đấu, nuôi quân...)
    STATUS_BAR: 'status_bar', // Thanh trạng thái
    CONTROLLER: 'controller', // JavaScript controller (@@preprocessing)
    VARIABLE: 'variable',     // Biến số, JSON Patch
    AFFECTION: 'affection',   // Giai đoạn cảm xúc nhân vật
    LORE: 'lore',             // Kiến thức thế giới, kinh tế, lịch sử...
    OPTIONAL: 'optional',     // Tùy chọn DLC
    INTERACTION: 'interaction', // Quy tắc tương tác
};

// ═══════════════════════════════════════════════════
// Smart Entry Categorizer
// ═══════════════════════════════════════════════════

/**
 * Phân loại 1 character_book entry dựa vào comment, keys, content.
 */
function categorizeEntry(entry) {
    const comment = (entry.comment || '').toLowerCase();
    const content = (entry.content || '').substring(0, 500).toLowerCase();
    const keys = (entry.keys || entry.key || []).join(' ').toLowerCase();

    // Controller — JS preprocessing scripts
    if (content.includes('@@preprocessing') || content.includes('getvar(') ||
        content.includes('<%_') || content.includes('<%=') ||
        comment.includes('đừng động') || comment.includes('bộ điều khiển') ||
        comment.includes('controller')) {
        return ENTRY_TYPE.CONTROLLER;
    }

    // Variable system — JSON Patch, stat updates
    if (comment.includes('biến_số') || comment.includes('biến số') ||
        comment.includes('variable') || comment.includes('cập_nhật_biến') ||
        content.includes('updatevariable') || content.includes('json patch') ||
        content.includes('stat_data') || comment.includes('mvu_update')) {
        return ENTRY_TYPE.VARIABLE;
    }

    // Affection stages — character progression
    if (comment.includes('giai_đoạn') || comment.includes('giai đoạn') ||
        content.includes('điều_kiện_kích_hoạt') || content.includes('độ_hảo_cảm') ||
        content.includes('hảo cảm') || comment.includes('si_mê') ||
        comment.includes('nảy_mầm') || comment.includes('lệ_thuộc') ||
        comment.includes('si_nữ') || comment.includes('vỏ_rỗng')) {
        return ENTRY_TYPE.AFFECTION;
    }

    // World / Region — Location entries
    if (content.startsWith('<region_') || content.includes('<region_') ||
        comment.includes('châu') || comment.includes('_châu') ||
        keys.includes('vị trí hiện tại') || keys.includes('当前位置') ||
        comment.includes('lạc_dương') || comment.includes('kinh sư') ||
        (content.includes('trị_sở') && content.includes('dân_số'))) {
        return ENTRY_TYPE.WORLD;
    }

    // Character profile — person entries
    if (content.includes('thẻ hồ sơ nhân vật') || content.includes('thông tin cơ bản') &&
        (content.includes('tuổi') || content.includes('thân phận') || content.includes('họ tên'))) {
        return ENTRY_TYPE.CHARACTER;
    }

    // Game System — rules, combat, morale
    if (content.startsWith('<rule_') || content.includes('<rule_') ||
        comment.includes('hệ_thống') || comment.includes('hệ thống') ||
        comment.includes('chiến_đấu') || comment.includes('chiến đấu') ||
        comment.includes('nuôi_quân') || comment.includes('nuôi quân') ||
        comment.includes('quy_tắc') ||
        comment.includes('game_system') || comment.includes('system')) {
        return ENTRY_TYPE.GAME_SYSTEM;
    }

    // Status effects — morale, loyalty, supply states
    if (comment.includes('trạng_thái') || comment.includes('trạng thái') ||
        comment.includes('sĩ_khí') || comment.includes('sĩ khí') ||
        comment.includes('lòng_dân') || comment.includes('lòng dân') ||
        comment.includes('trung_thành') || comment.includes('trung thành') ||
        comment.includes('lương_thảo') || comment.includes('lương thảo') ||
        comment.includes('lương_bổng') || comment.includes('lương bổng') ||
        keys.includes('民心') || keys.includes('军团') || keys.includes('将领')) {
        return ENTRY_TYPE.STATUS_BAR;
    }

    // Status bar format — display instructions
    if (comment.includes('状态栏') || comment.includes('status') ||
        content.includes('thanh trạng thái') || content.includes('trạng thái lãnh thổ') ||
        content.includes('<territory_') || content.includes('<decree_')) {
        return ENTRY_TYPE.STATUS_BAR;
    }

    // Interaction rules
    if (comment.includes('互动') || comment.includes('tương tác') ||
        comment.includes('interaction')) {
        return ENTRY_TYPE.INTERACTION;
    }

    // Optional DLC
    if (comment.includes('tùy chọn') || comment.includes('optional') ||
        (!entry.enabled && content.includes('thiết lập tùy chọn'))) {
        return ENTRY_TYPE.OPTIONAL;
    }

    // Map/Territory display — game-like status system
    if (comment.includes('bản đồ') || comment.includes('pháp lệnh') ||
        content.includes('territory_map') || content.includes('territory_status')) {
        return ENTRY_TYPE.GAME_SYSTEM;
    }

    // Lore — everything else (history, economy, culture, etc.)
    return ENTRY_TYPE.LORE;
}

/**
 * Phân loại tất cả entries và nhóm theo type.
 */
function categorizeAllEntries(entries) {
    const groups = {};
    for (const type of Object.values(ENTRY_TYPE)) {
        groups[type] = [];
    }

    for (const entry of entries) {
        const type = categorizeEntry(entry);
        groups[type].push({
            ...entry,
            _entryType: type,
        });
    }

    return groups;
}

// ═══════════════════════════════════════════════════
// Description Splitter — Tách description theo sections
// ═══════════════════════════════════════════════════

/**
 * Tách description text theo section headers 【...】
 */
function splitDescriptionSections(description) {
    if (!description) return [];

    const sections = [];
    // Split by 【section_name】
    const parts = description.split(/【([^】]+)】/);

    for (let i = 1; i < parts.length; i += 2) {
        const name = parts[i].trim();
        const content = (parts[i + 1] || '').trim();
        if (content) {
            sections.push({ name, content });
        }
    }

    // Nếu không có section headers → trả nguyên description
    if (sections.length === 0 && description.trim()) {
        sections.push({ name: 'Mô tả', content: description.trim() });
    }

    return sections;
}

// ═══════════════════════════════════════════════════
// Macro Cleaner — Dọn dẹp các macro placeholder
// ═══════════════════════════════════════════════════

function cleanMacros(text) {
    if (!text) return '';
    return text
        .replace(/\{\{char\}\}/gi, '{{nhân vật chính}}')
        .replace(/\{\{user\}\}/gi, '{{người chơi}}')
        .replace(/\{\{chat\}\}/gi, '{{cuộc hội thoại}}')
        .replace(/<START>/gi, '')
        .trim();
}

// ═══════════════════════════════════════════════════
// Main: Build Story from Card
// ═══════════════════════════════════════════════════

/**
 * Chuyển đổi Character Card data thành story object
 * tương thích với StoryContext.importStory()
 * @param {Object} card Raw character card JSON (V1/V2/V3)
 * @param {string} [avatarUrl] URL ảnh card (nếu import từ PNG)
 * @returns {Object} Story object ready for importStory()
 */
export function buildStoryFromCard(card, avatarUrl = null) {
    const d = card.data || card;
    const name = d.name || card.name || card.char_name || 'Card Import';

    // === 1. Parse description sections ===
    const descSections = splitDescriptionSections(d.description || card.description || '');

    // === 2. Categorize character_book entries ===
    const rawEntries = d.character_book?.entries || [];
    const groups = categorizeAllEntries(rawEntries);

    // === 3. Build database collections ===

    // --- Characters ---
    const characters = [];

    // Entries phân loại là CHARACTER
    for (const entry of groups[ENTRY_TYPE.CHARACTER]) {
        characters.push({
            id: Utils.generateId(),
            name: entry.comment || 'Nhân vật',
            description: cleanMacros(entry.content || ''),
            notes: `[Nhập từ Card] ${entry.comment || ''}`,
            keywords: (entry.keys || []).join(', '),
            role: '',
            personality: '',
            background: '',
            appearance: '',
        });
    }

    // Gắn affection stages vào nhân vật tương ứng
    for (const entry of groups[ENTRY_TYPE.AFFECTION]) {
        // Tìm tên nhân vật từ comment (VD: "Dực_Tuyết_Giai_Đoạn01...")
        const charName = (entry.comment || '').split('_Giai_Đoạn')[0]
            .split('_Bộ_Điều')[0]
            .replace(/_/g, ' ').trim();

        let existingChar = characters.find(c =>
            c.name.toLowerCase().includes(charName.toLowerCase()) ||
            charName.toLowerCase().includes(c.name.toLowerCase())
        );

        if (existingChar) {
            existingChar.notes += `\n\n--- ${entry.comment || 'Giai đoạn'} ---\n${cleanMacros(entry.content || '')}`;
        } else {
            // Tạo nhân vật mới nếu chưa có
            characters.push({
                id: Utils.generateId(),
                name: charName || entry.comment || 'Nhân vật',
                description: '',
                notes: `[Giai đoạn cảm xúc]\n${cleanMacros(entry.content || '')}`,
                keywords: (entry.keys || []).join(', '),
                role: '',
                personality: '',
                background: '',
                appearance: '',
            });
        }
    }

    // --- Settings (World/Locations) ---
    const settings = [];

    // Description sections → settings
    for (const section of descSections) {
        settings.push({
            id: Utils.generateId(),
            name: section.name,
            description: cleanMacros(section.content),
            keywords: '',
            notes: '[Từ mô tả Card]',
        });
    }

    // Entries WORLD → settings
    for (const entry of groups[ENTRY_TYPE.WORLD]) {
        settings.push({
            id: Utils.generateId(),
            name: (entry.comment || 'Vùng miền').replace(/_/g, ' '),
            description: cleanMacros(entry.content || ''),
            keywords: (entry.keys || []).join(', '),
            notes: `[Vùng miền] ${entry.enabled ? '✅' : '⬜'}`,
        });
    }

    // Entries LORE → settings
    for (const entry of groups[ENTRY_TYPE.LORE]) {
        settings.push({
            id: Utils.generateId(),
            name: (entry.comment || 'Lore').replace(/_/g, ' '),
            description: cleanMacros(entry.content || ''),
            keywords: (entry.keys || []).join(', '),
            notes: `[Kiến thức] ${entry.enabled ? '✅' : '⬜'}`,
        });
    }

    // --- MetaRules (Game Systems, Status, Controllers, Variables) ---
    const metaRules = [];

    // Game Systems
    for (const entry of groups[ENTRY_TYPE.GAME_SYSTEM]) {
        metaRules.push({
            id: Utils.generateId(),
            name: `🎮 ${(entry.comment || 'Hệ thống').replace(/_/g, ' ')}`,
            description: cleanMacros(entry.content || ''),
            keywords: (entry.keys || []).join(', '),
            notes: `[Hệ thống Game] Position: ${entry.position === 0 || entry.position === 'before_char' ? 'Trước' : 'Sau'} | ${entry.enabled ? '✅ Bật' : '⬜ Tắt'}`,
            _type: 'game_system',
            _enabled: entry.enabled !== false,
            _position: entry.position,
        });
    }

    // Status Bars / Effects
    for (const entry of groups[ENTRY_TYPE.STATUS_BAR]) {
        metaRules.push({
            id: Utils.generateId(),
            name: `📊 ${(entry.comment || 'Trạng thái').replace(/_/g, ' ')}`,
            description: cleanMacros(entry.content || ''),
            keywords: (entry.keys || []).join(', '),
            notes: `[Trạng thái] ${entry.enabled ? '✅ Bật' : '⬜ Tắt'}`,
            _type: 'status_bar',
            _enabled: entry.enabled !== false,
            _position: entry.position,
        });
    }

    // Controllers (JS scripts — lưu nguyên)
    for (const entry of groups[ENTRY_TYPE.CONTROLLER]) {
        metaRules.push({
            id: Utils.generateId(),
            name: `⚙️ ${(entry.comment || 'Controller').replace(/_/g, ' ')}`,
            description: entry.content || '', // Giữ nguyên, không clean macro
            keywords: (entry.keys || []).join(', '),
            notes: `[Controller/Script] ⚠️ Chứa code xử lý — lưu nguyên để tham khảo`,
            _type: 'controller',
            _enabled: entry.enabled !== false,
            _position: entry.position,
        });
    }

    // Variables
    for (const entry of groups[ENTRY_TYPE.VARIABLE]) {
        metaRules.push({
            id: Utils.generateId(),
            name: `🔢 ${(entry.comment || 'Biến số').replace(/_/g, ' ')}`,
            description: entry.content || '', // Giữ nguyên
            keywords: (entry.keys || []).join(', '),
            notes: `[Hệ thống biến số] ⚠️ Chứa logic cập nhật biến — lưu nguyên để tham khảo`,
            _type: 'variable',
            _enabled: entry.enabled !== false,
            _position: entry.position,
        });
    }

    // Interaction rules
    for (const entry of groups[ENTRY_TYPE.INTERACTION]) {
        metaRules.push({
            id: Utils.generateId(),
            name: `💬 ${(entry.comment || 'Tương tác').replace(/_/g, ' ')}`,
            description: cleanMacros(entry.content || ''),
            keywords: (entry.keys || []).join(', '),
            notes: `[Quy tắc tương tác]`,
            _type: 'interaction',
            _enabled: entry.enabled !== false,
        });
    }

    // Optional/DLC
    for (const entry of groups[ENTRY_TYPE.OPTIONAL]) {
        metaRules.push({
            id: Utils.generateId(),
            name: `🎁 ${(entry.comment || 'Tùy chọn').replace(/_/g, ' ')}`,
            description: cleanMacros(entry.content || ''),
            keywords: (entry.keys || []).join(', '),
            notes: `[DLC/Tùy chọn] ⬜ Tắt mặc định — bật khi cần`,
            _type: 'optional',
            _enabled: false,
        });
    }

    // --- Regex Scripts ---
    const regexScripts = (card.regex_scripts || []).map((r, i) => ({
        id: Utils.generateId(),
        name: r.scriptName || `Regex ${i + 1}`,
        findRegex: r.findRegex || '',
        replaceString: r.replaceString || '',
        trimStrings: r.trimStrings || [],
        placement: r.placement || [],
        disabled: r.disabled || false,
        markdownOnly: r.markdownOnly || false,
        promptOnly: r.promptOnly || false,
        runOnEdit: r.runOnEdit || false,
        substituteRegex: r.substituteRegex || false,
        _raw: r, // Giữ nguyên object gốc
    }));

    // --- Build first chapter content ---
    const firstMes = cleanMacros(d.first_mes || card.first_mes || '');

    // --- References (message examples) ---
    const references = [];
    const mesExample = d.mes_example || card.mes_example || '';
    if (mesExample) {
        references.push({
            id: Utils.generateId(),
            name: 'Ví dụ hội thoại (mes_example)',
            content: cleanMacros(mesExample),
        });
    }

    // --- System prompt / Post-history ---
    const systemPrompt = cleanMacros(d.system_prompt || '');
    const postHistory = cleanMacros(d.post_history_instructions || '');
    const creatorNotes = cleanMacros(d.creator_notes || d.creatorcomment || card.creatorcomment || '');

    // --- Depth prompt ---
    const depthPrompt = d.extensions?.depth_prompt || null;

    // --- World name ---
    const worldName = d.extensions?.world || '';

    // === 4. Assemble story object ===
    const story = {
        title: name,
        genre: 'other',
        genres: Array.isArray(d.tags) && d.tags.length > 0 ? d.tags : ['other'],
        description: descSections.length > 0
            ? descSections.map(s => `【${s.name}】\n${s.content}`).join('\n\n').substring(0, 2000)
            : (d.description || '').substring(0, 2000),

        // World fields — extract from description sections if possible
        worldHistory: descSections.find(s =>
            s.name.includes('lịch sử') || s.name.includes('niên biểu'))?.content || '',
        worldRules: descSections.find(s =>
            s.name.includes('quy tắc') || s.name.includes('luật'))?.content || '',
        factionsRaces: descSections.find(s =>
            s.name.includes('phe phái') || s.name.includes('chủng tộc') ||
            s.name.includes('vương quốc') || s.name.includes('lãnh chúa'))?.content || '',
        economyLife: descSections.find(s =>
            s.name.includes('kinh tế') || s.name.includes('sinh hoạt'))?.content || '',

        // Plot
        content: firstMes,
        synopsis: creatorNotes || `Nhập từ Card: ${name}`,

        // AI Rules
        prohibitions: systemPrompt,
        globalDirective: postHistory,
        depthPrompt: depthPrompt,
        regexScripts: regexScripts,
        worldInfoName: worldName,

        // Flags
        allowNSFW: true,

        // Cover image
        coverImage: avatarUrl || null,

        // Database
        database: {
            characters,
            settings,
            metaRules,
            references,
            timeline: [],
            plots: [],
            chapters: firstMes ? [{
                id: Utils.generateId(),
                title: 'Mở đầu',
                content: firstMes,
                summary: `Lời mở đầu từ Card "${name}"`,
                outline: '',
                order: 1,
            }] : [],
            scenes: [],
            abilities: [],
            items: [],
            organizations: [],
            quests: [],
        },

        // Import metadata
        _cardImport: {
            cardName: name,
            cardSpec: card.spec || 'v1',
            cardSpecVersion: card.spec_version || '',
            totalEntries: rawEntries.length,
            entryCounts: {
                world: groups[ENTRY_TYPE.WORLD].length,
                character: groups[ENTRY_TYPE.CHARACTER].length,
                game_system: groups[ENTRY_TYPE.GAME_SYSTEM].length,
                status_bar: groups[ENTRY_TYPE.STATUS_BAR].length,
                controller: groups[ENTRY_TYPE.CONTROLLER].length,
                variable: groups[ENTRY_TYPE.VARIABLE].length,
                affection: groups[ENTRY_TYPE.AFFECTION].length,
                lore: groups[ENTRY_TYPE.LORE].length,
                interaction: groups[ENTRY_TYPE.INTERACTION].length,
                optional: groups[ENTRY_TYPE.OPTIONAL].length,
            },
            regexScriptsCount: regexScripts.length,
            hasDepthPrompt: !!depthPrompt?.prompt,
            importedAt: new Date().toISOString(),
        },
    };

    return story;
}

// ═══════════════════════════════════════════════════
// Main Export: Import Card as Story
// ═══════════════════════════════════════════════════

/**
 * Nhập file PNG hoặc JSON character card → trả về story object.
 * Caller sẽ gọi importStory() từ StoryContext.
 * @param {File} file File PNG hoặc JSON
 * @returns {Promise<{story: Object, summary: string}>}
 */
export async function importCardAsStory(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    const isPNG = ext === 'png' || file.type === 'image/png';

    let card;
    let avatarUrl = null;

    if (isPNG) {
        // Trích xuất metadata từ PNG
        card = await extractCharaFromPNG(file);
        avatarUrl = URL.createObjectURL(file);
    } else {
        // Parse JSON
        const text = await file.text();
        card = JSON.parse(text);
    }

    // Handle V2/V3 format detection
    if (!card.data && !card.spec) {
        // Có thể là V1 hoặc raw format
        if (card.char_name || card.description) {
            // It's V1 — wrap it
            card = { data: card, spec: 'chara_card_v1' };
        }
    }

    const story = buildStoryFromCard(card, avatarUrl);

    // Build summary
    const c = story._cardImport;
    const summaryParts = [];
    summaryParts.push(`📖 "${story.title}"`);
    if (c.totalEntries > 0) summaryParts.push(`📚 ${c.totalEntries} entries`);
    if (story.database.characters.length > 0) summaryParts.push(`👤 ${story.database.characters.length} nhân vật`);
    if (story.database.settings.length > 0) summaryParts.push(`🌍 ${story.database.settings.length} bối cảnh`);
    if (story.database.metaRules.length > 0) summaryParts.push(`🎮 ${story.database.metaRules.length} quy tắc/hệ thống`);
    if (c.regexScriptsCount > 0) summaryParts.push(`🔧 ${c.regexScriptsCount} regex scripts`);
    if (story.database.references.length > 0) summaryParts.push(`📝 ${story.database.references.length} tham khảo`);

    return {
        story,
        summary: summaryParts.join('\n'),
    };
}
