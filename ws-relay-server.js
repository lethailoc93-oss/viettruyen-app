// ================================================
// WebSocket Relay Server + HTTP Proxy
// Routes messages between viettruyen ↔ Gemini Browser Proxy
// Also provides /proxy endpoint for fetching external content
// Usage: node ws-relay-server.js [port]
// ================================================

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = parseInt(process.argv[2]) || 8080;

// Store connected clients grouped by code
const rooms = new Map();

// ═══════════════════════════════════════════════════
// HTTP Server — handles /proxy and health check
// ═══════════════════════════════════════════════════

const httpServer = createServer(async (req, res) => {
    // CORS headers for all responses
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
        const extRoom = rooms.get('extension_worker');
        const extensionConnected = extRoom && extRoom.clients.size > 0;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            rooms: rooms.size,
            extensionConnected: !!extensionConnected
        }));
        return;
    }

    // Proxy endpoint: /proxy?url=<encoded_url>&format=text
    if (req.url?.startsWith('/proxy')) {
        try {
            const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
            const targetUrl = parsedUrl.searchParams.get('url');
            const format = parsedUrl.searchParams.get('format') || 'html';

            if (!targetUrl) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing url parameter' }));
                return;
            }

            console.log(`🌐 Proxy: Fetching ${targetUrl.substring(0, 80)}... (format: ${format})`);

            // Check if extension worker is connected
            const workerRoom = rooms.get('extension_worker');
            let workerClient = null;
            if (workerRoom && workerRoom.clients.size > 0) {
                workerClient = Array.from(workerRoom.clients)[0]; // Pick the first connected extension
            }

            if (workerClient && workerClient.readyState === 1) {
                // Route through Chrome Extension
                console.log(`🚀 Routing fetch via Chrome Extension...`);

                const requestId = Math.random().toString(36).slice(2, 10);

                // Create a promise that resolves when the worker replies
                const workerResponse = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        workerClient.removeListener('message', messageHandler);
                        resolve({ error: "Extension fetch timeout (45s)" });
                    }, 45000);

                    const messageHandler = (data) => {
                        try {
                            const msg = JSON.parse(data.toString());
                            if (msg.event_type === 'fetch_response' && msg.request_id === requestId) {
                                clearTimeout(timeout);
                                workerClient.removeListener('message', messageHandler);
                                resolve(msg);
                            }
                        } catch (e) { }
                    };

                    workerClient.on('message', messageHandler);
                });

                // Send request
                workerClient.send(JSON.stringify({
                    event_type: 'fetch_request',
                    request_id: requestId,
                    url: targetUrl,
                    format: format
                }));

                const result = await workerResponse;

                if (result.error) {
                    res.writeHead(504, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: result.error }));
                } else if (!result.success || (!result.html && !result.textContent)) {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Extension returned empty or failed fetch" }));
                } else {
                    if (format === 'text') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            title: result.title || '',
                            content: result.textContent || '',
                        }));
                        console.log(`✅ Proxy (Ext Text): ${targetUrl.substring(0, 50)}... → ${result.textContent ? result.textContent.length : 0} chars`);
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(result.html);
                        console.log(`✅ Proxy (Ext HTML): ${targetUrl.substring(0, 50)}... → ${result.html.length} bytes`);
                    }
                }
                return;
            }

            // Fallback to direct Node.js fetch (Original behavior)
            console.log(`⚠️ Extension not found. Falling back to direct Node fetch...`);
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
                },
                signal: AbortSignal.timeout(15000), // 15s timeout
            });

            if (!response.ok) {
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Target returned ${response.status}` }));
                return;
            }

            const contentType = response.headers.get('content-type') || 'text/html';
            const body = await response.text();

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(body);
            console.log(`✅ Proxy (Node): ${targetUrl.substring(0, 50)}... → ${body.length} bytes`);
        } catch (err) {
            console.error(`❌ Proxy error: ${err.message}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Perchance Image Generation via Extension Proxy
    if (req.url?.startsWith('/perchance-image') && req.method === 'POST') {
        try {
            // Read POST body
            let bodyStr = '';
            await new Promise((resolve) => {
                req.on('data', chunk => bodyStr += chunk);
                req.on('end', resolve);
            });
            const body = JSON.parse(bodyStr || '{}');

            // Check if extension is connected
            const workerRoom = rooms.get('extension_worker');
            let workerClient = null;
            if (workerRoom && workerRoom.clients.size > 0) {
                workerClient = Array.from(workerRoom.clients)[0];
            }

            if (!workerClient || workerClient.readyState !== 1) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Extension not connected' }));
                return;
            }

            console.log(`🎨 Perchance: Routing image request via Extension...`);
            const requestId = Math.random().toString(36).slice(2, 10);

            // Wait for extension response
            const extResponse = new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    workerClient.removeListener('message', handler);
                    resolve({ success: false, error: 'Extension timeout (120s)' });
                }, 120000);

                const handler = (data) => {
                    try {
                        const msg = JSON.parse(data.toString());
                        if (msg.event_type === 'perchance_image_response' && msg.request_id === requestId) {
                            clearTimeout(timeout);
                            workerClient.removeListener('message', handler);
                            resolve(msg);
                        }
                    } catch (e) { }
                };

                workerClient.on('message', handler);
            });

            // Send request to extension
            workerClient.send(JSON.stringify({
                event_type: 'perchance_image_request',
                request_id: requestId,
                prompt: body.prompt || '',
                negativePrompt: body.negativePrompt || 'ugly, blurry, low quality, distorted, deformed',
                resolution: body.resolution || '768x768',
                guidanceScale: body.guidanceScale || 7,
                seed: body.seed || -1,
            }));

            const result = await extResponse;

            res.writeHead(result.success ? 200 : 502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            console.log(`🎨 Perchance: Image ${result.success ? '✅ success' : '❌ failed'}`);
        } catch (err) {
            console.error('🎨 Perchance proxy error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

// ═══════════════════════════════════════════════════
// WebSocket Server — relay (unchanged logic)
// ═══════════════════════════════════════════════════

const wss = new WebSocketServer({ server: httpServer });

console.log(`🔌 WS Relay + HTTP Proxy running on port ${PORT}`);
console.log(`   WebSocket: ws://localhost:${PORT}`);
console.log(`   HTTP Proxy: http://localhost:${PORT}/proxy?url=...`);
console.log();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get('code') || 'default';

    if (!rooms.has(code)) {
        rooms.set(code, { clients: new Set() });
    }
    const room = rooms.get(code);
    room.clients.add(ws);

    const clientId = Math.random().toString(36).slice(2, 8);
    console.log(`✅ [${code}] Client ${clientId} connected (${room.clients.size} total in room)`);

    ws.on('message', (data) => {
        const msg = data.toString();

        // Let the web proxy handle its own messages for fetch, bypass broadcasting if it's a fetch_response
        // We do this by checking if the room is extension_worker
        if (code === 'extension_worker') {
            // we already handle this in the promises above
            return;
        }

        let parsed;
        try { parsed = JSON.parse(msg); } catch { return; }

        const type = parsed.event_type ? 'response' : 'request';

        // Broadcast to ALL other clients in the same room
        for (const client of room.clients) {
            if (client !== ws && client.readyState === 1) {
                client.send(msg);
            }
        }

        if (type === 'request') {
            console.log(`📤 [${code}] ${clientId} → request ${parsed.request_id?.slice(0, 8)}... ${parsed.method} ${parsed.path}`);
        } else {
            console.log(`📥 [${code}] ${clientId} → ${parsed.event_type} for ${parsed.request_id?.slice(0, 8)}...`);
        }
    });

    ws.on('close', () => {
        room.clients.delete(ws);
        console.log(`❌ [${code}] Client ${clientId} disconnected (${room.clients.size} remaining)`);
        if (room.clients.size === 0) {
            rooms.delete(code);
        }
    });

    ws.on('error', (err) => {
        console.error(`⚠️ [${code}] Client ${clientId} error:`, err.message);
    });
});

httpServer.listen(PORT);

