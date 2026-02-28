// ================================================
// Data Maid — scan and clean unused story data
// ================================================

/**
 * Scan story for data that may be unused/orphaned.
 * Returns categorized findings with cleanup options.
 *
 * @param {Object} story - The full story object
 * @returns {Object} { findings: Array, stats: Object }
 */
export function scanStoryData(story) {
    if (!story?.database) return { findings: [], stats: {} };

    const db = story.database;
    const chapters = db.chapters || [];
    const allContent = chapters.map(c => (c.content || '') + ' ' + (c.summary || '')).join(' ').toLowerCase();

    const findings = [];

    // === 1. Characters never mentioned in any chapter ===
    const characters = db.characters || [];
    characters.forEach(c => {
        const name = (c.name || '').toLowerCase();
        if (name.length >= 2 && !allContent.includes(name)) {
            findings.push({
                type: 'character',
                icon: '👤',
                id: c.id,
                name: c.name,
                reason: 'Chưa từng xuất hiện trong bất kỳ chương nào',
                severity: 'warning'
            });
        }
    });

    // === 2. Empty chapters (no content and no outline) ===
    chapters.forEach(c => {
        if (!c.content && !c.outline && !c.summary) {
            findings.push({
                type: 'chapter',
                icon: '📄',
                id: c.id,
                name: `Chương ${c.order || '?'}: ${c.title || 'Trống'}`,
                reason: 'Chương trống — không có nội dung, tóm tắt, hoặc dàn ý',
                severity: 'info'
            });
        }
    });

    // === 3. Settings never mentioned ===
    const settings = db.settings || [];
    settings.forEach(s => {
        const name = (s.name || '').toLowerCase();
        if (name.length >= 2 && !allContent.includes(name)) {
            findings.push({
                type: 'setting',
                icon: '🏞️',
                id: s.id,
                name: s.name,
                reason: 'Bối cảnh chưa được nhắc trong truyện',
                severity: 'info'
            });
        }
    });

    // === 4. References with no content ===
    const refs = db.references || [];
    refs.forEach(r => {
        if (!r.content || r.content.trim().length < 10) {
            findings.push({
                type: 'reference',
                icon: '📎',
                id: r.id,
                name: r.name || r.title || 'Tài liệu',
                reason: 'Tài liệu rỗng hoặc quá ngắn',
                severity: 'warning'
            });
        }
    });

    // === 5. Archived branches ===
    const branches = db.branches || [];
    const archivedBranches = branches.filter(b => b.status === 'archived');
    archivedBranches.forEach(b => {
        findings.push({
            type: 'branch',
            icon: '🔀',
            id: b.id,
            name: b.name,
            reason: 'Nhánh đã lưu trữ — có thể xóa để giảm dung lượng',
            severity: 'info'
        });
    });

    // === 6. Duplicate entity names ===
    const nameMap = {};
    const entityTypes = [
        { key: 'characters', label: 'Nhân vật' },
        { key: 'settings', label: 'Bối cảnh' },
        { key: 'items', label: 'Vật phẩm' },
    ];
    entityTypes.forEach(({ key, label }) => {
        (db[key] || []).forEach(e => {
            const name = (e.name || '').toLowerCase().trim();
            if (!name) return;
            if (nameMap[name]) {
                findings.push({
                    type: 'duplicate',
                    icon: '⚠️',
                    id: e.id,
                    name: `${e.name} (${label})`,
                    reason: `Trùng tên với entity khác`,
                    severity: 'warning'
                });
            }
            nameMap[name] = true;
        });
    });

    // Stats
    const stats = {
        totalCharacters: characters.length,
        totalChapters: chapters.length,
        totalSettings: settings.length,
        totalReferences: refs.length,
        totalBranches: branches.length,
        totalFindings: findings.length,
        estimatedSize: Math.round(JSON.stringify(story).length / 1024)
    };

    return { findings, stats };
}

/**
 * Delete specific items from story database by type and ID.
 * Returns list of operations to perform.
 *
 * @param {string[]} itemIds - IDs to delete
 * @param {string} type - Entity type key in database
 * @param {Object} ops - Database operations object (e.g., characterOps)
 */
export function cleanupItems(itemIds, ops) {
    if (!itemIds?.length || !ops?.delete) return;
    itemIds.forEach(id => {
        try {
            ops.delete(id);
        } catch (e) {
            console.warn(`[DataMaid] Failed to delete ${id}:`, e);
        }
    });
}
