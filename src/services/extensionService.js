// ================================================
// Extension Service — Tải extension từ GitHub
// ================================================
// Hỗ trợ nhiều format URL GitHub: repo, blob, raw

import { RegexScriptSchema, ExtensionManifestSchema } from '../schemas/extensionSchemas';
import { safeValidate } from '../utils/zodHelpers';

const STORAGE_KEY = 'vtbc_installed_extensions';

/**
 * Parse GitHub URL → raw content URL
 * Hỗ trợ:
 *   - https://github.com/user/repo → fetch manifest.json
 *   - https://github.com/user/repo/blob/main/file.json → convert to raw
 *   - https://raw.githubusercontent.com/... → dùng trực tiếp
 */
function parseGitHubUrl(url) {
    url = url.trim();

    // Already raw URL
    if (url.includes('raw.githubusercontent.com')) {
        return { rawUrl: url, type: 'direct' };
    }

    // GitHub blob URL: github.com/user/repo/blob/branch/path
    const blobMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
    if (blobMatch) {
        const [, user, repo, branch, path] = blobMatch;
        return {
            rawUrl: `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`,
            type: 'file',
            repo: `${user}/${repo}`,
        };
    }

    // GitHub tree URL: github.com/user/repo/tree/branch/path
    const treeMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/?(.*)$/);
    if (treeMatch) {
        const [, user, repo, branch, path] = treeMatch;
        const base = path ? `${path}/` : '';
        return {
            rawUrl: `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${base}manifest.json`,
            type: 'manifest',
            repo: `${user}/${repo}`,
        };
    }

    // Plain repo URL: github.com/user/repo
    const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/?$/);
    if (repoMatch) {
        const [, user, repo] = repoMatch;
        return {
            rawUrl: `https://raw.githubusercontent.com/${user}/${repo}/main/manifest.json`,
            type: 'manifest',
            repo: `${user}/${repo}`,
            // Fallback branches to try
            fallbackUrls: [
                `https://raw.githubusercontent.com/${user}/${repo}/master/manifest.json`,
                `https://raw.githubusercontent.com/${user}/${repo}/main/index.json`,
                `https://raw.githubusercontent.com/${user}/${repo}/master/index.json`,
            ],
        };
    }

    // Any other URL — try directly
    return { rawUrl: url, type: 'direct' };
}

/**
 * Fetch content from a URL, trying fallbacks if needed.
 * Uses proxy server if available, falls back to direct fetch.
 */
async function fetchWithFallbacks(primaryUrl, fallbackUrls = []) {
    const urls = [primaryUrl, ...fallbackUrls];

    for (const url of urls) {
        try {
            // Try via proxy server first (avoids CORS)
            try {
                const proxyResp = await fetch('http://localhost:3001/api/extensions/github/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });
                if (proxyResp.ok) {
                    const data = await proxyResp.json();
                    if (data.content) return data.content;
                }
            } catch {
                // Proxy unavailable, try direct
            }

            // Direct fetch (works for raw.githubusercontent.com)
            const resp = await fetch(url);
            if (resp.ok) {
                const text = await resp.text();
                return text;
            }
        } catch {
            continue;
        }
    }

    throw new Error('Không thể tải file. Kiểm tra URL và thử lại.');
}

/**
 * Fetch & parse extension from GitHub URL.
 * @param {string} url GitHub URL
 * @returns {Promise<Object>} Extension data
 */
export async function fetchExtensionFromGitHub(url) {
    const parsed = parseGitHubUrl(url);
    const content = await fetchWithFallbacks(parsed.rawUrl, parsed.fallbackUrls || []);

    let data;
    try {
        data = JSON.parse(content);
    } catch {
        throw new Error('File không phải JSON hợp lệ.');
    }

    // Validate chúng như manifest nếu có
    const manifestResult = safeValidate(ExtensionManifestSchema, data);
    if (!manifestResult.success) {
        console.warn('[EXT] Extension data validation warnings:', manifestResult.errors);
    }

    // Detect extension type
    const ext = normalizeExtensionData(data, parsed.repo || url);
    return ext;
}

/**
 * Normalize extension data to standard format.
 */
function normalizeExtensionData(data, source) {
    // SillyTavern regex script format (has findRegex)
    if (data.findRegex || (Array.isArray(data) && data[0]?.findRegex)) {
        const scripts = Array.isArray(data) ? data : [data];
        return {
            id: 'ext_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: data.scriptName || scripts[0]?.scriptName || 'Regex Pack',
            description: `${scripts.length} regex script(s) từ ${source}`,
            type: 'regex',
            enabled: true,
            source,
            installedAt: new Date().toISOString(),
            data: scripts,
        };
    }

    // SillyTavern extension script format (has content field with JS)
    if (data.content && data.id && typeof data.content === 'string') {
        return {
            id: data.id || 'ext_' + Date.now(),
            name: data.name || 'Extension',
            description: data.info ? 'SillyTavern Extension Script' : '',
            type: 'script',
            enabled: true,
            source,
            installedAt: new Date().toISOString(),
            data: data,
        };
    }

    // Manifest format (has display_name or name)
    if (data.display_name || data.name) {
        return {
            id: 'ext_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: data.display_name || data.name,
            description: data.description || '',
            type: data.type || 'config',
            enabled: true,
            source,
            installedAt: new Date().toISOString(),
            data: data,
        };
    }

    // Unknown format — store raw
    return {
        id: 'ext_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: source.split('/').pop() || 'Extension',
        description: 'Extension tùy chỉnh',
        type: 'unknown',
        enabled: true,
        source,
        installedAt: new Date().toISOString(),
        data: data,
    };
}

// ─── localStorage persistence ───

export function getInstalledExtensions() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveInstalledExtensions(extensions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(extensions));
}

export function installExtension(ext) {
    const list = getInstalledExtensions();
    // Check duplicate
    const existing = list.findIndex(e => e.source === ext.source);
    if (existing >= 0) {
        list[existing] = { ...ext, installedAt: new Date().toISOString() };
    } else {
        list.push(ext);
    }
    saveInstalledExtensions(list);
    return list;
}

export function uninstallExtension(extId) {
    const list = getInstalledExtensions().filter(e => e.id !== extId);
    saveInstalledExtensions(list);
    return list;
}

export function toggleExtension(extId) {
    const list = getInstalledExtensions().map(e =>
        e.id === extId ? { ...e, enabled: !e.enabled } : e
    );
    saveInstalledExtensions(list);
    return list;
}

/**
 * Extract regex scripts from all enabled regex-type extensions.
 * @returns {Object[]} Array of regex scripts ready for regexEngine
 */
export function getRegexScriptsFromExtensions() {
    const extensions = getInstalledExtensions();
    const scripts = [];
    for (const ext of extensions) {
        if (!ext.enabled || ext.type !== 'regex') continue;
        if (Array.isArray(ext.data)) {
            for (const script of ext.data) {
                const result = safeValidate(RegexScriptSchema, script);
                if (result.success) {
                    scripts.push(result.data);
                } else {
                    console.warn(`[EXT] Regex script "${script.scriptName || 'unknown'}" validation failed:`, result.errors);
                    scripts.push(script); // vẫn push nguyên gốc để không mất dữ liệu
                }
            }
        }
    }
    return scripts;
}
