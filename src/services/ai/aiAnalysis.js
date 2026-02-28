// ================================================
// AI Analysis Module — suggestions, scanning, consistency
// ================================================

import { buildRAGContext, buildRAGContextWithEmbeddings, buildSystemInstruction } from '../ragService';
import { getGenreReminder } from '../genrePrompts';
import { callOrbitAPI, callSmartAPI, buildMessages, simulateDelay } from '../apiClient';
import { mockResponses } from '../aiMocks';
import { fuzzyFindEntity, deduplicateTimelineEvents } from '../../utils/fuzzyMatch';
import { fetchStoryDetail, fetchChapterContent, selectStrategicChapters, fetchViaProxy, getProxyUrl, rateLimiter } from '../researchService';
import { AIScanOutputSchema } from '../../schemas/storyStateSchema';

/**
 * Suggest a new character aware of existing story context
 */
export async function suggestCharacter(apiKey, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return mockResponses.suggestCharacter();
    }

    let contextText;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            query: 'nhân vật mới phù hợp với cốt truyện',
            includeContent: false
        });
        contextText = ragResult.contextText;
    } catch {
        contextText = buildRAGContext(story, { includeContent: false }).contextText;
    }
    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const genreReminder = getGenreReminder(story);

    let prompt = `Dựa trên NGỮ CẢNH TRUYỆN, hãy gợi ý một nhân vật MỚI phù hợp.

<story_context>
${contextText}
</story_context>

<requirements>
- Viết bằng tiếng Việt.
- Tên nhân vật (có thể là tên Việt Nam hoặc tùy bối cảnh).
- Vai trò trong truyện — phải BỔ SUNG cho các nhân vật đã có.
- Mô tả ngoại hình ngắn gọn.
- Tính cách và động lực.
- Mối quan hệ cụ thể với nhân vật hiện có.
- Điểm đặc biệt/bí ẩn.
- Lý do nhân vật này cần thiết cho cốt truyện.
${genreReminder ? `- ${genreReminder}\n` : ''}
Trả lời theo format:
💡 GỢI Ý NHÂN VẬT:

[Tên nhân vật]
[Mô tả chi tiết]
</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi đưa ra gợi ý vào thẻ <content>.`;

    if (directive?.customInstruction) {
        prompt += `\n\nLƯU Ý THÊM:\n${directive.customInstruction}`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 1024, 3, { signal: options.signal });
}

/**
 * Suggest plot developments based on full story context
 */
export async function suggestPlot(apiKey, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return mockResponses.suggestPlot();
    }

    let contextText;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            query: 'phát triển cốt truyện tiếp theo',
            includeContent: true
        });
        contextText = ragResult.contextText;
    } catch {
        contextText = buildRAGContext(story, { includeContent: true }).contextText;
    }
    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const genreReminder = getGenreReminder(story);

    let prompt = `Dựa trên NGỮ CẢNH TRUYỆN, hãy gợi ý hướng phát triển cốt truyện tiếp theo.

<story_context>
${contextText}
</story_context>

<requirements>
- Viết bằng tiếng Việt.
- Gợi ý 2-3 hướng phát triển khác nhau.
- Mỗi gợi ý dựa trên nhân vật, bối cảnh, và sự kiện hiện có.
- Tạo sự liên kết với các chi tiết cốt truyện đã lên kế hoạch.
- Tạo sự bất ngờ nhưng vẫn logic.
${genreReminder ? `- ${genreReminder}\n` : ''}
Format:
💡 GỢI Ý CỐT TRUYỆN:
[Các gợi ý chi tiết]
</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi đưa ra gợi ý vào thẻ <content>.`;

    if (directive?.customInstruction) {
        prompt += `\n\nLƯU Ý THÊM:\n${directive.customInstruction}`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 1024, 3, { signal: options.signal });
}

/**
 * Analyze and improve writing with story context awareness
 */
export async function improveWriting(apiKey, currentContent, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return mockResponses.improveWriting();
    }

    let contextText;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            query: (currentContent || '').slice(-500),
            includeContent: false
        });
        contextText = ragResult.contextText;
    } catch {
        contextText = buildRAGContext(story, { includeContent: false }).contextText;
    }
    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const lastPart = (currentContent || '').slice(-1500);

    const genreReminder = getGenreReminder(story);

    let prompt = `Bạn là biên tập viên chuyên nghiệp. Hãy phân tích và gợi ý cải thiện đoạn văn, đồng thời kiểm tra tính nhất quán với ngữ cảnh truyện.

<story_context>
${contextText}
</story_context>

<current_text>
${lastPart || '(chưa có nội dung)'}
</current_text>

<requirements>
- Nhận xét về điểm mạnh.
- Kiểm tra nhất quán với thông tin nhân vật/bối cảnh.
- Chỉ ra điểm cần cải thiện.
- Gợi ý cách viết lại một số câu.
- Đề xuất kỹ thuật viết nâng cao.
- Viết bằng tiếng Việt.
${genreReminder ? `- ${genreReminder}\n` : ''}
Format:
✨ PHÂN TÍCH VĂN PHONG:
[Phân tích và gợi ý]
</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi đưa bài phân tích vào thẻ <content>.`;

    if (directive?.customInstruction) {
        prompt += `\n\nLƯU Ý THÊM:\n${directive.customInstruction}`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, 3, { signal: options.signal });
}

/**
 * Summarize large reference document
 */
export async function summarizeReference(apiKey, content, fileName, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return `[MOCK AI] Tóm tắt tài liệu: "${fileName}"\n\nNội dung tóm tắt giả lập cho tài liệu dài...`;
    }

    const limit = 500000;
    const textToSummarize = content.length > limit ? content.slice(0, limit) + "\n...(cắt bớt phần sau)..." : content;

    let systemInst = `Bạn là trợ lý biên tập chuyên nghiệp. Nhiệm vụ của bạn là tóm tắt tài liệu một cách súc tích, giữ lại thông tin quan trọng cho việc viết truyện (nhân vật, bối cảnh, sự kiện, lore).`;

    let prompt = `Hãy tóm tắt tài liệu sau để làm tư liệu tham khảo.

<document_name>${fileName}</document_name>

<document_content>
${textToSummarize}
</document_content>

<requirements>
- Tóm tắt lại các thông tin quan trọng nhất: nhân vật, địa danh, sự kiện, thuật ngữ, quy tắc thế giới.
- Loại bỏ các chi tiết thừa, lặp lại, hoa mỹ không cần thiết.
- Giữ lại các trích dẫn đắt giá hoặc thông tin cụ thể (ngày tháng, số liệu) nếu quan trọng.
- Trình bày rõ ràng, dễ tra cứu (dùng gạch đầu dòng).
- Độ dài tóm tắt: khoảng 10-20% độ dài gốc.
- Viết bằng tiếng Việt.
</requirements>

Hãy suy nghĩ trong thẻ <thinking> trước khi trả về bản tóm tắt vào thẻ <content>.`;

    if (directive?.customInstruction) {
        prompt += `\n\nLƯU Ý THÊM:\n${directive.customInstruction}`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callSmartAPI(apiKey, model || 'gemini-3-flash-preview', messages, 4096, { signal: options.signal, role: 'worker' });
}

/**
 * Post-write scan: Extract characters, summary, settings, timeline from written content.
 * Returns structured JSON data for updating the story database.
 * 
 * Enhanced with:
 * - Fuzzy name dedup (Vietnamese-aware)
 * - Entity update detection (new vs update existing)
 * - Timeline event dedup
 */
