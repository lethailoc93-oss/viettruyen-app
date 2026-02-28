// ================================================
// Genre Defaults — Auto-populate settings based on story genre
// Tham khảo từ Dreammini✯Beyond Gemini Preset worldbook
// ================================================

/**
 * Mapping genre → recommended style template.
 * Dùng khi story chưa chọn style template → gợi ý tự động.
 */
const GENRE_STYLE_MAP = {
    // Chinese web novel
    wuxia: 'wuxia_jin_yong',
    xianxia: 'xuanhuan',
    xuanhuan: 'xuanhuan',
    cung_dau: 'ancient_elegant',
    chuyen_khong: 'ancient_elegant',
    trong_sinh: 'modern_urban',
    do_thi: 'modern_urban',
    // Japanese
    isekai: 'light_novel_comedy',
    mecha: 'epic_fantasy',
    mahou_shoujo: 'light_novel_calm',
    // Korean
    murim: 'wuxia_co_long',
    hunter: 'modern_urban',
    regression: 'modern_urban',
    // Western
    fantasy: 'epic_fantasy',
    dark_fantasy: 'dark_realistic',
    urban_fantasy: 'modern_urban',
    cyberpunk: 'modern_urban',
    steampunk: 'epic_fantasy',
    gothic: 'horror_psychological',
    // General
    romance: 'romance_sweet',
    horror: 'horror_psychological',
    mystery: 'horror_psychological',
    thriller: 'dark_realistic',
    comedy: 'light_novel_comedy',
    drama: 'dark_realistic',
    scifi: 'modern_urban',
    adventure: 'epic_fantasy',
    historical: 'ancient_elegant',
    slice_of_life: 'light_novel_calm',
    dystopia: 'dark_realistic',
    superhero: 'modern_urban',
};

/**
 * Mapping genre → recommended difficulty level.
 */
const GENRE_DIFFICULTY_MAP = {
    romance: 'positive',
    slice_of_life: 'positive',
    comedy: 'positive',
    light_novel_calm: 'positive',
    mahou_shoujo: 'positive',
    isekai: 'balanced',
    wuxia: 'balanced',
    xuanhuan: 'balanced',
    xianxia: 'balanced',
    fantasy: 'balanced',
    adventure: 'balanced',
    historical: 'balanced',
    scifi: 'balanced',
    do_thi: 'balanced',
    hunter: 'balanced',
    superhero: 'balanced',
    mecha: 'balanced',
    cung_dau: 'realistic',
    chuyen_khong: 'balanced',
    trong_sinh: 'balanced',
    murim: 'balanced',
    regression: 'realistic',
    steampunk: 'balanced',
    mystery: 'realistic',
    thriller: 'realistic',
    drama: 'realistic',
    horror: 'realistic',
    dark_fantasy: 'grim',
    gothic: 'realistic',
    cyberpunk: 'realistic',
    dystopia: 'grim',
    urban_fantasy: 'balanced',
};

/**
 * Anti-cliché rules by genre group.
 * Tham khảo từ Gemini Preset worldbook: 反应模板, 文风空洞, 动物比喻, 感觉代替描写
 */
