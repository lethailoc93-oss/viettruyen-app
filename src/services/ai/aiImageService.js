/**
 * AI Image Generation Service
 * Handles image generation with multiple FREE providers:
 * 1. Perchance via Extension Proxy (if available - uses WS relay + extension)
 * 2. Pollinations (primary web - fast, free, no key needed)
 * 3. AI Horde (fallback - free, community-driven, slower)
 */

const AI_HORDE_BASE = 'https://stablehorde.net/api/v2';
const AI_HORDE_ANON_KEY = '0000000000'; // Anonymous access

// Available Pollinations models
export const POLLINATIONS_MODELS = [
    { id: 'flux', name: 'Flux (Mặc định)', desc: 'Nhanh, chất lượng tốt' },
    { id: 'flux-realism', name: 'Flux Realism', desc: 'Ảnh thực tế, chi tiết cao' },
    { id: 'flux-anime', name: 'Flux Anime', desc: 'Phong cách anime/manga' },
    { id: 'flux-3d', name: 'Flux 3D', desc: 'Phong cách 3D render' },
    { id: 'turbo', name: 'Turbo', desc: 'Tốc độ nhanh nhất' },
];

/**
 * Try generating image via Perchance proxy servers
 * Priority: 1. Render proxy (cloud), 2. Local WS relay + Extension
 * Returns a blob URL on success, null on failure
 */
async function generateViaPerchanceProxy(prompt, options = {}) {
    const { width = 768, height = 768, timeoutMs = 120000, onProgress } = options;

    // Determine resolution
    let resolution = '768x768';
    if (width < height) resolution = '512x768';
    else if (width > height) resolution = '768x512';

    const requestBody = {
        prompt: prompt.substring(0, 2000),
        negativePrompt: 'ugly, blurry, low quality, distorted, deformed, bad anatomy',
        resolution,
        guidanceScale: 7,
    };

    // 🔹 Try 1: Netlify function (ưu tiên cao nhất - cùng domain, chỉ khi deploy trên Netlify)
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isLocal) {
        try {
            onProgress?.('🎨 Perchance: Đang tạo ảnh (Netlify)...');
            const netlifyBody = { action: 'generate', ...requestBody };
            const result = await callPerchanceProxy('/.netlify/functions/perchance-image', netlifyBody, timeoutMs);
            if (result) return result;
            console.log('Netlify function failed, trying local extension...');
        } catch {
            console.log('Netlify function error, trying local extension...');
        }
    }

    // 🔹 Try 2: Local WS relay + Extension (nhanh, không phụ thuộc cloud)
    try {
        const healthResp = await fetch('http://localhost:8080/health', {
            signal: AbortSignal.timeout(2000)
        });
        if (healthResp.ok) {
            const health = await healthResp.json();
            if (health.extensionConnected) {
                onProgress?.('🎨 Perchance: Đang tạo ảnh (Extension)...');
                const result = await callPerchanceProxy('http://localhost:8080/perchance-image', requestBody, timeoutMs);
                if (result) return result;
                console.log('Perchance Extension failed, trying Render proxy...');
            }
        }
    } catch {
        // Local relay not running, fall through to cloud proxy
    }

    // 🔹 Try 3: Render proxy (cloud - fallback cuối cùng)
    const renderUrl = localStorage.getItem('perchance_proxy_url') || 'https://perchance-proxy.onrender.com';
    if (renderUrl) {
        onProgress?.('🎨 Perchance: Đang tạo ảnh (Render proxy)...');
        const result = await callPerchanceProxy(`${renderUrl}/generate`, requestBody, timeoutMs);
        if (result) return result;
    }

    return null;
}

/**
 * Call a Perchance proxy endpoint and convert response to blob URL
 */
async function callPerchanceProxy(url, body, timeoutMs) {
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
        });

        if (!resp.ok) return null;

        const data = await resp.json();
        if (!data.success || !data.imageBase64) return null;

        // Convert base64 to blob URL
        const binary = atob(data.imageBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: data.contentType || 'image/jpeg' });
        return URL.createObjectURL(blob);
    } catch {
        return null;
    }
}