export async function postWriteScan(apiKey, chapterContent, chapter, story, options = {}) {
    const { model, onProgress } = options;

    if (!apiKey || !chapterContent) {
        return { summary: '', characters: [], settings: [], timeline: [], characterUpdates: [], settingUpdates: [], abilityUpdates: [], itemUpdates: [], organizationUpdates: [] };
    }

    if (onProgress) onProgress('scanning', '🔍 Bước 3/3: Đang quét dữ liệu chương...');
    console.log('🔍 postWriteScan: Analyzing chapter content...');

    // Gather existing database entries
    const db = story?.database || {};
    const existingChars = db.characters || [];
    const existingSettings = db.settings || [];
    const existingAbilities = db.abilities || [];
    const existingItems = db.items || [];
    const existingOrgs = db.organizations || [];
    const existingTimeline = db.timeline || [];

    const existingCharNames = existingChars.map(c => c.name).filter(Boolean);
    const existingSettingNames = existingSettings.map(s => s.name).filter(Boolean);
    const existingAbilityNames = existingAbilities.map(a => a.name).filter(Boolean);
    const existingItemNames = existingItems.map(i => i.name).filter(Boolean);
    const existingOrgNames = existingOrgs.map(o => o.name).filter(Boolean);

    const scanPrompt = `Bạn là trợ lý phân tích truyện. Hãy phân tích nội dung chương sau và trích xuất thông tin.

<current_chapter>
CHƯƠNG ${chapter.order || '?'}: "${chapter.title || ''}"
${chapterContent}
</current_chapter>

<database_context>
NHÂN VẬT ĐÃ CÓ: ${existingCharNames.length > 0 ? existingCharNames.join(', ') : '(trống)'}
BỐI CẢNH ĐÃ CÓ: ${existingSettingNames.length > 0 ? existingSettingNames.join(', ') : '(trống)'}
NĂNG LỰC ĐÃ CÓ: ${existingAbilityNames.length > 0 ? existingAbilityNames.join(', ') : '(trống)'}
VẬT PHẨM ĐÃ CÓ: ${existingItemNames.length > 0 ? existingItemNames.join(', ') : '(trống)'}
TỔ CHỨC ĐÃ CÓ: ${existingOrgNames.length > 0 ? existingOrgNames.join(', ') : '(trống)'}
</database_context>

<requirements>
- Trả về JSON thuần tuý (không có text nào bên ngoài).
- KHÔNG bọc trong \`\`\`json markdown fences. JSON bắt đầu ngay lập tức từ dấu { và kết thúc bằng }.
- PHÂN BIỆT RÕ: "characters" = nhân vật HOÀN TOÀN MỚI (chưa có mặt trong danh sách ĐÃ CÓ), "characterUpdates" = nhân vật ĐÃ CÓ có thông tin mới
- Tương tự cho settings vs settingUpdates
- Nếu không có mục mới, để mảng rỗng []
- characterUpdates: CẬP NHẬT trạng thái DYNAMIC chi tiết: vị trí, mục tiêu, trạng thái cơ thể, trạng thái đặc biệt
- itemUpdates: THEO DÕI số lượng thay đổi và chuyển nhượng chủ sở hữu (quantity, newOwner)
- eventLog: GHI LẠI chuỗi sự kiện dạng arrow-chain ngắn gọn (VD: "Lâm giết rồng → nhận linh thạch x10 → tổng tài sản tăng")
- timeline: CHỈ trích xuất SỰ KIỆN CHÍNH (bước ngoặt, xung đột, quyết định quan trọng). KHÔNG thêm cảnh sinh hoạt bình thường.
- timeline description: DÀI VÀ CHI TIẾT (3-5 câu).
- keywords: Trích xuất 5-10 từ khóa QUAN TRỌNG NHẤT của chương (tên nhân vật chính xuất hiện, địa điểm, sự kiện then chốt, vật phẩm, kỹ năng được dùng). Dùng để tra cứu chương sau này.
- foreshadowingSeeds: Phát hiện MANH MỐI/PHỤC BÚT trong chương: chi tiết bí ẩn chưa giải thích, lời ám chỉ, vật phẩm lạ, sự kiện gợi mở. CHỈ trả về những manh mối THỰC SỰ có vẻ được tác giả cố tình gieo — KHÔNG bịa thêm.
</requirements>

<json_schema>
{
  "summary": "Tóm tắt SIÊU NÉN sự kiện trong chương (khoảng 100 chữ). Ghi rõ diễn biến cốt truyện, nhân vật nào làm gì, kết quả ra sao. BẮT BUỘC có để làm bộ nhớ cho AI ở các chương sau.",
  "recap": "Cuối chương, [nhân vật] đang [đang làm gì / trạng thái cảm xúc / vị trí]. [Chi tiết quan trọng cuối cùng].",
  "keywords": ["từ khóa 1", "từ khóa 2", "..."],
  "characters": [{"name": "MỚI", "role": "...", "description": "...", "personality": "...", "newState": "Trạng thái MỚI NHẤT"}],
  "characterUpdates": [{"name": "ĐÃ CÓ", "newInfo": "Thông tin mới phát hiện", "newState": "Trạng thái tổng quát MỚI NHẤT", "currentLocation": "Vị trí hiện tại cuối chương", "currentGoal": "Mục tiêu tức thì", "currentBodyState": "Trạng thái cơ thể (bị thương, kiệt sức...)", "specialStatus": "Buff/debuff đặc biệt (trúng độc, tàng hình...)"}],
  "settings": [{"name": "MỚI", "description": "...", "newState": "Trạng thái MỚI NHẤT (nếu có)"}],
  "settingUpdates": [{"name": "ĐÃ CÓ", "newInfo": "...", "newState": "Trạng thái MỚI NHẤT của địa điểm (bị phá hủy, đang phục hồi...)"}],
  "abilities": [{"name": "MỚI", "owner": "...", "effect": "...", "limitation": "...", "newState": "Trạng thái MỚI NHẤT"}],
  "abilityUpdates": [{"name": "ĐÃ CÓ", "newInfo": "...", "newState": "Trạng thái MỚI NHẤT (đã thăng cấp, bị phong ấn...)"}],
  "items": [{"name": "MỚI", "owner": "...", "quantity": "SỐ LƯỢNG MỚI (PHẢI LÀ SỐ, ví dụ: 5)", "effect": "...", "newState": "Trạng thái MỚI NHẤT"}],
  "itemUpdates": [{"name": "ĐÃ CÓ", "newInfo": "...", "quantity": "SỐ LƯỢNG MỚI (PHẢI LÀ SỐ, ví dụ: 10)", "newOwner": "Chủ sở hữu MỚI (nếu chuyển nhượng)", "newState": "Trạng thái MỚI NHẤT (bị hỏng, đã sử dụng...)"}],
  "organizations": [{"name": "MỚI", "purpose": "...", "newState": "Trạng thái MỚI NHẤT"}],
  "organizationUpdates": [{"name": "ĐÃ CÓ", "newInfo": "...", "newState": "Trạng thái MỚI NHẤT (tan rã, đang mở rộng...)"}],
  "currentState": {"time": "...", "location": "..."},
  "timeline": [{"title": "Sự kiện quan trọng", "description": "..."}],
  "eventLog": [{"chain": "Nhân vật → hành động → kết quả → thay đổi trạng thái"}],
  "foreshadowingSeeds": [{"hint": "Mô tả ngắn manh mối", "targetEvent": "Sự kiện có thể kích hoạt (dự đoán)", "confidence": "high/medium"}]
}
</json_schema>`;

    const systemInst = 'Bạn là máy trích xuất JSON. Không output bất cứ markdown nào như ```json. Output phải bắt đầu bằng chữ { và kết thúc bằng chữ }. Không giải thích.';
    const messages = buildMessages(systemInst, scanPrompt);

    try {
        const rawResult = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 3072, 3, { signal: options.signal });
        console.log('🔍 postWriteScan: Raw result received');

        // Parse JSON safely — handle cases where AI wraps in ```json
        let jsonStr = rawResult.trim();
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                console.warn('🔍 postWriteScan: Failed to parse JSON', e);
                return { summary: '', characters: [], settings: [], timeline: [], abilities: [], items: [], organizations: [], currentState: null, characterUpdates: [], settingUpdates: [], abilityUpdates: [], itemUpdates: [], organizationUpdates: [] };
            }
        }

        // Zod validation Engine
        const validationResult = AIScanOutputSchema.safeParse(parsed);
        if (!validationResult.success) {
            console.warn('🔍 postWriteScan: Zod validation failed, using fallback empty result', validationResult.error);
            if (onProgress) onProgress('scan_warning', '⚠️ Kết quả quét có lỗi định dạng một phần');
            // We can still try to use the raw parsed object if it has some valid arrays, but for safety let's fall back to empty arrays
            // Or we can just extract what's valid. Using safe parsed data where possible.
        }

        // Use validated data if success, else fallback to raw parsed with raw arrays (best effort)
        const validData = validationResult.success ? validationResult.data : parsed;

        const result = {
            summary: validData.summary || '',
            recap: validData.recap || '',
            keywords: Array.isArray(validData.keywords) ? validData.keywords : [],
            characters: Array.isArray(validData.characters) ? validData.characters : [],
            characterUpdates: Array.isArray(validData.characterUpdates) ? validData.characterUpdates : [],
            settings: Array.isArray(validData.settings) ? validData.settings : [],
            settingUpdates: Array.isArray(validData.settingUpdates) ? validData.settingUpdates : [],
            abilities: Array.isArray(validData.abilities) ? validData.abilities : [],
            items: Array.isArray(validData.items) ? validData.items : [],
            organizations: Array.isArray(validData.organizations) ? validData.organizations : [],
            currentState: validData.currentState || null,
            timeline: Array.isArray(validData.timeline) ? validData.timeline : [],
            eventLog: Array.isArray(validData.eventLog) ? validData.eventLog : [],
            foreshadowingSeeds: Array.isArray(validData.foreshadowingSeeds) ? validData.foreshadowingSeeds : [],
            // Enhanced fields from MVU scan
            abilityUpdates: Array.isArray(validData.abilityUpdates) ? validData.abilityUpdates : [],
            itemUpdates: Array.isArray(validData.itemUpdates) ? validData.itemUpdates : [],
            organizationUpdates: Array.isArray(validData.organizationUpdates) ? validData.organizationUpdates : [],
        };

        // ═══ Fuzzy dedup: filter out entities that already exist ═══
        // Characters: fuzzy match → move to updates if match found
        const filteredChars = [];
        for (const char of result.characters) {
            if (!char.name) continue;
            const match = fuzzyFindEntity(char.name, existingChars);
            if (match) {
                // Entity exists → convert to update
                console.log(`🔍 fuzzy dedup: "${char.name}" matches existing "${match.name}" → update`);
                result.characterUpdates.push({
                    name: match.name, // use canonical name
                    newInfo: [char.description, char.personality, char.role].filter(Boolean).join('. '),
                    newState: char.newState || undefined
                });
            } else {
                filteredChars.push(char);
            }
        }
        result.characters = filteredChars;

        // Settings: fuzzy dedup
        const filteredSettings = [];
        for (const setting of result.settings) {
            if (!setting.name) continue;
            const match = fuzzyFindEntity(setting.name, existingSettings);
            if (match) {
                console.log(`🔍 fuzzy dedup: setting "${setting.name}" matches "${match.name}" → update`);
                result.settingUpdates.push({
                    name: match.name,
                    newInfo: setting.description || '',
                    newState: setting.newState || undefined
                });
            } else {
                filteredSettings.push(setting);
            }
        }
        result.settings = filteredSettings;

        const filteredAbilities = [];
        for (const a of result.abilities) {
            if (!a.name) continue;
            const match = fuzzyFindEntity(a.name, existingAbilities);
            if (match) {
                console.log(`🔍 fuzzy dedup: ability "${a.name}" matches "${match.name}" → update`);
                result.abilityUpdates.push({
                    name: match.name,
                    newInfo: [a.effect, a.limitation].filter(Boolean).join('. '),
                    newState: a.newState || undefined
                });
            } else {
                filteredAbilities.push(a);
            }
        }
        result.abilities = filteredAbilities;

        const filteredItems = [];
        for (const i of result.items) {
            if (!i.name) continue;
            const match = fuzzyFindEntity(i.name, existingItems);
            if (match) {
                console.log(`🔍 fuzzy dedup: item "${i.name}" matches "${match.name}" → update`);
                result.itemUpdates.push({
                    name: match.name,
                    newInfo: i.effect || '',
                    newState: i.newState || undefined
                });
            } else {
                filteredItems.push(i);
            }
        }
        result.items = filteredItems;

        const filteredOrgs = [];
        for (const o of result.organizations) {
            if (!o.name) continue;
            const match = fuzzyFindEntity(o.name, existingOrgs);
            if (match) {
                console.log(`🔍 fuzzy dedup: org "${o.name}" matches "${match.name}" → update`);
                result.organizationUpdates.push({
                    name: match.name,
                    newInfo: o.purpose || '',
                    newState: o.newState || undefined
                });
            } else {
                filteredOrgs.push(o);
            }
        }
        result.organizations = filteredOrgs;

        // Timeline: dedup against existing events
        result.timeline = deduplicateTimelineEvents(result.timeline, existingTimeline);

        const totalNew = result.characters.length + result.settings.length + result.timeline.length + result.abilities.length + result.items.length + result.organizations.length;
        const totalUpdates = result.characterUpdates.length + result.settingUpdates.length;
        console.log(`🔍 postWriteScan: ${totalNew} new entities, ${totalUpdates} updates, ${result.timeline.length} events`);

        if (onProgress) {
            const parts = [];
            if (result.summary) parts.push('tóm tắt');
            if (result.characters.length) parts.push(`${result.characters.length} nhân vật mới`);
            if (result.characterUpdates.length) parts.push(`${result.characterUpdates.length} nhân vật cập nhật`);
            if (result.settings.length) parts.push(`${result.settings.length} bối cảnh mới`);
            if (result.settingUpdates.length) parts.push(`${result.settingUpdates.length} bối cảnh cập nhật`);
            if (result.abilities.length) parts.push(`${result.abilities.length} năng lực`);
            if (result.items.length) parts.push(`${result.items.length} vật phẩm`);
            if (result.organizations.length) parts.push(`${result.organizations.length} tổ chức`);
            if (result.timeline.length) parts.push(`${result.timeline.length} sự kiện`);
            if (result.foreshadowingSeeds.length) parts.push(`${result.foreshadowingSeeds.length} phục bút`);
            onProgress('scan_done', `🔍 Đã quét: ${parts.length > 0 ? parts.join(', ') : 'không có dữ liệu mới'}`);
        }

        return result;
    } catch (err) {
        console.error('🔍 postWriteScan error:', err);
        if (onProgress) onProgress('scan_error', '⚠️ Quét dữ liệu thất bại');
        return { summary: '', characters: [], settings: [], timeline: [], abilities: [], items: [], organizations: [], currentState: null, characterUpdates: [], settingUpdates: [] };
    }
}

