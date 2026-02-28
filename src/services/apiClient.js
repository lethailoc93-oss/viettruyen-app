// ================================================
// API Client — Low-level API callers for AI services
// Supports: Google Gemini, Orbit-Provider, Custom HTTP, WebSocket Relay
// ================================================

import { wsRelay } from './wsRelayService';

const ORBIT_API_URL = 'https://api.orbit-provider.com/v1/chat/completions';
const API_TIMEOUT_MS = 90_000; // 90 second timeout per API call

// ═══════════════════════════════════════════════════
// CORS Proxy — Route through our Dedicated Node.js Backend Server
// ═══════════════════════════════════════════════════

// Lấy địa chỉ Backend từ file .env. Ví dụ trên Netlify sẽ set VITE_BACKEND_URL=https://vtbc-api.onrender.com/api/proxy/chat
// Dưới máy ảo cục bộ thì fallback về cổng 3001
const LOCAL_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api/proxy/chat';

/** 
 * Build the proxied fetch URL and body using the new Backend Server
 */
function buildProxyRequest(targetUrl, headers, payload, stream = false) {
    return {
        url: LOCAL_BACKEND_URL,
        body: JSON.stringify({
            targetUrl,
            headers: { Authorization: headers?.Authorization || headers?.authorization || headers?.['xi-api-key'] },
            payload,
            stream,
        }),
    };
}

/**
 * Mặc định tất cả các Call đến Custom API / API bên thứ 3 (không phải Localhost) đều ép gửi vào Backend Express 3001
 * Trừ các Endpoint là websocket vì Axios của Server k handle đc Websocket trực tiếp.
 */
export function shouldUseProxy(url) {
    if (!url || url.startsWith('ws://') || url.startsWith('wss://')) return false;

    // Nếu target là Node server chuẩn bị từ trước thì bỏ qua chặn đệ quy
    if (url.includes('localhost:3001') || url.includes('127.0.0.1:3001')) return false;

    // Check if target URL is a different origin (would cause CORS on browser)
    try {
        const targetOrigin = new URL(url).origin;
        const appOrigin = window.location.origin;
        return targetOrigin !== appOrigin;
    } catch {
        return false; // Not a valid URL, don't proxy
    }
}

/** 
 * Hàm này giữ lại vì tương thích ngược với các file khác
 * Hiện tại shouldUseDevProxy và shouldUseProxy gom chung thành cùng 1 hàm logic.
 */
export function shouldUseDevProxy(targetUrl) {
    return shouldUseProxy(targetUrl);
}

/** 
 * Build proxy config tương thích hàm buildProxyRequest của dev
 */
function buildDevProxyRequest(targetUrl, headers, payload, stream = false) {
    return buildProxyRequest(targetUrl, headers, payload, stream);
}

// ═══════════════════════════════════════════════════
// Global proxy config — set from ApiKeyProvider
// When provider='custom', all calls route through custom base URL
// ═══════════════════════════════════════════════════
let _proxyConfig = { provider: 'gemini', customBaseUrl: '' };
let _workerConfig = { provider: 'disabled', baseUrl: '', apiKey: '', model: '' };
let _generationConfig = { temperature: 0.8, topP: 0.9, topK: 40, maxTokens: 8192, reasoningEffort: 'auto', useWebSearch: false, streaming: true, contextSize: 128000, prefillEnabled: false, prefillContent: '', showReasoning: false, seed: -1, inlineImages: false, delegateReasoningToWorker: false, delegateImagesToWorker: false };
let _allowNSFW = false;

export function setApiSafety(allowNSFW) {
    _allowNSFW = !!allowNSFW;
    if (import.meta.env.DEV) console.log(`🛡️ API Safety: allowNSFW=${_allowNSFW}`);
}

export function setGenerationConfig(config) {
    _generationConfig = { ..._generationConfig, ...config };
    if (import.meta.env.DEV) console.log(`⚙️ Generation Config updated:`, _generationConfig);
}

