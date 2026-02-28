// ================================================
// Genre Tone Enforcement — banned & preferred words per genre
// Applied as an additional post-processing pass
// ================================================

/**
 * Genre-specific word rules.
 * banned: words to remove/replace (overused clichés for that genre)
 * preferred: suggested replacements { from: regex, to: string }
 */
const GENRE_TONE_RULES = {
    // === Chung (tất cả thể loại) ===
    common: {
        banned: [
            { find: /(?:rất|vô cùng|cực kỳ) (?:rất|vô cùng|cực kỳ)/g, replace: 'cực kỳ', note: 'Tránh lặp tăng cấp' },
            { find: /bỗng nhiên/g, replace: 'chợt', note: 'Tránh sáo' },
            { find: /không thể tin nổi/g, replace: 'khó tin', note: 'Giảm cường điệu' },
        ],
        preferred: []
    },

    // === Wuxia / Tiên hiệp ===
    wuxia: {
        banned: [
            { find: /toàn thân chấn động/g, replace: 'rúng động', note: 'Cliché tiên hiệp' },
            { find: /linh hồn run rẩy/g, replace: 'kinh ngạc sâu sắc', note: 'Cliché tiên hiệp' },
            { find: /mắt sáng rực/g, replace: 'ánh mắt bừng lên', note: 'Mô tả sáo' },
            { find: /nghiến răng ken két/g, replace: 'cắn chặt răng', note: 'Cường điệu' },
            { find: /máu phun ra từ miệng/g, replace: 'ọc một ngụm máu', note: 'Cliché' },
            { find: /(?:hét lên|gào lên):\s*[""]?(?:ngươi|ta|mi)/gi, replace: '', note: 'Pattern dialog sáo', skip: true },
        ],
        preferred: [
            { find: /chiêu thức/g, replace: 'quyền pháp', note: 'Biến thể từ' },
        ]
    },

    // === Romance / Ngôn tình ===
    romance: {
        banned: [
            { find: /tim đập loạn nhịp/g, replace: 'tim như lỡ một nhịp', note: 'Quá dùng' },
            { find: /má đỏ bừng/g, replace: 'má ửng hồng', note: 'Nhẹ hơn' },
            { find: /hơi thở nóng bỏng/g, replace: 'hơi thở ấm', note: 'Giảm melodrama' },
            { find: /nước mắt lăn dài/g, replace: 'nước mắt lặng lẽ rơi', note: 'Tự nhiên hơn' },
            { find: /ôm chặt lấy (?:nàng|cô|hắn|anh)/g, replace: 'ôm lấy', note: 'Giảm sến' },
        ],
        preferred: []
    },

    // === Horror / Kinh dị ===
    horror: {
        banned: [
            { find: /lạnh sống lưng/g, replace: 'cảm giác rợn chạy dọc lưng', note: 'Chi tiết hơn' },
            { find: /tiếng cười ma quái/g, replace: 'tiếng cười khẽ vọng lại', note: 'Subtlety' },
        ],
        preferred: []
    },

    // === Fantasy / Huyền huyễn ===
    fantasy: {
        banned: [
            { find: /ánh sáng chói lòa/g, replace: 'luồng sáng bùng lên', note: 'Cụ thể hơn' },
            { find: /sức mạnh vô biên/g, replace: 'sức mạnh khổng lồ', note: 'Giảm cường điệu' },
        ],
        preferred: []
    },

    // === Slice of Life ===
    slice_of_life: {
        banned: [
            { find: /(?:bỗng nhiên|đột nhiên) (?:cảm thấy|nhận ra)/g, replace: 'dần nhận ra', note: 'Tự nhiên hơn' },
        ],
        preferred: []
    }
};

/**
 * Genre → tone group mapping
 */
const GENRE_TONE_GROUP = {
    wuxia: 'wuxia', xianxia: 'wuxia', xuanhuan: 'wuxia', cung_dau: 'wuxia', murim: 'wuxia',
    romance: 'romance', bl: 'romance', gl: 'romance',
    horror: 'horror', mystery: 'horror', thriller: 'horror',
    fantasy: 'fantasy', urban_fantasy: 'fantasy', steampunk: 'fantasy',
    slice_of_life: 'slice_of_life', comedy: 'slice_of_life',
};

/**
 * Apply genre-specific tone enforcement rules to text.
 * @param {string} text - Text to process
 * @param {string[]} genres - Story genres array
 * @returns {{ text: string, applied: Array }} Cleaned text + list of applied rules
 */
export function applyGenreToneRules(text, genres = []) {
    if (!text || !genres.length) return { text, applied: [] };

    let result = text;
    const applied = [];

    // Collect applicable rule sets
    const ruleSets = [GENRE_TONE_RULES.common];
    const seen = new Set(['common']);

    for (const genre of genres) {
        const group = GENRE_TONE_GROUP[genre];
        if (group && !seen.has(group) && GENRE_TONE_RULES[group]) {
            ruleSets.push(GENRE_TONE_RULES[group]);
            seen.add(group);
        }
    }

    // Apply banned word replacements
    for (const ruleSet of ruleSets) {
        for (const rule of ruleSet.banned || []) {
            if (rule.skip) continue; // Mark-only rule, don't auto-replace
            const before = result;
            result = result.replace(rule.find, rule.replace);
            if (before !== result) {
                applied.push({ type: 'banned', note: rule.note });
            }
        }
        for (const rule of ruleSet.preferred || []) {
            const before = result;
            result = result.replace(rule.find, rule.replace);
            if (before !== result) {
                applied.push({ type: 'preferred', note: rule.note });
            }
        }
    }

    return { text: result, applied };
}

/**
 * Get all tone rules for inspection/display.
 */
export function getToneRulesForGenres(genres = []) {
    const rules = [...(GENRE_TONE_RULES.common?.banned || [])];
    const seen = new Set(['common']);
    for (const genre of genres) {
        const group = GENRE_TONE_GROUP[genre];
        if (group && !seen.has(group) && GENRE_TONE_RULES[group]) {
            rules.push(...(GENRE_TONE_RULES[group].banned || []));
            seen.add(group);
        }
    }
    return rules;
}
