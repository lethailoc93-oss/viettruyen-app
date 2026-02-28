/**
 * Perchance Image Proxy Server
 * Deploy this to Render.com as a separate Web Service
 * 
 * Calls Perchance API directly from server (no CORS issues)
 * Uses puppeteer to get userKey (Perchance requires JS execution for Cloudflare)
 * Falls back to simple fetch if puppeteer fails
 * 
 * Endpoint: POST /generate
 * Body: { prompt, negativePrompt?, resolution?, guidanceScale? }
 * Returns: { success, imageBase64, contentType }
 */

import http from 'http';

const PORT = parseInt(process.env.PORT) || 3001;
const PERCHANCE_API = 'https://image-generation.perchance.org/api';

// Reuse browser instance for performance
let browserInstance = null;
let puppeteerAvailable = null; // null = not checked, true/false

async function getBrowser() {
    if (puppeteerAvailable === false) return null;

    try {
        if (!browserInstance || !browserInstance.isConnected()) {
            const puppeteer = await import('puppeteer');
            browserInstance = await puppeteer.default.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--single-process',
                    '--no-zygote',
                    '--disable-extensions',
                    '--disable-background-networking',
                ],
            });
            puppeteerAvailable = true;
        }
        return browserInstance;
    } catch (err) {
        console.warn('⚠️ Puppeteer not available:', err.message);
        puppeteerAvailable = false;
        return null;
    }
}

/**
 * Get userKey from Perchance using Puppeteer (handles Cloudflare)
 */
async function getUserKeyViaPuppeteer() {
    const browser = await getBrowser();
    if (!browser) return null;

    const page = await browser.newPage();
    try {
        const url = `${PERCHANCE_API}/verifyUser?thread=0&__cacheBust=${Math.random()}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const content = await page.content();
        const match = content.match(/"userKey":"([^"]+)"/);

        if (!match) {
            if (content.includes('too_many_requests')) {
                throw new Error('RATE_LIMIT');
            }
            return null;
        }
        return match[1];
    } catch (err) {
        if (err.message === 'RATE_LIMIT') throw err;
        console.warn('⚠️ Puppeteer getUserKey failed:', err.message);
        return null;
    } finally {
        await page.close().catch(() => { });
    }
}

/**
 * Get userKey from Perchance using simple fetch (fallback, may not work with Cloudflare)
 */
async function getUserKeyViaFetch() {
    try {
        const url = `${PERCHANCE_API}/verifyUser?thread=0&__cacheBust=${Math.random()}`;
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });
        if (!resp.ok) return null;
        const html = await resp.text();
        const match = html.match(/"userKey":"([^"]+)"/);
        if (!match) {
            if (html.includes('too_many_requests')) {
                throw new Error('RATE_LIMIT');
            }
            return null;
        }
        return match[1];
    } catch (err) {
        if (err.message === 'RATE_LIMIT') throw err;
        console.warn('⚠️ Fetch getUserKey failed:', err.message);
        return null;
    }
}

/**
 * Get userKey with fallback: Puppeteer first, then fetch
 */
async function getPerchanceUserKey() {
    // Try Puppeteer first (handles Cloudflare)
    const puppeteerKey = await getUserKeyViaPuppeteer();
    if (puppeteerKey) return puppeteerKey;

    // Fallback to simple fetch
    const fetchKey = await getUserKeyViaFetch();
    if (fetchKey) return fetchKey;

    throw new Error('NO_USER_KEY');
}

/**
 * Generate image via Perchance API
 */
async function generateImage(body) {
    const {
        prompt = '',
        negativePrompt = 'ugly, blurry, low quality, distorted, deformed',
        resolution = '768x768',
        guidanceScale = 7,
        seed = -1,
    } = body;

    if (!prompt) {
        return { success: false, error: 'prompt is required' };
    }

    // Step 1: Get userKey
    console.log('🎨 Step 1: Getting userKey...');
    const userKey = await getPerchanceUserKey();
    console.log(`🎨 Got userKey: ${userKey.substring(0, 10)}...`);

    // Step 2: Generate image
    console.log('🎨 Step 2: Generating image...');
    const requestId = `aiImageCompletion${Math.floor(Math.random() * 2 ** 30)}`;
    const generateUrl = `${PERCHANCE_API}/generate?userKey=${encodeURIComponent(userKey)}&requestId=${requestId}&__cacheBust=${Math.random()}`;

    const genResp = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            generatorName: 'ai-image-generator',
            channel: 'ai-text-to-image-generator',
            subChannel: 'public',
            prompt: prompt.substring(0, 2000),
            negativePrompt,
            seed: seed === -1 ? Math.floor(Math.random() * 2 ** 30) : seed,
            resolution,
            guidanceScale,
        }),
    });

    if (!genResp.ok) {
        const text = await genResp.text().catch(() => '');
        return { success: false, error: `Generate failed: HTTP ${genResp.status}`, detail: text };
    }

    const genResult = await genResp.json();
    if (!genResult.imageId) {
        return { success: false, error: 'No imageId returned', result: genResult };
    }
    console.log(`🎨 Image generated, ID: ${genResult.imageId}`);

    // Step 3: Download image
    console.log('🎨 Step 3: Downloading image...');
    const downloadUrl = `${PERCHANCE_API}/downloadTemporaryImage?imageId=${encodeURIComponent(genResult.imageId)}`;
    const imgResp = await fetch(downloadUrl);

    if (!imgResp.ok) {
        return { success: false, error: `Download failed: HTTP ${imgResp.status}` };
    }

    const imgBuffer = await imgResp.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString('base64');
    const contentType = imgResp.headers.get('content-type') || 'image/jpeg';

    console.log(`🎨 ✅ Image ready! Size: ${Math.round(imgBuffer.byteLength / 1024)}KB`);

    return {
        success: true,
        imageBase64: base64,
        contentType,
        imageId: genResult.imageId,
        seed: genResult.seed,
        provider: 'perchance',
    };
}

// ═══════════════════════════════════════
// HTTP Server
// ═══════════════════════════════════════

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Health check
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'perchance-proxy',
            puppeteerAvailable: puppeteerAvailable !== false,
        }));
        return;
    }

    // Generate image
    if (req.url === '/generate' && req.method === 'POST') {
        try {
            let bodyStr = '';
            await new Promise((resolve) => {
                req.on('data', chunk => bodyStr += chunk);
                req.on('end', resolve);
            });

            const body = JSON.parse(bodyStr || '{}');
            console.log(`\n🎨 New request: "${body.prompt?.substring(0, 50)}..."`);

            const result = await generateImage(body);

            res.writeHead(result.success ? 200 : 502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (err) {
            console.error('🎨 Error:', err.message);

            const statusCode = err.message === 'RATE_LIMIT' ? 429 : 500;
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: err.message === 'RATE_LIMIT'
                    ? 'Perchance rate limit. Thử lại sau 1 phút.'
                    : err.message,
            }));
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /generate' }));
});

server.listen(PORT, () => {
    console.log(`🎨 Perchance Proxy Server running on port ${PORT}`);
    console.log(`   POST /generate - Generate image`);
    console.log(`   GET /health - Health check`);
});

// Cleanup on exit
process.on('SIGTERM', async () => {
    if (browserInstance) await browserInstance.close().catch(() => { });
    process.exit(0);
});
