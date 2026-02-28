import React, { useState } from 'react';
import { Utils } from '../../utils/helpers';
import '../../styles/BranchManager.css';

/**
 * BranchManager — Manage story branches for a chapter.
 * 
 * Each branch: { id, parentChapterId, name, content, createdAt, status: 'draft'|'canon'|'archived' }
 *
 * When user creates a branch: clones current chapter content into a new branch entry.
 * "Merge" sets a branch as Canon and archives others.
 */
export default React.memo(function BranchManager({ chapterId, currentContent, branches, branchOps, onLoadBranch }) {
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');

    // Filter branches for this chapter
    const chapterBranches = (branches || []).filter(b => b.parentChapterId === chapterId);
    const hasBranches = chapterBranches.length > 0;

    const handleCreate = () => {
        if (!newName.trim()) return;
        branchOps.add({
            parentChapterId: chapterId,
            name: newName.trim(),
            content: currentContent || '',
            status: 'draft',
            createdAt: new Date().toISOString()
        });
        setNewName('');
        setShowCreate(false);
    };

    const handleMerge = (branchId) => {
        // Set this branch as canon, archive all others
        chapterBranches.forEach(b => {
            if (b.id === branchId) {
                branchOps.update(b.id, { status: 'canon' });
            } else if (b.status !== 'archived') {
                branchOps.update(b.id, { status: 'archived' });
            }
        });
    };

    const handleDelete = (branchId) => {
        branchOps.delete(branchId);
    };

    const handleLoad = (branch) => {
        if (onLoadBranch) {
            onLoadBranch(branch.content, branch.name);
        }
    };

    const statusLabels = {
        draft: '📝 Nháp',
        canon: '✅ Chính thức',
        archived: '📦 Lưu trữ'
    };

    return (
        <div className="branch-manager">
            <div className="branch-manager-header">
                <div className="branch-manager-title">
                    <span className="bm-icon">🔀</span>
                    Nhánh cốt truyện ({chapterBranches.length})
                </div>
                <button
                    className="branch-create-btn"
                    onClick={() => setShowCreate(!showCreate)}
                >
                    + Tạo nhánh
                </button>
            </div>

            {/* Create form */}
            {showCreate && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                        placeholder="VD: Nhánh - Cứu nhân vật B"
                        style={{
                            flex: 1, padding: '5px 8px', fontSize: '0.72rem',
                            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px',
                            background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-primary)',
                            outline: 'none'
                        }}
                        autoFocus
                    />
                    <button className="branch-create-btn" onClick={handleCreate}>Lưu</button>
                </div>
            )}

            {/* Branch list */}
            {hasBranches ? (
                <div className="branch-list">
                    {chapterBranches
                        .sort((a, b) => {
                            const order = { canon: 0, draft: 1, archived: 2 };
                            return (order[a.status] || 1) - (order[b.status] || 1);
                        })
                        .map(branch => (
                            <div
                                key={branch.id}
                                className={`branch-item ${branch.status === 'canon' ? 'active' : ''} ${branch.status === 'archived' ? 'archived' : ''}`}
                                onClick={() => handleLoad(branch)}
                            >
                                <div className={`branch-status-dot ${branch.status}`} />
                                <div className="branch-info">
                                    <div className="branch-name">{branch.name}</div>
                                    <div className="branch-meta">
                                        {statusLabels[branch.status] || branch.status}
                                        {branch.content ? ` • ${Utils.countWords(branch.content)} từ` : ''}
                                    </div>
                                </div>
                                <div className="branch-actions" onClick={e => e.stopPropagation()}>
                                    {branch.status === 'draft' && (
                                        <button
                                            className="branch-action-btn merge"
                                            onClick={() => handleMerge(branch.id)}
                                            title="Chốt nhánh này làm chính thức"
                                        >✅</button>
                                    )}
                                    {branch.status !== 'canon' && (
                                        <button
                                            className="branch-action-btn delete"
                                            onClick={() => handleDelete(branch.id)}
                                            title="Xóa nhánh"
                                        >🗑️</button>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            ) : (
                <div className="branch-empty">
                    Chưa có nhánh nào. Tạo nhánh để thử nhiều hướng phát triển.
                </div>
            )}
        </div>
    );
});
