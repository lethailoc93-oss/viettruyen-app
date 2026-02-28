// ================================================
// RAG Search — Contextual Query, Context Packing,
// Confidence Scoring, Footnotes, Embedding RAG
// ================================================

import { EmbeddingService } from '../embeddingService';
import { RAGLogger } from '../ragLogger';
import { estimateTokens } from './ragEntityBuilders';

/**
 * Build an enriched query by adding context from the story, chapter, and chat history.
 */
export function buildContextualQuery(options = {}) {
    const {
        query = '',
        currentChapterId = null,
        story = null,
        chatHistory = [],
        userIntent = 'general'
    } = options;

    const parts = [];

    if (query) parts.push(query);

    if (currentChapterId && story?.database?.chapters) {
        const chapter = story.database.chapters.find(c => c.id === currentChapterId);
        if (chapter) {
            if (chapter.title) parts.push(chapter.title);
            if (chapter.summary) parts.push(chapter.summary);
            if (chapter.content && userIntent === 'continue_writing') {
                parts.push(chapter.content.slice(-200));
            }
        }
    }

    if (chatHistory.length > 0) {
        const recentUserMsgs = chatHistory
            .filter(m => m.role === 'user')
            .slice(-3)
            .map(m => m.content)
            .join(' ');
        if (recentUserMsgs) {
            parts.push(recentUserMsgs.slice(0, 200));
        }
    }

    const intentKeywords = {
        continue_writing: 'tiếp tục viết nội dung chương',
        chat: '',
        write_chapter: 'viết trọn chương nội dung',
        general: ''
    };
    const intentKw = intentKeywords[userIntent] || '';
    if (intentKw) parts.push(intentKw);

    if (parts.length === 0 && story?.title) {
        parts.push(story.title);
    }

    const enriched = parts.join(' ').trim();
    if (enriched !== query) {
        console.log(`🔍 Contextual query enriched: "${enriched.slice(0, 120)}..."`);
    }
    return enriched || 'nội dung truyện';
}

/**
 * Pack search results + keyword RAG into a token-budgeted context.
 * Tier allocation: critical (50%) > relevant (35%) > background (15%).
 */
export function packContextWithBudget(results, keywordRAG, options = {}) {
    const { maxTotalTokens = 15000 } = options;

    const criticalBudget = Math.floor(maxTotalTokens * 0.50);
    const relevantBudget = Math.floor(maxTotalTokens * 0.35);
    const backgroundBudget = Math.floor(maxTotalTokens * 0.15);

    const sourceMap = [];
    let sourceIdx = 1;

    // Tier 1: Critical
    const critical = results.filter(r => (r.priority || 0) >= 4);
    const criticalParts = [];
    let criticalTokens = 0;

    for (const r of critical) {
        const tokens = estimateTokens(r.text);
        if (criticalTokens + tokens > criticalBudget) break;
        const label = `[Nguồn ${sourceIdx}]`;
        criticalParts.push(`${label} ${r.text}`);
        sourceMap.push({ idx: sourceIdx, source: r.source, docType: r.docType, text: r.text.slice(0, 100) });
        sourceIdx++;
        criticalTokens += tokens;
    }

    // Tier 2: Relevant
    const relevant = results.filter(r => (r.priority || 0) < 4 && r.score > 0);
    const relevantParts = [];
    let relevantTokens = 0;

    for (const r of relevant) {
        const tokens = estimateTokens(r.text);
        if (relevantTokens + tokens > relevantBudget) break;
        const label = `[Nguồn ${sourceIdx}]`;
        relevantParts.push(`${label} ${r.text}`);
        sourceMap.push({ idx: sourceIdx, source: r.source, docType: r.docType, text: r.text.slice(0, 100) });
        sourceIdx++;
        relevantTokens += tokens;
    }

    // Tier 3: Background
    let backgroundText = keywordRAG.contextText || '';
    const bgTokens = estimateTokens(backgroundText);
    if (bgTokens > backgroundBudget) {
        backgroundText = backgroundText.slice(0, backgroundBudget * 3.5);
    }

    // Assemble
    const sections = [];
    if (criticalParts.length > 0) {
        sections.push(`DỮ LIỆU QUAN TRỌNG (ưu tiên cao):\n${criticalParts.join('\n')}`);
    }
    if (relevantParts.length > 0) {
        sections.push(`NGỮ CẢNH LIÊN QUAN:\n${relevantParts.join('\n')}`);
    }
    if (backgroundText.trim()) {
        sections.push(`THÔNG TIN NỀN:\n${backgroundText}`);
    }

    const groundingHeader = sourceMap.length > 0
        ? `Dưới đây là ${sourceMap.length} nguồn dữ liệu [Nguồn 1]-[Nguồn ${sourceMap.length}].\nKhi sử dụng thông tin, trích dẫn nguồn gốc. Nếu không có dữ liệu → nêu rõ.\n`
        : '';

    const contextText = `${groundingHeader}\n${sections.join('\n\n')}`;

    const tokenBreakdown = {
        critical: criticalTokens,
        relevant: relevantTokens,
        background: estimateTokens(backgroundText),
        total: estimateTokens(contextText),
        sources: sourceMap.length
    };

    console.log(`📊 Context packed: ${criticalParts.length} critical + ${relevantParts.length} relevant + background (${tokenBreakdown.total} tokens, ${sourceMap.length} sources)`);

    return { contextText, sourceMap, tokenBreakdown };
}

