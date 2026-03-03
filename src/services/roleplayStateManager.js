import { callOrbitAPI, buildMessages } from './apiClient';
import { AIScanOutputSchema } from '../schemas/storyStateSchema';
import { fuzzyFindEntity } from '../utils/fuzzyMatch';

/**
 * Scan recent roleplay messages to extract state updates for the Lorebook (Worldbook).
 * This acts as the Mutable Virtual Universe (MVU) engine for Roleplay mode.
 * 
 * @param {string} apiKey - AI API key
 * @param {Array} recentMessages - The last N messages from the chat history
 * @param {Object} story - The full story/roleplay object containing database
 * @param {Object} options - config options like model
 * @returns {Object} Structured JSON containing detected updates
 */
export async function scanRoleplayState(apiKey, recentMessages, story, options = {}) {
    const { model, onProgress } = options;

    if (!apiKey || !recentMessages || recentMessages.length === 0) {
        return null;
    }

    if (onProgress) onProgress('scanning', '🔍 Hệ thống MVU: Đang đồng bộ trạng thái thế giới...');
    console.log('🔍 scanRoleplayState: Analyzing recent chat for MVU updates...');

    // Prepare recent dialogue context
    const chatContext = recentMessages.map(msg => {
        const roleName = msg.role === 'user' ? 'Người chơi' : (msg.name || 'Hệ thống/Nhân vật');
        return `[${roleName}]: ${msg.content}`;
    }).join('\n\n');

    // Gather existing database entries to provide context
    const db = story?.database || {};
    const existingChars = db.characters || [];
    const existingSettings = db.settings || [];
    const existingAbilities = db.abilities || [];
    const existingItems = db.items || [];
    const existingOrgs = db.organizations || [];

    const existingCharNames = existingChars.map(c => c.name).filter(Boolean);
    const existingSettingNames = existingSettings.map(s => s.name).filter(Boolean);
    const existingAbilityNames = existingAbilities.map(a => a.name).filter(Boolean);
    const existingItemNames = existingItems.map(i => i.name).filter(Boolean);
    const existingOrgNames = existingOrgs.map(o => o.name).filter(Boolean);

    const scanPrompt = `Bạn là hệ thống theo dõi trạng thái thế giới ảo (Mutable Virtual Universe - MVU) cho một trò chơi nhập vai (Roleplay).
Nhiệm vụ của bạn là đọc các đoạn chat gần đây nhất và suy luận xem có bất kỳ SỰ THAY ĐỔI TRẠNG THÁI nào đối với nhân vật, vật phẩm, hay bối cảnh hay không.

<recent_chat>
${chatContext}
</recent_chat>

<database_context>
NHÂN VẬT ĐÃ CÓ: ${existingCharNames.length > 0 ? existingCharNames.join(', ') : '(trống)'}
BỐI CẢNH ĐÃ CÓ: ${existingSettingNames.length > 0 ? existingSettingNames.join(', ') : '(trống)'}
NĂNG LỰC ĐÃ CÓ: ${existingAbilityNames.length > 0 ? existingAbilityNames.join(', ') : '(trống)'}
VẬT PHẨM ĐÃ CÓ: ${existingItemNames.length > 0 ? existingItemNames.join(', ') : '(trống)'}
TỔ CHỨC ĐÃ CÓ: ${existingOrgNames.length > 0 ? existingOrgNames.join(', ') : '(trống)'}
</database_context>

<requirements>
- Bạn CHỈ CẦN trích xuất các THAY ĐỔI (Updates). Nếu không có gì thay đổi, hãy trả về mảng rỗng [].
- Trả về JSON thuần tuý (không markdown, bắt đầu bằng { và kết thúc bằng }).
- characterUpdates: Cập nhật vị trí, trạng thái cơ thể (bị thương, kiệt sức), buff/debuff, đồ mặc trên người nếu có nhắc tới.
- itemUpdates: Theo dõi số lượng thay đổi (bị dùng mất, nhặt thêm) và ai đang cầm nó (newOwner).
- settings/settingUpdates: Nếu người chơi di chuyển tới địa điểm mới hoàn toàn, thêm vào settings. Nếu địa điểm cũ bị thay đổi (cháy, mở cửa), thêm vào settingUpdates.
- characters/items: Thêm MỚI nếu có nhân vật lạ hoặc vật phẩm mới tinh xuất hiện rõ ràng trọng chat.
</requirements>

<json_schema>
{
  "summary": "Ghi chú ngắn ngầm về diễn biến trạng thái (không bắt buộc)",
  "characters": [{"name": "MỚI", "description": "...", "newState": "Trạng thái MỚI NHẤT"}],
  "characterUpdates": [{"name": "ĐÃ CÓ (khớp với list)", "newState": "Trạng thái tổng quát", "currentLocation": "Vị trí", "currentGoal": "Mục tiêu", "currentBodyState": "Tình trạng cơ thể"}],
  "settings": [{"name": "MỚI", "description": "...", "newState": "Trạng thái MỚI NHẤT"}],
  "settingUpdates": [{"name": "ĐÃ CÓ", "newState": "Trạng thái MỚI NHẤT của bối cảnh"}],
  "items": [{"name": "MỚI", "owner": "...", "quantity": "SỐ LƯỢNG (Ví dụ: 1)", "effect": "...", "newState": "Trạng thái"}],
  "itemUpdates": [{"name": "ĐÃ CÓ", "quantity": "SỐ LƯỢNG MỚI NẾU ĐỔI", "newOwner": "Chủ mới nếu có", "newState": "Tình trạng vật phẩm"}],
  "currentState": {"time": "Thời gian hiện tại nếu rõ", "location": "Vị trí hiện tại của MC"}
}
</json_schema>`;

    const systemInst = 'Bạn là máy phân tích JSON tĩnh. Trả về đúng object JSON theo schema.';
    const messages = buildMessages(systemInst, scanPrompt);

    try {
        const rawResult = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, 3, { signal: options.signal });

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
                console.warn('🔍 MVU Scan: Failed to parse JSON', e);
                return null;
            }
        }

        // Validate via Schema (Using the same schema as postWriteScan but relaxed)
        const validationResult = AIScanOutputSchema.safeParse(parsed);
        const validData = validationResult.success ? validationResult.data : parsed;

        const result = {
            characters: Array.isArray(validData.characters) ? validData.characters : [],
            characterUpdates: Array.isArray(validData.characterUpdates) ? validData.characterUpdates : [],
            settings: Array.isArray(validData.settings) ? validData.settings : [],
            settingUpdates: Array.isArray(validData.settingUpdates) ? validData.settingUpdates : [],
            items: Array.isArray(validData.items) ? validData.items : [],
            itemUpdates: Array.isArray(validData.itemUpdates) ? validData.itemUpdates : [],
            currentState: validData.currentState || null,
            summary: validData.summary || ''
        };

        // Fuzzy Dedup to prevent duplicates
        const filteredChars = [];
        for (const char of result.characters) {
            if (!char.name) continue;
            const match = fuzzyFindEntity(char.name, existingChars);
            if (match) {
                result.characterUpdates.push({
                    name: match.name,
                    newInfo: [char.description, char.personality, char.role].filter(Boolean).join('. '),
                    newState: char.newState || undefined
                });
            } else {
                filteredChars.push(char);
            }
        }
        result.characters = filteredChars;

        const filteredItems = [];
        for (const i of result.items) {
            if (!i.name) continue;
            const match = fuzzyFindEntity(i.name, existingItems);
            if (match) {
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

        const filteredSettings = [];
        for (const setting of result.settings) {
            if (!setting.name) continue;
            const match = fuzzyFindEntity(setting.name, existingSettings);
            if (match) {
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

        const changesCount = result.characters.length + result.characterUpdates.length +
            result.items.length + result.itemUpdates.length +
            result.settings.length + result.settingUpdates.length;

        if (onProgress) {
            if (changesCount > 0) {
                onProgress('scan_done', `✅ MVU: Cập nhật ${changesCount} trạng thái thành công.`);
            } else {
                onProgress('scan_done', `✅ MVU: Không phát hiện thay đổi trạng thái nào.`);
            }
        }

        return result;

    } catch (err) {
        console.error('🔍 MVU Scan error:', err);
        if (onProgress) onProgress('scan_error', '⚠️ MVU: Quét trạng thái thất bại');
        return null;
    }
}
