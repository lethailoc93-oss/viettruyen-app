// ================================================
// Import/Export Utility Module — VietTruyenBanChua
// ================================================
import { Utils } from './helpers';

// ── Export: Download items as JSON ──
export function exportItemsToJSON(items, filename = 'export.json') {
    if (!items || items.length === 0) {
        alert('Không có dữ liệu để xuất!');
        return;
    }
    const data = {
        _exportMeta: {
            app: 'VietTruyenBanChua',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            count: items.length
        },
        items
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Export single item ──
export function exportSingleItemToJSON(item, filename = 'export.json') {
    if (!item) return;
    const json = JSON.stringify(item, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Import: Read JSON file and return parsed items ──
export function importItemsFromJSON(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('Không có file'));

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                let items = [];

                // Our own format: { _exportMeta, items: [...] }
                if (parsed._exportMeta && Array.isArray(parsed.items)) {
                    items = parsed.items;
                }
                // Direct array
                else if (Array.isArray(parsed)) {
                    items = parsed;
                }
                // Single object (no array)
                else if (typeof parsed === 'object' && parsed.name) {
                    items = [parsed];
                }
                // Character card V2/V3 (chara_card_v2 spec)
                else if (parsed.spec === 'chara_card_v2' || parsed.spec === 'chara_card_v3') {
                    items = [convertCardToCharacter(parsed)];
                }
                // Character card V1 (has char_name or name + first_mes)
                else if (parsed.char_name || (parsed.name && parsed.first_mes !== undefined)) {
                    items = [convertCardToCharacter(parsed)];
                }
                // World Info format (entries object)
                else if (parsed.entries && typeof parsed.entries === 'object') {
                    items = convertWorldInfoToSettings(parsed);
                }
                else {
                    return reject(new Error('Không nhận diện được định dạng file. Cần JSON array hoặc object có trường "name".'));
                }

                // Assign new IDs to avoid conflicts
                items = items.map(item => ({
                    ...item,
                    id: Utils.generateId()
                }));

                resolve(items);
            } catch (err) {
                reject(new Error('File JSON không hợp lệ: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Không thể đọc file'));
        reader.readAsText(file);
    });
}

// ── Trigger file picker and return imported items ──
export function triggerImport(accept = '.json') {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = false;
        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                if (!file) return resolve([]);
                const items = await importItemsFromJSON(file);
                resolve(items);
            } catch (err) {
                reject(err);
            }
        };
        input.click();
    });
}

// ═══════════════════════════════════════════════════
// Character Card Converters (chara_card_v2 spec)
// ═══════════════════════════════════════════════════

/**
 * Convert character card (V1/V2/V3) → app character format.
 * Supports the chara_card_v2 specification used widely by roleplay apps.
 */
export function convertCardToCharacter(card) {
    // V2 stores data in card.data, V1 stores at top level
    const d = card.data || card;

    return {
        name: d.name || card.name || card.char_name || 'Nhân vật',
        role: d.creator_notes ? 'Nhập từ Thẻ nhân vật' : '',
        description: d.description || card.char_persona || '',
        personality: d.personality || '',
        background: d.scenario || card.world_scenario || '',
        abilities: '',
        motivation: '',
        relationships: '',
        weakness: '',
        appearance: '',
        gender: '',
        age: '',
        // Map card-specific fields
        notes: [
            d.creator_notes && `Ghi chú tác giả: ${d.creator_notes}`,
            d.system_prompt && `System Prompt: ${d.system_prompt}`,
            d.post_history_instructions && `Post-history: ${d.post_history_instructions}`,
            d.first_mes && `Tin nhắn mở đầu: ${d.first_mes}`,
            d.mes_example && `Ví dụ hội thoại:\n${d.mes_example}`,
            d.character_version && `Phiên bản: ${d.character_version}`,
            d.creator && `Tác giả: ${d.creator}`,
        ].filter(Boolean).join('\n\n'),
        keywords: Array.isArray(d.tags) ? d.tags.join(', ') : '',
        // Preserve original spec for reference
        _cardSpec: card.spec ? card.spec : 'v1',
        // Lorebook
        insertionOrder: '',
        priority: '',
        alwaysActive: false,
        // Dynamic (empty for import)
        currentLocation: '', currentClothing: '', currentState: '',
        currentGoal: '', currentPosture: '', currentBodyState: '',
        specialStatus: '',
        bodyFeatures: '', clothingPreference: '', hobbies: '',
        longTermGoal: '', importantRelationships: '',
        backgroundSetting: '', attitudeToProtagonist: '',
        actionHistory: '',
    };
}

