// ================================================
// Storage Service — Google Drive primary, IndexedDB fallback
// ================================================
import { IdbStorage } from '../utils/idbStorage';
import { GoogleDriveService } from './googleDriveService';

const STORAGE_KEY = 'aiStoryWriter_stories';
const LS_LEGACY_KEY = 'aiStoryWriter_stories';

// Debounce timer for Drive saves
let _driveSaveTimer = null;
const DRIVE_SAVE_DEBOUNCE = 3000; // 3 seconds debounce for Drive saves

export const StorageService = {

    // ── Load: Drive first → IndexedDB → localStorage ──
    async loadStories() {
        // 1. Try Google Drive if connected
        if (GoogleDriveService.isConnected()) {
            try {
                const result = await GoogleDriveService.downloadStories();
                if (result.found && Array.isArray(result.stories)) {
                    console.log(`☁️ Loaded ${result.stories.length} stories from Google Drive`);
                    // Also cache to IndexedDB for offline access
                    await IdbStorage.setItem(STORAGE_KEY, result.stories).catch(() => { });
                    return result.stories;
                }
            } catch (err) {
                console.warn('☁️ Google Drive load failed, falling back to local:', err.message);
            }
        }

        // 2. Try IndexedDB
        try {
            const data = await IdbStorage.getItem(STORAGE_KEY);
            if (data) {
                console.log('💾 Loaded stories from IndexedDB');
                return data;
            }
        } catch (err) {
            console.error('IndexedDB load failed:', err);
        }

        // 3. Migrate from old localStorage
        try {
            const lsData = localStorage.getItem(LS_LEGACY_KEY);
            if (lsData) {
                const parsed = JSON.parse(lsData);
                await IdbStorage.setItem(STORAGE_KEY, parsed).catch(() => { });
                console.log('✅ Migrated stories from localStorage to IndexedDB');
                return parsed;
            }
        } catch (err) {
            console.error('localStorage fallback failed:', err);
        }

        return [];
    },

    // ── Save: IndexedDB always + Drive debounced ──
    async saveStories(stories) {
        // Always save to IndexedDB (instant, reliable)
        try {
            await IdbStorage.setItem(STORAGE_KEY, stories);
        } catch (err) {
            console.error('❌ IndexedDB save failed:', err);
            // Emergency localStorage
            try {
                const json = JSON.stringify(stories);
                if (json.length < 4_500_000) {
                    localStorage.setItem(LS_LEGACY_KEY, json);
                }
            } catch { }
        }

        // Debounced save to Google Drive (if connected)
        if (GoogleDriveService.isConnected()) {
            if (_driveSaveTimer) clearTimeout(_driveSaveTimer);
            _driveSaveTimer = setTimeout(async () => {
                try {
                    await GoogleDriveService.uploadStories(stories);
                    console.log('☁️ Auto-saved to Google Drive');
                } catch (err) {
                    console.warn('☁️ Auto-save to Drive failed:', err.message);
                }
            }, DRIVE_SAVE_DEBOUNCE);
        }
    },

    async clearAll() {
        await IdbStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LS_LEGACY_KEY);
    }
};
