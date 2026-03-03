// ================================================
// Prompt Assembler — Roleplay Mode
// ================================================
// Ghép prompt hoàn chỉnh cho AI roleplay,
// theo chuẩn SillyTavern prompt order.

import { scanForMatches, categorizeByPosition, buildLorebookContext } from './lorebookEngine';
import { processPromptTemplate } from './templateEngine';
import { formatMemoryForPrompt } from './memorySummarizer';
import { variableManager } from './variableManager';
import { buildPromptOptimization } from './promptOptimizer';

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
        '{{weekday}}': new Date().toLocaleDateString('vi-VN', { weekday: 'long' }),
        '{{idle_duration}}': '',
        '{{random}}': String(Math.floor(Math.random() * 100)),
        '<START>': '',
        '{{original_name}}': macros.originalName || macros.charName || '',
        '{{description}}': macros.description || '',
        '{{personality}}': macros.personality || '',
        '{{scenario}}': macros.scenario || '',
        '{{mesExamples}}': macros.mesExamples || '',
    };

    for (const [macro, value] of Object.entries(defaultMacros)) {
        result = result.replace(new RegExp(macro.replace(/[{}]/g, '\\$&'), 'gi'), value);
    }

    // Xử lý macro động {{random:A,B,C}} và {{pick:A,B,C}}
    result = result.replace(/\{\{(?:random|pick):([^}]+)\}\}/gi, (match, optionsStr) => {
        const options = optionsStr.split(',').map(s => s.trim());
        if (options.length === 0) return '';
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex];
    });

    // Process TavernHelper variables
    result = variableManager.replaceVariableMacros(result);

    return result;
}

/**
 * replaceMacros + processTemplate (EJS) in one step.
 * Used in assembleRoleplayPrompt to enable <% %> tags in prompts.
 */
