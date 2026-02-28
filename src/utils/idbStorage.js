import { get, set, del, keys } from 'idb-keyval';

/**
 * Lớp tiện ích để lưu trữ dữ liệu lớn tĩnh (IndexedDB)
 * Thay thế cho localStorage nhằm tránh giới hạn 5MB và lỗi QuotaExceededError
 */
export const IdbStorage = {
    /**
     * Lưu một mục vào db
     * @param {string} key Khóa lưu trữ
     * @param {any} value Giá trị (Object, Array, String...)
     */
    async setItem(key, value) {
        try {
            await set(key, value);
            return true;
        } catch (err) {
            console.error(`Lỗi khi lưu vào IndexedDB (${key}):`, err);
            return false;
        }
    },

    /**
     * Lấy một mục từ db
     * @param {string} key Khóa lưu trữ
     */
    async getItem(key) {
        try {
            return await get(key);
        } catch (err) {
            console.error(`Lỗi khi đọc từ IndexedDB (${key}):`, err);
            return null;
        }
    },

    /**
     * Xoá một mục khỏi db
     * @param {string} key 
     */
    async removeItem(key) {
        try {
            await del(key);
            return true;
        } catch (err) {
            console.error(`Lỗi khi xoá khỏi IndexedDB (${key}):`, err);
            return false;
        }
    },

    /**
     * Lấy tất cả các keys lưu trong db
     */
    async getAllKeys() {
        try {
            return await keys();
        } catch (err) {
            console.error('Lỗi khi lấy keys:', err);
            return [];
        }
    }
};
