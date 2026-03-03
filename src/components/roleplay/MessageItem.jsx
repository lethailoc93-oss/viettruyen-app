import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Trash2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import StatusBarRenderer from './StatusBarRenderer';
import { applyRegexScripts, extractHtmlFromCodeBlock, REGEX_PLACEMENT } from '../../services/regexEngine';
import { variableManager } from '../../services/variableManager';

// Helpers
const formatRoleplayText = (text) => {
    if (!text) return '';
    return marked.parse(text, { breaks: true, gfm: true });
};

const removeStatusBlocks = (text) => {
    if (!text) return text;
    return text.replace(/<status_block>[\s\S]*?<\/status_block>/g, '')
        .replace(/```json\s*\n\s*\{\s*"status_update"[\s\S]*?\}\s*\n\s*```/g, '')
        .replace(/<analysis>[\s\S]*?<\/analysis>/g, '')
        .replace(/<jsonpatch>[\s\S]*?<\/jsonpatch>/g, '')
        // 🔴 FIX: Strip SillyTavern custom XML tags (invisible in HTML)
        .replace(/<\/?UpdateVariable>/gi, '')
        .replace(/<\/?initvar>/gi, '')
        .replace(/<\/?Setvar>/gi, '')
        .replace(/<\/?Getvar>/gi, '')
        .replace(/<\/?AddVar>/gi, '')
        .replace(/<\/?SubVar>/gi, '')
        .replace(/<\/?MulVar>/gi, '')
        .replace(/<\/?IfVar>/gi, '')
        .replace(/<StatusPlaceHolderImpl\s*\/?>/gi, '')
        .replace(/<\/?StatusBlock>/gi, '')
        .replace(/<\/?StatusRender>/gi, '')
        .replace(/<\/?Execute>/gi, '')
        .replace(/<\/?Run>/gi, '')
        .replace(/<\/?Trigger>/gi, '')
        .replace(/<[A-Z][a-zA-Z]*\s*\/>/g, '')
        .trim();
};

function sanitizeAndRenderHtml(html) {
    return { __html: DOMPurify.sanitize(html, { ADD_IFRAMES: true }) }; // allow iframes if needed later, but sanitize scripts
}

/**
 * Extract narrative text from raw message content, stripping all XML/custom tags
 * and their inner content. Returns only the free-form text that the external
 * regex UI (iframe) may not render.
 */
function extractNarrativeText(content) {
    if (!content) return '';
    let text = content;
    // Remove all structured/XML blocks and their content
    text = text.replace(/<initvar>[\s\S]*?<\/initvar>/gi, '');
    text = text.replace(/<UpdateVariable[^>]*\/>/gi, '');
    text = text.replace(/<StatusPlaceHolderImpl\s*\/?>/gi, '');
    text = text.replace(/<[a-zA-Z_]+_status>[\s\S]*?<\/[a-zA-Z_]+_status>/gi, '');
    text = text.replace(/<analysis>[\s\S]*?<\/analysis>/gi, '');
    text = text.replace(/<jsonpatch>[\s\S]*?<\/jsonpatch>/gi, '');
    text = text.replace(/<status_block>[\s\S]*?<\/status_block>/gi, '');
    text = text.replace(/```json\s*\n\s*\{\s*"status_update"[\s\S]*?\}\s*\n\s*```/g, '');
    // Remove remaining self-closing uppercase tags
    text = text.replace(/<[A-Z][a-zA-Z]*\s*\/>/g, '');
    // Remove macro tags
    text = text.replace(/\{\{[^}]+\}\}/g, '');
    return text.trim();
}