function replaceAndProcess(text, macros = {}, storyId = '') {
    if (!text) return '';
    let result = replaceMacros(text, macros);
    // Process EJS-like templates if any <% %> tags exist
    if (result.includes('<%')) {
        result = processPromptTemplate(result, macros, storyId);
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
                position: s.position ?? s._position ?? 1,
                priority: s.priority ?? s._priority ?? 10,
                enabled: (s.enabled !== false) && (s._enabled !== false),
                constant: s.constant || false,
                selective: s.selective || false,
                secondary_keys: s.secondary_keys || [],
                match_whole_words: s.match_whole_words || false,
                _alwaysActive: (!s.keywords || s.keywords.toString().trim() === '') && (!s.keys || s.keys.length === 0),
                insertionOrder: s.insertionOrder ?? s._insertion_order ?? 100,
                _insertion_order: s.insertionOrder ?? s._insertion_order ?? 100,
                _depth: s._depth ?? 0,
            });
        }
    }

    // MetaRules (game systems, controllers, status bars)
    if (story.database?.metaRules) {
        for (const r of story.database.metaRules) {
            const ruleContentParts = [];
            if (r.narrativeStyle) ruleContentParts.push(`Phong cách/Nội dung: ${r.narrativeStyle}`);
            if (r.logicLimits) ruleContentParts.push(`Giới hạn logic: ${r.logicLimits}`);
            if (r.dynamicUpdates) ruleContentParts.push(`Cập nhật động: ${r.dynamicUpdates}`);
            if (r.description || r.content) ruleContentParts.push(r.description || r.content);

            allEntries.push({
                ...r,
                content: ruleContentParts.join('\n'),
                position: r.position ?? r._position ?? 1,
                priority: r.priority ?? r._priority ?? 20,
                enabled: (r.enabled !== false) && (r._enabled !== false),
                constant: r.constant || false,
                selective: r.selective || false,
                secondary_keys: r.secondary_keys || [],
                match_whole_words: r.match_whole_words || false,
                _alwaysActive: (!r.keywords || r.keywords.toString().trim() === '') && (!r.keys || r.keys.length === 0),
                insertionOrder: r.insertionOrder ?? r._insertion_order ?? 100,
                _insertion_order: r.insertionOrder ?? r._insertion_order ?? 100,
                _depth: r._depth ?? 0,
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
    maxContext = 4096,
    memorySummary = null,
}) {
    const charName = macros.charName || character?.name || story?.title || 'Nhân vật';
    const userName = macros.userName || userPersona?.name || 'Người chơi';
    const mesExamples = story?.database?.references?.map(r => r.content).join('\n') || '';

    const mac = {
        charName,
        userName,
        originalName: character?.name || story?.title || charName,
        description: character?.description || '',
        personality: character?.personality || story?.personality || '',
        scenario: character?.background || character?.scenario || story?.scenario || story?.description || '',
        mesExamples: mesExamples,
    };

    // --- 1. Mức Context Budget & Thresholds ---
    const totalMaxTokens = maxContext;
    let tokensUsed = 0;
    const reservedTokensForResponse = story?.maxOutputTokens || 600; // Để dành cho AI trả lời
    const availableContextTokens = totalMaxTokens - reservedTokensForResponse;

    // --- 2. Scan lorebook ---
    const allEntries = buildAllLorebookEntries(story);
    const recentTexts = chatHistory.map(m => m.content);
    // Sử dụng scanDepth từ character book config nếu có
    const bookScanDepth = story?._characterBookConfig?.scanDepth || 10;
    const matchedEntries = scanForMatches(recentTexts, allEntries, {
        maxEntries: 15,
        scanDepth: bookScanDepth,
    });
    const positioned = categorizeByPosition(matchedEntries);

    // --- 3. Build system instruction (Top Priority - Must Include) ---
    const systemParts = [];
    const storyId = story?.id || '';

    // System prompt (from card or story)
    const sysPrompt = story?.prohibitions || character?.system_prompt || '';
    if (sysPrompt) {
        systemParts.push(replaceAndProcess(sysPrompt, mac, storyId));
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
        systemParts.push(`\n[Mô tả nhân vật: ${charName}]\n${replaceAndProcess(charDesc, mac, storyId)}`);
    }

    // 🔴 FIX: Character personality — fallback to story.personality
    const charPersonality = character?.personality || story?.personality || '';
    if (charPersonality) {
        systemParts.push(`[Tính cách]\n${replaceAndProcess(charPersonality, mac, storyId)}`);
    }

    // Lorebook before_char
    if (positioned.beforeChar.length > 0) {
        const ctx = buildLorebookContext(positioned.beforeChar);
        systemParts.push(`\n[Thông tin thế giới]\n${replaceAndProcess(ctx, mac, storyId)}`);
    }

    // 🔴 FIX: Scenario — fallback to story.scenario
    const scenario = character?.background || character?.scenario || story?.scenario || story?.description || '';
    if (scenario) {
        systemParts.push(`\n[Bối cảnh]\n${replaceAndProcess(scenario, mac, storyId)}`);
    }

    // Lorebook after_char
    if (positioned.afterChar.length > 0) {
        const ctx = buildLorebookContext(positioned.afterChar);
        systemParts.push(`\n[Kiến thức bổ sung]\n${replaceAndProcess(ctx, mac, storyId)}`);
    }

    // User persona
    if (userPersona?.description) {
        systemParts.push(`\n[Người chơi: ${userName}]\n${replaceAndProcess(userPersona.description, mac, storyId)}`);
    }

    // Post-history instructions
    const postHistory = story?.globalDirective || character?.post_history_instructions || '';
    if (postHistory) {
        systemParts.push(`\n[Chỉ thị bổ sung]\n${replaceAndProcess(postHistory, mac, storyId)}`);
    }

    // R-5: Few-Shot Style Examples — inject example dialogues as explicit style references
    const styleExamples = character?.mes_example || mesExamples || '';
    if (styleExamples && styleExamples.trim().length > 20) {
        systemParts.push(`\n[Ví dụ phong cách viết — BẮT CHƯỚC giọng văn, cách miêu tả hành động, và kiểu thoại trong ví dụ]\n${replaceAndProcess(styleExamples, mac, storyId)}\n[Kết thúc ví dụ — Viết theo phong cách tương tự, KHÔNG sao chép nội dung]`);
    }

    // Memory summary (long-term memory)
    const memoryText = formatMemoryForPrompt(memorySummary);
    if (memoryText) {
        systemParts.push(`\n${memoryText}`);
    }

    // Prompt optimization (author profile + descriptor library — compact mode for roleplay)
    const recentText = chatHistory.map(m => m.content).join(' ');
    const optimizationInst = buildPromptOptimization(story, recentText, { compact: true });
    if (optimizationInst) {
        systemParts.push(optimizationInst);
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

        const depthMessage = {
            role: 'system',
            content: `[Nhắc nhở]\n${replaceMacros(depthPrompt.prompt, mac)}`
        };

        const depthTokenCount = estimateTokens(depthMessage.content);
        if (tokensUsed + depthTokenCount <= availableContextTokens) {
            historyToSend.splice(injectIndex, 0, depthMessage);
            tokensUsed += depthTokenCount;
        }
    }

    // 🔴 FIX: Inject lorebook entries at specific depth positions
    if (positioned.atDepth && Object.keys(positioned.atDepth).length > 0) {
        for (const [depthStr, depthEntries] of Object.entries(positioned.atDepth)) {
            const depthN = parseInt(depthStr);
            if (isNaN(depthN) || depthN <= 0) continue;

            const ctx = buildLorebookContext(depthEntries);
            if (!ctx) continue;

            const depthMessage = {
                role: 'system',
                content: `[Thông tin bổ sung @D${depthN}]\n${replaceMacros(ctx, mac)}`
            };

            const dtCount = estimateTokens(depthMessage.content);
            if (tokensUsed + dtCount <= availableContextTokens) {
                const insertAt = Math.max(0, historyToSend.length - depthN);
                historyToSend.splice(insertAt, 0, depthMessage);
                tokensUsed += dtCount;
            }
        }
    }

    // Ghép History vào list Messages
    messages.push(...historyToSend);

    if (import.meta.env.DEV) console.log(`[PromptAssembler] System:${systemTokenCount} + History:${currentHistoryTokens} = ${tokensUsed} / ${availableContextTokens} limit`);

    return {
        messages,
        matchedEntries: matchedEntries.length,
        charName,
        userName,
    };
}
