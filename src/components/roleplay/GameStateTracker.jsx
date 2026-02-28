// ================================================
// GameStateTracker — Tracking AI Variable Updates
// ================================================
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Heart, Shield, Coins, Star, Activity, Settings2, BarChart2, Package } from 'lucide-react';

export default function GameStateTracker({ story, currentChatIdx, messages }) {
    const [gameState, setGameState] = useState(() => {
        const saved = localStorage.getItem(`rp_state_${story?.id}`);
        return saved ? JSON.parse(saved) : {};
    });

    const [collapsed, setCollapsed] = useState(false);

    // Save state when it changes
    useEffect(() => {
        if (Object.keys(gameState).length > 0) {
            localStorage.setItem(`rp_state_${story?.id}`, JSON.stringify(gameState));
        }
    }, [gameState, story?.id]);

    // Parse messages for variable updates
    useEffect(() => {
        let newState = { ...gameState };
        let stateChanged = false;

        // Only parse the latest char message if it hasn't been parsed
        const latestMsg = messages[messages.length - 1];

        if (latestMsg && latestMsg.role === 'char' && !latestMsg._parsedState) {
            const matches = parseVariableUpdates(latestMsg.content || '');

            if (matches.length > 0) {
                matches.forEach(({ variable, change, isAbsolute }) => {
                    const varKey = variable.trim();
                    const currentVal = parseFloat(newState[varKey] || 0);
                    const numChange = parseFloat(change);

                    if (!isNaN(numChange)) {
                        if (isAbsolute) {
                            newState[varKey] = numChange;
                        } else {
                            newState[varKey] = currentVal + numChange;
                        }
                        stateChanged = true;
                    } else if (typeof change === 'string' && isAbsolute) {
                        newState[varKey] = change;
                        stateChanged = true;
                    }
                });
            }

            // Mark as parsed to avoid re-parsing on every re-render
            latestMsg._parsedState = true;
        }

        if (stateChanged) {
            setGameState(newState);
        }
    }, [messages, gameState]);

    /**
     * Parses variable update tags from text.
     * Supports formats like:
     * <UpdateVariable name="HP" change="-10" />
     * <UpdateVariable name="Gold" value="500" />
     * {{setVar::Gold::500}}
     * {{addVar::HP::-10}}
     */
    function parseVariableUpdates(text) {
        const updates = [];

        if (!text) return updates;

        // Parse XML style <UpdateVariable name="HP" change="-10" /> (Relative)
        const xmlChangeRegex = /<UpdateVariable\s+name=["']([^"']+)["']\s+change=["']([^"']+)["']\s*\/>/gi;
        let match;
        while ((match = xmlChangeRegex.exec(text)) !== null) {
            updates.push({ variable: match[1], change: match[2], isAbsolute: false });
        }

        // Parse XML style <UpdateVariable name="Gold" value="500" /> (Absolute)
        const xmlValueRegex = /<UpdateVariable\s+name=["']([^"']+)["']\s+value=["']([^"']+)["']\s*\/>/gi;
        while ((match = xmlValueRegex.exec(text)) !== null) {
            updates.push({ variable: match[1], change: match[2], isAbsolute: true });
        }

        // Parse SillyTavern macro style {{setVar::VarName::Value}}
        const macroSetRegex = /\{\{setVar::([^:]+)::([^}]+)\}\}/gi;
        while ((match = macroSetRegex.exec(text)) !== null) {
            updates.push({ variable: match[1], change: match[2], isAbsolute: true });
        }

        // Parse SillyTavern macro style {{addVar::VarName::Value}}
        const macroAddRegex = /\{\{addVar::([^:]+)::([^}]+)\}\}/gi;
        while ((match = macroAddRegex.exec(text)) !== null) {
            updates.push({ variable: match[1], change: match[2], isAbsolute: false });
        }

        return updates;
    }

    const clearState = () => {
        if (confirm('Làm mới toàn bộ chỉ số nhân vật?')) {
            setGameState({});
            localStorage.removeItem(`rp_state_${story?.id}`);
        }
    };

    if (Object.keys(gameState).length === 0) {
        return null; // Don't show if no game state tracked yet
    }

    // Helper to get icon for common variables
    const getIconForVar = (name) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('hp') || lowerName.includes('máu') || lowerName.includes('health') || lowerName.includes('heart')) return <Heart size={14} color="#ef4444" />;
        if (lowerName.includes('atk') || lowerName.includes('attack') || lowerName.includes('công') || lowerName.includes('damage') || lowerName.includes('str')) return <Swords size={14} color="#f97316" />;
        if (lowerName.includes('def') || lowerName.includes('defense') || lowerName.includes('thủ') || lowerName.includes('shield') || lowerName.includes('arm')) return <Shield size={14} color="#3b82f6" />;
        if (lowerName.includes('gold') || lowerName.includes('vàng') || lowerName.includes('tiền') || lowerName.includes('money') || lowerName.includes('coin')) return <Coins size={14} color="#eab308" />;
        if (lowerName.includes('lv') || lowerName.includes('level') || lowerName.includes('cấp') || lowerName.includes('exp')) return <Star size={14} color="#8b5cf6" />;
        if (lowerName.includes('mp') || lowerName.includes('mana') || lowerName.includes('năng lượng') || lowerName.includes('energy')) return <Activity size={14} color="#06b6d4" />;
        if (lowerName.includes('tồn kho') || lowerName.includes('inventory') || lowerName.includes('túi')) return <Package size={14} color="#a8a29e" />;
        return <BarChart2 size={14} color="#94a3b8" />;
    };

    return (
        <div className={`rp-game-state-panel ${collapsed ? 'collapsed' : ''}`}>
            <div className="rp-game-state-header" onClick={() => setCollapsed(!collapsed)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings2 size={16} />
                    <span>Trạng thái Hệ thống</span>
                </div>
                {!collapsed && (
                    <button onClick={(e) => { e.stopPropagation(); clearState(); }} title="Làm mới trạng thái" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        <RotateCcw size={12} />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="rp-game-state-content">
                            {Object.entries(gameState).map(([key, value]) => (
                                <div key={key} className="rp-state-item">
                                    <div className="rp-state-key">
                                        {getIconForVar(key)}
                                        {key}
                                    </div>
                                    <div className="rp-state-val">
                                        {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
