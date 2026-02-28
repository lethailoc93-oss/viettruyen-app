// ================================================
// Auto Workflow Service — chapter-by-chapter writer
// ================================================
import { AIService } from './aiService';
import { invalidateEmbeddingCache } from './ragService';

/**
 * AutoWorkflowRunner — viết tự động từng chương một.
 *
 * Flow mỗi vòng:
 *   1. Tìm chương chưa viết (content rỗng)
 *   2. Nếu không có → tạo chương mới
 *   3. Nếu chưa có outline → tạo outline
 *   4. Viết chương (streaming + retry)
 *   5. Post-write scan
 *   6. Lặp lại
 *
 * Usage:
 *   const runner = new AutoWorkflowRunner(config, deps);
 *   runner.start();
 *   runner.pause() / runner.resume() / runner.stop();
 */
export class AutoWorkflowRunner {
    constructor(config, deps) {
        this.config = config; // { chapterCount, delayBetweenChapters, autoOutline }
        this.deps = deps;

        this.status = 'idle'; // idle | running | paused | stopped | completed
        this.currentChapter = 0;
        this.logs = [];
        this._pauseResolve = null;
        this._abortController = null;
    }

    // ─── Public API ───

    async start() {
        if (this.status === 'running') return;
        this.status = 'running';
        this.currentChapter = 0;
        this.logs = [];
        this._abortController = new AbortController();

        this.deps.onStatusChange?.(this.status);

        const totalChapters = this.config.chapterCount || 1;
        const isInfinite = this.config.chapterCount === 0;

        try {
            while (isInfinite || this.currentChapter < totalChapters) {
                if (this._isAborted()) break;
                await this._checkPause();
                if (this._isAborted()) break;

                this.currentChapter++;
                const label = isInfinite
                    ? `Chương ${this.currentChapter}`
                    : `Chương ${this.currentChapter}/${totalChapters}`;
                this._log('info', `🚀 Bắt đầu ${label}`);
                this.deps.onProgress?.(`Đang chuẩn bị ${label}...`);

                // Step 1: Find or create an unwritten chapter
                const chapter = await this._findOrCreateChapter();
                if (!chapter) {
                    this._log('error', '❌ Không thể tìm/tạo chương mới');
                    break;
                }
                this._log('info', `📖 Chương: "${chapter.title}"`);

                // Step 2: Auto-generate outline if missing
                if (this.config.autoOutline && (!chapter.outline || chapter.outline.trim() === '')) {
                    await this._generateOutlineForChapter(chapter);
                }

                // Step 3: Write the chapter
                const success = await this._writeOneChapter(chapter);
                if (!success) {
                    this._log('error', `❌ Viết chương "${chapter.title}" thất bại, tiếp tục chương kế...`);
                }

                // Step 4: Post-write scan
                if (success) {
                    await this._postWriteScan(chapter);
                }

                // Delay before next chapter
                if (!this._isAborted() && (isInfinite || this.currentChapter < totalChapters)) {
                    const delaySec = this.config.delayBetweenChapters || 3;
                    this._log('info', `⏳ Chờ ${delaySec}s trước chương kế tiếp...`);
                    await this._delay(delaySec * 1000);
                }
            }
        } catch (err) {
            if (!this._isAborted()) {
                this._log('error', `❌ Lỗi: ${err.message}`);
            }
        }

        if (this.status !== 'stopped') {
            this.status = 'completed';
            this._log('success', `✅ Hoàn thành! Đã viết ${this.currentChapter} chương.`);
        }
        this.deps.onStatusChange?.(this.status);
        this.deps.onComplete?.(this.logs);
    }

    pause() {
        if (this.status === 'running') {
            this.status = 'paused';
            this.deps.onStatusChange?.(this.status);
            this._log('info', '⏸️ Đã tạm dừng');
        }
    }

