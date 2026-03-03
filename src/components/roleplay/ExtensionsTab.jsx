// ================================================
// ExtensionsTab — Quản lý tiện ích (Extensions)
// ================================================
// Tương tự SillyTavern: dán URL GitHub → cài đặt extension
import React, { useState, useCallback, useEffect } from 'react';
import {
    Download, Trash2, Puzzle, Code, Image, Volume2,
    Search, ChevronDown, AlertCircle, Check, Loader,
    FileText, Zap
} from 'lucide-react';
import {
    fetchExtensionFromGitHub,
    getInstalledExtensions,
    installExtension,
    uninstallExtension,
    toggleExtension,
} from '../../services/extensionService';
import '../../styles/extensionsTab.css';

// Built-in extensions (always shown, just for display)
const BUILTIN_EXTENSIONS = [
    { id: '_builtin_regex', name: 'Biểu thức chính quy', icon: '🔧', desc: 'Regex scripts — biến đổi text AI output/user input', enabled: true },
    { id: '_builtin_rag', name: 'RAG / Tìm kiếm ngữ cảnh', icon: '🔍', desc: 'Retrieval-Augmented Generation — tìm kiếm trong lorebook', enabled: true },
    { id: '_builtin_image', name: 'Tạo hình ảnh', icon: '🎨', desc: 'AI Image Generation (Gemini, Imagen)', enabled: true },
    { id: '_builtin_tts', name: 'TTS (Text-to-Speech)', icon: '🔊', desc: 'Chuyển text thành giọng nói', enabled: true },
];

const TYPE_ICONS = {
    regex: '🔧',
    script: '⚡',
    config: '⚙️',
    unknown: '📦',
};

const TYPE_BADGE_CLASS = {
    regex: 'type-regex',
    script: 'type-script',
    config: 'type-config',
    unknown: 'type-config',
};

export default function ExtensionsTab() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', message: '' }
    const [extensions, setExtensions] = useState([]);
    const [showBuiltin, setShowBuiltin] = useState(true);

    // Load installed extensions
    useEffect(() => {
        setExtensions(getInstalledExtensions());
    }, []);

    // Install from URL
    const handleInstall = useCallback(async () => {
        if (!url.trim()) return;
        setIsLoading(true);
        setStatus({ type: 'info', message: '⏳ Đang tải từ GitHub...' });

        try {
            const ext = await fetchExtensionFromGitHub(url);
            const updated = installExtension(ext);
            setExtensions(updated);
            setStatus({
                type: 'success',
                message: `✅ Đã cài đặt "${ext.name}" (${ext.type}) — ${Array.isArray(ext.data) ? ext.data.length + ' items' : '1 item'}`,
            });
            setUrl('');
        } catch (err) {
            setStatus({ type: 'error', message: `❌ ${err.message}` });
        } finally {
            setIsLoading(false);
        }
    }, [url]);

    // Toggle extension
    const handleToggle = useCallback((extId) => {
        const updated = toggleExtension(extId);
        setExtensions(updated);
    }, []);

    // Uninstall extension
    const handleUninstall = useCallback((extId) => {
        if (!confirm('Xóa tiện ích này?')) return;
        const updated = uninstallExtension(extId);
        setExtensions(updated);
        setStatus({ type: 'info', message: 'Đã gỡ tiện ích.' });
    }, []);

    // Handle Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading) handleInstall();
    };

    return (
        <div className="rp-panel">
            {/* Install bar */}
            <div className="ext-install-bar">
                <input
                    className="ext-install-input"
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Dán URL GitHub... (VD: https://github.com/user/regex-pack)"
                    disabled={isLoading}
                />
                <button
                    className={`ext-install-btn ${isLoading ? 'loading' : ''}`}
                    onClick={handleInstall}
                    disabled={isLoading || !url.trim()}
                >
                    {isLoading ? <Loader size={14} className="spin" /> : <Download size={14} />}
                    {isLoading ? 'Đang tải...' : 'Cài đặt'}
                </button>
            </div>

            {/* Status */}
            {status && (
                <div className={`ext-status ${status.type}`}>
                    {status.type === 'success' && <Check size={14} />}
                    {status.type === 'error' && <AlertCircle size={14} />}
                    {status.message}
                </div>
            )}

            {/* Installed Extensions */}
            <div className="ext-section-label">Tiện ích đã cài đặt</div>
            {extensions.length === 0 ? (
                <div className="ext-empty">
                    <div className="ext-empty-icon">📦</div>
                    <p>Chưa có tiện ích nào</p>
                    <p style={{ opacity: 0.5 }}>Dán URL GitHub ở trên để cài đặt</p>
                </div>
            ) : (
                <div className="ext-list">
                    {extensions.map(ext => (
                        <div key={ext.id} className={`ext-card ${!ext.enabled ? 'disabled' : ''}`}>
                            <div className="ext-card-icon">
                                {TYPE_ICONS[ext.type] || '📦'}
                            </div>
                            <div className="ext-card-info">
                                <div className="ext-card-name">
                                    {ext.name}
                                    <span className={`ext-card-badge ${TYPE_BADGE_CLASS[ext.type] || ''}`}>
                                        {ext.type}
                                    </span>
                                </div>
                                {ext.description && (
                                    <div className="ext-card-desc">{ext.description}</div>
                                )}
                                {ext.source && (
                                    <div className="ext-card-source">{ext.source}</div>
                                )}
                            </div>
                            <div className="ext-card-actions">
                                <label className="ext-toggle">
                                    <input
                                        type="checkbox"
                                        checked={ext.enabled}
                                        onChange={() => handleToggle(ext.id)}
                                    />
                                    <span className="ext-toggle-slider" />
                                </label>
                                <button
                                    className="ext-card-delete"
                                    onClick={() => handleUninstall(ext.id)}
                                    title="Gỡ cài đặt"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Built-in Extensions */}
            <div
                className={`ext-builtin-header ext-section-label ${showBuiltin ? 'open' : ''}`}
                onClick={() => setShowBuiltin(o => !o)}
            >
                <ChevronDown size={12} />
                Tiện ích tích hợp sẵn
            </div>
            {showBuiltin && (
                <div className="ext-list">
                    {BUILTIN_EXTENSIONS.map(ext => (
                        <div key={ext.id} className="ext-card">
                            <div className="ext-card-icon">{ext.icon}</div>
                            <div className="ext-card-info">
                                <div className="ext-card-name">
                                    {ext.name}
                                    <span className="ext-card-badge type-builtin">built-in</span>
                                </div>
                                <div className="ext-card-desc">{ext.desc}</div>
                            </div>
                            <div className="ext-card-actions">
                                <label className="ext-toggle">
                                    <input type="checkbox" checked={ext.enabled} readOnly />
                                    <span className="ext-toggle-slider" />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
