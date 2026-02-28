/**
 * background.js - Chrome Extension Service Worker
 * Connects to ws://localhost:8080/?code=extension_worker
 * Listens for fetch requests, performs them in background or via tab injection, and returns HTML.
 */

let ws = null;
const WS_URL = "ws://localhost:8080/?code=extension_worker";
let isConnected = false;
let reconnectTimer = null;

function connectWS() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    console.log("Attempting to connect to WS Relay:", WS_URL);
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log("✅ Connected to WS Relay Server!");
        isConnected = true;
        chrome.action.setBadgeText({ text: "ON" });
        chrome.action.setBadgeBackgroundColor({ color: "#4caf50" });
        if (reconnectTimer) clearInterval(reconnectTimer);
    };

    ws.onmessage = async (event) => {
        try {
            const msg = JSON.parse(event.data);

            // Handle Perchance image generation request
            if (msg.event_type === "perchance_image_request") {
                console.log(`🎨 Received Perchance image request [${msg.request_id}]`);
                const result = await generatePerchanceImage(msg);
                ws.send(JSON.stringify(result));
                console.log(`📤 Sent Perchance image response [${msg.request_id}] success=${result.success}`);
                return;
            }

            if (msg.event_type !== "fetch_request") return;

            console.log(`📥 Received fetch request [${msg.request_id}] for: ${msg.url} (format: ${msg.format})`);

            const extractText = msg.format === 'text';
            const data = await executeFetch(msg.url, extractText);

            const response = {
                event_type: "fetch_response",
                request_id: msg.request_id,
                url: msg.url,
                html: typeof data === 'string' ? data : (data ? data.html : ""),
                title: data && typeof data !== 'string' ? data.title : "",
                textContent: data && typeof data !== 'string' ? data.textContent : "",
                success: !!data
            };

            ws.send(JSON.stringify(response));
            console.log(`📤 Sent fetch response [${msg.request_id}]`);

        } catch (e) {
            console.error("❌ Error processing message:", e);
        }
    };

    ws.onclose = () => {
        console.log("❌ Disconnected from WS Relay Server.");
        isConnected = false;
        chrome.action.setBadgeText({ text: "OFF" });
        chrome.action.setBadgeBackgroundColor({ color: "#f44336" });

        if (!reconnectTimer) {
            reconnectTimer = setInterval(connectWS, 3000);
        }
    };

    ws.onerror = (e) => {
        console.error("WS Error", e);
        ws.close();
    };
}

// Start connection
connectWS();

/**
 * 1. Tries a background fetch first.
 * 2. If blocked by Cloudflare (403, 503, or contains Turnstile challenge), injects a tab.
 * 3. If extractText is true, it always injects a tab to parse using Readability (since we don't load DOMParser in background worker yet)
 */
async function executeFetch(url, extractText = false) {
    if (extractText) {
        // Readability needs DOM so we use tab injection directly
        console.log(`Text extraction requested. Using Tab Injection...`);
        return await fetchViaTabInjection(url, true);
    }

    try {
        const res = await fetch(url, {
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.8,en-US;q=0.5,en;q=0.3",
                "Cache-Control": "max-age=0"
            }
        });

        const text = await res.text();

        // Detect Cloudflare blocks
        if (res.status === 403 || res.status === 503 || text.includes("cf-browser-verification") || text.includes("cf-turnstile")) {
            console.log(`⚠️ Cloudflare block detected for ${url} via Background Fetch. Falling back to Tab Injection...`);
            return await fetchViaTabInjection(url, false);
        }

        return text; // Return raw HTML string
    } catch (err) {
        console.error(`Fetch failed for ${url} background. Trying tab injection...`, err);
        return await fetchViaTabInjection(url, false);
    }
}

/**
 * Opens a new tab, waits for page to load (checking for CF clearance), 
 * injects Readability, extracts clean text/title, and closes the tab.
 */