export function setProxyConfig(provider, customBaseUrl) {
    _proxyConfig = { provider: provider || 'gemini', customBaseUrl: customBaseUrl || '' };
    if (import.meta.env.DEV) console.log(`🔌 API Router: provider=${_proxyConfig.provider}, baseUrl=${_proxyConfig.customBaseUrl || '(none)'}`);
}

export function setWorkerConfig(provider, baseUrl, apiKey, model) {
    _workerConfig = {
        provider: provider || 'disabled',
        baseUrl: baseUrl || '',
        apiKey: apiKey || '',
        model: model || ''
    };
    if (import.meta.env.DEV) console.log(`🤖 Worker AI Configured: provider=${_workerConfig.provider}, url=${_workerConfig.baseUrl || '(none)'}, model=${_workerConfig.model}`);
}

export function getProxyConfig() {
    return { ..._proxyConfig };
}

export function getGenerationConfig() {
    return { ..._generationConfig };
}

/**
 * Build thinkingConfig + responseModalities for Gemini API bodies.
 * Called after building the body object, merges results into body.
 */
function _applyGeminiExtras(body) {
    // ThinkingConfig — controls reasoning depth
    const effort = _generationConfig.reasoningEffort;
    if (effort && effort !== 'auto') {
        if (effort === 'none') {
            body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        } else {
            body.generationConfig.thinkingConfig = { thinkingBudget: -1 }; // auto budget
            // Map effort → Gemini thinking budget hints
            const effortMap = { minimal: 128, low: 1024, medium: 4096, high: 8192 };
            if (effortMap[effort]) {
                body.generationConfig.thinkingConfig.thinkingBudget = effortMap[effort];
            }
        }
    }

    // ResponseModalities — inline image generation
    if (_generationConfig.inlineImages) {
        body.generationConfig.responseModalities = ['TEXT', 'IMAGE'];
    }
}

/** Check if a URL is a WebSocket URL */
function isWSUrl(url) {
    return url && (url.startsWith('ws://') || url.startsWith('wss://'));
}

// ═══════════════════════════════════════════════════
// Shared Gemini Helpers (DRY)
// ═══════════════════════════════════════════════════

const NSFW_SAFETY_SETTINGS = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

/** Resolve model name to canonical Gemini model ID */
function resolveGeminiModel(model) {
    if (model.includes('2.5-flash')) return 'gemini-2.5-flash';
    if (model.includes('2.5-pro')) return 'gemini-2.5-pro';
    if (model.includes('3-flash-preview')) return 'gemini-3-flash-preview';
    if (model.includes('3-pro-preview')) return 'gemini-3-pro-preview';
    if (model.includes('3.1-pro')) return 'gemini-3.1-pro-preview';
    return model;
}

/** Convert OpenAI-style messages to Gemini format */
function convertMessagesToGemini(messages) {
    let systemInstruction = undefined;
    const contents = [];
    messages.forEach(msg => {
        if (msg.role === 'system') {
            if (!systemInstruction) systemInstruction = { parts: [{ text: msg.content }] };
            else systemInstruction.parts[0].text += `\n\n${msg.content}`;
        } else {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }
    });
    return { systemInstruction, contents };
}

/** Build full Gemini API request body */
function buildGeminiBody(messages, maxTokens, options = {}) {
    const { systemInstruction, contents } = convertMessagesToGemini(messages);
    const body = {
        contents,
        system_instruction: systemInstruction,
        generationConfig: {
            maxOutputTokens: maxTokens || _generationConfig.maxTokens,
            temperature: _generationConfig.temperature,
            topP: _generationConfig.topP,
            topK: _generationConfig.topK,
            ...(_generationConfig.seed >= 0 ? { seed: _generationConfig.seed } : {})
        }
    };
    _applyGeminiExtras(body);
    if (_allowNSFW) {
        body.safetySettings = NSFW_SAFETY_SETTINGS;
    }
    if (options.useWebSearch || _generationConfig.useWebSearch) {
        body.tools = [{ google_search: {} }];
    }
    return body;
}

// ═══════════════════════════════════════════════════
// WebSocket Relay — through Gemini Browser Proxy
// ═══════════════════════════════════════════════════