/**
 * Convert app character → chara_card_v2-compatible character card JSON.
 * This is the app's native export format for character cards.
 */
export function convertCharacterToCard(appChar) {
    return {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: appChar.name || '',
            description: appChar.description || appChar.personality || '',
            personality: appChar.personality || '',
            scenario: appChar.background || '',
            first_mes: '',
            mes_example: '',
            creator_notes: [
                appChar.role && `Vai trò: ${appChar.role}`,
                appChar.appearance && `Ngoại hình: ${appChar.appearance}`,
                appChar.weakness && `Điểm yếu: ${appChar.weakness}`,
                appChar.motivation && `Động lực: ${appChar.motivation}`,
                appChar.abilities && `Năng lực: ${appChar.abilities}`,
                appChar.relationships && `Quan hệ: ${appChar.relationships}`,
            ].filter(Boolean).join('\n'),
            system_prompt: '',
            post_history_instructions: '',
            tags: appChar.keywords ? appChar.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
            creator: 'VietTruyenBanChua',
            character_version: '1.0',
            alternate_greetings: [],
            extensions: {
                talkativeness: 0.5,
                fav: false,
                world: '',
            }
        },
        // V1 compat fields
        name: appChar.name || '',
        description: appChar.description || '',
        personality: appChar.personality || '',
        scenario: appChar.background || '',
        first_mes: '',
        mes_example: '',
    };
}

/**
 * Convert World Info entries → app settings/locations format.
 */
export function convertWorldInfoToSettings(worldInfo) {
    const entries = worldInfo.entries || {};
    const items = [];

    // entries can be an object with numeric keys or an array
    const entryList = Array.isArray(entries)
        ? entries
        : Object.values(entries);

    for (const entry of entryList) {
        items.push({
            name: entry.comment || entry.key?.[0] || entry.keys?.[0] || 'World Entry',
            description: entry.content || '',
            keywords: Array.isArray(entry.key || entry.keys)
                ? (entry.key || entry.keys).join(', ')
                : '',
            notes: [
                entry.comment && `Comment: ${entry.comment}`,
                entry.position !== undefined && `Position: ${entry.position === 0 ? 'before_char' : 'after_char'}`,
            ].filter(Boolean).join('\n'),
        });
    }

    return items;
}

// ═══════════════════════════════════════════════════
// PNG Character Card — Đọc/Ghi metadata ảnh
// ═══════════════════════════════════════════════════

/**
 * Decode base64 string → UTF-8 JSON string.
 * atob() trả về Latin-1, cần convert sang UTF-8 cho tiếng Việt/CJK/emoji.
 */
function decodeBase64UTF8(base64Str) {
    try {
        const binaryStr = atob(base64Str);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
    } catch (err) {
        console.warn('decodeBase64UTF8 failed, returning raw atob:', err);
        return atob(base64Str);
    }
}

/**
 * Đọc tất cả tEXt chunks từ PNG buffer và trả về map keyword → value.
 */
function readPNGTextChunks(buffer) {
    const view = new DataView(buffer);
    const chunks = {};

    let offset = 8; // Bỏ qua PNG signature
    while (offset < buffer.byteLength) {
        const length = view.getUint32(offset);
        const typeBytes = new Uint8Array(buffer, offset + 4, 4);
        const type = String.fromCharCode(...typeBytes);

        if (type === 'tEXt') {
            const chunkData = new Uint8Array(buffer, offset + 8, length);
            let nullIndex = -1;
            for (let i = 0; i < chunkData.length; i++) {
                if (chunkData[i] === 0) { nullIndex = i; break; }
            }
            if (nullIndex > 0) {
                const keyword = new TextDecoder('latin1').decode(chunkData.slice(0, nullIndex));
                const valueBytes = chunkData.slice(nullIndex + 1);
                const base64Str = new TextDecoder('latin1').decode(valueBytes);
                try {
                    const jsonStr = decodeBase64UTF8(base64Str);
                    chunks[keyword] = JSON.parse(jsonStr);
                } catch (e) {
                    console.warn(`PNG chunk "${keyword}" parse error:`, e.message);
                }
            }
        }

        if (type === 'IEND') break;
        offset += 12 + length;
    }

    return chunks;
}

