// ================================================
// Post-Processing Service — Vietnamese Text Cleanup
// Inspired by SillyTavern's regex engine
// ================================================
import { applyGenreToneRules } from './genreToneRules';

/**
 * Default rules for Vietnamese text post-processing.
 * Each rule: { id, name, enabled, find (regex), replace (string) }
 */
const DEFAULT_RULES = [
    // === Loại bỏ OOC / meta text ===
    {
        id: 'remove_ooc_brackets',
        name: 'Loại bỏ OOC brackets',
        enabled: true,
        find: /\[(?:OOC|Note|Author'?s?\s*note|Ghi chú|TL|A\/N)[^\]]*\]/gi,
        replace: ''
    },
    {
        id: 'remove_ooc_parens',
        name: 'Loại bỏ OOC parentheses',
        enabled: true,
        find: /\((?:OOC|Note|Author'?s?\s*note|Ghi chú|TL|A\/N)[^)]*\)/gi,
        replace: ''
    },
    {
        id: 'remove_meta_comments',
        name: 'Loại bỏ meta comments từ AI',
        enabled: true,
        find: /^\s*(?:\*{1,3}|_{1,3})?\s*(?:Tôi (?:xin lỗi|hiểu|sẽ)|Dưới đây là|Đây là|Lưu ý:|Ghi chú:|Chú thích:).*$/gm,
        replace: ''
    },

    // === Chuẩn hoá dấu câu tiếng Việt ===
    {
        id: 'normalize_ellipsis',
        name: 'Chuẩn hoá dấu ba chấm',
        enabled: true,
        find: /\.{3,}/g,
        replace: '…'
    },
    {
        id: 'normalize_quotes_double',
        name: 'Chuẩn hoá dấu ngoặc kép',
        enabled: true,
        find: /(?:^|(?<=\s))[""]([^""]+)[""](?=$|\s|[.,!?;:…])/g,
        replace: '\u201C$1\u201D'
    },
    {
        id: 'normalize_dash_dialogue',
        name: 'Chuẩn hoá gạch ngang đối thoại',
        enabled: true,
        find: /^(\s*)[-–]\s+/gm,
        replace: '$1— '
    },

    // === Dọn dẹp formatting ===
    {
        id: 'remove_excessive_newlines',
        name: 'Giảm xuống dòng thừa',
        enabled: true,
        find: /\n{4,}/g,
        replace: '\n\n\n'
    },
    {
        id: 'trim_trailing_spaces',
        name: 'Xoá khoảng trắng thừa cuối dòng',
        enabled: true,
        find: /[^\S\n]+$/gm,
        replace: ''
    },
    {
        id: 'remove_leading_ai_prefix',
        name: 'Loại bỏ prefix AI thường thêm',
        enabled: true,
        find: /^(?:Được rồi,?\s*)?(?:Dựa trên (?:ngữ cảnh|dữ liệu|thông tin)[^.]*\.\s*)?/i,
        replace: ''
    },

    // === Sửa lỗi phổ biến ===
    {
        id: 'fix_double_punctuation',
        name: 'Sửa dấu câu kép',
        enabled: true,
        find: /([.!?])\1+/g,
        replace: '$1'
    },
    {
        id: 'fix_space_before_punctuation',
        name: 'Sửa khoảng trắng trước dấu câu',
        enabled: true,
        find: /\s+([.,!?;:…])/g,
        replace: '$1'
    },
];

// In-memory rule overrides (user can toggle on/off)
let _ruleOverrides = {};

/**
 * Set rule enabled/disabled override.
 * @param {string} ruleId
 * @param {boolean} enabled
 */
export function setRuleEnabled(ruleId, enabled) {
    _ruleOverrides[ruleId] = enabled;
}

/**
 * Get all rules with current overrides applied.
 * @returns {Array} Rules array
 */
export function getRules() {
    return DEFAULT_RULES.map(rule => ({
        ...rule,
        enabled: _ruleOverrides[rule.id] !== undefined ? _ruleOverrides[rule.id] : rule.enabled
    }));
}

/**
 * Reset all overrides to defaults.
 */
export function resetRules() {
    _ruleOverrides = {};
}


/**
 * Post-process Vietnamese AI output text.
 * Applies all enabled rules in order, then genre tone enforcement if genres provided.
 * @param {string} text - Raw AI output text
 * @param {string[]} [genres] - Optional story genres for tone enforcement
 * @returns {string} Cleaned text
 */
export function postProcessVietnamese(text, genres = []) {
    if (!text || typeof text !== 'string') return text;

    let result = text;

    for (const rule of getRules()) {
        if (!rule.enabled) continue;
        try {
            result = result.replace(rule.find, rule.replace);
        } catch (e) {
            console.warn(`[PostProcess] Rule "${rule.id}" failed:`, e.message);
        }
    }

    // Genre-specific tone enforcement
    if (genres.length > 0) {
        const toneResult = applyGenreToneRules(result, genres);
        result = toneResult.text;
        if (toneResult.applied.length > 0) {
            console.log(`🎨 Tone enforcement: ${toneResult.applied.length} replacements`);
        }
    }

    // Final trim
    result = result.trim();

    return result;
}