/**
 * Convert OpenAI-style messages to Gemini API request body,
 * then send via WebSocket relay (non-streaming).
 */
async function callWSRelayAPI(model, messages, maxTokens = 2048, options = {}) {
    const googleModel = resolveGeminiModel(model);
    const body = buildGeminiBody(messages, maxTokens, options);

    if ((options.useWebSearch || _generationConfig.useWebSearch) && import.meta.env.DEV) {
        console.log('🌐 WSRelay: Google Search grounding enabled');
    }

    const path = `/v1beta/models/${googleModel}:generateContent`;
    const rawResponse = await wsRelay.sendRequest('POST', path, { 'Content-Type': 'application/json' }, body, {}, options?.signal);

    // Parse response (raw JSON from Gemini API)
    try {
        const data = JSON.parse(rawResponse);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không nhận được phản hồi từ Gemini.';

        // Extract grounding metadata if web search was used
        const groundingMetadata = data.candidates?.[0]?.groundingMetadata || null;
        if (groundingMetadata && import.meta.env.DEV) {
            console.log('🌐 WSRelay: Grounding metadata received', groundingMetadata.webSearchQueries);
        }
        if (options.useWebSearch && groundingMetadata) {
            return { text, groundingMetadata };
        }
        return text;
    } catch {
        // If can't parse, return as-is
        return rawResponse || 'Không nhận được phản hồi.';
    }
}

/**
 * Convert OpenAI-style messages to Gemini API request body,
 * then send via WebSocket relay (streaming via SSE).
 */
async function callWSRelayAPIStream(model, messages, maxTokens, onChunk, options = {}) {
    const googleModel = resolveGeminiModel(model);
    const body = buildGeminiBody(messages, maxTokens, options);

    if ((options.useWebSearch || _generationConfig.useWebSearch) && import.meta.env.DEV) {
        console.log('🌐 WSRelay Stream: Google Search grounding enabled');
    }

    const path = `/v1beta/models/${googleModel}:streamGenerateContent`;
    const queryParams = { alt: 'sse' };
    return await wsRelay.sendRequest('POST', path, { 'Content-Type': 'application/json' }, body, queryParams, onChunk, options?.signal);
}

// ═══════════════════════════════════════════════════
// Custom Proxy — OpenAI-compatible (Ollama / LM Studio / GCLI Proxy)
// ═══════════════════════════════════════════════════

/**
 * Call a custom OpenAI-compatible API endpoint (non-streaming).
 * baseUrl should be like: http://localhost:11434/v1 or https://proxy.mcai.onl/v1beta/openai
 */
export async function callCustomAPI(baseUrl, apiKey, model, messages, maxTokens = 2048, retries = 3, options = {}) {
    const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const body = {
        model,
        messages,
        max_tokens: maxTokens || _generationConfig.maxTokens,
        temperature: _generationConfig.temperature,
        top_p: _generationConfig.topP
    };

    const useProxy = shouldUseProxy(url);

    for (let attempt = 0; attempt <= retries; attempt++) {
        const timeout = createTimeoutController(API_TIMEOUT_MS, options?.signal);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

            let fetchUrl = url;
            let fetchBody = JSON.stringify(body);
            let fetchHeaders = headers;

            if (useProxy) {
                const proxy = buildProxyRequest(url, headers, body, false);
                fetchUrl = proxy.url;
                fetchBody = proxy.body;
                fetchHeaders = { 'Content-Type': 'application/json' };
            } else if (shouldUseDevProxy(url)) {
                // Dev CORS proxy — route through Vite middleware
                const proxy = buildDevProxyRequest(url, headers, body, false);
                fetchUrl = proxy.url;
                fetchBody = proxy.body;
                fetchHeaders = { 'Content-Type': 'application/json' };
            }

            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: fetchHeaders,
                body: fetchBody,
                signal: timeout.signal
            });

            if (response.status === 429 || response.status === 503) {
                timeout.clear();
                if (attempt < retries) {
                    const waitTime = Math.pow(2, attempt + 1) * 1000 + (Math.random() * 1000);
                    if (import.meta.env.DEV) console.log(`⏳ Custom Proxy: ${response.status}. Thử lại sau ${(waitTime / 1000).toFixed(1)}s... (${attempt + 1}/${retries})`);
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                }
                throw new Error(`⚠️ Custom Proxy: Quá tải (${response.status}). Vui lòng thử lại sau.`);
            }

            if (!response.ok) {
                timeout.clear();
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error?.message || `Custom Proxy Error: ${response.status}`);
            }

            timeout.clear();
            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'Không nhận được phản hồi.';
        } catch (error) {
            timeout.clear();
            if (error.name === 'AbortError') {
                if (attempt < retries) continue;
                throw new Error(`⚠️ Custom Proxy: Request timeout. Kiểm tra lại URL proxy.`);
            }
            if (attempt === retries) throw error;
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                if (attempt < retries) {
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                throw new Error(`⚠️ Không thể kết nối tới Custom Proxy: ${baseUrl}. Kiểm tra URL và đảm bảo proxy đang chạy.`);
            }
            throw error;
        }
    }
}

