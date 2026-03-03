// ================================================
// Author Style Profiles — Hồ sơ phong cách tác giả
// Mỗi tác giả/phong cách có profile riêng biệt
// ================================================

/**
 * Pre-built author profiles.
 * Mỗi profile chứa thông tin chi tiết về phong cách viết đặc trưng.
 *
 * NOTE: 'wuxia_jin_yong' và 'wuxia_co_long' đã có trong styleTemplates.js
 * nhưng ở đây ta cung cấp hồ sơ chi tiết hơn, bao gồm vocabulary,
 * signature expressions, và avoid expressions.
 */
export const AUTHOR_PROFILES = [
    {
        id: 'kim_dung',
        name: 'Kim Dung (金庸)',
        icon: '⚔️',
        era: 'Cổ đại / Giang hồ',
        sentenceStyle: 'Câu trung bình đến dài, nhịp nhàng, cân đối. Xen câu ngắn khi tăng kịch tính.',
        dialogueStyle: 'Lời thoại hào sảng, nghĩa liệt. Nhân vật nói theo thân phận — đại hiệp nói khác tiểu tốt. Đối thoại mang chiều sâu triết lý.',
        descriptionStyle: 'Miêu tả cảnh vật hùng vĩ qua thiên nhiên. Chiêu thức chi tiết, kỹ thuật. Dùng thiên nhiên phản ánh tâm cảnh.',
        pacing: 'Nhịp trung bình — xen kẽ cao trào hành động với đoạn chiêm nghiệm, truyện cười giang hồ.',
        vocabulary: 'Hào sảng, đại khí, cổ phong nhưng vẫn dễ hiểu. Dùng thành ngữ, điển tích vừa phải.',
        instruction: `【HỒ SƠ TÁC GIẢ: KIM DUNG (金庸)】
Viết theo phong cách Kim Dung — cha đẻ tiểu thuyết võ hiệp hiện đại:

📌 CẤU TRÚC CÂU:
• Câu trung bình 15-30 chữ, nhịp nhàng như phách tấu. Xen câu ngắn 5-8 chữ khi đánh nhau.
• Mỗi đoạn văn có "hơi thở" — không dồn dập liên tục, cũng không lê thê.

📌 ĐỐI THOẠI:
• Nhân vật lớn nói uy nghiêm: "Ta đã nói rồi, không nhắc lần hai."
• Trẻ trung nói hào sảng: "Đại trượng phu đứng giữa đất trời, sợ gì ba cái trận đồ này!"
• Xảo quyệt nói mát: "Lý huynh quả nhiên cao kiến. Nhưng... quý huynh đã nghĩ đến Thiếu Lâm chưa?"
• Đối thoại có lớp nghĩa: bề ngoài lễ độ, bên trong dao kiếm.

📌 MIÊU TẢ CHIÊU THỨC:
• Chi tiết quỹ đạo: "Thanh kiếm vung từ phải qua trái, theo thế Liên Hoàn — ba đòn liên tiếp không ngưng."
• Nội lực có hình ảnh: "Chân khí từ đan điền bùng lên, phóng tay chưởng — lá cây xung quanh rung rung."
• Phản ứng đối thủ: "Hắn thối lui nửa bước, mắt thoáng biến sắc — nhận ra đòn vừa rồi không phải Hoa Sơn kiếm pháp."

📌 CẢNH VẬT:
• Dùng thiên nhiên phản ánh tâm cảnh: bi thương → mưa rơi, chiến thắng → nắng vàng.
• Núi sông hùng vĩ: "Đỉnh Hoa Sơn mây mù bao phủ, vách đá dựng đứng như kiếm chặt."`,
        signatureExpressions: [
            'đại hiệp', 'giang hồ', 'nghĩa khí', 'chưởng môn',
            'nội lực thâm hậu', 'kiếm ý', 'chân khí', 'võ lâm',
            'khinh công', 'ám khí', 'phi tiêu', 'hiệp khách',
        ],
        avoidExpressions: [
            'level up', 'hệ thống', 'status', 'skill',
            'buff', 'nerf', 'quest', 'dungeon',
        ],
    },
    {
        id: 'co_long',
        name: 'Cổ Long (古龍)',
        icon: '🗡️',
        era: 'Cổ đại / Giang hồ',
        sentenceStyle: 'Cực ngắn. Một hàng = một câu. Đôi khi chỉ một từ. Đoạn văn ngắn, nhịp gấp.',
        dialogueStyle: 'Đối thoại sắc bén, ít lời, lạnh. Mỗi câu mang nhiều nghĩa, nhiều lớp. Thường kết thúc bằng im lặng.',
        descriptionStyle: 'Không miêu tả chiêu thức — chỉ kết quả. Bầu không khí u ám, tối giản. Mô tả qua cảm giác, không qua hình ảnh.',
        pacing: 'Cực nhanh — nhịp dao, nhịp kiếm. Chậm lại đột ngột khi nhân vật suy tư.',
        vocabulary: 'Sắc lạnh, cô đọng, triết lý giang hồ ngắn như châm ngôn.',
        instruction: `【HỒ SƠ TÁC GIẢ: CỔ LONG (古龍)】
Viết theo phong cách Cổ Long — bậc thầy kiếm hiệp viết như thơ:

📌 CẤU TRÚC:
• Câu NGẮN. RẤT NGẮN.
• Một dòng. Một ý.
• Đôi khi chỉ một từ.

📌 CHIẾN ĐẤU:
• KHÔNG mô tả chiêu thức chi tiết.
• Kiếm vung. Máu phun. Hắn đổ.
• Chỉ kết quả. Nhanh. Bất ngờ. Chết chóc.

📌 ĐỐI THOẠI:
• Ít lời nhưng sắc.
• "Ngươi muốn chết?"
• "Không."
• "Vậy sao ngươi cầm kiếm?"
• Im lặng đáng sợ hơn lời nói.

📌 BẦU KHÍ:
• Tối. Mưa. Rượu. Đêm. Cô đơn.
• Nhân vật lãnh đạm bề ngoài, đau bên trong.
• Triết lý giang hồ: "Trên đời này, chỉ có rượu và kiếm là không phản bội."`,
        signatureExpressions: [
            'cô đơn', 'rượu', 'kiếm', 'đêm', 'máu',
            'sống', 'chết', 'giang hồ', 'bạn bè', 'phản bội',
        ],
        avoidExpressions: [
            'miêu tả chi tiết chiêu thức', 'nội lực tuôn trào', 'kiếm khí tung hoành',
            'câu văn dài quá 15 chữ trong cảnh chiến đấu',
        ],
    },
    {
        id: 'ngo_bat_nhi',
        name: 'Ngã Cật Tây Hồng Thị (I Eat Tomatoes)',
        icon: '🐉',
        era: 'Huyền huyễn / Tu tiên',
        sentenceStyle: 'Câu trung bình, rõ ràng, dễ đọc. Nhịp nhanh, ít mô tả thừa.',
        dialogueStyle: 'Đối thoại trực tiếp, khẩu khí phù hợp tu vi. Kẻ mạnh ít nói, kẻ yếu hay kêu.',
        descriptionStyle: 'Chiến đấu hoành tráng, quy mô vũ trụ. Mô tả sức mạnh qua hệ quả và phản ứng.',
        pacing: 'Nhanh — mỗi chương ít nhất 1 sự kiện. Power-up liên tục nhưng có giá.',
        vocabulary: 'Tu tiên, linh khí, đại đạo, hỗn nguyên, thiên đạo. Hoành tráng nhưng không rối.',
        instruction: `【HỒ SƠ TÁC GIẢ: NGÃ CẬT TÂY HỒNG THỊ】
Phong cách I Eat Tomatoes — huyền huyễn hoành tráng, quy mô vũ trụ:

📌 CẤU TRÚC:
• Nhịp nhanh, mỗi chương phải tiến triển rõ ràng.
• Câu rõ ràng, dễ đọc — không hoa mỹ thừa.

📌 CHIẾN ĐẤU:
• Quy mô lớn: phá sơn, liệt hải, đứng ngang thiên kiếp.
• Sức mạnh thể hiện qua HỆ QUẢ: "Một chưởng, nửa thành phố tan thành bình địa."
• Mô tả phản ứng bàn tán: "Cả triệu người sững sờ — đó là... Hồng Mông Đại Đế?!"

📌 HỆ THỐNG:
• Cấp bậc rõ ràng, thăng cấp có logic.
• Đột phá epic: mô tả chi tiết thiên kiếp, biến đổi cơ thể, linh hồn.
• Sức mạnh có giá: tiêu hao, nguy hiểm, đánh đổi.

📌 THẾ GIỚI:
• Nhiều tầng, nhiều giới: nhân giới → tiên giới → thần giới → hỗn nguyên.
• Mỗi tầng có quy tắc riêng, pháp tắc riêng.`,
        signatureExpressions: [
            'hỗn nguyên', 'thiên đạo', 'đại đạo', 'linh hồn',
            'thần thông', 'kiếp nạn', 'đột phá', 'cảnh giới',
            'tông môn', 'thế lực', 'vũ trụ', 'chủ tể',
        ],
        avoidExpressions: [
            'ngôn ngữ đời thường', 'slang hiện đại',
        ],
    },
    {
        id: 'duong_gia_tam_thieu',
        name: 'Đường Gia Tam Thiếu (唐家三少)',
        icon: '✨',
        era: 'Huyền huyễn / Fantasy',
        sentenceStyle: 'Lưu loát, dễ đọc, nhiều đối thoại. Câu vừa phải, nhịp mượt.',
        dialogueStyle: 'Đối thoại nhiều, tự nhiên, có cảm xúc. Nhân vật nói theo tính cách rõ ràng.',
        descriptionStyle: 'Chiến đấu chi tiết kỹ năng. Hệ thống rõ ràng. Romance ngọt ngào song song.',
        pacing: 'Trung bình — cân bằng giữa hành động và phát triển nhân vật/tình cảm.',
        vocabulary: 'Huyền huyễn nhưng dễ tiếp cận, không quá nặng cổ phong.',
        instruction: `【HỒ SƠ TÁC GIẢ: ĐƯỜNG GIA TAM THIẾU】
Phong cách Đường Gia Tam Thiếu — huyền huyễn dễ đọc, romance song song:

📌 CẤU TRÚC:
• Đối thoại chiếm 50%+ — nhịp đọc mượt mà.
• Xen kẽ hài hước nhẹ giữa các đoạn nghiêm túc.

📌 HỆ THỐNG:
• Hệ thống kỹ năng/năng lực chi tiết, rõ ràng, dễ theo dõi.
• Chiến đấu: combo skill + chiến thuật, mô tả activation cụ thể.
• Nhân vật có class/đặc tính rõ ràng.

📌 TÌNH CẢM:
• Romance ngọt ngào xen kẽ hành động — CẶP ĐÔI là trọng tâm phụ.
• Tương tác cặp đôi: bảo vệ, hy sinh, khoảnh khắc ngọt giữa nguy hiểm.
• Slow burn nhưng rõ ràng — người đọc biết ai sẽ thành đôi.

📌 NHỊP:
• Câu chuyện tiến triển đều, không quá gấp, không quá chậm.
• Mỗi chương kết thúc với hook nhẹ.`,
        signatureExpressions: [
            'hồn lực', 'hồn hoàn', 'hồn sư', 'vũ hồn',
            'hồn kỹ', 'phong hào', 'chiến đấu đội nhóm',
        ],
        avoidExpressions: [
            'quá u tối', 'grimdark', 'nhân vật chết vô nghĩa',
        ],
    },
    {
        id: 'modern_vn',
        name: 'Văn học Việt Nam hiện đại',
        icon: '🇻🇳',
        era: 'Hiện đại',
        sentenceStyle: 'Trữ tình, giàu cảm xúc. Câu trung bình, nhiều ẩn dụ thiên nhiên Việt Nam.',
        dialogueStyle: 'Đối thoại tự nhiên kiểu Việt — có xưng hô thân mật (anh/chị/em), tiếng lóng vùng miền.',
        descriptionStyle: 'Cảnh vật Việt Nam đặc trưng. Cảm xúc thể hiện tinh tế qua hành vi nhỏ.',
        pacing: 'Chậm rãi, chiêm nghiệm. Cho phép người đọc "sống" cùng nhân vật.',
        vocabulary: 'Tiếng Việt giàu hình ảnh, màu sắc. Dùng từ vựng vùng miền khi phù hợp.',
        instruction: `【HỒ SƠ TÁC GIẢ: VĂN HỌC VIỆT NAM HIỆN ĐẠI】
Phong cách văn học Việt Nam đương đại — trữ tình, gần gũi, nhân văn:

📌 NGÔN NGỮ:
• Tiếng Việt giàu hình ảnh — "nắng chiều vàng như mật ong rỉ qua khe cửa" thay vì "trời nắng đẹp".
• Xưng hô tự nhiên: anh/chị/em/mày/tao — tùy quan hệ và vùng miền.
• Từ vựng đời thường Việt: chợ, quán cóc, xe ôm, bún riêu, mưa rào.

📌 CẢM XÚC:
• Tinh tế, không cường điệu. Buồn thì buồn nhẹ nhàng — "Bà ngồi nhìn bàn ăn bốn ghế, chỉ còn hai đôi đũa."
• Thể hiện qua hành vi nhỏ đặc trưng Việt: pha trà, quét sân, ngồi trước hiên.
• Cảm xúc gia đình là trọng tâm: tình mẹ con, anh em, quê hương.

📌 BỐI CẢNH:
• Cảnh vật Việt Nam: ruộng đồng, phố cổ, chung cư, quán café, mưa Sài Gòn, rét Hà Nội.
• Mùa và thời tiết gắn liền câu chuyện.
• Âm thanh đặc trưng: tiếng rao hàng, còi xe, tiếng mưa trên mái tôn.

📌 NHỊP:
• Chậm rãi, chiêm nghiệm — không vội vàng đến cao trào.
• Khoảng lặng nhiều — đôi khi một đoạn văn chỉ là mô tả mà chẳng có gì xảy ra, nhưng đẹp.`,
        signatureExpressions: [
            'rưng rưng', 'nhớ nhung', 'quê hương', 'ngày xưa',
            'mưa phùn', 'nắng hanh', 'gió bấc', 'chiều tà',
        ],
        avoidExpressions: [
            'ngôn ngữ tiên hiệp', 'xưng hô ta/ngươi', 'thuật ngữ Trung Quốc',
            'bối cảnh Trung Quốc khi không yêu cầu',
        ],
    },
    {
        id: 'web_novel_cn',
        name: 'Web Novel Trung Quốc (chung)',
        icon: '📱',
        era: 'Hiện đại / Đô thị / Tu tiên',
        sentenceStyle: 'Nhịp nhanh, câu ngắn-vừa. Cliffhanger cuối chương. Đọc nghiện.',
        dialogueStyle: 'Đối thoại nhiều, nhanh, có khẩu khí phù hợp. Đám đông bàn tán thường xuyên.',
        descriptionStyle: 'Slap-face, power-up, đấu giá, tournament arc. Phản ứng đám đông là gia vị.',
        pacing: 'Cực nhanh — mỗi chương PHẢI tiến triển, PHẢI có hook kết thúc.',
        vocabulary: 'Web novel standard — dễ đọc, có thuật ngữ thể loại nhưng không nặng.',
        instruction: `【HỒ SƠ TÁC GIẢ: WEB NOVEL TRUNG QUỐC】
Phong cách tiểu thuyết mạng Trung Quốc chung — nhịp nhanh, đọc nghiện:

📌 NHỊP:
• NHANH. Mỗi chương phải có tiến triển rõ ràng.
• Cliffhanger cuối chương là BẮT BUỘC.
• Không được lê thê — cắt mọi thứ không phục vụ cốt truyện.

📌 GIA VỊ ĐẶC TRƯNG:
• "Slap face": kẻ khinh → nhân vật thể hiện → đám đông sốc → danh tiếng tăng.
• Phản ứng đám đông: "Toàn trường im phăng phắc. Rồi bùng nổ: 'Kim Đan kỳ?! Hắn mới 18 tuổi!'"
• Đấu giá / tournament / thi đấu: xây tension qua vòng loại → chung kết.

📌 POWER-UP:
• Đột phá phải có cảnh: thiên kiếp, biến đổi, aura bùng nổ.
• Phản ứng xung quanh khi nhân vật lộ sức mạnh: kinh ngạc → sợ hãi → kính nể.
• Có giá: mỗi lần mạnh hơn phải đánh đổi cái gì đó.

📌 ĐỐI THOẠI:
• Khẩu khí phù hợp: "Kẻ phế vật như ngươi cũng dám thách đấu bổn tiểu thư?"
• Nhân vật chính thường lạnh lùng hoặc tưng tửng.`,
        signatureExpressions: [
            'đạo hữu', 'tiền bối', 'tông môn', 'đan dược',
            'linh thạch', 'cảnh giới', 'thiên kiếp', 'thần khí',
        ],
        avoidExpressions: [
            'ngôn ngữ hiện đại phương Tây', 'slang Anh',
        ],
    },
    {
        id: 'light_novel_jp',
        name: 'Light Novel Nhật Bản',
        icon: '🎌',
        era: 'Hiện đại / Fantasy / Isekai',
        sentenceStyle: 'Ngôi thứ nhất, tự nhiên, có nội tâm hài hước. Nhịp linh hoạt.',
        dialogueStyle: 'Đối thoại nhiều (60%+), tự nhiên, hay bông đùa. Tsukkomi/boke rõ ràng.',
        descriptionStyle: 'Mô tả vừa đủ, tập trung cảm xúc và phản ứng. Status window khi cần.',
        pacing: 'Trung bình-nhanh — xen hành động với slice-of-life chiến thuật.',
        vocabulary: 'Nhẹ nhàng, đời thường, có thuật ngữ game/isekai khi phù hợp.',
        instruction: `【HỒ SƠ TÁC GIẢ: LIGHT NOVEL NHẬT BẢN】
Phong cách Light Novel Nhật — nhẹ nhàng, hài, đối thoại nhiều:

📌 NGÔI KỂ:
• Ngôi thứ nhất ưu tiên — giọng văn tự nhiên, thân thiện.
• Nội tâm MC hài hước, tự giễu: "Nghĩ lại thì sao mình lại đồng ý...?"

📌 ĐỐI THOẠI:
• Chiếm 60%+ nội dung — đối thoại là linh hồn.
• Tsukkomi rõ: "Khoan, tại sao công chúa lại đứng trong bếp?!"
• Nhân vật có cách nói riêng: nàng thỏ nói nhỏ nhẹ, đứa bạn nói to huỵch.

📌 HÀNH ĐỘNG:
• Chiến đấu nhanh, rõ ràng — skill name → hiệu ứng → kết quả.
• Status window khi cần: [HP: 120/350, MP: 15/200]
• Không quá nghiêm túc — có thể hài giữa trận đấu.

📌 SLICE-OF-LIFE:
• Xen kẽ chiến đấu với đời thường: nấu ăn, mua sắm, xây nhà.
• Chi tiết nhỏ dễ thương tạo sự gắn kết.`,
        signatureExpressions: [
            'status', 'skill', 'level up', 'party', 'dungeon',
            'guild', 'quest', 'adventurer', 'healer', 'tank',
        ],
        avoidExpressions: [
            'xưng hô Trung Quốc (đạo hữu, tiền bối)',
            'văn phong cổ phong Trung Hoa',
        ],
    },
    {
        id: 'korean_web',
        name: 'Web Novel Hàn Quốc',
        icon: '🇰🇷',
        era: 'Hiện đại / Hunter / Regression',
        sentenceStyle: 'Câu ngắn-vừa, nhịp nhanh, hành động nhiều. Twist nhiều.',
        dialogueStyle: 'Đối thoại ngắn gọn, lạnh lùng. MC ít nói, hành động nhiều.',
        descriptionStyle: 'Status window, skill activation, chiến đấu nhanh gọn. Ít mô tả cảnh vật.',
        pacing: 'Nhanh — arc ngắn, tiến triển rõ ràng, ít filler.',
        vocabulary: 'Hiện đại, có thuật ngữ game/hunter. Khẩu khí lạnh, tự tin.',
        instruction: `【HỒ SƠ TÁC GIẢ: WEB NOVEL HÀN QUỐC】
Phong cách Solo Leveling / Omniscient Reader — MC mạnh, lạnh, chiến lược:

📌 MC:
• Ít nói, hành động nhiều. Khi nói thì lạnh: "Tôi không hỏi ý kiến."
• Chiến lược, tính toán — không vào combat mà không có plan.
• Phát triển sức mạnh ổn định — mỗi arc MC mạnh hơn nhưng đối thủ cũng mạnh hơn.

📌 HỆ THỐNG:
• Status rõ ràng: [STR: 250 (+30), AGI: 180, INT: 120]
• Skill activation cụ thể: "【Shadow Exchange】 activated."
• Rank: E → D → C → B → A → S → SS → SSS → National Level.

📌 CHIẾN ĐẤU:
• Nhanh, sạch, tactical. Không kéo dài chiến đấu vô nghĩa.
• Mô tả skill + hiệu ứng + kết quả: "【Dagger Rush】— ba vệt sáng xé qua bóng tối. Boss lảo đảo."
• Twist chiến đấu: đối thủ mạnh hơn dự kiến → MC phải thay đổi chiến thuật.

📌 NHỊP:
• Arc ngắn (10-20 chương). Mỗi arc có boss, có reward.
• Ít filler — mọi chương phải tiến triển.`,
        signatureExpressions: [
            'hunter', 'gate', 'dungeon', 'raid', 'boss',
            'guild master', 'S-rank', 'awakened', 'skill',
        ],
        avoidExpressions: [
            'xưng hô Trung Quốc', 'tu luyện kiểu tiên hiệp',
            'nhịp quá chậm', 'triết lý dài dòng',
        ],
    },
];

