// ================================================
// Prompt Assembler — Roleplay Mode
// ================================================
// Ghép prompt hoàn chỉnh cho AI roleplay,
// theo chuẩn SillyTavern prompt order.

import { scanForMatches, categorizeByPosition, buildLorebookContext } from './lorebookEngine';

/**
 * Thay thế macros trong text.
 */
export function replaceMacros(text, macros = {}) {
    if (!text) return '';
    let result = text;
    const defaultMacros = {
        '{{char}}': macros.charName || 'Nhân vật',
        '{{user}}': macros.userName || 'Người chơi',
        '{{time}}': new Date().toLocaleTimeString('vi-VN'),
        '{{date}}': new Date().toLocaleDateString('vi-VN'),
        '{{idle_duration}}': '',
        '{{random}}': String(Math.floor(Math.random() * 100)),
        '<START>': '',
    };

    for (const [macro, value] of Object.entries(defaultMacros)) {
        result = result.replace(new RegExp(macro.replace(/[{}]/g, '\\$&'), 'gi'), value);
    }

    return result;
}

/**
 * Ghép toàn bộ lorebook entries thành context blocks.
 */
function buildAllLorebookEntries(story) {
    const allEntries = [];

    // Settings (bối cảnh, world info)
    if (story.database?.settings) {
        for (const s of story.database.settings) {
            allEntries.push({
                ...s,
                content: s.description || s.content || '',
                position: s._position ?? 1,
                priority: s._priority ?? 10,
                enabled: s._enabled !== false,
                _alwaysActive: !s.keywords && !s.keys,
            });
        }
    }

    // MetaRules (game systems, controllers, status bars)
    if (story.database?.metaRules) {
        for (const r of story.database.metaRules) {
            allEntries.push({
                ...r,
                content: r.description || r.content || '',
                position: r._position ?? 1,
                priority: r._priority ?? 20,
                enabled: r._enabled !== false,
                _alwaysActive: !r.keywords && !r.keys,
            });
        }
    }

    return allEntries;
}

/**
 * Estimate token count based on typical English/Vietnamese tokenization rules.
 * Lấy hệ số ~ 0.35 từ/char hoặc tính toán nhanh = string.length / 4.
 */
export function estimateTokens(text) {
    if (!text) return 0;
    // Chỉnh hệ số tuỳ model (Claude/GPT thường ~ 4 chars/token).
    // Với tiếng Việt có thể tốn nhiều token hơn nên dùng hệ số an toàn 1 token = 3.5 chars
    return Math.ceil(text.length / 3.5);
}

/**
 * Build system prompt cho roleplay.
 * @param {Object} params
 * @param {Object} params.story Story data
 * @param {Object} params.character Character card data (main character)
 * @param {Object[]} params.chatHistory Chat messages [{role, content}]
 * @param {Object} params.userPersona {name, description}
 * @param {Object} params.macros {charName, userName}
 * @param {number} params.maxContext Vd: 8192 (Default Gemini/Claude context limits)
 * @returns {Object} { messages, matchedEntries, charName, userName }
 */