/**
 * Call a custom OpenAI-compatible API endpoint (streaming).
 */
export async function callCustomAPIStream(baseUrl, apiKey, model, messages, maxTokens, onChunk, options = {}) {
    const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const timeout = createTimeoutController(API_TIMEOUT_MS, options?.signal);
    const bodyObj = {
        model,
        messages,
        max_tokens: maxTokens || _generationConfig.maxTokens,
        temperature: _generationConfig.temperature,
        top_p: _generationConfig.topP,
        stream: true
    };

    const useProxy = shouldUseProxy(url);
    let fetchUrl = url;
    let fetchBody = JSON.stringify(bodyObj);
    let fetchHeaders = headers;

    if (useProxy) {
        const proxy = buildProxyRequest(url, headers, bodyObj, true);
        fetchUrl = proxy.url;
        fetchBody = proxy.body;
        fetchHeaders = { 'Content-Type': 'application/json' };
    } else if (shouldUseDevProxy(url)) {
        // Dev CORS proxy — route through Vite middleware
        const proxy = buildDevProxyRequest(url, headers, bodyObj, true);
        fetchUrl = proxy.url;
        fetchBody = proxy.body;
        fetchHeaders = { 'Content-Type': 'application/json' };
    }

    const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body: fetchBody,
        signal: timeout.signal
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Custom Proxy Stream Error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
                const data = JSON.parse(jsonStr);
                const delta = data.choices?.[0]?.delta?.content || '';
                if (delta) { fullText += delta; onChunk(delta); }
            } catch (e) { /* skip */ }
        }
    }
    return fullText;
}

// Helper: create AbortController with timeout and optional parent signal
export function createTimeoutController(ms = API_TIMEOUT_MS, parentSignal = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ms);

    if (parentSignal) {
        if (parentSignal.aborted) {
            controller.abort();
            clearTimeout(timeoutId);
        } else {
            parentSignal.addEventListener('abort', () => {
                controller.abort();
                clearTimeout(timeoutId);
            });
        }
    }

    return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
}

// ═══════════════════════════════════════════════════
// Non-streaming API calls
// ═══════════════════════════════════════════════════

