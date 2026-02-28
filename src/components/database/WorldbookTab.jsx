import React, { useState, useMemo } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import { Database, Search, Edit3, Save, X, Info, Download, Upload } from 'lucide-react';
import { exportItemsToJSON, triggerImport } from '../../utils/importExportUtils';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorldbookTab({ onNavigate }) {
    const { currentStory } = useStoryState();
    const { dispatch } = useStoryDispatch();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Quick Edit State
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    // Collect all entries
    const allEntries = useMemo(() => {
        if (!currentStory?.database) return [];
        const db = currentStory.database;
        const entries = [];

        const processArray = (arr, typeName, typeKey) => {
            if (!arr || !Array.isArray(arr)) return;
            arr.forEach(item => {
                entries.push({
                    ...item,
                    originalType: typeName,
                    typeKey: typeKey, // Array key in root DB to mutate (characters, settings...)
                });
            });
        };

        processArray(db.characters, 'Nhân vật', 'characters');
        processArray(db.settings, 'Bối cảnh', 'settings');
        processArray(db.items, 'Vật phẩm', 'items');
        processArray(db.abilities, 'Năng lực', 'abilities');
        processArray(db.organizations, 'Tổ chức', 'organizations');
        processArray(db.plots, 'Chi tiết/SK', 'plots');
        if (db.metaRules) processArray(db.metaRules, 'Quy tắc', 'metaRules');

        return entries;
    }, [currentStory]);

    // Local filter array
    const filteredEntries = useMemo(() => {
        let result = [...allEntries];
        if (filterType !== 'all') {
            result = result.filter(e => e.typeKey === filterType);
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(e =>
                (e.name || e.title || '').toLowerCase().includes(q) ||
                (e.keywords || '').toLowerCase().includes(q)
            );
        }

        // Sort by Priority desc, then Order asc
        result.sort((a, b) => {
            const pa = parseInt(a.priority) || 30;
            const pb = parseInt(b.priority) || 30;
            if (pa !== pb) return pb - pa;

            const oa = parseInt(a.insertionOrder) || 100;
            const ob = parseInt(b.insertionOrder) || 100;
            return oa - ob;
        });

        return result;
    }, [allEntries, searchTerm, filterType]);

    // Handle Edit Mode Target
    const startEdit = (entry) => {
        setEditingId(entry.id);
        setEditData({
            keywords: entry.keywords || '',
            strategy: entry.strategy || 'Normal',
            priority: parseInt(entry.priority) || 30,
            insertionOrder: entry.insertionOrder !== undefined ? entry.insertionOrder : 100
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = (entry) => {
        // Find existing index
        const arrKey = entry.typeKey;
        if (!currentStory.database[arrKey]) return;

        const newArr = [...currentStory.database[arrKey]];
        const idx = newArr.findIndex(x => x.id === entry.id);
        if (idx !== -1) {
            newArr[idx] = {
                ...newArr[idx],
                keywords: editData.keywords,
                strategy: editData.strategy,
                priority: parseInt(editData.priority) || 30,
                insertionOrder: parseInt(editData.insertionOrder) || 0
            };

            // Dispatch update directly to StoryContext
            dispatch({
                type: 'UPDATE_DATABASE',
                payload: {
                    [arrKey]: newArr
                }
            });
        }
        setEditingId(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)', overflow: 'hidden'
            }}
        >
            <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', margin: 0 }}>
                        <Database size={22} className="text-secondary" />
                        Quản lý Tổng Worldbook
                    </h2>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                        <button className="btn btn-secondary btn-small" onClick={() => exportItemsToJSON(allEntries, `${currentStory?.title || 'story'}_worldbook.json`)} disabled={allEntries.length === 0} title="Xuất toàn bộ Worldbook"><Download size={16} /> Xuất</button>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                            Tổng số: {allEntries.length} Thẻ
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo Tên hoặc Từ khóa..."
                            className="form-input"
                            style={{ paddingLeft: '32px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="btn-icon" style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => setSearchTerm('')}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <select className="form-input" style={{ width: '200px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">Tất cả Phân loại</option>
                        <option value="characters">Nhân vật</option>
                        <option value="settings">Bối cảnh</option>
                        <option value="items">Vật phẩm</option>
                        <option value="abilities">Năng lực</option>
                        <option value="organizations">Tổ chức</option>
                        <option value="plots">Chi tiết/Chỉ dẫn</option>
                        <option value="metaRules">Quy tắc AI</option>
                    </select>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                        <tr>
                            <th style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tên thẻ</th>
                            <th style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Phân loại</th>
                            <th style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Từ khóa (Keywords)</th>
                            <th style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Chiến lược</th>
                            <th style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'center', borderBottom: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Priority</th>
                            <th style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'center', borderBottom: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Order</th>
                            <th style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'center', borderBottom: '1px solid var(--glass-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEntries.map(entry => {
                            const isEditing = editingId === entry.id;
                            return (
                                <tr key={entry.id} style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: isEditing ? 'rgba(138, 80, 255, 0.05)' : 'transparent',
                                    transition: 'background 0.2s'
                                }}>
                                    {/* Name Column */}
                                    <td style={{ padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle', maxWidth: '200px' }}>
                                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {entry.name || entry.title || 'Chưa đặt tên'}
                                        </div>
                                    </td>

                                    {/* Type Column */}
                                    <td style={{ padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }}>
                                        <span style={{
                                            background: 'rgba(255,255,255,0.1)', padding: '2px 8px',
                                            borderRadius: '10px', fontSize: '11px', color: 'var(--color-text-secondary)'
                                        }}>
                                            {entry.originalType}
                                        </span>
                                    </td>

                                    {isEditing ? (
                                        <>
                                            {/* EDITING MODE */}
                                            <td style={{ padding: 'var(--space-xs) var(--space-md)' }}>
                                                <input
                                                    className="form-input"
                                                    style={{ padding: '4px 8px', height: '28px', fontSize: '12px' }}
                                                    value={editData.keywords}
                                                    onChange={e => setEditData(prev => ({ ...prev, keywords: e.target.value }))}
                                                    placeholder="Từ khóa 1 +bắt_buộc, -cấm..."
                                                />
                                            </td>
                                            <td style={{ padding: 'var(--space-xs) var(--space-md)' }}>
                                                <select
                                                    className="form-input"
                                                    style={{ padding: '0 20px 0 8px', height: '28px', fontSize: '12px' }}
                                                    value={editData.strategy}
                                                    onChange={e => setEditData(prev => ({ ...prev, strategy: e.target.value }))}
                                                >
                                                    <option value="Normal">Normal</option>
                                                    <option value="Constant">Constant</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: 'var(--space-xs) var(--space-md)', textAlign: 'center' }}>
                                                <input
                                                    type="number" className="form-input"
                                                    style={{ width: '60px', padding: '4px', height: '28px', textAlign: 'center', fontSize: '12px' }}
                                                    value={editData.priority}
                                                    onChange={e => setEditData(prev => ({ ...prev, priority: e.target.value }))}
                                                />
                                            </td>
                                            <td style={{ padding: 'var(--space-xs) var(--space-md)', textAlign: 'center' }}>
                                                <input
                                                    type="number" className="form-input"
                                                    style={{ width: '60px', padding: '4px', height: '28px', textAlign: 'center', fontSize: '12px' }}
                                                    value={editData.insertionOrder}
                                                    onChange={e => setEditData(prev => ({ ...prev, insertionOrder: e.target.value }))}
                                                />
                                            </td>
                                            <td style={{ padding: 'var(--space-xs) var(--space-md)', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                    <button className="btn btn-primary" style={{ padding: '4px 8px', minHeight: '28px' }} onClick={() => saveEdit(entry)}>
                                                        <Save size={14} />
                                                    </button>
                                                    <button className="btn btn-secondary" style={{ padding: '4px 8px', minHeight: '28px' }} onClick={cancelEdit}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            {/* VIEW MODE */}
                                            <td style={{ padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle', maxWidth: '300px' }}>
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: entry.keywords ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                                                    {entry.keywords || '— Không có —'}
                                                </div>
                                            </td>
                                            <td style={{ padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }}>
                                                <span style={{ color: entry.strategy === 'Constant' ? 'var(--color-warning)' : 'inherit' }}>
                                                    {entry.strategy || 'Normal'}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <span style={{
                                                    color: (entry.priority || 30) >= 71 ? 'var(--color-error)' :
                                                        (entry.priority || 30) >= 31 ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                                                    fontWeight: (entry.priority || 30) >= 71 ? 600 : 400
                                                }}>
                                                    {entry.priority || 30}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                                {entry.insertionOrder !== undefined ? entry.insertionOrder : 100}
                                            </td>
                                            <td style={{ padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <button className="btn-icon" onClick={() => startEdit(entry)} title="Chỉnh sửa nhanh">
                                                    <Edit3 size={16} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}

                        {filteredEntries.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-tertiary)' }}>
                                    Không có thẻ nào phù hợp.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ padding: 'var(--space-sm) var(--space-md)', borderTop: '1px solid var(--glass-border)', fontSize: '12px', color: 'var(--color-text-tertiary)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Info size={14} /> Mẹo: Dùng bảng này để cập nhật đồng loạt các chỉ số Priority và Strategy cho Lorebook cực kỳ nhanh mà không cần mở sửa từ đầu.
            </div>
        </motion.div>
    );
}
