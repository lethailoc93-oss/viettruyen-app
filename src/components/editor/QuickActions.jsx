import React, { useMemo, useState } from 'react';
import { estimateTokens } from '../../services/ragService';
import MacroEditor from './MacroEditor';
import '../../styles/QuickActions.css';

/**
 * Built-in quick action templates
 */
const BUILT_IN_ACTIONS = [
    {
        id: 'detail', icon: '✍️', label: 'Chi tiết hơn',
        prompt: 'Hãy viết tiếp đoạn trước đó với nhiều chi tiết hơn. Thêm mô tả giác quan (nhìn, nghe, ngửi, chạm), diễn tả cảm xúc nhân vật qua hành động và biểu hiện cơ thể. Khoảng 200-300 từ.'
    },
    {
        id: 'dialogue', icon: '💬', label: 'Thêm đối thoại',
        prompt: 'Hãy viết tiếp bằng một đoạn đối thoại tự nhiên giữa các nhân vật đang có mặt. Đối thoại phải phản ánh tính cách từng người, có subtext (ẩn ý), không nói thẳng cảm xúc. Khoảng 200-300 từ.'
    },
    {
        id: 'scene', icon: '🏞️', label: 'Mô tả cảnh',
        prompt: 'Hãy viết tiếp bằng một đoạn mô tả bối cảnh/phong cảnh chi tiết. Sử dụng đa giác quan, tạo bầu không khí phù hợp với tâm trạng câu chuyện. Khoảng 150-250 từ.'
    },
    {
        id: 'transition', icon: '🔄', label: 'Chuyển cảnh',
        prompt: 'Hãy viết đoạn chuyển cảnh mượt mà sang một cảnh tiếp theo. Có thể dùng time-skip, thay đổi địa điểm, hoặc chuyển góc nhìn. Kết nối tự nhiên với nội dung trước. Khoảng 100-200 từ.'
    },
    {
        id: 'action', icon: '⚔️', label: 'Hành động',
        prompt: 'Hãy viết tiếp bằng một cảnh hành động kịch tính. Nhịp viết nhanh, câu ngắn, mô tả chuyển động cụ thể. Nhân vật phải hành động trong giới hạn năng lực đã biết. Khoảng 200-400 từ.'
    },
    {
        id: 'emotion', icon: '💭', label: 'Nội tâm',
        prompt: 'Hãy viết tiếp bằng một đoạn nội tâm sâu sắc của nhân vật chính hoặc nhân vật đang hoạt động. Thể hiện suy nghĩ, hoài nghi, mâu thuẫn nội tâm qua dòng ý thức. Show, don\'t tell. Khoảng 150-250 từ.'
    }
];

/**
 * QuickActions bar with integrated Token Counter and Custom Macros.
 * Placed below editor textarea in ChapterDetail.
 */
export default React.memo(function QuickActions({ content, story, onQuickAction, loading, onUpdateMacros }) {
    const [showMacroEditor, setShowMacroEditor] = useState(false);

    // Merge built-in + custom macros
    const customMacros = story?.customMacros || [];
    const allActions = useMemo(() => {
        return [...BUILT_IN_ACTIONS, ...customMacros];
    }, [customMacros]);

    // Token estimation
    const tokenInfo = useMemo(() => {
        if (!content && !story) return null;
        const contentTokens = estimateTokens(content || '');
        const budget = story?.maxInputTokens || 8000;
        const pct = Math.min(Math.round((contentTokens / budget) * 100), 100);
        const level = pct < 50 ? 'ok' : pct < 80 ? 'warn' : 'danger';
        return { tokens: contentTokens, budget, pct, level };
    }, [content, story?.maxInputTokens]);

    const handleSaveMacro = (macro) => {
        const existing = customMacros.findIndex(m => m.id === macro.id);
        let updated;
        if (existing >= 0) {
            updated = customMacros.map(m => m.id === macro.id ? macro : m);
        } else {
            updated = [...customMacros, macro];
        }
        onUpdateMacros?.(updated);
    };

    const handleDeleteMacro = (id) => {
        onUpdateMacros?.(customMacros.filter(m => m.id !== id));
    };

    return (
        <>
            <div className="quick-actions-bar">
                {allActions.map(action => (
                    <button
                        key={action.id}
                        className={`quick-action-btn ${loading ? 'loading' : ''} ${!BUILT_IN_ACTIONS.find(b => b.id === action.id) ? 'custom' : ''}`}
                        onClick={() => onQuickAction?.(action.prompt, action.label)}
                        disabled={loading}
                        title={action.prompt.slice(0, 80) + '…'}
                    >
                        <span className="qa-icon">{action.icon}</span>
                        {action.label}
                    </button>
                ))}

                {/* Macro editor trigger */}
                <button
                    className="quick-action-btn qa-gear"
                    onClick={() => setShowMacroEditor(true)}
                    title="Quản lý Quick Actions tùy chỉnh"
                >
                    ⚙️
                </button>

                <div className="quick-actions-spacer" />

                {/* Integrated Token Counter */}
                {tokenInfo && (
                    <div className={`token-counter level-${tokenInfo.level}`} title={`Ước lượng: ~${tokenInfo.tokens.toLocaleString()} tokens / ${tokenInfo.budget.toLocaleString()} budget (${tokenInfo.pct}%)`}>
                        <span className="tc-icon">📊</span>
                        ~{tokenInfo.tokens.toLocaleString()} tk
                    </div>
                )}
            </div>

            {showMacroEditor && (
                <MacroEditor
                    macros={customMacros}
                    onSave={handleSaveMacro}
                    onDelete={handleDeleteMacro}
                    onClose={() => setShowMacroEditor(false)}
                />
            )}
        </>
    );
});

