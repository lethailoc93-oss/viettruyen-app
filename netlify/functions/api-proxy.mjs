// Netlify Function: Server-side proxy to bypass CORS
// Routes API requests through Netlify's server, avoiding browser CORS restrictions

export default async (request) => {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }

    try {
        const body = await request.json();
        const { targetUrl, headers: clientHeaders, stream } = body;

        if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'Missing targetUrl' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        // Forward the request to the actual API
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (clientHeaders?.Authorization) {
            fetchHeaders['Authorization'] = clientHeaders.Authorization;
        }

        const apiResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: fetchHeaders,
            body: JSON.stringify(body.payload),
        });

        // For streaming responses, pipe through
        if (stream && apiResponse.ok && apiResponse.body) {
            return new Response(apiResponse.body, {
                status: apiResponse.status,
                headers: {
                    'Content-Type': apiResponse.headers.get('Content-Type') || 'text/event-stream',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache',
                },
            });
        }

        // For non-streaming, forward the JSON response
        const responseText = await apiResponse.text();
        return new Response(responseText, {
            status: apiResponse.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message || 'Proxy error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
};

export const config = {
    path: '/api/proxy',
};
