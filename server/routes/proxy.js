import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * Mảng Proxy xử lý tất cả HTTP POST Request từ Frontend 
 * Né lỗi CORS an toàn vì NodeJS server-to-server không bị chặn
 */
router.post('/chat', async (req, res) => {
    try {
        const { targetUrl, headers, payload, stream } = req.body;

        if (!targetUrl) {
            return res.status(400).json({ error: 'Missing targetUrl' });
        }

        console.log(`[PROXY] Forwarding request to: ${targetUrl} (Stream: ${!!stream})`);

        // Prepare axios request config
        const config = {
            method: 'POST',
            url: targetUrl,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
                // Avoid bringing local host origin which some APIs block
                'Origin': undefined,
                'Referer': undefined
            },
            data: payload,
            responseType: stream ? 'stream' : 'json'
        };

        const response = await axios(config);

        // Giữ nguyên headers trả về từ API đích
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }

        if (stream) {
            // Server-Sent Events (SSE) Streaming
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            response.data.pipe(res);
        } else {
            // Standard JSON response
            res.status(response.status).json(response.data);
        }

    } catch (error) {
        if (error.response) {
            // Lỗi từ server đích (4xx, 5xx)
            console.error(`[PROXY ERROR] Target responded with: ${error.response.status}`);
            res.status(error.response.status).send(error.response.data);
        } else if (error.request) {
            console.error('[PROXY ERROR] No response from target:', error.message);
            res.status(504).json({ error: 'Gateway Timeout: Unable to reach the target API.' });
        } else {
            console.error('[PROXY ERROR]', error.message);
            res.status(500).json({ error: 'Internal Proxy Error', details: error.message });
        }
    }
});

export default router;