    resume() {
        if (this.status === 'paused') {
            this.status = 'running';
            this.deps.onStatusChange?.(this.status);
            this._log('info', '▶️ Tiếp tục');
            if (this._pauseResolve) {
                this._pauseResolve();
                this._pauseResolve = null;
            }
        }
    }

    stop() {
        this.status = 'stopped';
        this._abortController?.abort();
        if (this._pauseResolve) {
            this._pauseResolve();
            this._pauseResolve = null;
        }
        this.deps.onStatusChange?.(this.status);
        this._log('info', '⏹️ Đã dừng');
    }

    // ─── Core Steps ───

    /**
     * Find first chapter with no content. If none, create a new one.
     * Uses polling to ensure React state has propagated.
     */
    async _findOrCreateChapter() {
        const story = this.deps.getStory();
        const chapters = story?.database?.chapters || [];

        // Find first unwritten chapter
        const unwritten = chapters.find(ch => !ch.content || ch.content.trim() === '');
        if (unwritten) return unwritten;

        // All written → create new chapter with unique title
        const existingTitles = new Set(chapters.map(ch => ch.title));
        let nextOrder = chapters.length + 1;
        let newTitle = `Chương ${nextOrder}`;
        // Avoid duplicate titles
        while (existingTitles.has(newTitle)) {
            nextOrder++;
            newTitle = `Chương ${nextOrder}`;
        }

        this.deps.chapterOps?.add({
            title: newTitle,
            order: nextOrder,
            content: '',
            outline: '',
            summary: '',
        });
        this._log('info', `📖 Tạo chương mới: ${newTitle}`);

        // Poll for the new chapter to appear in state (React state updates are async)
        for (let attempt = 0; attempt < 10; attempt++) {
            await this._delay(500);
            if (this._isAborted()) return null;
            const freshStory = this.deps.getStory();
            const freshChapters = freshStory?.database?.chapters || [];
            const newCh = freshChapters.find(ch => !ch.content || ch.content.trim() === '');
            if (newCh) return newCh;
        }

        this._log('warn', '⚠️ Không tìm thấy chương mới sau khi tạo');
        return null;
    }

    /**
     * Auto-generate outline for a chapter that doesn't have one
     */
    async _generateOutlineForChapter(chapter) {
        try {
            this._log('info', `📝 Tạo dàn ý cho "${chapter.title}"...`);
            this.deps.onProgress?.(`Tạo dàn ý: ${chapter.title}`);
            const apiKey = this.deps.getApiKey();
            const story = this.deps.getStory();
            const model = this.deps.getModel();
            const getDirective = this.deps.getDirective;

            const outline = await AIService.generateSingleChapterOutline(apiKey, chapter, story, {
                directive: getDirective?.('generateSingleChapterOutline'),
                model,
                signal: this._abortController?.signal,
            });
            this.deps.updateChapterOutline?.(chapter.id, outline);
            this._log('success', `📝 Dàn ý đã tạo xong`);
            await this._delay(1000);
        } catch (err) {
            this._log('warn', `⚠️ Không thể tạo dàn ý: ${err.message}`);
        }
    }

