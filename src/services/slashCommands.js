// ================================================
// Slash Commands — Registry & Built-in Commands
// ================================================

/**
 * @typedef {Object} SlashCommand
 * @property {string} name
 * @property {string[]} aliases
 * @property {string} description
 * @property {string} usage
 * @property {(args: string, ctx: SlashContext) => void} execute
 */

/**
 * @typedef {Object} SlashContext
 * @property {Array} messages
 * @property {Function} setMessages
 * @property {Object} story
 * @property {string} charName
 * @property {string} userName
 * @property {Function} onClearChat
 * @property {Function} showToast
 */

// Helper: create system message
function sysMsg(content) {
    return {
        id: Date.now() + Math.random(),
        role: 'system',
        content,
        isSlashResult: true,
    };
}

// ─── Built-in commands ───

/** /roll [NdM] — Roll dice */
const rollCommand = {
    name: 'roll',
    aliases: ['dice', 'r'],
    description: 'Tung xúc xắc (VD: /roll 2d6)',
    usage: '/roll [NdM]  — Mặc định: 1d20',
    execute(args, ctx) {
        let n = 1, m = 20;
        const match = args.trim().match(/^(\d+)?d(\d+)$/i);
        if (match) {
            n = parseInt(match[1] || '1', 10);
            m = parseInt(match[2], 10);
        } else if (/^\d+$/.test(args.trim())) {
            m = parseInt(args.trim(), 10);
        }
        n = Math.min(n, 100);
        m = Math.min(m, 1000);

        const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * m) + 1);
        const total = rolls.reduce((a, b) => a + b, 0);
        const detail = n > 1 ? ` [${rolls.join(', ')}]` : '';

        ctx.setMessages(prev => [...prev, sysMsg(`🎲 **${n}d${m}**: **${total}**${detail}`)]);
    },
};

/** /sys [text] — Insert system message */
const sysCommand = {
    name: 'sys',
    aliases: ['system'],
    description: 'Chèn tin nhắn hệ thống vào chat',
    usage: '/sys [nội dung]',
    execute(args, ctx) {
        if (!args.trim()) return ctx.showToast?.('Cần nhập nội dung', 'error');
        ctx.setMessages(prev => [...prev, sysMsg(`📢 ${args.trim()}`)]);
    },
};

/** /note [text] — OOC note */
const noteCommand = {
    name: 'note',
    aliases: ['ooc', 'comment'],
    description: 'Ghi chú ngoài nhân vật (OOC)',
    usage: '/note [nội dung]',
    execute(args, ctx) {
        if (!args.trim()) return ctx.showToast?.('Cần nhập nội dung', 'error');
        ctx.setMessages(prev => [...prev, sysMsg(`📝 *OOC: ${args.trim()}*`)]);
    },
};

/** /clear — Clear chat */
const clearCommand = {
    name: 'clear',
    aliases: ['reset'],
    description: 'Xóa toàn bộ cuộc trò chuyện',
    usage: '/clear',
    execute(_args, ctx) {
        ctx.onClearChat?.();
    },
};

/** /setvar [name] [value] — Set game variable */
const setvarCommand = {
    name: 'setvar',
    aliases: ['sv', 'set'],
    description: 'Đặt biến game state',
    usage: '/setvar [tên] [giá trị]',
    execute(args, ctx) {
        const parts = args.trim().split(/\s+/);
        if (parts.length < 2) return ctx.showToast?.('Cú pháp: /setvar tên giá_trị', 'error');
        const name = parts[0];
        const value = parts.slice(1).join(' ');

        // Store in localStorage per story
        const key = `rp_vars_${ctx.story?.id || 'global'}`;
        const vars = JSON.parse(localStorage.getItem(key) || '{}');
        vars[name] = value;
        localStorage.setItem(key, JSON.stringify(vars));

        ctx.setMessages(prev => [...prev, sysMsg(`⚙️ Đã đặt **${name}** = \`${value}\``)]);
    },
};

