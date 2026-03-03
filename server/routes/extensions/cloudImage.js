import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { validate } from '../../middleware/validation.js';

const router = express.Router();

// ═══════════════════════════════════════════════════
// Schema
// ═══════════════════════════════════════════════════

const CloudImageSchema = z.object({
    prompt: z.string().min(1, 'Prompt không được để trống'),
    negativePrompt: z.string().optional().default(''),
    provider: z.enum(['openai', 'together']).optional().default('openai'),
    apiKey: z.string().min(1, 'API Key không được để trống'),
    model: z.string().optional(),
    width: z.number().int().positive().optional().default(1024),
    height: z.number().int().positive().optional().default(1024),
});

// ═══════════════════════════════════════════════════
// Route
// ═══════════════════════════════════════════════════

/**
 * Extension: Cloud Image Generation (DALL-E 3, TogetherAI, etc.)
 * Nhận Prompt và API Key từ Frontend, thay mặt người dùng gọi lên Cloud API
 * Giúp vượt lỗi CORS và bảo mật Key không bị lộ trên URL
 */
router.post('/', validate(CloudImageSchema), async (req, res) => {
    try {
        const { prompt, negativePrompt, provider, apiKey, model, width, height } = req.body;

        console.log(`[EXT: CLOUD IMAGE] Requesting image via ${provider} for: "${prompt.substring(0, 50)}..."`);

        if (provider === 'openai') {
            const openAIModel = model || 'dall-e-3';
            const response = await axios.post('https://api.openai.com/v1/images/generations', {
                model: openAIModel,
                prompt: prompt,
                n: 1,
                size: `${width}x${height}`,
                response_format: 'url'
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.data && response.data.data.length > 0) {
                return res.json({
                    status: 'success',
                    url: response.data.data[0].url,
                    revised_prompt: response.data.data[0].revised_prompt
                });
            } else {
                throw new Error("Invalid response format from OpenAI");
            }
        } else if (provider === 'together') {
            // Example for TogetherAI / Black Forest Labs Flux
            const togetherModel = model || 'black-forest-labs/FLUX.1-schnell-Free';
            const response = await axios.post('https://api.together.xyz/v1/images/generations', {
                model: togetherModel,
                prompt: prompt,
                negative_prompt: negativePrompt,
                n: 1,
                width: width,
                height: height,
                response_format: 'url'
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.data && response.data.data.length > 0) {
                return res.json({
                    status: 'success',
                    url: response.data.data[0].url
                });
            } else {
                throw new Error("Invalid response format from TogetherAI");
            }
        }

        res.status(400).json({ error: `Unsupported cloud provider: ${provider}` });

    } catch (error) {
        console.error('[EXT: CLOUD IMAGE ERROR]', error.response?.data || error.message);
        const errorMsg = error.response?.data?.error?.message || error.message;
        res.status(error.response?.status || 500).json({ error: 'Failed to generate cloud image', details: errorMsg });
    }
});

export default router;