/**
 * Compute retrieval confidence score.
 */
export function computeConfidenceScore(results, query) {
    if (!results || results.length === 0) {
        return { score: 0, level: 'low', reason: 'Không tìm thấy dữ liệu liên quan' };
    }

    const topN = results.slice(0, 5);
    const avgScore = topN.reduce((s, r) => s + (r.score || 0), 0) / topN.length;

    const sourceTypes = new Set(results.map(r => r.source).filter(Boolean));
    const possibleTypes = ['chapter', 'chapter-summary', 'character', 'setting', 'plot', 'timeline', 'reference'];
    const coverage = sourceTypes.size / possibleTypes.length;

    const queryLower = (query || '').toLowerCase();
    const hasCharMatch = results.some(r =>
        r.characterNames?.some(cn => queryLower.includes(cn.toLowerCase()))
    );
    const specificity = hasCharMatch ? 1.0 : 0.3;

    const topQuality = Math.min(1, (results[0]?.score || 0) * 2);

    const confidence = (
        0.35 * avgScore * 2 +
        0.20 * coverage +
        0.20 * specificity +
        0.25 * topQuality
    );
    const score = Math.min(1, Math.max(0, confidence));

    let level, reason;
    if (score >= 0.6) {
        level = 'high';
        reason = `Độ tin cậy cao (${(score * 100).toFixed(0)}%): đủ dữ liệu từ ${sourceTypes.size} loại nguồn`;
    } else if (score >= 0.3) {
        level = 'medium';
        reason = `Độ tin cậy trung bình (${(score * 100).toFixed(0)}%): dữ liệu hạn chế, cần thận trọng`;
    } else {
        level = 'low';
        reason = `Độ tin cậy thấp (${(score * 100).toFixed(0)}%): thiếu dữ liệu nguồn`;
    }

    console.log(`🔒 Confidence: score=${score.toFixed(2)} level=${level} (${sourceTypes.size} source types, avgScore=${avgScore.toFixed(3)})`);

    return { score, level, reason };
}

// ================================================
// Source Footnotes & Explainability
// ================================================

/**
 * Build readable source footnotes from sourceMap.
 */
