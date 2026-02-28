import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * Extension: Text-to-Speech (TTS)
 * Nhận text từ Frontend, đẩy qua các dịch vụ TTS (ElevenLabs, FPT AI) và trả về Audio
 */
router.post('/', async (req, res) => {
    try {
        const { text, voiceId, apiKey, provider = 'elevenlabs' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Missing text for TTS' });
        }

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
