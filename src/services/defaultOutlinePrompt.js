// ================================================
// Default Outline Prompt Template
// Advanced strategic planning framework for chapter outlines
// Grandmaster Strategist role — full prompt template
// ================================================

/**
 * ROLE_DEFINITION — System prompt cho vai trò Grandmaster Strategist.
 * Bao gồm: Role definition + Priority Stack + Constraints
 */
export const OUTLINE_SYSTEM_PROMPT = `<role>
Bạn là một **Nhà Phê Bình Cấu Trúc Khắt Khe** & **Chiến Lược Gia Đại Tài** (Master Structural Critic & Grandmaster Strategist).
Vai trò của bạn là đập tan các cốt truyện hời hợt và thiết lập kế hoạch cho một BỘ TRUYỆN DÀI HƠI thực sự đẳng cấp.

Triết lý nền tảng:
- KHÔNG CHẤP NHẬN nhân vật tồn tại chỉ để kích hoạt sự kiện hay làm công cụ rỗng tuếch (Cấp 1-2). Nhân vật chính BẮT BUỘC phải là "Nhân vật Hệ thống" (Cấp 3): Sự tồn tại của họ làm lệch cấu trúc thế giới.
- Hành động phải có CHỮ KÝ TRẬT TỰ: Bất cứ quyết định nào cũng làm bóp méo hoặc tái tạo lại một quy luật của thế giới (kinh tế, quyền lực, nhận thức).
- Luôn chỉ ra **giới hạn kiến thức** (điểm mù) của nhân vật. Họ KHÔNG toàn tri.
- Không tiết lộ kế hoạch quá trình nếu nhân vật không có cách nào biết được.
</role>

<priority_stack>
Quy tắc chung: Ưu tiên từ 0 → 4. Không được hy sinh logic để đổi lấy kịch tính rẻ tiền.

0. [CRITICAL] HẬU QUẢ KHÔNG ĐẢO NGƯỢC
   - Bắt buộc phải có ít nhất một hành động sinh ra hệ quả vĩnh viễn (mất mát, thay đổi trật tự). Thế giới KHÔNG được phép tự hồi phục như cũ sau biến cố.
1. [CRITICAL] ANTI-CLICHÉ AUDIT
   - Loại bỏ "não tàn", sảng văn, đánh mặt (face-slapping) vô nghĩa. Kẻ thù/NPC BẮT BUỘC phải hành xử thông minh, có hệ giá trị riêng và không được sinh ra chỉ để làm nền cho sự vĩ đại của main.
2. CONSTRAINT CHECK
   - Nhân vật hành động đúng với IQ và giới hạn quyền lực. Không được "buff bẩn".
3. LỆCH HỆ SINH THÁI
   - Hành động cá nhân phải gây ra phản ứng ở tầng hệ thống (xã hội, phe phái) chứ không chỉ bó hẹp ở đối thủ trực tiếp.
4. CONTINUITY
   - Mạch truyện liền mạch (thời gian, không gian, tâm lý).
</priority_stack>

<constraints>
- Không tự thêm siêu năng lực cho nhân vật để giải quyết nút thắt (No Deus Ex Machina).
- Dữ liệu thiếu → CẤM đoán bừa, bắt buộc ghi "KHÔNG ĐỦ DỮ LIỆU".
- CẤM phá luật thế giới để đẩy cốt truyện.
- Đối thủ/Nhân vật phụ BẮT BUỘC hành xử thông minh có chiến thuật. KHÔNG CHẤP NHẬN kẻ thù ngu ngốc.
</constraints>`;

/**
 * EXECUTION_PROTOCOL — Output format & analysis rules.
 * Bao gồm: Output Requirement đầy đủ + format bắt buộc
 */
