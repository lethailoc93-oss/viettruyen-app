import { z } from 'zod';

/**
 * Validation Middleware — Dùng Zod schema để validate req.body
 * @param {z.ZodType} schema Zod schema
 * @returns {Function} Express middleware
 */
export function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            return res.status(400).json({
                error: 'Validation Error',
                details: errors,
            });
        }
        // Gán lại body đã được parse (đã áp dụng defaults, transforms)
        req.body = result.data;
        next();
    };
}