export function buildSourceFootnotes(sourceMap) {
    if (!sourceMap || sourceMap.length === 0) return '';

    const typeLabels = {
        chapter: 'Chương', 'chapter-summary': 'Tóm tắt',
        character: 'Nhân vật', setting: 'Bối cảnh',
        plot: 'Cốt truyện', timeline: 'Mốc thời gian',
        reference: 'Tham khảo'
    };

    const lines = sourceMap.map(s => {
        const label = typeLabels[s.source] || s.docType || s.source;
        return `[Nguồn ${s.idx}] (${label}) ${s.text}...`;
    });

    return `\n── CHÚ THÍCH NGUỒN ──\n${lines.join('\n')}`;
}

/**
 * Build explainability annotations for search results.
 */
export function buildExplainability(results, sourceMap) {
    return results.map((r, i) => {
        const sig = r.signals || {};
        return {
            sourceIdx: (sourceMap || [])[i]?.idx || i + 1,
            id: r.id,
            score: r.score?.toFixed(3) || '0',
            signals: {
                dense: sig.dense?.toFixed(2) || '-',
                sparse: sig.sparse?.toFixed(2) || '-',
                metadata: sig.metadata?.toFixed(2) || '-',
                freshness: sig.freshness?.toFixed(2) || '-',
                coverage: sig.coverage?.toFixed(2) || '-'
            },
            source: r.source || 'unknown',
            docType: r.docType || 'unknown',
            reason: `dense=${sig.dense?.toFixed(2) || '-'} sparse=${sig.sparse?.toFixed(2) || '-'} meta=${sig.metadata?.toFixed(2) || '-'} fresh=${sig.freshness?.toFixed(2) || '-'} cov=${sig.coverage?.toFixed(2) || '-'}`
        };
    });
}

// ================================================
// Embedding-Enhanced RAG (Hybrid Dense+Sparse)
// ================================================

// In-memory cache for indexed story documents
let _indexedStoryCache = { storyId: null, documents: [], stats: {} };

/**
 * Build RAG context using hybrid search (dense embeddings + BM25 sparse).
 * Falls back to keyword-based buildRAGContext on error.
 *
 * NOTE: buildRAGContext and buildLightContext are imported lazily to avoid
 * circular dependency issues — they are passed via the `fallbacks` parameter
 * from the barrel file.
 */
