// ================================================
// StatusBarRenderer — Rendering XML Status Blocks
// ================================================
import React from 'react';
import { Swords, Shield, Heart, Coins, Star, Activity, Map, Key, Package } from 'lucide-react';

export default function StatusBarRenderer({ content }) {
    if (!content) return null;

    // Detect if content has XML status blocks (e.g., <territory_status>, <character_status>)
    const statusBlockRegex = /<([a-zA-Z0-9_]+_status|status)>([\s\S]*?)<\/\1>/gi;
    const matches = [...content.matchAll(statusBlockRegex)];

    if (matches.length === 0) return null;

    return (
        <div className="rp-status-renderer">
            {matches.map((match, idx) => {
                const tag = match[1];
                const innerContent = match[2];
                return <StatusBlock key={idx} title={formatTitle(tag)} text={innerContent} />;
            })}
        </div>
    );
}

function StatusBlock({ title, text }) {
    // Parse key-value pairs (e.g., "Lòng dân: 50" or "- Vàng: 100")
    const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && /\w/.test(l));

    const items = lines.map(line => {
        // Match formats like:
        // - Lòng dân: 50/100
        // - HP = 100
        // Gold: 50
        const parts = line.replace(/^-\s*/, '').split(/[:=]/);
        if (parts.length >= 2) {
            return {
                label: parts[0].trim(),
                value: parts.slice(1).join(':').trim()
            };
        }
        return { label: line, value: null };
    });

    return (
        <div className="rp-status-block">
            <h4 className="rp-status-title">{title}</h4>
            <div className="rp-status-grid">
                {items.map((item, idx) => (
                    <div key={idx} className={`rp-status-item ${!item.value ? 'rp-status-full-row' : ''}`}>
                        <span className="rp-status-label">
                            {getIconForLabel(item.label)} {item.label}
                        </span>
                        {item.value && <span className="rp-status-value">{item.value}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatTitle(tag) {
    if (tag === 'status') return 'Trạng thái';

    return tag
        .replace(/_status$/i, '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') + ' Trạng thái';
}

function getIconForLabel(label) {
    const lower = label.toLowerCase();
    if (lower.includes('hp') || lower.includes('máu') || lower.includes('sinh lực')) return <Heart size={14} color="#ef4444" />;
    if (lower.includes('mp') || lower.includes('mana') || lower.includes('năng lượng')) return <Activity size={14} color="#3b82f6" />;
    if (lower.includes('atk') || lower.includes('công') || lower.includes('sát thương') || lower.includes('sức mạnh')) return <Swords size={14} color="#f97316" />;
    if (lower.includes('def') || lower.includes('thủ') || lower.includes('phòng')) return <Shield size={14} color="#8b5cf6" />;
    if (lower.includes('gold') || lower.includes('vàng') || lower.includes('tiền')) return <Coins size={14} color="#eab308" />;
    if (lower.includes('exp') || lower.includes('kinh nghiệm') || lower.includes('cấp') || lower.includes('lv')) return <Star size={14} color="#06b6d4" />;
    if (lower.includes('địa') || lower.includes('map') || lower.includes('vị trí')) return <Map size={14} color="#10b981" />;
    if (lower.includes('khóa') || lower.includes('key')) return <Key size={14} color="#f59e0b" />;
    if (lower.includes('túi') || lower.includes('đồ') || lower.includes('item')) return <Package size={14} color="#a8a29e" />;

    return <span className="rp-status-dot">•</span>;
}

/**
 * Removes XML status blocks from text so they don't render twice
 * (once as beautiful HTML, once as raw text).
 */
export function removeStatusBlocks(text) {
    if (!text) return '';
    const statusBlockRegex = /<([a-zA-Z0-9_]+_status|status)>([\s\S]*?)<\/\1>/gi;
    return text.replace(statusBlockRegex, '');
}
