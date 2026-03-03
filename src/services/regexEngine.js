// ================================================
// Regex Script Engine — SillyTavern Compatible
// ================================================
// Xử lý regex scripts từ character cards.
// Biến đổi text (AI output) thành HTML phong phú.
// Tương thích với nhiều format card khác nhau.

/**
 * SillyTavern placement enum.
 */
export const REGEX_PLACEMENT = {
    MD_DISPLAY: 0,   // Deprecated
    USER_INPUT: 1,
    AI_OUTPUT: 2,
    SLASH_COMMAND: 3,
    WORLD_INFO: 5,
    REASONING: 6,
};

/**
 * Parse regex string dạng "/pattern/flags" → RegExp.
 * Hỗ trợ nhiều format:
 *   - SillyTavern: /findRegex/flags
 *   - Plain regex string
 *   - Escaped backslash patterns
 * @param {string} regexStr Regex string, VD: "/hello/gi"
 * @returns {RegExp|null}
 */
export function regexFromString(regexStr) {
    if (!regexStr || typeof regexStr !== 'string') return null;

    try {
        // Find the last slash to separate pattern and flags
        const lastSlashIndex = regexStr.lastIndexOf('/');

        // Check if it's formatted as /pattern/flags
        if (regexStr.startsWith('/') && lastSlashIndex > 0) {
            const pattern = regexStr.substring(1, lastSlashIndex);
            const flags = regexStr.substring(lastSlashIndex + 1);

            // Validate flags (only allow standard JS regex flags)
            const validFlags = flags.split('').filter(f => 'dgimsuy'.includes(f)).join('');

            return new RegExp(pattern, validFlags);
        }

        // Fallback: treat as literal string
        return new RegExp(regexStr);
    } catch (e) {
        console.warn('[RegexEngine] Invalid regex:', regexStr, e.message);
        return null;
    }
}

/**
 * Thay thế macro trong regex pattern.
 * Hỗ trợ {{char}}, {{user}}, {{random}}, {{time}}, {{date}}.
 * @param {string} pattern Regex pattern có thể chứa macros
 * @param {Object} macros { charName, userName }
 * @param {boolean} escape Có escape cho regex không
 * @returns {string} Pattern đã thay macro
 */
function substituteMacros(pattern, macros = {}, escape = false) {
    if (!pattern) return pattern;
    const escapeRegex = (s) => escape ? s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : s;
    return pattern
        .replace(/\{\{char\}\}/gi, escapeRegex(macros.charName || 'Nhân vật'))
        .replace(/\{\{user\}\}/gi, escapeRegex(macros.userName || 'Người chơi'))
        .replace(/\{\{random\}\}/gi, String(Math.floor(Math.random() * 100)))
        .replace(/\{\{time\}\}/gi, new Date().toLocaleTimeString('vi-VN'))
        .replace(/\{\{date\}\}/gi, new Date().toLocaleDateString('vi-VN'));
}

/**
 * Normalize regex script fields.
 * Nhiều card dùng tên field khác nhau — hàm này chuẩn hóa tất cả.
 * @param {Object} script Raw regex script
 * @returns {Object} Normalized script
 */
function normalizeScript(script) {
    if (!script) return null;
    return {
        scriptName: script.scriptName || script.name || '',
        findRegex: script.findRegex || script.find_regex || script.find || '',
        replaceString: script.replaceString || script.replace_string || script.replace || '',
        trimStrings: script.trimStrings || script.trim_strings || [],
        placement: script.placement || [],
        disabled: script.disabled ?? false,
        markdownOnly: script.markdownOnly ?? script.markdown_only ?? false,
        promptOnly: script.promptOnly ?? script.prompt_only ?? false,
        runOnEdit: script.runOnEdit ?? script.run_on_edit ?? false,
        substituteRegex: script.substituteRegex ?? script.substitute_regex ?? 0,
        minDepth: script.minDepth ?? script.min_depth ?? null,
        maxDepth: script.maxDepth ?? script.max_depth ?? null,
    };
}

/**
 * Chạy 1 regex script trên text.
 * Hỗ trợ capture groups ($1, $2...), {{match}}, trimStrings, macro substitution.
 * @param {Object} rawScript Regex script object
 * @param {string} text Input text
 * @param {Object} macros { charName, userName }
 * @returns {string} Transformed text
 */
