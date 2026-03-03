// ================================================
// Roleplay Themes — Hệ thống theme động theo card
// ================================================
// Tự động phát hiện phong cách từ card tags/description
// và áp dụng bảng màu CSS tương ứng.

// ═══════════════════════════════════════════════════
// Theme Presets
// ═══════════════════════════════════════════════════

export const THEME_IDS = {
    DEFAULT: 'default',
    WUXIA: 'wuxia',
    SCIFI: 'scifi',
    ROMANCE: 'romance',
    HORROR: 'horror',
    MODERN: 'modern',
};

/**
 * Mỗi theme chứa CSS variables sẽ được set trên .rp-wrapper
 */
export const THEME_PRESETS = {
    // ── Default: Tím/Indigo cổ điển ──
    [THEME_IDS.DEFAULT]: {
        name: 'Mặc định',
        emoji: '🔮',
        vars: {
            '--rp-bg': '#0b0f19',
            '--rp-overlay': 'rgba(10, 15, 25, 0.4)',
            '--rp-text': '#f1f2f6',
            '--rp-text-muted': '#9ca3af',
            '--rp-accent': '#a78bfa',
            '--rp-accent-rgb': '167, 139, 250',
            '--rp-accent-dim': 'rgba(167, 139, 250, 0.15)',
            '--rp-sidebar-bg': 'rgba(15, 18, 30, 0.6)',
            '--rp-border': 'rgba(255, 255, 255, 0.08)',
            '--rp-border-accent': 'rgba(167, 139, 250, 0.3)',
            '--rp-bubble-char': 'rgba(30, 32, 45, 0.75)',
            '--rp-bubble-user': 'rgba(124, 58, 237, 0.4)',
            '--rp-bubble-user-border': 'rgba(167, 139, 250, 0.3)',
            '--rp-input-bg': 'rgba(0, 0, 0, 0.3)',
            '--rp-input-area-bg': 'rgba(15, 18, 30, 0.7)',
            '--rp-send-bg': '#7c3aed',
            '--rp-send-hover': '#8b5cf6',
            '--rp-send-color': 'white',
            '--rp-send-glow': 'rgba(124, 58, 237, 0.4)',
            '--rp-avatar-char': 'linear-gradient(135deg, hsl(270, 60%, 45%), hsl(300, 50%, 40%))',
            '--rp-avatar-user': 'linear-gradient(135deg, hsl(200, 60%, 40%), hsl(220, 50%, 50%))',
            '--rp-avatar-border': 'rgba(167, 139, 250, 0.45)',
            '--rp-action-color': '#c4b5fd',
            '--rp-dialogue-color': '#fde047',
            '--rp-placeholder': '#6b7280',
            '--rp-typing-dot': '#a78bfa',
            '--rp-danger': '#f87171',
            '--rp-scroll-thumb': 'rgba(255, 255, 255, 0.15)',
            '--rp-chat-bg': 'rgba(10, 12, 20, 0.3)',
            '--rp-frame-border': 'rgba(167, 139, 250, 0.4)',
            '--rp-frame-glow': 'rgba(167, 139, 250, 0.25)',
            '--rp-frame-inner': 'linear-gradient(135deg, rgba(20, 22, 35, 0.8), rgba(15, 18, 30, 0.9))',
            '--rp-table-header': 'rgba(167, 139, 250, 0.15)',
            '--rp-table-header-text': '#c4b5fd',
        }
    },

    // ── Wuxia: Nâu đậm + Đỏ thẫm + Vàng kim ──
    [THEME_IDS.WUXIA]: {
        name: 'Kiếm hiệp',
        emoji: '⚔️',
        vars: {
            '--rp-bg': '#1a0e0a',
            '--rp-overlay': 'rgba(20, 12, 8, 0.4)',
            '--rp-text': '#f0e6d6',
            '--rp-text-muted': '#a89880',
            '--rp-accent': '#d4a54a',
            '--rp-accent-rgb': '212, 165, 74',
            '--rp-accent-dim': 'rgba(212, 165, 74, 0.15)',
            '--rp-sidebar-bg': 'rgba(30, 18, 12, 0.7)',
            '--rp-border': 'rgba(212, 165, 74, 0.15)',
            '--rp-border-accent': 'rgba(212, 165, 74, 0.3)',
            '--rp-bubble-char': 'rgba(42, 24, 16, 0.8)',
            '--rp-bubble-user': 'rgba(139, 26, 26, 0.45)',
            '--rp-bubble-user-border': 'rgba(180, 60, 60, 0.25)',
            '--rp-input-bg': 'rgba(0, 0, 0, 0.35)',
            '--rp-input-area-bg': 'rgba(30, 18, 12, 0.8)',
            '--rp-send-bg': 'linear-gradient(135deg, #8b1a1a, #a52020)',
            '--rp-send-hover': 'linear-gradient(135deg, #a52020, #c02828)',
            '--rp-send-color': '#ffd700',
            '--rp-send-glow': 'rgba(139, 26, 26, 0.4)',
            '--rp-avatar-char': 'linear-gradient(135deg, #8b1a1a, #6b2020)',
            '--rp-avatar-user': 'linear-gradient(135deg, #3a2218, #2a1810)',
            '--rp-avatar-border': 'rgba(212, 165, 74, 0.45)',
            '--rp-action-color': '#e8c868',
            '--rp-dialogue-color': '#ffd700',
            '--rp-placeholder': '#7a6a58',
            '--rp-typing-dot': '#d4a54a',
            '--rp-danger': '#e06060',
            '--rp-scroll-thumb': 'rgba(212, 165, 74, 0.2)',
            '--rp-chat-bg': 'rgba(18, 10, 6, 0.35)',
            '--rp-frame-border': '#d4a54a',
            '--rp-frame-glow': 'rgba(212, 165, 74, 0.25)',
            '--rp-frame-inner': 'linear-gradient(135deg, rgba(42, 24, 16, 0.8), rgba(30, 18, 12, 0.9))',
            '--rp-table-header': 'rgba(212, 165, 74, 0.12)',
            '--rp-table-header-text': '#e8c868',
        }
    },

    // ── Sci-Fi: Cyan/Neon + Xám kim loại ──
    [THEME_IDS.SCIFI]: {
        name: 'Khoa học viễn tưởng',
        emoji: '🚀',
        vars: {
            '--rp-bg': '#0a0f14',
            '--rp-overlay': 'rgba(8, 14, 20, 0.45)',
            '--rp-text': '#d0e8f0',
            '--rp-text-muted': '#6a8a9a',
            '--rp-accent': '#00d4ff',
            '--rp-accent-rgb': '0, 212, 255',
            '--rp-accent-dim': 'rgba(0, 212, 255, 0.12)',
            '--rp-sidebar-bg': 'rgba(10, 18, 28, 0.75)',
            '--rp-border': 'rgba(0, 212, 255, 0.12)',
            '--rp-border-accent': 'rgba(0, 212, 255, 0.3)',
            '--rp-bubble-char': 'rgba(14, 24, 36, 0.8)',
            '--rp-bubble-user': 'rgba(0, 80, 120, 0.4)',
            '--rp-bubble-user-border': 'rgba(0, 180, 220, 0.25)',
            '--rp-input-bg': 'rgba(0, 0, 0, 0.4)',
            '--rp-input-area-bg': 'rgba(10, 18, 28, 0.8)',
            '--rp-send-bg': 'linear-gradient(135deg, #006080, #0090b0)',
            '--rp-send-hover': 'linear-gradient(135deg, #0090b0, #00b8e0)',
            '--rp-send-color': '#00ffff',
            '--rp-send-glow': 'rgba(0, 212, 255, 0.35)',
            '--rp-avatar-char': 'linear-gradient(135deg, #0a3050, #104060)',
            '--rp-avatar-user': 'linear-gradient(135deg, #1a2a3a, #0a1a2a)',
            '--rp-avatar-border': 'rgba(0, 212, 255, 0.4)',
            '--rp-action-color': '#60d0f0',
            '--rp-dialogue-color': '#80ffee',
            '--rp-placeholder': '#4a6a7a',
            '--rp-typing-dot': '#00d4ff',
            '--rp-danger': '#ff5060',
            '--rp-scroll-thumb': 'rgba(0, 212, 255, 0.2)',
            '--rp-chat-bg': 'rgba(6, 10, 16, 0.35)',
            '--rp-frame-border': 'rgba(0, 212, 255, 0.4)',
            '--rp-frame-glow': 'rgba(0, 212, 255, 0.2)',
            '--rp-frame-inner': 'linear-gradient(135deg, rgba(10, 20, 35, 0.8), rgba(8, 16, 28, 0.9))',
            '--rp-table-header': 'rgba(0, 212, 255, 0.1)',
            '--rp-table-header-text': '#60d0f0',
        }
    },

    // ── Romance: Hồng pastel + Tím nhạt ──
    [THEME_IDS.ROMANCE]: {
        name: 'Lãng mạn',
        emoji: '💕',
        vars: {
            '--rp-bg': '#1a0f18',
            '--rp-overlay': 'rgba(20, 12, 20, 0.4)',
            '--rp-text': '#f4e8f0',
            '--rp-text-muted': '#a888a0',
            '--rp-accent': '#f080b0',
            '--rp-accent-rgb': '240, 128, 176',
            '--rp-accent-dim': 'rgba(240, 128, 176, 0.15)',
            '--rp-sidebar-bg': 'rgba(28, 14, 26, 0.7)',
            '--rp-border': 'rgba(240, 128, 176, 0.12)',
            '--rp-border-accent': 'rgba(240, 128, 176, 0.3)',
            '--rp-bubble-char': 'rgba(36, 20, 32, 0.8)',
            '--rp-bubble-user': 'rgba(160, 50, 100, 0.35)',
            '--rp-bubble-user-border': 'rgba(220, 100, 160, 0.25)',
            '--rp-input-bg': 'rgba(0, 0, 0, 0.3)',
            '--rp-input-area-bg': 'rgba(28, 14, 26, 0.8)',
            '--rp-send-bg': 'linear-gradient(135deg, #c04080, #e05090)',
            '--rp-send-hover': 'linear-gradient(135deg, #e05090, #f060a0)',
            '--rp-send-color': 'white',
            '--rp-send-glow': 'rgba(220, 80, 140, 0.35)',
            '--rp-avatar-char': 'linear-gradient(135deg, #8a2060, #602050)',
            '--rp-avatar-user': 'linear-gradient(135deg, #3a1a30, #2a1228)',
            '--rp-avatar-border': 'rgba(240, 128, 176, 0.45)',
            '--rp-action-color': '#f0a0c8',
            '--rp-dialogue-color': '#ffb8d8',
            '--rp-placeholder': '#785068',
            '--rp-typing-dot': '#f080b0',
            '--rp-danger': '#f06060',
            '--rp-scroll-thumb': 'rgba(240, 128, 176, 0.2)',
            '--rp-chat-bg': 'rgba(16, 8, 14, 0.35)',
            '--rp-frame-border': 'rgba(240, 128, 176, 0.4)',
            '--rp-frame-glow': 'rgba(240, 128, 176, 0.2)',
            '--rp-frame-inner': 'linear-gradient(135deg, rgba(36, 18, 32, 0.8), rgba(28, 14, 26, 0.9))',
            '--rp-table-header': 'rgba(240, 128, 176, 0.1)',
            '--rp-table-header-text': '#f0a0c8',
        }
    },

    // ── Horror: Đen kịt + Đỏ máu ──
    [THEME_IDS.HORROR]: {
        name: 'Kinh dị',
        emoji: '🩸',
        vars: {
            '--rp-bg': '#0a0808',
            '--rp-overlay': 'rgba(8, 6, 6, 0.5)',
            '--rp-text': '#d8d0cc',
            '--rp-text-muted': '#706060',
            '--rp-accent': '#cc2020',
            '--rp-accent-rgb': '204, 32, 32',
            '--rp-accent-dim': 'rgba(204, 32, 32, 0.12)',
            '--rp-sidebar-bg': 'rgba(14, 10, 10, 0.8)',
            '--rp-border': 'rgba(204, 32, 32, 0.1)',
            '--rp-border-accent': 'rgba(204, 32, 32, 0.3)',
            '--rp-bubble-char': 'rgba(20, 14, 14, 0.85)',
            '--rp-bubble-user': 'rgba(100, 10, 10, 0.4)',
            '--rp-bubble-user-border': 'rgba(160, 30, 30, 0.25)',
            '--rp-input-bg': 'rgba(0, 0, 0, 0.45)',
            '--rp-input-area-bg': 'rgba(14, 10, 10, 0.85)',
            '--rp-send-bg': 'linear-gradient(135deg, #8a0000, #b01010)',
            '--rp-send-hover': 'linear-gradient(135deg, #b01010, #d02020)',
            '--rp-send-color': '#ffcccc',
            '--rp-send-glow': 'rgba(180, 20, 20, 0.4)',
            '--rp-avatar-char': 'linear-gradient(135deg, #3a0808, #500a0a)',
            '--rp-avatar-user': 'linear-gradient(135deg, #1a1010, #0e0808)',
            '--rp-avatar-border': 'rgba(204, 32, 32, 0.35)',
            '--rp-action-color': '#cc8888',
            '--rp-dialogue-color': '#ff9090',
            '--rp-placeholder': '#504040',
            '--rp-typing-dot': '#cc2020',
            '--rp-danger': '#ff4040',
            '--rp-scroll-thumb': 'rgba(204, 32, 32, 0.2)',
            '--rp-chat-bg': 'rgba(6, 4, 4, 0.4)',
            '--rp-frame-border': 'rgba(204, 32, 32, 0.35)',
            '--rp-frame-glow': 'rgba(204, 32, 32, 0.15)',
            '--rp-frame-inner': 'linear-gradient(135deg, rgba(20, 12, 12, 0.8), rgba(14, 10, 10, 0.9))',
            '--rp-table-header': 'rgba(204, 32, 32, 0.1)',
            '--rp-table-header-text': '#cc8888',
        }
    },

    // ── Modern: Xanh dương thanh lịch ──
    [THEME_IDS.MODERN]: {
        name: 'Hiện đại',
        emoji: '🏙️',
        vars: {
            '--rp-bg': '#0e1218',
            '--rp-overlay': 'rgba(12, 16, 22, 0.4)',
            '--rp-text': '#e8ecf0',
            '--rp-text-muted': '#7a8a98',
            '--rp-accent': '#4a90d9',
            '--rp-accent-rgb': '74, 144, 217',
            '--rp-accent-dim': 'rgba(74, 144, 217, 0.12)',
            '--rp-sidebar-bg': 'rgba(16, 22, 30, 0.7)',
            '--rp-border': 'rgba(74, 144, 217, 0.1)',
            '--rp-border-accent': 'rgba(74, 144, 217, 0.3)',
            '--rp-bubble-char': 'rgba(20, 28, 38, 0.8)',
            '--rp-bubble-user': 'rgba(40, 80, 140, 0.4)',
            '--rp-bubble-user-border': 'rgba(74, 144, 217, 0.25)',
            '--rp-input-bg': 'rgba(0, 0, 0, 0.3)',
            '--rp-input-area-bg': 'rgba(16, 22, 30, 0.8)',
            '--rp-send-bg': 'linear-gradient(135deg, #2a6ab0, #3a80d0)',
            '--rp-send-hover': 'linear-gradient(135deg, #3a80d0, #4a90e0)',
            '--rp-send-color': 'white',
            '--rp-send-glow': 'rgba(74, 144, 217, 0.35)',
            '--rp-avatar-char': 'linear-gradient(135deg, #1a3050, #204060)',
            '--rp-avatar-user': 'linear-gradient(135deg, #182838, #101e2e)',
            '--rp-avatar-border': 'rgba(74, 144, 217, 0.4)',
            '--rp-action-color': '#80b0e0',
            '--rp-dialogue-color': '#a8d0ff',
            '--rp-placeholder': '#506878',
            '--rp-typing-dot': '#4a90d9',
            '--rp-danger': '#e05050',
            '--rp-scroll-thumb': 'rgba(74, 144, 217, 0.2)',
            '--rp-chat-bg': 'rgba(10, 14, 20, 0.35)',
            '--rp-frame-border': 'rgba(74, 144, 217, 0.35)',
            '--rp-frame-glow': 'rgba(74, 144, 217, 0.2)',
            '--rp-frame-inner': 'linear-gradient(135deg, rgba(18, 26, 36, 0.8), rgba(14, 20, 30, 0.9))',
            '--rp-table-header': 'rgba(74, 144, 217, 0.1)',
            '--rp-table-header-text': '#80b0e0',
        }
    },
};

