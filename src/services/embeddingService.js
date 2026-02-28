// ================================================
// Embedding Service — gemini-embedding-001
// Vector embeddings with IndexedDB cache & cosine similarity
// Supports: Direct Gemini API & OpenAI-compatible proxies
// ================================================

import { getProxyConfig, shouldUseDevProxy } from './apiClient';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Check if the API key is a direct Gemini key (starts with AIza).
 * Non-Gemini keys (sk-*, etc.) need to be routed through a proxy.
 */
function isDirectGeminiKey(apiKey) {
    return apiKey && apiKey.startsWith('AIza');
}

/**
 * Build the correct fetch URL and options for embedding requests,
 * routing through custom proxy when needed.
 */
function buildEmbeddingFetchConfig(apiKey, text, taskType) {
    const config = getProxyConfig();
    const isProxy = config.provider === 'custom' && config.customBaseUrl && !isDirectGeminiKey(apiKey);

    if (isProxy) {
        // Route through OpenAI-compatible proxy endpoint
        const baseUrl = config.customBaseUrl.replace(/\/+$/, '');
        const url = `${baseUrl}/embeddings`;
        return {
            url,
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: EMBEDDING_MODEL,
                    input: text.slice(0, 5000)
                })
            },
            isProxy: true
        };
    }

    // Direct Gemini API
    const url = `${EMBEDDING_API_BASE}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
    return {
        url,
        options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: `models/${EMBEDDING_MODEL}`,
                content: {
                    parts: [{ text: text.slice(0, 5000) }]
                },
                taskType
            })
        },
        isProxy: false
    };
}

/**
 * Build fetch config for LLM calls (reranking, etc.),
 * routing through custom proxy when needed.
 */
function buildLLMFetchConfig(apiKey, model, prompt) {
    const config = getProxyConfig();
    const isProxy = config.provider === 'custom' && config.customBaseUrl && !isDirectGeminiKey(apiKey);

    if (isProxy) {
        const baseUrl = config.customBaseUrl.replace(/\/+$/, '');
        const url = `${baseUrl}/chat/completions`;
        return {
            url,
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 128,
                    temperature: 0.0
                })
            },
            isProxy: true
        };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    return {
        url,
        options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 128,
                    temperature: 0.0
                }
            })
        },
        isProxy: false
    };
}
const DB_NAME = 'ai_story_embeddings';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';

// ── IndexedDB Helpers ─────────────────────────────

let _db = null;

async function openDB() {
    if (_db) return _db;
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
                store.createIndex('storyId', 'storyId', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
        request.onsuccess = (e) => {
            _db = e.target.result;
            resolve(_db);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getCachedEmbedding(hash) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(hash);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function setCachedEmbedding(hash, embedding, storyId = '') {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ hash, embedding, storyId, createdAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function clearStoryEmbeddings(storyId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('storyId');
        const request = index.openCursor(IDBKeyRange.only(storyId));
        request.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

// ── Hashing ───────────────────────────────────────

async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Text Chunking ─────────────────────────────────

/**
 * [LEGACY] Split text into overlapping chunks for embedding.
 * @param {string} text - Source text
 * @param {number} chunkSize - Max characters per chunk (default 500)
 * @param {number} overlap - Overlap characters between chunks (default 50)
 * @returns {string[]}
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
    if (!text || text.length <= chunkSize) return text ? [text] : [];

    const chunks = [];
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length + 2 <= chunkSize) {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            if (paragraph.length > chunkSize) {
                const sentences = paragraph.split(/(?<=[.!?。！？])\s+/);
                currentChunk = '';
                for (const sentence of sentences) {
                    if (currentChunk.length + sentence.length + 1 <= chunkSize) {
                        currentChunk += (currentChunk ? ' ' : '') + sentence;
                    } else {
                        if (currentChunk) chunks.push(currentChunk.trim());
                        if (sentence.length > chunkSize) {
                            for (let i = 0; i < sentence.length; i += chunkSize - overlap) {
                                chunks.push(sentence.slice(i, i + chunkSize));
                            }
                            currentChunk = '';
                        } else {
                            currentChunk = sentence;
                        }
                    }
                }
            } else {
                currentChunk = paragraph;
            }
        }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks.filter(c => c.length > 10);
}

// ── Semantic Chunking ─────────────────────────────

// Scene break patterns (Vietnamese + universal)
const SCENE_BREAK_RE = /^\s*(?:---+|\*\*\*+|===+|~~~+|###|\* \* \*|○ ○ ○)\s*$/;

// Dialogue line patterns (Vietnamese style)
const DIALOGUE_RE = /^\s*["""–—-]\s*|^\s*—\s*/;

/**
 * Classify a paragraph/block as dialogue, narrative, or heading.
 * @param {string} block
 * @returns {'dialogue'|'narrative'|'heading'}
 */
function classifyBlock(block) {
    const trimmed = block.trim();
    if (!trimmed) return 'narrative';
    // Check if mostly dialogue lines
    const lines = trimmed.split('\n');
    const dialogueLines = lines.filter(l => DIALOGUE_RE.test(l)).length;
    if (dialogueLines > lines.length * 0.5) return 'dialogue';
    // Check for heading-like patterns
    if (/^(?:Chương|Phần|Hồi|Mục)\s+\d/i.test(trimmed) || /^#+\s/.test(trimmed)) return 'heading';
    return 'narrative';
}

/**
 * Semantic chunking — split text by meaning boundaries.
 * Priority: scene breaks > dialogue blocks > paragraph groups > sentences.
 *
 * @param {string} text - Source text
 * @param {Object} [options]
 * @param {number} [options.maxChunkSize=800] - Max characters per chunk
 * @param {number} [options.minChunkSize=100] - Min characters (merge smaller chunks)
 * @returns {Array<{text: string, type: 'scene'|'dialogue'|'narrative'|'mixed'}>}
 */
function semanticChunkText(text, options = {}) {
    const { maxChunkSize = 800, minChunkSize = 100 } = options;

    if (!text) return [];
    if (text.length <= maxChunkSize) {
        return [{ text: text.trim(), type: classifyBlock(text) === 'dialogue' ? 'dialogue' : 'narrative' }];
    }

    // ── Step 1: Split by scene breaks ──
    const lines = text.split('\n');
    const sections = [];  // [{text, startLine}]
    let currentLines = [];

    for (const line of lines) {
        if (SCENE_BREAK_RE.test(line)) {
            if (currentLines.length > 0) {
                sections.push(currentLines.join('\n'));
                currentLines = [];
            }
            // Skip the scene break line itself
        } else {
            currentLines.push(line);
        }
    }
    if (currentLines.length > 0) sections.push(currentLines.join('\n'));

    // ── Step 2: Within each section, group by paragraph type ──
    const rawChunks = [];  // {text, type}

    for (const section of sections) {
        if (section.trim().length <= maxChunkSize) {
            const blockType = classifyBlock(section);
            rawChunks.push({
                text: section.trim(),
                type: blockType === 'dialogue' ? 'dialogue' : blockType === 'heading' ? 'narrative' : 'narrative'
            });
            continue;
        }

        // Split section into paragraphs
        const paragraphs = section.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        let currentGroup = '';
        let currentType = 'narrative';

        for (const para of paragraphs) {
            const paraType = classifyBlock(para);

            // Type change → flush current group
            if (currentGroup && paraType !== currentType && currentGroup.length >= minChunkSize) {
                rawChunks.push({ text: currentGroup.trim(), type: currentType === 'heading' ? 'narrative' : currentType });
                currentGroup = '';
            }

            // Would exceed max → flush
            if (currentGroup.length + para.length + 2 > maxChunkSize) {
                if (currentGroup.trim()) {
                    rawChunks.push({ text: currentGroup.trim(), type: currentType === 'heading' ? 'narrative' : currentType });
                }

                // If paragraph itself is too long, split by sentences
                if (para.length > maxChunkSize) {
                    const sentenceChunks = splitBySentences(para, maxChunkSize);
                    for (const sc of sentenceChunks) {
                        rawChunks.push({ text: sc.trim(), type: paraType === 'dialogue' ? 'dialogue' : 'narrative' });
                    }
                    currentGroup = '';
                    currentType = 'narrative';
                } else {
                    currentGroup = para;
                    currentType = paraType;
                }
            } else {
                currentGroup += (currentGroup ? '\n\n' : '') + para;
                if (!currentGroup || currentType === 'narrative') currentType = paraType;
                if (paraType !== currentType) currentType = 'mixed';
            }
        }
        if (currentGroup.trim()) {
            rawChunks.push({ text: currentGroup.trim(), type: currentType === 'heading' ? 'narrative' : currentType });
        }
    }

    // ── Step 3: Merge tiny chunks into neighbors ──
    const merged = [];
    for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i];
        if (chunk.text.length < minChunkSize && merged.length > 0) {
            // Merge into previous chunk
            const prev = merged[merged.length - 1];
            if (prev.text.length + chunk.text.length + 2 <= maxChunkSize) {
                prev.text += '\n\n' + chunk.text;
                if (chunk.type !== prev.type) prev.type = 'mixed';
                continue;
            }
        }
        if (chunk.text.length >= 10) {
            merged.push({ ...chunk });
        }
    }

    // Stats logging
    const scenes = merged.filter(c => c.type === 'scene').length;
    const dialogues = merged.filter(c => c.type === 'dialogue').length;
    const narratives = merged.filter(c => c.type === 'narrative').length;
    const mixed = merged.filter(c => c.type === 'mixed').length;
    console.log(`📦 Semantic chunking: ${merged.length} chunks (${dialogues} dialogue, ${narratives} narrative, ${mixed} mixed, ${scenes} scene)`);

    return merged;
}

/**
 * Split a long paragraph into sentence-boundary chunks.
 * @param {string} text
 * @param {number} maxSize
 * @returns {string[]}
 */
function splitBySentences(text, maxSize) {
    const sentences = text.split(/(?<=[.!?。！？;；:：])\s+/);
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
        if (current.length + sentence.length + 1 <= maxSize) {
            current += (current ? ' ' : '') + sentence;
        } else {
            if (current) chunks.push(current);
            // If single sentence exceeds maxSize → force split
            if (sentence.length > maxSize) {
                for (let i = 0; i < sentence.length; i += maxSize) {
                    chunks.push(sentence.slice(i, i + maxSize));
                }
                current = '';
            } else {
                current = sentence;
            }
        }
    }
    if (current.trim()) chunks.push(current);
    return chunks;
}

// ── Metadata Helpers ──────────────────────────────

/**
 * Extract known character names mentioned in text.
 * @param {string} text
 * @param {Array<{name: string}>} characters - Known characters list
 * @returns {string[]}
 */
function extractCharacterNames(text, characters) {
    if (!text || !characters?.length) return [];
    const textLower = text.toLowerCase();
    return characters
        .filter(c => c.name && textLower.includes(c.name.toLowerCase()))
        .map(c => c.name);
}

// ── Gemini Embedding API ──────────────────────────

/**
 * Generate embedding for a single text using gemini-embedding-001.
 * @param {string} apiKey
 * @param {string} text
 * @param {string} taskType - RETRIEVAL_DOCUMENT | RETRIEVAL_QUERY | SEMANTIC_SIMILARITY
 * @param {string} [storyId] - Optional story ID for cache grouping
 * @returns {Promise<number[]>} embedding vector
 */
async function generateEmbedding(apiKey, text, taskType = 'RETRIEVAL_DOCUMENT', storyId = '') {
    if (!text?.trim()) throw new Error('Text is required for embedding');
    if (!apiKey) throw new Error('API key is required for embedding');

    // Check cache
    const hash = await hashText(`${taskType}:${text}`);
    const cached = await getCachedEmbedding(hash);
    if (cached) {
        console.log('📦 Embedding cache hit');
        return cached.embedding;
    }

    // Build request — routes through proxy when needed
    const fetchConfig = buildEmbeddingFetchConfig(apiKey, text, taskType);
    let fetchUrl = fetchConfig.url;
    let fetchOptions = fetchConfig.options;

    // Dev CORS proxy for localhost
    if (shouldUseDevProxy(fetchUrl)) {
        fetchUrl = '/api/cors-proxy';
        fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetUrl: fetchConfig.url,
                headers: { Authorization: JSON.parse(fetchConfig.options.body).model ? undefined : fetchConfig.options.headers?.Authorization },
                payload: JSON.parse(fetchConfig.options.body),
                stream: false
            })
        };
        // Re-check: for proxy requests, pass auth header
        if (fetchConfig.isProxy) {
            const parsed = JSON.parse(fetchOptions.body);
            parsed.headers = { Authorization: fetchConfig.options.headers.Authorization };
            fetchOptions.body = JSON.stringify(parsed);
        }
    }

    const response = await fetch(fetchUrl, fetchOptions);

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`Embedding API Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Parse response — handle both Gemini and OpenAI formats
    let embedding;
    if (fetchConfig.isProxy) {
        // OpenAI-compatible format: { data: [{ embedding: [...] }] }
        embedding = data.data?.[0]?.embedding;
    } else {
        // Gemini format: { embedding: { values: [...] } }
        embedding = data.embedding?.values;
    }

    if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response');
    }

    // Cache the result
    await setCachedEmbedding(hash, embedding, storyId);
    console.log(`✅ Embedding generated (${embedding.length}D) via ${fetchConfig.isProxy ? 'proxy' : 'Gemini direct'}`);

    return embedding;
}