/**
 * Get an author profile by ID.
 * @param {string} id 
 * @returns {Object|null}
 */
export function getAuthorProfile(id) {
    if (!id) return null;
    return AUTHOR_PROFILES.find(p => p.id === id) || null;
}

/**
 * Build author instruction for injection into system prompt.
 * Reads story.authorProfile field.
 * @param {Object} story 
 * @returns {string}
 */
export function buildAuthorInstruction(story) {
    if (!story?.authorProfile) return '';

    // Custom author profile: use story's custom text
    if (story.authorProfile === 'custom' && story.customAuthorInstruction?.trim()) {
        return `\n\n══════════════════════════════════════════════════
【HỒ SƠ TÁC GIẢ — TÙY CHỈNH】
══════════════════════════════════════════════════
${story.customAuthorInstruction.trim()}`;
    }

    const profile = getAuthorProfile(story.authorProfile);
    if (!profile?.instruction) return '';

    let result = `\n\n══════════════════════════════════════════════════
${profile.instruction}
══════════════════════════════════════════════════`;

    // Append signature/avoid expressions
    if (profile.signatureExpressions?.length > 0) {
        result += `\n\n📌 TỪ VỰNG ĐẶC TRƯNG (khuyến khích dùng): ${profile.signatureExpressions.join(', ')}`;
    }
    if (profile.avoidExpressions?.length > 0) {
        result += `\n❌ CẦN TRÁNH: ${profile.avoidExpressions.join(', ')}`;
    }

    return result;
}
