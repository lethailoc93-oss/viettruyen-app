// ================================================
// Mock AI Responses — used when no API key is set
// ================================================

export const mockResponses = {
    continueStory(characterNames) {
        const suggestions = [
            `${characterNames} nhìn ra ngoài cửa sổ, ánh sáng ban mai len lỏi qua khe màn. Một ngày mới bắt đầu với những bí ẩn chưa được giải đáp.`,
            `Không khí trở nên căng thẳng. ${characterNames} cảm nhận được điều gì đó không ổn, như thể có ai đó đang theo dõi mình từ trong bóng tối.`,
            `Đột nhiên, một tiếng động lạ vang lên. ${characterNames} giật mình quay lại, tim đập thình thịch trong lồng ngực.`,
            `Ký ức về quá khứ ùa về. ${characterNames} nhớ lại những gì đã xảy ra, và mọi thứ bắt đầu có ý nghĩa.`,
            `"Tôi phải tìm ra sự thật," ${characterNames} tự nhủ, quyết tâm lóe sáng trong đôi mắt.`
        ];
        return suggestions[Math.floor(Math.random() * suggestions.length)];
    },

    generateOutline(genre) {
        const outlines = {
            fantasy: `DÀN Ý TRUYỆN GIẢ TƯỞNG:\n\n1. Khởi đầu: Giới thiệu thế giới và nhân vật chính\n2. Biến cố: Nhân vật khám phá sức mạnh đặc biệt\n3. Hành trình: Bắt đầu cuộc phiêu lưu\n4. Thử thách: Đối mặt với chướng ngại lớn\n5. Cao trào: Trận chiến cuối cùng\n6. Kết thúc: Giải quyết xung đột`,
            romance: `DÀN Ý TRUYỆN TÌNH CẢM:\n\n1. Gặp gỡ: Hai nhân vật chính gặp nhau\n2. Thu hút: Dần cảm thấy hấp dẫn\n3. Tiến triển: Quan hệ phát triển\n4. Xung đột: Hiểu lầm đẩy xa nhau\n5. Nhận ra: Cả hai nhận ra tình cảm thật\n6. Hòa giải: Đến với nhau`,
            mystery: `DÀN Ý TRUYỆN BÍ ẨN:\n\n1. Vụ án: Giới thiệu bí ẩn\n2. Điều tra: Thu thập manh mối\n3. Rắc rối: Manh mối mâu thuẫn\n4. Bước ngoặt: Phát hiện quan trọng\n5. Phá án: Vạch trần thủ phạm\n6. Kết thúc: Giải thích động cơ`,
            default: `DÀN Ý CHUNG:\n\n1. Mở đầu: Giới thiệu bối cảnh\n2. Phát triển: Xây dựng mối quan hệ\n3. Vướng mắc: Xuất hiện vấn đề\n4. Leo thang: Căng thẳng gia tăng\n5. Cao trào: Đỉnh điểm xung đột\n6. Hồi kết: Giải quyết vấn đề`
        };
        return outlines[genre] || outlines.default;
    },

    suggestCharacter() {
        const suggestions = [
            { name: 'Nhân vật phản diện bí ẩn', description: 'Có vẻ tốt bụng nhưng ẩn chứa động cơ đen tối.' },
            { name: 'Người cố vấn thông thái', description: 'Lớn tuổi giàu kinh nghiệm, có quá khứ đau thương.' },
            { name: 'Người bạn trung thành', description: 'Luôn bên cạnh, vui vẻ nhưng can đảm khi cần.' },
            { name: 'Kẻ thù trở thành đồng minh', description: 'Ban đầu đối đầu nhưng có chung mục tiêu lớn hơn.' }
        ];
        const s = suggestions[Math.floor(Math.random() * suggestions.length)];
        return `💡 GỢI Ý NHÂN VẬT:\n\n${s.name}\n\n${s.description}`;
    },

    suggestPlot() {
        const suggestions = [
            'Một bí mật từ quá khứ được vạch trần, đảo lộn mọi thứ.',
            'Nhân vật chính phải đưa ra lựa chọn khó khăn.',
            'Một sự kiện may mắn hóa ra là cái bẫy.',
            'Mối quan hệ bị đe dọa bởi hiểu lầm hoặc phản bội.'
        ];
        return `💡 GỢI Ý CỐT TRUYỆN:\n\n${suggestions[Math.floor(Math.random() * suggestions.length)]}`;
    },

    improveWriting() {
        return `✨ GỢI Ý CẢI THIỆN VĂN PHONG:\n\n• Sử dụng nhiều chi tiết cảm giác\n• Thay đổi độ dài câu để tạo nhịp điệu\n• Sử dụng đối thoại thể hiện tính cách\n• Hiển thị cảm xúc qua hành động\n• Tạo hình ảnh ẩn dụ độc đáo`;
    },

    chapterOutline() {
        return '📖 GỢI Ý CẤU TRÚC CHƯƠNG:\n\nChương 1: Lời mở đầu - Giới thiệu nhân vật chính\nChương 2: Biến cố - Sự kiện thay đổi cuộc đời\nChương 3: Hành trình bắt đầu\nChương 4: Gặp gỡ đồng minh\nChương 5: Thử thách đầu tiên\nChương 6: Khám phá sự thật\nChương 7: Cao trào\nChương 8: Giải quyết\nChương 9: Hồi kết';
    },

    sceneOutline() {
        return '🎬 GỢI Ý CẤU TRÚC CẢNH:\n\nCảnh 1: Mở đầu - Thiết lập bầu không khí\nCảnh 2: Đối thoại quan trọng\nCảnh 3: Hành động - Diễn biến chính\nCảnh 4: Xung đột - Căng thẳng leo thang\nCảnh 5: Bước ngoặt\nCảnh 6: Phản ứng\nCảnh 7: Kết thúc - Chuyển tiếp';
    },

    summarizeChapter(chapterTitle) {
        return `📝 TÓM TẮT CHƯƠNG: ${chapterTitle || 'Chương hiện tại'}\n\nChương mở đầu với việc giới thiệu bối cảnh và tình huống. Nhân vật chính đối mặt với thử thách mới, dẫn đến những quyết định quan trọng. Qua các cuộc đối thoại và hành động, cốt truyện được đẩy tiến về phía trước. Chương kết thúc với một bước ngoặt bất ngờ, mở ra hướng phát triển mới cho câu chuyện.`;
    },

    generateSceneDescription() {
        const scenes = [
            '🎨 MÔ TẢ CẢNH:\n\nÁnh nắng chiều xuyên qua tán lá, tạo nên những vệt sáng vàng rực rỡ trên mặt đất. Gió nhẹ mang theo hương hoa dại, lay động những cánh hoa mỏng manh bên vệ đường. Không gian yên bình nhưng ẩn chứa sự căng thẳng không thể giải thích.',
            '🎨 MÔ TẢ CẢNH:\n\nCăn phòng chìm trong bóng tối, chỉ có ánh đèn dầu leo lắt trên bàn. Những bức tường cũ kỹ phủ đầy rêu mốc, mùi ẩm mốc quyện với mùi giấy cũ. Tiếng mưa rơi đều đều ngoài cửa sổ tạo nên một bản nhạc u ám.',
            '🎨 MÔ TẢ CẢNH:\n\nKhu chợ sáng sớm nhộn nhịp với tiếng rao hàng và mùi thức ăn thơm lừng. Những sạp hàng đầy ắp trái cây tươi ngon, rau xanh mướt. Con đường lát đá cuội ướt sương, phản chiếu ánh đèn lồng đỏ rực.'
        ];
        return scenes[Math.floor(Math.random() * scenes.length)];
    },

    rewriteText() {
        return '✏️ VIẾT LẠI:\n\nĐoạn văn được viết lại với phong cách mới, giữ nguyên ý nghĩa nhưng thay đổi giọng văn cho phù hợp hơn.';
    },

    expandText() {
        return '📝 MỞ RỘNG:\n\nĐoạn văn đã được mở rộng thêm chi tiết mô tả, cảm xúc nhân vật, và bối cảnh xung quanh để tạo chiều sâu cho câu chuyện.';
    },

    condenseText() {
        return '📋 TÓM TẮT:\n\nĐoạn văn đã được rút gọn, giữ lại những ý chính và loại bỏ các chi tiết thừa.';
    },

    suggestWordtune() {
        return [
            'Ánh nắng buổi chiều len lỏi qua khe cửa, phủ lên căn phòng một lớp vàng nhạt ấm áp.',
            'Nắng chiều xuyên qua cửa sổ, tô điểm không gian bằng những vệt sáng dịu dàng.',
            'Tia nắng cuối ngày lọt qua kẽ cửa, rải xuống sàn nhà những đốm vàng lung linh.'
        ];
    }
};