    /**
     * Write one chapter with streaming, retry, and auto-resume
     */
    async _writeOneChapter(chapter) {
        this._log('info', `✍️ Bắt đầu viết: "${chapter.title}"`);
        this.deps.onProgress?.(`Viết: ${chapter.title}`);
        this.deps.onChapterWriteStart?.(chapter.title);

        let isSuccess = false;
        let retries = 0;
        const MAX_RETRIES = 2;
        let accumulatedText = '';

        while (!isSuccess && retries <= MAX_RETRIES) {
            if (this._isAborted()) break;
            await this._checkPause();
            if (this._isAborted()) break;

            try {
                const freshApiKey = this.deps.getApiKey();
                const freshStory = this.deps.getStory();
                const model = this.deps.getModel();
                const getDirective = this.deps.getDirective;

                await AIService.writeChapter(freshApiKey, chapter, freshStory, {
                    directive: getDirective?.('writeChapter'),
                    model,
                    useWebSearch: true,
                    signal: this._abortController?.signal,
                    resumeText: accumulatedText,
                    onStream: (chunk) => {
                        accumulatedText += chunk;
                        this.deps.chapterOps?.update(chapter.id, { content: accumulatedText });
                        this.deps.onLiveContent?.(chunk, chapter.title);
                    },
                    onProgress: (step, message) => {
                        this.deps.onProgress?.(message);
                    },
                });

                isSuccess = true;
                this.deps.chapterOps?.update(chapter.id, { content: accumulatedText });
                this._log('success', `✅ Viết xong: "${chapter.title}" (${accumulatedText.length.toLocaleString()} ký tự)`);
            } catch (err) {
                if (this._isAborted()) break;
                retries++;
                this._log('warn', `⚠️ Lỗi viết (${retries}/${MAX_RETRIES + 1}): ${err.message}. Thử lại...`);
                if (retries <= MAX_RETRIES) await this._delay(3000);
            }
        }

        return isSuccess;
    }

    /**
     * Post-write data scan
     */
    async _postWriteScan(chapter) {
        try {
            const freshStory = this.deps.getStory();
            const freshChapter = freshStory?.database?.chapters?.find(ch => ch.id === chapter.id);
            const chapterText = freshChapter?.content || '';
            if (!chapterText) return;

            this._log('info', `🔍 Quét dữ liệu "${chapter.title}"...`);
            this.deps.onProgress?.(`Quét dữ liệu: ${chapter.title}`);
            const scanApiKey = this.deps.getApiKey();
            const model = this.deps.getModel();

            const scanResult = await AIService.postWriteScan(scanApiKey, chapterText, chapter, freshStory, {
                model,
                signal: this._abortController?.signal,
                onProgress: (step, message) => this.deps.onProgress?.(message),
            });
            this._applyScanResult(scanResult, chapter);
            // Invalidate embedding cache so next write re-indexes with fresh data
            const storyId = freshStory?.id || 'unknown';
            invalidateEmbeddingCache(storyId);
            this._log('info', '🔄 Embedding cache invalidated for re-indexing');
        } catch (scanErr) {
            this._log('warn', `⚠️ Quét dữ liệu thất bại: ${scanErr.message}`);
        }
    }