// Yield to main thread so UI stays responsive during heavy processing
function yieldToMain() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Generate embeddings for multiple texts with batch parallel processing.
 * Processes BATCH_SIZE items in parallel to dramatically reduce total time.
 * @param {string} apiKey
 * @param {Array<{text: string, id: string}> } items - Items to embed
 * @param {string} taskType
 * @param {string} [storyId]
 * @param {Function} [onProgress] - Optional (current, total) => void callback
 * @returns {Promise<Array<{id: string, text: string, embedding: number[]}>>}
 */
async function generateEmbeddings(apiKey, items, taskType = 'RETRIEVAL_DOCUMENT', storyId = '', onProgress = null) {
    const results = [];
    const BATCH_SIZE = 5;       // parallel calls per batch
    const BATCH_DELAY = 150;    // ms between batches to avoid rate limit

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        // Run batch in parallel
        const batchResults = await Promise.allSettled(
            batch.map(item =>
                generateEmbedding(apiKey, item.text, taskType, storyId)
                    .then(embedding => ({ id: item.id, text: item.text, embedding }))
                    .catch(error => {
                        console.warn(`⚠️ Embedding failed for item ${item.id}:`, error.message);
                        return { id: item.id, text: item.text, embedding: null };
                    })
            )
        );

        // Collect results
        for (const result of batchResults) {
            results.push(result.status === 'fulfilled' ? result.value : { id: 'unknown', text: '', embedding: null });
        }

        // Report progress
        if (onProgress) {
            onProgress(Math.min(i + BATCH_SIZE, items.length), items.length);
        }

        // Rate limit between batches + yield to main thread
        if (i + BATCH_SIZE < items.length) {
            await new Promise(r => setTimeout(r, BATCH_DELAY));
            await yieldToMain();
        }
    }

    return results;
}

// ── Vector Math ───────────────────────────────────

/**
 * Calculate cosine similarity between two vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} similarity score between -1 and 1
 */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

// ── Similarity Search ─────────────────────────────

/**
 * Search for most similar chunks to a query.
 * @param {string} apiKey
 * @param {string} query - Search query
 * @param {Array<{id: string, text: string, embedding?: number[]}> } documents - Pre-embedded documents
 * @param {number} topK - Number of top results to return (default 5)
 * @param {string} [storyId]
 * @returns {Promise<Array<{id: string, text: string, score: number}>>}
 */
