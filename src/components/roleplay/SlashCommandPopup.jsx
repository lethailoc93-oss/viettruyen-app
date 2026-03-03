// ================================================
// SlashCommandPopup — Autocomplete dropdown
// ================================================
import React, { useEffect, useRef } from 'react';
import { findMatchingCommands } from '../../services/slashCommands';
import '../../styles/slashCommands.css';

const CMD_ICONS = {
    roll: '🎲',
    sys: '📢',
    note: '📝',
    clear: '🗑️',
    setvar: '⚙️',
    getvar: '📊',
    rename: '👤',
    help: '📖',
};

export default function SlashCommandPopup({ query, activeIndex, onSelect }) {
    const commands = findMatchingCommands(query);
    const listRef = useRef(null);

    // Scroll active item into view
    useEffect(() => {
        if (listRef.current) {
            const active = listRef.current.children[activeIndex];
            if (active) active.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    if (commands.length === 0) {
        return (
            <div className="slash-popup">
                <div className="slash-no-results">
                    Không tìm thấy lệnh "/{query}"
                </div>
            </div>
        );
    }

    return (
        <div className="slash-popup">
            <div className="slash-popup-header">Lệnh gạch chéo</div>
            <div ref={listRef}>
                {commands.map((cmd, i) => (
                    <div
                        key={cmd.name}
                        className={`slash-item ${i === activeIndex ? 'active' : ''}`}
                        onClick={() => onSelect(cmd)}
                        onMouseDown={e => e.preventDefault()} // prevent blur
                    >
                        <div className="slash-item-icon">
                            {CMD_ICONS[cmd.name] || '⚡'}
                        </div>
                        <div className="slash-item-info">
                            <div className="slash-item-name">
                                <span>/</span>{cmd.name}
                            </div>
                            <div className="slash-item-desc">{cmd.description}</div>
                        </div>
                        <div className="slash-item-usage">{cmd.usage}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