    /**
     * Apply scan results to story database
     */
    _applyScanResult(scanResult, chapter) {
        if (!scanResult) return;
        const story = this.deps.getStory();

        // Update chapter summary/recap/keywords
        if (scanResult.summary || scanResult.recap || scanResult.keywords?.length) {
            const updates = {};
            if (scanResult.summary) updates.summary = scanResult.summary;
            if (scanResult.recap) updates.recap = scanResult.recap;
            if (scanResult.keywords?.length) updates.keywords = scanResult.keywords;
            this.deps.chapterOps?.update(chapter.id, updates);
        }

        // Add new characters
        scanResult.characters?.forEach(char => {
            this.deps.addCharacter?.({
                name: char.name,
                role: char.role || '',
                description: char.description || '',
                personality: char.personality || '',
                currentState: char.newState || '',
            });
        });

        // Update existing characters (enhanced with MVU dynamic state)
        if (scanResult.characterUpdates?.length > 0) {
            const existingChars = story?.database?.characters || [];
            scanResult.characterUpdates.forEach(upd => {
                const existing = existingChars.find(c => c.name === upd.name);
                if (existing && (upd.newInfo || upd.newState || upd.currentLocation || upd.currentGoal)) {
                    const updates = {};
                    if (upd.newInfo) {
                        updates.description = existing.description
                            ? `${existing.description}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}`
                            : upd.newInfo;
                    }
                    if (upd.newState) updates.currentState = upd.newState;
                    // MVU enhanced dynamic fields
                    if (upd.currentLocation) updates.currentLocation = upd.currentLocation;
                    if (upd.currentGoal) updates.currentGoal = upd.currentGoal;
                    if (upd.currentBodyState) updates.currentBodyState = upd.currentBodyState;
                    if (upd.specialStatus) updates.specialStatus = upd.specialStatus;
                    this.deps.updateCharacter?.(existing.id, updates);
                }
            });
        }

        // Add new settings
        scanResult.settings?.forEach(s => {
            const newFields = { name: s.name, description: s.description || '' };
            if (s.newState) newFields.state = s.newState;
            this.deps.settingOps?.add(newFields);
        });

        // Update existing settings
        if (scanResult.settingUpdates?.length > 0) {
            const existingSettings = story?.database?.settings || [];
            scanResult.settingUpdates.forEach(upd => {
                const existing = existingSettings.find(s => s.name === upd.name);
                if (existing && (upd.newInfo || upd.newState)) {
                    const updates = {};
                    if (upd.newInfo) {
                        updates.description = existing.description
                            ? `${existing.description}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}`
                            : upd.newInfo;
                    }
                    if (upd.newState) updates.state = upd.newState;
                    this.deps.settingOps?.update(existing.id, updates);
                }
            });
        }

        // Add timeline events
        scanResult.timeline?.forEach(event => {
            this.deps.timelineOps?.add({
                name: event.title || event.name || 'Sự kiện',
                description: event.description || '',
                chapter: chapter.order,
            });
        });

        // Add abilities
        scanResult.abilities?.forEach(a => {
            const f = { name: a.name, owner: a.owner || '', effect: a.effect || '', limitation: a.limitation || '' };
            if (a.newState) f.state = a.newState;
            this.deps.abilityOps?.add(f);
        });

        // Update existing abilities
        if (scanResult.abilityUpdates?.length > 0) {
            const existingAbilities = story?.database?.abilities || [];
            scanResult.abilityUpdates.forEach(upd => {
                const existing = existingAbilities.find(a => a.name === upd.name);
                if (existing && (upd.newInfo || upd.newState)) {
                    const updates = {};
                    if (upd.newInfo) {
                        updates.effect = existing.effect
                            ? `${existing.effect}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}`
                            : upd.newInfo;
                    }
                    if (upd.newState) updates.state = upd.newState;
                    this.deps.abilityOps?.update(existing.id, updates);
                }
            });
        }

        // Add items (enhanced with quantity)
        scanResult.items?.forEach(i => {
            const f = { name: i.name, owner: i.owner || '', effect: i.effect || '' };
            if (i.quantity) f.quantity = i.quantity;
            if (i.newState) f.state = i.newState;
            this.deps.itemOps?.add(f);
        });

        // Update existing items (enhanced with quantity + ownership transfer)
        if (scanResult.itemUpdates?.length > 0) {
            const existingItems = story?.database?.items || [];
            scanResult.itemUpdates.forEach(upd => {
                const existing = existingItems.find(i => i.name === upd.name);
                if (existing && (upd.newInfo || upd.newState || upd.quantity || upd.newOwner)) {
                    const updates = {};
                    if (upd.newInfo) {
                        updates.effect = existing.effect
                            ? `${existing.effect}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}`
                            : upd.newInfo;
                    }
                    if (upd.newState) updates.state = upd.newState;
                    if (upd.quantity) updates.quantity = upd.quantity;
                    if (upd.newOwner) updates.owner = upd.newOwner;
                    this.deps.itemOps?.update(existing.id, updates);
                }
            });
        }

        // Add organizations
        scanResult.organizations?.forEach(o => {
            const f = { name: o.name, purpose: o.purpose || '' };
            if (o.newState) f.state = o.newState;
            this.deps.organizationOps?.add(f);
        });

        // Update existing organizations
        if (scanResult.organizationUpdates?.length > 0) {
            const existingOrgs = story?.database?.organizations || [];
            scanResult.organizationUpdates.forEach(upd => {
                const existing = existingOrgs.find(o => o.name === upd.name);
                if (existing && (upd.newInfo || upd.newState)) {
                    const updates = {};
                    if (upd.newInfo) {
                        updates.purpose = existing.purpose
                            ? `${existing.purpose}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}`
                            : upd.newInfo;
                    }
                    if (upd.newState) updates.state = upd.newState;
                    this.deps.organizationOps?.update(existing.id, updates);
                }
            });
        }

        // Update current info
        if (scanResult.currentState) {
            this.deps.updateCurrentInfo?.(
                scanResult.currentState.time || '',
                scanResult.currentState.location || '',
            );
        }

        // Vector Events -> Character actionHistory (Phase 2)
        if (scanResult.eventLog?.length > 0) {
            const existingChars = story?.database?.characters || [];
            scanResult.eventLog.forEach(logText => {
                const match = logText.match(/^([^→\-:]+)/);
                if (match) {
                    const charName = match[1].trim();
                    const existing = existingChars.find(c =>
                        c.name.toLowerCase() === charName.toLowerCase() ||
                        charName.toLowerCase().includes(c.name.toLowerCase()) ||
                        c.name.toLowerCase().includes(charName.toLowerCase())
                    );

                    if (existing) {
                        const newHistory = existing.actionHistory
                            ? `${existing.actionHistory}\n[Ch.${chapter.order || '?'}] ${logText}`
                            : `[Ch.${chapter.order || '?'}] ${logText}`;
                        this.deps.updateCharacter?.(existing.id, { actionHistory: newHistory });
                        existing.actionHistory = newHistory;
                    }
                }
            });
        }

        // Auto-add detected foreshadowing seeds
        if (scanResult.foreshadowingSeeds?.length > 0) {
            const existingForeshadowings = story?.database?.foreshadowings || [];
            scanResult.foreshadowingSeeds.forEach(seed => {
                if (!seed.hint) return;
                // Avoid duplicates
                const exists = existingForeshadowings.some(f =>
                    f.hint?.toLowerCase() === seed.hint.toLowerCase()
                );
                if (!exists) {
                    this.deps.foreshadowingOps?.add({
                        name: seed.hint,
                        hint: seed.hint,
                        targetEvent: seed.targetEvent || '',
                        plantedChapter: chapter.order || 1,
                        status: 'active',
                        source: 'auto-scan'
                    });
                }
            });
            this._log('info', `🌱 ${scanResult.foreshadowingSeeds.length} phục bút phát hiện`);
        }

        // Log summary
        const newCount = (scanResult.characters?.length || 0) + (scanResult.settings?.length || 0) +
            (scanResult.timeline?.length || 0) + (scanResult.abilities?.length || 0) +
            (scanResult.items?.length || 0) + (scanResult.organizations?.length || 0);
        const updateCount = (scanResult.characterUpdates?.length || 0) + (scanResult.settingUpdates?.length || 0) +
            (scanResult.abilityUpdates?.length || 0) + (scanResult.itemUpdates?.length || 0) +
            (scanResult.organizationUpdates?.length || 0);
        if (newCount > 0 || updateCount > 0) {
            this._log('info', `📊 Scan: ${newCount} mới, ${updateCount} cập nhật`);
        }
    }

    // ─── Helpers ───

    _isAborted() {
        return this.status === 'stopped' || this._abortController?.signal?.aborted;
    }

    async _checkPause() {
        if (this.status === 'paused') {
            return new Promise(resolve => {
                this._pauseResolve = resolve;
            });
        }
    }

    _delay(ms) {
        return new Promise((resolve) => {
            const timer = setTimeout(resolve, ms);
            const onAbort = () => { clearTimeout(timer); resolve(); };
            this._abortController?.signal?.addEventListener('abort', onAbort, { once: true });
        });
    }

    _log(level, message) {
        const entry = { time: new Date().toLocaleTimeString('vi-VN'), level, message };
        this.logs.push(entry);
        this.deps.onLog?.(entry);
    }
}
