/**
 * RAGLogger — Provenance tracking and metrics for RAG pipeline.
 * Singleton service that logs every retrieval query with:
 *   - Chunk IDs and scores used to build context
 *   - Confidence level and score
 *   - Latency and cache hit status
 *   - Timestamp for audit trail
 *
 * In-memory ring buffer (last 100 queries). No persistence needed.
 */

const MAX_LOG_SIZE = 100;
let _queryLog = [];
let _queryCounter = 0;

/**
 * Generate a unique query ID.
 */
function generateQueryId() {
    _queryCounter++;
    return `rag-${Date.now()}-${_queryCounter}`;
}

/**
 * Log a RAG query for provenance and metrics tracking.
 *
 * @param {Object} entry
 * @param {string} entry.query - Search query text
 * @param {Array} entry.chunkIds - IDs of chunks used in context
 * @param {Array} [entry.scores] - Corresponding scores
 * @param {Object} [entry.confidence] - {score, level, reason}
 * @param {number} [entry.latencyMs] - Query latency in ms
 * @param {boolean} [entry.cacheHit=false] - Was result from cache?
 * @param {string} [entry.intent] - User intent (chat, continue_writing, etc.)
 * @param {Array} [entry.sourceMap] - Source map with citations
 * @returns {string} queryId for reference
 */
function logQuery(entry) {
    const queryId = generateQueryId();
    const record = {
        queryId,
        timestamp: new Date().toISOString(),
        query: (entry.query || '').slice(0, 200),
        chunkIds: entry.chunkIds || [],
        scores: entry.scores || [],
        confidence: entry.confidence || null,
        latencyMs: entry.latencyMs || 0,
        cacheHit: entry.cacheHit || false,
        intent: entry.intent || 'unknown',
        sourceCount: entry.sourceMap?.length || 0
    };

    _queryLog.push(record);
    // Ring buffer eviction
    if (_queryLog.length > MAX_LOG_SIZE) {
        _queryLog = _queryLog.slice(-MAX_LOG_SIZE);
    }

    console.log(`📝 Provenance logged: queryId=${queryId}, ${record.chunkIds.length} chunks, confidence=${record.confidence?.level || 'n/a'}, latency=${record.latencyMs}ms${record.cacheHit ? ' (CACHE HIT)' : ''}`);

    return queryId;
}

/**
 * Get aggregate metrics from logged queries.
 * @returns {Object} Metrics summary
 */
function getMetrics() {
    const total = _queryLog.length;
    if (total === 0) {
        return {
            totalQueries: 0,
            cacheHitRate: 0,
            avgLatencyMs: 0,
            avgConfidence: 0,
            avgChunksUsed: 0,
            intentBreakdown: {}
        };
    }

    const cacheHits = _queryLog.filter(q => q.cacheHit).length;
    const avgLatency = _queryLog.reduce((s, q) => s + q.latencyMs, 0) / total;
    const withConfidence = _queryLog.filter(q => q.confidence?.score != null);
    const avgConfidence = withConfidence.length > 0
        ? withConfidence.reduce((s, q) => s + q.confidence.score, 0) / withConfidence.length
        : 0;
    const avgChunks = _queryLog.reduce((s, q) => s + q.chunkIds.length, 0) / total;

    // Intent breakdown
    const intentBreakdown = {};
    _queryLog.forEach(q => {
        intentBreakdown[q.intent] = (intentBreakdown[q.intent] || 0) + 1;
    });

    return {
        totalQueries: total,
        cacheHitRate: (cacheHits / total * 100).toFixed(1) + '%',
        avgLatencyMs: Math.round(avgLatency),
        avgConfidence: avgConfidence.toFixed(2),
        avgChunksUsed: avgChunks.toFixed(1),
        intentBreakdown
    };
}

/**
 * Get provenance for a specific query by ID.
 * @param {string} queryId
 * @returns {Object|null} Query record or null if not found
 */
function getProvenance(queryId) {
    return _queryLog.find(q => q.queryId === queryId) || null;
}

/**
 * Get recent query log entries.
 * @param {number} [count=10]
 * @returns {Array}
 */
function getRecentQueries(count = 10) {
    return _queryLog.slice(-count).reverse();
}

/**
 * Clear all logged queries (for testing).
 */
function clearLog() {
    _queryLog = [];
    _queryCounter = 0;
}

export const RAGLogger = {
    logQuery,
    getMetrics,
    getProvenance,
    getRecentQueries,
    clearLog
};
