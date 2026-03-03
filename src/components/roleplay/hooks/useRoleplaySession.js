import { useState, useRef, useEffect, useCallback } from 'react';
import { useStoryDispatch } from '../../../context/StoryContext';
import { callOrbitAPIStream, callOrbitAPI, getGenerationConfig } from '../../../services/apiClient';
import { assembleRoleplayPrompt, replaceMacros } from '../../../services/promptAssembler';
import { applyRegexScripts, REGEX_PLACEMENT } from '../../../services/regexEngine';
import { checkAndSummarize, getMemorySummary } from '../../../services/memorySummarizer';
import { scanRoleplayState } from '../../../services/roleplayStateManager';
import { showToast } from '../../modals/Toast';
import { get, set, del } from 'idb-keyval';
import { variableManager } from '../../../services/variableManager';
import { sandboxManager } from '../../../services/sandboxManager';

export function useRoleplaySession(story, character, userPersona, charName) {
    const { updateStoryField } = useStoryDispatch();
    const [messages, setMessages] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [memorySummary, setMemorySummary] = useState(null);

    // Thêm ref để track số tin nhắn chưa được MVU scan
    const untrackedMessagesRef = useRef(0);
    const [isSyncingState, setIsSyncingState] = useState(false);

    const abortRef = useRef(null);
    // FIX #3: Use ref to prevent race condition with stale closure
    const isGeneratingRef = useRef(false);

    // Load memory summary on mount
    useEffect(() => {
        if (story?.id) {
            variableManager.loadStoryVariables(story.id);
            getMemorySummary(story.id).then(mem => {
                if (mem) setMemorySummary(mem);
            });
        }
    }, [story?.id]);

    // Helper for initial message
    const getFirstMessage = useCallback(() => {
        // 🔴 FIX: Luôn kiểm tra character.first_mes trước (RoleplayPage đã set đúng)
        const firstMes = character?.first_mes || character?.firstMes || '';
        if (firstMes) return replaceMacros(firstMes, { charName, userName: userPersona.name });

        const ch1 = story?.database?.chapters?.[0];
        if (ch1?.content) return replaceMacros(ch1.content, { charName, userName: userPersona.name });
        if (story?.content) return replaceMacros(story.content, { charName, userName: userPersona.name });

        return `*${charName} xuất hiện trước mặt bạn.*\n\n"Chào mừng. Ta là ${charName}. Hãy kể cho ta nghe — ngươi đến đây làm gì?"`;
    }, [story, character, charName, userPersona.name]);

    // Initial load from IndexedDB
    useEffect(() => {
        const loadInitialData = async () => {
            const key = `rp_chat_${story?.id}`;
            try {
                const saved = await get(key);
                if (saved) {
                    setMessages(saved);
                    return;
                }
            } catch (error) {
                console.error("Lỗi đọc lịch sử chat IndexedDB:", error);
                try { await del(key); } catch (e) { } // Dọn rác
            }

            // First message fallback
            const firstMes = getFirstMessage();
            if (firstMes) {
                setMessages([{ id: Date.now(), role: 'char', content: firstMes, alternatives: [firstMes], activeAlt: 0 }]);
            }
        };
        loadInitialData();
    }, [story?.id, getFirstMessage]);

    // Async IndexedDB Save
    useEffect(() => {
        if (!messages.length) return;
        const timer = setTimeout(async () => {
            try {
                await set(`rp_chat_${story?.id}`, messages);
            } catch (error) {
                console.error("Lỗi lưu IndexedDB:", error);
                showToast('Lỗi lưu trữ cục bộ: Không thể ghi dữ liệu.', 'error');
            }
        }, 1200);
        return () => clearTimeout(timer);
    }, [messages, story?.id]);

    // Main generate function
    const generateAIResponse = useCallback(async (chatHistory, apiKey, overridePrompt = null) => {
        const genConfig = getGenerationConfig();
        const model = genConfig.model || 'gemini-3-flash-preview';

        // 🔴 SECURITY FIX: Run safe Javascript sandbox for "Controller" tags
        if (story?.database?.metaRules) {
            const controllerScripts = story.database.metaRules.filter(r => r._type === 'controller' && r.enabled);

            // Lấy currentMessage từ chatHistory (tin nhắn cuối cùng của user)
            const currentMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].content : '';

            for (const script of controllerScripts) {
                const code = script.content || script.description || '';
                if (code.includes('@@preprocessing') || code.trim().length > 0) {
                    await sandboxManager.evaluateCardPreprocessing(code, chatHistory, currentMessage);
                }
            }
        }

        const { messages: promptMessages } = assembleRoleplayPrompt({
            story,
            character,
            chatHistory: chatHistory.map(m => ({
                role: m.role === 'char' ? 'assistant' : 'user',
                content: m.content,
            })),
            userPersona,
            macros: { charName, userName: userPersona.name },
            maxContext: genConfig.contextSize || story?.maxInputTokens || 8192,
            memorySummary,
        });

        if (overridePrompt) {
            promptMessages.push(overridePrompt);
        }

        const maxTokens = story?.maxOutputTokens || genConfig.maxOutputTokens || 1024;

        if (abortRef.current) {
            abortRef.current.abort();
        }
        abortRef.current = new AbortController();
        let fullResponse = '';

        if (genConfig.streamEnabled !== false && !overridePrompt) {
            // FIX #4: Use local accumulator for streaming display,
            // then use API return value as the final result (avoids double-counting)
            let streamAccum = '';
            fullResponse = await callOrbitAPIStream(
                apiKey, model, promptMessages, maxTokens,
                (chunk) => {
                    streamAccum += chunk;
                    setStreamingText(streamAccum);
                },
                { signal: abortRef.current.signal }
            );
        } else {
            // For impersonate or non-stream
            fullResponse = await callOrbitAPI(apiKey, model, promptMessages, maxTokens, 3, {
                signal: abortRef.current.signal,
            });
        }

        if (fullResponse) {
            fullResponse = variableManager.processExecutionTags(fullResponse);
        }

        return fullResponse || '...';
    }, [story, character, userPersona, charName, memorySummary]);

    // Send ordinary message
    const handleSend = useCallback(async (text, currentMessages, apiKey) => {
        // FIX #3: Use ref to check real-time isGenerating state (avoids stale closure)
        if (!text.trim() || isGeneratingRef.current) return;

        // Apply USER_INPUT regex scripts before sending to AI
        const regexScripts = story?.regexScripts || [];
        const processedText = regexScripts.length > 0
            ? applyRegexScripts(text, regexScripts, REGEX_PLACEMENT.USER_INPUT, {
                macros: { charName, userName: userPersona.name }
            })
            : text;

        const userMsg = { id: Date.now(), role: 'user', content: text }; // Display original
        let historySnapshot = [];
        setMessages(prev => {
            // For AI context: use processed text; for display: keep original
            const aiMsg = { ...userMsg, content: processedText };
            historySnapshot = [...prev, aiMsg];
            return [...prev, userMsg]; // UI shows original
        });

        setIsGenerating(true);
        isGeneratingRef.current = true;
        setStreamingText('');

        try {
            const response = await generateAIResponse(historySnapshot, apiKey);
            const charMsg = { id: Date.now() + 1, role: 'char', content: response, alternatives: [response], activeAlt: 0 };
            const newMessages = [...historySnapshot, charMsg];
            setMessages(prev => [...prev, charMsg]);

            // Fire-and-forget: check if memory summarization is needed
            checkAndSummarize({
                storyId: story?.id,
                messages: newMessages,
                apiKey,
                charName,
                userName: userPersona.name,
                onSummaryUpdate: setMemorySummary,
            }).catch(() => { }); // ignore errors

            // MVU State Syncing trigger (Run in background)
            untrackedMessagesRef.current += 1;
            // Scan every 3 messages
            if (untrackedMessagesRef.current >= 3 && !isSyncingState) {
                untrackedMessagesRef.current = 0;
                setIsSyncingState(true);

                // Lay N tin nhan gan nhat de scan (khoang 15-20 tin)
                const scanHistory = newMessages.slice(-20);

                scanRoleplayState(apiKey, scanHistory, story, { model: getGenerationConfig()?.model })
                    .then(updates => {
                        setIsSyncingState(false);
                        if (!updates) return;

                        let hasChanges = false;
                        const db = story?.database || {};
                        let newDb = { ...db };

                        // 1. New Characters
                        if (updates.characters?.length > 0) {
                            const newChars = updates.characters.map(c => ({
                                id: `char_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                                name: c.name,
                                description: c.description,
                                newState: c.newState,
                                keywords: c.name
                            }));
                            newDb.characters = [...(newDb.characters || []), ...newChars];
                            hasChanges = true;
                        }

                        // 2. Character Updates
                        if (updates.characterUpdates?.length > 0 && newDb.characters?.length > 0) {
                            updates.characterUpdates.forEach(update => {
                                const index = newDb.characters.findIndex(c => c.name.toLowerCase() === update.name.toLowerCase());
                                if (index !== -1) {
                                    newDb.characters[index] = {
                                        ...newDb.characters[index],
                                        newState: update.newState || newDb.characters[index].newState,
                                        currentLocation: update.currentLocation || newDb.characters[index].currentLocation
                                    };
                                    hasChanges = true;
                                }
                            });
                        }

                        // 3. New Items
                        if (updates.items?.length > 0) {
                            const newItems = updates.items.map(i => ({
                                id: `item_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                                name: i.name,
                                description: i.effect || i.newState || '',
                                owner: i.owner,
                                quantity: i.quantity,
                                keywords: i.name
                            }));
                            newDb.items = [...(newDb.items || []), ...newItems];
                            hasChanges = true;
                        }

                        // 4. New Settings (Locations)
                        if (updates.settings?.length > 0) {
                            const newLocs = updates.settings.map(s => ({
                                id: `setting_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                                name: s.name,
                                description: s.description || s.newState || '',
                                keywords: s.name
                            }));
                            newDb.settings = [...(newDb.settings || []), ...newLocs];
                            hasChanges = true;
                        }

                        if (hasChanges) {
                            console.log('✅ MVU Sync: Applying Worldbook updates', updates);
                            updateStoryField('database', newDb);
                            showToast(`MVU: Thế giới đã cập nhật (${updates.summary || 'Trạng thái mới'})`, 'success');
                        }
                    })
                    .catch(err => {
                        setIsSyncingState(false);
                        console.error('MVU Sync Failed:', err);
                    });
            }

        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('❌ Lỗi AI: ' + err.message, 'error');
                // FIX #3: Use functional updater to get latest streamingText via setState
                setStreamingText(currentStreamText => {
                    if (currentStreamText && currentStreamText.trim().length > 0) {
                        setMessages(prev => [...prev, {
                            id: Date.now() + 1,
                            role: 'char',
                            content: currentStreamText + "\n*(Bị ngắt kết nối...)*",
                            isErrorStatus: true
                        }]);
                    }
                    return currentStreamText; // don't change streamingText
                });
            }
        } finally {
            setIsGenerating(false);
            isGeneratingRef.current = false;
            setStreamingText('');
            abortRef.current = null;
        }
    }, [generateAIResponse]);

    // Regenerate last char message
    const handleRegenerate = useCallback(async (currentMessages, apiKey) => {
        if (isGeneratingRef.current || currentMessages.length < 2) return;

        const lastCharIdx = currentMessages.length - 1;
        if (currentMessages[lastCharIdx].role !== 'char') return;

        const historyUpToUser = currentMessages.slice(0, lastCharIdx);
        let historySnapshot = [];
        setMessages(prev => {
            historySnapshot = prev.slice(0, lastCharIdx); // use prev state just in case
            return prev; // don't mutate yet
        });

        setIsGenerating(true);
        isGeneratingRef.current = true;
        setStreamingText('');

        try {
            const response = await generateAIResponse(historyUpToUser, apiKey);
            setMessages(prev => {
                const prevLastMsg = prev[lastCharIdx];
                if (!prevLastMsg || prevLastMsg.role !== 'char') return prev; // check index still char
                const newAlts = [...(prevLastMsg.alternatives || [prevLastMsg.content]), response];
                const updatedMsg = { ...prevLastMsg, id: Date.now(), content: response, alternatives: newAlts, activeAlt: newAlts.length - 1 };
                return [...prev.slice(0, lastCharIdx), updatedMsg, ...prev.slice(lastCharIdx + 1)]; // insert accurately
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('❌ Lỗi: ' + err.message, 'error');
            }
        } finally {
            setIsGenerating(false);
            isGeneratingRef.current = false;
            setStreamingText('');
            abortRef.current = null;
        }
    }, [generateAIResponse]);

    // Impersonate (AI writes for user)
    const handleImpersonate = useCallback(async (currentMessages, apiKey, onResponse) => {
        if (isGeneratingRef.current) return;
        setIsGenerating(true);
        isGeneratingRef.current = true;
        setStreamingText('');

        try {
            const overridePrompt = {
                role: 'user',
                content: `[OOC: Hãy viết câu trả lời tiếp theo với tư cách ${userPersona.name || 'người chơi'}. Viết ngôi thứ nhất. Chỉ viết 1-3 câu ngắn gọn.]`,
            };

            const response = await generateAIResponse(currentMessages, apiKey, overridePrompt);
            if (response && onResponse) {
                onResponse(response.replace(/^\[.*?\]\s*/g, '').trim());
            }
        } catch (err) {
            if (err.name !== 'AbortError') showToast('❌ Lỗi: ' + err.message, 'error');
        } finally {
            setIsGenerating(false);
            isGeneratingRef.current = false;
            setStreamingText('');
            abortRef.current = null;
        }
    }, [generateAIResponse, userPersona.name]);

    // Swipe alternative
    const handleSwipe = useCallback((direction, currentMessages) => {
        const lastIdx = currentMessages.length - 1;
        const lastMsg = currentMessages[lastIdx];
        if (lastMsg?.role !== 'char' || !lastMsg.alternatives || lastMsg.alternatives.length <= 1) return;

        let newAlt = (lastMsg.activeAlt || 0) + direction;
        if (newAlt < 0) newAlt = lastMsg.alternatives.length - 1;
        if (newAlt >= lastMsg.alternatives.length) newAlt = 0;

        const updated = { ...lastMsg, content: lastMsg.alternatives[newAlt], activeAlt: newAlt };
        setMessages(prev => [...prev.slice(0, lastIdx), updated]);
    }, []);

    // Clear chat
    const handleClearChat = useCallback(async () => {
        if (confirm('Xóa toàn bộ cuộc trò chuyện?')) {
            await del(`rp_chat_${story?.id}`);
            const firstMes = getFirstMessage();
            setMessages(firstMes ? [{ id: Date.now(), role: 'char', content: firstMes, alternatives: [firstMes], activeAlt: 0 }] : []);
        }
    }, [story?.id, getFirstMessage]);

    // Stop generation
    const stopGeneration = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
    }, []);

    // Set messages wrapped with id check
    const safelySetMessages = useCallback((updater) => {
        // helper to manually update messages from UI (like edit or delete)
        setMessages(updater);
    }, []);

    return {
        messages,
        setMessages: safelySetMessages,
        isGenerating,
        streamingText,
        handleSend,
        handleRegenerate,
        handleImpersonate,
        handleSwipe,
        handleClearChat,
        stopGeneration
    };
}
