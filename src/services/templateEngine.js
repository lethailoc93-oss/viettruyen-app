// ================================================
// Template Engine — EJS-like template processing
// ================================================
// Xử lý các biểu thức template <% %> trong prompt,
// cho phép logic điều kiện, vòng lặp, biến số.
//
// Cú pháp:
//   <% code %>       — chạy JS (không output)
//   <%= expr %>      — output escaped
//   <%- expr %>      — output raw (unescaped)
//   <%# comment %>   — comment (bị loại bỏ)

/**
 * Built-in helpers available inside templates
 */
function createHelpers(storyId) {
    const varsKey = `rp_vars_${storyId || 'global'}`;

    return {
        // Variable management
        getvar(name, opts = {}) {
            try {
                const vars = JSON.parse(localStorage.getItem(varsKey) || '{}');
                const val = vars[name];
                if (val === undefined) return opts.defaults ?? '';
                // Auto-convert numbers
                if (!isNaN(val) && val !== '') return Number(val);
                return val;
            } catch { return opts.defaults ?? ''; }
        },

        setvar(name, value) {
            try {
                const vars = JSON.parse(localStorage.getItem(varsKey) || '{}');
                vars[name] = String(value);
                localStorage.setItem(varsKey, JSON.stringify(vars));
            } catch { /* ignore */ }
            return value;
        },

        addvar(name, change) {
            try {
                const vars = JSON.parse(localStorage.getItem(varsKey) || '{}');
                const current = Number(vars[name] || 0);
                const newVal = current + Number(change);
                vars[name] = String(newVal);
                localStorage.setItem(varsKey, JSON.stringify(vars));
                return newVal;
            } catch { return 0; }
        },

        // Random number
        random(min = 0, max = 100) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        // Roll dice
        roll(notation = '1d20') {
            const m = String(notation).match(/^(\d+)?d(\d+)$/i);
            if (!m) return 0;
            const n = parseInt(m[1] || '1');
            const faces = parseInt(m[2]);
            let sum = 0;
            for (let i = 0; i < n; i++) sum += Math.floor(Math.random() * faces) + 1;
            return sum;
        },

        // Date/time
        now() { return new Date(); },
        time() { return new Date().toLocaleTimeString('vi-VN'); },
        date() { return new Date().toLocaleDateString('vi-VN'); },

        // Conditional include
        iif(condition, trueVal, falseVal = '') {
            return condition ? trueVal : falseVal;
        },

        // Pick random from list
        pick(...items) {
            if (items.length === 1 && Array.isArray(items[0])) items = items[0];
            return items[Math.floor(Math.random() * items.length)];
        },
    };
}

/**
 * Process EJS-like template string.
 * 
 * @param {string} template - the template string containing <% %> tags
 * @param {Object} context - variables available inside the template
 * @param {string} storyId - story ID for variable persistence
 * @returns {string} processed text
 */
export function processTemplate(template, context = {}, storyId = '') {
    if (!template || typeof template !== 'string') return template || '';

    // Quick check: no template tags → return as-is (performance optimization)
    if (!template.includes('<%')) return template;

    const helpers = createHelpers(storyId);

    // Build variable scope
    const scope = {
        ...helpers,
        ...context,
        // Alias for convenience
        variables: new Proxy({}, {
            get(_, prop) {
                return helpers.getvar(prop);
            },
            set(_, prop, value) {
                helpers.setvar(prop, value);
                return true;
            }
        }),
        Math,
        String,
        Number,
        parseInt,
        parseFloat,
        JSON,
        Array,
        Object,
        console: { log: () => { }, warn: () => { }, error: () => { } }, // noop in prod
    };

    try {
        return executeTemplate(template, scope);
    } catch (err) {
        if (import.meta.env.DEV) {
            console.warn('[TemplateEngine] Error:', err.message, '\nTemplate:', template.substring(0, 200));
        }
        // On error, strip template tags and return plain text
        return template.replace(/<%[\s\S]*?%>/g, '');
    }
}

/**
 * Core template executor — compiles EJS-like tags into a function body
 * and executes it safely.
 */
function executeTemplate(template, scope) {
    let output = '';
    let lastIndex = 0;
    const tagRegex = /<%([=#-]?)([\s\S]*?)%>/g;
    let match;

    // Instead of eval, build segments and concatenate
    const segments = [];

    while ((match = tagRegex.exec(template)) !== null) {
        // Text before this tag
        if (match.index > lastIndex) {
            segments.push({ type: 'text', value: template.slice(lastIndex, match.index) });
        }

        const modifier = match[1]; // = # - or empty
        const code = match[2].trim();

        if (modifier === '#') {
            // Comment — skip
        } else if (modifier === '=' || modifier === '-') {
            // Expression output
            segments.push({ type: 'expr', code, raw: modifier === '-' });
        } else {
            // Code block
            segments.push({ type: 'code', code });
        }

        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last tag
    if (lastIndex < template.length) {
        segments.push({ type: 'text', value: template.slice(lastIndex) });
    }

    // Build function body
    let fnBody = 'let __out = "";\n';

    // Destructure scope vars
    const scopeKeys = Object.keys(scope);

    for (const seg of segments) {
        if (seg.type === 'text') {
            fnBody += `__out += ${JSON.stringify(seg.value)};\n`;
        } else if (seg.type === 'expr') {
            if (seg.raw) {
                fnBody += `__out += String(${seg.code});\n`;
            } else {
                fnBody += `__out += String(${seg.code}).replace(/</g, '&lt;').replace(/>/g, '&gt;');\n`;
            }
        } else if (seg.type === 'code') {
            fnBody += seg.code + '\n';
        }
    }

    fnBody += 'return __out;';

    // Execute with scope
    try {
        const fn = new Function(...scopeKeys, fnBody);
        return fn(...scopeKeys.map(k => scope[k]));
    } catch (err) {
        throw new Error(`Template execution error: ${err.message}`);
    }
}

/**
 * Process all template tags in text, replacing macros first then templates.
 * This is the main entry point for use in promptAssembler.
 */
export function processPromptTemplate(text, macros = {}, storyId = '') {
    if (!text) return '';

    const context = {
        char: macros.charName || 'Nhân vật',
        user: macros.userName || 'Người chơi',
        charName: macros.charName || 'Nhân vật',
        userName: macros.userName || 'Người chơi',
    };

    return processTemplate(text, context, storyId);
}
