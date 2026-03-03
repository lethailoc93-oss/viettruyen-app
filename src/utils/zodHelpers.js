import { z } from 'zod';

/**
 * Safe Validate — wrapper trả { success, data, errors }
 * @param {z.ZodType} schema Zod schema
 * @param {any} data Dữ liệu cần validate
 * @returns {{ success: boolean, data?: any, errors?: string[] }}
 */
export function safeValidate(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        data: data, // trả lại data gốc để caller có thể dùng fallback
        errors: formatZodErrors(result.error),
    };
}

/**
 * Format Zod errors thành mảng chuỗi dễ đọc
 * @param {z.ZodError} error Zod error object
 * @returns {string[]}
 */
export function formatZodErrors(error) {
    if (!error || !error.issues) return ['Lỗi validation không xác định'];
    return error.issues.map(issue => {
        const path = issue.path.length > 0 ? `[${issue.path.join('.')}] ` : '';
        return `${path}${issue.message}`;
    });
}

/**
 * Validate và log warning nếu lỗi (không throw)
 * Hữu ích cho import data — vẫn chấp nhận data nhưng cảnh báo
 * @param {string} label Nhãn để log
 * @param {z.ZodType} schema Zod schema
 * @param {any} data Dữ liệu cần validate
 * @returns {any} data đã parsed (nếu OK) hoặc data gốc (nếu lỗi)
 */
export function validateWithWarning(label, schema, data) {
    const result = safeValidate(schema, data);
    if (!result.success) {
        console.warn(`[ZOD WARNING] ${label}:`, result.errors);
    }
    return result.data;
}
