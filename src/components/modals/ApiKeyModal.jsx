import { useState, useEffect } from 'react';
import { useApiKey } from '../../context/ApiKeyContext';
import { Key, Eye, EyeOff, Trash2, Save, ShieldCheck, X, Plus, Cpu, RefreshCw, Zap, Loader2, CheckCircle2, XCircle, Globe, Server, Bot, Settings2, Search } from 'lucide-react';
import { shouldUseDevProxy } from '../../services/apiClient';

const ORBIT_API_URL = 'https://api.orbit-provider.com/v1/chat/completions';

/**
 * Fetch wrapper that routes through dev CORS proxy when on localhost.
 * For POST requests to external APIs that would otherwise fail due to CORS.
 */
async function devProxyFetch(url, options = {}) {
    if (shouldUseDevProxy(url) && options.method === 'POST') {
        // Route through Vite dev proxy middleware
        const res = await fetch('/api/cors-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetUrl: url,
                headers: { Authorization: options.headers?.['Authorization'] || options.headers?.authorization },
                payload: options.body ? JSON.parse(options.body) : undefined,
            }),
            signal: options.signal
        });
        return res;
    }
    return fetch(url, options);
}

// Available models (can also be fetched from API)
const AVAILABLE_MODELS = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash Preview', provider: 'Gemini', tag: 'Mặc định' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro Preview', provider: 'Gemini', tag: 'Mạnh' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Gemini', tag: 'Mới nhất' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Gemini', tag: 'Ổn định' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Gemini', tag: 'Ổn định' },
];

