// ================================================
// Style Templates — Thư viện phong cách văn
// Tham khảo từ Dreammini✯Beyond Gemini Preset
// ================================================

/**
 * 12 phong cách văn sẵn có.
 * Mỗi template chứa instruction sẽ được inject vào system prompt.
 */
export const STYLE_TEMPLATES = [
    {
        id: 'modern_urban',
        name: 'Đô thị hiện đại',
        icon: '🏙️',
        description: 'Văn phong hiện đại, nhịp nhanh, đối thoại tự nhiên, bối cảnh đô thị đương đại.',
        instruction: `【PHONG CÁCH VĂN: ĐÔ THỊ HIỆN ĐẠI】
Văn phong hiện thực, nhịp nhanh, trực tiếp. Đặc trưng:
• Đối thoại tự nhiên kiểu đời thường — có tiếng lóng, viết tắt, ngắt quãng, xen ngang.
• Miêu tả ngắn gọn, sắc bén — không hoa mỹ thừa, ưu tiên chi tiết "đặc trưng" thay vì liệt kê.
• Nhịp văn nhanh: câu ngắn xen kẽ câu trung bình. Đoạn ngắn, đối thoại nhiều.
• Cảm xúc thể hiện qua hành vi (nhắn tin, swiping, headphone) thay vì mô tả nội tâm dài.
• Bối cảnh: quán café, office, chung cư, đường phố, social media — đặt chi tiết đời sống vào tự nhiên.`
    },
    {
        id: 'wuxia_jin_yong',
        name: 'Võ hiệp Kim Dung',
        icon: '⚔️',
        description: 'Phong cách đại khí, hùng tráng, nghĩa khí giang hồ, chiêu thức tỉ mỉ.',
        instruction: `【PHONG CÁCH VĂN: VÕ HIỆP KIM DUNG】
Theo phong cách Kim Dung (金庸) — đại khí, khoáng đạt, nghĩa khí giang hồ. Đặc trưng:
• Mô tả chiêu thức chi tiết: tên chiêu, quỹ đạo, nội lực, phản ứng đối thủ.
• Đối thoại mang khẩu khí giang hồ — hào sảng, nghĩa liệt, hoặc xảo trá dưới vỏ lễ nghĩa.
• Miêu tả phong cảnh hùng vĩ: núi non, sông nước, miếu đường — dùng thiên nhiên phản ánh tâm cảnh.
• Nhân vật có chiều sâu: anh hùng không hoàn hảo, ác nhân có lý do riêng.
• Xen kẽ tường thuật lịch sử/truyền thuyết vào hành động tự nhiên.
• Dùng thành ngữ, điển tích — nhưng VỪA ĐỦ, không ép.
• Xưng hô: huynh, đệ, sư huynh, tiền bối, đại hiệp — tùy quan hệ.`
    },
    {
        id: 'wuxia_co_long',
        name: 'Võ hiệp Cổ Long',
        icon: '🗡️',
        description: 'Ngắn gọn, sắc lạnh, nhân vật cô độc, hành động nhanh, bất ngờ.',
        instruction: `【PHONG CÁCH VĂN: VÕ HIỆP CỔ LONG】
Theo phong cách Cổ Long (古龍) — sắc lạnh, gọn, bất ngờ. Đặc trưng:
• Câu CỰC NGẮN. Một hàng = một câu. Đôi khi chỉ một từ.
• Không mô tả chiêu thức chi tiết — chỉ kết quả: "Kiếm vung. Máu phun. Hắn đổ."
• Đối thoại sắc bén, ít lời, mỗi câu mang nhiều nghĩa.
• Nhân vật cô độc, lãnh đạm bề ngoài, nội tâm giấu kín.
• Bầu không khí u ám, căng thẳng — bóng tối, rượu, mưa, đêm.
• Twist liên tục: vừa ngỡ an toàn, đã gặp nguy.
• Triết lý giang hồ: sống chết, cô đơn, nghĩa vụ — ngắn gọn như châm ngôn.`
    },
    {
        id: 'light_novel_calm',
        name: 'Light Novel nhẹ nhàng',
        icon: '📖',
        description: 'Nhẹ nhàng, healing, slice-of-life, nhân vật dễ thương.',
        instruction: `【PHONG CÁCH VĂN: LIGHT NOVEL NHẸ NHÀNG】
Light novel Nhật kiểu slice-of-life/healing — ấm áp, thư giãn. Đặc trưng:
• Ngôi kể thứ nhất, giọng văn thân thiện, tự nhiên.
• Chi tiết đời thường: nấu ăn, đi dạo, mua sắm — biến chuyện nhỏ thành thú vị.
• Đối thoại nhiều, nhẹ nhàng, thường xuyên bông đùa.
• Nhịp chậm, thư thả — không vội vàng đến cao trào.
• Miêu tả cảm giác ấm áp: nắng chiều, gió nhẹ, mùi cơm, tiếng cười.
• Nhân vật bình thường sống cuộc sống bình thường — nhưng viết cho hay.`
    },
    {
        id: 'light_novel_comedy',
        name: 'Light Novel hài hước',
        icon: '😂',
        description: 'Tsukkomi/boke, tình huống hài, phá vỡ thứ tư, tempo nhanh.',
        instruction: `【PHONG CÁCH VĂN: LIGHT NOVEL HÀI HƯỚC】
Light novel hài kiểu Nhật — tsukkomi/boke, nhanh, sắc. Đặc trưng:
• TSUKKOMI: nhân vật chính liên tục phản ứng hài trước tình huống phi lý ("Khoan đã, tình huống gì thế này?!").
• Phóng đại có kiểm soát: cường điệu hành động/phản ứng để gây cười, nhưng không hỏng logic.
• Đối thoại chiếm 60%+ — ping-pong nhanh giữa các nhân vật.
• Nội tâm hài: nhân vật tự nhận xét/tự giễu liên tục.
• Tình huống ngớ ngẩn xảy ra tự nhiên từ tính cách nhân vật, KHÔNG bịa ép.
• Xen kẽ khoảnh khắc nghiêm túc bất ngờ giữa dòng hài → tạo chiều sâu.`
    },
    {
        id: 'ancient_elegant',
        name: 'Cổ phong thanh nhã',
        icon: '🏯',
        description: 'Cổ trang Trung Hoa, văn chương bán bạch thoại, thơ ca, ẩn dụ thiên nhiên.',
        instruction: `【PHONG CÁCH VĂN: CỔ PHONG THANH NHÃ】
Cổ phong Trung Hoa — bán bạch thoại, hoa lệ mà tinh tế. Đặc trưng:
• Ngôn ngữ bán bạch thoại: "Y cúi đầu, liền nói...", "Hắn chẳng thèm đáp."
• Dùng ẩn dụ thiên nhiên để tả tâm cảnh: hoa rụng → ly biệt, trăng tàn → thất vọng.
• Xen thơ/ca/phú NGẮN khi phù hợp — nhưng KHÔNG ép.
• Đối thoại lễ nghi nhưng ẩn sắc — "ngoài cười, trong rạn".
• Không gian: cung điện, sân vườn, hồ nước, trang viện — mô tả chi tiết kiến trúc/phục sức.
• Cảm xúc KHÔNG bộc lộ trực tiếp — gợi qua hành vi nhỏ (vuốt tóc, rót trà, nhìn xa).
• Xưng hô: ta, ngươi, nàng, y, hắn — tùy thân phận và quan hệ.`
    },
    {
        id: 'horror_psychological',
        name: 'Kinh dị tâm lý',
        icon: '👁️',
        description: 'Bầu không khí dồn nén, chi tiết sai lệch, nỗi sợ từ từ lan tỏa.',
        instruction: `【PHONG CÁCH VĂN: KINH DỊ TÂM LÝ】
Kinh dị tâm lý — sợ từ từ, từ bên trong. Đặc trưng:
• KHÔNG jump scare bằng mô tả — sợ bằng CHI TIẾT SAI LỆCH: "Bức ảnh gia đình trên tường có 5 người. Nhưng nhà chỉ có 4."
• Bầu không khí dồn nén: câu dài → đột ngột cắt ngắn. Nhịp thở bất thường.
• Giác quan bị bóp méo: nghe tiếng không có nguồn, thấy bóng ngoài tầm nhìn, mùi lạ không giải thích được.
• Nhân vật bắt đầu nghi ngờ chính mình: "Mình có thật sự thấy điều đó?"
• Cái bình thường bỗng trở nên đáng sợ: đồ vật quen thuộc ở sai vị trí, tiếng cười trong phòng trống.
• KHÔNG giải thích nguồn gốc nỗi sợ quá sớm — để nó treo lơ lửng.
• Kết đoạn bằng chi tiết gây bất an, KHÔNG bằng kết luận an toàn.`
    },
    {
        id: 'xuanhuan',
        name: 'Huyền huyễn Web Novel',
        icon: '🐉',
        description: 'Tu tiên, cấp bậc rõ ràng, slap-face, powerup, nhịp nhanh.',
        instruction: `【PHONG CÁCH VĂN: HUYỀN HUYỄN WEB NOVEL】
Huyền huyễn Trung Quốc — tu tiên, thăng cấp, đả kiểm. Đặc trưng:
• Hệ thống cấp bậc rõ ràng: Luyện Khí → Trúc Cơ → Kim Đan... (hoặc tùy worldbuilding).
• Chiến đấu mô tả linh lực, pháp bảo, chiêu thuật cụ thể — kèm phản ứng bàn tán ngoài lề.
• "Slap face" có logic: đối thủ khinh thường → nhân vật thể hiện → đám đông phản ứng → cô gái nghiêng đầu.
• Nhịp nhanh: mỗi chương PHẢI có ít nhất 1 sự kiện tiến triển.
• Đối thoại giang hồ tu chân: cuồng ngạo, khiêm tốn giả tạo, hoặc lão gian khôn.
• Xưng hô: đạo hữu, tiền bối, sư huynh, đồng đạo — tùy tu vi và quan hệ.
• Power-up phải có giá: tiêu hao, nguy hiểm, đánh đổi — KHÔNG miễn phí.`
    },
    {
        id: 'dark_realistic',
        name: 'Hiện thực u ám',
        icon: '🌧️',
        description: 'Trần trụi, không lý tưởng hóa, thế giới tàn nhẫn nhưng con người vẫn cố bám víu.',
        instruction: `【PHONG CÁCH VĂN: HIỆN THỰC U ÁM】
Hiện thực đen tối — trần trụi, không lý tưởng hóa. Đặc trưng:
• Không anh hùng — nhân vật là người thường với tham vọng, điểm yếu, và sai lầm.
• Hành động có hậu quả không thể đảo ngược: mất người, mất niềm tin, mất cơ hội.
• Đối thoại sống sượng, thô thiển khi cần — người ta không nói hay khi đang sợ hãi.
• Miêu tả chi tiết cảm giác khó chịu: đói, lạnh, mệt, bẩn — không che đậy.
• Bạo lực (nếu có) gây hậu quả thực: đau, sẹo, sang chấn tâm lý — KHÔNG phiêu diêu.
• Thế giới không công bằng: người tốt thua, người xấu thắng đôi khi.
• Nhưng PHẢI có khoảnh khắc nhân tính: chia sẻ bữa ăn, lời nói dối tốt, hy sinh nhỏ.`
    },
    {
        id: 'romance_sweet',
        name: 'Ngôn tình ngọt ngào',
        icon: '💕',
        description: 'Lãng mạn, tập trung vào tương tác cặp đôi, chi tiết ngọt ngào tinh tế.',
        instruction: `【PHONG CÁCH VĂN: NGÔN TÌNH NGỌT NGÀO】
Ngôn tình — đường sữa, tập trung vào cặp đôi. Đặc trưng:
• Tương tác cặp đôi chiếm 70%+ nội dung: đối thoại tán tỉnh, cử chỉ nhỏ, khoảnh khắc bất ngờ.
• Chi tiết ngọt ngào tinh tế: vô tình chạm tay, lén nhìn, mỉm cười khi đối phương không biết.
• TIM ĐỔNG: xây dựng tension từ từ — gần mà xa, thích mà không dám nói, hiểu nhầm đáng yêu.
• Đối thoại có "đấu khẩu lãng mạn": châm chọc → cười → xích lại gần.
• Miêu tả ngoại hình tinh tế: không liệt kê — gợi qua góc nhìn đối phương.
• Xen kẽ khoảnh khắc ngọt ngào với xung đột nhẹ → tránh nhàm chán.
• Cảm xúc thể hiện qua cử chỉ vô thức thay vì mô tả trực tiếp.`
    },
    {
        id: 'epic_fantasy',
        name: 'Fantasy sử thi',
        icon: '🏰',
        description: 'Tolkien-inspired, thế giới rộng lớn, ngôn ngữ trang trọng, cuộc chiến thiện ác.',
        instruction: `【PHONG CÁCH VĂN: FANTASY SỬ THI】
Fantasy sử thi — Tolkien-inspired, hùng tráng. Đặc trưng:
• Ngôn ngữ trang trọng, đôi khi cổ kính — nhưng PHẢI dễ hiểu cho người đọc hiện đại.
• Thế giới rộng lớn: nhiều chủng tộc, vương quốc, lịch sử ngàn năm — nhưng hé lộ từ từ.
• Chiến tranh/cuộc hành trình mô tả quy mô lớn: đoàn quân, phong cảnh, thời tiết, hậu cần.
• Nhân vật mang gánh nặng: sứ mệnh, tiên tri, trách nhiệm — đấu tranh giữa số phận và tự do ý chí.
• Phép thuật (nếu có) có LUẬT và GIỚI HẠN rõ ràng — không omnipotent.
• Đối thoại phản ánh địa vị xã hội: vua nói khác lính, nông dân nói khác pháp sư.
• Khoảnh khắc nhỏ giữa cuộc chiến lớn: bữa ăn bên lửa trại, kể chuyện, hát.`
    },
    {
        id: 'custom',
        name: 'Tùy chỉnh',
        icon: '✏️',
        description: 'Người dùng tự viết phong cách văn.',
        instruction: '' // User fills in
    }
];

/**
 * Get a style template by ID.
 * @param {string} id 
 * @returns {Object|null}
 */
export function getStyleTemplate(id) {
    if (!id || id === 'custom') return null;
    return STYLE_TEMPLATES.find(s => s.id === id) || null;
}

/**
 * Build style instruction for injection into system prompt.
 * @param {Object} story 
 * @returns {string}
 */
export function buildStyleInstruction(story) {
    if (!story?.styleTemplate) return '';

    // Custom style: use story's custom text
    if (story.styleTemplate === 'custom' && story.customStyleInstruction?.trim()) {
        return `\n\n══════════════════════════════════════════════════
【PHONG CÁCH VĂN — TÙY CHỈNH】
══════════════════════════════════════════════════
${story.customStyleInstruction.trim()}`;
    }

    const template = getStyleTemplate(story.styleTemplate);
    if (!template?.instruction) return '';

    return `\n\n══════════════════════════════════════════════════
${template.instruction}
══════════════════════════════════════════════════`;
}
