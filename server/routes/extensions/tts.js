import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { validate } from '../../middleware/validation.js';

const router = express.Router();

// ═══════════════════════════════════════════════════
// Schema
// ═══════════════════════════════════════════════════

const TTSSchema = z.object({
    text: z.string().min(1, 'Text không được để trống'),
    voiceId: z.string().optional(),
    apiKey: z.string().optional(),
    provider: z.enum(['elevenlabs']).optional().default('elevenlabs'),
});

// ═══════════════════════════════════════════════════
// Route
// ═══════════════════════════════════════════════════

/**
 * Extension: Text-to-Speech (TTS)
 * Nhận text từ Frontend, đẩy qua các dịch vụ TTS (ElevenLabs, FPT AI) và trả về Audio
 */
router.post('/', validate(TTSSchema), async (req, res) => {
    try {
        const { text, voiceId, apiKey, provider } = req.body;

        console.log(`[EXT: TTS] Requesting speech for: "${text.substring(0, 30)}..." via ${provider}`);

        if (provider === 'elevenlabs') {
            if (!apiKey) return res.status(401).json({ error: 'Missing ElevenLabs API Key' });

            const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || '21m00Tcm4TlvDq8ikWAM'}`; // Rachel default

            const response = await axios.post(url, {
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            }, {
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer' // Quan trọng để nhận Audio Blob
            });

            // Set content type and send binary audio to frontend
            res.set('Content-Type', 'audio/mpeg');
            return res.send(response.data);
        }

        res.status(400).json({ error: 'Unsupported provider' });

    } catch (error) {
        console.error('[EXT: TTS ERROR]', error.message);
        res.status(500).json({ error: 'Failed to generate speech', details: error.message });
    }
});

export default router;
