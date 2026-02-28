import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, X, Users, MapPin, Clock, Package, Zap, Building2, FileText, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/mvu-review.css';

/**
 * MVUReviewPanel — hiển thị kết quả scan sau khi viết chương,
 * cho phép tác giả xem xét và approve/reject từng thay đổi.
 * 
 * @param {Object} scanResult - Kết quả từ postWriteScan
 * @param {Function} onApply - Gọi khi tác giả nhấn "Áp dụng" với danh sách items đã chọn
 * @param {Function} onDismiss - Gọi khi tác giả nhấn "Bỏ qua"
 * @param {number} chapterOrder - Số thứ tự chương
 */
export default function MVUReviewPanel({ scanResult, onApply, onDismiss, chapterOrder }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedItems, setSelectedItems] = useState(() => {
        // Default: tất cả đều được chọn
        const initial = {};
        if (!scanResult) return initial;
        buildAllItems(scanResult).forEach((_, idx) => { initial[idx] = true; });
        return initial;
    });

    // Build danh sách tất cả items từ scanResult
    const allItems = useMemo(() => scanResult ? buildAllItems(scanResult) : [], [scanResult]);

    if (!scanResult || allItems.length === 0) return null;

    const selectedCount = Object.values(selectedItems).filter(Boolean).length;
    const totalCount = allItems.length;

    const toggleItem = (idx) => {
        setSelectedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const toggleAll = () => {
        const allSelected = selectedCount === totalCount;
        const next = {};
        allItems.forEach((_, idx) => { next[idx] = !allSelected; });
        setSelectedItems(next);
    };

    const handleApply = () => {
        // Lọc ra scanResult chỉ chứa items đã chọn
        const filtered = filterScanResult(scanResult, allItems, selectedItems);
        onApply(filtered);
    };

    // Group items by section
    const sections = groupBySection(allItems);

    if (!isExpanded) {
        return (
            <div className="mvu-notify-bar" onClick={() => setIsExpanded(true)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>📊</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-primary)' }}>
                        AI phát hiện {totalCount} thay đổi
                    </span>
                    <span className="mvu-badge">{totalCount}</span>
                </div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    Nhấn để xem xét →
                </span>
            </div>
        );
    }

    return (
        <motion.div
            className="mvu-panel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            {/* Header */}
            <div className="mvu-header" onClick={() => setIsExpanded(false)}>
                <div className="mvu-header-left">
                    <span>📊</span>
                    <span>MVU — Chương {chapterOrder || '?'}</span>
                    <span className="mvu-badge">{totalCount}</span>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>

            {/* Body */}
            <div className="mvu-body">
                {/* Select all */}
                <div className="mvu-select-all" onClick={toggleAll}>
                    <input
                        type="checkbox"
                        checked={selectedCount === totalCount}
                        readOnly
                        style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                    <span>{selectedCount === totalCount ? 'Bỏ chọn tất cả' : 'Chọn tất cả'} ({selectedCount}/{totalCount})</span>
                </div>

                {/* Sections */}
                {sections.map((section) => (
                    <SectionGroup
                        key={section.title}
                        section={section}
                        selectedItems={selectedItems}
                        onToggle={toggleItem}
                    />
                ))}
            </div>

            {/* Footer */}
            <div className="mvu-footer">
                <div className="mvu-footer-info">
                    {selectedCount} / {totalCount} thay đổi được chọn
                </div>
                <div className="mvu-footer-actions">
                    <button className="btn btn-secondary btn-small" onClick={onDismiss}>
                        <X size={14} /> Bỏ qua
                    </button>
                    <button
                        className="btn btn-primary btn-small"
                        onClick={handleApply}
                        disabled={selectedCount === 0}
                    >
                        <Check size={14} /> Áp dụng ({selectedCount})
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════
// Section Group Component
// ═══════════════════════════════════════
function SectionGroup({ section, selectedItems, onToggle }) {
    const [collapsed, setCollapsed] = useState(false);
    const Icon = section.icon;

    return (
        <div className="mvu-section">
            <div className="mvu-section-title" onClick={() => setCollapsed(p => !p)} style={{ cursor: 'pointer' }}>
                {Icon && <Icon size={13} />}
                <span>{section.title}</span>
                <span className="mvu-section-count">{section.items.length}</span>
                <span style={{ marginLeft: 'auto' }}>
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </span>
            </div>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        {section.items.map((item) => (
                            <div className="mvu-item" key={item.globalIdx}>
                                <input
                                    type="checkbox"
                                    className="mvu-item-checkbox"
                                    checked={!!selectedItems[item.globalIdx]}
                                    onChange={() => onToggle(item.globalIdx)}
                                />
                                <div className="mvu-item-content">
                                    <div className="mvu-item-name">
                                        <span className={`mvu-tag ${item.isNew ? 'mvu-tag-new' : item.isEvent ? 'mvu-tag-event' : 'mvu-tag-update'}`}>
                                            {item.isNew ? 'MỚI' : item.isEvent ? 'SỰ KIỆN' : 'CẬP NHẬT'}
                                        </span>
                                        {item.name}
                                    </div>
                                    {item.arrowChain ? (
                                        <div className="mvu-arrow-chain">
                                            {renderArrowChain(item.arrowChain)}
                                        </div>
                                    ) : item.detail && (
                                        <div className="mvu-item-detail">{item.detail}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

function renderArrowChain(chain) {
    if (!chain) return null;
    const parts = chain.split('→').map(p => p.trim()).filter(Boolean);
    return parts.map((part, i) => (
        <React.Fragment key={i}>
            {i > 0 && <span className="mvu-arrow">→</span>}
            <span>{part}</span>
        </React.Fragment>
    ));
}

/**
 * Build flat list of all items from scanResult for checkbox tracking
 */
function buildAllItems(scan) {
    const items = [];
    let idx = 0;

    // New characters
    scan.characters?.forEach(c => {
        items.push({
            globalIdx: idx++, section: 'characters', isNew: true,
            name: c.name,
            detail: [c.role, c.description].filter(Boolean).join(' — '),
            arrowChain: c.newState ? `${c.name} → ${c.newState}` : null,
            data: c
        });
    });

    // Character updates
    scan.characterUpdates?.forEach(c => {
        const parts = [c.name];
        if (c.newInfo) parts.push(c.newInfo);
        if (c.newState) parts.push(c.newState);
        items.push({
            globalIdx: idx++, section: 'characterUpdates', isNew: false,
            name: c.name,
            detail: c.newInfo || '',
            arrowChain: parts.length > 1 ? parts.join(' → ') : null,
            data: c
        });
    });

    // New settings
    scan.settings?.forEach(s => {
        items.push({
            globalIdx: idx++, section: 'settings', isNew: true,
            name: s.name,
            detail: s.description || '',
            data: s
        });
    });

    // Setting updates
    scan.settingUpdates?.forEach(s => {
        items.push({
            globalIdx: idx++, section: 'settingUpdates', isNew: false,
            name: s.name,
            detail: s.newInfo || '',
            arrowChain: s.newState ? `${s.name} → ${s.newState}` : null,
            data: s
        });
    });

    // Timeline events
    scan.timeline?.forEach(e => {
        items.push({
            globalIdx: idx++, section: 'timeline', isNew: true, isEvent: true,
            name: e.title || e.name || 'Sự kiện',
            detail: e.description || '',
            data: e
        });
    });

    // Event log (arrow-chain format)
    scan.eventLog?.forEach(e => {
        items.push({
            globalIdx: idx++, section: 'eventLog', isNew: true, isEvent: true,
            name: 'Diễn biến',
            arrowChain: e.chain || e,
            data: e
        });
    });

    // New items
    scan.items?.forEach(i => {
        const parts = [i.name];
        if (i.owner) parts.push(`[${i.owner}]`);
        // if (i.quantity) parts.push(`x${i.quantity}`);
        items.push({
            globalIdx: idx++, section: 'items', isNew: true,
            name: i.quantity ? `${i.name} [Số lượng: ${i.quantity}]` : i.name,
            detail: [i.owner ? `Chủ: ${i.owner}` : '', i.effect].filter(Boolean).join(' — '),
            arrowChain: parts.length > 1 ? parts.join(' → ') : null,
            data: i
        });
    });

    // Item updates
    scan.itemUpdates?.forEach(i => {
        const parts = [i.name];
        if (i.newOwner) parts.push(`chủ mới: ${i.newOwner}`);
        // if (i.quantity) parts.push(`x${i.quantity}`);
        if (i.newState) parts.push(i.newState);
        items.push({
            globalIdx: idx++, section: 'itemUpdates', isNew: false,
            name: i.quantity ? `${i.name} [Biến động SL: ${i.quantity}]` : i.name,
            detail: i.newInfo || '',
            arrowChain: parts.length > 1 ? parts.join(' → ') : null,
            data: i
        });
    });

    // New abilities
    scan.abilities?.forEach(a => {
        items.push({
            globalIdx: idx++, section: 'abilities', isNew: true,
            name: a.name,
            detail: [a.owner ? `[${a.owner}]` : '', a.effect].filter(Boolean).join(' — '),
            data: a
        });
    });

    // Ability updates
    scan.abilityUpdates?.forEach(a => {
        items.push({
            globalIdx: idx++, section: 'abilityUpdates', isNew: false,
            name: a.name,
            detail: a.newInfo || '',
            arrowChain: a.newState ? `${a.name} → ${a.newState}` : null,
            data: a
        });
    });

    // New organizations
    scan.organizations?.forEach(o => {
        items.push({
            globalIdx: idx++, section: 'organizations', isNew: true,
            name: o.name,
            detail: o.purpose || '',
            data: o
        });
    });

    // Organization updates
    scan.organizationUpdates?.forEach(o => {
        items.push({
            globalIdx: idx++, section: 'organizationUpdates', isNew: false,
            name: o.name,
            detail: o.newInfo || '',
            data: o
        });
    });

    // Chapter summary/recap (always show as info)
    if (scan.summary) {
        items.push({
            globalIdx: idx++, section: 'chapter', isNew: true, isEvent: false,
            name: 'Tóm tắt chương',
            detail: scan.summary,
            data: { type: 'summary', value: scan.summary }
        });
    }
    if (scan.recap) {
        items.push({
            globalIdx: idx++, section: 'chapter', isNew: true, isEvent: false,
            name: 'Trạng thái cuối',
            detail: scan.recap,
            data: { type: 'recap', value: scan.recap }
        });
    }

    // Current state update
    if (scan.currentState && (scan.currentState.time || scan.currentState.location)) {
        const parts = [];
        if (scan.currentState.time) parts.push(`Thời gian: ${scan.currentState.time}`);
        if (scan.currentState.location) parts.push(`Địa điểm: ${scan.currentState.location}`);
        items.push({
            globalIdx: idx++, section: 'currentState', isNew: false,
            name: 'Thông tin hiện tại',
            detail: parts.join(' | '),
            data: { type: 'currentState', ...scan.currentState }
        });
    }

    return items;
}

/**
 * Group items by section for display
 */
function groupBySection(allItems) {
    const sectionConfig = {
        characters: { title: 'Nhân vật mới', icon: Users },
        characterUpdates: { title: 'Nhân vật cập nhật', icon: Users },
        settings: { title: 'Bối cảnh mới', icon: MapPin },
        settingUpdates: { title: 'Bối cảnh cập nhật', icon: MapPin },
        timeline: { title: 'Sự kiện', icon: Clock },
        eventLog: { title: 'Diễn biến', icon: ArrowRight },
        items: { title: 'Vật phẩm mới', icon: Package },
        itemUpdates: { title: 'Vật phẩm cập nhật', icon: Package },
        abilities: { title: 'Năng lực mới', icon: Zap },
        abilityUpdates: { title: 'Năng lực cập nhật', icon: Zap },
        organizations: { title: 'Tổ chức mới', icon: Building2 },
        organizationUpdates: { title: 'Tổ chức cập nhật', icon: Building2 },
        chapter: { title: 'Chương', icon: FileText },
        currentState: { title: 'Thông tin hiện tại', icon: MapPin },
    };

    const grouped = {};
    allItems.forEach(item => {
        if (!grouped[item.section]) {
            const config = sectionConfig[item.section] || { title: item.section, icon: FileText };
            grouped[item.section] = { ...config, items: [] };
        }
        grouped[item.section].items.push(item);
    });

    // Order sections logically
    const order = ['chapter', 'currentState', 'characters', 'characterUpdates', 'items', 'itemUpdates',
        'abilities', 'abilityUpdates', 'settings', 'settingUpdates', 'timeline', 'eventLog',
        'organizations', 'organizationUpdates'];

    return order.filter(k => grouped[k]).map(k => grouped[k]);
}

/**
 * Filter scanResult based on selected items
 */
function filterScanResult(scan, allItems, selectedItems) {
    const filtered = {
        summary: null, recap: null, keywords: scan.keywords || [],
        characters: [], characterUpdates: [],
        settings: [], settingUpdates: [],
        timeline: [], eventLog: [],
        items: [], itemUpdates: [],
        abilities: [], abilityUpdates: [],
        organizations: [], organizationUpdates: [],
        currentState: null,
    };

    allItems.forEach((item, idx) => {
        if (!selectedItems[idx]) return;

        if (item.section === 'chapter') {
            if (item.data.type === 'summary') filtered.summary = item.data.value;
            if (item.data.type === 'recap') filtered.recap = item.data.value;
        } else if (item.section === 'currentState') {
            filtered.currentState = scan.currentState;
        } else if (filtered[item.section]) {
            filtered[item.section].push(item.data);
        }
    });

    return filtered;
}