export function runRegexScript(rawScript, text, macros = {}) {
    const script = normalizeScript(rawScript);
    if (!script || script.disabled || !script.findRegex || !text) {
        return text;
    }

    // Substitute macros in findRegex if needed
    let regexStr = script.findRegex;
    const subMode = Number(script.substituteRegex);
    if (subMode === 1) {
        // RAW substitution
        regexStr = substituteMacros(regexStr, macros, false);
    } else if (subMode === 2) {
        // ESCAPED substitution (safe for regex)
        regexStr = substituteMacros(regexStr, macros, true);
    }

    const findRegex = regexFromString(regexStr);
    if (!findRegex) return text;

    // Prepare replace string: handle {{match}} macro
    const replaceString = (script.replaceString || '')
        .replace(/\{\{match\}\}/gi, '$0');

    try {
        const result = text.replace(findRegex, function (...args) {
            // Replace capture group references ($1, $2, etc.)
            let replaced = replaceString.replace(/\$(\d+)/g, (_, num) => {
                const idx = Number(num);
                const val = args[idx];
                if (val === undefined || val === null) return '';

                // Apply trimStrings
                let filtered = String(val);
                if (Array.isArray(script.trimStrings)) {
                    for (const ts of script.trimStrings) {
                        if (ts) filtered = filtered.replaceAll(ts, '');
                    }
                }
                return filtered;
            });

            // Replace named capture groups ($<name>)
            replaced = replaced.replace(/\$<([^>]+)>/g, (_, groupName) => {
                const groups = args[args.length - 1];
                if (groups && typeof groups === 'object' && groups[groupName]) {
                    let val = String(groups[groupName]);
                    if (Array.isArray(script.trimStrings)) {
                        for (const ts of script.trimStrings) {
                            if (ts) val = val.replaceAll(ts, '');
                        }
                    }
                    return val;
                }
                return '';
            });

            // Substitute macros in the replacement too
            replaced = substituteMacros(replaced, macros);

            return replaced;
        });

        return result;
    } catch (e) {
        console.warn('[RegexEngine] Error running script:', script.scriptName, e.message);
        return text;
    }
}

/**
 * Áp dụng tất cả regex scripts phù hợp lên text.
 * @param {string} text Input text
 * @param {Object[]} scripts Mảng regex scripts từ story.regexScripts
 * @param {number} placement Placement filter (default: AI_OUTPUT = 2)
 * @param {Object} options { isMarkdown, isPrompt, macros }
 * @returns {string} Transformed text
 */
export function applyRegexScripts(text, scripts, placement = REGEX_PLACEMENT.AI_OUTPUT, options = {}) {
    if (!text || !Array.isArray(scripts) || scripts.length === 0) {
        return text;
    }

    const { isMarkdown = true, isPrompt = false, macros = {} } = options;
    let result = text;

    for (const rawScript of scripts) {
        const script = normalizeScript(rawScript);
        if (!script) continue;

        // Skip disabled
        if (script.disabled) continue;

        // Check markdownOnly / promptOnly flags
        if (script.markdownOnly && !isMarkdown) continue;
        if (script.promptOnly && !isPrompt) continue;

        // Check placement match
        const scriptPlacement = Array.isArray(script.placement) ? script.placement : [script.placement];
        const targetPlacements = Array.isArray(placement) ? placement : [placement];
        const hasPlacementMatch = scriptPlacement.some(p => targetPlacements.includes(p));

        if (scriptPlacement.length > 0 && !hasPlacementMatch) continue;

        const oldResult = result;
        result = runRegexScript(rawScript, result, macros);

        if (oldResult !== result) {
            if (import.meta.env.DEV) console.log(`[RegexEngine] Script "${script.scriptName}" transformed text.`);
        }
    }

    return result;
}

/**
 * Kiểm tra xem text có bị biến đổi bởi regex scripts không.
 * @param {string} originalText Text gốc
 * @param {string} transformedText Text sau khi qua regex
 * @returns {boolean}
 */
export function hasRegexTransformation(originalText, transformedText) {
    return originalText !== transformedText;
}

/**
 * Trích xuất HTML content từ markdown code block.
 * SillyTavern regex scripts thường wrap output trong ```html ... ```
 * Hỗ trợ nhiều format:
 *   - ```html ... ``` (standard)
 *   - ```htm ... ```
 *   - ``` ... ``` (no language)
 *   - Mixed: text trước/sau code block
 * @param {string} text Text có thể chứa ```html blocks
 * @returns {string} HTML thuần hoặc text gốc
 */
export function extractHtmlFromCodeBlock(text) {
    if (!text) return '';

    // Match ```html ... ``` blocks (có thể ở giữa text khác)
    const htmlMatch = text.match(/```html\s*\n?([\s\S]*?)```/);
    if (htmlMatch) {
        return htmlMatch[1].trim();
    }

    // Match ```htm ... ``` or just ``` ... ```
    const codeMatch = text.match(/```(?:htm)?\s*\n?([\s\S]*?)```/);
    if (codeMatch) {
        return codeMatch[1].trim();
    }

    return text;
}