// Call Google Gemini API directly (for keys starting with AIza)
// options.useWebSearch — enable Google Search grounding
async function callGeminiDirect(apiKey, model, messages, maxTokens = 2048, options = {}, retries = 3) {
    const googleModel = resolveGeminiModel(model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${apiKey}`;
    const body = buildGeminiBody(messages, maxTokens, options);

    if (options.useWebSearch || _generationConfig.useWebSearch) {
        body.tools = [{ google_search: {} }];
        if (import.meta.env.DEV) console.log('🌐 Gemini: Google Search grounding enabled');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        const timeout = createTimeoutController(API_TIMEOUT_MS, options.signal);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: timeout.signal
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                const errMsg = err.error?.message || response.statusText;

                if (response.status === 503 || errMsg.includes('high demand') || errMsg.includes('overloaded')) {
                    timeout.clear();
                    if (attempt < retries) {
                        const waitTime = Math.pow(2, attempt + 1) * 1000 + (Math.random() * 2000);
                        if (import.meta.env.DEV) console.log(`⏳ Gemini: Model đang quá tải (${response.status}). Thử lại sau ${(waitTime / 1000).toFixed(1)}s... (${attempt + 1}/${retries})`);
                        await new Promise(r => setTimeout(r, waitTime));
                        continue;
                    }
                    throw new Error(`⚠️ Model ${googleModel} đang quá tải (high demand). Vui lòng thử lại sau vài phút hoặc chọn model khác.`);
                }

                if (response.status === 429) {
                    timeout.clear();
                    if (attempt < retries) {
                        const waitTime = Math.pow(2, attempt + 1) * 1000 + (Math.random() * 1000);
                        if (import.meta.env.DEV) console.log(`⏳ Gemini: Rate limited (429). Thử lại sau ${(waitTime / 1000).toFixed(1)}s... (${attempt + 1}/${retries})`);
                        await new Promise(r => setTimeout(r, waitTime));
                        continue;
                    }
                    throw new Error('⚠️ Hết hạn ngạch (Rate Limit). Vui lòng đợi 1-2 phút rồi thử lại.');
                }

                throw new Error(`Gemini API Error: ${errMsg}`);
            }

            timeout.clear();
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không nhận được phản hồi từ Gemini.';

            const groundingMetadata = data.candidates?.[0]?.groundingMetadata || null;
            if (groundingMetadata && import.meta.env.DEV) {
                console.log('🌐 Gemini: Grounding metadata received', groundingMetadata.webSearchQueries);
            }

            if (options.useWebSearch && groundingMetadata) {
                return { text, groundingMetadata };
            }
            return text;
        } catch (error) {
            timeout.clear();
            if (error.name === 'AbortError') {
                if (attempt < retries) {
                    if (import.meta.env.DEV) console.log(`⏳ Gemini: Request timeout. Thử lại... (${attempt + 1}/${retries})`);
                    continue;
                }
                throw new Error(`⚠️ Request timeout sau ${API_TIMEOUT_MS / 1000}s. Model ${googleModel} phản hồi quá chậm. Vui lòng thử model khác.`);
            }
            if (attempt === retries) throw error;
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                const waitTime = Math.pow(2, attempt + 1) * 1000;
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }
            throw error;
        }
    }
}

// Call Orbit-Provider API (OpenAI-compatible) with retry on 429
export async function callOrbitAPI(apiKey, model, messages, maxTokens = 2048, retries = 5, options = {}) {
    // Route to Worker AI if delegated for Reasoning or Inline Images
    const needsWorkerReasoning = _generationConfig.reasoningEffort && _generationConfig.reasoningEffort !== 'auto' && _generationConfig.reasoningEffort !== 'none' && _generationConfig.delegateReasoningToWorker;
    const needsWorkerImages = _generationConfig.inlineImages && _generationConfig.delegateImagesToWorker;
    const shouldDelegate = needsWorkerReasoning || needsWorkerImages;

    if (shouldDelegate && _workerConfig.provider !== 'disabled' && _workerConfig.baseUrl && _workerConfig.model) {
        if (import.meta.env.DEV) console.log(`🔄 Delegated task to Worker AI (${_workerConfig.model})`);
        try {
            return await callCustomAPI(_workerConfig.baseUrl, _workerConfig.apiKey, _workerConfig.model, messages, maxTokens, retries, options);
        } catch (error) {
            console.warn(`⚠️ Worker AI delegated task failed: ${error.message}. Falling back to Main AI...`);
            // Proceed to main AI fallback below
        }
    }

    // Route through custom proxy if configured (per-call or global)
    const proxyUrl = options.customBaseUrl || (_proxyConfig.provider === 'custom' && _proxyConfig.customBaseUrl);
    if (proxyUrl) {
        // WebSocket relay or HTTP proxy — with fallback to Gemini Direct
        try {
            if (isWSUrl(proxyUrl)) {
                return await callWSRelayAPI(model, messages, maxTokens, options);
            }
            return await callCustomAPI(proxyUrl, apiKey, model, messages, maxTokens, retries, options);
        } catch (proxyError) {
            console.warn(`⚠️ Custom Proxy failed: ${proxyError.message}. Attempting Gemini Direct fallback...`);
            // Fallback: try Gemini Direct if we have an AIza key
            if (apiKey?.startsWith('AIza')) {
                return await callGeminiDirect(apiKey, model, messages, maxTokens, options);
            }
            // No fallback available — rethrow
            throw proxyError;
        }
    }
    if (apiKey?.startsWith('AIza')) {
        return await callGeminiDirect(apiKey, model, messages, maxTokens, options);
    }

    const body = {
        model,
        messages,
        max_tokens: maxTokens || _generationConfig.maxTokens,
        temperature: _generationConfig.temperature,
        top_p: _generationConfig.topP
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
        const timeout = createTimeoutController(API_TIMEOUT_MS, options.signal);
        try {
            const response = await fetch(ORBIT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body),
                signal: timeout.signal
            });

            if (response.status === 503) {
                timeout.clear();
                if (attempt < retries) {
                    const waitTime = Math.pow(2, attempt + 1) * 1000 + (Math.random() * 2000);
                    if (import.meta.env.DEV) console.log(`⏳ Model đang quá tải (503). Thử lại sau ${(waitTime / 1000).toFixed(1)}s... (${attempt + 1}/${retries})`);
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                } else {
                    throw new Error('⚠️ Model đang quá tải (high demand). Vui lòng thử lại sau vài phút hoặc chọn model khác.');
                }
            }

            if (response.status === 429) {
                timeout.clear();
                if (attempt < retries) {
                    let waitTime = Math.pow(2, attempt + 1) * 1000 + (Math.random() * 1000);
                    const retryAfter = response.headers.get('Retry-After');
                    if (retryAfter) {
                        waitTime = parseInt(retryAfter, 10) * 1000 + 1000;
                    }
                    if (import.meta.env.DEV) console.log(`Rate limited (429). Retrying in ${(waitTime / 1000).toFixed(2)}s... (attempt ${attempt + 1}/${retries})`);
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                } else {
                    throw new Error('Hệ thống đang quá tải (429). Vui lòng thử lại sau 30 giây.');
                }
            }

            if (!response.ok) {
                timeout.clear();
                const err = await response.json().catch(() => ({}));
                let msg = err?.error?.message || `API Error: ${response.status}`;
                if (msg.includes('Quota exceeded') || msg.includes('429')) {
                    msg = `⚠️ Hết hạn ngạch (Quota Exceeded). Vui lòng đợi 1-2 phút rồi thử lại.`;
                }
                if (msg.includes('high demand') || msg.includes('overloaded')) {
                    msg = `⚠️ Model đang quá tải (high demand). Vui lòng thử lại sau vài phút hoặc chọn model khác.`;
                }
                throw new Error(msg);
            }

            timeout.clear();
            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'Không nhận được phản hồi từ AI.';
        } catch (error) {
            timeout.clear();
            if (error.name === 'AbortError') {
                if (attempt < retries) {
                    if (import.meta.env.DEV) console.log(`⏳ Request timeout. Thử lại... (${attempt + 1}/${retries})`);
                    continue;
                }
                throw new Error(`⚠️ Request timeout sau ${API_TIMEOUT_MS / 1000}s. Model phản hồi quá chậm. Vui lòng thử model khác.`);
            }
            if (attempt === retries) throw error;
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                const waitTime = Math.pow(2, attempt + 1) * 1000;
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }
            throw error;
        }
    }
}

// ═══════════════════════════════════════════════════
// Streaming API calls — text appears chunk by chunk
// ═══════════════════════════════════════════════════

async function callGeminiDirectStream(apiKey, model, messages, maxTokens, onChunk, options = {}) {
    const googleModel = resolveGeminiModel(model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const body = buildGeminiBody(messages, maxTokens, options);

    if ((options.useWebSearch || _generationConfig.useWebSearch) && import.meta.env.DEV) {
        console.log('🌐 Gemini Stream: Google Search grounding enabled');
    }

    if (googleModel.includes('pro') && _generationConfig.reasoningEffort && _generationConfig.reasoningEffort !== 'auto') {
        body.generationConfig.thinkingConfig = {
            thinkingBudget: _generationConfig.reasoningEffort === 'high' ? 4096 : 1024
        }
    }

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const timeout = createTimeoutController(API_TIMEOUT_MS, options.signal);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: timeout.signal
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const errMsg = err.error?.message || response.statusText;

            if (response.status === 503 || errMsg.includes('high demand') || errMsg.includes('overloaded')) {
                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt + 1) * 1000 + (Math.random() * 2000);
                    if (import.meta.env.DEV) console.log(`⏳ Gemini Stream: Model đang quá tải (${response.status}). Thử lại sau ${(waitTime / 1000).toFixed(1)}s... (${attempt + 1}/${maxRetries})`);
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                }
                throw new Error(`⚠️ Model ${googleModel} đang quá tải (high demand). Vui lòng thử lại sau vài phút hoặc chọn model khác.`);
            }

            if (response.status === 429) {
                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt + 1) * 1000 + (Math.random() * 1000);
                    if (import.meta.env.DEV) console.log(`⏳ Gemini Stream: Rate limited (429). Thử lại sau ${(waitTime / 1000).toFixed(1)}s... (${attempt + 1}/${maxRetries})`);
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                }
            }

            throw new Error(`Gemini Stream Error: ${errMsg}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let groundingMetadata = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;
                try {
                    const data = JSON.parse(jsonStr);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                        fullText += text;
                        onChunk(text);
                    }
                    if (data.candidates?.[0]?.groundingMetadata) {
                        groundingMetadata = data.candidates[0].groundingMetadata;
                    }
                } catch (e) { /* skip malformed JSON */ }
            }
        }

        if (groundingMetadata && import.meta.env.DEV) {
            console.log('🌐 Gemini Stream: Grounding metadata received', groundingMetadata.webSearchQueries);
        }

        if (options.useWebSearch && groundingMetadata) {
            return { text: fullText, groundingMetadata };
        }
        return fullText;
    }
}

