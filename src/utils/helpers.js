// ================================================
// Utility Helper Functions
// ================================================

export const Utils = {
    generateId() {
        // Use crypto.randomUUID for collision-safe IDs (available in all modern browsers)
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older environments
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('vi-VN');
    },

    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
};