/**
 * Trích xuất dữ liệu nhân vật từ PNG tEXt chunks.
 * Đọc cả "chara" (V1/V2) và "ccv3" (V3) chunks, merge lại.
 * V3 data ưu tiên hơn V2 vì chứa đầy đủ hơn (character_book, extensions...).
 * @param {File} file File ảnh PNG
 * @returns {Promise<Object>} Character card object đã parse (merged)
 */
export async function extractCharaFromPNG(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Kiểm tra PNG signature (8 bytes)
    const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
        if (view.getUint8(i) !== PNG_SIG[i]) {
            throw new Error('File không phải PNG hợp lệ.');
        }
    }

    // Đọc tất cả text chunks
    const chunks = readPNGTextChunks(buffer);

    // Ưu tiên ccv3 (V3 — đầy đủ nhất), fallback chara (V2/V1)
    const charaData = chunks['chara'];
    const ccv3Data = chunks['ccv3'];

    if (!charaData && !ccv3Data) {
        throw new Error('Không tìm thấy dữ liệu Thẻ nhân vật trong ảnh PNG này.');
    }

    // Merge: bắt đầu từ chara, overlay ccv3 lên trên
    let merged;
    if (ccv3Data && charaData) {
        // Deep merge: ccv3 override chara, nhưng giữ lại fields chỉ có trong chara
        merged = { ...charaData };
        // Copy top-level ccv3 fields
        for (const [key, val] of Object.entries(ccv3Data)) {
            if (key === 'data' && merged.data) {
                // Merge data object
                merged.data = { ...merged.data, ...val };
                // Merge extensions deep
                if (val.extensions && merged.data.extensions) {
                    merged.data.extensions = { ...merged.data.extensions, ...val.extensions };
                }
                // ccv3's character_book replaces chara's (more complete)
                if (val.character_book) {
                    merged.data.character_book = val.character_book;
                }
            } else {
                merged[key] = val;
            }
        }
        // Copy regex_scripts from ccv3 if available
        if (ccv3Data.regex_scripts) {
            merged.regex_scripts = ccv3Data.regex_scripts;
        }
    } else {
        merged = ccv3Data || charaData;
    }

    return merged;
}

/**
 * Nhúng dữ liệu nhân vật vào PNG dưới dạng tEXt chunk (keyword: "chara").
 * Tạo ra ảnh PNG mới chứa metadata nhân vật — Thẻ nhân vật app.
 * @param {File|Blob} pngFile File ảnh PNG gốc
 * @param {Object} charaData Character card data (chara_card_v2 format)
 * @returns {Promise<Blob>} Blob PNG mới với metadata nhúng
 */