export async function callOrbitAPIStream(apiKey, model, messages, maxTokens, onChunk, options = {}) {
    // Route to Worker AI if delegated for Reasoning or Inline Images
    const needsWorkerReasoning = _generationConfig.reasoningEffort && _generationConfig.reasoningEffort !== 'auto' && _generationConfig.reasoningEffort !== 'none' && _generationConfig.delegateReasoningToWorker;
    const needsWorkerImages = _generationConfig.inlineImages && _generationConfig.delegateImagesToWorker;
    const shouldDelegate = needsWorkerReasoning || needsWorkerImages;

    if (shouldDelegate && _workerConfig.provider !== 'disabled' && _workerConfig.baseUrl && _workerConfig.model) {
        if (import.meta.env.DEV) console.log(`🔄 Delegated task (stream) to Worker AI (${_workerConfig.model})`);
        try {
            return await callCustomAPIStream(_workerConfig.baseUrl, _workerConfig.apiKey, _workerConfig.model, messages, maxTokens, onChunk, options);
        } catch (error) {
            console.warn(`⚠️ Worker AI Stream delegated task failed: ${error.message}. Falling back to Main AI...`);
        }
    }

    // Route through custom proxy if configured (per-call or global)
    const proxyUrl = options.customBaseUrl || (_proxyConfig.provider === 'custom' && _proxyConfig.customBaseUrl);
    if (proxyUrl) {
        // WebSocket relay or HTTP proxy — with fallback to Gemini Direct
        try {
            if (isWSUrl(proxyUrl)) {
                return await callWSRelayAPIStream(model, messages, maxTokens, onChunk, options);
            }
            return await callCustomAPIStream(proxyUrl, apiKey, model, messages, maxTokens, onChunk, options);
        } catch (proxyError) {
            console.warn(`⚠️ Custom Proxy Stream failed: ${proxyError.message}. Attempting Gemini Direct fallback...`);
            if (apiKey?.startsWith('AIza')) {
                return await callGeminiDirectStream(apiKey, model, messages, maxTokens, onChunk, options);
            }
            throw proxyError;
        }
    }
    if (apiKey?.startsWith('AIza')) {
        return await callGeminiDirectStream(apiKey, model, messages, maxTokens, onChunk, options);
    }

    const timeout = createTimeoutController(API_TIMEOUT_MS, options.signal);
    const response = await fetch(ORBIT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model, messages,
            max_tokens: maxTokens || _generationConfig.maxTokens,
            temperature: _generationConfig.temperature,
            top_p: _generationConfig.topP,
            stream: true
        }),
        signal: timeout.signal
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API Stream Error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
                const data = JSON.parse(jsonStr);
                const delta = data.choices?.[0]?.delta?.content || '';
                if (delta) {
                    fullText += delta;
                    onChunk(delta);
                }
            } catch (e) { /* skip malformed JSON */ }
        }
    }
    return fullText;
}