function fetchViaTabInjection(url, extractText = false) {
    return new Promise((resolve) => {
        chrome.tabs.create({ url: url, active: false }, (tab) => {
            const tabId = tab.id;
            let isResolved = false;

            const listener = (tid, changeInfo, tabInfo) => {
                if (tid === tabId && changeInfo.status === "complete") {

                    if (extractText) {
                        // Execute script to inject Readability and extract content
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ["Readability.js"]
                        }, () => {
                            if (chrome.runtime.lastError) {
                                console.error("Inject Readability Error:", chrome.runtime.lastError);
                            }

                            chrome.scripting.executeScript({
                                target: { tabId: tabId },
                                func: () => {
                                    const html = document.documentElement.outerHTML;
                                    const isCF = html.includes('cf-browser-verification') || document.title.includes('Just a moment');

                                    if (isCF) return { isCF: true };

                                    try {
                                        // Clone document before parsing to not destroy page
                                        var documentClone = document.cloneNode(true);
                                        var article = new Readability(documentClone).parse();
                                        return {
                                            isCF: false,
                                            success: true,
                                            title: article ? article.title : document.title,
                                            textContent: article ? article.textContent : document.body.innerText,
                                            html: html // fallback
                                        };
                                    } catch (e) {
                                        return { isCF: false, success: false, html: html };
                                    }
                                }
                            }, handleResult);
                        });
                    } else {
                        // Default behavior: Just get HTML
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => {
                                const html = document.documentElement.outerHTML;
                                const isCF = html.includes('cf-browser-verification') || document.title.includes('Just a moment');
                                return { html: html, isCF: isCF };
                            }
                        }, handleResult);
                    }

                    function handleResult(results) {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError);
                            resolveAndClose(null);
                            return;
                        }

                        if (results && results[0] && results[0].result) {
                            const data = results[0].result;
                            if (!data.isCF) {
                                // Success, got real content
                                resolveAndClose(data);
                            } else {
                                console.log(`Tab ${tabId} is still on Cloudflare challenge page. Waiting...`);
                            }
                        }
                    }
                }
            };

            function resolveAndClose(data) {
                if (!isResolved) {
                    isResolved = true;
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.remove(tabId);
                    resolve(data);
                }
            }

            chrome.tabs.onUpdated.addListener(listener);

            // Timeout after 30 seconds
            setTimeout(() => {
                resolveAndClose(null);
                console.warn(`Tab Injection Timeout for ${url}`);
            }, 30000);
        });
    });
}

// ============================================
// Perchance Image Generation
// Uses extension context (no CORS) + tab injection for verifyUser
// ============================================

const PERCHANCE_API = "https://image-generation.perchance.org/api";

/**
 * Generate an image via Perchance API
 * Step 1: Open verifyUser in a tab (needs JS execution to get userKey)
 * Step 2: POST to /generate with userKey
 * Step 3: Download the image and return as base64
 */
async function generatePerchanceImage(msg) {
    const {
        request_id,
        prompt = '',
        negativePrompt = 'ugly, blurry, low quality, distorted, deformed',
        resolution = '768x768',
        guidanceScale = 7,
        seed = -1,
    } = msg;

    const responseBase = {
        event_type: "perchance_image_response",
        request_id,
    };

    try {
        // Step 1: Get userKey via tab injection (needs JS execution)
        const userKey = await getPerchanceUserKey();
        if (!userKey) {
            return { ...responseBase, success: false, error: "Failed to get Perchance userKey" };
        }
        console.log(`🎨 Perchance: Got userKey: ${userKey.substring(0, 10)}...`);

        // Step 2: Generate image
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
            return { ...responseBase, success: false, error: `Generate failed: HTTP ${genResp.status}` };
        }

        const genResult = await genResp.json();
        if (!genResult.imageId) {
            return { ...responseBase, success: false, error: "No imageId returned" };
        }
        console.log(`🎨 Perchance: Image generated, ID: ${genResult.imageId}`);

        // Step 3: Download image
        const downloadUrl = `${PERCHANCE_API}/downloadTemporaryImage?imageId=${encodeURIComponent(genResult.imageId)}`;
        const imgResp = await fetch(downloadUrl);

        if (!imgResp.ok) {
            return { ...responseBase, success: false, error: `Download failed: HTTP ${imgResp.status}` };
        }

        const blob = await imgResp.blob();
        const base64 = await blobToBase64(blob);

        return {
            ...responseBase,
            success: true,
            imageBase64: base64,
            contentType: blob.type || 'image/jpeg',
            imageId: genResult.imageId,
            seed: genResult.seed,
        };

    } catch (err) {
        console.error("🎨 Perchance error:", err);
        return { ...responseBase, success: false, error: err.message };
    }
}

/**
 * Get userKey from Perchance by opening verifyUser in a hidden tab
 * The page needs to execute JavaScript to generate the key
 */
function getPerchanceUserKey() {
    const verifyUrl = `${PERCHANCE_API}/verifyUser?thread=0&__cacheBust=${Math.random()}`;

    return new Promise((resolve) => {
        chrome.tabs.create({ url: verifyUrl, active: false }, (tab) => {
            const tabId = tab.id;
            let resolved = false;

            const listener = (tid, changeInfo) => {
                if (tid !== tabId || changeInfo.status !== "complete") return;

                // Extract userKey from the page content
                chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => {
                        const html = document.documentElement.outerHTML;
                        const match = html.match(/"userKey":"([^"]+)"/);
                        return match ? match[1] : null;
                    }
                }, (results) => {
                    if (!resolved) {
                        resolved = true;
                        chrome.tabs.onUpdated.removeListener(listener);
                        chrome.tabs.remove(tabId);
                        const key = results?.[0]?.result || null;
                        resolve(key);
                    }
                });
            };

            chrome.tabs.onUpdated.addListener(listener);

            // Timeout after 20 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.remove(tabId);
                    console.warn("Perchance verifyUser tab timeout");
                    resolve(null);
                }
            }, 20000);
        });
    });
}

/**
 * Convert a Blob to base64 string
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
