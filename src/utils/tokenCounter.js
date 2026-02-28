// ================================================
// Token Counter Utility
// ================================================

/**
 * Đếm số lượng token ước tính cho một chuỗi văn bản tiếng Việt/Anh.
 * Thuật toán ước lượng nhanh:
 * - Trung bình tiếng Anh: 1 từ ~ 1.3 tokens
 * - Trung bình tiếng Việt (nhiều dấu, từ ghép): 1 từ ~ 1.5 - 2 tokens
 * 
 * Ở đây dùng mức an toàn trung bình 1.5 token / từ.
 * 
 * @param {string} text - Văn bản cần đếm
 * @returns {number} Số token ước lượng
 */
export function estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;

    // Đếm số ký tự (cách ước lượng thay thế: 1 token ~ 4 ký tự)
    // Đếm số từ theo khoảng trắng
    // Chúng ta lấy giá trị lớn hơn giữa (số ký tự / 3.5) và (số từ * 1.5)

    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    const fromChars = Math.ceil(charCount / 3.5);
    const fromWords = Math.ceil(wordCount * 1.5);

    return Math.max(fromChars, fromWords);
}

/**
 * Truncate một văn bản để phù hợp với giới hạn token.
 * 
 * @param {string} text - Văn bản đầu vào
 * @param {number} maxTokens - Giới hạn token tối đa
 * @returns {string} Văn bản đã bị cắt bớt nếu vượt quá giới hạn
 */
export function truncateToTokens(text, maxTokens) {
    if (!text) return '';
    const currentTokens = estimateTokens(text);

    if (currentTokens <= maxTokens) {
        return text;
    }

    // Tỉ lệ cần cắt
    const ratio = maxTokens / currentTokens;
    // Cắt theo số lượng từ để không bị đứt gãy chữ
    const words = text.trim().split(/\s+/);
    const splitIndex = Math.floor(words.length * ratio * 0.95); // Lấy 95% cho an toàn

    return words.slice(0, splitIndex).join(' ') + '... [Đã cắt bớt do quá giới hạn]';
}