async function searchSimilar(apiKey, query, documents, topK = 5, storyId = '') {
    if (!query || !documents?.length) return [];

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(apiKey, query, 'RETRIEVAL_QUERY', storyId);

    // Calculate similarity scores
    const scored = documents
        .filter(doc => doc.embedding)
        .map(doc => ({
            id: doc.id,
            text: doc.text,
            score: cosineSimilarity(queryEmbedding, doc.embedding)
        }))
        .sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
}

// ── BM25 Sparse Retrieval ─────────────────────────

/**
 * Tokenize Vietnamese text — split on whitespace, lowercase, filter short tokens.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
    if (!text) return [];
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')  // keep Unicode letters + digits
        .split(/\s+/)
        .filter(t => t.length > 1);
}

/**
 * BM25 Index for sparse keyword retrieval.
 * Implements Okapi BM25 with configurable k1 and b parameters.
 */
class BM25Index {
    /**
     * @param {Array<{id: string, text: string}>} documents
     * @param {Object} [options]
     * @param {number} [options.k1=1.2] - Term frequency saturation
     * @param {number} [options.b=0.75] - Length normalization
     */
    constructor(documents = [], options = {}) {
        this.k1 = options.k1 ?? 1.2;
        this.b = options.b ?? 0.75;
        this.documents = [];
        this.invertedIndex = {};   // term -> [{docIdx, tf}]
        this.docLengths = [];      // token count per doc
        this.avgDocLength = 0;
        this.N = 0;                // total documents
        this.df = {};              // document frequency per term

        if (documents.length > 0) this.buildIndex(documents);
    }

    /**
     * Build the inverted index from documents.
     * @param {Array<{id: string, text: string}>} documents
     */
    buildIndex(documents) {
        this.documents = documents;
        this.N = documents.length;
        this.invertedIndex = {};
        this.docLengths = [];
        this.df = {};

        let totalLength = 0;

        for (let i = 0; i < this.N; i++) {
            const tokens = tokenize(this.documents[i].text);
            this.docLengths[i] = tokens.length;
            totalLength += tokens.length;

            // Count term frequencies in this document
            const termFreq = {};
            for (const token of tokens) {
                termFreq[token] = (termFreq[token] || 0) + 1;
            }

            // Update inverted index and document frequencies
            for (const [term, tf] of Object.entries(termFreq)) {
                if (!this.invertedIndex[term]) this.invertedIndex[term] = [];
                this.invertedIndex[term].push({ docIdx: i, tf });
                this.df[term] = (this.df[term] || 0) + 1;
            }
        }

        this.avgDocLength = this.N > 0 ? totalLength / this.N : 0;
        console.log(`🔤 BM25 index built: ${this.N} documents, ${Object.keys(this.invertedIndex).length} unique terms`);
    }

    /**
     * Calculate BM25 IDF component for a term.
     * @param {string} term
     * @returns {number}
     */
    idf(term) {
        const df = this.df[term] || 0;
        // IDF with smoothing to avoid negative values
        return Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
    }

