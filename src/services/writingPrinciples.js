// ================================================
// Writing Principles Engine
// 13 nguyên lý viết truyện nền tảng, áp dụng linh hoạt
// dựa trên ngữ cảnh — có thể dùng 0, 1, hoặc nhiều nguyên lý.
// ================================================

// ════════════════════════════════════════════════
// I. 13 NGUYÊN LÝ NỀN TẢNG
// Mỗi nguyên lý có: id, tên, mô tả ngắn, triggers (điều kiện kích hoạt)
// triggers: pattern regex trên text + sceneAffinity để quyết định khi nào cần áp dụng
// ════════════════════════════════════════════════

const WRITING_PRINCIPLES = [
    {
        id: 'iceberg',
        name: 'Tảng Băng Trôi (Iceberg)',
        instruction: `Chỉ để lộ 10%, 90% nằm dưới bề mặt.
• Không giải thích toàn bộ động cơ — gợi mở qua hành động và chi tiết.
• Không kể hết quá khứ — chỉ hé lộ phần cần thiết cho cảnh hiện tại.
• Để độc giả tự suy luận phần chìm.`,
        // Kích hoạt khi: exposition quá nhiều, flashback, giải thích dài dòng
        triggers: /(?:giải thích|kể lại|nhớ lại|hồi tưởng|quá khứ|nguyên nhân|lý do|nói rõ|bộc lộ|tiết lộ|bí mật|tâm sự|chia sẻ|thú nhận)/i,
        // Kích hoạt khi scene đang có dấu hiệu kể quá nhiều
        antiPattern: /(?:bởi vì|lý do là|anh ta cảm thấy|cô ấy nghĩ rằng|hắn biết rằng|nguyên nhân|nguồn cơn)/i,
        sceneAffinity: ['introspection', 'dialogue', 'description', 'mystery'],
        baseWeight: 0.3 // mặc định thấp, chỉ bật khi detect antiPattern
    },
    {
        id: 'cause_effect',
        name: 'Nhân – Quả (Cause & Effect)',
        instruction: `Mọi hành động phải tạo ra hệ quả cụ thể.
• Không có sự kiện "cho vui" — nếu A xảy ra mà không ảnh hưởng gì → đó là filler.
• Mỗi lựa chọn dẫn đến thay đổi cục diện.
• Xung đột tăng dần theo hậu quả tích lũy.`,
        triggers: /(?:quyết định|lựa chọn|hậu quả|kết quả|dẫn đến|gây ra|vì thế|do đó|hành động|phản ứng|trả giá|đánh đổi)/i,
        sceneAffinity: ['action', 'combat', 'dialogue', 'transition'],
        baseWeight: 0.5 // trung bình — nguyên lý phổ quát
    },
    {
        id: 'central_conflict',
        name: 'Xung Đột Trung Tâm',
        instruction: `Truyện chỉ sống khi có lực cản.
• Đảm bảo cảnh hiện tại có ít nhất một dạng xung đột: nội tâm vs bản thân, nhân vật vs nhân vật, nhân vật vs xã hội/tự nhiên/hệ tư tưởng.
• Không có xung đột → không có chuyển động.`,
        triggers: /(?:xung đột|mâu thuẫn|đối đầu|chống lại|phản đối|bất đồng|tranh cãi|đấu|chiến|va chạm|áp lực|đe dọa)/i,
        sceneAffinity: ['action', 'combat', 'dialogue', 'introspection'],
        baseWeight: 0.4
    },
    {
        id: 'show_dont_tell',
        name: 'Cho Thấy, Đừng Kể (Show, Don\'t Tell)',
        instruction: `Thể hiện qua hành động và chi tiết cụ thể, KHÔNG kể trực tiếp.
• CẤM: "Anh ta tức giận." → ĐÚNG: "Anh ta bóp gãy chiếc bút."
• CẤM: "Cô ấy buồn." → ĐÚNG: "Cô ấy nhìn ra cửa sổ, ngón tay vẽ vòng tròn trên mặt kính mờ hơi nước."
• Cảm xúc phải lộ qua hành vi, cử chỉ, phản ứng cơ thể.`,
        triggers: /(?:cảm thấy|cảm giác|cảm xúc|tâm trạng|nội tâm|nghĩ|suy nghĩ|lo lắng|vui|buồn|giận|sợ|hạnh phúc|đau khổ)/i,
        // Phát hiện khi đang kể thay vì cho thấy
        antiPattern: /(?:anh (?:ta )?(?:cảm thấy|rất|vô cùng)|cô (?:ấy )?(?:cảm thấy|rất|vô cùng)|hắn (?:cảm thấy|rất|vô cùng)|(?:rất |vô cùng )(?:buồn|vui|giận|sợ|lo|hạnh phúc))/i,
        sceneAffinity: ['introspection', 'romance', 'dialogue', 'action'],
        baseWeight: 0.35
    },
    {
        id: 'emotional_iceberg',
        name: 'Tảng Băng Cảm Xúc',
        instruction: `Cảm xúc mạnh nhất thường không được nói ra trực tiếp.
• Khi nhân vật nói "Tôi ổn." → độc giả phải cảm thấy họ KHÔNG ổn.
• Cảm xúc thật nằm trong: nhịp câu, khoảng lặng, hành động nhỏ vô thức.
• Sử dụng đối thoại ngầm — nói một đằng, nghĩ một nẻo.`,
        triggers: /(?:im lặng|không nói|lặng|thở dài|quay đi|cúi đầu|nuốt nước mắt|nén|giấu|che giấu|bình thản|tỏ ra|giả vờ|gượng)/i,
        sceneAffinity: ['dialogue', 'romance', 'introspection'],
        baseWeight: 0.25
    },
    {
        id: 'escalation',
        name: 'Leo Thang (Escalation)',
        instruction: `Xung đột phải tăng cấp, không lặp lại cùng mức nguy hiểm.
• Mỗi vòng lặp phải khó hơn, nguy hiểm hơn, hoặc đặt ra stakes cao hơn vòng trước.
• Áp lực tăng dần — không đột ngột nhảy lên max.
• Nếu đã cao trào → phải có beat nghỉ trước khi leo tiếp.`,
        triggers: /(?:nguy hiểm|nghiêm trọng|tệ hơn|khó khăn|áp lực|căng thẳng|đe dọa|mạnh hơn|tăng|leo thang|bùng nổ|vượt qua|giới hạn)/i,
        sceneAffinity: ['action', 'combat', 'mystery', 'transition'],
        baseWeight: 0.3
    },
    {
        id: 'knowledge_limit',
        name: 'Giới Hạn Nhận Thức',
        instruction: `Nhân vật CHỈ biết những gì họ CÓ THỂ biết.
• CẤM nhân vật toàn tri — không ai biết hết mọi thứ.
• CẤM suy luận phi logic hoặc "thông minh vì tác giả muốn vậy".
• Nhân vật có thể sai, bị lừa, hiểu nhầm — và đó là ĐIỀU TỐT.`,
        triggers: /(?:phát hiện|nhận ra|biết được|suy luận|đoán|phán đoán|hiểu|ngờ|đoán ra|thấy rõ|lật tẩy|vạch trần|tìm ra)/i,
        sceneAffinity: ['mystery', 'action', 'dialogue', 'combat'],
        baseWeight: 0.4
    },
    {
        id: 'hidden_worldbuilding',
        name: 'World-Building Ẩn',
        instruction: `KHÔNG phô diễn toàn bộ thế giới ngay lập tức.
• CẤM viết 3 trang lịch sử, hệ thống phép thuật dài dòng.
• Để thế giới lộ ra tự nhiên qua: hành vi nhân vật, hệ quả của luật, phản ứng xã hội.
• Quy tắc thế giới được "dạy" cho độc giả qua trải nghiệm, không qua bài giảng.`,
        triggers: /(?:thế giới|vương quốc|đế chế|hệ thống|phép thuật|luật|quy tắc|lịch sử|truyền thuyết|tín ngưỡng|tổ chức|phe phái|chủng tộc)/i,
        // Kích hoạt mạnh khi phát hiện exposition dump
        antiPattern: /(?:theo truyền thuyết|người ta kể|từ xa xưa|hệ thống .{5,30} bao gồm|lịch sử .{5,30} kể rằng)/i,
        sceneAffinity: ['description', 'dialogue', 'transition'],
        baseWeight: 0.2
    },
    {
        id: 'agency',
        name: 'Nhân Vật Chủ Động (Agency)',
        instruction: `Nhân vật phải là người GÂY RA thay đổi, không phải nạn nhân bị động.
• Nhân vật chính phải HÀNH ĐỘNG và QUYẾT ĐỊNH — không chỉ phản ứng.
• Nếu mọi thứ chỉ "xảy đến" với họ → họ là nạn nhân cốt truyện, không phải nhân vật chính.
• Ngay cả khi bị ép vào thế bí → nhân vật phải tự chọn cách ứng phó.`,
        triggers: /(?:bắt buộc|phải|không thể|bị ép|bị cuốn|số phận|định mệnh|chịu đựng|đành|miễn cưỡng|thụ động|chờ đợi)/i,
        sceneAffinity: ['action', 'introspection', 'dialogue', 'combat'],
        baseWeight: 0.35
    },
    {
        id: 'reader_participation',
        name: 'Khoảng Trống (Reader Participation)',
        instruction: `Độc giả phải được tham gia lấp đầy khoảng trống.
• Khi độc giả tự suy luận → họ đầu tư cảm xúc mạnh hơn.
• Truyện càng giải thích hết → độc giả càng thụ động.
• Để lại câu hỏi, gợi mở, chi tiết đa nghĩa — đừng đóng hết mọi cánh cửa.`,
        triggers: /(?:giải thích|lý do|bởi vì|nghĩa là|có nghĩa|nói cách khác|tóm lại|kết luận|rõ ràng|hiển nhiên)/i,
        antiPattern: /(?:điều này (?:có nghĩa|cho thấy)|nói cách khác|tóm lại|rõ ràng là|hiển nhiên là|ai cũng biết)/i,
        sceneAffinity: ['introspection', 'mystery', 'dialogue', 'transition'],
        baseWeight: 0.2
    },
    {
        id: 'setup_payoff',
        name: 'Thiết Lập – Trả Giá (Setup & Payoff)',
        instruction: `Thiết lập trước — trả giá sau (Chekhov's Gun).
• Nếu giới thiệu một chi tiết quan trọng (vũ khí, bí mật, kỹ năng) → nó PHẢI được dùng sau.
• Gieo mầm sớm cho các twist và reveal — không deus ex machina.
• Payoff phải xứng đáng với thời gian setup.`,
        triggers: /(?:nhắc đến|đã từng|trước đây|lần trước|nhớ|quen thuộc|déjà vu|manh mối|dấu hiệu|gieo|cài cắm|foreshadow|hé lộ)/i,
        sceneAffinity: ['mystery', 'action', 'transition', 'dialogue'],
        baseWeight: 0.25
    },
    {
        id: 'transformation',
        name: 'Biến Đổi (Transformation)',
        instruction: `Cuối mỗi phân đoạn/chương quan trọng, phải có sự thay đổi ở nhân vật.
• Thay đổi tính cách, niềm tin, vị thế, hoặc nhận thức.
• Hoặc thất bại không thể đảo ngược — nhân vật mất mát thực sự.
• Nếu nhân vật kết thúc y hệt lúc bắt đầu → đoạn văn đó không để lại dư chấn.`,
        triggers: /(?:thay đổi|khác|không còn|dần dần|nhận ra|hiểu ra|trưởng thành|từ bỏ|chấp nhận|mất|hy sinh|đánh đổi|biến đổi|chuyển biến)/i,
        sceneAffinity: ['introspection', 'transition', 'dialogue', 'action'],
        baseWeight: 0.25
    },
    {
        id: 'moral_pressure',
        name: 'Áp Lực Đạo Đức',
        instruction: `Quyết định khó nhất mới tạo chiều sâu.
• Cho nhân vật chọn giữa: đúng vs dễ, tình cảm vs nghĩa vụ, sống sót vs lý tưởng.
• Không có "lựa chọn đúng hiển nhiên" — mọi phương án đều có cái giá.
• Càng đau đớn → càng đáng nhớ.`,
        triggers: /(?:chọn|lựa chọn|hai con đường|khó khăn|đúng sai|đạo đức|lương tâm|phải trái|hy sinh|đánh đổi|trách nhiệm|nghĩa vụ|bổn phận)/i,
        sceneAffinity: ['introspection', 'dialogue', 'action'],
        baseWeight: 0.3
    },
    // === 3 NGUYÊN LÝ MỚI (tham khảo Dreammini✯Beyond Preset) ===
    {
        id: 'private_self',
        name: 'Tư Ngã (Private Self)',
        instruction: `Mỗi nhân vật có "mặt ngoài" và "mặt trong" — hành vi phụ thuộc vào cả hai.
• "Mặt ngoài" (表): thái độ, lời nói, cử chỉ họ CỐ TÌNH cho người khác thấy.
• "Mặt trong" (裏): suy nghĩ thật, nỗi sợ ẩn, ham muốn giấu kín, quá khứ chi phối.
• Khi "mặt ngoài" và "mặt trong" XUNG ĐỘT → tạo ra chiều sâu nhân vật.
• Hành vi phải dựa trên TƯ NGÃ + HOÀN CẢNH, KHÔNG dựa trên "kịch bản cần nhân vật làm gì".
• Ví dụ: kẻ tàn ác nhưng yêu con, anh hùng nhưng sợ cô đơn, lãnh đạm nhưng đang khóc bên trong.`,
        triggers: /(?:giả vờ|che giấu|thật ra|bề ngoài|bên trong|nội tâm|bí mật|ẩn|giấu|vẻ mặt|mặt nạ|đóng vai|gượng|lạnh lùng|vô cảm|tỏ ra)/i,
        antiPattern: /(?:hắn là người tốt|cô ấy rất tốt bụng|anh ta là kẻ ác|thực chất là|bản chất)/i,
        sceneAffinity: ['dialogue', 'introspection', 'romance', 'action'],
        baseWeight: 0.35
    },
    {
        id: 'parallel_events',
        name: 'Sự Kiện Song Song (Parallel Events)',
        instruction: `Thế giới tiếp tục vận hành KHI NHÂN VẬT CHÍNH KHÔNG Ở ĐÓ.
• Các nhân vật phụ CÓ CUỘC SỐNG RIÊNG — họ hành động theo mục tiêu của họ, không chờ nhân vật chính.
• Khi nhân vật chính quay lại một địa điểm → thấy KẾT QUẢ của những gì xảy ra khi họ vắng mặt.
• Sự kiện lớn (chiến tranh, lễ hội, âm mưu) diễn ra độc lập — nhân vật chính chỉ gặp khi chúng giao nhau.
• Thi thoảng GỢI Ý qua tin đồn, thư từ, dấu vết — để độc giả biết thế giới đang sống.`,
        triggers: /(?:trong khi đó|ở nơi khác|tin tức|nghe nói|tin đồn|thư|truyền tin|quay lại|trở về|thay đổi|khác đi|không còn|đã xong|đã kết thúc)/i,
        sceneAffinity: ['transition', 'dialogue', 'description', 'mystery'],
        baseWeight: 0.2
    },
    {
        id: 'foreshadowing',
        name: 'Phục Bút (Foreshadowing)',
        instruction: `Gieo mầm trước, thu hoạch sau — mọi twist phải có nền tảng.
• GIEO MẦM: Đặt chi tiết nhỏ (vật phẩm, lời nói, hành vi lạ) TRƯỚC KHI chúng trở nên quan trọng.
• THU HOẠCH: Khi reveal/twist xảy ra, độc giả phải "à, vậy ra...!" — không phải "ở đâu ra?!".
• CẤM deus ex machina: giải pháp KHÔNG được từ hư không — phải có setup trước đó.
• Phục bút tốt: lần đầu đọc = chi tiết bình thường; đọc lại = nguyên khải.
• Mỗi 2-3 cảnh, gieo 1 chi tiết nhỏ cho tương lai — không cần đều đặn, nhưng phải có.`,
        triggers: /(?:sau này|tương lai|sẽ|rồi sẽ|manh mối|nhắc đến|đã từng|trước đây|lần trước|quen thuộc|dấu hiệu|gieo|cài cắm|foreshadow|hé lộ|lạ|kỳ quặc|bất thường)/i,
        sceneAffinity: ['mystery', 'transition', 'dialogue', 'description'],
        baseWeight: 0.25
    }
];