const ANTI_CLICHE_PRESETS = {
    // Common rules (áp dụng cho tất cả)
    common: [
        'KHÔNG dùng các khuôn sáo rập khuôn web novel (hệ thống toàn năng, vả mặt vô lý, từ hôn)',
        'KHÔNG tạo mâu thuẫn/drama khiên cưỡng, tránh các hiểu lầm vô lý kéo dài',
        'KHÔNG miêu tả cường điệu, lặp đi lặp lại về cảm giác (VD: "linh hồn run rẩy", "toàn thân chấn động")',
        'KHÔNG dùng từ ngữ quá hoa mỹ, sáo rỗng mà bỏ qua logic hành động thực tế',
        'KHÔNG dùng các từ thay thế/ẩn dụ rập khuôn (VD: "ánh mắt sắc như dao", "mỉm cười bí ẩn")',
        'KHÔNG miêu tả ngoại hình bằng danh sách liệt kê (mắt to, mũi cao, môi đỏ...)',
        'KHÔNG kết đoạn bằng câu triết lý hoặc bài học đạo đức sáo rỗng (VD: "Đó là bài học...")',
        'KHÔNG melodrama: cường độ cảm xúc phải TƯƠNG XỨNG với sự kiện. Cảnh hài/nhẹ → phản ứng nhẹ; cảnh bi thật → mới được đau đớn',
        'CẤM sáo ngữ AI tiếng Việt: "ký ức như thủy triều ập đến", "trán lấm tấm mồ hôi lạnh", "đau nhức xé toạc từng thớ thịt", "tim như bị bóp nghẹt", "gào thét trong lòng", "không khí đặc quánh"',
        'KHÔNG nhồi nhét quá nhiều giác quan vào một đoạn — chọn 1-2 giác quan nổi bật nhất, đừng ép đủ 5 giác quan',
        'Khi miêu tả sắc dục: dùng GỢI CẢM (sensual) chứ KHÔNG thô thiển chỉ thẳng bộ phận. Gợi tưởng tượng, giữ duyên dáng',
        'KHÔNG nhét cảm xúc cơ học: nếu viết "tim đập nhanh" hay "tay run" thì phải có lý do cụ thể, không dùng như khuôn mẫu mặc định'
    ],
    // Romance extras
    romance: [
        'KHÔNG "ngã vào lòng" đúng lúc kịch tính — nếu ngã thì phải tự nhiên',
        'KHÔNG yêu từ cái nhìn đầu tiên trừ khi cố ý viết kiểu này',
        'KHÔNG để nam/nữ chính quá hoàn hảo — phải có nhược điểm thật',
        'KHÔNG giải quyết hiểu lầm bằng 1 đoạn giải thích ngắn',
    ],
    // Wuxia/Xianxia extras
    wuxia: [
        'KHÔNG lên cấp đúng lúc sắp thua — power-up phải có foreshadowing',
        'KHÔNG để kẻ thù đứng yên cho nhân vật chính biến hình/thi triển',
        'KHÔNG dùng "cuồng ngạo" cho mọi phản diện — đa dạng tính cách',
        'KHÔNG "lão phu" khinh thường rồi bị đánh mặt theo khuôn mẫu duy nhất',
    ],
    // Horror extras
    horror: [
        'KHÔNG jump scare bằng mô tả — sợ bằng chi tiết bất thường',
        'KHÔNG giải thích nguồn gốc nỗi sợ quá sớm',
        'KHÔNG để nhân vật tách ra một mình vô lý',
        'KHÔNG kết thúc kiểu "thì ra là mơ" — đó là anti-climax',
    ],
    // Thriller/Mystery extras
    thriller: [
        'KHÔNG giải quyết vụ án bằng tình cờ hoặc may mắn',
        'KHÔNG để thủ phạm là nhân vật chưa từng xuất hiện',
        'KHÔNG để nhân vật đoán đúng mọi thứ ngay lần đầu',
    ],
    // Fantasy extras
    fantasy: [
        'KHÔNG dùng "Chosen One" cứu mọi thứ bằng sức mạnh ẩn giấu',
        'KHÔNG để phép thuật giải quyết mọi vấn đề — phải có giới hạn',
        'KHÔNG info-dump worldbuilding — hé lộ từ từ qua hành động',
    ],
    // Isekai/Hunter/Regression extras
    isekai: [
        'KHÔNG để MC quá OP ngay từ đầu',
        'KHÔNG để mọi nữ nhân vật đều yêu MC vô lý',
        'KHÔNG bỏ qua logic thế giới chỉ để MC trông giỏi',
    ],
    // Slice of life extras
    slice_of_life: [
        'KHÔNG thêm drama vô cớ vào cuộc sống bình thường',
        'KHÔNG để mọi vấn đề giải quyết trong 1 chương',
        'KHÔNG viết quá sâu sắc triết lý — giữ nhẹ nhàng tự nhiên',
    ],
};

/**
 * Genre keys mapping → anti-cliché preset group.
 */
const GENRE_ANTICLICHE_GROUP = {
    romance: 'romance',
    wuxia: 'wuxia',
    xianxia: 'wuxia',
    xuanhuan: 'wuxia',
    cung_dau: 'wuxia',
    murim: 'wuxia',
    horror: 'horror',
    gothic: 'horror',
    mystery: 'thriller',
    thriller: 'thriller',
    drama: 'thriller',
    fantasy: 'fantasy',
    dark_fantasy: 'fantasy',
    epic_fantasy: 'fantasy',
    urban_fantasy: 'fantasy',
    steampunk: 'fantasy',
    isekai: 'isekai',
    hunter: 'isekai',
    regression: 'isekai',
    mecha: 'isekai',
    superhero: 'isekai',
    slice_of_life: 'slice_of_life',
    comedy: 'slice_of_life',
    // others default to common only
};

/**
 * Build recommended defaults for a story based on its genres.
 * @param {Object} story - Story with genres[] or genre field
 * @returns {{ styleTemplate: string, difficulty: string, antiCliches: string[] }}
 */
export function buildGenreDefaults(story) {
    if (!story) return { styleTemplate: '', difficulty: 'balanced', antiCliches: [] };

    const genres = story.genres?.length > 0 ? story.genres
        : (story.genre ? [story.genre] : []);

    // Style: use first matching genre
    let styleTemplate = '';
    for (const g of genres) {
        if (GENRE_STYLE_MAP[g]) {
            styleTemplate = GENRE_STYLE_MAP[g];
            break;
        }
    }

    // Difficulty: use most "intense" genre
    const difficultyOrder = ['positive', 'balanced', 'realistic', 'grim'];
    let difficulty = 'balanced';
    for (const g of genres) {
        const d = GENRE_DIFFICULTY_MAP[g];
        if (d && difficultyOrder.indexOf(d) > difficultyOrder.indexOf(difficulty)) {
            difficulty = d;
        }
    }

    // Anti-cliché: combine common + genre-specific
    const antiCliches = [...ANTI_CLICHE_PRESETS.common];
    const addedGroups = new Set();
    for (const g of genres) {
        const group = GENRE_ANTICLICHE_GROUP[g];
        if (group && !addedGroups.has(group) && ANTI_CLICHE_PRESETS[group]) {
            antiCliches.push(...ANTI_CLICHE_PRESETS[group]);
            addedGroups.add(group);
        }
    }

    return { styleTemplate, difficulty, antiCliches };
}

