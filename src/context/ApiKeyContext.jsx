import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { setProxyConfig } from '../services/apiClient';
import { wsRelay } from '../services/wsRelayService';

const ApiKeyContext = createContext();

export const useApiKey = () => {
    const context = useContext(ApiKeyContext);
    if (!context) {
        throw new Error('useApiKey must be used within ApiKeyProvider');
    }
    return context;
};

// Default model
const DEFAULT_MODEL = 'gemini-3-flash-preview';
const STORAGE_KEYS = {
    apiKeys: 'ai_story_api_keys',
    model: 'ai_story_selected_model',
    provider: 'ai_story_provider',       // 'gemini' | 'custom'
    customBaseUrl: 'ai_story_custom_base_url',
    workerProvider: 'ai_story_worker_provider',
    workerBaseUrl: 'ai_story_worker_base_url',
    workerApiKey: 'ai_story_worker_api_key',
    workerModel: 'ai_story_worker_model',
    generationConfig: 'ai_story_generation_config',
    cloudImageProvider: 'ai_story_cloud_image_provider',
    cloudImageApiKey: 'ai_story_cloud_image_api_key',
    cloudImageModel: 'ai_story_cloud_image_model'
};

export const ApiKeyProvider = ({ children }) => {
    const [apiKeys, setApiKeysState] = useState([]);
    const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL);
    const [provider, setProviderState] = useState('gemini'); // 'gemini' | 'custom'
    const [customBaseUrl, setCustomBaseUrlState] = useState('');
    const [wsConnected, setWsConnected] = useState(false);

    // Worker AI States
    const [workerProvider, setWorkerProviderState] = useState('disabled');
    const [workerBaseUrl, setWorkerBaseUrlState] = useState('');
    const [workerApiKey, setWorkerApiKeyState] = useState('');
    const [workerModel, setWorkerModelState] = useState('');

    // Cloud Image States
    const [cloudImageProvider, setCloudImageProviderState] = useState('openai'); // openai | together
    const [cloudImageApiKey, setCloudImageApiKeyState] = useState('');
    const [cloudImageModel, setCloudImageModelState] = useState('dall-e-3');

    const [generationConfig, setGenerationConfigState] = useState({
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxTokens: 8192,
        reasoningEffort: 'auto',
        useWebSearch: false,
        streaming: true,
        contextSize: 128000,
        prefillEnabled: false,
        prefillContent: '',
        showReasoning: false,
        seed: -1,
        inlineImages: false,
        delegateReasoningToWorker: false,
        delegateImagesToWorker: false,
        presets: []
    });

    const keyIndexRef = useRef(0);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const savedKeys = localStorage.getItem(STORAGE_KEYS.apiKeys);
            if (savedKeys) {
                const parsed = JSON.parse(savedKeys);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setApiKeysState(parsed);
                }
            } else {
                // Migrate old single key if exists
                const oldKey = localStorage.getItem('ai_story_api_key');
                if (oldKey) {
                    setApiKeysState([oldKey]);
                    localStorage.setItem(STORAGE_KEYS.apiKeys, JSON.stringify([oldKey]));
                    localStorage.removeItem('ai_story_api_key');
                }
            }
        } catch (e) {
            console.error('Error loading API keys:', e);
        }

        const savedModel = localStorage.getItem(STORAGE_KEYS.model);
        if (savedModel) setSelectedModelState(savedModel);

        const savedProvider = localStorage.getItem(STORAGE_KEYS.provider);
        if (savedProvider === 'gemini' || savedProvider === 'custom') setProviderState(savedProvider);

        const savedUrl = localStorage.getItem(STORAGE_KEYS.customBaseUrl);
        if (savedUrl) setCustomBaseUrlState(savedUrl);

        // Load Worker AI config
        const savedWorkerProvider = localStorage.getItem(STORAGE_KEYS.workerProvider);
        if (savedWorkerProvider) setWorkerProviderState(savedWorkerProvider);
        const savedWorkerBaseUrl = localStorage.getItem(STORAGE_KEYS.workerBaseUrl);
        if (savedWorkerBaseUrl) setWorkerBaseUrlState(savedWorkerBaseUrl);
        const savedWorkerApiKey = localStorage.getItem(STORAGE_KEYS.workerApiKey);
        if (savedWorkerApiKey) setWorkerApiKeyState(savedWorkerApiKey);
        const savedWorkerModel = localStorage.getItem(STORAGE_KEYS.workerModel);
        if (savedWorkerModel) setWorkerModelState(savedWorkerModel);

        const savedCloudImageProvider = localStorage.getItem(STORAGE_KEYS.cloudImageProvider);
        if (savedCloudImageProvider) setCloudImageProviderState(savedCloudImageProvider);
        const savedCloudImageApiKey = localStorage.getItem(STORAGE_KEYS.cloudImageApiKey);
        if (savedCloudImageApiKey) setCloudImageApiKeyState(savedCloudImageApiKey);
        const savedCloudImageModel = localStorage.getItem(STORAGE_KEYS.cloudImageModel);
        if (savedCloudImageModel) setCloudImageModelState(savedCloudImageModel);

        const savedGenerationConfig = localStorage.getItem(STORAGE_KEYS.generationConfig);
        if (savedGenerationConfig) {
            try {
                const parsedConfig = JSON.parse(savedGenerationConfig);
                setGenerationConfigState(prev => ({ ...prev, ...parsedConfig }));
            } catch (e) {
                console.error('Lỗi khi tải generationConfig:', e);
            }
        }
    }, []);

    // Sync proxy config to apiClient module whenever provider/url changes
    useEffect(() => {
        setProxyConfig(provider, customBaseUrl);
    }, [provider, customBaseUrl]);

    // Sync worker config
    useEffect(() => {
        import('../services/apiClient').then(module => {
            if (module.setWorkerConfig) {
                module.setWorkerConfig(workerProvider, workerBaseUrl, workerApiKey, workerModel);
            }
        });
    }, [workerProvider, workerBaseUrl, workerApiKey, workerModel]);

    // Sync generation config
    useEffect(() => {
        import('../services/apiClient').then(module => {
            if (module.setGenerationConfig) {
                module.setGenerationConfig(generationConfig);
            }
        });
    }, [generationConfig]);

    // Auto-connect/disconnect WebSocket relay
    useEffect(() => {
        const isWS = customBaseUrl && (customBaseUrl.startsWith('ws://') || customBaseUrl.startsWith('wss://'));
        if (provider === 'custom' && isWS) {
            wsRelay.connect(customBaseUrl).catch(e => {
                if (import.meta.env.DEV) console.warn('WS connect failed:', e);
            });
        } else {
            wsRelay.disconnect();
        }

        // Listen for connection status changes
        const unsub = wsRelay.onStatusChange(setWsConnected);
        return () => {
            unsub();
        };
    }, [provider, customBaseUrl]);

    // Add a new key
    const addKey = (key) => {
        if (!key?.trim()) return;
        const trimmed = key.trim();
        setApiKeysState(prev => {
            if (prev.includes(trimmed)) return prev; // No duplicates
            const updated = [...prev, trimmed];
            localStorage.setItem(STORAGE_KEYS.apiKeys, JSON.stringify(updated));
            return updated;
        });
    };

    // Remove a key by index
    const removeKey = (index) => {
        setApiKeysState(prev => {
            const updated = prev.filter((_, i) => i !== index);
            localStorage.setItem(STORAGE_KEYS.apiKeys, JSON.stringify(updated));
            if (keyIndexRef.current >= updated.length) {
                keyIndexRef.current = 0;
            }
            return updated;
        });
    };

    // Round-robin: get next key (returns placeholder for WS relay mode)
    const getNextKey = () => {
        if (apiKeys.length === 0) {
            // WS relay doesn't need a real key — proxy injects OAuth token
            if (provider === 'custom' && customBaseUrl && (customBaseUrl.startsWith('ws://') || customBaseUrl.startsWith('wss://'))) {
                return 'ws-relay';
            }
            return '';
        }
        const key = apiKeys[keyIndexRef.current % apiKeys.length];
        keyIndexRef.current = (keyIndexRef.current + 1) % apiKeys.length;
        return key;
    };

    // For backward compat: return first key
    const apiKey = apiKeys.length > 0 ? apiKeys[0] : '';

    // Set selected model
    const setSelectedModel = (model) => {
        setSelectedModelState(model);
        localStorage.setItem(STORAGE_KEYS.model, model);
    };

    // Set provider
    const setProvider = (p) => {
        setProviderState(p);
        localStorage.setItem(STORAGE_KEYS.provider, p);
    };

    // Set custom base URL
    const setCustomBaseUrl = (url) => {
        setCustomBaseUrlState(url);
        localStorage.setItem(STORAGE_KEYS.customBaseUrl, url);
    };

    // Setters for Worker AI
    const setWorkerProvider = (p) => { setWorkerProviderState(p); localStorage.setItem(STORAGE_KEYS.workerProvider, p); };
    const setWorkerBaseUrl = (url) => { setWorkerBaseUrlState(url); localStorage.setItem(STORAGE_KEYS.workerBaseUrl, url); };
    const setWorkerApiKey = (k) => { setWorkerApiKeyState(k); localStorage.setItem(STORAGE_KEYS.workerApiKey, k); };
    const setWorkerModel = (m) => { setWorkerModelState(m); localStorage.setItem(STORAGE_KEYS.workerModel, m); };

    // Setters for Cloud Image
    const setCloudImageProvider = (p) => { setCloudImageProviderState(p); localStorage.setItem(STORAGE_KEYS.cloudImageProvider, p); };
    const setCloudImageApiKey = (k) => { setCloudImageApiKeyState(k); localStorage.setItem(STORAGE_KEYS.cloudImageApiKey, k); };
    const setCloudImageModel = (m) => { setCloudImageModelState(m); localStorage.setItem(STORAGE_KEYS.cloudImageModel, m); };

    // Set Generation Config
    const setGenerationConfig = (configUpdates) => {
        setGenerationConfigState(prev => {
            const next = { ...prev, ...configUpdates };
            localStorage.setItem(STORAGE_KEYS.generationConfig, JSON.stringify(next));
            return next;
        });
    };

    // isKeySet: true when API keys exist OR when WS relay is connected (proxy handles auth)
    const isWsRelay = provider === 'custom' && customBaseUrl && (customBaseUrl.startsWith('ws://') || customBaseUrl.startsWith('wss://'));
    const isKeySet = apiKeys.length > 0 || (isWsRelay && wsConnected);

    return (
        <ApiKeyContext.Provider value={{
            apiKey,
            apiKeys,
            addKey,
            removeKey,
            getNextKey,
            selectedModel,
            setSelectedModel,
            isKeySet,
            // Provider & Proxy
            provider,
            setProvider,
            customBaseUrl,
            setCustomBaseUrl,
            wsConnected,
            // Worker AI States
            workerProvider, setWorkerProvider,
            workerBaseUrl, setWorkerBaseUrl,
            workerApiKey, setWorkerApiKey,
            workerModel, setWorkerModel,
            // Cloud Image States
            cloudImageProvider, setCloudImageProvider,
            cloudImageApiKey, setCloudImageApiKey,
            cloudImageModel, setCloudImageModel,
            // Generation Config
            generationConfig, setGenerationConfig,
            // Legacy compat
            setApiKey: addKey,
            clearApiKey: () => {
                setApiKeysState([]);
                localStorage.removeItem(STORAGE_KEYS.apiKeys);
                keyIndexRef.current = 0;
            }
        }}>
            {children}
        </ApiKeyContext.Provider>
    );
};