export async function buildRAGContextWithEmbeddings(story, apiKey, options = {}, fallbacks = {}) {
    const { buildRAGContext: _buildRAGContext, buildLightContext: _buildLightContext } = fallbacks;

    if (!story || !apiKey) {
        const result = _buildRAGContext(story, options);
        return { ...result, usedEmbeddings: false };
    }

    // 1) Build a light context as background
    const lightRAG = _buildLightContext(story, options);

    try {
        const startTime = Date.now();
        const {
            query = '',
            currentChapterId = null,
            maxTotalTokens = story?.maxInputTokens || 15000,
            topK = 15,
            chatHistory = [],
            userIntent = 'general'
        } = options;

        // 2) Index story content
        const storyId = story.id || 'unknown';
        const indexOptions = {
            onProgress: options.onIndexProgress || null
        };
        if (_indexedStoryCache.storyId !== storyId || _indexedStoryCache.documents.length === 0) {
            const { documents, stats } = await EmbeddingService.indexStoryContent(apiKey, story, indexOptions);
            _indexedStoryCache = { storyId, documents, stats, indexedAt: Date.now() };
        } else {
            const { documents, stats } = await EmbeddingService.incrementalIndexStoryContent(
                apiKey, story, _indexedStoryCache.documents, indexOptions
            );
            _indexedStoryCache = { storyId, documents, stats, indexedAt: Date.now() };
            EmbeddingService.invalidateBM25Cache(storyId);
        }

        // 3) Build enriched contextual query
        const searchQuery = buildContextualQuery({
            query, currentChapterId, story, chatHistory, userIntent
        });

        // 4) Current chapter order for freshness boost
        const currentChapter = currentChapterId
            ? (story.database?.chapters || []).find(c => c.id === currentChapterId)
            : null;
        const currentChapterOrder = currentChapter?.order || 0;

        // 5) Hybrid search — enable LLM rerank for writing intents
        const enableLLMRerank = userIntent === 'write_chapter' || userIntent === 'continue_writing';
        const results = await EmbeddingService.hybridSearch(
            apiKey, searchQuery, _indexedStoryCache.documents,
            { topK, storyId, currentChapterOrder, enableLLMRerank }
        );

        // 6) Confidence
        const confidence = computeConfidenceScore(results, searchQuery);

        // 7) Pack context
        const { contextText: packedContext, sourceMap, tokenBreakdown } =
            packContextWithBudget(results, lightRAG, { maxTotalTokens });

        // 8) Confidence warning
        let finalText = packedContext;
        if (confidence.level === 'low') {
            finalText = `⚠️ CẢNH BÁO: ${confidence.reason}\nChỉ viết dựa trên thông tin CÓ SẴN trong nguồn. Nêu rõ "[không đủ dữ liệu]" nếu thiếu thông tin.\n\n${finalText}`;
        } else if (confidence.level === 'medium') {
            finalText = `ℹ️ LƯU Ý: ${confidence.reason}\nƯu tiên dữ liệu nguồn, tránh suy diễn.\n\n${finalText}`;
        }

        // 9) Source footnotes
        const footnotes = buildSourceFootnotes(sourceMap);
        if (footnotes) {
            finalText += footnotes;
        }

        // 10) Explainability
        const explainability = buildExplainability(results, sourceMap);

        const hybridStats = {
            ...lightRAG.stats,
            ..._indexedStoryCache.stats,
            searchResults: results.length,
            denseHits: results.filter(r => r.denseRank !== null).length,
            sparseHits: results.filter(r => r.sparseRank !== null).length,
            bothHits: results.filter(r => r.denseRank !== null && r.sparseRank !== null).length,
            topScore: results[0]?.score || 0,
            confidenceScore: confidence.score,
            confidenceLevel: confidence.level,
            ...tokenBreakdown,
            queryCacheStats: EmbeddingService.getQueryCacheStats()
        };

        const latencyMs = Date.now() - startTime;

        // 11) Log provenance
        const queryId = RAGLogger.logQuery({
            query: searchQuery,
            chunkIds: results.map(r => r.id),
            scores: results.map(r => r.score),
            confidence,
            latencyMs,
            cacheHit: false,
            intent: userIntent,
            sourceMap
        });

        return {
            contextText: finalText,
            coreLorebook: lightRAG.coreLorebook || '',
            stats: hybridStats,
            estimatedTokens: estimateTokens(finalText),
            usedEmbeddings: true,
            confidenceScore: confidence,
            sourceMap,
            explainability,
            queryId,
            latencyMs
        };
    } catch (error) {
        console.warn('⚠️ Hybrid search failed, using keyword RAG only:', error.message);
        const fallbackRAG = _buildRAGContext(story, options);
        return { ...fallbackRAG, usedEmbeddings: false };
    }
}

/**
 * Invalidate cached embeddings & BM25 index for a story.
 */
export function invalidateEmbeddingCache(storyId) {
    if (_indexedStoryCache.storyId === storyId) {
        _indexedStoryCache = { storyId: null, documents: [], stats: {} };
        console.log('🗑️ Embedding cache invalidated for story:', storyId);
    }
    EmbeddingService.invalidateBM25Cache(storyId);
}

/**
 * Get the currently indexed documents for a story (for per-scene micro-RAG).
 * Returns the cached documents array, or empty if not yet indexed.
 */
export function getIndexedDocuments(storyId) {
    if (_indexedStoryCache.storyId === storyId && _indexedStoryCache.documents.length > 0) {
        return _indexedStoryCache.documents;
    }
    return [];
}
