import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * Extension: Image Generation (ComfyUI / A1111)
 * Nhận Prompt từ Frontend, gọi tới hệ thống vẽ ảnh local
 */
router.post('/', async (req, res) => {
    try {
        const { prompt, negativePrompt, serverUrl, provider = 'comfyui' } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt for image generation' });
        }

        const backendUrl = serverUrl || 'http://127.0.0.1:8188'; // Default ComfyUI port

        console.log(`[EXT: IMAGE] Requesting image for: "${prompt.substring(0, 50)}..." from ${backendUrl}`);

        if (provider === 'comfyui') {
            // Đây là ví dụ payload cho quy trình Text2Image chuẩn của ComfyUI (SDXL)
            // Trong thực tế, bạn có thể truyền thẳng file workflow JSON từ text input ở Frontend
            const payload = {
                "prompt": {
                    "3": {
                        "inputs": {
                            "seed": Math.floor(Math.random() * 10000000),
                            "steps": 25,
                            "cfg": 7.5,
                            "sampler_name": "dpmpp_2m",
                            "scheduler": "karras",
                            "denoise": 1,
                            "model": ["4", 0],
                            "positive": ["6", 0],
                            "negative": ["7", 0],
                            "latent_image": ["5", 0]
                        },
                        "class_type": "KSampler"
                    },
                    "4": {
                        "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" },
                        "class_type": "CheckpointLoaderSimple"
                    },
                    "5": {
                        "inputs": { "width": 1024, "height": 1024, "batch_size": 1 },
                        "class_type": "EmptyLatentImage"
                    },
                    "6": {
                        "inputs": { "text": prompt, "clip": ["4", 1] },
                        "class_type": "CLIPTextEncode"
                    },
                    "7": {
                        "inputs": { "text": negativePrompt || "bad quality, blurry, mutated, deformed", "clip": ["4", 1] },
                        "class_type": "CLIPTextEncode"
                    },
                    "8": {
                        "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
                        "class_type": "VAEDecode"
                    },
                    "9": {
                        "inputs": { "filename_prefix": "vtbc_generate", "images": ["8", 0] },
                        "class_type": "SaveImage"
                    }
                }
            };

            const response = await axios.post(`${backendUrl}/prompt`, payload);

            // ComfyUI trả về prompt_id lập tức (bất đồng bộ).
            // Lẽ ra cần dùng WebSocket để subscribe chờ ảnh, nhưng để demo ta trả lại OK trước.
            return res.json({
                status: 'processing',
                prompt_id: response.data.prompt_id,
                message: 'Đã gửi lệnh vẽ ảnh tới ComfyUI. Vui lòng kiểm tra màn hình ComfyUI.'
            });
        }

        res.status(400).json({ error: 'Unsupported provider' });

    } catch (error) {
        console.error('[EXT: IMAGE ERROR]', error.message);
        res.status(500).json({ error: 'Failed to generate image', details: error.message });
    }
});

export default router;
