import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { validate } from '../../middleware/validation.js';

const router = express.Router();

// ═══════════════════════════════════════════════════
// Schema
// ═══════════════════════════════════════════════════

const GitHubFetchSchema = z.object({
    url: z.url('URL không hợp lệ'),
});

// ═══════════════════════════════════════════════════
// Route
// ═══════════════════════════════════════════════════

/**
 * POST /api/extensions/github/fetch
 * Proxy để fetch raw content từ GitHub (bypass CORS)
 * Body: { url: "https://raw.githubusercontent.com/..." }
 */
router.post('/fetch', validate(GitHubFetchSchema), async (req, res) => {
    const { url } = req.body;

    // Security: only allow GitHub URLs
    const allowed = [
        'raw.githubusercontent.com',
        'github.com',
        'gist.githubusercontent.com',
        'api.github.com',
    ];
    try {
        const parsed = new URL(url);
        if (!allowed.some(d => parsed.hostname.includes(d))) {
            return res.status(403).json({ error: 'Only GitHub URLs are allowed' });
        }
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
        const response = await axios.get(url, {
            timeout: 15000,
            maxContentLength: 10 * 1024 * 1024, // 10MB max
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'VietTruyenBanChua-ExtensionLoader/1.0',
            },
        });

        res.json({
            content: typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data),
            contentType: response.headers['content-type'] || 'text/plain',
        });
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).json({
            error: `Failed to fetch: ${err.message}`,
            status,
        });
    }
});

export default router;