/** /getvar [name] — Get game variable */
const getvarCommand = {
    name: 'getvar',
    aliases: ['gv', 'get'],
    description: 'Xem giá trị biến game state',
    usage: '/getvar [tên] — Để trống để xem tất cả',
    execute(args, ctx) {
        const key = `rp_vars_${ctx.story?.id || 'global'}`;
        const vars = JSON.parse(localStorage.getItem(key) || '{}');
        const name = args.trim();

        if (!name) {
            const entries = Object.entries(vars);
            if (entries.length === 0) {
                ctx.setMessages(prev => [...prev, sysMsg('📊 Chưa có biến nào.')]);
            } else {
                const list = entries.map(([k, v]) => `• **${k}**: \`${v}\``).join('\n');
                ctx.setMessages(prev => [...prev, sysMsg(`📊 **Biến game:**\n${list}`)]);
            }
        } else {
            const val = vars[name];
            ctx.setMessages(prev => [...prev, sysMsg(
                val !== undefined
                    ? `📊 **${name}** = \`${val}\``
                    : `📊 Biến **${name}** chưa được đặt.`
            )]);
        }
    },
};

/** /rename [name] — Rename user persona display name */
const renameCommand = {
    name: 'rename',
    aliases: ['name'],
    description: 'Đổi tên hiển thị persona',
    usage: '/rename [tên mới]',
    execute(args, ctx) {
        const newName = args.trim();
        if (!newName) return ctx.showToast?.('Cần nhập tên mới', 'error');
        if (ctx.onRename) {
            ctx.onRename(newName);
            ctx.setMessages(prev => [...prev, sysMsg(`👤 Đã đổi tên thành **${newName}**`)]);
        }
    },
};

/** /help — Show all commands */
const helpCommand = {
    name: 'help',
    aliases: ['?', 'commands'],
    description: 'Hiện danh sách tất cả lệnh',
    usage: '/help',
    execute(_args, ctx) {
        const lines = COMMANDS.map(cmd =>
            `• \`${cmd.usage}\` — ${cmd.description}`
        ).join('\n');
        ctx.setMessages(prev => [...prev, sysMsg(`📖 **Danh sách lệnh:**\n${lines}`)]);
    },
};

// ─── Registry ───

const COMMANDS = [
    rollCommand,
    sysCommand,
    noteCommand,
    clearCommand,
    setvarCommand,
    getvarCommand,
    renameCommand,
    helpCommand,
];

/**
 * Find matching commands for autocomplete
 * @param {string} partial - text after "/"
 * @returns {SlashCommand[]}
 */
export function findMatchingCommands(partial) {
    const q = partial.toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(cmd =>
        cmd.name.startsWith(q) ||
        cmd.aliases.some(a => a.startsWith(q))
    );
}

/**
 * Parse & execute a slash command string
 * @param {string} input - full text starting with "/"
 * @param {SlashContext} ctx
 * @returns {boolean} true if command was found and executed
 */
export function executeSlashCommand(input, ctx) {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return false;

    const spaceIdx = trimmed.indexOf(' ');
    const cmdName = (spaceIdx > 0 ? trimmed.substring(1, spaceIdx) : trimmed.substring(1)).toLowerCase();
    const args = spaceIdx > 0 ? trimmed.substring(spaceIdx + 1) : '';

    const cmd = COMMANDS.find(c =>
        c.name === cmdName || c.aliases.includes(cmdName)
    );

    if (!cmd) {
        ctx.showToast?.(`Lệnh "/${cmdName}" không tồn tại. Gõ /help để xem danh sách.`, 'error');
        return true; // consumed but not found
    }

    try {
        cmd.execute(args, ctx);
    } catch (err) {
        ctx.showToast?.(`Lỗi lệnh /${cmd.name}: ${err.message}`, 'error');
    }
    return true;
}

export { COMMANDS };