// ═══════════════════════════════════════════════════
// Theme Detection — Tự phát hiện từ card
// ═══════════════════════════════════════════════════

/**
 * Từ khóa phân loại cho từng theme.
 * Tìm trong: tags, genres, description, scenario, personality.
 */
const THEME_KEYWORDS = {
    [THEME_IDS.WUXIA]: [
        // Tiếng Việt
        'kiếm hiệp', 'tiên hiệp', 'tu tiên', 'huyền huyễn', 'cổ đại',
        'cung đình', 'võ lâm', 'giang hồ', 'tu chân', 'tiên giới',
        'cổ trang', 'hoàng đế', 'phong kiến', 'chinh chiến', 'tam quốc',
        'thần tiên', 'ma đạo', 'đạo sĩ', 'linh khí', 'tu luyện',
        'đan dược', 'pháp bảo', 'tiên nhân', 'hồng hoang', 'đông phương',
        'long', 'phượng', 'kiếm', 'võ', 'đạo',
        // English
        'wuxia', 'xianxia', 'cultivation', 'martial arts', 'ancient china',
        'imperial', 'dynasty', 'chinese fantasy', 'palace', 'mythology',
        'eastern fantasy', 'murim', 'cultivator',
        // Chinese
        '武侠', '仙侠', '修仙', '玄幻', '古代', '宫廷', '修真',
    ],
    [THEME_IDS.SCIFI]: [
        'khoa học viễn tưởng', 'sci-fi', 'science fiction', 'cyberpunk',
        'tương lai', 'vũ trụ', 'không gian', 'robot', 'ai', 'android',
        'dystopia', 'utopia', 'post-apocalyptic', 'mecha', 'space opera',
        'alien', 'hành tinh', 'phi thuyền', 'spaceship', 'technology',
        'futuristic', 'cybernetic', 'neon', 'matrix', 'virtual reality',
        'starship', 'galaxy', 'interstellar', 'steampunk', 'solarpunk',
        '科幻', 'サイバー',
    ],
    [THEME_IDS.ROMANCE]: [
        'lãng mạn', 'tình cảm', 'romance', 'harem', 'otome', 'dating',
        'tình yêu', 'crush', 'waifu', 'boyfriend', 'girlfriend',
        'yêu đương', 'hẹn hò', 'kết hôn', 'ngọt ngào', 'school life',
        'slice of life', 'idol', 'love', 'romantic', 'cupid',
        'valentines', 'confession', 'flirting', 'yandere', 'tsundere',
        'senpai', 'kouhai', 'bishoujo', 'bishounen', 'shojo',
        '恋愛', 'ラブ',
    ],
    [THEME_IDS.HORROR]: [
        'kinh dị', 'horror', 'creepy', 'ma quỷ', 'ác quỷ', 'zombie',
        'vampire', 'werewolf', 'undead', 'dark fantasy', 'supernatural',
        'ghost', 'haunted', 'demon', 'eldritch', 'cosmic horror',
        'lovecraft', 'survival horror', 'gore', 'thriller', 'psycho',
        'nightmare', 'cthulhu', 'paranormal', 'occult', 'witchcraft',
        'ma cà rồng', 'hồn ma', 'xác sống', 'ám ảnh', 'bóng tối',
        'ホラー', '恐怖',
    ],
    [THEME_IDS.MODERN]: [
        'hiện đại', 'modern', 'contemporary', 'urban', 'realistic',
        'thành phố', 'đô thị', 'city', 'office', 'corporate',
        'detective', 'crime', 'thám tử', 'hình sự', 'mafia',
        'military', 'quân đội', 'spy', 'espionage', 'action',
        'adventure', 'phiêu lưu', 'university', 'academy',
        'superhero', 'siêu anh hùng',
    ],
};

