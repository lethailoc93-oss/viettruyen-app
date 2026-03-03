// ================================================
// Descriptor Library — Thư viện mô tả thông minh
// Thay thế sáo ngữ bằng hướng dẫn đa dạng hóa cho AI
// ================================================

/**
 * Mỗi category gồm:
 * - id: unique key
 * - label: tên hiển thị
 * - icon: emoji icon
 * - clicheList: danh sách cụm từ sáo cần tránh
 * - guideline: hướng dẫn viết thay thế
 * - examples: ví dụ viết hay
 */
export const DESCRIPTOR_CATEGORIES = [
    {
        id: 'appearance_skin',
        label: 'Ngoại hình — Da / Sắc mặt',
        icon: '🌸',
        clicheList: [
            'trắng như tuyết', 'da trắng mịn', 'da trắng nõn nà',
            'da ngọc ngà', 'trắng như sứ', 'trắng như trứng gà bóc',
            'da mịn như lụa', 'da trắng hồng', 'làn da mượt mà',
            'da trắng ngần', 'trắng nõn', 'trắng bóc',
        ],
        guideline: `KHÔNG DÙNG so sánh sáo (trắng như tuyết, da ngọc ngà). Thay vào đó:
• Mô tả qua ÁNH SÁNG: "Ánh nến hắt lên gò má, để lộ lớp da mỏng đến mức nhìn thấy mạch máu nhỏ bên dưới"
• Mô tả qua GÓC NHÌN nhân vật khác: "Hắn vô tình nhận ra vùng da dưới tai nàng hơi đỏ — dấu vết của ngượng ngùng hay rượu?"
• Mô tả qua XÚC GIÁC: "Mu bàn tay chạm vào, lạnh — như đã đứng ngoài trời lâu"
• Mô tả qua PHẢN ỨNG: hiện tượng cụ thể (ửng đỏ, tái nhợt, nổi da gà, lấm tấm mồ hôi)`,
        examples: [
            'Dưới ánh đèn vàng, gò má cô hơi lấp lánh — vệt phấn chưa tán đều hay mồ hôi khô, hắn không rõ.',
            'Lúc nàng quay đầu, vùng da sau gáy lộ ra một thoáng — mỏng tang, lấp ló đường gân xanh.',
            'Sắc mặt y chuyển nhanh — từ trắng bệch sang xám xịt chỉ trong một nhịp thở.',
        ]
    },
    {
        id: 'appearance_body',
        label: 'Ngoại hình — Thân thể',
        icon: '💃',
        clicheList: [
            'nhũ hoa hồng', 'bầu ngực căng tròn', 'eo thon',
            'chân dài miên man', 'dáng người mảnh khảnh',
            'thân hình nóng bỏng', 'đường cong gợi cảm',
            'body cực phẩm', 'vòng eo con kiến',
            'đôi gò bồng đảo', 'mông cong vút',
        ],
        guideline: `KHÔNG liệt kê bộ phận cơ thể như checklist. Thay vào đó:
• Mô tả qua CHUYỂN ĐỘNG: "Nàng vươn tay kéo rèm cửa, vạt áo hé lộ một đoạn eo — rồi buông xuống"
• Mô tả qua VẢI ÁO / TRANG PHỤC: "Chiếc áo lụa mỏng ôm theo hình thể khi gió thổi, phác họa rõ đường nét"
• Mô tả qua GÓC NHÌN hạn chế: nhân vật nhìn thoáng, không nhìn trân trối liệt kê
• Mô tả qua PHẢN ỨNG người xung quanh: ánh mắt liếc, im lặng đột ngột, nuốt nước bọt
• Gợi hơn tả — để trí tưởng tượng người đọc làm việc`,
        examples: [
            'Khi nàng cúi xuống nhặt quạt, chiếc áo choàng tuột khỏi vai một bên — cả căn phòng im lặng nửa nhịp.',
            'Lưng cô ấy thẳng, cái cách cô ấy đứng khiến chiếc váy lụa chảy theo đường xương sống như nước.',
            'Hắn vô tình nhìn, rồi quay đi ngay — nhưng hình ảnh bóng đổ trên vách tường, đường cong mềm mại trong ánh nến, đã kịp in vào đầu.',
        ]
    },
    {
        id: 'emotion_anger',
        label: 'Cảm xúc — Tức giận / Phẫn nộ',
        icon: '🔥',
        clicheList: [
            'gào thét trong lòng', 'mắt đỏ ngầu', 'mắt long lanh sát khí',
            'tức đến mức run rẩy', 'máu dồn lên mặt',
            'giận đến phát điên', 'nộ khí xung thiên',
            'nghiến răng ken két', 'cơn phẫn nộ bùng nổ',
        ],
        guideline: `KHÔNG gán nhãn cảm xúc trực tiếp (hắn tức giận). Thay vào đó:
• HÀNH VI CỤ THỂ: "Hắn đặt chén trà xuống — hơi mạnh tay, nước sóng ra ngoài"
• THAY ĐỔI GIỌNG NÓI: giọng trầm hẳn, hoặc nhẹ bất thường (nguy hiểm hơn la hét)
• HÀNH ĐỘNG VÔ THỨC: bẻ cây bút, miết ngón tay trên mặt bàn, bấm móng tay
• IM LẶNG: đôi khi im lặng đáng sợ hơn la hét — "Hắn không nói gì. Chỉ cười."
• SỰ KIỂM CHẾ (rồi mất kiểm soát): "Giọng y vẫn bình thường — cho đến khi bàn tay dưới bàn bóp nát chiếc cốc giấy"`,
        examples: [
            'Y mỉm cười, nhưng bàn tay dưới bàn đã bẻ gãy chiếc đũa mà không tự biết.',
            '"Không sao." Giọng hắn nhẹ bất thường. Nhẹ đến mức người phục vụ đi ngang cũng khựng lại.',
            'Cô không đập bàn, không hét. Cô chỉ gấp tờ đơn lại, thật chậm, thật gọn — rồi xé làm đôi.',
        ]
    },
    {
        id: 'emotion_sadness',
        label: 'Cảm xúc — Buồn / Mất mát',
        icon: '💧',
        clicheList: [
            'nước mắt lăn dài', 'tim như bị bóp nghẹt',
            'ký ức như thủy triều ập đến', 'đau nhức như xé toạc từng thớ thịt',
            'linh hồn run rẩy', 'cảm giác trống vắng bao trùm',
            'nỗi buồn sâu thẳm', 'trái tim tan vỡ',
        ],
        guideline: `KHÔNG dùng cường điệu cảm xúc. Thay vào đó:
• KHOẢNG LẶNG: "Cô ngừng ăn giữa chừng, đặt đũa xuống, nhìn ra cửa sổ — rồi tiếp tục."
• HÀNH ĐỘNG VÔ THỨC: gấp lại quần áo người đã mất, nấu phần ăn cho hai người dù chỉ còn một
• CHI TIẾT NHỎ: "Hắn vẫn để chiếc gối bên trái giường, dù không có ai nằm đó nữa."
• PHẢN ỨNG CƠ THỂ nhẹ: hơi thở sâu hơn, mắt nhìn xa, giọng trầm đi, nuốt nước bọt
• MÂU THUẪN hành vi: cười nhưng mắt không cười, nói bình thường nhưng tay run`,
        examples: [
            'Cô vẫn rửa bát đĩa như mọi hôm. Chỉ là hôm nay rửa lâu hơn. Lâu hơn rất nhiều.',
            'Hắn mở tin nhắn, gõ "Em ơi" — rồi ngồi nhìn con trỏ nhấp nháy suốt hai phút.',
            '"Bình thường mà." Y cười, nhưng đôi tay đang pha trà run nhẹ — tấm ảnh kế bên bình hoa đã được úp xuống từ bao giờ.',
        ]
    },
    {
        id: 'emotion_fear',
        label: 'Cảm xúc — Sợ hãi / Kinh hoàng',
        icon: '😱',
        clicheList: [
            'trán lấm tấm mồ hôi lạnh', 'toàn thân run rẩy',
            'đông cứng tại chỗ', 'không khí đặc quánh',
            'sống lưng lạnh toát', 'tim đập thình thịch',
            'máu trong người đông cứng', 'sợ đến mức chân mềm nhũn',
        ],
        guideline: `KHÔNG dùng khuôn mẫu (lạnh sống lưng, đông cứng). Thay vào đó:
• GIÁC QUAN BỊ BÓP MÉO: "Tiếng cười đó rõ quá — dù không ai trong phòng đang cười"
• PHẢN ỨNG CHÍNH XÁC: co rúm vai, ngón chân bấu vào đế giày, hơi thở ngắt quãng
• MÔI TRƯỜNG THAY ĐỔI: ánh đèn nhấp nháy, bóng di chuyển ở rìa tầm nhìn, mùi bất thường
• PHỦ NHẬN: "Không sao, chắc là gió." — nhưng tay đã khóa cửa từ lúc nào.
• TỐC ĐỘ VĂN thay đổi: câu dài chậm rãi → đột ngột câu ngắn cắt ngang`,
        examples: [
            'Cô quay lại. Cửa vẫn đóng. Nhưng — chiếc ghế giữa phòng không ở vị trí cũ.',
            '"Mình nhớ đã tắt đèn bếp." Cô tự nhủ, trong khi chân đang lùi dần về phía cầu thang.',
            'Giọng nói đó vang lên lần thứ hai. Lần này, hắn nhận ra — nó đến từ phía sau gương.',
        ]
    },
    {
        id: 'combat',
        label: 'Chiến đấu / Hành động',
        icon: '⚔️',
        clicheList: [
            'kiếm khí tung hoành', 'chiêu thức uy lực kinh người',
            'một chưởng uy lực nghiêng trời', 'sức mạnh bùng nổ',
            'chiến đấu kinh thiên động địa', 'máu nhuộm đỏ bầu trời',
            'khí thế áp đảo', 'thần uy bất phàm',
        ],
        guideline: `KHÔNG viết chung chung (chiêu thức uy lực, sức mạnh bùng nổ). Thay vào đó:
• KỸ THUẬT CỤ THỂ: "Kiếm chéo từ trái hạ phải, cắt góc 45°, nhắm đúng khe hở giữa giáp cổ và vai"
• HỆ QUẢ VẬT LÝ: "Cú đấm đẩy hắn lùi ba bước — bàn chân trái xoay, đầu gối chạm đất"
• CHIẾN THUẬT: "Ra đòn liên tục — không phải để hạ, mà để ép y về phía vách đá phía sau"
• CẢM GIÁC CƠ THỂ: mệt, đau, tay tê, mắt mờ, thở gấp — chiến đấu không miễn phí
• PHẢN ỨNG MÔI TRƯỜNG: sàn nứt, gió ép, bụi bay, nước bắn tung, cây gãy`,
        examples: [
            'Kiếm chém ngang — y nghiêng đầu vừa đủ, lưỡi kiếm gọt một nhúm tóc trước trán rơi xuống.',
            'Cú giáp mặt khiến khuỷu tay hắn tê rần. Cơ bắp chưa kịp phục hồi, đòn thứ hai đã đến — nhanh hơn đòn đầu.',
            'Nàng không chặn — quyết định trả đòn. Thanh kiếm xé gió cắt thẳng vào cánh tay cầm đao. Máu bắn ra, nhưng đối phương vẫn giữ được vũ khí — sai lầm thứ nhất: nàng đã đánh giá thấp ngưỡng chịu đau của hắn.',
        ]
    },
    {
        id: 'nsfw_sensual',
        label: 'Gợi cảm / Thân mật',
        icon: '🔥',
        clicheList: [
            'cự vật', 'hoa huyệt', 'long thương',
            'ngọc thỏ', 'huyền quan', 'tiểu huyệt',
            'bảo kiếm', 'đào hoa nguyệt',
            'da thịt cuộn vào nhau', 'đêm xuân',
        ],
        guideline: `KHÔNG dùng ẩn dụ cổ phong sáo rỗng (cự vật, hoa huyệt). Thay vào đó:
• TỪ VỰNG TRỰC TIẾP khi cần: dương vật, âm đạo, âm vật, bầu ngực — đúng tên gọi
• CẢM GIÁC THỰC: nhiệt, áp lực, nhịp, rung — mô tả xúc giác cụ thể
• PHẢN ỨNG SINH LÝ: nhịp thở, co cơ, mồ hôi, run, tiếng thở — thay vì kể
• MÔI TRƯỜNG: tiếng vải xào xạc, nhiệt từ cơ thể, mùi da — chi tiết giác quan
• NHỊP VĂN: Chậm lại, câu dài hơn bình thường, ngắt giữa chừng`,
        examples: [
            'Bàn tay cô trượt dọc sống lưng, đầu ngón tay ấn nhẹ vào rãnh cơ — lưng hắn cong lại theo bản năng.',
            'Hơi thở nóng phả vào cổ. Rồi môi. Rồi răng — rất nhẹ, vừa đủ để da gáy nổi sần.',
            'Cô siết chặt, đầu gối kẹp hông hắn — không phải vì đam mê, mà vì nếu buông ra, cô sẽ phải nhìn vào mắt anh.',
        ]
    },
    {
        id: 'scenery',
        label: 'Cảnh vật / Bầu không khí',
        icon: '🏔️',
        clicheList: [
            'cảnh đẹp hữu tình', 'không khí trong lành',
            'trăng sáng vằng vặc', 'gió thổi nhè nhẹ',
            'mây trắng bồng bềnh', 'hoa nở rực rỡ',
            'thiên nhiên tươi đẹp', 'sông núi hùng vĩ',
        ],
        guideline: `KHÔNG viết cảnh như postcard du lịch. Thay vào đó:
• 1-2 GIÁC QUAN nổi bật nhất: "Gió ẩm — mùi bùn và rong rêu, con sông đang dâng"
• CHI TIẾT CHỌN LỌC thay vì liệt kê: một bông hoa duy nhất tốt hơn "hoa nở rực rỡ"
• ÁNH SÁNG cụ thể: không "trăng sáng" mà "trăng chiếu xiên qua liếp cửa, vẽ vệt dài trên sàn"
• CẢNH PHẢN ÁNH TÂM TRẠNG: chọn chi tiết cảnh phù hợp cảm xúc nhân vật
• THAY ĐỔI THEO THỜI GIAN: cảnh buổi sáng khác buổi tối, mùa đông khác mùa hè`,
        examples: [
            'Tuyết rơi từ chiều — đến giờ đã phủ dày hai đốt ngón tay trên bệ cửa sổ. Bên trong, nước trà nguội ngắt.',
            'Con đường đất đỏ sau mưa dính bết vào đế giày. Mỗi bước đi đều kéo theo tiếng chóp chép nhẹ.',
            'Ánh nến lung linh trên mặt hồ — không rõ là nến từ thuyền hay từ đền bên kia bờ.',
        ]
    },
    {
        id: 'dialogue',
        label: 'Đối thoại / Giao tiếp',
        icon: '💬',
        clicheList: [
            'lạnh lùng nói', 'nhẹ nhàng đáp',
            'sắc mặt đanh lại', 'mỉm cười bí ẩn',
            'ánh mắt sắc như dao', 'giọng lạnh như băng',
            'nói với giọng đầy uy nghiêm', 'trầm giọng nói',
        ],
        guideline: `KHÔNG gán tag cảm xúc cho dialogue (lạnh lùng nói). Thay vào đó:
• ĐỂ LỜI THOẠI TỰ NÓI: nếu lời đủ sắc, không cần tag — "Ngươi muốn chết sao?"
• HÀNH ĐỘNG KÈM: "Hắn rót thêm trà cho y — 'Tiếp tục nói đi.'"
• NGỪNG NGHỈ: "Cô mở miệng — '...' — rồi đóng lại. Vài giây sau mới nói: 'Thôi, không có gì.'"
• ÂM SẮC CỤ THỂ: khàn, run, nhỏ dần, cao lên — thay vì "giọng lạnh"
• PHI NGÔN NGỮ: gãi cổ, tránh mắt, gõ ngón tay — hành vi nói nhiều hơn lời`,
        examples: [
            '"À." Hắn chỉ nói thế. Nhưng cách y đặt ly rượu xuống bàn — nhẹ đến bất thường — khiến cả bàn im lặng.',
            '"Em biết rồi." Nàng cười, tay vẫn đang gấp quần áo — nhưng tốc độ chậm hẳn.',
            '"..." Cô không đáp. Chỉ tay xé dần mép giấy ăn, bỏ từng mảnh nhỏ vào ly nước.',
        ]
    },
];

