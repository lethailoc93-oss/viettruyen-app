// ================================================
// RoleplayChat — Giao diện Chat Nhập vai
// ================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { assembleRoleplayPrompt, replaceMacros } from '../../services/promptAssembler';
import { callOrbitAPIStream, callOrbitAPI, getGenerationConfig } from '../../services/apiClient';
import { showToast } from '../modals/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, RotateCcw, ArrowLeft, ArrowRight, Wand2, Edit3,
    ChevronLeft, Trash2, Settings, User, Bot, Sparkles
} from 'lucide-react';
import GameStateTracker from './GameStateTracker';
import StatusBarRenderer, { removeStatusBlocks } from './StatusBarRenderer';
import './roleplayChat.css';

export default function RoleplayChat({ story, character, bgImage, onBack }) {
    const { apiKey } = useApiKey();
    const [messages, setMessages] = useState([]); // [{role, content, alternatives?, activeAlt?}]
    const [inputText, setInputText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [userPersona, setUserPersona] = useState(() => {
        const saved = localStorage.getItem(`rp_persona_${story?.id}`);
        return saved ? JSON.parse(saved) : { name: 'Người chơi', description: '' };
    });
    const [showPersonaEdit, setShowPersonaEdit] = useState(false);
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);

    const charName = character?.name || story?.title || 'Nhân vật';

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    // Load saved chat
    useEffect(() => {
        const saved = localStorage.getItem(`rp_chat_${story?.id}`);
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch { /* ignore */ }
        } else {
            // First message from character
            const firstMes = getFirstMessage();
            if (firstMes) {
                setMessages([{ role: 'char', content: firstMes, alternatives: [firstMes], activeAlt: 0 }]);
            }
        }
    }, [story?.id]);

    // Save chat on change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`rp_chat_${story?.id}`, JSON.stringify(messages));
        }
    }, [messages, story?.id]);

    // Save persona
    useEffect(() => {
        localStorage.setItem(`rp_persona_${story?.id}`, JSON.stringify(userPersona));
    }, [userPersona, story?.id]);

    function getFirstMessage() {
        // From card import
        const d = story?._cardImport ? (character || {}) : {};
        const firstMes = d.first_mes || d.firstMes || '';
        if (firstMes) return replaceMacros(firstMes, { charName, userName: userPersona.name });

        // From story content / first chapter
        const ch1 = story?.database?.chapters?.[0];
        if (ch1?.content) return ch1.content;
        if (story?.content) return story.content;

        return `*${charName} xuất hiện trước mặt bạn.*\n\n"Chào mừng. Ta là ${charName}. Hãy kể cho ta nghe — ngươi đến đây làm gì?"`;
    }

    // ── Send Message ──
    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || isGenerating) return;

        const userMsg = { role: 'user', content: text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputText('');
        setIsGenerating(true);
        setStreamingText('');

        try {
            const response = await generateAIResponse(newMessages);
            const charMsg = { role: 'char', content: response, alternatives: [response], activeAlt: 0 };
            setMessages(prev => [...prev, charMsg]);
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('❌ Lỗi AI: ' + err.message, 'error');
            }
        } finally {
            setIsGenerating(false);
            setStreamingText('');
        }
    }, [inputText, messages, isGenerating]);

    // ── Generate AI Response ──
    async function generateAIResponse(chatHistory) {
        const genConfig = getGenerationConfig();
        const model = genConfig.model || 'gemini-3-flash-preview';

        // Build prompt using assembler
        const { messages: promptMessages } = assembleRoleplayPrompt({
            story,
            character,
            chatHistory: chatHistory.map(m => ({
                role: m.role === 'char' ? 'assistant' : 'user',
                content: m.content,
            })),
            userPersona,
            macros: { charName, userName: userPersona.name },
            maxContext: genConfig.contextSize || story?.maxInputTokens || 8192
        });

        const maxTokens = story?.maxOutputTokens || genConfig.maxOutputTokens || 1024;

        // Streaming
        abortRef.current = new AbortController();
        let fullResponse = '';

        if (genConfig.streamEnabled !== false) {
            fullResponse = await callOrbitAPIStream(
                apiKey, model, promptMessages, maxTokens,
                (chunk) => {
                    fullResponse += chunk;
                    setStreamingText(fullResponse);
                },
                { signal: abortRef.current.signal }
            );
        } else {
            fullResponse = await callOrbitAPI(apiKey, model, promptMessages, maxTokens, 3, {
                signal: abortRef.current.signal,
            });
        }

        return fullResponse || '...';
    }

    // ── Regenerate last response ──
    const handleRegenerate = useCallback(async () => {
        if (isGenerating || messages.length < 2) return;

        // Remove last char message, keep history up to last user msg
        const lastCharIdx = messages.length - 1;
        if (messages[lastCharIdx].role !== 'char') return;

        const historyUpToUser = messages.slice(0, lastCharIdx);
        setIsGenerating(true);
        setStreamingText('');

        try {
            const response = await generateAIResponse(historyUpToUser);
            const lastMsg = messages[lastCharIdx];
            const newAlts = [...(lastMsg.alternatives || [lastMsg.content]), response];
            const updatedMsg = { ...lastMsg, content: response, alternatives: newAlts, activeAlt: newAlts.length - 1 };
            setMessages([...historyUpToUser, updatedMsg]);
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('❌ Lỗi: ' + err.message, 'error');
            }
        } finally {
            setIsGenerating(false);
            setStreamingText('');
        }
    }, [messages, isGenerating]);

    // ── Swipe between alternatives ──
    const handleSwipe = useCallback((direction) => {
        const lastIdx = messages.length - 1;
        const lastMsg = messages[lastIdx];
        if (lastMsg?.role !== 'char' || !lastMsg.alternatives || lastMsg.alternatives.length <= 1) return;

        let newAlt = (lastMsg.activeAlt || 0) + direction;
        if (newAlt < 0) newAlt = lastMsg.alternatives.length - 1;
        if (newAlt >= lastMsg.alternatives.length) newAlt = 0;

        const updated = { ...lastMsg, content: lastMsg.alternatives[newAlt], activeAlt: newAlt };
        setMessages(prev => [...prev.slice(0, lastIdx), updated]);
    }, [messages]);

    // ── Impersonate (AI writes for user) ──
    const handleImpersonate = useCallback(async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        setStreamingText('');

        try {
            const genConfig = getGenerationConfig();
            const model = genConfig.model || 'gemini-3-flash-preview';

            const { messages: promptMessages } = assembleRoleplayPrompt({
                story,
                character,
                chatHistory: messages.map(m => ({
                    role: m.role === 'char' ? 'assistant' : 'user',
                    content: m.content,
                })),
                userPersona,
                macros: { charName, userName: userPersona.name },
                maxContext: genConfig.contextSize || story?.maxInputTokens || 8192
            });

            // Override: ask AI to write as user
            promptMessages.push({
                role: 'user',
                content: `[OOC: Hãy viết câu trả lời tiếp theo với tư cách ${userPersona.name || 'người chơi'}. Viết ngôi thứ nhất. Chỉ viết 1-3 câu ngắn gọn.]`,
            });

            const response = await callOrbitAPI(apiKey, model, promptMessages, 500, 3);
            if (response) {
                setInputText(response.replace(/^\[.*?\]\s*/g, '').trim());
            }
        } catch (err) {
            showToast('❌ Lỗi: ' + err.message, 'error');
        } finally {
            setIsGenerating(false);
            setStreamingText('');
        }
    }, [messages, isGenerating]);

    // ── Delete message ──
    const handleDeleteMessage = (index) => {
        setMessages(prev => prev.filter((_, i) => i !== index));
    };

    // ── Edit message ──
    const [editingIdx, setEditingIdx] = useState(-1);
    const [editText, setEditText] = useState('');

    const startEdit = (idx) => {
        setEditingIdx(idx);
        setEditText(messages[idx].content);
    };

    const saveEdit = () => {
        if (editingIdx >= 0) {
            setMessages(prev => prev.map((m, i) => i === editingIdx ? { ...m, content: editText } : m));
            setEditingIdx(-1);
        }
    };

    // ── Stop generation ──
    const handleStop = () => {
        abortRef.current?.abort();
    };

    // ── Clear chat ──
    const handleClearChat = () => {
        if (confirm('Xóa toàn bộ cuộc trò chuyện?')) {
            localStorage.removeItem(`rp_chat_${story?.id}`);
            const firstMes = getFirstMessage();
            setMessages(firstMes ? [{ role: 'char', content: firstMes, alternatives: [firstMes], activeAlt: 0 }] : []);
        }
    };

    // ── Key handler ──
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Render ──
    const lastMsgIsChar = messages.length > 0 && messages[messages.length - 1].role === 'char';
    const lastMsgAlts = lastMsgIsChar ? messages[messages.length - 1].alternatives : null;

    return (
        <div className="rp-wrapper" style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}>
            <div className="rp-overlay">
                <div className="rp-container">

                    {/* Left Sidebar: Controls & Persona */}
                    <div className="rp-sidebar rp-sidebar-left">
                        <div className="rp-sidebar-header">
                            <button className="rp-icon-btn" onClick={onBack} title="Quay lại">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="rp-sidebar-title">Nhập vai</span>
                        </div>

                        <div className="rp-sidebar-section">
                            <div className="rp-char-card">
                                <div className="rp-header-avatar">{charName[0]}</div>
                                <div className="rp-char-info">
                                    <h2 className="rp-header-name">{charName}</h2>
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

                        <div style={{ flex: 1 }} />

                        <div className="rp-sidebar-section rp-sidebar-bottom">
                            <button className="rp-menu-btn rp-btn-danger" onClick={handleClearChat}>
                                <Trash2 size={16} /> Xóa trò chuyện
                            </button>
                        </div>
                    </div>

                    {/* Center: Main Chat Area */}
                    <div className="rp-chat-main">
                        <div className="rp-chat-area">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    className={`rp-message ${msg.role === 'char' ? 'rp-msg-char' : 'rp-msg-user'}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {msg.role === 'char' && (
                                        <div className="rp-msg-avatar rp-avatar-char">{charName[0]}</div>
                                    )}
                                    <div className="rp-msg-bubble">
                                        {editingIdx === idx ? (
                                            <div className="rp-msg-edit">
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="rp-msg-edit-input"
                                                    rows={4}
                                                />
                                                <div className="rp-msg-edit-actions">
                                                    <button onClick={saveEdit} className="rp-btn-sm rp-btn-save">Lưu</button>
                                                    <button onClick={() => setEditingIdx(-1)} className="rp-btn-sm">Hủy</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div
                                                    className="rp-msg-content"
                                                    dangerouslySetInnerHTML={{ __html: formatRoleplayText(removeStatusBlocks(msg.content)) }}
                                                />
                                                {msg.role === 'char' && <StatusBarRenderer content={msg.content} />}
                                                <div className="rp-msg-actions">
                                                    <button onClick={() => startEdit(idx)} title="Sửa"><Edit3 size={12} /></button>
                                                    <button onClick={() => handleDeleteMessage(idx)} title="Xóa"><Trash2 size={12} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="rp-msg-avatar rp-avatar-user">{(userPersona.name || 'U')[0]}</div>
                                    )}
                                </motion.div>
                            ))}

                            {/* Streaming text */}
                            {isGenerating && streamingText && (
                                <motion.div className="rp-message rp-msg-char" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div className="rp-msg-avatar rp-avatar-char">{charName[0]}</div>
                                    <div className="rp-msg-bubble rp-msg-streaming">
                                        <div
                                            className="rp-msg-content"
                                            dangerouslySetInnerHTML={{ __html: formatRoleplayText(removeStatusBlocks(streamingText)) }}
                                        />
                                        <StatusBarRenderer content={streamingText} />
                                    </div>
                                </motion.div>
                            )}

                            {/* Generating indicator */}
                            {isGenerating && !streamingText && (
                                <div className="rp-message rp-msg-char">
                                    <div className="rp-msg-avatar rp-avatar-char">{charName[0]}</div>
                                    <div className="rp-msg-bubble rp-msg-typing">
                                        <span className="rp-typing-dot"></span>
                                        <span className="rp-typing-dot"></span>
                                        <span className="rp-typing-dot"></span>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Swipe controls */}
                        {lastMsgAlts && lastMsgAlts.length > 1 && !isGenerating && (
                            <div className="rp-swipe-bar">
                                <button onClick={() => handleSwipe(-1)}><ArrowLeft size={16} /></button>
                                <span>{(messages[messages.length - 1].activeAlt || 0) + 1} / {lastMsgAlts.length}</span>
                                <button onClick={() => handleSwipe(1)}><ArrowRight size={16} /></button>
                            </div>
                        )}

                        {/* Input area */}
                        <div className="rp-input-area">
                            <div className="rp-input-actions">
                                <button
                                    className="rp-action-btn"
                                    onClick={handleRegenerate}
                                    disabled={isGenerating || !lastMsgIsChar}
                                    title="Tạo lại câu trả lời"
                                >
                                    <RotateCcw size={16} />
                                </button>
                                <button
                                    className="rp-action-btn"
                                    onClick={handleImpersonate}
                                    disabled={isGenerating}
                                    title="AI viết hộ cho bạn"
                                >
                                    <Wand2 size={16} />
                                </button>
                            </div>
                            <div className="rp-input-wrapper">
                                <textarea
                                    ref={inputRef}
                                    className="rp-input"
                                    placeholder={`Nhập tin nhắn với tư cách ${userPersona.name || 'bạn'}...`}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    disabled={isGenerating}
                                />
                                {isGenerating ? (
                                    <button className="rp-send-btn rp-stop-btn" onClick={handleStop}>
                                        ⏹
                                    </button>
                                ) : (
                                    <button
                                        className="rp-send-btn"
                                        onClick={handleSend}
                                        disabled={!inputText.trim()}
                                    >
                                        <Send size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

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

// ── Format roleplay text ──
function formatRoleplayText(text) {
    if (!text) return '';
    return text
        // Italic: *text* → <em>
        .replace(/\*([^*]+)\*/g, '<em className="rp-action">$1</em>')
        // Bold: **text** → <strong>
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Quotes: "text" → styled
        .replace(/"([^"]+)"/g, '<span className="rp-dialogue">"$1"</span>')
        // Newlines
        .replace(/\n/g, '<br/>')
        // Details blocks (thought blocks)
        .replace(/<details>([\s\S]*?)<\/details>/gi, '<div className="rp-details">$1</div>');
}
