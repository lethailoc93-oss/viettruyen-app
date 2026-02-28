// ================================================
// Research Service — Auto-research from novel sites
// Uses Gemini + Google Search grounding to find & analyze novels
// Also fetches directly from sangtacviet via proxy
// Anti-ban: humanized delays, request counting, auto-cooldown
// Smart search: relevance scoring, strategic chapter selection
// ================================================

import { callOrbitAPI, buildMessages, getProxyConfig, createTimeoutController } from './apiClient';

const SANGTACVIET_BASE = 'http://14.225.254.182';

// ─── Anti-ban: Rate Limiter ───
const rateLimiter = {
    requestCount: 0,
    lastRequestTime: 0,
    MAX_REQUESTS_PER_SESSION: 12,    // Max requests before long cooldown
    MIN_DELAY_MS: 2000,              // Min delay between requests (2s)
    MAX_DELAY_MS: 5000,              // Max delay between requests (5s)
    COOLDOWN_MS: 30000,              // Long cooldown after max requests (30s)
    ERROR_BACKOFF_MS: 10000,         // Backoff on error (10s)

    /** Random delay that looks human (2-5 seconds) */
    async humanDelay() {
        const delay = this.MIN_DELAY_MS + Math.random() * (this.MAX_DELAY_MS - this.MIN_DELAY_MS);
        await new Promise(r => setTimeout(r, delay));
    },

    /** Check if we need to cooldown, and wait if so */
    async checkAndWait(onProgress) {
        this.requestCount++;

        if (this.requestCount >= this.MAX_REQUESTS_PER_SESSION) {
            onProgress?.(`⏳ Tạm nghỉ ${this.COOLDOWN_MS / 1000}s để tránh bị chặn...`);
            await new Promise(r => setTimeout(r, this.COOLDOWN_MS));
            this.requestCount = 0;
        }
    },

    /** Backoff on error */
    async errorBackoff(onProgress) {
        onProgress?.(`⏳ Lỗi kết nối, đợi ${this.ERROR_BACKOFF_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, this.ERROR_BACKOFF_MS));
    },

    /** Reset counter (call at start of each research session) */
    reset() {
        this.requestCount = 0;
        this.lastRequestTime = 0;
    }
};

/**
 * Get proxy base URL from the WS relay config or default local server
 */
function getProxyUrl() {
    const config = getProxyConfig();
    const wsUrl = config.customBaseUrl || '';

    // If no custom URL is set, default to the local App Server port
    if (!wsUrl) return 'http://localhost:8080';

    let httpUrl = wsUrl
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://');

    try {
        const parsed = new URL(httpUrl);
        httpUrl = `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
        httpUrl = httpUrl.replace(/\/v\d+.*$/, '').replace(/\/+$/, '');
    }
    return httpUrl;
}

/**
 * Fetch a URL via proxy — with anti-ban protections
 */
async function fetchViaProxy(targetUrl, onProgress, signal) {
    const proxyBase = getProxyUrl();
    if (!proxyBase) {
        throw new Error('Chưa cấu hình proxy URL. Vui lòng nhập URL WS Relay trong cài đặt API.');
    }

    // Anti-ban: wait before each request
    await rateLimiter.humanDelay();
    await rateLimiter.checkAndWait(onProgress);

    const proxyUrl = `${proxyBase}/proxy?url=${encodeURIComponent(targetUrl)}`;

    // Retry with backoff on failure
    for (let attempt = 0; attempt < 3; attempt++) {
        const timeout = createTimeoutController(20000, signal);
        try {
            const response = await fetch(proxyUrl, { signal: timeout.signal });

            if (response.status === 429 || response.status === 403) {
                // Rate limited or blocked — long wait
                await rateLimiter.errorBackoff(onProgress);
                continue;
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Proxy error: ${response.status}`);
            }

            return await response.text();
        } catch (e) {
            if (attempt < 2) {
                await rateLimiter.errorBackoff(onProgress);
                continue;
            }
            throw e;
        }
    }
}

// ─── Smart Search: Relevance scoring ───

/**
 * Score how relevant a story title is to the query
 * Higher = better match
 */
function scoreRelevance(title, query) {
    const tLower = title.toLowerCase().replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
    const qLower = query.toLowerCase().replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');

    // Exact match = highest score
    if (tLower === qLower) return 100;

    // Contains full query
    if (tLower.includes(qLower)) return 80;
    if (qLower.includes(tLower)) return 70;

    // Word overlap scoring
    const queryWords = qLower.split(/\s+/).filter(w => w.length > 1);
    const titleWords = tLower.split(/\s+/).filter(w => w.length > 1);

    let matchedWords = 0;
    for (const qw of queryWords) {
        if (titleWords.some(tw => tw.includes(qw) || qw.includes(tw))) {
            matchedWords++;
        }
    }

    const wordScore = queryWords.length > 0 ? (matchedWords / queryWords.length) * 60 : 0;
    return wordScore;
}

/**
 * Search sangtacviet with smart relevance scoring and deduplication
 */
async function searchSangtacviet(query, onProgress, signal) {
    try {
        const html = await fetchViaProxy(
            `${SANGTACVIET_BASE}/?find=${encodeURIComponent(query)}&minc=0&sort=star&tag=`,
            onProgress,
            signal
        );

        // Parse ALL links with /truyen/ pattern
        const storyLinks = [];
        const seen = new Set();
        const linkRegex = /href="(\/truyen\/[^"]+\/)"[^>]*>([^<]+)</g;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
            const url = `${SANGTACVIET_BASE}${match[1]}`;
            const title = match[2].trim();
            // Dedup by URL
            if (!seen.has(url) && title.length > 2) {
                seen.add(url);
                const score = scoreRelevance(title, query);
                storyLinks.push({ url, title, score });
            }
        }

        // Sort by relevance score (highest first)
        storyLinks.sort((a, b) => b.score - a.score);

        // Only return stories with meaningful relevance
        const good = storyLinks.filter(s => s.score >= 30);
        if (good.length > 0) return good.slice(0, 3); // Top 3 matches

        // Fallback: return top results even if low score
        return storyLinks.slice(0, 3);
    } catch (e) {
        console.warn('searchSangtacviet failed:', e.message);
        return [];
    }
}

/**
 * Fetch story detail page — extract title, description, and chapter list
 */
async function fetchStoryDetail(storyUrl, onProgress, signal) {
    try {
        const html = await fetchViaProxy(storyUrl, onProgress, signal);

        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // Extract ALL chapter links
        const chapters = [];
        const chapRegex = /class="listchapitem"[^>]*href="([^"]+)"[^>]*>([^<]+)</g;
        let match;
        while ((match = chapRegex.exec(html)) !== null) {
            chapters.push({
                url: match[1].startsWith('http') ? match[1] : `${SANGTACVIET_BASE}${match[1]}`,
                title: match[2].trim()
            });
        }

        const descMatch = html.match(/class="(?:story-desc|mota|gioi-thieu)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        return { title, chapters, description, url: storyUrl, totalChapters: chapters.length };
    } catch (e) {
        console.warn('fetchStoryDetail failed:', e.message);
        return { title: '', chapters: [], description: '', url: storyUrl, totalChapters: 0 };
    }
}

/**
 * Smart chapter selection — pick strategic chapters instead of just first N
 * Strategy:
 *   - Ch 1-3: World-building, character introductions
 *   - 1 chapter from ~25%: Plot development
 *   - 1 chapter from ~50%: Mid-story (power system evolution)
 * Max 5 chapters to minimize requests
 */
function selectStrategicChapters(chapters) {
    const total = chapters.length;
    if (total <= 5) return chapters; // Few chapters = read all

    const selected = [];

    // First 3 chapters (world-building & character intro)
    selected.push(chapters[0]);
    if (total > 1) selected.push(chapters[1]);
    if (total > 2) selected.push(chapters[2]);

    // 1 chapter from ~25% mark (early plot development)
    const quarter = Math.floor(total * 0.25);
    if (quarter > 2 && quarter < total) {
        selected.push(chapters[quarter]);
    }

    // 1 chapter from ~50% mark (mid-story)
    const half = Math.floor(total * 0.5);
    if (half > quarter && half < total) {
        selected.push(chapters[half]);
    }

    return selected;
}

/**
 * Fetch chapter content with anti-ban protection and smart text extraction
 */
async function fetchChapterContent(chapterUrl, onProgress, signal) {
    try {
        const proxyBase = getProxyUrl();
        if (!proxyBase) return '';

        // Anti-ban: wait before each request
        await rateLimiter.humanDelay();
        await rateLimiter.checkAndWait(onProgress);

        const proxyUrl = `${proxyBase}/proxy?url=${encodeURIComponent(chapterUrl)}&format=text`;

        for (let attempt = 0; attempt < 3; attempt++) {
            const timeout = createTimeoutController(20000, signal);
            try {
                const response = await fetch(proxyUrl, { signal: timeout.signal });

                if (response.status === 429 || response.status === 403) {
                    await rateLimiter.errorBackoff(onProgress);
                    continue;
                }

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || `Proxy error: ${response.status}`);
                }

                const data = await response.json();
                if (data && data.content) {
                    return data.content.trim();
                }
                return '';

            } catch (e) {
                if (attempt < 2) {
                    await rateLimiter.errorBackoff(onProgress);
                    continue;
                }
                throw e;
            }
        }
    } catch (e) {
        console.warn('fetchChapterContent failed:', e.message);
        return '';
    }
}

// ─── Genre mapping (Vietnamese -> search tags) ───
const GENRE_SEARCH_MAP = {
    'tien_hiep': ['tiên hiệp', 'tu chân', 'xianxia'],
    'huyen_huyen': ['huyền huyễn', 'xuanghuan'],
    'do_thi': ['đô thị', 'đời thường', 'urban'],
    'kiem_hiep': ['kiếm hiệp', 'võ hiệp', 'wuxia'],
    'khoa_huyen': ['khoa huyễn', 'sci-fi'],
    'ky_huyen': ['kỳ huyễn', 'fantasy'],
    'lich_su': ['lịch sử', 'cổ đại'],
    'quan_su': ['quân sự', 'chiến tranh'],
    'game': ['game', 'trò chơi'],
    'the_thao': ['thể thao'],
    'kinh_di': ['kinh dị', 'horror'],
    'trinh_tham': ['trinh thám', 'mystery'],
    'ngon_tinh': ['ngôn tình', 'romance'],
    'dam_my': ['đam mỹ', 'BL'],
    'dong_nhan': ['đồng nhân', 'fanfic'],
    'other': [],
};

// ═══════════════════════════════════════════════════
// Named exports — reusable helpers for other modules
// ═══════════════════════════════════════════════════
export {
    fetchViaProxy,
    fetchStoryDetail,
    fetchChapterContent,
    selectStrategicChapters,
    getProxyUrl,
    rateLimiter,
};

/**
 * Research Service — orchestrates auto-research using AI + web search
 */
export const ResearchService = {

    /**
     * Mode 1: Fan Fiction Research — find & analyze the original novel
     * @param {string} apiKey 
     * @param {object} story - current story
     * @param {object} options - { model, onProgress, chapterCount, chapterStart, useCustomChapters }
     * @returns {object} { originalInfo, characters, worldRules, terminology, writingStyle }
     */
    async researchOriginal(apiKey, story, options = {}) {
        const { model, onProgress, chapterCount = 5, chapterStart = 0, useCustomChapters = false } = options;
        const storyTitle = story.title || '';
        const storyDesc = story.description || '';
        const genres = story.genres || [story.genre || 'other'];

        // Reset rate limiter for this session
        rateLimiter.reset();

        // ─── Step 0: Try direct sangtacviet fetch ───
        let directContent = '';
        try {
            let detail = null;

            if (options.storyUrl) {
                onProgress?.('🔍 Bước 1/4: Đọc truyện trực tiếp từ URL được cung cấp...');
                detail = await fetchStoryDetail(options.storyUrl, onProgress, options.signal);
                if (detail.title) {
                    onProgress?.(`📚 Đang đọc: "${detail.title}"`);
                }
            } else {
                onProgress?.('🔍 Bước 1/4: Tìm truyện trên sangtacviet...');
                const stories = await searchSangtacviet(storyTitle, onProgress, options.signal);

                if (stories.length > 0) {
                    const bestMatch = stories[0];
                    onProgress?.(`📚 Tìm thấy: "${bestMatch.title}" (khớp ${bestMatch.score}%)`);
                    detail = await fetchStoryDetail(bestMatch.url, onProgress, options.signal);
                } else {
                    onProgress?.('ℹ️ Không tìm thấy trên sangtacviet, dùng Google Search...');
                }
            }

            if (detail && detail.chapters.length > 0) {
                // Smart or custom chapter selection
                let chaptersToRead;
                const total = detail.chapters.length;

                if (useCustomChapters) {
                    // User-specified range
                    const start = Math.min(chapterStart, total - 1);
                    const count = Math.min(chapterCount, total - start);
                    chaptersToRead = detail.chapters.slice(start, start + count);
                    onProgress?.(`📋 Truyện có ${total} chương, đọc ch.${start + 1}-${start + count} (${count} chương)`);
                } else {
                    // Automatic strategic selection
                    chaptersToRead = selectStrategicChapters(detail.chapters);
                    onProgress?.(`📋 Truyện có ${total} chương, chọn ${chaptersToRead.length} chương chiến lược`);
                }

                const chapterTexts = [];
                for (let i = 0; i < chaptersToRead.length; i++) {
                    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
                    onProgress?.(`📖 Đọc ${i + 1}/${chaptersToRead.length}: ${chaptersToRead[i].title}`);
                    const content = await fetchChapterContent(chaptersToRead[i].url, onProgress, options.signal);
                    if (content) {
                        chapterTexts.push(`[${chaptersToRead[i].title}]\n${content.substring(0, 2000)}`);
                    }
                    // Rate limiter handles delays automatically
                }

                if (chapterTexts.length > 0) {
                    directContent = `\n\n=== NỘI DUNG TỪ TRUYỆN GỐC "${detail.title}" (${chapterTexts.length}/${total} chương) ===\n` +
                        chapterTexts.join('\n\n---\n\n');
                    onProgress?.(`✅ Đã đọc ${chapterTexts.length} chương từ truyện ${detail.title ? detail.title : ''}`);
                }
            }
        } catch (e) {
            console.warn('Direct fetch failed, falling back to AI search:', e.message);
            onProgress?.('⚠️ Không thể đọc trực tiếp, dùng Google Search...');
        }

        onProgress?.('🔍 Bước 2/4: AI tìm kiếm thông tin truyện gốc...');

        // Step 1: Use AI + web search to find the original novel
        const searchPrompt = `Tôi đang viết truyện đồng nhân (fan fiction) dựa trên truyện sau:
Tiêu đề: "${storyTitle}"
Mô tả: "${storyDesc}"
Thể loại: ${genres.join(', ')}
${directContent ? `\nTôi đã đọc được một số chương từ truyện gốc:\n${directContent.substring(0, 4000)}` : ''}

Hãy tìm kiếm trên web và cho tôi biết:
1. Tên truyện gốc đầy đủ (tiếng Trung nếu có, tiếng Việt)
2. Tác giả
3. Thể loại chi tiết
4. Tóm tắt cốt truyện chính (200-300 từ)
5. Danh sách 10-15 nhân vật chính với: tên, vai trò, tính cách, năng lực/sức mạnh
6. Hệ thống sức mạnh/tu luyện chi tiết (cấp bậc, thuật ngữ)
7. Thế giới quan (thiết lập, quy tắc, bối cảnh)
8. Thuật ngữ đặc trưng (liệt kê 20+ thuật ngữ quan trọng)
9. Cách xưng hô giữa các nhân vật

Trả lời bằng tiếng Việt, CHI TIẾT nhất có thể. Đây là thông tin để AI viết đồng nhân chính xác.`;

        const searchMessages = buildMessages(
            'Bạn là chuyên gia phân tích tiểu thuyết mạng. Hãy tìm kiếm và cung cấp thông tin chi tiết nhất có thể về truyện được hỏi. Dùng Google Search để tìm thông tin chính xác.',
            searchPrompt
        );

        const searchResult = await callOrbitAPI(apiKey, model, searchMessages, 4096, 3, { useWebSearch: true, signal: options.signal });
        const searchText = searchResult?.text || searchResult || '';

        onProgress?.('📖 Bước 3/4: Phân tích phong cách viết...');

        // Step 2: Analyze writing style from the original
        const stylePrompt = `Dựa trên truyện gốc "${storyTitle}", hãy phân tích PHONG CÁCH VIẾT đặc trưng:

1. **Giọng văn**: Nghiêm túc/hài hước/u ám/nhiệt huyết?
2. **Cấu trúc chương**: Mở đầu thường thế nào? Kết chương ra sao? Có cliff-hanger không?
3. **Miêu tả chiến đấu**: Chi tiết hay tóm tắt? Dùng nhiều thuật ngữ không?
4. **Thoại**: Phong cách thoại đặc trưng? Xưng hô?
5. **Nhịp điệu**: Nhanh/chậm? Chuyển cảnh thế nào?
6. **Kỹ thuật đặc biệt**: Foreshadowing? Flashback? POV?
7. **Từ vựng đặc trưng**: Liệt kê 30+ cụm từ/câu thường gặp trong thể loại này
8. **Quy tắc bất thành văn**: Những convention mà fan đồng nhân thể loại này phải tuân thủ

Tìm kiếm trên web và trả lời CHI TIẾT để giúp AI viết đồng nhân chuẩn nguyên tác.`;

        const styleMessages = buildMessages(
            'Bạn là chuyên gia văn học mạng, đặc biệt giỏi phân tích phong cách viết tiểu thuyết. Hãy sử dụng Google Search để tìm thông tin.',
            stylePrompt
        );

        const styleResult = await callOrbitAPI(apiKey, model, styleMessages, 4096, 3, { useWebSearch: true, signal: options.signal });
        const styleText = styleResult?.text || styleResult || '';

        onProgress?.('📋 Bước 4/4: Tổng hợp dữ liệu...');

        // Step 3: Structure the data with AI
        const structurePrompt = `Từ thông tin sau, hãy tạo một BÁO CÁO NGHIÊN CỨU có cấu trúc:

=== THÔNG TIN TRUYỆN GỐC ===
${searchText.substring(0, 6000)}

=== PHONG CÁCH VIẾT ===
${styleText.substring(0, 6000)}

Hãy tổng hợp thành JSON với format sau (trả về JSON thuần, không markdown):
{
  "originalTitle": "tên truyện gốc",
  "author": "tác giả",
  "summary": "tóm tắt 200 từ",
  "characters": [{"name": "", "role": "", "personality": "", "abilities": "", "relationships": ""}],
  "powerSystem": "mô tả hệ thống sức mạnh chi tiết",
  "worldRules": "quy tắc thế giới",
  "terminology": ["thuật ngữ 1", "thuật ngữ 2"],
  "writingStyle": {
    "tone": "giọng văn",
    "chapterStructure": "cấu trúc chương",
    "combatStyle": "phong cách miêu tả chiến đấu",
    "dialogueStyle": "phong cách thoại",
    "pacing": "nhịp điệu",
    "conventions": ["quy tắc 1", "quy tắc 2"]
  },
  "commonPhrases": ["cụm từ 1", "cụm từ 2"],
  "addressTerms": {"vai_tro": "cách xưng hô"}
}`;

        const structureMessages = buildMessages(
            'Bạn tổng hợp thông tin thành JSON có cấu trúc. Chỉ trả về JSON thuần, không markdown, không giải thích.',
            structurePrompt
        );

        const structureResult = await callOrbitAPI(apiKey, model, structureMessages, 4096, 3, { signal: options.signal });

        // Parse JSON result
        let researchData;
        try {
            const jsonStr = (structureResult || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            researchData = JSON.parse(jsonStr);
        } catch (e) {
            // If JSON parsing fails, store as raw text
            researchData = {
                originalTitle: storyTitle,
                rawData: searchText + '\n\n' + styleText,
                parseError: true,
            };
        }

        researchData._timestamp = Date.now();
        researchData._type = 'fanfiction';
        return researchData;
    },

    /**
     * Mode 2: Style Learning — find popular novels of same genre and analyze style
     * @param {string} apiKey
     * @param {object} story
     * @param {object} options - { model, onProgress }
     * @returns {object} style guide data
     */
    async researchStyle(apiKey, story, options = {}) {
        const { model, onProgress } = options;
        const genres = story.genres || [story.genre || 'other'];
        const genreNames = genres.map(g => {
            const mapped = GENRE_SEARCH_MAP[g];
            return mapped ? mapped[0] : g;
        }).filter(Boolean);

        // ─── Optional: Fetch content from provided URL ───
        let directStyleContent = '';
        if (options.storyUrl) {
            try {
                rateLimiter.reset();
                const chapterCount = options.useCustomChapters ? (options.chapterCount || 50) : 50;
                const chapterStart = options.chapterStart || 0;
                const useCustomChapters = options.useCustomChapters || false;

                onProgress?.('🔗 Đọc truyện mẫu từ URL...');
                const detail = await fetchStoryDetail(options.storyUrl, onProgress, options.signal);
                if (detail && detail.chapters.length > 0) {
                    let chaptersToRead;
                    const total = detail.chapters.length;

                    if (useCustomChapters) {
                        const start = Math.min(chapterStart, total - 1);
                        const count = Math.min(chapterCount, total - start);
                        chaptersToRead = detail.chapters.slice(start, start + count);
                        onProgress?.(`📖 Đọc ch.${start + 1}-${start + count} (${count}/${total} chương) từ "${detail.title || 'truyện'}"`);
                    } else {
                        // Extended strategic selection: more chapters for better style learning
                        const stratChapters = [];
                        const maxRead = Math.min(chapterCount, total);
                        // First 5 chapters
                        for (let i = 0; i < Math.min(5, total); i++) stratChapters.push(i);
                        // 25%, 50%, 75% marks
                        [0.25, 0.5, 0.75].forEach(pct => {
                            const idx = Math.floor(total * pct);
                            if (!stratChapters.includes(idx)) stratChapters.push(idx);
                        });
                        // Fill remaining with evenly spaced chapters
                        while (stratChapters.length < maxRead) {
                            const gap = total / (maxRead - stratChapters.length + 1);
                            const next = Math.floor(stratChapters[stratChapters.length - 1] + gap);
                            if (next >= total || stratChapters.includes(next)) break;
                            stratChapters.push(next);
                        }
                        stratChapters.sort((a, b) => a - b);
                        chaptersToRead = stratChapters.slice(0, maxRead).map(i => detail.chapters[i]);
                        onProgress?.(`📖 Đọc ${chaptersToRead.length}/${total} chương chiến lược từ "${detail.title || 'truyện'}"`);
                    }

                    const texts = [];
                    for (let i = 0; i < chaptersToRead.length; i++) {
                        if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
                        onProgress?.(`📖 Đọc mẫu ${i + 1}/${chaptersToRead.length}: ${chaptersToRead[i].title}`);
                        const content = await fetchChapterContent(chaptersToRead[i].url, onProgress, options.signal);
                        if (content) texts.push(content.substring(0, 2000));
                    }
                    directStyleContent = texts.join('\n\n---\n\n');
                    onProgress?.(`✅ Đã đọc ${texts.length} chương mẫu (${detail.title || 'truyện'})`);
                }
            } catch (e) {
                onProgress?.(`⚠️ Không đọc được URL mẫu: ${e.message}, dùng Google Search thay thế`);
            }
        }

        onProgress?.('🔍 Bước 1/3: Tìm truyện hot cùng thể loại...');

        // Step 1: Find popular novels of same genre
        const searchPrompt = `Tìm 5 truyện tiểu thuyết mạng (web novel) CỰC HAY thuộc thể loại: ${genreNames.join(', ')}

Yêu cầu:
- Truyện phải có ĐÁNH GIÁ CAO, nhiều người đọc
- Ưu tiên truyện của tác giả nổi tiếng
- Có thể là truyện Trung Quốc đã dịch sang tiếng Việt

Với MỖI TRUYỆN, cho biết:
1. Tên truyện (tiếng Việt + tiếng Trung nếu có)
2. Tác giả
3. Tại sao truyện này hay (điểm mạnh về kỹ thuật viết)
4. Trích dẫn 2-3 đoạn văn hay nhất (miêu tả, chiến đấu, thoại) hoặc mô tả cách tác giả viết các đoạn đó
5. Kỹ thuật viết đặc trưng của tác giả này`;

        const searchMessages = buildMessages(
            'Bạn là chuyên gia phê bình văn học mạng, am hiểu sâu về tiểu thuyết mạng Trung Quốc và Việt Nam. Tìm kiếm trên web để cung cấp thông tin chính xác nhất.',
            searchPrompt
        );

        const searchResult = await callOrbitAPI(apiKey, model, searchMessages, 4096, 3, { useWebSearch: true, signal: options.signal });
        const searchText = searchResult?.text || searchResult || '';

        onProgress?.('📖 Bước 2/3: Phân tích kỹ thuật viết...');

        // Step 2: Deep analysis of writing techniques
        const analysisPrompt = `Dựa trên 5 truyện hay nhất thể loại ${genreNames.join(', ')} đã tìm:

${searchText.substring(0, 6000)}
${directStyleContent ? `\n=== NỘI DUNG TRUYỆN MẪU TRỰC TIẾP ===\n${directStyleContent.substring(0, 5000)}\n` : ''}
Hãy tổng hợp thành BỘ HƯỚNG DẪN VIẾT cho AI, bao gồm:

1. **Cách mở đầu chương**: 5 cách mở đầu hiệu quả (với ví dụ)
2. **Cách kết thúc chương**: 5 cách kết chương tạo cliff-hanger (với ví dụ)
3. **Miêu tả chiến đấu**: Template + ví dụ cho action scene
4. **Miêu tả cảnh vật**: Kỹ thuật giúp scene sống động
5. **Xây dựng thoại**: Cách viết thoại tự nhiên, có cá tính cho thể loại này
6. **Xây dựng tension**: Kỹ thuật tạo căng thẳng, hồi hộp
7. **Chuyển cảnh**: Kỹ thuật chuyển đoạn mượt mà
8. **Nhịp điệu**: Khi nào nhanh, khi nào chậm
9. **Từ vựng đặc trưng**: 50+ cụm từ, thành ngữ hay dùng trong thể loại
10. **Lỗi thường gặp**: Những cái CẤM KỴ trong thể loại này

Mỗi mục PHẢI CÓ VÍ DỤ CỤ THỂ. Đây là hướng dẫn để AI viết, nên cần chi tiết và thực tế.`;

        const analysisMessages = buildMessages(
            'Bạn là bậc thầy viết tiểu thuyết mạng. Hãy tổng hợp kỹ thuật viết hay nhất.',
            analysisPrompt
        );

        const analysisResult = await callOrbitAPI(apiKey, model, analysisMessages, 6144, 3, { useWebSearch: true, signal: options.signal });
        const analysisText = analysisResult?.text || analysisResult || '';

        onProgress?.('📋 Bước 3/3: Tạo hướng dẫn phong cách...');

        // Step 3: Structure into style guide
        const structurePrompt = `Tổng hợp thông tin sau thành JSON (trả về JSON thuần):

${analysisText.substring(0, 8000)}

JSON format:
{
  "genreNames": ["thể loại"],
  "referenceNovels": [{"title": "", "author": "", "strengths": ""}],
  "chapterOpeners": ["cách mở đầu 1", "cách mở đầu 2"],
  "chapterClosers": ["cách kết chương 1", "cách kết chương 2"],
  "combatTemplate": "template miêu tả chiến đấu",
  "sceneDescription": "kỹ thuật miêu tả",
  "dialogueGuide": "hướng dẫn viết thoại",
  "tensionTechniques": ["kỹ thuật 1"],
  "transitionGuide": "cách chuyển cảnh",
  "pacingGuide": "hướng dẫn nhịp điệu",
  "genreVocabulary": ["từ 1", "từ 2"],
  "taboos": ["cấm kỵ 1"],
  "styleExamples": ["ví dụ đoạn văn hay 1"]
}`;

        const structureMessages = buildMessages(
            'Chỉ trả về JSON thuần, không markdown, không giải thích thêm.',
            structurePrompt
        );

        const structureResult = await callOrbitAPI(apiKey, model, structureMessages, 4096, 3, { signal: options.signal });

        let styleGuide;
        try {
            const jsonStr = (structureResult || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            styleGuide = JSON.parse(jsonStr);
        } catch (e) {
            styleGuide = {
                genreNames: genreNames,
                rawGuide: analysisText,
                parseError: true,
            };
        }

        styleGuide._timestamp = Date.now();
        styleGuide._type = 'style';
        return styleGuide;
    },

    /**
     * Mode 3: Deep Character Research — detailed character psychology & speech patterns
     * @param {string} apiKey
     * @param {object} story
     * @param {object} options - { model, onProgress, signal }
     * @returns {object} { characters: [{ name, psychology, speechPatterns, relationships, arc, catchphrases }] }
     */
    async researchCharacters(apiKey, story, options = {}) {
        const { model, onProgress } = options;
        const storyTitle = story.title || '';
        const genres = story.genres || [story.genre || 'other'];

        // Use existing research data if available
        let existingChars = '';
        const db = story.database || {};
        if (db.characters?.length) {
            existingChars = db.characters.map(c =>
                `- ${c.name}: ${c.description || c.role || ''}`
            ).join('\n');
        }

        onProgress?.('🔍 Bước 1/3: Thu thập thông tin nhân vật từ web...');

        // Step 1: Search for character details
        const searchPrompt = `Truyện "${storyTitle}" (thể loại: ${genres.join(', ')})

${existingChars ? `Các nhân vật đã biết:\n${existingChars}\n` : ''}

Hãy tìm kiếm thông tin CHI TIẾT về TẤT CẢ nhân vật quan trọng trong truyện này:

Với MỖI nhân vật, phân tích:
1. **Tâm lý học**: Kiểu tính cách (MBTI hoặc tương tự), động cơ sâu xa, nỗi sợ, mong muốn
2. **Cách nói chuyện**: Giọng điệu đặc trưng, câu cửa miệng, cách xưng hô với từng người
3. **Mối quan hệ**: Quan hệ chi tiết với từng nhân vật khác (thái độ, lịch sử, xung đột)
4. **Arc phát triển**: Nhân vật thay đổi thế nào qua truyện (từ đầu → giữa → cuối)
5. **Thói quen/Đặc điểm**: Cử chỉ, thói quen, phản xạ đặc trưng khi vui/buồn/tức giận
6. **Nguyên tắc sống**: Giá trị cốt lõi, ranh giới đạo đức, điều không bao giờ làm

Trả lời bằng tiếng Việt, CỰC CHI TIẾT. Đây là dữ liệu để AI viết nhân vật sống động.`;

        const searchMessages = buildMessages(
            'Bạn là chuyên gia phân tích tâm lý nhân vật trong tiểu thuyết mạng. Hãy dùng Google Search để tìm thông tin chính xác nhất.',
            searchPrompt
        );

        const searchResult = await callOrbitAPI(apiKey, model, searchMessages, 6144, 3, { useWebSearch: true, signal: options.signal });
        const searchText = searchResult?.text || searchResult || '';

        onProgress?.('📖 Bước 2/3: Phân tích phong cách thoại từng nhân vật...');

        // Step 2: Deep dialogue analysis
        const dialoguePrompt = `Dựa trên thông tin nhân vật truyện "${storyTitle}":

${searchText.substring(0, 6000)}

Hãy phân tích KỸ THUẬT VIẾT THOẠI cho từng nhân vật:

1. **Speech Pattern**: Nhân vật này nói ngắn hay dài? Dùng từ ngữ bình dân hay trang trọng?
2. **Catchphrase**: 3-5 câu nói đặc trưng hoặc kiểu câu thường dùng
3. **Emotional Patterns**: 
   - Khi tức giận: nói/hành động thế nào?
   - Khi vui: biểu hiện ra sao?
   - Khi buồn/thất bại: phản ứng đặc trưng?
4. **Relationship Dynamics**: 
   - Với đồng minh: thái độ, cách giao tiếp
   - Với kẻ thù: phong thái, chiến thuật tâm lý
   - Với người yêu/quan tâm: cách thể hiện tình cảm
5. **Growth Markers**: Cách nói chuyện thay đổi thế nào khi nhân vật trưởng thành?

Trả lời CHI TIẾT với VÍ DỤ CỤ THỂ cho từng nhân vật.`;

        const dialogueMessages = buildMessages(
            'Bạn là bậc thầy viết thoại tiểu thuyết, đặc biệt giỏi tạo giọng nói riêng biệt cho từng nhân vật.',
            dialoguePrompt
        );

        const dialogueResult = await callOrbitAPI(apiKey, model, dialogueMessages, 6144, 3, { useWebSearch: true, signal: options.signal });
        const dialogueText = dialogueResult?.text || dialogueResult || '';

        onProgress?.('📋 Bước 3/3: Tổng hợp hồ sơ nhân vật...');

        // Step 3: Structure into JSON
        const structurePrompt = `Tổng hợp thông tin nhân vật sau thành JSON (trả về JSON thuần):

=== PHÂN TÍCH TÂM LÝ ===
${searchText.substring(0, 5000)}

=== PHONG CÁCH THOẠI ===
${dialogueText.substring(0, 5000)}

JSON format:
{
  "characters": [
    {
      "name": "tên nhân vật",
      "psychology": {
        "personality": "kiểu tính cách",
        "motivation": "động cơ sâu xa",
        "fears": "nỗi sợ",
        "desires": "mong muốn",
        "moralCode": "nguyên tắc đạo đức"
      },
      "speechPatterns": {
        "style": "phong cách nói chuyện",
        "vocabulary": "kiểu từ vựng",
        "catchphrases": ["câu cửa miệng 1", "câu cửa miệng 2"],
        "addressTerms": {"nhân vật X": "cách xưng hô"}
      },
      "emotionalResponses": {
        "angry": "phản ứng khi tức",
        "happy": "phản ứng khi vui",
        "sad": "phản ứng khi buồn",
        "stressed": "phản ứng khi áp lực"
      },
      "relationships": [{"with": "nhân vật X", "type": "loại quan hệ", "dynamics": "chi tiết"}],
      "arc": "mô tả character arc",
      "habits": ["thói quen 1", "cử chỉ đặc trưng"]
    }
  ],
  "interactionRules": ["quy tắc tương tác quan trọng giữa các nhân vật"],
  "qualityScore": 0-100
}`;

        const structureMessages = buildMessages(
            'Chỉ trả về JSON thuần, không markdown, không giải thích.',
            structurePrompt
        );

        const structureResult = await callOrbitAPI(apiKey, model, structureMessages, 6144, 3, { signal: options.signal });

        let charResearch;
        try {
            const jsonStr = (structureResult || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            charResearch = JSON.parse(jsonStr);
        } catch (e) {
            charResearch = {
                rawData: searchText + '\n\n' + dialogueText,
                parseError: true,
            };
        }

        charResearch._timestamp = Date.now();
        charResearch._type = 'characters';
        return charResearch;
    },

    /**
     * Mode 4: Self-Research — AI reads existing chapters to find inconsistencies & patterns
     * @param {string} apiKey
     * @param {object} story
     * @param {object} options - { model, onProgress, signal }
     * @returns {object} { plotHoles, worldBuilding, foreshadowing, characterTracker, qualityScore }
     */
    async selfResearch(apiKey, story, options = {}) {
        const { model, onProgress } = options;
        const db = story.database || {};
        const chapters = db.chapters || [];

        // Collect chapter content
        const writtenChapters = chapters
            .filter(c => c.content && c.content.trim().length > 100)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        if (writtenChapters.length === 0) {
            throw new Error('Chưa có chương nào được viết. Hãy viết ít nhất 1-2 chương trước khi tự phân tích.');
        }

        onProgress?.(`🔍 Bước 1/3: Đọc ${writtenChapters.length} chương đã viết...`);

        // Build chapter summaries (truncate to fit token budget)
        const maxCharsPerChapter = Math.min(3000, Math.floor(30000 / writtenChapters.length));
        const chapterTexts = writtenChapters.map((c, i) =>
            `[Chương ${c.order || i + 1}: ${c.title || 'Không tên'}]\n${(c.content || '').substring(0, maxCharsPerChapter)}`
        ).join('\n\n---\n\n');

        // Step 1: Find plot holes & inconsistencies
        const analysisPrompt = `Đọc KỸ các chương sau của truyện "${story.title || ''}":

${chapterTexts.substring(0, 15000)}

Hãy phân tích và tìm:

1. **LỖ HỔNG CỐT TRUYỆN (Plot Holes)**: 
   - Sự kiện mâu thuẫn giữa các chương
   - Nhân vật xuất hiện/biến mất không giải thích
   - Thông tin trái ngược (VD: một nơi nói nhân vật 18 tuổi, nơi khác nói 20)
   - Logic bất hợp lý

2. **THẾ GIỚI ĐÃ XÂY DỰNG (World-building Summary)**:
   - Quy tắc/hệ thống đã thiết lập trong truyện
   - Địa điểm đã mô tả
   - Quy luật sức mạnh đã xác nhận
   - Văn hóa/xã hội đã đề cập

3. **MANH MỐI (Foreshadowing)**:
   - Những chi tiết có vẻ là manh mối cho sự kiện tương lai
   - Bí ẩn chưa giải đáp
   - Xung đột chưa giải quyết

4. **THEO DÕI NHÂN VẬT**:
   - Tính cách nhân vật có nhất quán không?
   - Sức mạnh/năng lực có consistent không?
   - Mối quan hệ có phát triển hợp logic không?

Phân tích CỰC KỸ, đưa ra dẫn chứng cụ thể (trích dẫn từ chương nào).`;

        const analysisMessages = buildMessages(
            'Bạn là biên tập viên chuyên nghiệp, chuyên tìm lỗi và đánh giá tính nhất quán trong tiểu thuyết. Phân tích cực kỳ tỉ mỉ.',
            analysisPrompt
        );

        const analysisResult = await callOrbitAPI(apiKey, model, analysisMessages, 6144, 3, { signal: options.signal });
        const analysisText = analysisResult?.text || analysisResult || '';

        onProgress?.('📖 Bước 2/3: Tóm tắt thiết lập thế giới...');

        // Step 2: Build world-building summary
        const worldPrompt = `Dựa trên phân tích các chương truyện "${story.title || ''}":

${analysisText.substring(0, 6000)}

Nội dung một số chương:
${chapterTexts.substring(0, 8000)}

Hãy tóm tắt TOÀN BỘ thế giới đã được thiết lập trong truyện:
1. Bối cảnh chính (thời đại, địa điểm, xã hội)
2. Hệ thống sức mạnh/tu luyện (nếu có) — các cấp bậc, quy tắc ĐÃ XÁC NHẬN
3. Các tổ chức/thế lực ĐÃ XUẤT HIỆN
4. Các quy tắc/logic DỤNG ĐÃ THIẾT LẬP (không được vi phạm khi viết tiếp)
5. Danh sách các bí ẩn/xung đột CHƯA GIẢI QUYẾT
6. Gợi ý hướng đi tiếp theo dựa trên foreshadowing

Trả lời cực kỳ chi tiết, đây là "source of truth" cho AI viết tiếp.`;

        const worldMessages = buildMessages(
            'Bạn là người ghi chép lore cho tiểu thuyết mạng. Tổng hợp mọi thông tin đã thiết lập.',
            worldPrompt
        );

        const worldResult = await callOrbitAPI(apiKey, model, worldMessages, 6144, 3, { signal: options.signal });
        const worldText = worldResult?.text || worldResult || '';

        onProgress?.('📋 Bước 3/3: Tổng hợp báo cáo...');

        // Step 3: Structure into JSON
        const structurePrompt = `Tổng hợp phân tích sau thành JSON (trả về JSON thuần):

=== PHÂN TÍCH ===
${analysisText.substring(0, 6000)}

=== THẾ GIỚI ===
${worldText.substring(0, 6000)}

JSON format:
{
  "plotHoles": [
    {"severity": "high|medium|low", "description": "mô tả lỗ hổng", "chapters": ["chương liên quan"], "suggestion": "gợi ý sửa"}
  ],
  "worldBuilding": {
    "setting": "bối cảnh đã thiết lập",
    "powerSystem": "hệ thống sức mạnh đã xác nhận",
    "organizations": ["tổ chức 1", "tổ chức 2"],
    "establishedRules": ["quy tắc 1", "quy tắc 2"],
    "locations": ["địa điểm 1", "địa điểm 2"]
  },
  "foreshadowing": [
    {"thread": "manh mối", "chapters": ["chương liên quan"], "possiblePayoff": "gợi ý kết quả"}
  ],
  "characterTracker": [
    {"name": "nhân vật", "consistency": "nhất quán/có vấn đề", "notes": "ghi chú"}
  ],
  "unresolvedConflicts": ["xung đột 1", "xung đột 2"],
  "suggestedDirections": ["hướng đi 1", "hướng đi 2"],
  "qualityScore": 0-100,
  "chaptersAnalyzed": ${writtenChapters.length}
}`;

        const structureMessages = buildMessages(
            'Chỉ trả về JSON thuần, không markdown, không giải thích.',
            structurePrompt
        );

        const structureResult = await callOrbitAPI(apiKey, model, structureMessages, 6144, 3, { signal: options.signal });

        let selfData;
        try {
            const jsonStr = (structureResult || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            selfData = JSON.parse(jsonStr);
        } catch (e) {
            selfData = {
                rawData: analysisText + '\n\n' + worldText,
                parseError: true,
            };
        }

        selfData._timestamp = Date.now();
        selfData._type = 'self';
        return selfData;
    },

    /**
     * Quick Style Research — lightweight auto-research for Extension users
     * Runs automatically before writing if no research data exists.
     * Searches SangTacViet for 1 story matching genre, reads 2-3 chapters,
     * and extracts style patterns via AI.
     * 
     * @param {string} apiKey
     * @param {object} story
     * @param {object} options - { model, onProgress, signal, existingData }
     * @returns {object|null} - Quick style guide or null if failed/skipped
     */
    async quickStyleResearch(apiKey, story, options = {}) {
        const { model, onProgress, signal, existingData } = options;
        const QUICK_TIMEOUT_MS = 60000;

        // Overall timeout controller
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), QUICK_TIMEOUT_MS);
        const mergedSignal = signal
            ? AbortSignal.any([signal, timeoutController.signal])
            : timeoutController.signal;

        // Track already-read chapter URLs to avoid repeats
        const alreadyReadUrls = new Set(existingData?.readChapterUrls || []);
        const previousAnalyses = existingData?.allAnalyses || [];

        try {
            // Step 1: Determine search query from genre
            const genres = story.genres || [story.genre || 'other'];
            const genreNames = genres.map(g => {
                const mapped = GENRE_SEARCH_MAP[g];
                return mapped ? mapped[0] : g;
            }).filter(Boolean);
            const searchQuery = genreNames[0] || story.title || 'tiểu thuyết';

            // Step 2: Use existing story or search for one
            let storyUrl = existingData?.sourceUrl;
            let storyTitle = existingData?.sourceTitle;

            if (!storyUrl) {
                onProgress?.('🔍 Quick Research: Tìm truyện tham khảo...');
                console.log(`🔍 quickStyleResearch: Searching "${searchQuery}"...`);
                rateLimiter.reset();
                const results = await searchSangtacviet(searchQuery, onProgress, mergedSignal);
                if (!results || results.length === 0) {
                    console.log('🔍 quickStyleResearch: No stories found, skipping');
                    return null;
                }
                storyUrl = results[0].url;
                storyTitle = results[0].title;
            }

            onProgress?.(`📖 Quick Research: Đọc "${storyTitle}"...`);
            console.log(`📖 quickStyleResearch: Reading "${storyTitle}" (${alreadyReadUrls.size} chapters already read)...`);

            // Step 3: Fetch story detail
            rateLimiter.reset();
            const detail = await fetchStoryDetail(storyUrl, onProgress, mergedSignal);
            if (!detail || detail.chapters.length === 0) {
                console.log('🔍 quickStyleResearch: No chapters found, skipping');
                return existingData || null;
            }

            // Filter out already-read chapters
            const unreadChapters = detail.chapters.filter(ch => !alreadyReadUrls.has(ch.url));

            if (unreadChapters.length === 0) {
                onProgress?.('📚 Quick Research: Đã đọc hết truyện tham khảo, tìm truyện mới...');
                console.log('📖 quickStyleResearch: All chapters read, searching for new story...');

                // Search for a different story
                rateLimiter.reset();
                const results = await searchSangtacviet(searchQuery, onProgress, mergedSignal);
                const newStory = results?.find(r => r.url !== storyUrl);
                if (!newStory) {
                    console.log('🔍 quickStyleResearch: No new stories found');
                    return existingData || null;
                }

                // Recurse with the new story (reset readChapterUrls for new story)
                return this.quickStyleResearch(apiKey, story, {
                    ...options,
                    existingData: {
                        ...existingData,
                        sourceUrl: newStory.url,
                        sourceTitle: newStory.title,
                        readChapterUrls: [...alreadyReadUrls], // keep old URLs to not re-read
                    },
                });
            }

            // Pick next batch: up to 5 unread chapters (strategic if first run, sequential otherwise)
            const MAX_PER_RUN = 5;
            let chaptersToRead;
            if (alreadyReadUrls.size === 0) {
                // First run: strategic selection from all chapters
                chaptersToRead = selectStrategicChapters(detail.chapters).slice(0, MAX_PER_RUN);
            } else {
                // Subsequent runs: take next sequential unread chapters
                chaptersToRead = unreadChapters.slice(0, MAX_PER_RUN);
            }

            const texts = [];
            const newReadUrls = [];
            for (let i = 0; i < chaptersToRead.length; i++) {
                if (mergedSignal.aborted) break;
                onProgress?.(`📖 Quick Research: Đọc chương ${i + 1}/${chaptersToRead.length} (tổng đã đọc: ${alreadyReadUrls.size + i})...`);
                const content = await fetchChapterContent(chaptersToRead[i].url, onProgress, mergedSignal);
                if (content && content.length > 100) {
                    texts.push(content);
                }
                newReadUrls.push(chaptersToRead[i].url);
            }

            if (texts.length === 0) {
                console.log('🔍 quickStyleResearch: No chapter content, skipping');
                return existingData || null;
            }

            // Step 4: AI analysis
            onProgress?.('🧠 Quick Research: AI phân tích phong cách...');
            console.log(`🧠 quickStyleResearch: Analyzing ${texts.length} new chapters (${texts.reduce((s, t) => s + t.length, 0)} chars)...`);

            const sampleText = texts.join('\n\n---\n\n');
            const runNumber = previousAnalyses.length + 1;
            const analysisPrompt = `Phân tích phong cách viết của truyện "${detail.title || storyTitle}" (thể loại: ${genreNames.join(', ')}).
Đây là lần phân tích thứ ${runNumber}. ${previousAnalyses.length > 0 ? 'Tập trung vào ĐIỂM MỚI chưa xuất hiện trong các lần trước.' : ''}

<sample_chapters>
${sampleText.slice(0, 12000)}
</sample_chapters>

${previousAnalyses.length > 0 ? `<previous_analysis>\n${previousAnalyses[previousAnalyses.length - 1].slice(0, 2000)}\n</previous_analysis>\n\nHãy BỔ SUNG thêm kỹ thuật mới, KHÔNG lặp lại những gì đã phân tích.` : ''}

Hãy tổng hợp thành HƯỚNG DẪN VIẾT chi tiết để AI áp dụng:

1. **Văn phong**: Giọng văn, nhịp điệu, cách dùng từ đặc trưng, ngôi kể
2. **Kỹ thuật miêu tả**: Cách tả cảnh, nhân vật, hành động, cảm xúc
3. **Đối thoại**: Phong cách hội thoại, đặc điểm ngôn ngữ nhân vật
4. **Cấu trúc**: Cách mở đầu/kết thúc chương, chuyển cảnh, nhịp điệu nhanh/chậm
5. **Kỹ thuật gây hấp dẫn**: Cliffhanger, foreshadowing, tension building
6. **Từ vựng đặc trưng**: 20-30 cụm từ/thành ngữ hay dùng trong thể loại
7. **Lỗi cần tránh**: Những cái CẤM KỴ trong thể loại này

Viết CHI TIẾT với VÍ DỤ CỤ THỂ trích từ văn bản mẫu.`;

            const messages = buildMessages(
                'Bạn là chuyên gia phân tích văn học. Trích xuất kỹ thuật viết để AI áp dụng.',
                analysisPrompt
            );

            const result = await callOrbitAPI(apiKey, model || 'gemini-3-flash-preview', messages, 2048, 2, { signal: mergedSignal });
            const analysisText = typeof result === 'object' ? (result.text || '') : (result || '');

            if (!analysisText || analysisText.length < 50) {
                console.log('🔍 quickStyleResearch: Analysis too short, skipping');
                return existingData || null;
            }

            // Merge all analyses into one combined styleAnalysis
            const updatedAnalyses = [...previousAnalyses, analysisText];
            const combinedStyle = updatedAnalyses.join('\n\n─── Phân tích bổ sung ───\n\n');

            const quickStyle = {
                _type: 'quickStyle',
                _timestamp: Date.now(),
                sourceTitle: storyTitle || detail.title,
                sourceUrl: storyUrl,
                genreNames,
                chaptersRead: alreadyReadUrls.size + newReadUrls.length,
                totalChaptersAvailable: detail.chapters.length,
                readChapterUrls: [...alreadyReadUrls, ...newReadUrls],
                allAnalyses: updatedAnalyses,
                styleAnalysis: combinedStyle,
            };

            onProgress?.(`✅ Quick Research: Hoàn tất! (${quickStyle.chaptersRead}/${detail.chapters.length} chương đã đọc)`);
            console.log(`✅ quickStyleResearch: Done — "${storyTitle}" (${quickStyle.chaptersRead}/${detail.chapters.length} chapters read, run #${runNumber})`);

            return quickStyle;

        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('🔍 quickStyleResearch: Timeout or aborted, skipping');
            } else {
                console.warn('🔍 quickStyleResearch: Error:', e.message);
            }
            return existingData || null;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    /**
     * Build prompt injection text from research data
     * Enhanced with dynamic context filtering — prioritizes relevant sections based on scene type
     * 
     * @param {object} researchData - Fan fiction research data
     * @param {object} styleGuide - Style guide data
     * @param {object} charResearch - Deep character research data (optional)
     * @param {object} selfData - Self-research data (optional)
     * @param {object} contextHint - { sceneType: 'combat'|'dialogue'|'worldbuilding'|'emotional'|null }
     */
    buildResearchPrompt(researchData, styleGuide, charResearch = null, selfData = null, contextHint = null) {
        const parts = [];
        const sceneType = contextHint?.sceneType || null;

        // ─── Original Research Data ───
        if (researchData && !researchData.parseError) {
            parts.push('═══ THÔNG TIN TRUYỆN GỐC (ĐỒNG NHÂN) ═══');
            if (researchData.originalTitle) parts.push(`Truyện gốc: ${researchData.originalTitle}`);
            if (researchData.author) parts.push(`Tác giả: ${researchData.author}`);
            if (researchData.summary) parts.push(`Tóm tắt: ${researchData.summary}`);

            // Dynamic: power system prioritized for combat scenes
            if (researchData.powerSystem && (!sceneType || sceneType === 'combat' || sceneType === 'worldbuilding')) {
                parts.push(`\nHệ thống sức mạnh: ${researchData.powerSystem}`);
            }
            if (researchData.worldRules && (!sceneType || sceneType === 'worldbuilding')) {
                parts.push(`Thế giới: ${researchData.worldRules}`);
            }
            if (researchData.terminology?.length) {
                parts.push(`Thuật ngữ: ${researchData.terminology.join(', ')}`);
            }
            // Dynamic: characters always included but more detail for dialogue scenes
            if (researchData.characters?.length) {
                parts.push('\nNhân vật chính:');
                const charLimit = sceneType === 'dialogue' ? 15 : 10;
                researchData.characters.slice(0, charLimit).forEach(c => {
                    parts.push(`- ${c.name}: ${c.role || ''} | ${c.personality || ''} | ${c.abilities || ''}`);
                });
            }
            if (researchData.commonPhrases?.length && (!sceneType || sceneType === 'dialogue')) {
                parts.push(`\nCụm từ đặc trưng: ${researchData.commonPhrases.slice(0, 20).join(', ')}`);
            }
            if (researchData.writingStyle) {
                const ws = researchData.writingStyle;
                parts.push(`\nPhong cách: ${ws.tone || ''}`);
                if (ws.combatStyle && (!sceneType || sceneType === 'combat')) {
                    parts.push(`Chiến đấu: ${ws.combatStyle}`);
                }
                if (ws.dialogueStyle && (!sceneType || sceneType === 'dialogue')) {
                    parts.push(`Thoại: ${ws.dialogueStyle}`);
                }
                if (ws.conventions?.length) parts.push(`Quy tắc: ${ws.conventions.join('; ')}`);
            }
        } else if (researchData?.rawData) {
            parts.push('═══ DỮ LIỆU NGHIÊN CỨU ═══');
            parts.push(researchData.rawData.substring(0, 3000));
        }

        // ─── Style Guide ───
        if (styleGuide && !styleGuide.parseError) {
            parts.push('\n═══ HƯỚNG DẪN PHONG CÁCH VIẾT ═══');
            if (styleGuide.combatTemplate && (!sceneType || sceneType === 'combat')) {
                parts.push(`Chiến đấu: ${styleGuide.combatTemplate}`);
            }
            if (styleGuide.dialogueGuide && (!sceneType || sceneType === 'dialogue')) {
                parts.push(`Thoại: ${styleGuide.dialogueGuide}`);
            }
            if (styleGuide.tensionTechniques?.length) parts.push(`Tạo căng thẳng: ${styleGuide.tensionTechniques.join('; ')}`);
            if (styleGuide.pacingGuide) parts.push(`Nhịp điệu: ${styleGuide.pacingGuide}`);
            if (styleGuide.chapterOpeners?.length) parts.push(`Mở chương: ${styleGuide.chapterOpeners.slice(0, 3).join(' | ')}`);
            if (styleGuide.chapterClosers?.length) parts.push(`Kết chương: ${styleGuide.chapterClosers.slice(0, 3).join(' | ')}`);
            if (styleGuide.genreVocabulary?.length) parts.push(`Từ vựng: ${styleGuide.genreVocabulary.slice(0, 30).join(', ')}`);
            if (styleGuide.taboos?.length) parts.push(`CẤM KỴ: ${styleGuide.taboos.join('; ')}`);
            if (styleGuide.styleExamples?.length) {
                parts.push('Ví dụ hay:');
                styleGuide.styleExamples.slice(0, 3).forEach(ex => parts.push(`"${ex}"`));
            }
        } else if (styleGuide?.rawGuide) {
            parts.push('\n═══ HƯỚNG DẪN PHONG CÁCH ═══');
            parts.push(styleGuide.rawGuide.substring(0, 3000));
        }

        // ─── Deep Character Research (Mode 3) ───
        if (charResearch && !charResearch.parseError && charResearch.characters?.length) {
            parts.push('\n═══ HỒ SƠ TÂM LÝ NHÂN VẬT CHI TIẾT ═══');
            // Prioritize more detail for dialogue/emotional scenes
            const detailLevel = (sceneType === 'dialogue' || sceneType === 'emotional') ? 'full' : 'summary';

            charResearch.characters.slice(0, 8).forEach(c => {
                const charParts = [`\n【${c.name}】`];

                if (c.psychology) {
                    charParts.push(`Tính cách: ${c.psychology.personality || ''}`);
                    if (detailLevel === 'full') {
                        if (c.psychology.motivation) charParts.push(`Động cơ: ${c.psychology.motivation}`);
                        if (c.psychology.fears) charParts.push(`Nỗi sợ: ${c.psychology.fears}`);
                        if (c.psychology.moralCode) charParts.push(`Nguyên tắc: ${c.psychology.moralCode}`);
                    }
                }

                if (c.speechPatterns) {
                    charParts.push(`Giọng nói: ${c.speechPatterns.style || ''}`);
                    if (c.speechPatterns.catchphrases?.length) {
                        charParts.push(`Câu cửa miệng: ${c.speechPatterns.catchphrases.join('; ')}`);
                    }
                    if (detailLevel === 'full' && c.speechPatterns.addressTerms) {
                        const terms = Object.entries(c.speechPatterns.addressTerms)
                            .map(([k, v]) => `${k}→${v}`).join(', ');
                        if (terms) charParts.push(`Xưng hô: ${terms}`);
                    }
                }

                if (c.emotionalResponses && (detailLevel === 'full' || sceneType === 'emotional')) {
                    const er = c.emotionalResponses;
                    charParts.push(`Khi tức: ${er.angry || ''} | Khi vui: ${er.happy || ''}`);
                }

                if (c.relationships?.length && detailLevel === 'full') {
                    const rels = c.relationships.slice(0, 3)
                        .map(r => `${r.with}: ${r.dynamics || r.type || ''}`).join('; ');
                    charParts.push(`Quan hệ: ${rels}`);
                }

                parts.push(charParts.join('\n'));
            });

            if (charResearch.interactionRules?.length) {
                parts.push(`\nQuy tắc tương tác: ${charResearch.interactionRules.join('; ')}`);
            }
        }

        // ─── Self-Research / Plot Hole Warnings (Mode 4) ───
        if (selfData && !selfData.parseError) {
            // Always show plot hole warnings — these are critical
            if (selfData.plotHoles?.length) {
                parts.push('\n═══ ⚠️ CẢNH BÁO MÂU THUẪN — KHÔNG ĐƯỢC LẶP LẠI ═══');
                selfData.plotHoles.forEach(hole => {
                    const severity = hole.severity === 'high' ? '🔴' : hole.severity === 'medium' ? '🟡' : '🟢';
                    parts.push(`${severity} ${hole.description}${hole.suggestion ? ` → Gợi ý: ${hole.suggestion}` : ''}`);
                });
            }

            // World-building rules — always relevant
            if (selfData.worldBuilding) {
                const wb = selfData.worldBuilding;
                if (wb.establishedRules?.length) {
                    parts.push(`\n【QUY TẮC ĐÃ THIẾT LẬP — KHÔNG ĐƯỢC VI PHẠM】`);
                    wb.establishedRules.forEach(r => parts.push(`✓ ${r}`));
                }
                if (wb.powerSystem && (!sceneType || sceneType === 'combat')) {
                    parts.push(`Hệ thống sức mạnh (từ nội dung đã viết): ${wb.powerSystem}`);
                }
            }

            // Unresolved conflicts — help AI continue story threads
            if (selfData.unresolvedConflicts?.length) {
                parts.push(`\n【XUNG ĐỘT CHƯA GIẢI QUYẾT】: ${selfData.unresolvedConflicts.join('; ')}`);
            }

            // Foreshadowing threads for awareness
            if (selfData.foreshadowing?.length) {
                parts.push(`\n【MANH MỐI ĐÃ GIEO】`);
                selfData.foreshadowing.slice(0, 5).forEach(f => {
                    parts.push(`→ ${f.thread}${f.possiblePayoff ? ` (có thể dẫn tới: ${f.possiblePayoff})` : ''}`);
                });
            }
        } else if (selfData?.rawData) {
            parts.push('\n═══ TỰ PHÂN TÍCH ═══');
            parts.push(selfData.rawData.substring(0, 2000));
        }

        return parts.length > 0 ? parts.join('\n') : '';
    }
};
