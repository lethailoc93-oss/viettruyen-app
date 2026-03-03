import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, RotateCcw, Wand2, Square } from 'lucide-react';
import { showToast } from '../modals/Toast';
import { executeSlashCommand, findMatchingCommands } from '../../services/slashCommands';
import SlashCommandPopup from './SlashCommandPopup';

const MAX_INPUT_LENGTH = 50000;

const ChatInput = ({ onSend, onStop, onRegenerate, onImpersonate, isGenerating, disableRegenerate, userName, slashContext }) => {
    const [inputText, setInputText] = useState('');
    const [slashActiveIdx, setSlashActiveIdx] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
        }
    }, [inputText]);

    // Detect if showing slash popup
    const slashQuery = useMemo(() => {
        if (!inputText.startsWith('/')) return null;
        // Only show popup if cursor is still on the command part (no space yet, or partial)
        const spaceIdx = inputText.indexOf(' ');
        if (spaceIdx < 0) return inputText.substring(1); // still typing command name
        return null; // user already typed args, hide popup
    }, [inputText]);

    const showSlashPopup = slashQuery !== null;
    const matchingCommands = useMemo(
        () => showSlashPopup ? findMatchingCommands(slashQuery) : [],
        [showSlashPopup, slashQuery]
    );

    // Reset active index when query changes
    useEffect(() => {
        setSlashActiveIdx(0);
    }, [slashQuery]);

    const handleSlashSelect = (cmd) => {
        setInputText(`/${cmd.name} `);
        inputRef.current?.focus();
    };

    const handleSendSubmit = () => {
        const textToSubmit = inputText.trim();
        if (!textToSubmit || isGenerating) return;

        if (textToSubmit.length > MAX_INPUT_LENGTH) {
            showToast('Lời thoại quá dài! Vui lòng cắt nhỏ để đảm bảo ứng dụng xử lý ổn định.', 'error');
            return;
        }

        // Check if it's a slash command
        if (textToSubmit.startsWith('/') && slashContext) {
            const ctx = { ...slashContext, showToast };
            const handled = executeSlashCommand(textToSubmit, ctx);
            if (handled) {
                setInputText('');
                if (inputRef.current) inputRef.current.style.height = 'auto';
                return;
            }
        }

        onSend(textToSubmit);
        setInputText('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        // Slash popup navigation
        if (showSlashPopup && matchingCommands.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashActiveIdx(prev => (prev + 1) % matchingCommands.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashActiveIdx(prev => (prev - 1 + matchingCommands.length) % matchingCommands.length);
                return;
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                handleSlashSelect(matchingCommands[slashActiveIdx]);
                return;
            }
            if (e.key === 'Escape') {
                setInputText('');
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendSubmit();
        }
    };

    return (
        <div className="rp-input-area" style={{ position: 'relative' }}>
            {/* Slash Command Popup */}
            {showSlashPopup && (
                <SlashCommandPopup
                    query={slashQuery}
                    activeIndex={slashActiveIdx}
                    onSelect={handleSlashSelect}
                />
            )}

            <div className="rp-input-actions">
                <button
                    className="rp-action-btn"
                    onClick={onRegenerate}
                    disabled={isGenerating || disableRegenerate}
                    title="Tạo lại câu trả lời"
                >
                    <RotateCcw size={16} />
                </button>
                <button
                    className="rp-action-btn"
                    onClick={() => onImpersonate((text) => setInputText(prev => prev + (prev ? ' ' : '') + text))}
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
                    placeholder={`Nhập tin nhắn với tư cách ${userName || 'bạn'}... (/ để xem lệnh)`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    readOnly={isGenerating}
                    style={{ opacity: isGenerating ? 0.7 : 1, resize: 'none', overflowY: 'auto' }}
                />
                {isGenerating ? (
                    <button
                        className="rp-send-btn rp-stop-btn animate-pulse"
                        onClick={onStop}
                        title="Dừng sinh văn bản"
                    >
                        <Square size={18} fill="currentColor" />
                    </button>
                ) : (
                    <button
                        className="rp-send-btn"
                        onClick={handleSendSubmit}
                        disabled={!inputText.trim()}
                    >
                        <Send size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatInput;