    /**
     * Search the index with a query.
     * @param {string} query
     * @param {number} [topK=10]
     * @returns {Array<{id: string, text: string, score: number}>}
     */
    search(query, topK = 10) {
        if (!query || this.N === 0) return [];

        const queryTokens = tokenize(query);
        if (queryTokens.length === 0) return [];

        // Accumulate scores per document
        const scores = new Float64Array(this.N);

        for (const term of queryTokens) {
            const idfVal = this.idf(term);
            const postings = this.invertedIndex[term];
            if (!postings) continue;

            for (const { docIdx, tf } of postings) {
                const dl = this.docLengths[docIdx];
                // BM25 TF scoring
                const tfNorm = (tf * (this.k1 + 1)) /
                    (tf + this.k1 * (1 - this.b + this.b * dl / this.avgDocLength));
                scores[docIdx] += idfVal * tfNorm;
            }
        }

        // Collect and sort results
        const results = [];
        for (let i = 0; i < this.N; i++) {
            if (scores[i] > 0) {
                results.push({
                    id: this.documents[i].id,
                    text: this.documents[i].text,
                    score: scores[i]
                });
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }
}

// ── Hybrid Search (Dense + Sparse + RRF) ──────────

/**
 * Reciprocal Rank Fusion — merge multiple ranked lists.
 * @param {Array<Array<{id: string, text: string, score: number}>>} rankedLists
 * @param {number} [k=60] - RRF constant (higher = more weight to lower-ranked items)
 * @returns {Array<{id: string, text: string, score: number, denseRank: number|null, sparseRank: number|null}>}
 */
function reciprocalRankFusion(rankedLists, k = 60) {
    const fusedScores = {};  // id -> {score, text, denseRank, sparseRank}

    rankedLists.forEach((list, listIdx) => {
        list.forEach((item, rank) => {
            if (!fusedScores[item.id]) {
                fusedScores[item.id] = {
                    id: item.id,
                    text: item.text,
                    score: 0,
                    denseRank: null,
                    sparseRank: null
                };
            }
            fusedScores[item.id].score += 1 / (k + rank + 1);  // RRF formula
            if (listIdx === 0) fusedScores[item.id].denseRank = rank + 1;
            if (listIdx === 1) fusedScores[item.id].sparseRank = rank + 1;
        });
    });

    return Object.values(fusedScores).sort((a, b) => b.score - a.score);
}

// In-memory BM25 index cache
let _bm25Cache = { storyId: null, index: null };

// ── Multi-Signal Reranking ─────────────────────────

/**
 * Normalize an array of scores to [0, 1] range.
 * @param {number[]} scores
 * @returns {number[]}
 */
function normalizeScores(scores) {
    if (!scores.length) return [];
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;
    if (range === 0) return scores.map(() => max > 0 ? 1 : 0);
    return scores.map(s => (s - min) / range);
}

/**
 * Calculate freshness score based on document recency.
 * Supports both absolute recency (latest = best) and proximity
 * to the current working chapter (closer = better).
 *
 * @param {Object} doc - Document with date/chapterOrder metadata
 * @param {number} maxChapterOrder - Highest chapter order in story
 * @param {number} [currentChapterOrder=0] - Current chapter order (for proximity)
 * @returns {number} 0-1 freshness score
 */
function calcFreshnessScore(doc, maxChapterOrder, currentChapterOrder = 0) {
    // For chapter content: proximity to current chapter
    if (doc.chapterOrder != null && maxChapterOrder > 0) {
        if (currentChapterOrder > 0) {
            // Proximity-based: chapters closer to current get higher scores
            const distance = Math.abs(doc.chapterOrder - currentChapterOrder);
            const maxDistance = maxChapterOrder;
            return 1 - (distance / maxDistance) * 0.7;  // min 0.3 for far chapters
        }
        // Fallback: absolute recency (higher order = more recent)
        return doc.chapterOrder / maxChapterOrder;
    }
    // For dated items: decay based on age
    if (doc.date) {
        const docTime = new Date(doc.date).getTime();
        if (!isNaN(docTime)) {
            const ageMs = Date.now() - docTime;
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            // Exponential decay: half-life of 30 days
            return Math.exp(-0.693 * ageDays / 30);
        }
    }
    // Character profiles, settings, etc. — neutral freshness
    return 0.5;
}

/**
 * Multi-signal reranking — compute composite score from 5 signals.
 *
 * Signals and weights:
 *   denseScore   (0.35) — normalized cosine similarity
 *   sparseScore  (0.25) — normalized BM25 score
 *   metadataScore(0.15) — priority/5 + character name match bonus
 *   freshnessScore(0.15) — recency decay / chapter order proximity
 *   coverageScore(0.10) — bonus for appearing in both dense AND sparse
 *
 * @param {Array} candidates - RRF fused results with denseRank/sparseRank
 * @param {Object} docMap - id → document metadata lookup
 * @param {Object} [options]
 * @param {string[]} [options.queryCharacterNames] - Character names mentioned in query
 * @param {number} [options.maxChapterOrder=1] - Highest chapter order
 * @param {number} [options.currentChapterOrder=0] - Current chapter for proximity
 * @param {Array} [options.denseResults] - Raw dense results with original scores
 * @param {Array} [options.sparseResults] - Raw sparse results with original scores
 * @returns {Array} Reranked candidates with composite scores
 */
function multiSignalRerank(candidates, docMap, options = {}) {
    const {
        queryCharacterNames = [],
        maxChapterOrder = 1,
        currentChapterOrder = 0,
        denseResults = [],
        sparseResults = []
    } = options;

    if (!candidates.length) return [];

    // Build raw score lookups
    const denseScoreMap = {};
    denseResults.forEach(r => { denseScoreMap[r.id] = r.score; });
    const sparseScoreMap = {};
    sparseResults.forEach(r => { sparseScoreMap[r.id] = r.score; });

    // Normalize dense and sparse scores across candidates
    const rawDense = candidates.map(c => denseScoreMap[c.id] || 0);
    const rawSparse = candidates.map(c => sparseScoreMap[c.id] || 0);
    const normDense = normalizeScores(rawDense);
    const normSparse = normalizeScores(rawSparse);

    // Weights
    const W_DENSE = 0.35;
    const W_SPARSE = 0.25;
    const W_META = 0.15;
    const W_FRESH = 0.15;
    const W_COVERAGE = 0.10;

    const reranked = candidates.map((candidate, i) => {
        const meta = docMap[candidate.id] || {};

        // Signal 1: Dense similarity (normalized)
        const denseScore = normDense[i];

        // Signal 2: Sparse BM25 (normalized)
        const sparseScore = normSparse[i];

        // Signal 3: Metadata score
        let metadataScore = (meta.priority || 3) / 5;  // base: priority / 5
        // Character name match bonus
        if (queryCharacterNames.length > 0 && meta.characterNames?.length > 0) {
            const matchCount = queryCharacterNames.filter(qn =>
                meta.characterNames.some(cn => cn.toLowerCase().includes(qn.toLowerCase()))
            ).length;
            metadataScore += matchCount > 0 ? 0.3 : 0;  // +0.3 bonus for character match
        }
        metadataScore = Math.min(metadataScore, 1.0);  // cap at 1

        // Signal 4: Freshness
        const freshnessScore = calcFreshnessScore(meta, maxChapterOrder, currentChapterOrder);

        // Signal 5: Coverage (appears in both dense AND sparse)
        const coverageScore = (candidate.denseRank !== null && candidate.sparseRank !== null) ? 1.0 : 0.0;

        // Composite
        const compositeScore =
            W_DENSE * denseScore +
            W_SPARSE * sparseScore +
            W_META * metadataScore +
            W_FRESH * freshnessScore +
            W_COVERAGE * coverageScore;

        return {
            ...candidate,
            score: compositeScore,
            source: meta.source,
            docType: meta.docType,
            priority: meta.priority,
            signals: { denseScore, sparseScore, metadataScore, freshnessScore, coverageScore }
        };
    });

    reranked.sort((a, b) => b.score - a.score);

    // Log top result signals
    if (reranked.length > 0) {
        const top = reranked[0].signals;
        console.log(`🏆 Multi-signal rerank: ${candidates.length} candidates → dense=${top.denseScore.toFixed(2)} sparse=${top.sparseScore.toFixed(2)} meta=${top.metadataScore.toFixed(2)} fresh=${top.freshnessScore.toFixed(2)} coverage=${top.coverageScore.toFixed(0)}`);
    }

    return reranked;
}

// ── LLM Cross-Encoder Reranker ────────────────────

/**
 * Optional LLM-based reranker using Gemini to reorder candidates.
 * Sends query + candidate texts to Gemini and asks for relevance ranking.
 *
 * @param {string} apiKey
 * @param {string} query - Search query
 * @param {Array<{id: string, text: string, score: number}>} candidates
 * @param {Object} [options]
 * @param {number} [options.maxCandidates=6] - Max candidates to send to LLM
 * @param {string} [options.model='gemini-2.0-flash'] - Model to use
 * @returns {Promise<Array>} Reranked candidates
 */
async function llmRerank(apiKey, query, candidates, options = {}) {
    const { maxCandidates = 6, model = 'gemini-2.0-flash' } = options;

    if (!apiKey || !candidates.length) return candidates;

    const toRerank = candidates.slice(0, maxCandidates);
    const rest = candidates.slice(maxCandidates);

    // Build the prompt
    const docsBlock = toRerank.map((c, i) =>
        `[${i}] ${c.text.slice(0, 300)}`  // truncate to save tokens
    ).join('\n');

    const prompt = `Given the query and documents below, rank the documents by relevance to the query.
Return ONLY a JSON array of document indices in order of relevance (most relevant first).
Example response: [2, 0, 4, 1, 3]

Query: ${query.slice(0, 200)}

Documents:
${docsBlock}

Ranked indices (JSON array):`;

    try {
        // Build request — routes through proxy when needed
        const fetchConfig = buildLLMFetchConfig(apiKey, model, prompt);
        let fetchUrl = fetchConfig.url;
        let fetchOptions = fetchConfig.options;

        // Dev CORS proxy for localhost
        if (shouldUseDevProxy(fetchUrl)) {
            fetchUrl = '/api/cors-proxy';
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUrl: fetchConfig.url,
                    headers: fetchConfig.isProxy ? { Authorization: fetchConfig.options.headers.Authorization } : {},
                    payload: JSON.parse(fetchConfig.options.body),
                    stream: false
                })
            };
        }

        const response = await fetch(fetchUrl, fetchOptions);

        if (!response.ok) {
            console.warn('⚠️ LLM rerank API error:', response.status);
            return candidates;
        }

        const data = await response.json();
        // Handle both Gemini and OpenAI response formats
        const text = fetchConfig.isProxy
            ? (data.choices?.[0]?.message?.content || '')
            : (data.candidates?.[0]?.content?.parts?.[0]?.text || '');

        // Parse JSON array from response
        const match = text.match(/\[([\d,\s]+)\]/);
        if (!match) {
            console.warn('⚠️ LLM rerank: could not parse response:', text.slice(0, 100));
            return candidates;
        }

        const indices = JSON.parse(`[${match[1]}]`);
        const reranked = [];
        const used = new Set();

        // Place in LLM-determined order
        for (const idx of indices) {
            if (idx >= 0 && idx < toRerank.length && !used.has(idx)) {
                reranked.push(toRerank[idx]);
                used.add(idx);
            }
        }
        // Add any that LLM missed
        for (let i = 0; i < toRerank.length; i++) {
            if (!used.has(i)) reranked.push(toRerank[i]);
        }

        console.log(`🧠 LLM rerank: ${toRerank.length} candidates reordered → [${indices.join(',')}]`);

        return [...reranked, ...rest];
    } catch (error) {
        console.warn('⚠️ LLM rerank failed:', error.message);
        return candidates;  // graceful fallback
    }
}

// ── LRU Query Cache ─────────────────────────

/**
 * Simple LRU cache for query results.
 * Avoids re-running full retrieval for repeated/similar queries.
 */
class QueryCache {
    constructor(maxSize = 50, ttlMs = 5 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
        this.cache = new Map();  // Map preserves insertion order
        this.hits = 0;
        this.misses = 0;
    }

    _makeKey(query, storyId, topK) {
        // Simple key from query + storyId + topK
        return `${storyId}::${topK}::${query.slice(0, 150).toLowerCase().trim()}`;
    }

    get(query, storyId, topK) {
        const key = this._makeKey(query, storyId, topK);
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }
        // Check TTL
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        this.hits++;
        return entry.results;
    }

    set(query, storyId, topK, results) {
        const key = this._makeKey(query, storyId, topK);
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldest = this.cache.keys().next().value;
            this.cache.delete(oldest);
        }
        this.cache.set(key, { results, timestamp: Date.now() });
    }

    clear() {
        this.cache.clear();
    }

    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : '0%'
        };
    }
}

const _queryCache = new QueryCache();

// ── Two-Stage Hybrid Search ───────────────────────