/**
 * Get a descriptor category by ID.
 * @param {string} id 
 * @returns {Object|null}
 */
export function getDescriptorCategory(id) {
    return DESCRIPTOR_CATEGORIES.find(c => c.id === id) || null;
}

/**
 * Build descriptor instruction from selected category IDs.
 * @param {string[]} categoryIds - Array of category IDs to include
 * @param {string[]} customAvoidList - User's custom avoid list
 * @returns {string} Instruction block ready for injection
 */
export function buildDescriptorInstruction(categoryIds = [], customAvoidList = []) {
    if (categoryIds.length === 0 && customAvoidList.length === 0) return '';

    const parts = [];

    // Build category-specific instructions
    for (const id of categoryIds) {
        const cat = getDescriptorCategory(id);
        if (!cat) continue;

        parts.push(`【${cat.icon} ${cat.label.toUpperCase()}】
❌ CẤM dùng: ${cat.clicheList.slice(0, 6).map(c => `"${c}"`).join(', ')}...
✅ ${cat.guideline}

📝 Ví dụ hay:
${cat.examples.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);
    }

    // Custom avoid list
    if (customAvoidList.length > 0) {
        parts.push(`【🚫 CỤM TỪ TÁC GIẢ CẤM DÙNG】
${customAvoidList.map(c => `❌ "${c}"`).join('\n')}`);
    }

    if (parts.length === 0) return '';

    return `\n\n══════════════════════════════════════════════════
【TỐI ƯU MÔ TẢ — CHỐNG SÁO NGỮ NÂNG CAO】
Hướng dẫn dưới đây giúp AI viết mô tả ĐA DẠNG, SÁNG TẠO, tránh lặp lại khuôn mẫu.
══════════════════════════════════════════════════

${parts.join('\n\n---\n\n')}`;
}

/**
 * Build a compact descriptor instruction (for token-constrained contexts like roleplay).
 * Only includes cliche list and short guidelines, no examples.
 * @param {string[]} categoryIds 
 * @param {string[]} customAvoidList 
 * @returns {string}
 */
export function buildCompactDescriptorInstruction(categoryIds = [], customAvoidList = []) {
    if (categoryIds.length === 0 && customAvoidList.length === 0) return '';

    const allCliches = [];
    const guidelines = [];

    for (const id of categoryIds) {
        const cat = getDescriptorCategory(id);
        if (!cat) continue;
        allCliches.push(...cat.clicheList.slice(0, 4));
        // Extract first line of guideline
        const firstLine = cat.guideline.split('\n')[0];
        guidelines.push(`• ${cat.icon} ${firstLine}`);
    }

    if (customAvoidList.length > 0) {
        allCliches.push(...customAvoidList);
    }

    if (allCliches.length === 0) return '';

    return `\n[Tối ưu mô tả]
❌ CẤM: ${allCliches.map(c => `"${c}"`).join(', ')}
${guidelines.join('\n')}`;
}
