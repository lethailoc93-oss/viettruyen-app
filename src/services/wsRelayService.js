// ================================================
// WebSocket Relay Service
// Connects viettruyen to Gemini Browser Proxy via WS relay server
// Protocol: send request specs → receive response chunks
// ================================================

const WS_RECONNECT_DELAY = 5000;
const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes per request

/**
 * Singleton WebSocket relay client.
 * Manages connection to the WS relay server and routes
 * Gemini API requests through the Proxy App.
 */
class WSRelayClient {
    constructor() {
        /** @type {WebSocket|null} */
        this.ws = null;
        /** @type {string} */
        this.endpoint = '';
        /** @type {boolean} */
        this.connected = false;
        /** @type {boolean} */
        this.terminated = false;
        /** @type {number|null} */
        this.reconnectTimer = null;

        // Pending requests: request_id → { resolve, reject, onChunk, buffer, headers }
        /** @type {Map<string, object>} */
        this.pendingRequests = new Map();

        // Event listeners
        /** @type {Set<Function>} */
        this._statusListeners = new Set();
    }

    /**
     * Connect to a WebSocket relay endpoint.
     * @param {string} endpoint - ws:// or wss:// URL (may include ?code=...)
     * @returns {Promise<void>}
     */
    connect(endpoint) {
        if (this.connected && this.endpoint === endpoint) {
            return Promise.resolve();
        }

        // Disconnect old connection if any
        this.disconnect();
        this.endpoint = endpoint;
        this.terminated = false;

        return this._establish();
    }

    /** Disconnect and stop reconnecting */
    disconnect() {
        this.terminated = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this._notifyStatus();

        // Reject all pending requests
        for (const [id, req] of this.pendingRequests) {
            req.reject(new Error('WebSocket disconnected'));
        }
        this.pendingRequests.clear();
    }

    /** @returns {boolean} */
    isConnected() {
        return this.connected;
    }

    /**
     * Register a status listener. Called with (connected: boolean).
     * @param {Function} fn
     */
    onStatusChange(fn) {
        this._statusListeners.add(fn);
        return () => this._statusListeners.delete(fn);
    }

    _notifyStatus() {
        for (const fn of this._statusListeners) {
            try { fn(this.connected); } catch (e) { /* ignore */ }
        }
    }

    /**
     * Establish WebSocket connection.
     * @returns {Promise<void>}
     */
    _establish() {
        return new Promise((resolve, reject) => {
            try {
                if (import.meta.env.DEV) console.log(`🔌 WSRelay: Connecting to ${this.endpoint}`);
                this.ws = new WebSocket(this.endpoint);

                this.ws.addEventListener('open', () => {
                    this.connected = true;
                    if (import.meta.env.DEV) console.log('🔌 WSRelay: Connected ✓');
                    this._notifyStatus();
                    resolve();
                });

                this.ws.addEventListener('close', () => {
                    const wasConnected = this.connected;
                    this.connected = false;
                    this._notifyStatus();
                    if (!this.terminated) {
                        if (import.meta.env.DEV) console.log('🔌 WSRelay: Connection lost, reconnecting...');
                        this._scheduleReconnect();
                    }
                });

                this.ws.addEventListener('error', (err) => {
                    if (import.meta.env.DEV) console.log('🔌 WSRelay: Connection error');
                    if (!this.connected) reject(err);
                });

                this.ws.addEventListener('message', (event) => {
                    this._handleMessage(event.data);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    _scheduleReconnect() {
        if (this.terminated || this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.terminated) {
                this._establish().catch(() => { /* will auto-retry via close handler */ });
            }
        }, WS_RECONNECT_DELAY);
    }

    /**
     * Handle incoming WebSocket message from proxy.
     * Message types: response_headers, chunk, stream_close, error
     */
    _handleMessage(raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        const requestId = msg.request_id;
        if (!requestId) return;

        const pending = this.pendingRequests.get(requestId);
        if (!pending) return;

        switch (msg.event_type) {
            case 'response_headers':
                pending.status = msg.status;
                pending.headers = msg.headers || {};
                break;

            case 'chunk':
                if (msg.data) {
                    pending.buffer += msg.data;
                    if (pending.onChunk) {
                        // For streaming: parse SSE chunks from the raw data
                        this._processSSEChunk(msg.data, pending);
                    }
                }
                break;

            case 'stream_close':
                if (pending.timeoutId) clearTimeout(pending.timeoutId);
                this.pendingRequests.delete(requestId);

                // Check for HTTP errors
                if (pending.status && pending.status >= 400) {
                    pending.reject(new Error(`Proxy Error: HTTP ${pending.status}`));
                    return;
                }

                if (pending.onChunk) {
                    // Streaming mode: return full text
                    pending.resolve(pending.fullText || '');
                } else {
                    // Non-streaming: parse the response
                    pending.resolve(pending.buffer);
                }
                break;

            case 'error':
                if (pending.timeoutId) clearTimeout(pending.timeoutId);
                this.pendingRequests.delete(requestId);
                pending.reject(new Error(msg.message || `Proxy Error: ${msg.status || 'Unknown'}`));
                break;
        }
    }

    /**
     * Process SSE-formatted chunk data and extract text deltas.
     * The proxy streams the raw Gemini SSE response.
     */
    _processSSEChunk(data, pending) {
        // Accumulate partial lines
        pending.sseBuffer = (pending.sseBuffer || '') + data;
        const lines = pending.sseBuffer.split('\n');
        pending.sseBuffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                    pending.fullText = (pending.fullText || '') + text;
                    pending.onChunk(text);
                }
            } catch { /* skip malformed */ }
        }
    }

    /**
     * Send a Gemini API request through the WS relay.
     * @param {string} method - HTTP method
     * @param {string} path - API path (e.g., /v1beta/models/gemini-3-flash:generateContent)
     * @param {object} headers - HTTP headers
     * @param {string|object} body - Request body
     * @param {object} [queryParams] - Query parameters
     * @param {Function} [onChunk] - Streaming callback (if set, streams SSE chunks)
     * @returns {Promise<string>} - Raw response body (or full streamed text)
     */
    sendRequest(method, path, headers = {}, body = null, queryParams = {}, onChunk = null) {
        if (!this.connected || !this.ws) {
            return Promise.reject(new Error('WebSocket not connected. Kiểm tra kết nối proxy.'));
        }

        const requestId = crypto.randomUUID();

        return new Promise((resolve, reject) => {
            // Set timeout
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error('⚠️ WebSocket Relay: Request timeout (2 phút). Proxy không phản hồi.'));
            }, REQUEST_TIMEOUT_MS);

            // Register pending request
            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                onChunk,
                buffer: '',
                fullText: '',
                sseBuffer: '',
                status: null,
                headers: {},
                timeoutId
            });

            // Send request spec
            const requestSpec = {
                request_id: requestId,
                method,
                path,
                headers,
                body: typeof body === 'string' ? body : JSON.stringify(body),
                query_params: queryParams
            };

            this.ws.send(JSON.stringify(requestSpec));
            if (import.meta.env.DEV) console.log(`🔌 WSRelay: Sent request ${requestId.slice(0, 8)}... → ${method} ${path}`);
        });
    }
}

// Singleton instance
export const wsRelay = new WSRelayClient();