/**
 * Two-stage hybrid search:
 *   Stage 1: Dense + Sparse retrieval → RRF merge → broad candidates
 *   Stage 2: Multi-signal rerank → composite scoring → final selection
 *   Stage 2.5 (optional): LLM cross-encoder rerank for top candidates
 *
 * @param {string} apiKey
 * @param {string} query - Search query
 * @param {Array<{id: string, text: string, embedding?: number[]}>} documents
 * @param {Object} [options]
 * @param {number} [options.topK=8] - Final results count
 * @param {number} [options.candidatePool=20] - Stage 1 candidate pool size
 * @param {number} [options.denseTopK=15] - Dense candidates
 * @param {number} [options.sparseTopK=15] - Sparse candidates
 * @param {string} [options.storyId=''] - Story ID for caching
 * @param {string[]} [options.filterDocTypes] - Optional doc type filter
 * @param {boolean} [options.enableLLMRerank=false] - Enable LLM cross-encoder
 * @param {string[]} [options.queryCharacterNames=[]] - Character names in query
 * @returns {Promise<Array>}
 */
async function hybridSearch(apiKey, query, documents, options = {}) {
    const {
        topK = 8,
        candidatePool = 20,
        denseTopK = 15,
        sparseTopK = 15,
        storyId = '',
        filterDocTypes = null,
        enableLLMRerank = false,
        queryCharacterNames = [],
        currentChapterOrder = 0
    } = options;

    if (!query || !documents?.length) return [];

    // ── Cache check ──
    const cached = _queryCache.get(query, storyId, topK);
    if (cached) {
        console.log(`⚡ Cache hit: returning ${cached.length} cached results`);
        return cached;
    }

    // Optional: filter by document types before searching
    const searchDocs = filterDocTypes
        ? documents.filter(d => !d.docType || filterDocTypes.includes(d.docType))
        : documents;

    // ── Stage 1: Broad retrieval ──

    // 1a) Dense search (cosine similarity on embeddings)
    const denseResults = await searchSimilar(apiKey, query, searchDocs, denseTopK, storyId);

    // 1b) Sparse search (BM25)
    if (_bm25Cache.storyId !== storyId || !_bm25Cache.index) {
        _bm25Cache = {
            storyId,
            index: new BM25Index(searchDocs)
        };
    }
    const sparseResults = _bm25Cache.index.search(query, sparseTopK);

    // 1c) Reciprocal Rank Fusion → broad candidate pool
    const fused = reciprocalRankFusion([denseResults, sparseResults]);
    const candidatesCut = fused.slice(0, candidatePool);

    // ── Stage 2: Multi-signal reranking ──

    // Build metadata lookup
    const docMap = {};
    for (const doc of searchDocs) { docMap[doc.id] = doc; }

    // Find max chapter order for freshness calculation
    const maxChapterOrder = Math.max(1, ...searchDocs
        .filter(d => d.chapterOrder != null)
        .map(d => d.chapterOrder)
    );

    const reranked = multiSignalRerank(candidatesCut, docMap, {
        queryCharacterNames,
        maxChapterOrder,
        currentChapterOrder,
        denseResults,
        sparseResults
    });

    // ── Stage 2.5 (Optional): LLM cross-encoder rerank ──
    let finalResults = reranked;
    if (enableLLMRerank && apiKey) {
        finalResults = await llmRerank(apiKey, query, reranked.slice(0, topK));
    }

    // ── Stage 3: Deduplicate results ──
    const dedupResults = deduplicateResults(finalResults);

    console.log(`🔀 Two-stage search: ${denseResults.length} dense + ${sparseResults.length} sparse → ${candidatesCut.length} candidates → ${Math.min(dedupResults.length, topK)} final`);

    const finalSlice = dedupResults.slice(0, topK);

    // ── Cache write ──
    _queryCache.set(query, storyId, topK, finalSlice);

    return finalSlice;
}

/**
 * Invalidate BM25 cache (call when documents change).
 */
function invalidateBM25Cache(storyId) {
    if (_bm25Cache.storyId === storyId) {
        _bm25Cache = { storyId: null, index: null };
    }
    // Also clear query cache since documents changed
    _queryCache.clear();
}
// ── Deduplication & Source Filtering ──────────────

/**
 * Jaccard similarity between two texts (token-set overlap).
 * @param {string} textA
 * @param {string} textB
 * @returns {number} 0-1 similarity
 */
function jaccardSimilarity(textA, textB) {
    const tokensA = new Set(tokenize(textA));
    const tokensB = new Set(tokenize(textB));
    if (tokensA.size === 0 && tokensB.size === 0) return 1;
    if (tokensA.size === 0 || tokensB.size === 0) return 0;
    let intersection = 0;
    for (const t of tokensA) {
        if (tokensB.has(t)) intersection++;
    }
    return intersection / (tokensA.size + tokensB.size - intersection);
}

/**
 * Deduplicate indexed items by detecting near-duplicate text.
 * Keeps the highest-priority version and merges metadata.
 *
 * @param {Array} items - Items with {id, text, priority, characterNames, ...}
 * @param {number} [threshold=0.7] - Jaccard similarity threshold for duplicate detection
 * @returns {Array} Deduplicated items
 */
function deduplicateItems(items, threshold = 0.7) {
    if (items.length <= 1) return items;

    // Safety: skip O(n²) dedup when item count is too high to prevent browser freeze
    if (items.length > 200) {
        console.log(`⚠️ Deduplication skipped: ${items.length} items exceeds safe threshold (200). Relying on MAX_EMBEDDING_ITEMS cap.`);
        return items;
    }

    const kept = [];       // items to keep
    const removed = [];    // indices of removed duplicates
    const removedSet = new Set();

    // Sort by priority DESC so we compare from highest priority first
    const sorted = items.map((item, idx) => ({ ...item, _origIdx: idx }))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (let i = 0; i < sorted.length; i++) {
        if (removedSet.has(sorted[i]._origIdx)) continue;

        const current = sorted[i];
        const mergedCharNames = new Set(current.characterNames || []);

        // Compare with remaining items
        for (let j = i + 1; j < sorted.length; j++) {
            if (removedSet.has(sorted[j]._origIdx)) continue;

            const sim = jaccardSimilarity(current.text, sorted[j].text);
            if (sim >= threshold) {
                // Merge character names from duplicate
                (sorted[j].characterNames || []).forEach(n => mergedCharNames.add(n));
                removedSet.add(sorted[j]._origIdx);
                removed.push(sorted[j].id);
            }
        }

        // Update character names with merged set
        current.characterNames = [...mergedCharNames];
        delete current._origIdx;
        kept.push(current);
    }

    if (removed.length > 0) {
        console.log(`🧹 Deduplication: ${items.length} → ${kept.length} items (${removed.length} near-duplicates removed)`);
    }

    return kept;
}

/**
 * Filter items by source whitelist or blocklist.
 *
 * @param {Array} items - Items with {source, ...}
 * @param {Object} [rules]
 * @param {string[]} [rules.whitelist] - If set, ONLY these sources are allowed
 * @param {string[]} [rules.blocklist] - These sources are excluded
 * @param {number} [rules.minTextLength=20] - Minimum text length (filter noise)
 * @returns {Array} Filtered items
 */
function filterBySource(items, rules = {}) {
    const { whitelist = null, blocklist = [], minTextLength = 20 } = rules;

    const before = items.length;
    let filtered = items;

    // Whitelist: only keep matching sources
    if (whitelist && whitelist.length > 0) {
        filtered = filtered.filter(item => whitelist.includes(item.source));
    }

    // Blocklist: remove matching sources
    if (blocklist.length > 0) {
        filtered = filtered.filter(item => !blocklist.includes(item.source));
    }

    // Minimum text length filter
    filtered = filtered.filter(item => (item.text || '').length >= minTextLength);

    if (filtered.length < before) {
        console.log(`🚫 Source filter: ${before} → ${filtered.length} items (${before - filtered.length} filtered out)`);
    }

    return filtered;
}