/**
 * Try generating image via Pollinations GET (fast, direct URL approach)
 * Uses Image element which naturally bypasses CORS
 * Returns a URL string on success, null on failure
 */
export async function generateViaPollinations(prompt, options = {}) {
    const { width = 1024, height = 1024, timeoutMs = 90000, model = 'flux' } = options;
    const safePrompt = prompt.substring(0, 500);
    const seed = Math.floor(Math.random() * 1000000);
    const encoded = encodeURIComponent(safePrompt);

    const endpoints = [
        `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${model}`,
        `https://gen.pollinations.ai/image/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}`,
    ];

    for (const url of endpoints) {
        const result = await tryLoadImageUrl(url, timeoutMs);
        if (result) return result;
    }
    return null;
}

/**
 * Try generating image via AI Horde (free, community-driven, async)
 * Returns a blob URL on success, null on failure
 */
export async function generateViaAIHorde(prompt, options = {}) {
    const { onProgress, timeoutMs = 180000 } = options;

    try {
        onProgress?.('Đang gửi yêu cầu tạo ảnh đến AI Horde...');
        const submitResp = await fetch(`${AI_HORDE_BASE}/generate/async`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': AI_HORDE_ANON_KEY,
                'Client-Agent': 'VietTruyenApp:1.0:unknown',
            },
            body: JSON.stringify({
                prompt: prompt.substring(0, 1000),
                params: {
                    width: 1024,
                    height: 1024,
                    steps: 25,
                    cfg_scale: 7,
                    sampler_name: 'k_euler_a',
                    n: 1,
                },
                nsfw: false,
                censor_nsfw: false,
                trusted_workers: false,
                slow_workers: true,
                extra_slow_workers: true,
                models: ['AlbedoBase XL (SDXL)'],
                r2: true,
            }),
        });

        if (!submitResp.ok) {
            const err = await submitResp.json().catch(() => ({}));
            console.warn('AI Horde submit failed:', err);
            return null;
        }

        const { id } = await submitResp.json();
        if (!id) return null;

        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            await new Promise(r => setTimeout(r, 4000));

            const checkResp = await fetch(`${AI_HORDE_BASE}/generate/check/${id}`, {
                headers: { 'Client-Agent': 'VietTruyenApp:1.0:unknown' },
            });

            if (!checkResp.ok) continue;

            const status = await checkResp.json();
            const waitTime = status.wait_time || 0;
            const queuePos = status.queue_position || 0;

            if (status.done) {
                onProgress?.('Đang tải ảnh...');
                break;
            }

            if (!status.is_possible) {
                console.warn('AI Horde: No workers available for this request');
                return null;
            }

            onProgress?.(`Đang chờ AI Horde... (vị trí #${queuePos}, ~${waitTime}s)`);
        }

        const statusResp = await fetch(`${AI_HORDE_BASE}/generate/status/${id}`, {
            headers: { 'Client-Agent': 'VietTruyenApp:1.0:unknown' },
        });

        if (!statusResp.ok) return null;

        const result = await statusResp.json();
        const generations = result.generations || [];

        if (generations.length === 0) return null;

        const gen = generations[0];

        if (gen.censored) {
            console.warn('AI Horde: Image was censored');
            return null;
        }

        const imgData = gen.img;
        if (!imgData) return null;

        if (imgData.startsWith('http')) {
            try {
                const imgResp = await fetch(imgData);
                if (imgResp.ok) {
                    const blob = await imgResp.blob();
                    return URL.createObjectURL(blob);
                }
            } catch (e) {
                console.warn('Failed to download AI Horde image:', e);
            }
            return imgData;
        } else {
            try {
                const binary = atob(imgData);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const blob = new Blob([bytes], { type: 'image/webp' });
                return URL.createObjectURL(blob);
            } catch (e) {
                console.warn('Failed to decode AI Horde base64 image:', e);
                return null;
            }
        }
    } catch (err) {
        console.warn('AI Horde generation failed:', err);
        return null;
    }
}

/**
 * Try generating image via the Local Backend Proxy (Cloud APIs like DALL-E)
 * Requires API key stored in local storage
 */