// ════════════════════════════════════════════════
// II. SCENE CONTEXT ANALYZER
// Nhận diện loại cảnh qua keyword matching
// ════════════════════════════════════════════════

const SCENE_PATTERNS = {
    combat: {
        keywords: /(?:đánh|chém|kiếm|đấm|đá|chiến đấu|tấn công|phòng thủ|chiêu|nội lực|phép thuật|bùa|chiến|trận|giáp|vũ khí|máu|thương|chết|giết|chiến trường|nổ|đạn|bắn)/i,
        weight: 1.2
    },
    action: {
        keywords: /(?:chạy|nhảy|leo|trốn|đuổi|rượt|phóng|lao|né|tránh|bắt|thoát|vượt|xông|lùi|nhanh|gấp|khẩn|nguy|rơi|va|đập)/i,
        weight: 1.0
    },
    dialogue: {
        keywords: /(?:nói|hỏi|đáp|trả lời|thì thầm|gào|hét|cười|khóc|thở dài|im lặng|ngập ngừ|lắp bắp|mỉm cười|gật|lắc|bàn bạc|thương lượng)/i,
        weight: 1.0
    },
    introspection: {
        keywords: /(?:nghĩ|suy nghĩ|nhớ|hồi tưởng|tự hỏi|cảm thấy|lo lắng|sợ|buồn|vui|giận|hối hận|trăn trở|do dự|phân vân|nhận ra|hiểu|ngộ|tâm trạng)/i,
        weight: 1.0
    },
    description: {
        keywords: /(?:cảnh|phong cảnh|trời|mây|gió|mưa|nắng|ánh sáng|bóng tối|màu|hương|mùi|âm thanh|tiếng|lâu đài|rừng|biển|núi|thành phố|căn phòng)/i,
        weight: 0.8
    },
    romance: {
        keywords: /(?:yêu|thương|nhớ|hôn|ôm|nắm tay|tim đập|má nóng|run|đỏ mặt|ngại|e thẹn|lãng mạn|xao xuyến|rung động|tình cảm|ghen|nhung nhớ)/i,
        weight: 1.1
    },
    mystery: {
        keywords: /(?:bí ẩn|manh mối|điều tra|nghi ngờ|phát hiện|dấu vết|chứng cứ|bí mật|ẩn|giấu|che|mật|đáng ngờ|kỳ lạ|bất thường|giải mã|suy luận)/i,
        weight: 1.0
    },
    transition: {
        keywords: /(?:sau đó|hôm sau|sáng hôm|buổi chiều|tối đến|vài ngày|thời gian|trôi|kết thúc|bắt đầu|chuyển|đến|rời|về|di chuyển|lên đường)/i,
        weight: 0.6
    }
};