/**
 * Deduplicate search results — remove near-identical results that passed retrieval.
 * Uses a lighter similarity check (text prefix + token overlap).
 *
 * @param {Array} results - Search results with {id, text, score, ...}
 * @param {number} [threshold=0.65] - Similarity threshold
 * @returns {Array} Deduplicated results (order preserved)
 */
function deduplicateResults(results, threshold = 0.65) {
    if (results.length <= 1) return results;

    const kept = [];
    for (const result of results) {
        const isDuplicate = kept.some(existing =>
            jaccardSimilarity(existing.text, result.text) >= threshold
        );
        if (!isDuplicate) {
            kept.push(result);
        }
    }

    if (kept.length < results.length) {
        console.log(`🧹 Result dedup: ${results.length} → ${kept.length} results`);
    }
    return kept;
}

// ── Story Indexing (Rich Metadata + Semantic Chunking) ─

// Max items to send for embedding — safety cap to prevent overload
const MAX_EMBEDDING_ITEMS = 200;

// Default: number of most-recent chapters to full-index (content chunks)
// Older chapters only get their summary indexed
const DEFAULT_MAX_CHAPTERS_FULL_INDEX = 8;

/**
 * Collect story items for indexing (without embedding).
 * Uses smart chapter filtering: only full-index nearby chapters.
 * @param {Object} story - Story object
 * @param {Object} [options]
 * @param {number} [options.maxChaptersToFullIndex] - How many recent chapters to chunk fully
 * @returns {{items: Array, stats: Object}}
 */
