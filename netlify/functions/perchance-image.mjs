/**
 * Netlify Function: Perchance Image Generation Proxy
 * Bypasses CORS by making server-to-server requests to Perchance API
 * 
 * Endpoints:
 *   POST /.netlify/functions/perchance-image  { action: "generate", prompt, ... }
 */

const PERCHANCE_API = 'https://image-generation.perchance.org/api';

export async function handler(event) {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action } = body;

        if (action === 'generate') {
            return await handleGenerate(body, corsHeaders);
        } else {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid action. Use "generate".' }),
            };
        }
    } catch (err) {
        console.error('Perchance proxy error:', err);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: err.message }),
        };
    }
}

/**
 * Handle full image generation flow:
 * 1. Verify user → get userKey
 * 2. Generate image → get imageId
 * 3. Download image → return as base64
 */
async function handleGenerate(body, corsHeaders) {
    const {
        prompt = '',
        negativePrompt = 'ugly, blurry, low quality, distorted, deformed',
        resolution = '768x768',
        guidanceScale = 7,
        seed = -1,
    } = body;

    if (!prompt) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'prompt is required' }),
        };
    }

    // Step 1: Get userKey
    const verifyUrl = `${PERCHANCE_API}/verifyUser?thread=0&__cacheBust=${Math.random()}`;
    const verifyResp = await fetch(verifyUrl);

    if (!verifyResp.ok) {
        return {
            statusCode: 502,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to verify with Perchance', status: verifyResp.status }),
        };
    }

    const verifyHtml = await verifyResp.text();
    const keyMatch = verifyHtml.match(/"userKey":"([^"]+)"/);

    if (!keyMatch) {
        // Check for rate limit
        if (verifyHtml.includes('too_many_requests')) {
            return {
                statusCode: 429,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Perchance rate limit exceeded. Try again later.' }),
            };
        }
        return {
            statusCode: 502,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to get Perchance userKey' }),
        };
    }

    const userKey = keyMatch[1];

    // Step 2: Generate image
    const requestId = `aiImageCompletion${Math.floor(Math.random() * 2 ** 30)}`;
    const generateUrl = `${PERCHANCE_API}/generate?userKey=${encodeURIComponent(userKey)}&requestId=${requestId}&__cacheBust=${Math.random()}`;

    const generateResp = await fetch(generateUrl, {
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

    if (!generateResp.ok) {
        const errText = await generateResp.text().catch(() => '');
        return {
            statusCode: 502,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Perchance generate failed', status: generateResp.status, detail: errText }),
        };
    }

    const generateResult = await generateResp.json();

    if (!generateResult.imageId) {
        return {
            statusCode: 502,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'No imageId returned', result: generateResult }),
        };
    }

    // Step 3: Download image
    const downloadUrl = `${PERCHANCE_API}/downloadTemporaryImage?imageId=${encodeURIComponent(generateResult.imageId)}`;
    const imgResp = await fetch(downloadUrl);

    if (!imgResp.ok) {
        return {
            statusCode: 502,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to download image', status: imgResp.status }),
        };
    }

    const imgBuffer = await imgResp.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString('base64');
    const contentType = imgResp.headers.get('content-type') || 'image/jpeg';

    return {
        statusCode: 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            success: true,
            imageBase64: base64,
            contentType,
            imageId: generateResult.imageId,
            seed: generateResult.seed,
            provider: 'perchance',
        }),
    };
}
