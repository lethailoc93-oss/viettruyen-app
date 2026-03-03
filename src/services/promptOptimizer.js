// ================================================
// Prompt Optimizer — Engine tối ưu prompt theo ngữ cảnh
// Phân tích nội dung đang viết → inject hướng dẫn phù hợp
// ================================================

import { buildDescriptorInstruction, buildCompactDescriptorInstruction, DESCRIPTOR_CATEGORIES } from './descriptorLibrary';
import { buildAuthorInstruction } from './authorStyleProfiles';

/**
 * Scene type keywords for detection.
 * Higher weight = stronger signal.
 */
const SCENE_KEYWORDS = {
    combat: {
        keywords: [
            'kiếm', 'đao', 'chiêu', 'đánh', 'chém', 'đâm', 'đấm', 'đá',
            'chiến đấu', 'tấn công', 'phòng thủ', 'né', 'chặn', 'đỡ',
            'nội lực', 'chân khí', 'linh lực', 'skill', 'attack', 'damage',
            'máu', 'thương', 'chết', 'giết', 'hạ gục', 'knocked',
            'vũ khí', 'giáp', 'khiên', 'cung', 'tên', 'đạn',
            'quái vật', 'boss', 'monster', 'raid', 'dungeon',
            'chiến trường', 'trận', 'binh', 'quân',
        ],
        descriptorCategories: ['combat'],
        weight: 1.2,
    },
    romance: {
        keywords: [
            'yêu', 'thương', 'nhớ', 'hôn', 'ôm', 'nắm tay',
            'tim đập', 'má đỏ', 'bối rối', 'ngượng', 'tình cảm',
            'đẹp', 'xinh', 'duyên dáng', 'hấp dẫn', 'quyến rũ',
            'lãng mạn', 'hẹn hò', 'tỏ tình', 'thổ lộ',
            'anh', 'em', 'chàng', 'nàng', 'tâm ý',
        ],
        descriptorCategories: ['appearance_skin', 'appearance_body', 'emotion_sadness', 'dialogue'],
        weight: 1.0,
    },
    nsfw: {
        keywords: [
            'thân mật', 'hôn sâu', 'da thịt', 'cởi', 'khỏa thân',
            'giường', 'đêm', 'rên', 'thở', 'nóng', 'ẩm ướt',
            'ngực', 'eo', 'đùi', 'môi', 'cổ', 'vai',
            'vuốt ve', 'mơn trớn', 'si mê', 'đam mê', 'dục vọng',
            'cực khoái', 'khoái cảm', 'nhục dục', 'ân ái',
        ],
        descriptorCategories: ['nsfw_sensual', 'appearance_body'],
        weight: 1.5,
    },
    emotional: {
        keywords: [
            'khóc', 'buồn', 'đau', 'mất', 'chết', 'tang', 'đám ma',
            'hối hận', 'tội lỗi', 'thương xót', 'cô đơn', 'trống vắng',
            'chia ly', 'biệt', 'nhớ', 'thương nhớ', 'tiếc nuối',
            'tức giận', 'phẫn nộ', 'căm hờn', 'thù hận',
            'sợ', 'hoảng', 'kinh hãi', 'run', 'rùng mình',
        ],
        descriptorCategories: ['emotion_anger', 'emotion_sadness', 'emotion_fear'],
        weight: 1.1,
    },
    scenery: {
        keywords: [
            'trời', 'mây', 'gió', 'mưa', 'nắng', 'tuyết', 'sương',
            'núi', 'sông', 'biển', 'rừng', 'hồ', 'thác',
            'phố', 'đường', 'nhà', 'cung điện', 'miếu', 'chùa',
            'hoa', 'cây', 'lá', 'cỏ', 'trăng', 'sao',
            'hoàng hôn', 'bình minh', 'đêm', 'sáng',
        ],
        descriptorCategories: ['scenery'],
        weight: 0.8,
    },
    dialogue: {
        keywords: [
            'nói', 'hỏi', 'đáp', 'trả lời', 'la', 'quát',
            'thì thầm', 'bàn luận', 'tranh luận', 'đàm phán',
            '"', '"', '「', '」', '\'', 'dialogue',
        ],
        descriptorCategories: ['dialogue'],
        weight: 0.7,
    },
};