// ═══════════════════════════════════════════════════
// Smart API Auto-Routing (Main vs Worker with Fallback)
// ═══════════════════════════════════════════════════

/**
 * Smart API call that routes to Worker AI if role='worker' AND Worker is configured.
 * Has built-in fallback to Main AI if Worker AI fails.
 */
export async function callSmartAPI(apiKey, mainModel, messages, maxTokens = 2048, options = {}) {
    if (options.role === 'worker' && _workerConfig.provider !== 'disabled' && _workerConfig.baseUrl && _workerConfig.model) {
        if (import.meta.env.DEV) console.log(`🚀 Delegating task to Worker AI (${_workerConfig.provider}): ${_workerConfig.model}`);
        try {
            return await callCustomAPI(_workerConfig.baseUrl, _workerConfig.apiKey, _workerConfig.model, messages, maxTokens, 1, options);
        } catch (error) {
            console.warn(`⚠️ Worker AI Failed: ${error.message}. Fallback to Main AI (Gemini)...`);
            // Proceed to fallback
        }
    }

    // Default / Fallback: callOrbitAPI (Main AI)
    return await callOrbitAPI(apiKey, mainModel, messages, maxTokens, 5, options);
}

export async function callSmartAPIStream(apiKey, mainModel, messages, maxTokens, onChunk, options = {}) {
    if (options.role === 'worker' && _workerConfig.provider !== 'disabled' && _workerConfig.baseUrl && _workerConfig.model) {
        if (import.meta.env.DEV) console.log(`🚀 Delegating stream task to Worker AI (${_workerConfig.provider}): ${_workerConfig.model}`);
        try {
            // Note: If streaming fails mid-way, fallback will duplicate chunks. 
            // Often errors happen before the first chunk, which is safe to fallback.
            return await callCustomAPIStream(_workerConfig.baseUrl, _workerConfig.apiKey, _workerConfig.model, messages, maxTokens, onChunk, options);
        } catch (error) {
            console.warn(`⚠️ Worker AI Stream Failed: ${error.message}. Fallback to Main AI (Gemini)...`);
            // Proceed to fallback
        }
    }

    return await callOrbitAPIStream(apiKey, mainModel, messages, maxTokens, onChunk, options);
}

// ═══════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════

// Build messages array (OpenAI format) from system instruction + prompt
export function buildMessages(systemInstruction, prompt) {
    const messages = [];
    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });
    return messages;
}

// Helper: Simulate delay for mock mode
export const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

// Helper function to extract text from <content> tags when <thinking> is used
export const extractContentTag = (text) => {
    if (!text) return '';
    const contentMatch = text.match(/<content>([\s\S]*?)(?:<\/content>|$)/i);
    return contentMatch ? contentMatch[1].trim() : text.trim();
};
