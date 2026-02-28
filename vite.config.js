import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin: Dev CORS Proxy middleware
// Forwards requests through the Vite server to avoid CORS on localhost
function devCorsProxy() {
    return {
        name: 'dev-cors-proxy',
        configureServer(server) {
            server.middlewares.use('/api/cors-proxy', async (req, res) => {
                if (req.method !== 'POST') {
                    res.writeHead(405);
                    res.end('Method not allowed');
                    return;
                }
                // Read request body
                let body = '';
                for await (const chunk of req) body += chunk;

                try {
                    const { targetUrl, headers = {}, payload, stream } = JSON.parse(body);
                    if (!targetUrl) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Missing targetUrl' }));
                        return;
                    }

                    // Forward the request
                    const response = await fetch(targetUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...headers
                        },
                        body: typeof payload === 'string' ? payload : JSON.stringify(payload)
                    });

                    // Copy status + headers
                    const fwdHeaders = {};
                    response.headers.forEach((v, k) => {
                        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(k.toLowerCase())) {
                            fwdHeaders[k] = v;
                        }
                    });
                    fwdHeaders['Access-Control-Allow-Origin'] = '*';
                    res.writeHead(response.status, fwdHeaders);

                    // Stream the response body
                    if (response.body) {
                        const reader = response.body.getReader();
                        const pump = async () => {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) { res.end(); return; }
                                res.write(Buffer.from(value));
                            }
                        };
                        await pump();
                    } else {
                        res.end(await response.text());
                    }
                } catch (err) {
                    console.error('[dev-cors-proxy]', err.message);
                    res.writeHead(502);
                    res.end(JSON.stringify({ error: err.message }));
                }
            });

            // Handle OPTIONS preflight
            server.middlewares.use('/api/cors-proxy', (req, res, next) => {
                if (req.method === 'OPTIONS') {
                    res.writeHead(204, {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Access-Control-Max-Age': '86400'
                    });
                    res.end();
                    return;
                }
                next();
            });
        }
    };
}

export default defineConfig({
    plugins: [react(), devCorsProxy()],
    base: './',
    build: {
        outDir: 'dist'
    }
})