/**
 * Phát hiện theme phù hợp nhất từ story metadata.
 * @param {Object} story Story object (có genres, genre, description, scenario, tags...)
 * @returns {string} Theme ID (ví dụ: 'wuxia', 'scifi', ...)
 */
export function detectThemeFromStory(story) {
    if (!story) return THEME_IDS.DEFAULT;

    // Nếu story đã có rpTheme được set thủ công
    if (story.rpTheme && story.rpTheme !== 'auto' && THEME_PRESETS[story.rpTheme]) {
        return story.rpTheme;
    }

    // Gom text để phân tích
    const textParts = [];

    // Tags / genres
    if (Array.isArray(story.genres)) textParts.push(story.genres.join(' '));
    if (story.genre) textParts.push(story.genre);

    // Card tags (qua database characters keywords)
    const mainChar = story.database?.characters?.[0];
    if (mainChar?.keywords) textParts.push(mainChar.keywords);

    // Description + scenario
    if (story.description) textParts.push(story.description.substring(0, 1000));
    if (story.scenario) textParts.push(story.scenario.substring(0, 500));
    if (story.personality) textParts.push(story.personality.substring(0, 500));

    // Creator notes
    if (story.synopsis) textParts.push(story.synopsis.substring(0, 500));

    const combinedText = textParts.join(' ').toLowerCase();

    if (!combinedText.trim()) return THEME_IDS.DEFAULT;

    // Đếm số keyword match cho mỗi theme
    const scores = {};
    for (const [themeId, keywords] of Object.entries(THEME_KEYWORDS)) {
        scores[themeId] = 0;
        for (const keyword of keywords) {
            if (combinedText.includes(keyword.toLowerCase())) {
                // Keyword dài hơn = trọng số cao hơn (chính xác hơn)
                scores[themeId] += keyword.length > 5 ? 2 : 1;
            }
        }
    }

    // Tìm theme có điểm cao nhất
    let bestTheme = THEME_IDS.DEFAULT;
    let bestScore = 0;
    for (const [themeId, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestTheme = themeId;
        }
    }

    // Cần ít nhất 2 điểm để chắc chắn (tránh false positive)
    return bestScore >= 2 ? bestTheme : THEME_IDS.DEFAULT;
}

/**
 * Lấy CSS variables object cho theme.
 * @param {string} themeId
 * @returns {Object} CSS variables { '--rp-bg': '#xxx', ... }
 */
export function getThemeVars(themeId) {
    const theme = THEME_PRESETS[themeId] || THEME_PRESETS[THEME_IDS.DEFAULT];
    return theme.vars;
}

/**
 * Lấy tên theme hiển thị.
 * @param {string} themeId
 * @returns {string}
 */
export function getThemeName(themeId) {
    const theme = THEME_PRESETS[themeId] || THEME_PRESETS[THEME_IDS.DEFAULT];
    return `${theme.emoji} ${theme.name}`;
}

/**
 * Trả về tất cả themes (cho UI chọn thủ công).
 */
export function getAllThemes() {
    return Object.entries(THEME_PRESETS).map(([id, theme]) => ({
        id,
        name: theme.name,
        emoji: theme.emoji,
    }));
}
