// ================================================
// Story Difficulty — Mức độ nghiệt ngã của câu chuyện
// Tham khảo từ Dreammini✯Beyond Gemini Preset (6 levels → giản lược 4)
// ================================================

/**
 * 4 mức difficulty ảnh hưởng cách AI viết sự kiện, hậu quả, và kết cục.
 */
export const DIFFICULTY_LEVELS = [
    {
        id: 'optimistic',
        name: 'Tích cực',
        icon: '☀️',
        description: 'Nhân vật chính may mắn, tình huống nghiêng về phía tốt đẹp, kết cục tích cực.',
        instruction: `【ĐỘ KHÓ CÂU CHUYỆN: ☀️ TÍCH CỰC】
• Nhân vật chính THƯỜNG gặp may mắn — nhưng KHÔNG miễn phí (phải nỗ lực trước).
• Tình huống nguy hiểm luôn có LỐI THOÁT — dù phải tìm.
• Đồng minh xuất hiện kịp thời. Kẻ thù mắc sai lầm chiến thuật.
• Phản diện KHÔNG toàn tri — họ có blind spots hợp lý.
• Mất mát (nếu có) là tạm thời hoặc có thể phục hồi.
• Tone chung: hy vọng, nỗ lực được đền đáp, thiện thắng ác.`
    },
    {
        id: 'balanced',
        name: 'Cân bằng',
        icon: '⚖️',
        description: 'Thắng thua cân bằng, có thử thách nhưng cũng có phần thưởng. (Mặc định)',
        instruction: `【ĐỘ KHÓ CÂU CHUYỆN: ⚖️ CÂN BẰNG】
• Nhân vật chính phải NỖ LỰC để thắng — chiến thắng không dễ dàng.
• Mỗi lần thắng đi kèm MỘT CÁI GIÁ (thể lực, tài nguyên, mối quan hệ).
• Đồng minh hữu ích nhưng KHÔNG omnipotent — họ có giới hạn và mục tiêu riêng.
• Phản diện thông minh: có kế hoạch, có dự phòng, có lý do hợp lý.
• Thất bại xảy ra — nhưng nhân vật học được bài học để quay lại mạnh hơn.
• Tone chung: công bằng, nỗ lực + thông minh = kết quả.`
    },
    {
        id: 'realistic',
        name: 'Hiện thực',
        icon: '🎭',
        description: 'Thế giới thực, sai lầm phải trả giá, không có plot armor.',
        instruction: `【ĐỘ KHÓ CÂU CHUYỆN: 🎭 HIỆN THỰC】
• KHÔNG CÓ PLOT ARMOR — nhân vật chính có thể thua, bị thương nặng, mất người thân.
• Sai lầm dẫn đến HẬU QUẢ KHÔNG ĐẢO NGƯỢC: mất niềm tin, mất cơ hội, sẹo vĩnh viễn.
• Kẻ thù THÔNG MINH và NGUY HIỂM thực sự — không mắc lỗi ngớ ngẩn để nhân vật chính thắng.
• Đồng minh CÓ THỂ phản bội, thay đổi phe, hoặc hy sinh vì mục tiêu riêng.
• Chiến thắng đến từ CHUẨN BỊ + RỦI RO + HY SINH, không phải chỉ nỗ lực.
• Thế giới KHÔNG CHỜ nhân vật chính: sự kiện diễn ra dù nhân vật có can thiệp hay không.
• Tone chung: khắc nghiệt nhưng công bằng, hệ quả logic.`
    },
    {
        id: 'dark',
        name: 'Nghiệt ngã',
        icon: '🌑',
        description: 'Thế giới tàn khốc, hy vọng hiếm hoi, mỗi bước đi đều có rủi ro chết người.',
        instruction: `【ĐỘ KHÓ CÂU CHUYỆN: 🌑 NGHIỆT NGÃ】
• Thế giới TÀAN KHỐC — sống sót là thành tựu, không phải chiến thắng.
• Mọi hành động đều có RỦI RO CAO: đồng minh hôm nay = kẻ thù ngày mai.
• Phản diện CÓ THỂ THẮNG — và thắng một cách thuyết phục.
• Mất mát NGHIÊM TRỌNG và VĨNH VIỄN: người chết không sống lại, niềm tin phá vỡ không phục hồi.
• Nhân vật bị buộc vào LỰA CHỌN KHÔNG CÓ ĐÁP ÁN ĐÚNG — mọi con đường đều dẫn đến mất mát.
• Hy vọng HIẾM HOI nhưng CÓ TỒN TẠI — chính vì hiếm mà quý giá.
• Tone chung: u ám, tuyệt vọng nhen nhóm hy vọng nhỏ.
• ⚠️ QUAN TRỌNG: Không biến nghiệt ngã thành bi thảm vô nghĩa — mọi đau khổ phải phục vụ câu chuyện.`
    }
];

/**
 * Get difficulty level instruction by ID.
 * @param {string} level 
 * @returns {string}
 */
export function getDifficultyInstruction(level) {
    if (!level || level === 'balanced') return ''; // balanced is default, no injection needed
    const found = DIFFICULTY_LEVELS.find(d => d.id === level);
    return found?.instruction || '';
}

/**
 * Build difficulty instruction for injection into system prompt.
 * @param {Object} story 
 * @returns {string}
 */
export function buildDifficultyInstruction(story) {
    if (!story?.difficulty || story.difficulty === 'balanced') return '';
    const instruction = getDifficultyInstruction(story.difficulty);
    if (!instruction) return '';
    return `\n\n══════════════════════════════════════════════════
${instruction}
══════════════════════════════════════════════════`;
}