export async function generateViaCloudAPI(prompt, options = {}) {
    const { onProgress, timeoutMs = 60000, provider, apiKey, model, width = 1024, height = 1024 } = options;

    // Fallback to local storage if not provided directly in options
    const targetProvider = provider || localStorage.getItem('ai_story_cloud_image_provider');
    const targetApiKey = apiKey || localStorage.getItem('ai_story_cloud_image_api_key');
    const targetModel = model || localStorage.getItem('ai_story_cloud_image_model') || (targetProvider === 'openai' ? 'dall-e-3' : 'black-forest-labs/FLUX.1-schnell-Free');

    if (!targetProvider || targetProvider === 'disabled' || !targetApiKey) {
        return null; // Not configured
    }

    try {
        onProgress?.(`🎨 Đang tạo ảnh qua Đám mây (${targetProvider.toUpperCase()})...`);

        // Use Vite backend URL if available, otherwise assume same origin for prod
        const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const url = `${backendBaseUrl}/api/extensions/cloud-image`;

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt.substring(0, 1000), // Cloud providers usually have limits
                provider: targetProvider,
                apiKey: targetApiKey,
                model: targetModel,
                width,
                height
            }),
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            console.warn('Cloud Image Gen failed:', err);
            return null;
        }

        const data = await resp.json();
        if (data.status === 'success' && data.url) {
            // Most cloud APIs return a temporary URL, which is perfectly fine to display directly
            return data.url;
        }

    } catch (err) {
        console.warn('Cloud Image generation exception:', err);
    }
    return null;
}

/**
 * Helper: Load image URL using Image element (bypasses CORS)
 */
function tryLoadImageUrl(url, timeoutMs = 90000) {
    return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => { img.src = ''; resolve(null); }, timeoutMs);
        img.onload = () => {
            clearTimeout(timer);
            try {
                const img2 = new Image();
                img2.crossOrigin = 'anonymous';
                img2.onload = () => {
                    try {
                        const c = document.createElement('canvas');
                        c.width = img2.naturalWidth;
                        c.height = img2.naturalHeight;
                        c.getContext('2d').drawImage(img2, 0, 0);
                        c.toBlob(b => resolve(b ? URL.createObjectURL(b) : url), 'image/png');
                    } catch { resolve(url); }
                };
                img2.onerror = () => resolve(url);
                img2.src = url;
            } catch {
                resolve(url);
            }
        };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
    });
}

/**
 * Main entry point: Generate image with automatic fallback
 * All providers are 100% FREE — no API key needed
 * 
 * Strategy:
 *   1. Perchance via Extension (if relay server + extension running)
 *   2. Pollinations (fast, Flux model, no CORS via Image element)
 *   3. AI Horde (slowest but reliable community-driven SD)
 */
export async function generateImage(prompt, options = {}) {
    const { onProgress, model } = options;

    // 1. Try User's own Cloud API Key first (Highest Priority & Quality)
    const cloudProvider = localStorage.getItem('ai_story_cloud_image_provider');
    if (cloudProvider && cloudProvider !== 'disabled') {
        const cloudResult = await generateViaCloudAPI(prompt, {
            ...options,
            onProgress
        });
        if (cloudResult) {
            return { url: cloudResult, provider: 'cloud-api' };
        }
    }

    // 2. Try Perchance via Extension proxy (if available)
    onProgress?.('🎨 Đang kiểm tra Perchance (Extension)...');
    const perchanceResult = await generateViaPerchanceProxy(prompt, {
        ...options,
        onProgress,
    });
    if (perchanceResult) {
        return { url: perchanceResult, provider: 'perchance' };
    }

    // 3. Try Pollinations (fast, free, uses Flux/SD)
    onProgress?.('🎨 Đang tạo ảnh qua Pollinations...');
    const pollinationsResult = await generateViaPollinations(prompt, { ...options, model });
    if (pollinationsResult) {
        return { url: pollinationsResult, provider: 'pollinations' };
    }

    // Fallback to AI Horde (free, community-driven)
    onProgress?.('🎨 Chuyển sang AI Horde...');
    const hordeResult = await generateViaAIHorde(prompt, {
        ...options,
        onProgress,
    });

    if (hordeResult) {
        return { url: hordeResult, provider: 'ai-horde' };
    }

    return null;
}