/**
 * Analyze scene context from text content.
 * @param {string} text
 * @param {Object} [chapter]
 * @param {Object} [story]
 * @returns {{ sceneType: string, scores: Object, dominantTypes: string[], intensity: number }}
 */
export function analyzeSceneContext(text, chapter = null, story = null) {
    if (!text || text.length < 20) {
        return { sceneType: 'general', scores: {}, dominantTypes: [], intensity: 0 };
    }

    const sample = text.slice(-1500);
    const scores = {};

    for (const [type, pattern] of Object.entries(SCENE_PATTERNS)) {
        const matches = (sample.match(new RegExp(pattern.keywords, 'gi')) || []).length;
        scores[type] = matches * pattern.weight;
    }

    // Dialogue markers boost
    const quoteCount = (sample.match(/["'「」『』""''《》]/g) || []).length;
    if (quoteCount > 4) scores.dialogue = (scores.dialogue || 0) + quoteCount * 0.5;

    // Short sentences → action/combat
    const sentences = sample.split(/[.!?。！？\n]+/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / (sentences.length || 1);
    if (avgLength < 30 && sentences.length > 5) {
        scores.action = (scores.action || 0) + 3;
        scores.combat = (scores.combat || 0) + 2;
    }

    const sorted = Object.entries(scores)
        .filter(([, s]) => s > 0)
        .sort(([, a], [, b]) => b - a);

    const dominantTypes = sorted.slice(0, 3).map(([type]) => type);
    const sceneType = sorted.length > 0 ? sorted[0][0] : 'general';

    // Tính intensity tổng thể: tổng điểm top 3 / max possible
    const topScoresSum = sorted.slice(0, 3).reduce((sum, [, s]) => sum + s, 0);
    const intensity = Math.min(topScoresSum / 15, 1); // normalized 0-1

    // Chapter hints
    if (chapter?.summary) {
        const summary = chapter.summary.toLowerCase();
        if (/chiến đấu|đánh|trận/.test(summary) && !dominantTypes.includes('combat')) {
            dominantTypes.push('combat');
        }
        if (/đối thoại|thương lượng|bàn/.test(summary) && !dominantTypes.includes('dialogue')) {
            dominantTypes.push('dialogue');
        }
    }

    return { sceneType, scores, dominantTypes, intensity };
}

// ════════════════════════════════════════════════
// III. FLEXIBLE PRINCIPLE SELECTOR
// Có thể trả về 0, 1, hoặc nhiều nguyên lý
// Dựa trên ngưỡng relevance — không ép phải có
// ════════════════════════════════════════════════

// Ngưỡng tối thiểu để một nguyên lý được chọn
const RELEVANCE_THRESHOLD = 0.35;

/**
 * Select relevant writing principles based on scene context.
 * Returns 0 to N principles — flexible, threshold-based selection.
 *
 * @param {{ sceneType: string, dominantTypes: string[], intensity: number }} sceneContext
 * @param {string} text - Raw text for trigger/antiPattern matching
 * @param {string[]} [genreKeys=[]]
 * @param {number} [maxPrinciples=7]
 * @returns {Array<{ id: string, name: string, instruction: string, relevance: number }>}
 */
export function selectPrinciples(sceneContext, text = '', genreKeys = [], maxPrinciples = 7) {
    const { dominantTypes = [], intensity = 0 } = sceneContext;
    const sample = (text || '').slice(-1500);

    // Nếu text quá ngắn hoặc intensity quá thấp → không áp dụng nguyên lý nào
    if (sample.length < 50 || intensity < 0.05) {
        return [];
    }

    const scored = WRITING_PRINCIPLES.map(p => {
        let relevance = p.baseWeight;

        // 1. Scene affinity matching
        for (let i = 0; i < dominantTypes.length; i++) {
            const sceneType = dominantTypes[i];
            const positionBoost = 1 - (i * 0.2);
            if (p.sceneAffinity.includes(sceneType)) {
                const affinityIdx = p.sceneAffinity.indexOf(sceneType);
                const affinityBoost = 1 - (affinityIdx * 0.08);
                relevance += 0.3 * positionBoost * affinityBoost;
            }
        }

        // 2. Trigger matching — nếu text chứa triggers, boost thêm
        if (p.triggers && sample.length > 0) {
            const triggerMatches = (sample.match(new RegExp(p.triggers, 'gi')) || []).length;
            if (triggerMatches > 0) {
                relevance += Math.min(triggerMatches * 0.08, 0.3);
            }
        }

        // 3. AntiPattern detection — nếu phát hiện lỗi viết, boost MẠNH
        if (p.antiPattern && sample.length > 0) {
            const antiMatches = (sample.match(new RegExp(p.antiPattern, 'gi')) || []).length;
            if (antiMatches > 0) {
                relevance += Math.min(antiMatches * 0.15, 0.4); // mạnh hơn trigger
            }
        }

        // 4. Intensity scaling — cảnh mạnh hơn thì nguyên lý relating thêm trọng lượng
        relevance *= (0.7 + intensity * 0.3);

        return { id: p.id, name: p.name, instruction: p.instruction, relevance };
    });

    // Genre-specific boosts
    if (genreKeys.length > 0) {
        for (const item of scored) {
            if (item.id === 'escalation' && genreKeys.some(g => ['wuxia', 'xuanhuan', 'xianxia', 'hunter', 'adventure', 'action'].includes(g))) {
                item.relevance *= 1.15;
            }
            if (item.id === 'emotional_iceberg' && genreKeys.some(g => ['romance', 'cung_dau'].includes(g))) {
                item.relevance *= 1.2;
            }
            if ((item.id === 'knowledge_limit' || item.id === 'setup_payoff') && genreKeys.some(g => ['mystery', 'thriller'].includes(g))) {
                item.relevance *= 1.2;
            }
            if (item.id === 'iceberg' && genreKeys.some(g => ['horror', 'mystery'].includes(g))) {
                item.relevance *= 1.15;
            }
            if (item.id === 'moral_pressure' && genreKeys.some(g => ['drama', 'slice_of_life', 'historical'].includes(g))) {
                item.relevance *= 1.15;
            }
        }
    }

    // Sort + filter bằng threshold
    scored.sort((a, b) => b.relevance - a.relevance);
    const selected = scored.filter(p => p.relevance >= RELEVANCE_THRESHOLD);

    // Giới hạn tối đa
    return selected.slice(0, maxPrinciples);
}

// ════════════════════════════════════════════════
// IV. PRINCIPLE INJECTION BUILDER
// ════════════════════════════════════════════════

/**
 * Build a prompt injection block from selected principles.
 * Returns empty string if no principles selected (0 is valid!).
 *
 * @param {Array} principles
 * @param {string} sceneType
 * @returns {string}
 */
export function buildPrincipleInjection(principles, sceneType = 'general') {
    if (!principles?.length) return '';

    const sceneLabel = {
        action: '⚡ Hành động',
        combat: '⚔️ Chiến đấu',
        dialogue: '💬 Đối thoại',
        introspection: '🧠 Nội tâm',
        description: '🎨 Mô tả',
        romance: '💕 Lãng mạn',
        mystery: '🔍 Bí ẩn',
        transition: '🔄 Chuyển cảnh',
        general: '📝 Tổng quát'
    }[sceneType] || '📝 Tổng quát';

    const principleBlocks = principles.map(p =>
        `▸ ${p.name}\n${p.instruction}`
    );

    return `<writing_principles>
【NGUYÊN LÝ VIẾT ÁP DỤNG — ${sceneLabel}】
Ngữ cảnh hiện tại phù hợp với ${principles.length} nguyên lý sau. Áp dụng linh hoạt, KHÔNG máy móc:

${principleBlocks.join('\n\n')}
</writing_principles>`;
}

// ════════════════════════════════════════════════
// V. CONVENIENCE: Full pipeline in one call
// ════════════════════════════════════════════════

/**
 * Analyze text and build principle injection in one call.
 * Returns empty injection if no principles are relevant (this is VALID and EXPECTED).
 *
 * @param {string} text
 * @param {Object} [chapter]
 * @param {Object} [story]
 * @param {Object} [options]
 * @param {number} [options.maxPrinciples=7]
 * @returns {{ injection: string, sceneType: string, principles: Array }}
 */
export function autoPrinciples(text, chapter = null, story = null, options = {}) {
    const { maxPrinciples = 7 } = options;

    // Feature toggle
    if (story?.autoApplyPrinciples === false) {
        return { injection: '', sceneType: 'disabled', principles: [] };
    }

    const sceneContext = analyzeSceneContext(text, chapter, story);

    const genreKeys = story?.genres?.length > 0
        ? story.genres
        : (story?.genre ? [story.genre] : []);

    const principles = selectPrinciples(sceneContext, text, genreKeys, maxPrinciples);
    const injection = buildPrincipleInjection(principles, sceneContext.sceneType);

    // Log: 0 principles is a valid outcome, not an error
    if (principles.length === 0) {
        console.log(`📐 autoPrinciples: scene=${sceneContext.sceneType}, intensity=${sceneContext.intensity.toFixed(2)} → no principles needed`);
    } else {
        console.log(`📐 autoPrinciples: scene=${sceneContext.sceneType}, intensity=${sceneContext.intensity.toFixed(2)}, ${principles.length} principles [${principles.map(p => p.id).join(', ')}]`);
    }

    return { injection, sceneType: sceneContext.sceneType, principles };
}
