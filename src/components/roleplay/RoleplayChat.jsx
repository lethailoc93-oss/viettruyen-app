import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApiKey } from '../../context/ApiKeyContext';
import { useStoryDispatch } from '../../context/StoryContext';
import { applyRegexScripts, extractHtmlFromCodeBlock, REGEX_PLACEMENT } from '../../services/regexEngine';
import { getRegexScriptsFromExtensions } from '../../services/extensionService';
import { detectThemeFromStory, getThemeVars, getAllThemes, getThemeName, THEME_IDS } from '../../services/roleplayThemes';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trash2, User, Code, Palette } from 'lucide-react';
import GameStateTracker from './GameStateTracker';
import { useRoleplaySession } from './hooks/useRoleplaySession';
import MessageItem, { formatRoleplayText, removeStatusBlocks, sanitizeAndRenderHtml } from './MessageItem';
import ChatInput from './ChatInput';
import StatusBarRenderer from './StatusBarRenderer';
import RegexManager from './RegexManager';
import { variableManager } from '../../services/variableManager';
import '../../styles/slashCommands.css';
import './roleplayChat.css';

export default function RoleplayChat({ story, character, bgImage, onBack }) {
    const { apiKey } = useApiKey();
    const { updateStoryField } = useStoryDispatch();
    const [userPersona, setUserPersona] = useState(() => {
        const saved = localStorage.getItem(`rp_persona_${story?.id}`);
        if (!saved) return { name: 'Người chơi', description: '' };
        // FIX #8: try/catch to prevent crash on corrupt localStorage data
        try {
            return JSON.parse(saved);
        } catch {
            return { name: 'Người chơi', description: '' };
        }
    });
    const [showPersonaEdit, setShowPersonaEdit] = useState(false);
    const [showRegexPanel, setShowRegexPanel] = useState(false);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [manualTheme, setManualTheme] = useState(() => {
        const saved = localStorage.getItem(`rp_theme_${story?.id}`);
        return saved || null;
    });

    // ── Theme Detection ──
    const currentThemeId = useMemo(() => {
        if (manualTheme && manualTheme !== 'auto') return manualTheme;
        return detectThemeFromStory(story);
    }, [story, manualTheme]);

    const themeVars = useMemo(() => getThemeVars(currentThemeId), [currentThemeId]);

    const handleThemeChange = useCallback((themeId) => {
        setManualTheme(themeId);
        localStorage.setItem(`rp_theme_${story?.id}`, themeId);
        setShowThemeSelector(false);
    }, [story?.id]);

    const handleUpdateRegexScripts = useCallback((newScripts) => {
        updateStoryField('regexScripts', newScripts);
    }, [updateStoryField]);

    // Tracking image loading errors
    const [headerImageError, setHeaderImageError] = useState(false);
    const [msgImageErrors, setMsgImageErrors] = useState({});

    const handleMsgImageError = useCallback((idx) => {
        setMsgImageErrors(prev => ({ ...prev, [idx]: true }));
    }, []);

    const charName = character?.name || story?.title || 'Nhân vật';

    const {
        messages,
        setMessages,
        isGenerating,
        streamingText,
        handleSend,
        handleRegenerate,
        handleImpersonate,
        handleSwipe,
        handleClearChat,
        stopGeneration
    } = useRoleplaySession(story, character, userPersona, charName);

    const handleDeleteMessage = useCallback((deleteIdx) => {
        setMessages(prev => prev.filter((_, i) => i !== deleteIdx));
    }, [setMessages]);

    const handleEditMessage = useCallback((editIdx, newText) => {
        setMessages(prev => prev.map((m, i) => i === editIdx ? { ...m, content: newText } : m));
    }, [setMessages]);

    const chatContainerRef = useRef(null);

    // Regex scripts from card import
    const charRegexScripts = useMemo(() => story?.regexScripts || [], [story?.regexScripts]);

    // Global Regex scripts from extensions
    const [globalRegexes, setGlobalRegexes] = useState([]);
    useEffect(() => {
        setGlobalRegexes(getRegexScriptsFromExtensions());
    }, []);

    const allRegexScripts = useMemo(() => [...globalRegexes, ...charRegexScripts], [globalRegexes, charRegexScripts]);

    /**
     * Process message content through regex scripts.
     * Returns { html, isRegexHtml } — if isRegexHtml, render in iframe.
     */
    const processMessageContent = useCallback((content) => {
        let textWithVars = variableManager.replaceVariableMacros(content);

        if (!textWithVars || allRegexScripts.length === 0) {
            return { html: formatRoleplayText(removeStatusBlocks(textWithVars)), isRegexHtml: false };
        }

        const transformed = applyRegexScripts(textWithVars, allRegexScripts, [REGEX_PLACEMENT.AI_OUTPUT, REGEX_PLACEMENT.MD_DISPLAY], { isMarkdown: true });

        if (transformed !== textWithVars) {
            let htmlContent = extractHtmlFromCodeBlock(transformed);
            htmlContent = variableManager.replaceVariableMacros(htmlContent);

            const isHtml = /<\/?(html|style|div|table|button|iframe|script|tr|td|th)\b/i.test(htmlContent) || htmlContent.includes('<!DOCTYPE');

            if (isHtml) {
                return { html: htmlContent, isRegexHtml: true };
            }
            return { html: formatRoleplayText(removeStatusBlocks(htmlContent)), isRegexHtml: false };
        }

        return { html: formatRoleplayText(removeStatusBlocks(textWithVars)), isRegexHtml: false };
    }, [allRegexScripts]);

    // FIX #12: Removed separate isRegexMessage function that duplicated regex processing.
    // Now MessageItem gets the isRegexHtml flag directly from processMessageContent result.

    // Smart Auto-scroll
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        // Only trigger auto scroll if user is currently near the bottom (150px threshold)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

        if (isNearBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages, streamingText]);

    // Save persona
    useEffect(() => {
        localStorage.setItem(`rp_persona_${story?.id}`, JSON.stringify(userPersona));
    }, [userPersona, story?.id]);

    const lastMsgIsChar = messages.length > 0 && messages[messages.length - 1].role === 'char';
    const lastMsgAlts = lastMsgIsChar ? messages[messages.length - 1].alternatives : null;

    return (
        <div className="rp-wrapper" style={{ ...themeVars, ...(bgImage ? { backgroundImage: `url(${bgImage})` } : {}) }}>
            <div className="rp-overlay">
                <div className="rp-container">

                    {/* Left Sidebar: Controls & Persona */}
                    <div className="rp-sidebar rp-sidebar-left">
                        <div className="rp-sidebar-header">
                            <button className="rp-icon-btn" onClick={onBack} title="Quay lại">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="rp-sidebar-title">Trò chuyện</span>
                        </div>

                        <div className="rp-sidebar-section">
                            <div className="rp-char-card">
                                {/* Character Info */}
                                <div className="rp-char-info">
                                    <div className="rp-avatar-large">
                                        {bgImage && !headerImageError ? (
                                            <img
                                                src={bgImage}
                                                alt={charName}
                                                className="rp-avatar-img-large"
                                                onError={() => setHeaderImageError(true)}
                                            />
                                        ) : (
                                            <div className="rp-avatar-char-large">{charName[0]}</div>
                                        )}
                                    </div>
                                    <h2 className="rp-char-title">{charName}</h2>
                                    <span className="rp-header-status">
                                        {isGenerating ? '✍️ Đang viết...' : '🟢 Online'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rp-sidebar-section">
                            <button
                                className={`rp-menu-btn ${showPersonaEdit ? 'active' : ''}`}
                                onClick={() => setShowPersonaEdit(!showPersonaEdit)}
                            >
                                <User size={16} /> Nhân vật của bạn
                            </button>

                            <AnimatePresence>
                                {showPersonaEdit && (
                                    <motion.div
                                        className="rp-persona-panel"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                    >
                                        <div className="rp-persona-content">
                                            <input
                                                type="text"
                                                placeholder="Tên nhân vật..."
                                                value={userPersona.name}
                                                onChange={(e) => setUserPersona(p => ({ ...p, name: e.target.value }))}
                                                className="rp-persona-input"
                                            />
                                            <textarea
                                                placeholder="Mô tả ngoại hình, tính cách..."
                                                value={userPersona.description}
                                                onChange={(e) => setUserPersona(p => ({ ...p, description: e.target.value }))}
                                                className="rp-persona-textarea"
                                                rows={3}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="rp-sidebar-section">
                            <button
                                className={`rp-menu-btn ${showRegexPanel ? 'active' : ''}`}
                                onClick={() => setShowRegexPanel(!showRegexPanel)}
                            >
                                <Code size={16} /> Regex Scripts
                                {charRegexScripts.length > 0 && (
                                    <span style={{
                                        marginLeft: 'auto', fontSize: 10, padding: '1px 6px',
                                        background: `rgba(${themeVars['--rp-accent-rgb'] || '167,139,250'}, 0.2)`, borderRadius: 999,
                                        color: themeVars['--rp-accent'] || '#a78bfa'
                                    }}>
                                        {charRegexScripts.length}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showRegexPanel && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <RegexManager
                                            scripts={charRegexScripts}
                                            onUpdate={handleUpdateRegexScripts}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Theme Selector */}
                        <div className="rp-sidebar-section">
                            <button
                                className={`rp-menu-btn ${showThemeSelector ? 'active' : ''}`}
                                onClick={() => setShowThemeSelector(!showThemeSelector)}
                            >
                                <Palette size={16} /> Giao diện
                                <span style={{
                                    marginLeft: 'auto', fontSize: 11,
                                    color: themeVars['--rp-accent'] || '#a78bfa'
                                }}>
                                    {getThemeName(currentThemeId)}
                                </span>
                            </button>

                            <AnimatePresence>
                                {showThemeSelector && (
                                    <motion.div
                                        className="rp-theme-selector"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <button
                                            className={`rp-theme-option ${!manualTheme || manualTheme === 'auto' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('auto')}
                                        >
                                            🤖 Tự phát hiện
                                        </button>
                                        {getAllThemes().map(t => (
                                            <button
                                                key={t.id}
                                                className={`rp-theme-option ${currentThemeId === t.id && manualTheme !== 'auto' ? 'active' : ''}`}
                                                onClick={() => handleThemeChange(t.id)}
                                            >
                                                {t.emoji} {t.name}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div style={{ flex: 1 }} />

                        <div className="rp-sidebar-section rp-sidebar-bottom">
                            <button className="rp-menu-btn rp-btn-danger" onClick={handleClearChat}>
                                <Trash2 size={16} /> Xóa trò chuyện
                            </button>
                        </div>
                    </div>

                    {/* Center: Main Chat Area */}
                    <div className="rp-chat-main">
                        <div className="rp-chat-area" ref={chatContainerRef} style={{ overflowY: 'auto' }}>
                            {messages.map((msg, idx) => (
                                msg.role === 'system' ? (
                                    <div key={msg.id || idx} className="rp-system-msg">
                                        <div
                                            className="rp-system-msg-inner"
                                            dangerouslySetInnerHTML={sanitizeAndRenderHtml(formatRoleplayText(msg.content))}
                                        />
                                    </div>
                                ) : (
                                    <MessageItem
                                        key={msg.id || idx}
                                        msg={msg}
                                        idx={idx}
                                        charName={charName}
                                        bgImage={bgImage}
                                        userName={userPersona.name}
                                        processMessageContent={processMessageContent}
                                        onDelete={handleDeleteMessage}
                                        onEdit={handleEditMessage}
                                        msgImageError={headerImageError || msgImageErrors[idx]}
                                        onHandleMsgImageError={handleMsgImageError}
                                    />
                                )
                            ))}

                            {/* Streaming text */}
                            {isGenerating && streamingText && (
                                <motion.div className="rp-message rp-msg-char" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {bgImage && !headerImageError ? (
                                        <img src={bgImage} alt={charName} className="rp-msg-avatar rp-avatar-char rp-avatar-img" />
                                    ) : (
                                        <div className="rp-msg-avatar rp-avatar-char">{charName[0]}</div>
                                    )}
                                    <div className="rp-msg-bubble rp-msg-streaming">
                                        <div
                                            className="rp-msg-content"
                                            dangerouslySetInnerHTML={sanitizeAndRenderHtml(formatRoleplayText(removeStatusBlocks(streamingText)))}
                                        />
                                        <StatusBarRenderer content={streamingText} />
                                    </div>
                                </motion.div>
                            )}

                            {/* Generating indicator */}
                            {isGenerating && !streamingText && (
                                <div className="rp-message rp-msg-char">
                                    {bgImage && !headerImageError ? (
                                        <img src={bgImage} alt={charName} className="rp-msg-avatar rp-avatar-char rp-avatar-img" />
                                    ) : (
                                        <div className="rp-msg-avatar rp-avatar-char">{charName[0]}</div>
                                    )}
                                    <div className="rp-msg-bubble rp-msg-typing">
                                        <span className="rp-typing-dot"></span>
                                        <span className="rp-typing-dot"></span>
                                        <span className="rp-typing-dot"></span>
                                    </div>
                                </div>
                            )}

                            {/* Empty div for bottom padding to ensure final message isn't hidden by input */}
                            <div style={{ height: '20px' }} />
                        </div>

                        {/* Swipe controls */}
                        {lastMsgAlts && lastMsgAlts.length > 1 && !isGenerating && (
                            <div className="rp-swipe-bar">
                                <button onClick={() => handleSwipe(-1, messages)}><ChevronLeft size={16} /></button>
                                <span>{(messages[messages.length - 1].activeAlt || 0) + 1} / {lastMsgAlts.length}</span>
                                <button onClick={() => handleSwipe(1, messages)}><ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} /></button>
                            </div>
                        )}

                        {/* Input area */}
                        <ChatInput
                            onSend={(text) => handleSend(text, messages, apiKey)}
                            onStop={stopGeneration}
                            onRegenerate={() => handleRegenerate(messages, apiKey)}
                            onImpersonate={(callback) => handleImpersonate(messages, apiKey, callback)}
                            isGenerating={isGenerating}
                            disableRegenerate={!lastMsgIsChar}
                            userName={userPersona.name}
                            slashContext={{
                                messages,
                                setMessages,
                                story,
                                charName,
                                userName: userPersona.name,
                                onClearChat: handleClearChat,
                                onRename: (newName) => {
                                    setUserPersona(prev => {
                                        const updated = { ...prev, name: newName };
                                        localStorage.setItem(`rp_persona_${story?.id}`, JSON.stringify(updated));
                                        return updated;
                                    });
                                },
                            }}
                        />

                        {/* Right Sidebar: Game State Tracker */}
                        <div className="rp-sidebar rp-sidebar-right">
                            <GameStateTracker
                                story={story}
                                currentChatIdx={messages.length}
                                messages={messages}
                            />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