/**
 * Summarize the current chapter content
 */
export async function summarizeChapter(apiKey, chapter, currentContent, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return mockResponses.summarizeChapter(chapter?.title);
    }

    let contextText, usedEmbeddings = false;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            currentChapterId: chapter?.id,
            query: currentContent?.slice(-500) || '',
            includeContent: false
        });
        contextText = ragResult.contextText;
        usedEmbeddings = ragResult.usedEmbeddings;
    } catch {
        const fallback = buildRAGContext(story, {
            currentChapterId: chapter?.id,
            includeContent: false
        });
        contextText = fallback.contextText;
    }
    console.log(`📝 summarizeChapter: embedding=${usedEmbeddings}`);

    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const textToSummarize = currentContent || '';

    let prompt = `Bạn là biên tập viên chuyên nghiệp. Hãy tóm tắt chương truyện sau một cách súc tích và đầy đủ.

${contextText}

CHƯƠNG CẦN TÓM TẮT:
- Tiêu đề: ${chapter?.title || 'Không có tiêu đề'}
- Chương số: ${chapter?.order || '?'}

NỘI DUNG CHƯƠNG:
${textToSummarize || '(Chương chưa có nội dung)'}

YÊU CẦU TÓM TẮT:
- Viết bằng tiếng Việt
- Tóm tắt các sự kiện chính theo thứ tự xảy ra
- Nêu rõ nhân vật xuất hiện và hành động quan trọng
- Chỉ ra các bước ngoặt và điểm cao trào
- Tóm tắt kết thúc chương
- Độ dài: 150-300 từ
- ⛔ KHÔNG thêm bất kỳ thông tin nào không có trong nội dung chương

Format:
📝 TÓM TẮT CHƯƠNG ${chapter?.order || ''}: ${chapter?.title || ''}

[Nội dung tóm tắt]`;

    if (directive?.customInstruction) {
        prompt += `\n\nLƯU Ý THÊM:\n${directive.customInstruction}`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callSmartAPI(apiKey, model || 'gemini-3-flash-preview', messages, 1024, { signal: options.signal, role: 'worker' });
}

