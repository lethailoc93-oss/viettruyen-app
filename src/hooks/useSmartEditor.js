import { useState, useCallback } from 'react';
import { AIService } from '../services/aiService';
import { generateImage } from '../services/ai/aiImageService';

/**
 * Custom hook extracting all Smart Editor (text selection toolbar) state and logic
 * from ChapterDetail, including rewrite/expand/condense/suggest actions.
 */
export default function useSmartEditor({ getNextKey, isKeySet, selectedModel, chapter, currentStory, content, setContent, setIsSaved, editorRef, showToast }) {

    // Smart Editor state
    const [smartToolbar, setSmartToolbar] = useState({ show: false, x: 0, y: 0 });
    const [smartSelection, setSmartSelection] = useState({ text: '', start: 0, end: 0 });
    const [smartAction, setSmartAction] = useState('');  // 'rewrite' | 'expand' | 'condense' | 'suggest'
    const [smartResult, setSmartResult] = useState('');
    const [smartLoading, setSmartLoading] = useState(false);
    const [rewriteInstruction, setRewriteInstruction] = useState('');
    const [showRewriteInput, setShowRewriteInput] = useState(false);
    const [smartSuggestions, setSmartSuggestions] = useState([]);
    const [smartImage, setSmartImage] = useState('');
    const [smartImagePrompt, setSmartImagePrompt] = useState('');

    const handleTextSelect = useCallback(() => {
        const textarea = editorRef.current;
        if (!textarea) return;
        const { selectionStart, selectionEnd } = textarea;
        const selected = content.substring(selectionStart, selectionEnd).trim();

        if (selected.length < 5) {
            setSmartToolbar({ show: false, x: 0, y: 0 });
            return;
        }

        const rect = textarea.getBoundingClientRect();
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 28;
        const textBeforeSelection = content.substring(0, selectionStart);
        const linesBeforeSelection = textBeforeSelection.split('\n').length;
        const scrollTop = textarea.scrollTop;

        const y = Math.min(
            rect.height - 50,
            Math.max(10, (linesBeforeSelection * lineHeight) - scrollTop - 10)
        );
        const x = Math.min(rect.width - 220, Math.max(10, 60));

        setSmartSelection({ text: selected, start: selectionStart, end: selectionEnd });
        setSmartToolbar({ show: true, x, y });
        setSmartResult('');
        setSmartAction('');
        setShowRewriteInput(false);
        setSmartImage(prev => {
            if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return '';
        });
        setSmartImagePrompt('');
    }, [content, editorRef]);

    const handleSmartAction = useCallback(async (action) => {
        if (!isKeySet) {
            showToast('Vui lòng nhập API key để dùng tính năng này', 'warning');
            return;
        }

        setSmartAction(action);
        setSmartLoading(true);
        setSmartResult('');
        setSmartSuggestions([]);
        setSmartImage(prev => {
            if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return '';
        });
        setSmartImagePrompt('');

        try {
            const apiKey = getNextKey();
            const opts = { model: selectedModel, chapter };

            if (action === 'suggest') {
                const variants = await AIService.suggestWordtune(apiKey, smartSelection.text, currentStory, opts);
                setSmartSuggestions(variants || []);
            } else if (action === 'image') {
                const prompt = await AIService.generateImagePrompt(apiKey, smartSelection.text, currentStory, opts);
                setSmartImagePrompt(prompt);

                const result = await generateImage(prompt, {
                    onProgress: (msg) => setSmartResult(`⏳ ${msg}`),
                });

                if (result) {
                    setSmartImage(result.url);
                    const providerLabel = result.provider === 'ai-horde' ? ' (AI Horde)' : '';
                    setSmartResult(`Đã tạo ảnh thành công${providerLabel}`);
                } else {
                    setSmartResult('❌ Không thể tạo ảnh. Tất cả server đang lỗi, vui lòng thử lại sau.');
                }
            } else {
                let result;
                if (action === 'rewrite') {
                    result = await AIService.rewriteText(apiKey, smartSelection.text, currentStory, rewriteInstruction, opts);
                } else if (action === 'expand') {
                    result = await AIService.expandText(apiKey, smartSelection.text, currentStory, opts);
                } else if (action === 'condense') {
                    result = await AIService.condenseText(apiKey, smartSelection.text, currentStory, opts);
                }
                setSmartResult(result || '');
            }
        } catch (err) {
            setSmartResult('❌ Lỗi: ' + err.message);
        } finally {
            setSmartLoading(false);
        }
    }, [isKeySet, getNextKey, selectedModel, chapter, currentStory, smartSelection.text, rewriteInstruction, showToast]);

    const handleSmartReplace = useCallback(() => {
        if (!smartResult || smartResult.startsWith('❌')) return;
        const before = content.substring(0, smartSelection.start);
        const after = content.substring(smartSelection.end);
        setContent(before + smartResult + after);
        setIsSaved(false);
        setSmartToolbar({ show: false, x: 0, y: 0 });
        setSmartResult('');
        setSmartAction('');
    }, [smartResult, smartSelection, content, setContent, setIsSaved]);

    const closeSmartToolbar = useCallback(() => {
        setSmartToolbar({ show: false, x: 0, y: 0 });
        setSmartResult('');
        setSmartAction('');
        setSmartSuggestions([]);
        setShowRewriteInput(false);
        setRewriteInstruction('');
        setSmartImage(prev => {
            if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return '';
        });
        setSmartImagePrompt('');
    }, []);

    const handleSuggestionReplace = useCallback((variant) => {
        const before = content.substring(0, smartSelection.start);
        const after = content.substring(smartSelection.end);
        setContent(before + variant + after);
        setIsSaved(false);
        setSmartToolbar({ show: false, x: 0, y: 0 });
        setSmartSuggestions([]);
        setSmartAction('');
    }, [content, smartSelection, setContent, setIsSaved]);

    return {
        // State
        smartToolbar,
        smartSelection,
        smartAction,
        smartResult,
        smartLoading,
        rewriteInstruction,
        showRewriteInput,
        smartSuggestions,
        smartImage,
        smartImagePrompt,
        // Setters (for UI bindings)
        setSmartAction,
        setShowRewriteInput,
        setRewriteInstruction,
        setSmartResult,
        setSmartSuggestions,
        // Actions
        handleTextSelect,
        handleSmartAction,
        handleSmartReplace,
        closeSmartToolbar,
        handleSuggestionReplace,
    };
}