export async function embedCharaIntoPNG(pngFile, charaData) {
    const buffer = await pngFile.arrayBuffer();
    const view = new DataView(buffer);

    // Kiểm tra PNG signature
    const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
        if (view.getUint8(i) !== PNG_SIG[i]) {
            throw new Error('File không phải PNG hợp lệ.');
        }
    }

    // Encode character data → base64
    const jsonStr = JSON.stringify(charaData);
    const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));

    // Tạo tEXt chunk: keyword("chara") + null + base64 value
    const keyword = new TextEncoder().encode('chara');
    const value = new TextEncoder().encode(base64Str);
    const chunkDataLength = keyword.length + 1 + value.length; // +1 for null byte

    // Build tEXt chunk: [length:4][type:4][keyword\0value][crc:4]
    const chunkBuffer = new ArrayBuffer(12 + chunkDataLength);
    const chunkView = new DataView(chunkBuffer);
    const chunkArray = new Uint8Array(chunkBuffer);

    // Length
    chunkView.setUint32(0, chunkDataLength);
    // Type "tEXt"
    chunkArray[4] = 116; // t
    chunkArray[5] = 69;  // E
    chunkArray[6] = 88;  // X
    chunkArray[7] = 116; // t
    // Keyword
    chunkArray.set(keyword, 8);
    // Null separator
    chunkArray[8 + keyword.length] = 0;
    // Value
    chunkArray.set(value, 8 + keyword.length + 1);
    // CRC32 (type + data)
    const crcData = new Uint8Array(chunkBuffer, 4, 4 + chunkDataLength);
    const crc = crc32(crcData);
    chunkView.setUint32(8 + chunkDataLength, crc);

    // Tìm vị trí IEND chunk trong file gốc (loại bỏ tEXt cũ nếu có)
    let offset = 8;
    const chunks = [new Uint8Array(buffer, 0, 8)]; // PNG signature
    let hasExistingChara = false;

    while (offset < buffer.byteLength) {
        const length = view.getUint32(offset);
        const typeBytes = new Uint8Array(buffer, offset + 4, 4);
        const type = String.fromCharCode(...typeBytes);
        const chunkSize = 12 + length;

        if (type === 'tEXt') {
            // Kiểm tra xem đây có phải tEXt chunk "chara" cũ không
            const chunkContent = new Uint8Array(buffer, offset + 8, length);
            let nullIdx = -1;
            for (let i = 0; i < chunkContent.length; i++) {
                if (chunkContent[i] === 0) { nullIdx = i; break; }
            }
            if (nullIdx > 0) {
                const kw = new TextDecoder('latin1').decode(chunkContent.slice(0, nullIdx));
                if (kw === 'chara') {
                    hasExistingChara = true;
                    offset += chunkSize;
                    continue; // Bỏ qua chunk chara cũ
                }
            }
        }

        if (type === 'IEND') {
            // Chèn tEXt chunk mới trước IEND
            chunks.push(new Uint8Array(chunkBuffer));
            chunks.push(new Uint8Array(buffer, offset, chunkSize));
            break;
        }

        chunks.push(new Uint8Array(buffer, offset, chunkSize));
        offset += chunkSize;
    }

    // Ghép tất cả chunks thành 1 Blob PNG mới
    return new Blob(chunks, { type: 'image/png' });
}

/**
 * CRC32 calculation for PNG chunks.
 */
function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ═══════════════════════════════════════════════════
// Smart Character Card Import (JSON hoặc PNG)
// ═══════════════════════════════════════════════════

/**
 * Nhập thông minh: tự nhận diện file JSON hoặc PNG,
 * bóc tách metadata và convert sang format app.
 * @param {File} file File JSON hoặc PNG
 * @returns {Promise<Object>} Array nhân vật đã convert
 */
export async function importCharacterCard(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    const isPNG = ext === 'png' || file.type === 'image/png' || ext === 'webp' || file.type === 'image/webp';

    if (isPNG) {
        // Đọc metadata từ PNG
        const card = await extractCharaFromPNG(file);
        const character = convertCardToCharacter(card);
        character.id = Utils.generateId();

        // Cố gắng convert ảnh sang Data URL để sử dụng làm avatar
        let avatarUrl = null;
        try {
            avatarUrl = URL.createObjectURL(file);
        } catch (e) {
            console.warn('Không thể tạo object URL từ file ảnh', e);
        }

        // Nếu card có lorebook entries → trích riêng
        const d = card.data || card;
        let lorebookEntries = [];
        if (d.extensions?.world_book?.entries || d.character_book?.entries) {
            const entries = d.extensions?.world_book?.entries || d.character_book?.entries;
            const worldInfo = { entries };
            lorebookEntries = convertWorldInfoToSettings(worldInfo).map(e => ({
                ...e,
                id: Utils.generateId()
            }));
        }

        return {
            characters: [character],
            lorebook: lorebookEntries,
            // Nếu có system prompt trong card → trích cho Chỉ thị viết
            systemPrompt: d.system_prompt || '',
            avatarUrl: avatarUrl, // Ảnh gốc dùng làm avatar
        };
    } else {
        // JSON — thử parse bình thường
        const items = await importItemsFromJSON(file);
        return {
            characters: items,
            lorebook: [],
            systemPrompt: '',
            avatarUrl: null,
        };
    }
}

// ═══════════════════════════════════════════════════
// AI Preset Parser
// ═══════════════════════════════════════════════════

