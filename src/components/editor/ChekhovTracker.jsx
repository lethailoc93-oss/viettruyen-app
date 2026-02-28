import React, { useMemo, useState } from 'react';
import { scanChekhovsGuns } from '../../services/chekhovTracker';
import '../../styles/ChekhovTracker.css';

/**
 * Chekhov's Gun Tracker — surfaces forgotten items, seeds, quests, and characters.
 * Shows actionable suggestions to the author.
 */
export default React.memo(function ChekhovTracker({ story, chapterId, onUseElement }) {
    const [isOpen, setIsOpen] = useState(true);

    const suggestions = useMemo(() => {
        return scanChekhovsGuns(story, chapterId);
    }, [story?.database, chapterId]);

    if (suggestions.length === 0) return null;

    return (
        <div className="chekhov-tracker">
            <div
                className="chekhov-tracker-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="chekhov-tracker-title">
                    <span>🔫</span>
                    Chekhov's Gun
                    <span className="chekhov-badge">{suggestions.length}</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#888' }}>
                    {isOpen ? '▼' : '▶'}
                </span>
            </div>

            {isOpen && (
                <div className="chekhov-list">
                    {suggestions.slice(0, 8).map((s, i) => (
                        <div key={i} className={`chekhov-item urgency-${s.urgency}`}>
                            <span className="chekhov-item-icon">{s.icon}</span>
                            <div className="chekhov-item-content">
                                <div className="chekhov-item-name">{s.name}</div>
                                <div className="chekhov-item-suggestion">{s.suggestion}</div>
                            </div>
                            {onUseElement && (
                                <button
                                    className="chekhov-use-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUseElement(s);
                                    }}
                                    title="Tạo cảnh sử dụng yếu tố này"
                                >
                                    ⚡ Dùng
                                </button>
                            )}
                        </div>
                    ))}
                    {suggestions.length > 8 && (
                        <div className="chekhov-empty">
                            ...và {suggestions.length - 8} gợi ý khác
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