// ── Regex-aware content renderer (Moved from giant component) ──
function RegexAwareContent({ content, processContent }) {
    const iframeRef = useRef(null);
    const [iframeFailed, setIframeFailed] = useState(false);
    const { html, isRegexHtml } = useMemo(() => {
        let res = processContent(content);
        if (res.isRegexHtml && res.html) {
            // Strip out hardcoded blob URLs from other sessions to avoid ERR_FILE_NOT_FOUND console spam
            res.html = res.html.replace(/src\s*=\s*(['"])blob:http:[^'"]+\1/gi, 'src=""');
            res.html = res.html.replace(/href\s*=\s*(['"])blob:http:[^'"]+\1/gi, 'href=""');
        }
        return res;
    }, [content, processContent]);

    // Extract narrative text that may not be rendered by the external regex UI
    const narrativeHtml = useMemo(() => {
        if (!isRegexHtml) return null;
        const narrative = extractNarrativeText(content);
        // Only return if there's meaningful text (more than just whitespace/punctuation)
        if (!narrative || narrative.length < 10) return null;
        return formatRoleplayText(narrative);
    }, [content, isRegexHtml]);

    useEffect(() => {
        const handleMessage = (e) => {
            if (!e.data) return;
            if (e.data.type === 'resize_iframe' && iframeRef.current) {
                if (e.source === iframeRef.current.contentWindow) {
                    iframeRef.current.style.height = Math.min(e.data.height + 20, 800) + 'px';
                }
            }
            // Handle variable changes from iframe TavernHelper shim
            if (e.data.type === 'tavern_set_variable' && e.data.key) {
                variableManager.setVar(e.data.key, e.data.value);
            }
            // Handle fill textarea requests from iframe
            if (e.data.type === 'tavern_fill_textarea' && e.data.text) {
                const chatInput = document.querySelector('.rp-chat-input textarea, .rp-chat-input input');
                if (chatInput) {
                    chatInput.value = e.data.text;
                    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Check if iframe loaded something visible after a timeout
    useEffect(() => {
        if (!isRegexHtml) return;
        const timer = setTimeout(() => {
            try {
                const iframe = iframeRef.current;
                if (iframe && iframe.contentDocument) {
                    const bodyText = iframe.contentDocument.body?.innerText?.trim();
                    if (!bodyText || bodyText.length < 3) {
                        setIframeFailed(true);
                    }
                }
            } catch (e) {
                // cross-origin or other error — ignore
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [isRegexHtml, html]);

    if (isRegexHtml) {
        // Đọc CSS vars từ .rp-wrapper (theme hiện tại)
        const getVar = (name, fallback) => {
            try {
                const wrapper = document.querySelector('.rp-wrapper');
                if (wrapper) {
                    const v = getComputedStyle(wrapper).getPropertyValue(name).trim();
                    if (v) return v;
                }
            } catch (e) { }
            return fallback;
        };

        const rpText = getVar('--rp-text', '#f1f2f6');
        const rpAccent = getVar('--rp-accent', '#a78bfa');
        const rpAccentRgb = getVar('--rp-accent-rgb', '167,139,250');
        const rpBg = getVar('--rp-bg', '#0b0f19');
        const rpTextMuted = getVar('--rp-text-muted', '#9ca3af');
        const rpBorder = getVar('--rp-border', 'rgba(255,255,255,0.1)');
        const rpActionColor = getVar('--rp-action-color', '#c4b5fd');
        const rpDialogueColor = getVar('--rp-dialogue-color', '#fde047');
        const rpSidebarBg = getVar('--rp-sidebar-bg', 'rgba(15,18,30,0.7)');
        const rpBubbleChar = getVar('--rp-bubble-char', 'rgba(30,32,45,0.75)');
        const rpScrollThumb = getVar('--rp-scroll-thumb', 'rgba(255,255,255,0.15)');
        const rpTableHeader = getVar('--rp-table-header', 'rgba(167,139,250,0.15)');
        const rpTableHeaderText = getVar('--rp-table-header-text', '#c4b5fd');

        // Serialize current variables for injection into iframe
        const serializedVars = JSON.stringify(variableManager.variables || {}).replace(/</g, '\\u003c').replace(/\//g, '\\/');

        const safeHtmlWithResizer = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <script src="https://code.jquery.com/jquery-3.7.1.min.js"><\/script>
                <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"><\/script>
                <style>
                    body {
                        margin: 0; padding: 8px;
                        color: ${rpText};
                        background: transparent;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        font-size: 15px; line-height: 1.6;
                        word-break: break-word;
                        /* SillyTavern CSS variables for compatibility */
                        --SmartThemeBodyColor: ${rpText};
                        --SmartThemeEmColor: ${rpActionColor};
                        --SmartThemeQuoteColor: ${rpDialogueColor};
                        --SmartThemeBorderColor: ${rpBorder};
                        --SmartThemeBlurTintColor: rgba(0,0,0,0.5);
                        --SmartThemeChatTintColor: ${rpSidebarBg};
                        --SmartThemeFontColor: ${rpText};
                        --SmartThemeBgColor: ${rpBg};
                        --color-bg-primary: ${rpBg};
                        --color-bg-secondary: ${rpBubbleChar};
                        --color-text-primary: ${rpText};
                        --color-text-secondary: ${rpTextMuted};
                        --color-accent: ${rpAccent};
                    }
                    * { box-sizing: border-box; }
                    em, i { color: ${rpActionColor}; }
                    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                    th, td { padding: 8px 12px; border: 1px solid rgba(${rpAccentRgb},0.12); text-align: left; }
                    th { background: ${rpTableHeader}; color: ${rpTableHeaderText}; font-weight: 600; }
                    tr:nth-child(even) { background: rgba(${rpAccentRgb},0.03); }
                    ::-webkit-scrollbar { width: 6px; height: 6px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: ${rpScrollThumb}; border-radius: 3px; }
                    #send_textarea { display: none; }
                </style>
            </head>
            <body>
            <textarea id="send_textarea" style="display:none;"></textarea>
            <script>
                // ══════════════════════════════════════════════════
                // SillyTavern / TavernHelper Compatibility Shim
                // ══════════════════════════════════════════════════
                (function() {
                    // ── Variable Store ──
                    var _variables = ${serializedVars};

                    // getAllVariables() — primary API expected by card scripts
                    window.getAllVariables = function() { return _variables; };

                    // SillyTavern getContext() stub
                    window.getContext = function() {
                        return {
                            variables: _variables,
                            chat: [],
                            characters: [],
                            onlineStatus: 'connected',
                            maxContext: 8192,
                        };
                    };

                    // ── TavernHelper API ──
                    window.TavernHelper = {
                        version: '2.0.0',
                        getVariable: function(key) {
                            return _variables[key] !== undefined ? _variables[key] : '';
                        },
                        setVariable: function(key, value) {
                            _variables[key] = value;
                            // Notify parent to persist variable change
                            window.parent.postMessage({
                                type: 'tavern_set_variable',
                                key: key,
                                value: value
                            }, '*');
                        },
                        getAllVariables: function() { return _variables; },
                        // Event system stub
                        on: function(event, callback) {
                            // Register event listener (stub for compatibility)
                            if (!this._events) this._events = {};
                            if (!this._events[event]) this._events[event] = [];
                            this._events[event].push(callback);
                        },
                        emit: function(event, data) {
                            if (this._events && this._events[event]) {
                                this._events[event].forEach(function(cb) { try { cb(data); } catch(e) {} });
                            }
                        },
                        _events: {}
                    };

                    // SillyTavern event system compatibility
                    window.eventSource = {
                        on: function() {},
                        emit: function() {},
                        once: function() {},
                        removeListener: function() {}
                    };
                    window.event_types = {
                        CHAT_CHANGED: 'chatChanged',
                        MESSAGE_RECEIVED: 'messageReceived',
                        MESSAGE_SENT: 'messageSent',
                        GENERATION_STARTED: 'generationStarted',
                        GENERATION_ENDED: 'generationEnded'
                    };

                    // fillSendTextarea bridge — posts message to parent
                    window.fillSendTextarea = function(text) {
                        window.parent.postMessage({
                            type: 'tavern_fill_textarea',
                            text: text
                        }, '*');
                    };

                    // Listen for variable updates from parent
                    window.addEventListener('message', function(e) {
                        if (e.data && e.data.type === 'update_variables') {
                            _variables = e.data.variables || {};
                        }
                    });
                })();
            <\/script>
            ${html}
            <script>
                (function() {
                    var sendHeight = function() {
                        try {
                            var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight);
                            window.parent.postMessage({ type: 'resize_iframe', height: h }, '*');
                        } catch (e) {}
                    };
                    window.addEventListener('load', function() {
                        sendHeight();
                        if (window.MutationObserver) {
                            var obs = new MutationObserver(sendHeight);
                            obs.observe(document.body, { childList: true, subtree: true, attributes: true });
                        }
                    });
                    setTimeout(sendHeight, 500);
                    setTimeout(sendHeight, 1500);
                    setTimeout(sendHeight, 3000);
                })();
            <\/script>
            </body>
            </html>
        `;

        return (
            <div className="rp-regex-html-container">
                <iframe
                    ref={iframeRef}
                    className="rp-regex-iframe"
                    sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
                    title="Regex HTML Content"
                    srcDoc={safeHtmlWithResizer}
                />
                {/* Show narrative text that the external UI doesn't render */}
                {narrativeHtml && (
                    <div
                        className="rp-msg-content rp-narrative-text"
                        dangerouslySetInnerHTML={sanitizeAndRenderHtml(narrativeHtml)}
                    />
                )}
                {/* Fallback: show original text if iframe fails to render after timeout */}
                {iframeFailed && (
                    <div className="rp-regex-fallback">
                        <div
                            className="rp-msg-content"
                            dangerouslySetInnerHTML={sanitizeAndRenderHtml(
                                formatRoleplayText(removeStatusBlocks(content))
                            )}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="rp-msg-content"
            dangerouslySetInnerHTML={sanitizeAndRenderHtml(html)}
        />
    );
}


// --- Memoized Message Item ---
const MessageItem = React.memo(({ msg, idx, charName, bgImage, userName, processMessageContent, onDelete, onEdit, msgImageError, onHandleMsgImageError }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(msg.content);

    // FIX #12: Derive isRegexHtml from processMessageContent (single pass, no duplicate)
    const isRegex = useMemo(() => {
        if (msg.role !== 'char') return false;
        const { isRegexHtml } = processMessageContent(msg.content);
        return isRegexHtml;
    }, [msg.content, msg.role, processMessageContent]);

    const handleSave = () => {
        onEdit(idx, editText);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditText(msg.content);
        setIsEditing(false);
    };

    return (
        <motion.div
            className={`rp-message ${msg.role === 'char' ? 'rp-msg-char' : 'rp-msg-user'}${isRegex ? ' rp-msg-regex' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            {msg.role === 'char' && (
                bgImage && !msgImageError ? (
                    <img
                        src={bgImage}
                        alt={charName}
                        className="rp-msg-avatar rp-avatar-char rp-avatar-img"
                        onError={() => onHandleMsgImageError(idx)}
                    />
                ) : (
                    <div className="rp-msg-avatar rp-avatar-char">{charName[0]}</div>
                )
            )}
            <div className="rp-msg-bubble">
                {isEditing ? (
                    <div className="rp-msg-edit">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="rp-msg-edit-input"
                            style={{ minHeight: '120px', resize: 'vertical' }}
                        />
                        <div className="rp-msg-edit-actions">
                            <button onClick={handleSave} className="rp-btn-sm rp-btn-save">Lưu</button>
                            <button onClick={handleCancel} className="rp-btn-sm">Hủy</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <RegexAwareContent content={msg.content} processContent={processMessageContent} />
                        {msg.role === 'char' && <StatusBarRenderer content={msg.content} />}
                        <div className="rp-msg-actions">
                            <button onClick={() => setIsEditing(true)} title="Sửa"><Edit3 size={12} /></button>
                            <button onClick={() => onDelete(idx)} title="Xóa"><Trash2 size={12} /></button>
                        </div>
                    </>
                )}
            </div>
            {msg.role === 'user' && (
                <div className="rp-msg-avatar rp-avatar-user">{(userName || 'U')[0]}</div>
            )}
        </motion.div>
    );
});

export { formatRoleplayText, removeStatusBlocks, sanitizeAndRenderHtml, RegexAwareContent };
export default MessageItem;