/**
 * Generate vivid scene descriptions based on chapter content
 */
export async function generateSceneDescription(apiKey, chapter, currentContent, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return mockResponses.generateSceneDescription();
    }

    let contextText, usedEmbeddings = false;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            currentChapterId: chapter?.id,
            query: currentContent?.slice(-500) || '',
            includeContent: false
        });
        contextText = ragResult.contextText;
        usedEmbeddings = ragResult.usedEmbeddings;
    } catch {
        const fallback = buildRAGContext(story, {
            currentChapterId: chapter?.id,
            includeContent: false
        });
        contextText = fallback.contextText;
    }
    console.log(`🎨 generateSceneDescription: embedding=${usedEmbeddings}`);

    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    const lastPart = (currentContent || '').slice(-2000);

    const settings = story?.database?.settings || [];
    const settingsInfo = settings.length > 0
        ? `\nBỐI CẢNH ĐÃ THIẾT LẬP:\n${settings.map(s => `- ${s.name}: ${s.description || ''}`).join('\n')}`
        : '';

    let prompt = `Bạn là nhà văn chuyên miêu tả cảnh vật. Dựa trên nội dung chương hiện tại, hãy tạo các đoạn mô tả cảnh chi tiết, sống động.

${contextText}
${settingsInfo}

CHƯƠNG HIỆN TẠI: ${chapter?.title || 'Không có tiêu đề'}

NỘI DUNG HIỆN TẠI (phần cuối):
${lastPart || '(Chưa có nội dung)'}

YÊU CẦU TẠO MÔ TẢ CẢNH:
- Viết bằng tiếng Việt, văn phong giàu hình ảnh
- Tạo 2-3 đoạn mô tả cảnh phù hợp với diễn biến hiện tại
- Mỗi đoạn mô tả bao gồm:
  • Không gian (địa điểm, kiến trúc, cảnh vật)
  • Thời tiết, ánh sáng, mùi hương
  • Âm thanh, bầu không khí
  • Cảm xúc mà cảnh vật gợi lên
- Sử dụng các giác quan: thị giác, thính giác, khứu giác, xúc giác
- Mô tả phải nhất quán với bối cảnh đã thiết lập
- ⛔ KHÔNG bịa thêm địa điểm không có trong dữ liệu
- Mỗi đoạn khoảng 80-150 từ

Format:
🎨 MÔ TẢ CẢNH:

[Cảnh 1: Tên cảnh]
[Mô tả chi tiết]

[Cảnh 2: Tên cảnh]
[Mô tả chi tiết]

[Cảnh 3: Tên cảnh]
[Mô tả chi tiết]`;

    if (directive?.customInstruction) {
        prompt += `\n\nLƯU Ý THÊM:\n${directive.customInstruction}`;
    }

    const messages = buildMessages(systemInst, prompt);
    return await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, 3, { signal: options.signal });
}

/**
 * Check consistency with full RAG context
 */
export async function checkConsistency(apiKey, storyText, story, options = {}) {
    const { directive, model } = options;

    if (!apiKey) {
        await simulateDelay();
        return checkConsistencyLocal(storyText, story?.database || {});
    }

    let contextText;
    try {
        const ragResult = await buildRAGContextWithEmbeddings(story, apiKey, {
            query: (storyText || '').slice(-500),
            includeContent: true
        });
        contextText = ragResult.contextText;
    } catch {
        contextText = buildRAGContext(story, { includeContent: true }).contextText;
    }
    const textPart = (storyText || '').slice(0, 3000);
    let systemInst = await buildSystemInstruction(story);
    if (directive?.systemInstruction) {
        systemInst += `\n\nAI PERSONA/CHỈ ĐẠO:\n${directive.systemInstruction}`;
    }

    let prompt = `Bạn là biên tập viên chuyên nghiệp. Dựa trên NGỮ CẢNH TRUYỆN, hãy kiểm tra tính nhất quán.

${contextText}

NỘI DUNG CẦN KIỂM TRA:
${textPart || '(chưa có nội dung)'}

Hãy kiểm tra:
1. LỖI NGHIÊM TRỌNG (mâu thuẫn rõ ràng về tuổi, ngoại hình, tên, sự kiện, dòng thời gian)
2. CẢNH BÁO (có thể không nhất quán)
3. GỢI Ý (cải thiện tính nhất quán)

Format JSON:
{"issues": [{"type": "error", "message": "..."}], "warnings": [{"type": "warning", "message": "..."}]}

Nếu không tìm thấy mâu thuẫn: {"issues": [], "warnings": []}`;

    if (directive?.customInstruction) {
        prompt += `\n\nLƯU Ý THÊM:\n${directive.customInstruction}`;
    }

    try {
        const messages = buildMessages(systemInst, prompt);
        const result = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, 3, { signal: options.signal });
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { issues: [], warnings: [{ type: 'info', message: result }] };
    } catch (e) {
        return checkConsistencyLocal(storyText, story?.database || {});
    }
}

/**
 * GỢI Ý AI CHO FORM TẠO TRUYỆN MỚI — THEO SECTION
 */