// Validate an API key by making a minimal request
async function validateApiKey(apiKey) {
    try {
        if (apiKey?.startsWith('AIza')) {
            // Google Gemini key — use models.list endpoint (lightweight, no generation cost)
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`;
            const response = await fetch(url);
            if (response.ok) return { valid: true, message: 'Key hoạt động ✓' };
            const err = await response.json().catch(() => ({}));
            const errMsg = err?.error?.message || `HTTP ${response.status}`;
            if (response.status === 400 || response.status === 403) return { valid: false, message: `Key không hợp lệ: ${errMsg}` };
            if (response.status === 429) return { valid: true, message: 'Key hợp lệ (đang bị rate-limit)' };
            return { valid: false, message: `Lỗi: ${errMsg}` };
        } else {
            // Orbit-Provider key — make a tiny chat completion
            const response = await devProxyFetch(ORBIT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'gemini-3-flash-preview',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 1
                })
            });
            if (response.ok) return { valid: true, message: 'Key hoạt động ✓' };
            if (response.status === 401 || response.status === 403) return { valid: false, message: 'Key không hợp lệ hoặc hết hạn' };
            if (response.status === 429) return { valid: true, message: 'Key hợp lệ (đang bị rate-limit)' };
            const err = await response.json().catch(() => ({}));
            return { valid: false, message: err?.error?.message || `Lỗi: HTTP ${response.status}` };
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            return { valid: false, message: 'Không thể kết nối API (CORS hoặc mạng)' };
        }
        return { valid: false, message: `Lỗi: ${error.message}` };
    }
}

export default function ApiKeyModal({ onClose }) {
    const {
        apiKeys, addKey, removeKey, selectedModel, setSelectedModel, isKeySet,
        provider, setProvider, customBaseUrl, setCustomBaseUrl, wsConnected,
        workerProvider, setWorkerProvider, workerBaseUrl, setWorkerBaseUrl,
        workerApiKey, setWorkerApiKey, workerModel, setWorkerModel,
        generationConfig, setGenerationConfig
    } = useApiKey();
    const isWsUrl = customBaseUrl && (customBaseUrl.startsWith('ws://') || customBaseUrl.startsWith('wss://'));
    const [inputKey, setInputKey] = useState('');
    const [showKeys, setShowKeys] = useState({});
    const [saved, setSaved] = useState(false);
    const [customUrlInput, setCustomUrlInput] = useState(customBaseUrl || '');
    // Key validation state
    const [keyStatus, setKeyStatus] = useState({});
    const [testingProxy, setTestingProxy] = useState(false);
    const [proxyTestResult, setProxyTestResult] = useState(null);
    const [extensionStatus, setExtensionStatus] = useState(null); // null | { connected: bool, extensionConnected: bool }

    // Proxy model scanning state
    const [proxyModels, setProxyModels] = useState([]);
    const [scanningModels, setScanningModels] = useState(false);
    const [scanError, setScanError] = useState(null);
    const [modelSearchQuery, setModelSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'generation'

    // Auto-detect extension status when custom WS provider is configured
    useEffect(() => {
        if (provider !== 'custom' || !isWsUrl) {
            setExtensionStatus(null);
            return;
        }
        const checkExtStatus = async () => {
            try {
                const healthUrl = `${customBaseUrl.replace(/\/+$/, '').replace(/^ws/, 'http')}/health`;
                const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    const data = await res.json();
                    setExtensionStatus({ connected: true, extensionConnected: !!data.extensionConnected });
                } else {
                    setExtensionStatus({ connected: false, extensionConnected: false });
                }
            } catch {
                setExtensionStatus({ connected: false, extensionConnected: false });
            }
        };
        checkExtStatus();
        const interval = setInterval(checkExtStatus, 10000);
        return () => clearInterval(interval);
    }, [provider, customBaseUrl, isWsUrl]);

    const handleConfigChange = (field, value) => {
        setGenerationConfig({ [field]: value });
    };

    const handleAddKey = () => {
        if (inputKey.trim()) {
            addKey(inputKey.trim());
            setInputKey('');
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddKey();
        }
    };

    const toggleShowKey = (index) => {
        setShowKeys(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleCheckKey = async (key, index) => {
        setKeyStatus(prev => ({ ...prev, [index]: { status: 'checking', message: 'Đang kiểm tra...' } }));
        const result = await validateApiKey(key);
        setKeyStatus(prev => ({
            ...prev,
            [index]: { status: result.valid ? 'valid' : 'invalid', message: result.message }
        }));
        // Auto-clear status after 8 seconds
        setTimeout(() => {
            setKeyStatus(prev => {
                const next = { ...prev };
                delete next[index];
                return next;
            });
        }, 8000);
    };

    const handleCheckAllKeys = async () => {
        for (let i = 0; i < apiKeys.length; i++) {
            setKeyStatus(prev => ({ ...prev, [i]: { status: 'checking', message: 'Đang kiểm tra...' } }));
        }
        const results = await Promise.all(apiKeys.map(key => validateApiKey(key)));
        const newStatus = {};
        results.forEach((result, i) => {
            newStatus[i] = { status: result.valid ? 'valid' : 'invalid', message: result.message };
        });
        setKeyStatus(newStatus);
        setTimeout(() => setKeyStatus({}), 10000);
    };

    const maskedKey = (key) => {
        if (!key) return '';
        if (key.length <= 8) return '•'.repeat(key.length);
        return key.slice(0, 6) + '•'.repeat(Math.max(0, Math.min(key.length - 10, 20))) + key.slice(-4);
    };

    // Group models by provider
    const geminiModels = AVAILABLE_MODELS.filter(m => m.provider === 'Gemini');
    const claudeModels = AVAILABLE_MODELS.filter(m => m.provider === 'Claude');

    // Fetch models from proxy/API
    const fetchModelsFromProxy = async () => {
        setScanningModels(true);
        setScanError(null);
        setProxyModels([]);
        try {
            let models = [];
            if (provider === 'gemini' && apiKeys.length > 0) {
                // Gemini API — list models
                const key = apiKeys[0];
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) throw new Error(`Gemini API HTTP ${res.status}`);
                const data = await res.json();
                models = (data.models || []).filter(m => m.name && m.supportedGenerationMethods?.includes('generateContent')).map(m => ({
                    id: m.name.replace('models/', ''),
                    displayName: m.displayName || m.name.replace('models/', ''),
                    description: m.description || ''
                }));
            } else if (provider === 'custom' && customBaseUrl) {
                // OpenAI-compatible or WS relay
                let fetchUrl;
                if (customBaseUrl.startsWith('ws://') || customBaseUrl.startsWith('wss://')) {
                    fetchUrl = `${customBaseUrl.replace(/\/+$/, '').replace(/^ws/, 'http')}/models`;
                } else {
                    fetchUrl = `${customBaseUrl.replace(/\/+$/, '')}/models`;
                }
                const headers = {};
                if (apiKeys.length > 0) headers['Authorization'] = `Bearer ${apiKeys[0]}`;
                const res = await fetch(fetchUrl, { headers, signal: AbortSignal.timeout(10000) });
                if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
                const data = await res.json();
                // OpenAI format: { data: [...] } or direct array
                const rawModels = Array.isArray(data) ? data : (data.data || data.models || []);
                models = rawModels.map(m => ({
                    id: m.id || m.name || m,
                    displayName: m.id || m.name || m,
                    description: m.owned_by ? `by ${m.owned_by}` : ''
                }));
            } else {
                throw new Error(provider === 'gemini' ? 'Cần có API Key để quét model Gemini.' : 'Cần cấu hình Base URL proxy trước.');
            }
            if (models.length === 0) {
                setScanError('Không tìm thấy model nào từ proxy.');
            } else {
                setProxyModels(models);
            }
        } catch (err) {
            setScanError(err.message || 'Lỗi khi quét model');
        }
        setScanningModels(false);
    };

    // Filter proxy models by search query
    const filteredProxyModels = proxyModels.filter(m =>
        !modelSearchQuery || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.displayName.toLowerCase().includes(modelSearchQuery.toLowerCase())
    );

    const getStatusIcon = (status) => {
        if (!status) return null;
        if (status.status === 'checking') return <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />;
        if (status.status === 'valid') return <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />;
        return <XCircle size={14} style={{ color: 'var(--color-error)' }} />;
    };

    const getStatusColor = (status) => {
        if (!status) return 'transparent';
        if (status.status === 'checking') return 'rgba(139, 92, 246, 0.1)';
        if (status.status === 'valid') return 'rgba(52, 211, 153, 0.08)';
        return 'rgba(239, 68, 68, 0.08)';
    };

    const getStatusBorder = (status) => {
        if (!status) return '1px solid var(--glass-border)';
        if (status.status === 'valid') return '1px solid var(--color-success)';
        if (status.status === 'invalid') return '1px solid var(--color-error)';
        return '1px solid var(--color-primary)';
    };

    return (
        <div className="mca-modal-overlay active" onClick={(e) => { if (e.target.classList?.contains('modal-overlay')) onClose(); }}>
            <div className="mca-modal" style={{ maxWidth: '650px', width: '95%', maxHeight: '85vh', padding: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="mca-modal-header" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h3 className="mca-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Key size={22} className="text-primary" />
                            Cài đặt AI & API
                        </h3>
                        <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button
                            onClick={() => setActiveTab('general')}
                            style={{
                                padding: '6px 16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                                background: activeTab === 'general' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'general' ? 'white' : 'var(--color-text-secondary)',
                            }}
                        >
                            <Server size={14} /> Chung (API, Model)
                        </button>
                        <button
                            onClick={() => setActiveTab('generation')}
                            style={{
                                padding: '6px 16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                                background: activeTab === 'generation' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'generation' ? 'white' : 'var(--color-text-secondary)',
                            }}
                        >
                            <Settings2 size={14} /> Cấu hình sinh văn bản
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>
                    {activeTab === 'general' ? (
                        <>
                            {/* Status */}
                            <div style={{
                                padding: 'var(--space-sm) var(--space-md)',
                                background: isKeySet ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                border: `1px solid ${isKeySet ? 'var(--color-success)' : 'var(--color-warning)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                marginBottom: 'var(--space-lg)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <ShieldCheck size={16} style={{ color: isKeySet ? 'var(--color-success)' : 'var(--color-warning)' }} />
                                <span style={{ color: isKeySet ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                    {isKeySet ? `${apiKeys.length} API Key đã cài đặt • Đa luồng ${apiKeys.length > 1 ? 'BẬT' : 'TẮT'}` : 'Chưa có API Key'}
                                </span>
                            </div>

                            {/* ============ PROVIDER SELECTION ============ */}
                            <div style={{ marginBottom: 'var(--space-xl)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                    <Globe size={18} className="text-primary" />
                                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Provider</h4>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                    {/* Google Gemini tab */}
                                    <button
                                        onClick={() => setProvider('gemini')}
                                        style={{
                                            padding: 'var(--space-md)',
                                            border: `2px solid ${provider === 'gemini' ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            background: provider === 'gemini' ? 'rgba(139, 92, 246, 0.15)' : 'var(--glass-bg)',
                                            color: 'var(--color-text-primary)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>✦</span>
                                            <strong style={{ fontSize: 'var(--font-size-sm)' }}>Google Gemini</strong>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                            Gọi trực tiếp Gemini API bằng API Key
                                        </div>
                                    </button>

                                    {/* Custom tab */}
                                    <button
                                        onClick={() => setProvider('custom')}
                                        style={{
                                            padding: 'var(--space-md)',
                                            border: `2px solid ${provider === 'custom' ? 'var(--color-warning)' : 'var(--glass-border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            background: provider === 'custom' ? 'rgba(251, 191, 36, 0.1)' : 'var(--glass-bg)',
                                            color: 'var(--color-text-primary)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                                            <Server size={16} />
                                            <strong style={{ fontSize: 'var(--font-size-sm)' }}>Custom (Ollama / LM Studio / GCLI Proxy)</strong>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                            Kết nối qua OpenAI-compatible URL
                                        </div>
                                    </button>
                                </div>

                                {/* Custom provider config */}
                                {provider === 'custom' && (
                                    <div style={{
                                        padding: 'var(--space-md)',
                                        background: 'rgba(251, 191, 36, 0.05)',
                                        border: '1px solid rgba(251, 191, 36, 0.3)',
                                        borderRadius: 'var(--radius-md)'
                                    }}>
                                        <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                                            Base URL
                                        </label>
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={customUrlInput}
                                                onChange={(e) => setCustomUrlInput(e.target.value)}
                                                placeholder="http://localhost:11434/v1"
                                                style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}
                                            />
                                            <button
                                                className="btn btn-primary btn-small"
                                                onClick={() => {
                                                    setCustomBaseUrl(customUrlInput.trim());
                                                    setSaved(true);
                                                    setTimeout(() => setSaved(false), 2000);
                                                }}
                                                disabled={!customUrlInput.trim()}
                                            >
                                                <Save size={14} /> Lưu
                                            </button>
                                            <button
                                                className="btn btn-small"
                                                disabled={!customBaseUrl || testingProxy}
                                                style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}
                                                onClick={async () => {
                                                    setTestingProxy(true);
                                                    setProxyTestResult(null);
                                                    try {
                                                        // Test base connection (useful for both WS Relay and standard OpenAI proxy)
                                                        // Try health check first to detect our ws-relay-server
                                                        let isExtConnected = false;
                                                        let isOurRelay = false;
                                                        try {
                                                            const healthUrl = `${customBaseUrl.replace(/\/+$/, '').replace(/^ws/, 'http')}/health`;
                                                            const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
                                                            if (healthRes.ok) {
                                                                const data = await healthRes.json();
                                                                isOurRelay = true;
                                                                isExtConnected = data.extensionConnected;
                                                            }
                                                        } catch (e) { }

                                                        // Fallback or generic test
                                                        const url = isOurRelay ? `${customBaseUrl.replace(/\/+$/, '').replace(/^ws/, 'http')}/health` : `${customBaseUrl.replace(/\/+$/, '')}/models`;
                                                        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

                                                        if (res.ok) {
                                                            if (isOurRelay) {
                                                                setProxyTestResult({
                                                                    ok: true,
                                                                    msg: isExtConnected ? 'Kết nối Relay thành công (Extension: Đã kết nối ✓)' : 'Kết nối Relay thành công (Extension: Đã ngắt kết nối ❌)'
                                                                });
                                                            } else {
                                                                setProxyTestResult({ ok: true, msg: 'Kết nối thành công ✓' });
                                                            }
                                                        }
                                                        else setProxyTestResult({ ok: false, msg: `HTTP ${res.status}` });
                                                    } catch (e) {
                                                        setProxyTestResult({ ok: false, msg: `Không thể kết nối: ${e.message}` });
                                                    }
                                                    setTestingProxy(false);
                                                    setTimeout(() => setProxyTestResult(null), 8000);
                                                }}
                                            >
                                                {testingProxy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                                                Test
                                            </button>
                                        </div>

                                        {proxyTestResult && (
                                            <div style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: proxyTestResult.ok ? 'var(--color-success)' : 'var(--color-error)',
                                                display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-sm)'
                                            }}>
                                                {proxyTestResult.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                {proxyTestResult.msg}
                                            </div>
                                        )}

                                        {customBaseUrl && (
                                            <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {isWsUrl ? (
                                                    <>
                                                        <span style={{
                                                            width: '8px', height: '8px', borderRadius: '50%',
                                                            background: wsConnected ? 'var(--color-success)' : 'var(--color-error)',
                                                            boxShadow: wsConnected ? '0 0 6px var(--color-success)' : '0 0 6px var(--color-error)',
                                                            display: 'inline-block'
                                                        }} />
                                                        <span style={{ color: wsConnected ? 'var(--color-success)' : 'var(--color-error)' }}>
                                                            {wsConnected ? 'WebSocket đã kết nối ✓' : 'WebSocket chưa kết nối — kiểm tra proxy app'}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span style={{ color: 'var(--color-success)' }}>
                                                        ✅ Đang dùng: <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{customBaseUrl}</code>
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
                                            <strong>Ví dụ URL:</strong><br />
                                            • WS Relay (Gemini Proxy): <code>wss://relay-server.com</code> hoặc <code>ws://localhost:8080</code><br />
                                            • Ollama: <code>http://localhost:11434/v1</code><br />
                                            • LM Studio: <code>http://localhost:1234/v1</code><br />
                                            • OpenAI-compatible: <code>https://your-proxy-domain.com/v1</code><br />
                                            <span style={{ color: 'var(--color-warning)' }}>{isWsUrl
                                                ? '🔌 WebSocket Relay: Proxy app (AI Studio) phải đang chạy và kết nối cùng WS server.'
                                                : '⚠ API Key ở phần dưới sẽ được gửi kèm (Bearer token). Nhập ký tự bất kỳ nếu proxy không yêu cầu key.'
                                            }</span>

                                            {isWsUrl && (
                                                <div style={{ marginTop: 'var(--space-sm)' }}>
                                                    <a
                                                        href="https://ai.studio/apps/6c03026d-de1d-444f-9880-7e6c120413bf"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="btn btn-primary btn-small"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                                                    >
                                                        <Globe size={14} /> Mở App Google AI Studio (Proxy)
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        {/* Extension Guide */}
                                        <div style={{
                                            padding: 'var(--space-md)',
                                            background: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: 'var(--radius-md)',
                                            marginTop: 'var(--space-md)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Globe size={16} className="text-primary" />
                                                    <strong style={{ fontSize: 'var(--font-size-sm)' }}>Browser Extension (Anti-Bot)</strong>
                                                    {extensionStatus && (
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                            fontSize: '0.7rem', fontWeight: 600,
                                                            padding: '2px 8px', borderRadius: '10px',
                                                            background: extensionStatus.extensionConnected ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: extensionStatus.extensionConnected ? 'var(--color-success)' : 'var(--color-error)',
                                                            border: `1px solid ${extensionStatus.extensionConnected ? 'var(--color-success)' : 'var(--color-error)'}`,
                                                        }}>
                                                            <span style={{
                                                                width: '6px', height: '6px', borderRadius: '50%',
                                                                background: extensionStatus.extensionConnected ? 'var(--color-success)' : 'var(--color-error)',
                                                                boxShadow: extensionStatus.extensionConnected ? '0 0 6px var(--color-success)' : 'none',
                                                            }} />
                                                            {extensionStatus.extensionConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                                                        </span>
                                                    )}
                                                </div>
                                                <a
                                                    href="/sangtacviet-bypasser.zip"
                                                    download
                                                    className="btn btn-primary btn-small"
                                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 8px' }}
                                                >
                                                    <Save size={14} /> Tải Extension
                                                </a>
                                            </div>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: extensionStatus?.extensionConnected ? '8px' : '12px' }}>
                                                Để vượt qua Cloudflare khi cào truyện, bạn cần cài đặt Tiện ích mở rộng trung gian.
                                            </p>
                                            {extensionStatus?.extensionConnected && (
                                                <div style={{
                                                    fontSize: 'var(--font-size-xs)', color: 'var(--color-success)',
                                                    padding: '8px 12px', marginBottom: '12px',
                                                    background: 'rgba(52, 211, 153, 0.08)', borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid rgba(52, 211, 153, 0.2)',
                                                    lineHeight: 1.7,
                                                }}>
                                                    ✅ <strong>Tính năng đang hoạt động:</strong><br />
                                                    • Cloudflare Bypass (Cào truyện / Auto Research)<br />
                                                    • Perchance Image (Tạo ảnh miễn phí chất lượng cao)<br />
                                                    • Web Search grounding (Tìm kiếm Google cho AI)<br />
                                                    • Text Extraction (Trích xuất nội dung trang web)
                                                </div>
                                            )}
                                            <details style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>Hướng dẫn cài đặt (Chỉ 1 phút)</summary>
                                                <ol style={{ paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
                                                    <li>Tải và chạy <strong>App Server</strong> (chỉ cần nhấp đúp chạy, có màn hình đen hiện lên là được):
                                                        <a href="/sangtacviet-server.exe" download style={{ marginLeft: '6px', color: 'var(--color-primary)', textDecoration: 'underline' }}>Tải App Server (.exe)</a>
                                                    </li>
                                                    <li>Bấm nút <strong>"Tải Extension"</strong> ở trên cùng mục này để tải file cấp quyền duyệt web (file <code>.zip</code>).</li>
                                                    <li>Giải nén file Extension vừa tải ra thành một thư mục.</li>
                                                    <li>Trên trình duyệt Chrome/Edge/Cốc Cốc, truy cập địa chỉ: <code>chrome://extensions</code></li>
                                                    <li>Bật công tắc <strong>"Developer mode" (Chế độ dành cho nhà phát triển)</strong> ở góc phải trên cùng.</li>
                                                    <li>Bấm nút <strong>"Load unpacked" (Tải tiện ích đã giải nén)</strong> và chọn thư mục vừa giải nén ở bước 3.</li>
                                                    <li>Tiện ích <em>SangTacViet Bypasser</em> sẽ xuất hiện và tự động kết nối (miễn là App Server ở bước 1 đang chạy). Nhấn <strong>Test</strong> ở trên để thử.</li>
                                                </ol>
                                                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--color-error)' }}>
                                                    <strong>Lưu ý:</strong> App Server (.exe) phải luôn được bật trong quá trình bạn dùng tính năng Cào Truyện/Auto Research để ứng dụng có thể vượt rào Cloudflare.
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ============ MODEL SELECTION ============ */}
                            <div style={{ marginBottom: 'var(--space-xl)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                    <Cpu size={18} className="text-primary" />
                                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Chọn Model AI</h4>
                                </div>

                                {/* Gemini Models */}
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
                                        GEMINI
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-xs)' }}>
                                        {geminiModels.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => setSelectedModel(model.id)}
                                                style={{
                                                    padding: 'var(--space-sm) var(--space-md)',
                                                    border: `1px solid ${selectedModel === model.id ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                                                    borderRadius: 'var(--radius-md)',
                                                    background: selectedModel === model.id ? 'rgba(139, 92, 246, 0.15)' : 'var(--glass-bg)',
                                                    color: selectedModel === model.id ? 'var(--color-primary)' : 'var(--color-text-primary)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    fontSize: 'var(--font-size-xs)',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ fontWeight: 500 }}>{model.name}</span>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    background: selectedModel === model.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                                    color: selectedModel === model.id ? 'white' : 'var(--color-text-tertiary)'
                                                }}>{model.tag}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Claude Models */}
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
                                        CLAUDE
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-xs)' }}>
                                        {claudeModels.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => setSelectedModel(model.id)}
                                                style={{
                                                    padding: 'var(--space-sm) var(--space-md)',
                                                    border: `1px solid ${selectedModel === model.id ? 'var(--color-secondary)' : 'var(--glass-border)'}`,
                                                    borderRadius: 'var(--radius-md)',
                                                    background: selectedModel === model.id ? 'rgba(236, 72, 153, 0.15)' : 'var(--glass-bg)',
                                                    color: selectedModel === model.id ? 'var(--color-secondary)' : 'var(--color-text-primary)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    fontSize: 'var(--font-size-xs)',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ fontWeight: 500 }}>{model.name}</span>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    background: selectedModel === model.id ? 'var(--color-secondary)' : 'rgba(255,255,255,0.1)',
                                                    color: selectedModel === model.id ? 'white' : 'var(--color-text-tertiary)'
                                                }}>{model.tag}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ============ PROXY MODEL SCANNER ============ */}
                                <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'rgba(52, 211, 153, 0.03)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: 'var(--radius-lg)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <Search size={16} style={{ color: 'var(--color-success)' }} />
                                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>QUÉT MODEL TỪ PROXY</span>
                                        </div>
                                        <button
                                            className="btn btn-small"
                                            onClick={fetchModelsFromProxy}
                                            disabled={scanningModels}
                                            style={{
                                                fontSize: 'var(--font-size-xs)', padding: '4px 12px',
                                                background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--color-success)',
                                                color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px'
                                            }}
                                        >
                                            {scanningModels ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                                            {scanningModels ? 'Đang quét...' : 'Quét model'}
                                        </button>
                                    </div>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '0 0 var(--space-sm) 0', lineHeight: 1.5 }}>
                                        Quét danh sách model có sẵn từ {provider === 'gemini' ? 'Google Gemini API' : 'Proxy đang cấu hình'} để lựa chọn.
                                    </p>

                                    {scanError && (
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)', color: 'var(--color-error)',
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            padding: 'var(--space-xs) var(--space-sm)',
                                            background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)',
                                            marginBottom: 'var(--space-sm)'
                                        }}>
                                            <XCircle size={12} />
                                            {scanError}
                                        </div>
                                    )}

                                    {proxyModels.length > 0 && (
                                        <>
                                            {/* Search filter */}
                                            <div style={{ marginBottom: 'var(--space-sm)' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={modelSearchQuery}
                                                    onChange={(e) => setModelSearchQuery(e.target.value)}
                                                    placeholder="🔍 Tìm model..."
                                                    style={{ fontSize: 'var(--font-size-xs)', padding: '6px 10px', width: '100%' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-xs)' }}>
                                                <CheckCircle2 size={12} style={{ color: 'var(--color-success)' }} />
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>
                                                    Tìm thấy {proxyModels.length} model{modelSearchQuery && ` (hiển thị ${filteredProxyModels.length})`}
                                                </span>
                                            </div>
                                            <div style={{
                                                maxHeight: '280px', overflowY: 'auto',
                                                display: 'flex', flexDirection: 'column', gap: '2px',
                                                padding: '2px',
                                                scrollbarWidth: 'thin'
                                            }}>
                                                {filteredProxyModels.map(model => (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => setSelectedModel(model.id)}
                                                        style={{
                                                            padding: '6px 10px',
                                                            border: `1px solid ${selectedModel === model.id ? 'var(--color-success)' : 'transparent'}`,
                                                            borderRadius: 'var(--radius-sm)',
                                                            background: selectedModel === model.id ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                                                            color: selectedModel === model.id ? 'var(--color-success)' : 'var(--color-text-primary)',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            fontSize: 'var(--font-size-xs)',
                                                            transition: 'all 0.15s',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            width: '100%'
                                                        }}
                                                        onMouseEnter={e => { if (selectedModel !== model.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                                        onMouseLeave={e => { if (selectedModel !== model.id) e.currentTarget.style.background = 'transparent'; }}
                                                    >
                                                        <span style={{ fontWeight: selectedModel === model.id ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                            {model.displayName}
                                                        </span>
                                                        {selectedModel === model.id && (
                                                            <CheckCircle2 size={14} style={{ color: 'var(--color-success)', flexShrink: 0, marginLeft: '8px' }} />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* ============ API KEYS ============ */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <Key size={18} className="text-primary" />
                                        <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>API Keys (Đa luồng)</h4>
                                    </div>
                                    {apiKeys.length > 1 && (
                                        <button
                                            className="btn btn-small"
                                            onClick={handleCheckAllKeys}
                                            style={{
                                                fontSize: 'var(--font-size-xs)',
                                                padding: '4px 10px',
                                                background: 'rgba(139, 92, 246, 0.1)',
                                                border: '1px solid var(--color-primary)',
                                                color: 'var(--color-primary)',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Zap size={12} />
                                            Kiểm tra tất cả
                                        </button>
                                    )}
                                </div>

                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                                    Thêm nhiều key để hệ thống tự động luân phiên (round-robin), giúp tránh bị giới hạn tốc độ. Key được lưu trong trình duyệt.
                                </p>

                                {/* Add new key */}
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={inputKey}
                                        onChange={(e) => setInputKey(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Nhập API key mới..."
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="btn btn-primary btn-small"
                                        onClick={handleAddKey}
                                        disabled={!inputKey.trim()}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        <Plus size={16} />
                                        Thêm
                                    </button>
                                </div>

                                {/* Key list */}
                                {apiKeys.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                        {apiKeys.map((key, index) => (
                                            <div key={index} style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                padding: 'var(--space-sm) var(--space-md)',
                                                background: getStatusColor(keyStatus[index]),
                                                border: getStatusBorder(keyStatus[index]),
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-sm)',
                                                transition: 'all 0.3s ease'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <span style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: 'var(--gradient-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.7rem',
                                                        color: 'white',
                                                        fontWeight: 700,
                                                        flexShrink: 0
                                                    }}>
                                                        {index + 1}
                                                    </span>
                                                    <code style={{
                                                        flex: 1,
                                                        fontFamily: 'var(--font-family-mono, monospace)',
                                                        fontSize: 'var(--font-size-xs)',
                                                        color: 'var(--color-text-secondary)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {showKeys[index] ? key : maskedKey(key)}
                                                    </code>
                                                    <button className="btn-icon" onClick={() => toggleShowKey(index)} style={{ padding: '4px' }} title="Hiện/Ẩn key">
                                                        {showKeys[index] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => handleCheckKey(key, index)}
                                                        disabled={keyStatus[index]?.status === 'checking'}
                                                        style={{ padding: '4px', color: 'var(--color-primary)' }}
                                                        title="Kiểm tra key"
                                                    >
                                                        {keyStatus[index]?.status === 'checking'
                                                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                            : <Zap size={14} />
                                                        }
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => { if (window.confirm('Xóa key này?')) removeKey(index); }}
                                                        style={{ padding: '4px', color: 'var(--color-error)' }}
                                                        title="Xóa key"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                {/* Key validation status */}
                                                {keyStatus[index] && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        paddingLeft: '32px',
                                                        fontSize: 'var(--font-size-xs)',
                                                        color: keyStatus[index].status === 'valid' ? 'var(--color-success)'
                                                            : keyStatus[index].status === 'invalid' ? 'var(--color-error)'
                                                                : 'var(--color-primary)',
                                                        animation: 'fadeIn 0.3s ease'
                                                    }}>
                                                        {getStatusIcon(keyStatus[index])}
                                                        <span>{keyStatus[index].message}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {apiKeys.length === 0 && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: 'var(--space-lg)',
                                        color: 'var(--color-text-tertiary)',
                                        fontSize: 'var(--font-size-sm)',
                                        border: '1px dashed var(--glass-border)',
                                        borderRadius: 'var(--radius-md)'
                                    }}>
                                        Chưa có key nào. Thêm key orbit-provider để sử dụng AI.
                                    </div>
                                )}
                            </div>

                            {/* ============ WORKER AI (PHỤ TÁ) ============ */}
                            <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-md)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <Bot size={18} className="text-secondary" />
                                        <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>AI Phụ tá (Worker AI)</h4>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                            {workerProvider !== 'disabled' ? 'Đang BẬT' : 'TẮT'}
                                        </span>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                                            <input type="checkbox" checked={workerProvider !== 'disabled'}
                                                onChange={(e) => setWorkerProvider(e.target.checked ? 'groq' : 'disabled')}
                                                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                                            <div style={{
                                                width: '36px', height: '20px', borderRadius: '10px',
                                                background: workerProvider !== 'disabled' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                                transition: 'all 0.3s ease', position: 'relative'
                                            }}>
                                                <div style={{
                                                    width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                                                    position: 'absolute', top: '2px', left: workerProvider !== 'disabled' ? '18px' : '2px',
                                                    transition: 'all 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                                }} />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                                    Chia sẻ gánh nặng với Gemini. AI Phụ tá sẽ xử lý các tác vụ nền (Tóm tắt, Dịch thô, Trích xuất) để tiết kiệm API Rate Limit của Gemini. Khuyên dùng: <b>Groq (Miễn phí & Rất nhanh)</b>.
                                </p>

                                {workerProvider !== 'disabled' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', animation: 'fadeIn 0.3s ease' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => { setWorkerProvider('groq'); setWorkerBaseUrl('https://api.groq.com/openai/v1'); setWorkerModel('llama3-8b-8192'); }}
                                                style={{ flex: 1, minWidth: '100px', padding: 'var(--space-sm)', border: `1px solid ${workerProvider === 'groq' ? 'var(--color-primary)' : 'var(--glass-border)'}`, borderRadius: 'var(--radius-md)', background: workerProvider === 'groq' ? 'rgba(139, 92, 246, 0.15)' : 'transparent', color: workerProvider === 'groq' ? 'var(--color-primary)' : 'var(--color-text-primary)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                                                Groq Cloud
                                            </button>
                                            <button
                                                onClick={() => { setWorkerProvider('ollama'); setWorkerBaseUrl('http://localhost:11434/v1'); setWorkerModel('llama3'); setWorkerApiKey(''); }}
                                                style={{ flex: 1, minWidth: '100px', padding: 'var(--space-sm)', border: `1px solid ${workerProvider === 'ollama' ? 'var(--color-primary)' : 'var(--glass-border)'}`, borderRadius: 'var(--radius-md)', background: workerProvider === 'ollama' ? 'rgba(139, 92, 246, 0.15)' : 'transparent', color: workerProvider === 'ollama' ? 'var(--color-primary)' : 'var(--color-text-primary)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                                                Ollama Local
                                            </button>
                                            <button
                                                onClick={() => { setWorkerProvider('custom'); setWorkerBaseUrl(''); setWorkerModel(''); }}
                                                style={{ flex: 1, minWidth: '100px', padding: 'var(--space-sm)', border: `1px solid ${workerProvider === 'custom' ? 'var(--color-primary)' : 'var(--glass-border)'}`, borderRadius: 'var(--radius-md)', background: workerProvider === 'custom' ? 'rgba(139, 92, 246, 0.15)' : 'transparent', color: workerProvider === 'custom' ? 'var(--color-primary)' : 'var(--color-text-primary)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                                                Tùy chỉnh (OpenAI)
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>Base URL <span style={{ color: 'var(--color-error)' }}>*</span></label>
                                                <input type="text" className="form-input" style={{ fontSize: 'var(--font-size-sm)' }} value={workerBaseUrl} onChange={e => setWorkerBaseUrl(e.target.value)} placeholder="https://api.groq.com/openai/v1" />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>Model Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                                                <input type="text" className="form-input" style={{ fontSize: 'var(--font-size-sm)' }} value={workerModel} onChange={e => setWorkerModel(e.target.value)} placeholder="llama3-8b-8192" />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>API Key</label>
                                                <input type="password" className="form-input" style={{ fontSize: 'var(--font-size-sm)' }} value={workerApiKey} onChange={e => setWorkerApiKey(e.target.value)} placeholder={workerProvider === 'groq' ? "gsk_..." : "Nhập API Key..."} />
                                            </div>
                                        </div>

                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', padding: 'var(--space-xs) 0' }}>
                                            Lưu ý: Nếu điền sai hoặc AI Phụ tá hết hạn ngạch / sập, hệ thống sẽ tự động chuyển việc lại cho Main AI (Gemini).
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Cpu size={18} className="text-primary" /> Thông số sinh văn bản (Generation Config)
                                </h4>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', margin: '0 0 var(--space-sm) 0' }}>
                                    Kiểm soát mức độ bay bổng và độ dài của câu trả lời AI. Các tham số này sẽ áp dụng cho tất cả yêu cầu.
                                </p>

                                <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

                                    {/* Nhiệt độ */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Nhiệt độ (Temperature) - {generationConfig.temperature || 0.8}</label>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{generationConfig.temperature < 0.5 ? 'Tính phân tích cao' : generationConfig.temperature > 1.2 ? 'Tính sáng tạo cao' : 'Cân bằng'}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="0.05"
                                            value={generationConfig.temperature || 0.8}
                                            onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                                            style={{ width: '100%', cursor: 'pointer' }}
                                        />
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0' }}>Từ 0.0 đến 2.0. Nhiệt độ cao làm AI sáng tạo hơn (dễ "ảo giác"), thấp làm AI logic và rập khuôn hơn.</p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                                        {/* Top P */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Top P - {generationConfig.topP || 0.9}</label>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={generationConfig.topP || 0.9}
                                                onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
                                                style={{ width: '100%', cursor: 'pointer' }}
                                            />
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0' }}>Khoảng từ vựng. Thường để 0.9 - 1.0.</p>
                                        </div>

                                        {/* Top K */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Top K - {generationConfig.topK || 40}</label>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="150"
                                                step="1"
                                                value={generationConfig.topK || 40}
                                                onChange={(e) => handleConfigChange('topK', parseInt(e.target.value))}
                                                style={{ width: '100%', cursor: 'pointer' }}
                                            />
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0' }}>Số lượng từ tiếp theo AI cân nhắc. Giá trị nhỏ làm văn gọn hơn.</p>
                                        </div>
                                    </div>

                                    {/* Max tokens */}
                                    <div>
                                        <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Kích thước phản hồi tối đa (Max Output Tokens)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={generationConfig.maxTokens || 8192}
                                            onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value) || 8192)}
                                            style={{ width: '200px' }}
                                            min="100"
                                            max="32000"
                                        />
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0' }}>Tối đa số lượng token trả về. Gợi ý: 8192 cho Gemini 2.5/3.0.</p>
                                    </div>

                                </div>
                            </div>

                            {/* Các tùy chọn tính năng chuyên sâu */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Zap size={18} className="text-secondary" /> Mở rộng Gemini
                                </h4>

                                <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 'space-lg' }}>

                                    {/* Web search */}
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: 'var(--space-md)' }}>
                                        <div style={{ marginTop: '2px' }}>
                                            <input
                                                type="checkbox"
                                                checked={generationConfig.useWebSearch || false}
                                                onChange={(e) => handleConfigChange('useWebSearch', e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <strong style={{ fontSize: 'var(--font-size-sm)', display: 'block', marginBottom: '4px' }}>Bật Google Web Search</strong>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.5, display: 'block' }}>Cho phép Gemini trực tiếp tra cứu thông tin trên Internet qua lệnh Search Grounding. Rất tốt khi viết truyện bối cảnh thực tại hoặc tra cứu sự kiện lịch sử thật. (Chỉ cho Direct API)</span>
                                        </div>
                                    </label>

                                    {/* Reasoning Effort (For Gemini 3.0 Pro) */}
                                    <div>
                                        <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Chất lượng Suy luận (Reasoning Effort)</label>
                                        <select
                                            className="form-input"
                                            value={generationConfig.reasoningEffort || 'auto'}
                                            onChange={(e) => handleConfigChange('reasoningEffort', e.target.value)}
                                            style={{ width: '200px', cursor: 'pointer' }}
                                        >
                                            <option value="auto">Tự động (Auto)</option>
                                            <option value="none">Tắt (None) — Không suy nghĩ</option>
                                            <option value="minimal">Tối thiểu (Minimal) — Flash 3 only</option>
                                            <option value="low">Thấp (Low) — Tốc độ nhanh</option>
                                            <option value="medium">Trung bình (Medium) — Flash 3 only</option>
                                            <option value="high">Cao (High) — Suy nghĩ kỹ càng</option>
                                        </select>
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                                            Điều chỉnh mức độ suy luận. Flash 3 hỗ trợ tất cả mức, Pro 3 chỉ hỗ trợ auto/low/high. Flash 2.5/Pro 2.5: phân bổ % token cho thinking (low=10%, medium=25%, high=50%).
                                        </p>
                                        {(generationConfig.reasoningEffort && generationConfig.reasoningEffort !== 'auto' && generationConfig.reasoningEffort !== 'none') && (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={generationConfig.delegateReasoningToWorker || false}
                                                    onChange={(e) => handleConfigChange('delegateReasoningToWorker', e.target.checked)}
                                                    disabled={workerProvider === 'disabled'}
                                                    style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                                />
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: workerProvider === 'disabled' ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)' }}>
                                                    Giao cho AI Phụ (Worker) xử lý tác vụ suy luận này {workerProvider !== 'disabled' && `(${workerModel})`}
                                                </span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Request Inline Images */}
                                    <div style={{ marginTop: 'var(--space-md)' }}>
                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                                            <div style={{ marginTop: '2px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={generationConfig.inlineImages || false}
                                                    onChange={(e) => handleConfigChange('inlineImages', e.target.checked)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                                />
                                            </div>
                                            <div>
                                                <strong style={{ fontSize: 'var(--font-size-sm)', display: 'block', marginBottom: '4px' }}>Yêu cầu AI tạo ảnh minh họa (Inline Images)</strong>
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.5, display: 'block' }}>Cho phép Gemini trả kèm ảnh minh họa cảnh/nhân vật trong truyện. <em style={{ color: 'var(--color-warning)' }}>Không tương thích: function calling, web search, system prompt.</em></span>
                                            </div>
                                        </label>
                                        {generationConfig.inlineImages && (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginLeft: '30px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={generationConfig.delegateImagesToWorker || false}
                                                    onChange={(e) => handleConfigChange('delegateImagesToWorker', e.target.checked)}
                                                    disabled={workerProvider === 'disabled'}
                                                    style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                                />
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: workerProvider === 'disabled' ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)' }}>
                                                    Giao cho AI Phụ (Worker) chạy tác vụ tạo ảnh này {workerProvider !== 'disabled' && `(${workerModel})`}
                                                </span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Model Reasoning (Show thinking) */}
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginTop: 'var(--space-md)' }}>
                                        <div style={{ marginTop: '2px' }}>
                                            <input
                                                type="checkbox"
                                                checked={generationConfig.showReasoning || false}
                                                onChange={(e) => handleConfigChange('showReasoning', e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <strong style={{ fontSize: 'var(--font-size-sm)', display: 'block', marginBottom: '4px' }}>Hiển thị quá trình suy nghĩ (Model Reasoning)</strong>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.5, display: 'block' }}>Cho phép hiển thị quá trình {'<thinking>'} của AI, giúp tác giả hiểu lý do AI chọn hướng đi cốt truyện đó. Khi tắt, nội dung thinking sẽ bị ẩn đi.</span>
                                        </div>
                                    </label>

                                    {/* Streaming toggle */}
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginTop: 'var(--space-md)' }}>
                                        <div style={{ marginTop: '2px' }}>
                                            <input
                                                type="checkbox"
                                                checked={generationConfig.streaming !== false}
                                                onChange={(e) => handleConfigChange('streaming', e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <strong style={{ fontSize: 'var(--font-size-sm)', display: 'block', marginBottom: '4px' }}>Phát trực tiếp (Streaming)</strong>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.5, display: 'block' }}>Hiển thị phản hồi từ từ khi nó đang được tạo ra. Khi tắt, phản hồi sẽ hiện ra một lần hoàn chỉnh (dễ copy-paste hơn).</span>
                                        </div>
                                    </label>

                                </div>
                            </div>

                            {/* Tiện ích cho prompt */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Cpu size={18} className="text-primary" /> Tiện ích cho Prompt
                                </h4>

                                <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                                    {/* Context Size */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Kích thước Context (token) — {(generationConfig.contextSize || 128000).toLocaleString()}</label>
                                        </div>
                                        <input
                                            type="range"
                                            min="4096"
                                            max="1000000"
                                            step="4096"
                                            value={generationConfig.contextSize || 128000}
                                            onChange={(e) => handleConfigChange('contextSize', parseInt(e.target.value))}
                                            style={{ width: '100%', cursor: 'pointer' }}
                                        />
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0' }}>Giới hạn tổng dung lượng context gửi lên AI (bao gồm prompt + dữ liệu truyện). Giá trị nhỏ hơn tiết kiệm chi phí token.</p>
                                    </div>

                                    {/* Seed */}
                                    <div>
                                        <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Hạt giống (Seed)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={generationConfig.seed ?? -1}
                                            onChange={(e) => handleConfigChange('seed', parseInt(e.target.value) || -1)}
                                            style={{ width: '200px' }}
                                            min="-1"
                                        />
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0' }}>Đặt seed cố định để có kết quả tái tạo (deterministic). Dùng <strong>-1</strong> cho ngẫu nhiên. Hữu ích khi debug prompt.</p>
                                    </div>

                                </div>
                            </div>

                            {/* Presets */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Save size={18} className="text-primary" /> Preset cấu hình
                                </h4>

                                <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                                        <button
                                            className="btn btn-primary btn-small"
                                            onClick={() => {
                                                const name = prompt('Đặt tên cho preset:');
                                                if (!name?.trim()) return;
                                                const { presets, ...configWithoutPresets } = generationConfig;
                                                const newPreset = { name: name.trim(), config: configWithoutPresets, createdAt: Date.now() };
                                                handleConfigChange('presets', [...(presets || []), newPreset]);
                                            }}
                                        >
                                            <Plus size={14} /> Lưu Preset hiện tại
                                        </button>
                                        <button
                                            className="btn btn-small"
                                            style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}
                                            onClick={() => {
                                                setGenerationConfig({
                                                    temperature: 0.8, topP: 0.9, topK: 40, maxTokens: 8192,
                                                    reasoningEffort: 'auto', useWebSearch: false, streaming: true,
                                                    contextSize: 128000, prefillEnabled: false, prefillContent: '',
                                                    showReasoning: false, seed: -1, presets: generationConfig.presets || []
                                                });
                                            }}
                                        >
                                            <RefreshCw size={14} /> Reset mặc định
                                        </button>
                                    </div>

                                    {(generationConfig.presets || []).length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                            {generationConfig.presets.map((preset, idx) => (
                                                <div key={idx} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: 'var(--space-sm) var(--space-md)',
                                                    background: 'rgba(139, 92, 246, 0.08)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}>
                                                    <div>
                                                        <strong>{preset.name}</strong>
                                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>
                                                            T={preset.config?.temperature} | Tokens={preset.config?.maxTokens}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            className="btn btn-small"
                                                            style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}
                                                            onClick={() => {
                                                                const currentPresets = generationConfig.presets || [];
                                                                setGenerationConfig({ ...preset.config, presets: currentPresets });
                                                            }}
                                                        >
                                                            Tải
                                                        </button>
                                                        <button
                                                            className="btn-icon"
                                                            style={{ color: 'var(--color-error)', padding: '4px' }}
                                                            onClick={() => {
                                                                if (!window.confirm(`Xóa preset "${preset.name}"?`)) return;
                                                                const updated = (generationConfig.presets || []).filter((_, i) => i !== idx);
                                                                handleConfigChange('presets', updated);
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0, textAlign: 'center', padding: 'var(--space-sm)' }}>
                                            Chưa có preset nào. Hãy lưu cấu hình hiện tại làm preset để sử dụng nhanh sau này.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mca-modal-footer" style={{ padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ marginRight: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <RefreshCw size={12} />
                        {provider === 'custom' ? 'Custom Proxy' : 'Google Gemini API'}
                    </div>
                    <button className="btn btn-primary" onClick={onClose}>
                        <Save size={16} /> Xong
                    </button>
                </div>
            </div>

            {/* Inline keyframes for spin and fadeIn animations */}
            <style>{`
                @keyframes spin {from {transform: rotate(0deg); } to {transform: rotate(360deg); } }
                        @keyframes fadeIn {from {opacity: 0; transform: translateY(-4px); } to {opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