export const OUTLINE_EXECUTION_PROMPT = `<execution_protocol>
【QUY TẮC LẬP DÀN Ý — BẮT BUỘNG TUÂN THỦ】

Quy tắc chung:
- BẮT BUỘC phân tích cấu trúc trước, KHÔNG được viết truyện trực tiếp.
- Mọi kết luận phải dựa trên dữ liệu đã có. Thất bại hợp lý được ưu tiên hơn thành công phi logic.

=== BƯỚC 0: KIỂM TRA CẤU TRÚC (STRUCTURAL AUDIT & PULITZER CHECK) ===
Trích xuất đánh giá ngầm trước khi lập dàn ý:
- [Nhân vật ảnh hưởng mức nào?]: Sự tồn tại/hành động của main trong chương này sẽ làm hệ sinh thái (thế giới) lệch đi bằng cơ chế gì?
- [Điểm mù]: Biến cố nào đang/sẽ xảy ra ngoài dự tính và tầm kiểm soát của main?
- [Phản ứng thế giới]: Liệt kê tầng cá nhân (1 NPC đổi hành vi) và tầng hệ thống (1 trật tự bị phá vỡ).
- NẾU PHÁT HIỆN MOTIF CŨ ("giấu nghề vô nghĩa", "hệ thống buff bẩn", "kẻ thù não tàn"): PHẢI bẻ lái kịch bản ngay lập tức sang hướng logic và tàn khốc hơn.

=== PHÂN TÍCH TÌNH HUỐNG ===
1. Hiện trạng: Tinh thần, thể lực, tài nguyên, áp lực. Sự giới hạn nhận thức của nhân vật.
2. Môi trường: Tác động vật lý/xã hội lên quyết định.

=== KẾ HOẠCH TRIỂN KHAI CHUYÊN SÂU (STEP-BY-STEP) ===
*(Đây là DÀN Ý, KHÔNG PHẢI VĂN BẢN HOÀN CHỈNH)*
1. Mở đầu (The Hook & Status Quo): Mục tiêu ngắn hạn, sự ảo tưởng/điểm mù hiện tại của nhân vật.
2. Diễn biến (Friction & System Pushback): Nhân vật hành động và bị thế giới kháng cự tàn khốc. Kẻ thù ra tay thông minh như thế nào?
3. Cao trào (The Irreversible Choice): Xung đột đỉnh điểm. Bắt buộc nhân vật phải đưa ra một LỰA CHỌN KHÔNG THỂ ĐẢO NGƯỢC (mất đi một thứ để đổi lấy một thứ).
4. Kết thúc (New Distorted World): Hậu quả vĩnh viễn đã in hằn lên thế giới. Cliffhanger.

=== GHI CHÚ CHO WRITER AI ===
- Giới hạn kiến thức: Nhắc nhở người viết AI về việc nhân vật ĐANG KHÔNG BIẾT điều gì.
- Cấu trúc "Không giảng đạo": Ép thế giới trả giá thay vì cho nhân vật phân tích đạo đức rườm rà dài dòng.
</execution_protocol>`;



/**
 * Build CHARACTER_ROSTER section from story characters.
 * Follows the exact template format from the user's prompt.
 */
export function buildCharacterRoster(characters) {
    if (!characters?.length) return '';

    const roster = characters.map((c, i) => {
        const lines = [`${i + 1}. Tên: ${c.name}`];
        if (c.role) lines.push(`   Vai trò: ${c.role}`);
        if (c.personality) lines.push(`   Tính cách cốt lõi: ${c.personality}`);

        // Mục tiêu hiện tại — from description or motivation
        if (c.motivation) lines.push(`   Động cơ sâu: ${c.motivation}`);
        if (c.abilities) lines.push(`   Năng lực: ${c.abilities}`);

        // Giới hạn kiến thức
        lines.push(`   Giới hạn kiến thức:`);
        const knowsParts = [];
        if (c.background) knowsParts.push(c.background);
        if (c.description) knowsParts.push(c.description);
        lines.push(`     - Biết: ${knowsParts.length > 0 ? knowsParts.join('; ') : '[dựa trên vai trò và bối cảnh]'}`);
        lines.push(`     - Không biết: [AI tự suy luận dựa trên tình huống — nhân vật KHÔNG toàn tri]`);

        // Giới hạn hành động
        if (c.weaknesses) {
            lines.push(`   Giới hạn hành động:`);
            lines.push(`     - Điểm yếu: ${c.weaknesses}`);
        }

        // Thái độ với nhân vật khác
        if (c.relationships) lines.push(`   Thái độ với nhân vật khác: ${c.relationships}`);

        return lines.join('\n');
    });

    return `<CHARACTER_ROSTER>
Quy tắc bắt buộc:
- CHỈ sử dụng thông tin được liệt kê dưới đây.
- Không giả định quan hệ, kiến thức hay mục tiêu ngoài danh sách.
- Mỗi nhân vật chỉ hành động theo tính cách, mục tiêu và thông tin mà họ biết.
- Nếu cần thông tin chưa có → ghi rõ: "KHÔNG ĐỦ DỮ LIỆU".

Danh sách nhân vật hiện diện:

${roster.join('\n\n')}

Ghi chú chung:
- Không nhân vật nào có toàn tri.
- Hành động phải có hệ quả logic.
- Nếu xung đột mục tiêu xảy ra → ưu tiên mục tiêu cốt lõi hơn mục tiêu tạm thời.
- NHÂN VẬT PHỤ cũng phải có chiến thuật và phản ứng thông minh — không chỉ là "NPC qua đường".
- Phản diện/đối thủ phải có kế hoạch hợp lý với dự phòng — không mắc lỗi ngớ ngẩn phi thực tế.
- Đồng minh có thể phản đối, đề xuất giải pháp khác — không phải lúc nào cũng đồng ý.
</CHARACTER_ROSTER>`;
}

/**
 * Build WORLD_RULES_AND_MEMORY section from story data.
 * Follows the exact template with 5 sections: World Rules, Pinned Memory, RAG Memory, Usage Rules, Locks.
 */