export async function suggestStorySection(apiKey, sectionName, formData, options = {}) {
    const { model } = options;
    const genreLabels = (formData.genres || []).join(', ');
    const title = formData.title || '';
    const description = formData.description || '';

    // Context from already-filled fields
    const contextParts = [];
    if (title) contextParts.push(`Tên truyện: ${title}`);
    if (genreLabels) contextParts.push(`Thể loại: ${genreLabels}`);
    if (description) contextParts.push(`Mô tả: ${description}`);
    if (formData.timePeriod) contextParts.push(`Thời đại: ${formData.timePeriod}`);
    if (formData.mainLocations) contextParts.push(`Địa điểm: ${formData.mainLocations}`);
    if (formData.worldRules) contextParts.push(`Hệ thống sức mạnh: ${formData.worldRules}`);
    if (formData.cultivationLevels) contextParts.push(`Cảnh giới: ${formData.cultivationLevels}`);
    if (formData.customGenres) contextParts.push(`Thể loại tùy chỉnh: ${formData.customGenres}`);
    if (formData.protagonistName) contextParts.push(`Nhân vật chính: ${formData.protagonistName}`);
    if (formData.protagonistRole) contextParts.push(`Vai trò: ${formData.protagonistRole}`);
    if (formData.protagonistGoal) contextParts.push(`Mục tiêu: ${formData.protagonistGoal}`);
    if (formData.mainConflict) contextParts.push(`Xung đột chính: ${formData.mainConflict}`);
    if (formData.antagonist) contextParts.push(`Phản diện: ${formData.antagonist}`);
    const context = contextParts.join('\n');

    const sections = {
        world: {
            label: 'Thế giới & Bối cảnh',
            fields: {
                timePeriod: 'Thời đại / Kỷ nguyên (1-2 dòng ngắn)',
                technologyLevel: 'Trình độ công nghệ (1 dòng)',
                mainLocations: '2-3 địa điểm chính, mô tả ngắn từng nơi',
                worldRules: 'Hệ thống phép thuật / sức mạnh (2-3 dòng)',
                cultivationLevels: 'Phân cấp cảnh giới / level từ thấp tới cao. Liệt kê chi tiết từng bậc và giải thích ý nghĩa / sức mạnh tương ứng (3-5 dòng)',
                powerSystemDetails: 'Chi tiết cách hệ thống vận hành: cách tu luyện/nâng cấp, hạn chế, vật phẩm hỗ trợ, phân loại kỹ năng/chiêu thức, hậu quả khi dùng quá mức (3-5 dòng)',
                worldHistory: 'Lịch sử thế giới & sự kiện quan trọng (2-3 dòng)',
                factionsRaces: 'Chủng tộc / phe phái / tổ chức (2-3 dòng)',
                religionCulture: 'Tôn giáo, tín ngưỡng, văn hóa (1-2 dòng)',
                economyLife: 'Kinh tế & đời sống xã hội (1-2 dòng)'
            }
        },
        protagonist: {
            label: 'Nhân vật chính',
            fields: {
                protagonistName: 'Tên nhân vật phù hợp bối cảnh',
                protagonistRole: 'Vai trò / nghề nghiệp',
                protagonistStrengths: 'Điểm mạnh / khả năng đặc biệt (2-3 dòng)',
                protagonistWeaknesses: 'Điểm yếu / hạn chế để cân bằng (2-3 dòng)',
                protagonistPersonality: 'Tính cách & nội tâm (2-3 dòng)',
                protagonistGoal: 'Mục tiêu tối thượng (1-2 dòng)'
            }
        },
        characters_plot: {
            label: 'Nhân vật phụ',
            fields: {
                supportingCharacters: '3-4 nhân vật phụ quan trọng (bao gồm cả phản diện/đối thủ): tên, vai trò, tính cách, năng lực, động cơ, mối liên hệ với nhân vật chính — CHỈ giới thiệu nhân vật, TUYỆT ĐỐI KHÔNG viết kết cục/số phận/diễn biến tương lai của họ (4-6 dòng)',
                characterRelationships: 'Mối quan hệ BAN ĐẦU giữa các nhân vật, KHÔNG tiết lộ diễn biến sau này (2-3 dòng)'
            }
        },
        style: {
            label: 'Phong cách & Cấu trúc',
            fields: {
                toneAtmosphere: 'Tông giọng / bầu không khí (ngắn gọn)',
                mainThemes: '2-3 chủ đề chính (ngắn gọn)',
                inspirations: 'Tác phẩm tham khảo phù hợp thể loại (ngắn gọn)',
                specialLanguage: 'Phong cách ngôn ngữ đặc biệt (ngắn gọn)',
                synopsis: 'Tóm tắt cốt truyện từ đầu đến cuối (5-8 dòng)'
            }
        }
    };

    const section = sections[sectionName];
    if (!section) throw new Error(`Section không tồn tại: ${sectionName}`);

    const fieldDescriptions = Object.entries(section.fields)
        .map(([key, desc]) => `  "${key}": "${desc}"`)
        .join(',\n');

    const systemInst = `Bạn là trợ lý sáng tạo chuyên hỗ trợ tác giả xây dựng truyện tiếng Việt.
Bạn sẽ được cung cấp thông tin truyện hiện có và cần gợi ý nội dung cho các trường thông tin.
PHẢI trả lời ĐÚNG định dạng JSON, KHÔNG markdown, KHÔNG giải thích, KHÔNG bọc trong code block.
Chỉ trả về đối tượng JSON duy nhất.`;

    const prompt = `Thông tin truyện hiện có:
${context || '(Chưa có thông tin)'}

Hãy gợi ý sáng tạo cho phần "${section.label}" với các trường sau. Trả về JSON object với đúng các key sau:
{
${fieldDescriptions}
}

Mỗi trường phải có giá trị là chuỗi tiếng Việt sáng tạo, phù hợp với thể loại ${genreLabels || 'fantasy'} và bối cảnh truyện.
⚠️ QUAN TRỌNG: Khi mô tả nhân vật (phụ, phản diện), CHỈ giới thiệu nhân vật (tên, vai trò, tính cách, năng lực, động cơ). TUYỆT ĐỐI KHÔNG viết sẵn kết cục, số phận, hay diễn biến tương lai của nhân vật.
CHỈ trả về JSON object, KHÔNG có text khác.`;

    const messages = buildMessages(systemInst, prompt);
    const suggestModel = model || 'gemini-3-flash-preview';
    console.log(`🪄 suggestStorySection: "${sectionName}" using model "${suggestModel}"`);

    const callAndParse = async (m) => {
        const result = await callOrbitAPI(apiKey, m, messages, 4096, 3, { signal: options.signal });
        const raw = typeof result === 'object' ? (result.text || '') : result;
        const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        console.log(`🪄 suggestStorySection: Parsed ${Object.keys(parsed).length} fields`);
        return parsed;
    };

    try {
        return await callAndParse(suggestModel);
    } catch (err) {
        console.warn(`⚠️ suggestStorySection: ${suggestModel} failed, trying fallback...`, err.message);
        try {
            return await callAndParse('gemini-2.0-flash');
        } catch (err2) {
            console.error(`❌ suggestStorySection: All models failed`, err2.message);
            throw err2;
        }
    }
}

/**
 * Generate an image prompt based on selected text and story context.
 * Optimized for Stable Diffusion / Flux models via Pollinations.
 * Supports up to 1500 chars (POST endpoint handles up to 2000).
 */