/**
 * Phân tích và trích xuất dữ liệu từ các file Preset AI.
 * Hỗ trợ nhiều format: Instruct, Context, Master Export, API Settings.
 * @param {File} file File JSON preset
 * @returns {Promise<Object>} Object chứa các trường đã trích xuất
 */
export const parsePresetFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                let extracted = { type: 'unknown', data: {} };

                // Dọn dẹp macro template (vd: {{char}}, {{user}})
                const cleanMacro = (text) => {
                    if (!text) return '';
                    return text
                        .replace(/\{\{char\}\}/gi, 'Nhân vật')
                        .replace(/\{\{user\}\}/gi, 'Người đọc/Nhân vật phụ')
                        .replace(/<START>/gi, '')
                        .trim();
                };

                // Phân tích Instruct Mode Preset
                if (data.system_prompt !== undefined || data.input_formatting !== undefined) {
                    extracted.type = 'instruct';
                    let directive = [];
                    if (data.system_prompt) directive.push(cleanMacro(data.system_prompt));
                    if (data.input_formatting) directive.push(cleanMacro(data.input_formatting));

                    if (directive.length > 0) {
                        extracted.data.globalDirective = directive.join('\n\n');
                    }
                }

                // Phân tích Context Preset
                if (data.story_string !== undefined || data.chat_start_string !== undefined) {
                    extracted.type = 'context';
                    let directive = [];
                    if (data.story_string) directive.push(cleanMacro(data.story_string));

                    if (directive.length > 0) {
                        if (extracted.data.globalDirective) {
                            extracted.data.globalDirective += '\n\n' + directive.join('\n\n');
                        } else {
                            extracted.data.globalDirective = directive.join('\n\n');
                        }
                    }
                }

                // Phân tích Format tổng hợp (Master Export / Default)
                if (data.context && data.instruct) {
                    extracted.type = 'master';
                    let directive = [];
                    if (data.context.story_string) directive.push(cleanMacro(data.context.story_string));
                    if (data.instruct.system_prompt) directive.push(cleanMacro(data.instruct.system_prompt));
                    if (data.instruct.input_formatting) directive.push(cleanMacro(data.instruct.input_formatting));

                    if (directive.length > 0) {
                        extracted.data.globalDirective = directive.join('\n\n');
                    }
                }

                // Phân tích API Settings (OpenAI / TextGen / Kobold...)
                const lookForTokens = (sourceObj) => {
                    if (sourceObj.max_length) {
                        extracted.data.maxOutputTokens = parseInt(sourceObj.max_length);
                    } else if (sourceObj.max_tokens) {
                        extracted.data.maxOutputTokens = parseInt(sourceObj.max_tokens);
                    }

                    if (sourceObj.max_context) {
                        extracted.data.maxInputTokens = parseInt(sourceObj.max_context);
                    } else if (sourceObj.max_context_length) {
                        extracted.data.maxInputTokens = parseInt(sourceObj.max_context_length);
                    }
                };

                lookForTokens(data);
                if (extracted.type === 'master' && data.api_settings) {
                    lookForTokens(data.api_settings);
                }

                // Fallback: file có text prompt nhưng ko rõ chuẩn
                if (extracted.type === 'unknown' && Object.keys(extracted.data).length === 0) {
                    if (data.prompt && typeof data.prompt === 'string') {
                        extracted.data.globalDirective = cleanMacro(data.prompt);
                        extracted.type = 'raw_prompt';
                    }
                }

                resolve(extracted);

            } catch (err) {
                console.error("Lỗi parse preset:", err);
                reject(new Error("File JSON không hợp lệ hoặc dữ liệu bị hỏng."));
            }
        };
        reader.onerror = () => reject(new Error("Không thể đọc file."));
        reader.readAsText(file);
    });
};

// ═══════════════════════════════════════════════════
// Backward Compatibility Aliases
// ═══════════════════════════════════════════════════
// Giữ tên cũ để không break các component chưa cập nhật
export const convertSTCharToAppChar = convertCardToCharacter;
export const convertAppCharToSTCard = convertCharacterToCard;
export const convertSTWorldInfoToAppSettings = convertWorldInfoToSettings;
export const parseSillyTavernPreset = parsePresetFile;