function collectStoryItems(story, options = {}) {
    const { maxChaptersToFullIndex = DEFAULT_MAX_CHAPTERS_FULL_INDEX } = options;
    const items = [];
    const db = story.database || {};
    const knownChars = db.characters || [];
    const storyDate = story.updatedAt || story.createdAt || null;

    // ── Index chapters (smart filtering: full-index only recent N) ──
    if (db.chapters?.length) {
        // Sort by order descending to find the most recent chapters
        const sortedChapters = [...db.chapters].sort((a, b) => (b.order || 0) - (a.order || 0));
        const recentChapters = new Set(sortedChapters.slice(0, maxChaptersToFullIndex).map(c => c.id));

        for (const chapter of db.chapters) {
            const isRecent = recentChapters.has(chapter.id);

            // Full content chunking only for recent chapters
            if (isRecent && chapter.content) {
                const chunks = semanticChunkText(chapter.content);
                chunks.forEach((chunk, idx) => {
                    const charsInChunk = extractCharacterNames(chunk.text, knownChars);
                    const charLabel = charsInChunk.length > 0 ? ` | NV: ${charsInChunk.join(', ')}` : '';
                    items.push({
                        id: `chapter-${chapter.id}-chunk-${idx}`,
                        text: `[Chương ${chapter.order || '?'}: ${chapter.title || ''}${charLabel}] ${chunk.text}`,
                        source: 'chapter',
                        docType: chunk.type === 'dialogue' ? 'dialogue' : chunk.type === 'scene' ? 'scene' : 'narrative',
                        priority: 3,
                        date: chapter.updatedAt || chapter.createdAt || storyDate,
                        chapterId: chapter.id,
                        chapterOrder: chapter.order || 0,
                        chapterTitle: chapter.title || '',
                        characterNames: charsInChunk,
                        tags: ['chapter', `ch${chapter.order || 0}`, chunk.type]
                    });
                });
            }

            // Summaries for ALL chapters (lightweight)
            if (chapter.summary) {
                items.push({
                    id: `chapter-${chapter.id}-summary`,
                    text: `[Tóm tắt chương ${chapter.order}: ${chapter.title}] ${chapter.summary}`,
                    source: 'chapter-summary',
                    docType: 'summary',
                    priority: 4,
                    date: chapter.updatedAt || chapter.createdAt || storyDate,
                    chapterId: chapter.id,
                    chapterOrder: chapter.order || 0,
                    chapterTitle: chapter.title || '',
                    characterNames: extractCharacterNames(chapter.summary, knownChars),
                    tags: ['summary', `ch${chapter.order || 0}`]
                });
            }
        }

        console.log(`📖 Chapter indexing: ${recentChapters.size} full-indexed, ${db.chapters.length - recentChapters.size} summary-only`);
    }

    // ── Index characters (highest priority) ──
    if (db.characters?.length) {
        for (const char of knownChars) {
            const parts = [`Nhân vật: ${char.name}`];
            if (char.role) parts.push(`Vai trò: ${char.role}`);
            if (char.age) parts.push(`Tuổi: ${char.age}`);
            if (char.appearance) parts.push(`Ngoại hình: ${char.appearance}`);
            if (char.personality) parts.push(`Tính cách: ${char.personality}`);
            if (char.description) parts.push(`Mô tả: ${char.description}`);
            if (char.gender) parts.push(`Giới tính: ${char.gender}`);
            if (char.background) parts.push(`Tiểu sử: ${char.background}`);
            if (char.motivation) parts.push(`Động lực: ${char.motivation}`);
            if (char.abilities) parts.push(`Năng lực: ${char.abilities}`);
            if (char.relationships) parts.push(`Mối quan hệ: ${char.relationships}`);
            if (char.weaknesses) parts.push(`Điểm yếu: ${char.weaknesses}`);
            items.push({
                id: `char-${char.id || char.name}`,
                text: parts.join('. '),
                source: 'character',
                docType: 'character_profile',
                priority: 5,
                date: char.createdAt || storyDate,
                chapterId: null,
                chapterOrder: null,
                characterNames: [char.name],
                tags: ['character', char.role || 'unknown_role']
            });

            // ── Index character DYNAMIC state (MVU) ──
            const dynParts = [];
            if (char.currentState) dynParts.push(`Trạng thái: ${char.currentState}`);
            if (char.currentLocation) dynParts.push(`Vị trí hiện tại: ${char.currentLocation}`);
            if (char.currentGoal) dynParts.push(`Mục tiêu tức thì: ${char.currentGoal}`);
            if (char.currentBodyState) dynParts.push(`Cơ thể: ${char.currentBodyState}`);
            if (char.specialStatus) dynParts.push(`Đặc biệt: ${char.specialStatus}`);
            if (dynParts.length > 0) {
                items.push({
                    id: `char-dyn-${char.id || char.name}`,
                    text: `[Trạng thái HIỆN TẠI - ${char.name}] ${dynParts.join('. ')}`,
                    source: 'character',
                    docType: 'character_dynamic_state',
                    priority: 5,
                    date: storyDate,
                    chapterId: null,
                    chapterOrder: null,
                    characterNames: [char.name],
                    tags: ['character', 'dynamic_state', 'current']
                });
            }

            // ── Index character action history (event chains) ──
            if (char.actionHistory) {
                const historyLines = char.actionHistory.split('\n').filter(l => l.trim());
                // Take last 5 entries for indexing
                const recent = historyLines.slice(-5).join('\n');
                items.push({
                    id: `char-history-${char.id || char.name}`,
                    text: `[Lịch sử hành động - ${char.name}] ${recent}`,
                    source: 'character',
                    docType: 'character_event_log',
                    priority: 4,
                    date: storyDate,
                    chapterId: null,
                    chapterOrder: null,
                    characterNames: [char.name],
                    tags: ['character', 'event_log', 'history']
                });
            }
        }
    }

    // ── Index foreshadowing seeds (highest priority — AI must remember planted clues) ──
    if (db.foreshadowings?.length) {
        for (const fs of db.foreshadowings) {
            if (!fs.hint && !fs.name) continue;
            const parts = [`Phục bút: "${fs.hint || fs.name}"`];
            if (fs.plantedChapter) parts.push(`Gieo ở chương ${fs.plantedChapter}`);
            if (fs.targetEvent) parts.push(`Mục tiêu: ${fs.targetEvent}`);
            if (fs.status) parts.push(`Trạng thái: ${fs.status}`);
            items.push({
                id: `foreshadow-${fs.id || fs.hint || fs.name}`,
                text: parts.join('. '),
                source: 'foreshadowing',
                docType: 'foreshadowing_seed',
                priority: 5,
                date: storyDate,
                chapterId: null,
                chapterOrder: fs.plantedChapter || null,
                characterNames: extractCharacterNames(parts.join(' '), knownChars),
                tags: ['foreshadowing', fs.status || 'active']
            });
        }
    }

    // ── Index settings/locations ──
    if (db.settings?.length) {
        for (const setting of db.settings) {
            const parts = [`Bối cảnh: ${setting.name}`];
            if (setting.type) parts.push(`Loại: ${setting.type}`);
            if (setting.description) parts.push(setting.description);
            if (setting.details) parts.push(setting.details);
            items.push({
                id: `setting-${setting.id || setting.name}`,
                text: parts.join('. '),
                source: 'setting',
                docType: 'world_building',
                priority: 3,
                date: setting.createdAt || storyDate,
                chapterId: null,
                chapterOrder: null,
                characterNames: [],
                tags: ['setting', setting.type || 'location']
            });
        }
    }

    // ── Index plot points ──
    if (db.plots?.length) {
        for (const plot of db.plots) {
            const parts = [`Cốt truyện: ${plot.title}`];
            if (plot.type) parts.push(`Loại: ${plot.type}`);
            if (plot.status) parts.push(`Trạng thái: ${plot.status}`);
            if (plot.description) parts.push(plot.description);
            items.push({
                id: `plot-${plot.id || plot.title}`,
                text: parts.join('. '),
                source: 'plot',
                docType: 'plot_point',
                priority: 4,
                date: plot.createdAt || storyDate,
                chapterId: null,
                chapterOrder: null,
                characterNames: extractCharacterNames(parts.join(' '), knownChars),
                tags: ['plot', plot.type || 'general', plot.status || 'active']
            });
        }
    }

    // ── Index timeline events ──
    if (db.timeline?.length) {
        for (const event of db.timeline) {
            const parts = [`Sự kiện: ${event.title}`];
            if (event.date) parts.push(`Thời gian: ${event.date}`);
            if (event.description) parts.push(event.description);
            if (event.characters) parts.push(`Nhân vật: ${event.characters}`);
            items.push({
                id: `timeline-${event.id || event.title}`,
                text: parts.join('. '),
                source: 'timeline',
                docType: 'event',
                priority: 4,
                date: event.date || storyDate,
                chapterId: null,
                chapterOrder: null,
                characterNames: event.characters ? event.characters.split(/[,;、]/).map(s => s.trim()) : [],
                tags: ['timeline', 'event']
            });
        }
    }

    // ── Index reference documents (semantic chunking, with safety caps) ──
    if (db.references?.length) {
        // Safety: cap total reference text to prevent OOM/freeze on very large imports
        const MAX_REF_CONTENT_CHARS = 10000;  // Per-reference content cap
        const MAX_REF_SUMMARY_CHARS = 5000;   // Per-summarized-reference cap
        const MAX_TOTAL_REF_CHARS = 50000;    // Total budget for all references
        const MAX_REF_CHUNKS = 30;            // Max chunks from all references combined

        let totalRefChars = 0;
        let totalRefChunks = 0;

        for (const ref of db.references) {
            if (!ref.content || totalRefChunks >= MAX_REF_CHUNKS) continue;

            const isSummarized = ref.summarized || false;
            const charCap = isSummarized ? MAX_REF_SUMMARY_CHARS : MAX_REF_CONTENT_CHARS;
            const remainingBudget = MAX_TOTAL_REF_CHARS - totalRefChars;
            if (remainingBudget <= 0) break;

            // Truncate content to stay within budget
            const cappedContent = ref.content.slice(0, Math.min(charCap, remainingBudget));
            totalRefChars += cappedContent.length;

            const chunks = semanticChunkText(cappedContent);
            const maxChunksForThis = MAX_REF_CHUNKS - totalRefChunks;
            const limitedChunks = chunks.slice(0, maxChunksForThis);
            totalRefChunks += limitedChunks.length;

            limitedChunks.forEach((chunk, idx) => {
                items.push({
                    id: `ref-${ref.id || ref.title}-chunk-${idx}`,
                    text: `[Tham khảo: ${ref.title || 'Tài liệu'}] ${chunk.text}`,
                    source: 'reference',
                    docType: 'reference_doc',
                    priority: isSummarized ? 2 : 1,
                    date: ref.createdAt || ref.importedAt || storyDate,
                    chapterId: null,
                    chapterOrder: null,
                    characterNames: extractCharacterNames(chunk.text, knownChars),
                    tags: ['reference', ref.title || 'doc', chunk.type]
                });
            });
        }

        if (totalRefChars < db.references.reduce((s, r) => s + (r.content || '').length, 0)) {
            console.log(`⚠️ Reference content capped: ${totalRefChunks} chunks from ${(totalRefChars / 1024).toFixed(0)}KB (budget: ${(MAX_TOTAL_REF_CHARS / 1024).toFixed(0)}KB)`);
        }
    }

    // ── Index abilities ──
    if (db.abilities?.length) {
        for (const ability of db.abilities) {
            const parts = [`Năng lực: ${ability.name}`];
            if (ability.owner) parts.push(`Sở hữu bởi: ${ability.owner}`);
            if (ability.effect) parts.push(`Công dụng/Hiệu ứng: ${ability.effect}`);
            if (ability.limitation) parts.push(`Hạn chế: ${ability.limitation}`);
            items.push({
                id: `ability-${ability.id || ability.name}`,
                text: parts.join('. '),
                source: 'ability',
                docType: 'magic_system',
                priority: 4,
                date: ability.createdAt || storyDate,
                chapterId: null,
                chapterOrder: null,
                characterNames: ability.owner ? ability.owner.split(/[,;、]/).map(s => s.trim()) : [],
                tags: ['ability']
            });
        }
    }

    // ── Index items ──
    if (db.items?.length) {
        for (const item of db.items) {
            const parts = [`Vật phẩm: ${item.name}`];
            if (item.owner) parts.push(`Đang giữ: ${item.owner}`);
            if (item.effect) parts.push(`Công dụng: ${item.effect}`);
            if (item.location) parts.push(`Vị trí: ${item.location}`);
            items.push({
                id: `item-${item.id || item.name}`,
                text: parts.join('. '),
                source: 'item',
                docType: 'inventory',
                priority: 3,
                date: item.createdAt || storyDate,
                chapterId: null,
                chapterOrder: null,
                characterNames: item.owner ? item.owner.split(/[,;、]/).map(s => s.trim()) : [],
                tags: ['item']
            });
        }
    }

    // ── Index organizations ──
    if (db.organizations?.length) {
        for (const org of db.organizations) {
            const parts = [`Tổ chức/Thế lực: ${org.name}`];
            if (org.purpose) parts.push(`Mục đích: ${org.purpose}`);
            if (org.members) parts.push(`Thành viên liên quan: ${org.members}`);
            items.push({
                id: `org-${org.id || org.name}`,
                text: parts.join('. '),
                source: 'organization',
                docType: 'faction',
                priority: 3,
                date: org.createdAt || storyDate,
                chapterId: null,
                chapterOrder: null,
                characterNames: org.members ? org.members.split(/[,;、]/).map(s => s.trim()) : [],
                tags: ['organization', 'faction']
            });
        }
    }

    // ── Index style samples (from Style Learning Library) ──
    const styleLib = Array.isArray(story.styleLibrary) ? story.styleLibrary : [];
    if (styleLib.length > 0) {
        for (const entry of styleLib) {
            if (!entry.content) continue;
            const sampleText = entry.content.slice(0, 2000);
            items.push({
                id: `style-${entry.fileName || 'unknown'}`,
                text: `[Mẫu văn phong: ${entry.fileName || 'Mẫu'}] ${sampleText}`,
                source: 'style_reference',
                docType: 'writing_style',
                priority: 2,
                date: entry.learnedAt || storyDate,
                chapterId: null,
                chapterOrder: null,
                characterNames: [],
                tags: ['style', 'reference', entry.fileName || 'sample']
            });
        }
    }

    return { items };
}