/**
 * Detect scene type from recent text.
 * Scans the last ~500 chars for keyword matches.
 *
 * @param {string} text - Recent story text
 * @returns {{ sceneType: string, confidence: number, matchedCategories: string[] }}
 */
export function detectSceneType(text) {
    if (!text || text.length < 20) {
        return { sceneType: 'general', confidence: 0, matchedCategories: [] };
    }

    // Take last 500 chars for analysis
    const recentText = text.slice(-500).toLowerCase();

    const scores = {};
    let maxScore = 0;
    let maxType = 'general';

    for (const [type, config] of Object.entries(SCENE_KEYWORDS)) {
        let matchCount = 0;
        for (const kw of config.keywords) {
            // Count keyword occurrences
            const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const matches = recentText.match(regex);
            if (matches) matchCount += matches.length;
        }

        const score = matchCount * config.weight;
        scores[type] = score;

        if (score > maxScore) {
            maxScore = score;
            maxType = type;
        }
    }

    // Require minimum score threshold
    const confidence = Math.min(maxScore / 8, 1.0); // 8+ matches = 100% confidence
    if (maxScore < 2) {
        return { sceneType: 'general', confidence: 0, matchedCategories: [] };
    }

    const matchedCategories = SCENE_KEYWORDS[maxType]?.descriptorCategories || [];

    return { sceneType: maxType, confidence, matchedCategories };
}

/**
 * Build optimized descriptor instruction based on scene type.
 * Only injects categories relevant to the current scene.
 *
 * @param {string} sceneType - Detected scene type
 * @param {string[]} userCategories - User-selected categories from settings
 * @param {string[]} customAvoidList - User's custom avoid expressions
 * @param {boolean} compact - Use compact mode (for token-constrained contexts)
 * @returns {string}
 */
export function buildOptimizedDescriptors(sceneType, userCategories = [], customAvoidList = [], compact = false) {
    // Determine which categories to include
    let categories = [];

    if (userCategories.length > 0) {
        // User has explicitly selected categories → use those
        categories = [...userCategories];
    }

    // Add scene-type specific categories (auto-detected)
    const sceneConfig = SCENE_KEYWORDS[sceneType];
    if (sceneConfig?.descriptorCategories) {
        for (const cat of sceneConfig.descriptorCategories) {
            if (!categories.includes(cat)) {
                categories.push(cat);
            }
        }
    }

    // Remove duplicates
    categories = [...new Set(categories)];

    if (categories.length === 0 && customAvoidList.length === 0) return '';

    if (compact) {
        return buildCompactDescriptorInstruction(categories, customAvoidList);
    }
    return buildDescriptorInstruction(categories, customAvoidList);
}

/**
 * Main entry point: build prompt optimization based on story settings and current text.
 *
 * This function is called from:
 * 1. ragService.buildSystemInstruction() — for writing mode (full instruction)
 * 2. promptAssembler.assembleRoleplayPrompt() — for roleplay mode (compact instruction)
 *
 * @param {Object} story - Story object with settings
 * @param {string} currentText - Current text being written (for scene detection)
 * @param {Object} options
 * @param {boolean} options.compact - Use compact mode for token-constrained contexts
 * @returns {string} Instruction block ready for injection into system prompt
 */
export function buildPromptOptimization(story, currentText = '', options = {}) {
    if (!story) return '';

    const { compact = false } = options;

    const parts = [];

    // 1. Author style profile instruction
    const authorInst = buildAuthorInstruction(story);
    if (authorInst) parts.push(authorInst);

    // 2. Descriptor optimization (scene-aware)
    const userCategories = story.descriptorCategories || [];
    const customAvoidList = story.customAvoidList || [];

    // Only do scene detection if there's text to analyze
    let sceneType = 'general';
    if (currentText && currentText.length > 20) {
        const detection = detectSceneType(currentText);
        sceneType = detection.sceneType;
    }

    const descriptorInst = buildOptimizedDescriptors(
        sceneType,
        userCategories,
        customAvoidList,
        compact
    );
    if (descriptorInst) parts.push(descriptorInst);

    return parts.join('');
}