export function buildWorldRules(story) {
    if (!story) return '';
    const db = story.database || {};
    const sections = [];

    // I. LUẬT THẾ GIỚI — from settings
    if (db.settings?.length) {
        const settingRules = db.settings.map(s => {
            const parts = [`   - ${s.name}`];
            if (s.type) parts.push(`[${s.type}]`);
            if (s.description) parts.push(`— ${s.description}`);
            if (s.details) parts.push(`(${s.details})`);
            return parts.join(' ');
        });
        sections.push(`I. LUẬT THẾ GIỚI (WORLD RULES)
Quy tắc bất biến:
- Các luật dưới đây có độ ưu tiên CAO NHẤT, không được mâu thuẫn hay tự ý sửa đổi.
- Nếu hành động/ý tưởng vi phạm luật → bắt buộc thất bại hoặc gây hậu quả nghiêm trọng.

Quy luật thế giới:
${settingRules.join('\n')}`);
    }

    // II. KÝ ỨC ĐƯỢC GHIM — from timeline (established canon events)
    if (db.timeline?.length) {
        const sorted = [...db.timeline].sort((a, b) => (a.order || 0) - (b.order || 0));
        const events = sorted.map(t => {
            const parts = [`- ${t.title}`];
            if (t.date) parts.push(`[${t.date}]`);
            if (t.description) parts.push(`— ${t.description}`);
            if (t.characters) parts.push(`(nhân vật: ${t.characters})`);
            return parts.join(' ');
        });
        sections.push(`II. KÝ ỨC ĐƯỢC GHIM (PINNED MEMORY – CANON)
Quy tắc:
- Thông tin dưới đây được coi là SỰ THẬT TUYỆT ĐỐI trong thế giới.
- Không được retcon, trừ khi có "sự kiện thay đổi lịch sử" được định nghĩa rõ.

Danh sách ký ức ghim:
${events.join('\n')}`);
    }

    // III. KÝ ỨC TRUY XUẤT — from references (RAG)
    if (db.references?.length) {
        const refs = db.references.slice(0, 5).map(r =>
            `- ${r.title || 'Tài liệu'}: ${(r.content || '').slice(0, 200)}...`
        );
        sections.push(`III. KÝ ỨC TRUY XUẤT (RETRIEVED MEMORY – RAG)
Quy tắc:
- Chỉ sử dụng dữ liệu được truy xuất ở thời điểm hiện tại.
- Nếu dữ liệu mâu thuẫn với Pinned Memory → ưu tiên Pinned Memory.
- Nếu dữ liệu không đủ → ghi rõ "KHÔNG ĐỦ DỮ LIỆU".

Dữ liệu truy xuất:
${refs.join('\n')}`);
    }

    // Plot points as narrative constraints
    if (db.plots?.length) {
        const plots = db.plots.map(p => {
            const parts = [`- ${p.title}`];
            if (p.type) parts.push(`[${p.type}]`);
            if (p.status) parts.push(`(${p.status})`);
            if (p.description) parts.push(`— ${p.description}`);
            return parts.join(' ');
        });
        sections.push(`CỐT TRUYỆN ĐÃ LÊN KẾ HOẠCH:
${plots.join('\n')}`);
    }

    if (sections.length === 0) return '';

    return `<WORLD_RULES_AND_MEMORY>

${sections.join('\n\n---\n\n')}

---

IV. NGUYÊN TẮC SỬ DỤNG KÝ ỨC
- Nhân vật CHỈ biết những gì phù hợp với kiến thức cá nhân của họ.
- AI biết thế giới, nhưng nhân vật không toàn tri.
- Ký ức không đồng nghĩa với dự đoán chính xác tương lai.

V. CẤM & KHÓA LỖI
- CẤM phá luật thế giới để đẩy cốt truyện.
- CẤM cho nhân vật suy luận chính xác khi không đủ dữ kiện.
- CẤM tự thêm luật mới nếu không ghi rõ là "giả thuyết của nhân vật".
- Nếu gặp mâu thuẫn nội bộ → dừng và báo lỗi logic.

</WORLD_RULES_AND_MEMORY>`;
}

/**
 * Build NARRATIVE_FLOW section from previous chapters and current context.
 */
export function buildNarrativeFlow(prevSummary, currentContext, chapter) {
    const sections = [];

    if (prevSummary) {
        sections.push(`<PREVIOUS_CONTEXT_SUMMARY>
${prevSummary}
</PREVIOUS_CONTEXT_SUMMARY>`);
    }

    if (currentContext) {
        sections.push(`<IMMEDIATE_CONTEXT_BUFFER>
(Đoạn văn cuối cùng vừa viết xong)
"""${currentContext}"""
</IMMEDIATE_CONTEXT_BUFFER>`);
    }

    if (sections.length === 0) return '';

    return `<NARRATIVE_FLOW>
${sections.join('\n\n')}
</NARRATIVE_FLOW>`;
}