/**
 * Apply max items cap — sort by priority descending, keep top N.
 * @param {Array} items
 * @param {number} maxItems
 * @returns {Array}
 */
function applyMaxItemsCap(items, maxItems = MAX_EMBEDDING_ITEMS) {
    if (items.length <= maxItems) return items;
    // Sort by priority descending (higher priority = keep), then by recency
    const sorted = [...items].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return (b.chapterOrder || 0) - (a.chapterOrder || 0);
    });
    console.log(`⚠️ Items capped: ${items.length} → ${maxItems} (dropped ${items.length - maxItems} low-priority items)`);
    return sorted.slice(0, maxItems);
}

/**
 * Index all story content into embeddings with rich metadata.
 * Uses semantic chunking for chapters/references.
 * Smart chapter filtering: only full-index N nearest chapters.
 * Max items cap prevents overload.
 *
 * @param {string} apiKey
 * @param {Object} story - Story object
 * @param {Object} [options]
 * @param {number} [options.maxChaptersToFullIndex] - Recent chapters to full-index
 * @param {Function} [options.onProgress] - (current, total) => void
 * @returns {Promise<{documents: Array, stats: Object}>}
 */
async function indexStoryContent(apiKey, story, options = {}) {
    if (!story || !apiKey) return { documents: [], stats: { total: 0, embedded: 0 } };

    const storyId = story.id || 'unknown';
    const { onProgress } = options;

    // Collect items using smart chapter filtering
    const { items: rawItems } = collectStoryItems(story, options);

    console.log(`📚 Indexing ${rawItems.length} items with rich metadata for story "${story.title}"...`);

    // ── Source filtering ──
    let processedItems = filterBySource(rawItems);

    // ── Deduplication ──
    processedItems = deduplicateItems(processedItems);

    // ── Max items cap ──
    processedItems = applyMaxItemsCap(processedItems);

    // Log metadata summary
    const metaSummary = {};
    processedItems.forEach(i => { metaSummary[i.docType] = (metaSummary[i.docType] || 0) + 1; });
    console.log(`📋 Metadata breakdown (after filtering):`, metaSummary);

    // Generate embeddings with progress callback
    const embeddedItems = await generateEmbeddings(
        apiKey, processedItems, 'RETRIEVAL_DOCUMENT', storyId, onProgress
    );

    const documents = embeddedItems.map((item, i) => ({
        ...processedItems[i],
        embedding: item.embedding
    }));

    const stats = {
        total: rawItems.length,
        afterFilter: processedItems.length,
        embedded: documents.filter(d => d.embedding).length,
        chapters: processedItems.filter(i => i.source === 'chapter' || i.source === 'chapter-summary').length,
        characters: processedItems.filter(i => i.source === 'character').length,
        settings: processedItems.filter(i => i.source === 'setting').length,
        plots: processedItems.filter(i => i.source === 'plot').length,
        timeline: processedItems.filter(i => i.source === 'timeline').length,
        references: processedItems.filter(i => i.source === 'reference').length,
        abilities: processedItems.filter(i => i.source === 'ability').length,
        items: processedItems.filter(i => i.source === 'item').length,
        organizations: processedItems.filter(i => i.source === 'organization').length,
        docTypes: metaSummary
    };

    console.log(`✅ Indexed: ${stats.embedded}/${stats.afterFilter} items embedded (${stats.total - stats.afterFilter} filtered)`);

    return { documents, stats };
}

// ── Incremental / Delta Indexing ─────────────────

/**
 * Fast synchronous hash for delta detection (FNV-1a 32-bit).
 * @param {string} str
 * @returns {string} hex hash
 */
function simpleHash(str) {
    let hash = 0x811c9dc5;  // FNV offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;  // FNV prime, unsigned
    }
    return hash.toString(16).padStart(8, '0');
}

/**
 * Incremental/delta indexing — only re-embed changed or new items.
 * Uses collectStoryItems (with smart chapter filtering) to avoid redundant work.
 * Compares content hashes against a previous document snapshot.
 * Reuses cached embeddings for unchanged items.
 *
 * @param {string} apiKey
 * @param {Object} story
 * @param {Array} previousDocuments - Documents from previous indexing (with embeddings)
 * @param {Object} [options]
 * @param {number} [options.maxChaptersToFullIndex] - Recent chapters to full-index
 * @param {Function} [options.onProgress] - (current, total) => void
 * @returns {Promise<{documents: Array, stats: Object}>}
 */
async function incrementalIndexStoryContent(apiKey, story, previousDocuments = [], options = {}) {
    if (!story || !apiKey) return { documents: [], stats: { total: 0, embedded: 0 } };

    const storyId = story.id || 'unknown';
    const { onProgress } = options;

    // Collect items using shared function (no embedding, no API calls)
    const { items: rawItems } = collectStoryItems(story, options);

    // Apply filtering + dedup + cap
    let items = filterBySource(rawItems);
    items = deduplicateItems(items);
    items = applyMaxItemsCap(items);

    // ── Delta detection ──
    const prevHashMap = {};
    const prevEmbeddingMap = {};
    for (const doc of previousDocuments) {
        prevHashMap[doc.id] = simpleHash(doc.text || '');
        if (doc.embedding) prevEmbeddingMap[doc.id] = doc.embedding;
    }

    // Categorize items
    const unchanged = [];  // reuse embeddings
    const changed = [];    // need re-embedding
    const newItems = [];   // need embedding

    for (const item of items) {
        const currentHash = simpleHash(item.text || '');
        if (prevHashMap[item.id] === currentHash && prevEmbeddingMap[item.id]) {
            unchanged.push({ ...item, embedding: prevEmbeddingMap[item.id] });
        } else if (prevHashMap[item.id]) {
            changed.push(item);
        } else {
            newItems.push(item);
        }
    }

    // Detect removed items
    const currentIds = new Set(items.map(i => i.id));
    const removedCount = previousDocuments.filter(d => !currentIds.has(d.id)).length;

    console.log(`⚡ Incremental index: ${unchanged.length} unchanged, ${changed.length} modified, ${newItems.length} new, ${removedCount} removed`);

    // Only embed changed + new items (with batch parallel + progress)
    const toEmbed = [...changed, ...newItems];
    let embeddedNew = [];
    if (toEmbed.length > 0) {
        const embResult = await generateEmbeddings(
            apiKey, toEmbed, 'RETRIEVAL_DOCUMENT', storyId, onProgress
        );
        embeddedNew = embResult.map((emb, i) => ({
            ...toEmbed[i],
            embedding: emb.embedding
        }));
    }

    // Merge: unchanged (reused) + newly embedded
    const documents = [...unchanged, ...embeddedNew];

    const stats = {
        total: items.length,
        embedded: documents.filter(d => d.embedding).length,
        reused: unchanged.length,
        reEmbedded: changed.length,
        newlyEmbedded: newItems.length,
        removed: removedCount,
        apiCallsSaved: unchanged.length
    };

    console.log(`✅ Incremental: ${stats.reused} reused + ${stats.reEmbedded + stats.newlyEmbedded} (re)embedded = ${stats.embedded} total (saved ${stats.apiCallsSaved} API calls)`);

    return { documents, stats };
}

// ── Exports ───────────────────────────────────

export const EmbeddingService = {
    generateEmbedding,
    generateEmbeddings,
    chunkText,
    semanticChunkText,
    extractCharacterNames,
    cosineSimilarity,
    searchSimilar,
    hybridSearch,
    multiSignalRerank,
    llmRerank,
    deduplicateItems,
    deduplicateResults,
    filterBySource,
    jaccardSimilarity,
    BM25Index,
    reciprocalRankFusion,
    invalidateBM25Cache,
    indexStoryContent,
    incrementalIndexStoryContent,
    getQueryCacheStats: () => _queryCache.getStats(),
    clearStoryEmbeddings
};