export async function generateImagePrompt(apiKey, text, story, options = {}) {
    const { model, signal } = options;

    if (!apiKey) {
        await simulateDelay();
        return "A beautiful fantasy landscape, high quality, masterpiece, 8k resolution, highly detailed, cinematic lighting, vibrant colors";
    }

    let contextText = '';
    try {
        const ragResult = await buildRAGContext(story, { includeContent: false });
        contextText = ragResult.contextText;
    } catch (e) {
        console.warn("Failed to build RAG context for image prompt", e);
    }

    // Build character appearance context from database
    const characters = story?.database?.characters || [];
    const charAppearances = characters
        .filter(c => c.description || c.appearance)
        .slice(0, 5)
        .map(c => `${c.name}: ${c.appearance || c.description || ''}`.substring(0, 200))
        .join('\n');

    const systemInst = `You are an expert AI image prompt generator for Stable Diffusion and Flux models.
Your task is to read a snippet of a story (in Vietnamese) and create a HIGHLY DETAILED, comma-separated ENGLISH keyword prompt.

PROMPT STRUCTURE (follow this order):
1. SUBJECT: Number of people, gender, age, hair color/style, eye color, clothing, expression, pose
2. ACTION: What they're doing
3. SETTING: Environment, architecture, landscape
4. ATMOSPHERE: Lighting, weather, mood, time of day
5. QUALITY BOOSTERS: masterpiece, best quality, highly detailed, 8k, cinematic lighting

CRITICAL RULES:
- NO full sentences. ONLY comma-separated keywords.
- Use character appearance details from the provided database when available.
- Maximum 1500 characters total.
- Be very specific about character appearances (hair color, eye color, clothing details).
- Include art style keywords: digital painting, concept art, illustration, or photorealistic as appropriate.
- ALWAYS end with quality boosters: masterpiece, best quality, highly detailed.
- ONLY return the English prompt. No markdown, no explanations, no quotes.`;

    const prompt = `CHARACTER APPEARANCES (use these details for accuracy):
${charAppearances || '(No character data)'}

STORY CONTEXT:
${contextText || '(No context)'}

TEXT TO GENERATE IMAGE FROM:
"${text}"

Write the detailed ENGLISH image prompt:`;

    const messages = buildMessages(systemInst, prompt);
    const result = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 1024, 3, { signal });

    // Clean up potential markdown or quotes
    let finalPrompt = typeof result === 'object' ? (result.text || '') : result;
    finalPrompt = finalPrompt.replace(/^```[a-zA-Z]*\n?/g, '').replace(/\n?```$/g, '').replace(/^["']|["']$/g, '').trim();

    // Ensure quality boosters are present
    const qualityKeywords = ['masterpiece', 'best quality', 'highly detailed'];
    const hasQuality = qualityKeywords.some(kw => finalPrompt.toLowerCase().includes(kw));
    if (!hasQuality) {
        finalPrompt += ', masterpiece, best quality, highly detailed, 8k';
    }

    return finalPrompt.substring(0, 1500);
}

// Rule-based consistency checking (fallback)
export function checkConsistencyLocal(storyText, database) {
    const issues = [];
    const warnings = [];

    database.characters?.forEach(char => {
        const mentions = (storyText.match(new RegExp(char.name, 'gi')) || []).length;

        if (char.appearance && char.appearance.includes('mắt xanh')) {
            if (storyText.match(/mắt nâu|mắt đen/gi)) {
                issues.push({
                    type: 'error',
                    message: `Mâu thuẫn về màu mắt của "${char.name}". Cơ sở dữ liệu: mắt xanh, nhưng văn bản có đề cập màu khác.`
                });
            }
        }

        if (char.age && mentions > 0) {
            const agePattern = new RegExp(`${char.name}.*?(\\d+)\\s*tuổi`, 'gi');
            const ageMatches = [...storyText.matchAll(agePattern)];
            ageMatches.forEach(match => {
                const mentionedAge = match[1];
                if (mentionedAge !== char.age) {
                    warnings.push({
                        type: 'warning',
                        message: `Có thể không nhất quán về tuổi của "${char.name}". Cơ sở dữ liệu: ${char.age}, văn bản: ${mentionedAge}.`
                    });
                }
            });
        }
    });

    const timeWords = ['năm nay', 'năm ngoái', 'mùa xuân', 'mùa hè', 'mùa thu', 'mùa đông'];
    timeWords.forEach(word => {
        const count = (storyText.match(new RegExp(word, 'gi')) || []).length;
        if (count > 3) {
            warnings.push({
                type: 'info',
                message: `Đề cập nhiều lần về "${word}" - hãy kiểm tra xem dòng thời gian có khớp không.`
            });
        }
    });

    database.characters?.forEach(char => {
        const pattern = new RegExp(`(${char.name}[\\s\\S]{0,50}${char.name}[\\s\\S]{0,50}${char.name})`, 'gi');
        if (pattern.test(storyText)) {
            warnings.push({
                type: 'info',
                message: `Tên "${char.name}" xuất hiện nhiều lần liên tiếp - xem xét sử dụng đại từ để tự nhiên hơn.`
            });
        }
    });

    return { issues, warnings };
}

// ================================================
// ANALYZE STORY FROM URL — Scrape & AI auto-fill wizard
// ================================================

/**
 * Fetch a story from a URL, read strategic chapters, and use AI
 * to analyze the story's context into form-compatible JSON.
 *
 * @param {string} apiKey
 * @param {string} url - URL of the story to analyze
 * @param {object} options - { model, onProgress, signal }
 * @returns {object} JSON mapping to NewStoryModal formData fields
 */
export async function analyzeStoryFromUrl(apiKey, url, options = {}) {
    const { model, onProgress, signal, chapterCount = 3, delayMs = 0 } = options;

    // ─── Check proxy availability ───
    const proxyBase = getProxyUrl();
    if (!proxyBase) {
        throw new Error('Chưa cấu hình proxy (WS Relay). Vui lòng cài đặt proxy trong cấu hình API trước.');
    }

    rateLimiter.reset();
    onProgress?.('🔗 Bước 1/3: Đang truy cập link truyện...');

    // ─── Step 1: Fetch story detail ───
    let detail = null;
    let rawPageText = '';
    const isSangtacviet = url.includes('sangtacviet') || url.includes('14.225.254.182');

    if (isSangtacviet) {
        // Use sangtacviet-specific parser
        detail = await fetchStoryDetail(url, onProgress, signal);
    } else {
        // Generic URL: fetch via proxy as text
        try {
            onProgress?.('🔗 Đang tải trang web...');
            const proxyUrl = `${proxyBase}/proxy?url=${encodeURIComponent(url)}&format=text`;
            const timeout = new AbortController();
            const timeoutId = setTimeout(() => timeout.abort(), 30000);
            const mergedSignal = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
            try {
                const response = await fetch(proxyUrl, { signal: mergedSignal });
                if (response.ok) {
                    const data = await response.json().catch(() => null);
                    rawPageText = data?.content || await response.text();
                }
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (e) {
            console.warn('Generic fetch failed, trying HTML fallback:', e.message);
            try {
                rawPageText = await fetchViaProxy(url, onProgress, signal);
                // Strip HTML tags for plain text
                rawPageText = rawPageText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            } catch (e2) {
                console.warn('HTML fallback also failed:', e2.message);
            }
        }
    }

    // ─── Step 2: Fetch chapter content ───
    let chapterTexts = [];
    let storyTitle = '';
    let storyDescription = '';

    if (detail && detail.chapters?.length > 0) {
        storyTitle = detail.title || '';
        storyDescription = detail.description || '';
        const maxChapters = Math.max(1, Math.min(chapterCount, 20));
        const chaptersToRead = selectStrategicChapters(detail.chapters).slice(0, maxChapters);
        onProgress?.(`📋 Tìm thấy "${storyTitle}" (${detail.totalChapters} chương). Đang đọc ${chaptersToRead.length} chương...`);

        for (let i = 0; i < chaptersToRead.length; i++) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            onProgress?.(`📖 Bước 2/3: Đọc chương ${i + 1}/${chaptersToRead.length}: ${chaptersToRead[i].title}`);
            const content = await fetchChapterContent(chaptersToRead[i].url, onProgress, signal);
            if (content && content.length > 50) {
                chapterTexts.push(`[${chaptersToRead[i].title}]\n${content.substring(0, 3000)}`);
            }
            // User-configured delay between chapters
            if (delayMs > 0 && i < chaptersToRead.length - 1) {
                onProgress?.(`⏳ Đợi ${(delayMs / 1000).toFixed(1)}s trước khi đọc chương tiếp...`);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
        onProgress?.(`✅ Đã đọc ${chapterTexts.length} chương`);
    } else if (rawPageText && rawPageText.length > 100) {
        onProgress?.('📖 Bước 2/3: Đã tải nội dung trang web');
        // Use the raw page text as content
        chapterTexts.push(rawPageText.substring(0, 15000));
    } else {
        throw new Error('Không thể đọc nội dung từ link này. Vui lòng kiểm tra lại URL hoặc thử link khác.');
    }

    // ─── Step 3: AI Analysis ───
    onProgress?.('🧠 Bước 3/3: AI đang phân tích bối cảnh truyện...');

    const contentForAnalysis = chapterTexts.join('\n\n---CHAPTER BREAK---\n\n');

    const systemInst = `Bạn là chuyên gia phân tích tiểu thuyết. Bạn sẽ đọc nội dung truyện và trích xuất thông tin chi tiết.
PHẢI trả lời ĐÚNG định dạng JSON, KHÔNG markdown, KHÔNG giải thích, KHÔNG bọc trong code block.
Chỉ trả về đối tượng JSON duy nhất. Tất cả giá trị phải là chuỗi tiếng Việt.`;

    const prompt = `Đọc nội dung truyện sau và phân tích CHI TIẾT để xây dựng hồ sơ truyện hoàn chỉnh.

${storyTitle ? `Tiêu đề: "${storyTitle}"` : ''}
${storyDescription ? `Mô tả: "${storyDescription}"` : ''}
Nguồn: ${url}

<story_content>
${contentForAnalysis.substring(0, 20000)}
</story_content>

Hãy phân tích và trả về JSON với CÁC TRƯỜNG SAU (mỗi trường là chuỗi tiếng Việt, viết chi tiết):

{
  "title": "Tên truyện",
  "description": "Mô tả tổng quan truyện (3-5 câu)",
  "genres": ["genre_value"],

  "timePeriod": "Thời đại / kỷ nguyên của truyện",
  "technologyLevel": "Trình độ công nghệ",
  "mainLocations": "Các địa điểm chính (2-3 địa điểm, mô tả ngắn)",
  "worldRules": "Hệ thống phép thuật / sức mạnh đặc biệt",
  "cultivationLevels": "Phân cấp cảnh giới / level chi tiết từ thấp tới cao, giải thích từng bậc",
  "powerSystemDetails": "Chi tiết cách hệ thống vận hành: cách tu luyện, hạn chế, vật phẩm hỗ trợ, phân loại kỹ năng",
  "worldHistory": "Lịch sử thế giới & sự kiện quan trọng",
  "factionsRaces": "Chủng tộc / phe phái / tổ chức",
  "religionCulture": "Tôn giáo / tín ngưỡng / văn hóa",
  "economyLife": "Kinh tế & đời sống",

  "protagonistName": "Tên nhân vật chính",
  "protagonistRole": "Vai trò / nghề nghiệp",
  "protagonistStrengths": "Điểm mạnh / khả năng đặc biệt",
  "protagonistWeaknesses": "Điểm yếu / hạn chế",
  "protagonistPersonality": "Tính cách & nội tâm",
  "protagonistAppearance": "Ngoại hình",
  "protagonistBackground": "Lai lịch / quá khứ",
  "protagonistGoal": "Mục tiêu tối thượng",

  "antagonist": "Nhân vật phản diện (tên, động cơ, sức mạnh)",
  "supportingCharacters": "Nhân vật phụ quan trọng (liệt kê 3-5 người)",
  "characterRelationships": "Mối quan hệ giữa các nhân vật",
  "mainConflict": "Xung đột trung tâm",
  "subConflicts": "Xung đột phụ / xung đột nội tâm",
  "plotTwists": "Bí mật / plot twist có thể có",
  "endingType": "happy|sad|open|bittersweet|twist|undecided",

  "toneAtmosphere": "Tông giọng / bầu không khí",
  "mainThemes": "Chủ đề chính",
  "writingStyle": "descriptive|poetic|fast_paced|dialogue_heavy|introspective|humorous|dark|minimalist|epic|other",
  "narrationPov": "first|second|third_limited|third_omni|multiple",
  "pacing": "slow|moderate|fast|varying",
  "inspirations": "Tác phẩm tương tự / nguồn cảm hứng",
  "specialLanguage": "Ngôn ngữ / phương ngữ đặc biệt",
  "synopsis": "Tóm tắt cốt truyện tổng quan (5-8 dòng)"
}

LƯU Ý:
- Trường "genres" là mảng, chọn từ: fantasy, romance, mystery, scifi, horror, adventure, historical, slice_of_life, thriller, comedy, drama, wuxia, xuanhuan, xianxia, chuyen_khong, trong_sinh, do_thi, cung_dau, isekai, mecha, mahou_shoujo, murim, hunter, regression, dark_fantasy, urban_fantasy, cyberpunk, steampunk, gothic, dystopia, superhero, other
- Trường "endingType", "writingStyle", "narrationPov", "pacing" là mã value, không phải text
- Nếu không xác định được thông tin nào, để chuỗi rỗng ""
- CHỈ trả về JSON, không text khác`;

    const messages = buildMessages(systemInst, prompt);
    const analyzeModel = model || 'gemini-3-flash-preview';

    const callAndParse = async (m) => {
        const result = await callOrbitAPI(apiKey, m, messages, 6144, 3, { signal });
        const raw = typeof result === 'object' ? (result.text || '') : result;
        const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonStr);
    };

    let parsed;
    try {
        parsed = await callAndParse(analyzeModel);
    } catch (err) {
        console.warn(`⚠️ analyzeStoryFromUrl: ${analyzeModel} failed, trying fallback...`, err.message);
        try {
            parsed = await callAndParse('gemini-2.0-flash');
        } catch (err2) {
            console.error(`❌ analyzeStoryFromUrl: All models failed`, err2.message);
            throw new Error('AI không thể phân tích nội dung truyện. Vui lòng thử lại.');
        }
    }

    // Ensure genres is an array
    if (parsed.genres && !Array.isArray(parsed.genres)) {
        parsed.genres = [parsed.genres];
    }

    onProgress?.('✅ Phân tích hoàn tất! Đang điền vào form...');
    console.log(`✅ analyzeStoryFromUrl: Parsed ${Object.keys(parsed).length} fields`);

    return parsed;
}

/**
 * Analyze story from file content (TXT/EPUB text).
 * Reuses the same AI analysis prompt as analyzeStoryFromUrl but takes raw text directly.
 * @param {string} apiKey
 * @param {string} textContent - Raw text content from the file
 * @param {Object} options - { model, onProgress, signal, fileName }
 */
export async function analyzeStoryFromFile(apiKey, textContent, options = {}) {
    const { model, onProgress, signal, fileName } = options;

    if (!textContent || textContent.trim().length < 100) {
        throw new Error('Nội dung file quá ngắn hoặc rỗng. Vui lòng chọn file khác.');
    }

    onProgress?.('🧠 Đang phân tích nội dung file...');

    const systemInst = `Bạn là chuyên gia phân tích tiểu thuyết. Bạn sẽ đọc nội dung truyện và trích xuất thông tin chi tiết.
PHẢI trả lời ĐÚNG định dạng JSON, KHÔNG markdown, KHÔNG giải thích, KHÔNG bọc trong code block.
Chỉ trả về đối tượng JSON duy nhất. Tất cả giá trị phải là chuỗi tiếng Việt.`;

    const prompt = `Đọc nội dung truyện sau và phân tích CHI TIẾT để xây dựng hồ sơ truyện hoàn chỉnh.

${fileName ? `Tên file: "${fileName}"` : ''}

<story_content>
${textContent.substring(0, 25000)}
</story_content>

Hãy phân tích và trả về JSON với CÁC TRƯỜNG SAU (mỗi trường là chuỗi tiếng Việt, viết chi tiết):

{
  "title": "Tên truyện",
  "description": "Mô tả tổng quan truyện (3-5 câu)",
  "genres": ["genre_value"],

  "timePeriod": "Thời đại / kỷ nguyên của truyện",
  "technologyLevel": "Trình độ công nghệ",
  "mainLocations": "Các địa điểm chính (2-3 địa điểm, mô tả ngắn)",
  "worldRules": "Hệ thống phép thuật / sức mạnh đặc biệt",
  "cultivationLevels": "Phân cấp cảnh giới / level chi tiết từ thấp tới cao, giải thích từng bậc",
  "powerSystemDetails": "Chi tiết cách hệ thống vận hành: cách tu luyện, hạn chế, vật phẩm hỗ trợ, phân loại kỹ năng",
  "worldHistory": "Lịch sử thế giới & sự kiện quan trọng",
  "factionsRaces": "Chủng tộc / phe phái / tổ chức",
  "religionCulture": "Tôn giáo / tín ngưỡng / văn hóa",
  "economyLife": "Kinh tế & đời sống",

  "protagonistName": "Tên nhân vật chính",
  "protagonistRole": "Vai trò / nghề nghiệp",
  "protagonistStrengths": "Điểm mạnh / khả năng đặc biệt",
  "protagonistWeaknesses": "Điểm yếu / hạn chế",
  "protagonistPersonality": "Tính cách & đặc điểm nổi bật",
  "protagonistAppearance": "Ngoại hình",
  "protagonistBackground": "Quá khứ / lai lịch",
  "protagonistGoal": "Mục tiêu chính",

  "supportingCharacters": "Nhân vật phụ quan trọng (bao gồm phản diện)",
  "characterRelationships": "Mối quan hệ giữa các nhân vật",

  "toneAtmosphere": "Tông giọng / bầu không khí",
  "mainThemes": "Chủ đề chính",
  "writingStyle": "descriptive|poetic|fast_paced|dialogue_heavy|introspective|humorous|dark|minimalist|epic|other",
  "narrationPov": "first|second|third_limited|third_omni|multiple",
  "pacing": "slow|moderate|fast|varying",
  "specialLanguage": "Ngôn ngữ / phương ngữ đặc biệt",
  "synopsis": "Tóm tắt cốt truyện tổng quan (5-8 dòng)"
}

LƯU Ý:
- Trường "genres" là mảng, chọn từ: fantasy, romance, mystery, scifi, horror, adventure, historical, slice_of_life, thriller, comedy, drama, wuxia, xuanhuan, xianxia, chuyen_khong, trong_sinh, do_thi, cung_dau, isekai, mecha, mahou_shoujo, murim, hunter, regression, dark_fantasy, urban_fantasy, cyberpunk, steampunk, gothic, dystopia, superhero, other
- Trường "writingStyle", "narrationPov", "pacing" là mã value, không phải text
- Nếu không xác định được thông tin nào, để chuỗi rỗng ""
- CHỈ trả về JSON, không text khác`;

    const messages = buildMessages(systemInst, prompt);
    const analyzeModel = model || 'gemini-3-flash-preview';

    const callAndParse = async (m) => {
        const result = await callOrbitAPI(apiKey, m, messages, 6144, 3, { signal });
        const raw = typeof result === 'object' ? (result.text || '') : result;
        const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonStr);
    };

    let parsed;
    try {
        parsed = await callAndParse(analyzeModel);
    } catch (err) {
        console.warn(`⚠️ analyzeStoryFromFile: ${analyzeModel} failed, trying fallback...`, err.message);
        try {
            parsed = await callAndParse('gemini-2.0-flash');
        } catch (err2) {
            console.error(`❌ analyzeStoryFromFile: All models failed`, err2.message);
            throw new Error('AI không thể phân tích nội dung file. Vui lòng thử lại.');
        }
    }

    if (parsed.genres && !Array.isArray(parsed.genres)) {
        parsed.genres = [parsed.genres];
    }

    onProgress?.('✅ Phân tích hoàn tất! Đang điền vào form...');
    console.log(`✅ analyzeStoryFromFile: Parsed ${Object.keys(parsed).length} fields`);

    return parsed;
}

/**
 * Analyze writing style from a text sample.
 * Returns a detailed writing style profile that can be used as a reference for AI writing.
 */
export async function analyzeWritingStyle(apiKey, textContent, options = {}) {
    const { model, onProgress, signal, fileName } = options;

    if (!textContent || textContent.trim().length < 200) {
        throw new Error('Nội dung quá ngắn để phân tích văn phong. Cần ít nhất vài đoạn văn.');
    }

    onProgress?.('🎨 Đang phân tích văn phong...');

    const systemInst = `Bạn là chuyên gia phân tích văn phong tiểu thuyết. Nhiệm vụ: đọc mẫu văn bản và trích xuất ĐẶC TRƯNG VĂN PHONG cụ thể, chi tiết, để AI khác có thể BẮT CHƯỚC chính xác cách viết này.
Trả lời bằng tiếng Việt. Viết liền mạch, dạng hướng dẫn cụ thể.`;

    const prompt = `Đọc mẫu văn bản sau và PHÂN TÍCH VĂN PHONG chi tiết:

${fileName ? `[Nguồn: ${fileName}]` : ''}

<sample_text>
${textContent.substring(0, 15000)}
</sample_text>

Hãy phân tích và tạo BẢN MÔ TẢ VĂN PHONG chi tiết theo các khía cạnh sau. Viết dưới dạng CHỈ DẪN CỤ THỂ để AI có thể bắt chước chính xác:

1. CẤU TRÚC CÂU: Câu dài hay ngắn? Tỷ lệ câu đơn/ghép? Có dùng câu hỏi tu từ? Nhịp điệu câu?
2. TỪ VỰNG & NGÔN NGỮ: Mức độ trang trọng? Thuật ngữ chuyên ngành? Tiếng lóng/khẩu ngữ? Từ cổ/hiện đại?
3. TONE & CẢM XÚC: Giọng kể lạnh lùng hay ấm áp? Hài hước hay nghiêm túc? Mỉa mai hay chân thành?
4. MIÊU TẢ: Chi tiết hay lược bỏ? Dùng nhiều ẩn dụ/so sánh? Thiên giác quan nào?
5. ĐỐI THOẠI: Ngắn gọn hay dài? Xen nội tâm trong đối thoại? Cách xưng hô?
6. NHỊP ĐỘ: Chuyển cảnh nhanh hay chậm? Tỷ lệ hành động/suy tư/miêu tả?
7. KỸ THUẬT ĐẶC BIỆT: Stream of consciousness? Flashback? Foreshadowing? Cliffhanger?
8. VÍ DỤ CỤ THỂ: Trích dẫn 2-3 câu/đoạn tiêu biểu nhất cho văn phong này.

Viết khoảng 300-500 từ, DẠNG chỉ dẫn thực hành, KHÔNG lý thuyết suông.`;

    const messages = buildMessages(systemInst, prompt);
    const analyzeModel = model || 'gemini-3-flash-preview';

    const callAndGet = async (m) => {
        const result = await callOrbitAPI(apiKey, m, messages, 4096, 3, { signal });
        return typeof result === 'object' ? (result.text || '') : result;
    };

    let styleText;
    try {
        styleText = await callAndGet(analyzeModel);
    } catch (err) {
        console.warn(`⚠️ analyzeWritingStyle: ${analyzeModel} failed, trying fallback...`, err.message);
        try {
            styleText = await callAndGet('gemini-2.0-flash');
        } catch (err2) {
            throw new Error('AI không thể phân tích văn phong. Vui lòng thử lại.');
        }
    }

    onProgress?.('✅ Phân tích văn phong hoàn tất!');
    console.log(`✅ analyzeWritingStyle: ${styleText.length} chars`);
    return styleText.trim();
}