export function assembleRoleplayPrompt({
    story,
    character,
    chatHistory = [],
    userPersona = {},
    macros = {},
    maxContext = 4096 // Context mặc định nếu không truyền
}) {
    const charName = macros.charName || character?.name || story?.title || 'Nhân vật';
    const userName = macros.userName || userPersona?.name || 'Người chơi';
    const mac = { charName, userName };

    // --- 1. Mức Context Budget & Thresholds ---
    const totalMaxTokens = maxContext;
    let tokensUsed = 0;
    const reservedTokensForResponse = story?.maxOutputTokens || 600; // Để dành cho AI trả lời
    const availableContextTokens = totalMaxTokens - reservedTokensForResponse;

    // --- 2. Scan lorebook ---
    const allEntries = buildAllLorebookEntries(story);
    const recentTexts = chatHistory.map(m => m.content);
    // Tính số lượng từ khóa liên quan dựa trên tin nhắn gần nhất
    const matchedEntries = scanForMatches(recentTexts, allEntries, {
        maxEntries: 15, // Chỉ lấy tối đa 15 top hits để tiết kiệm context
        scanDepth: 10,
    });
    const positioned = categorizeByPosition(matchedEntries);

    // --- 3. Build system instruction (Top Priority - Must Include) ---
    const systemParts = [];

    // System prompt (from card or story)
    const sysPrompt = story?.prohibitions || character?.system_prompt || '';
    if (sysPrompt) {
        systemParts.push(replaceMacros(sysPrompt, mac));
    }

    // Default roleplay instructions
    systemParts.push(`Bạn đang nhập vai làm "${charName}". Hãy trả lời với tư cách nhân vật này.
Quy tắc:
- Luôn giữ vai, KHÔNG bao giờ phá vai hoặc nói "là AI"
- Viết sinh động, mô tả hành động trong *dấu sao*, đối thoại trong "ngoặc kép"
- Phản ứng tự nhiên dựa trên tính cách và bối cảnh nhân vật
- KHÔNG viết hộ hành động/lời nói của ${userName}
- Phản hồi bằng tiếng Việt`);

    // Character description
    const charDesc = character?.description || '';
    if (charDesc) {
        systemParts.push(`\n[Mô tả nhân vật: ${charName}]\n${replaceMacros(charDesc, mac)}`);
    }

    // Character personality
    const charPersonality = character?.personality || '';
    if (charPersonality) {
        systemParts.push(`[Tính cách]\n${replaceMacros(charPersonality, mac)}`);
    }

    // Lorebook before_char
    if (positioned.beforeChar.length > 0) {
        const ctx = buildLorebookContext(positioned.beforeChar);
        systemParts.push(`\n[Thông tin thế giới]\n${replaceMacros(ctx, mac)}`);
    }

    // Scenario
    const scenario = character?.background || character?.scenario || story?.description || '';
    if (scenario) {
        systemParts.push(`\n[Bối cảnh]\n${replaceMacros(scenario, mac)}`);
    }

    // Lorebook after_char
    if (positioned.afterChar.length > 0) {
        const ctx = buildLorebookContext(positioned.afterChar);
        systemParts.push(`\n[Kiến thức bổ sung]\n${replaceMacros(ctx, mac)}`);
    }

    // User persona
    if (userPersona?.description) {
        systemParts.push(`\n[Người chơi: ${userName}]\n${replaceMacros(userPersona.description, mac)}`);
    }

    // Post-history instructions
    const postHistory = story?.globalDirective || character?.post_history_instructions || '';
    if (postHistory) {
        systemParts.push(`\n[Chỉ thị bổ sung]\n${replaceMacros(postHistory, mac)}`);
    }

    // -- Tokenize System & Lorebook --
    const fullSystemString = systemParts.join('\n\n');
    const systemTokenCount = estimateTokens(fullSystemString);
    tokensUsed += systemTokenCount;

    const messages = [];
    messages.push({
        role: 'system',
        content: fullSystemString,
    });

    // --- 4. Chat History (Token Budget Trimming) ---
    // Duyệt ngược lịch sử từ tin nhắn mới nhất đến cũ nhất.
    // Nếu nhồi tin nhắn này vào làm context vượt ngưỡng cho phép, cắt bỏ các tin phía sau.
    let remainingTokensForChat = availableContextTokens - tokensUsed;
    // Đề phòng trường hợp System Prompt tự nó đã ngốn hết Context
    if (remainingTokensForChat <= 100) {
        remainingTokensForChat = 100; // Always attempt to send something
    }

    let historyToSend = [];
    let currentHistoryTokens = 0;

    for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        const msgTokenCount = estimateTokens(msg.content);

        if (currentHistoryTokens + msgTokenCount > remainingTokensForChat) {
            // Reached limit, stop adding older messages
            break;
        }

        historyToSend.unshift({
            role: msg.role === 'assistant' || msg.role === 'char' ? 'assistant' : 'user',
            content: msg.content,
        });
        currentHistoryTokens += msgTokenCount;
    }

    tokensUsed += currentHistoryTokens;

    // --- 5. Depth prompt (inject at depth N in chat history) ---
    const depthPrompt = story?.depthPrompt;
    if (depthPrompt?.prompt && historyToSend.length > 0) {
        const depthN = depthPrompt?.depth || 4;
        const injectIndex = Math.max(0, historyToSend.length - depthN);

        // Inject as a system message
        const depthMessage = {
            role: 'system',
            content: `[Nhắc nhở]\n${replaceMacros(depthPrompt.prompt, mac)}`
        };

        const depthTokenCount = estimateTokens(depthMessage.content);
        // Only inject if it fits
        if (tokensUsed + depthTokenCount <= availableContextTokens) {
            historyToSend.splice(injectIndex, 0, depthMessage);
            tokensUsed += depthTokenCount;
        }
    }

    // Ghép History vào list Messages
    messages.push(...historyToSend);

    console.log(`[PromptAssembler] System:${systemTokenCount} + History:${currentHistoryTokens} = ${tokensUsed} / ${availableContextTokens} limit`);

    return {
        messages,
        matchedEntries: matchedEntries.length,
        charName,
        userName,
    };
}
