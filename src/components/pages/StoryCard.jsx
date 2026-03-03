import React, { useMemo } from 'react';
import { BookOpen, Tag, Calendar, FolderOpen, FileJson, Download, Trash2, Gamepad2 } from 'lucide-react';
import { Utils } from '../../utils/helpers';

const StoryCard = React.memo(({ story, onOpenStory, onExportJSON, onExportTXT, onDelete, onRoleplay, index }) => {
    const wordCount = useMemo(() => {
        return Utils.countWords(
            (story.database?.chapters || []).map(c => c.content || '').join(' ') || story.content || ''
        );
    }, [story.database?.chapters, story.content]);

    const chapterCount = story.database?.chapters?.length || 0;
    const charCount = story.database?.characters?.length || 0;

    return (
        <div
            className="story-card"
            style={{ animationDelay: `${index * 0.06}s` }}
        >
            <div className="story-card-header">
                <div className="story-card-icon">
                    <BookOpen size={24} />
                </div>
                <div className="story-card-info">
                    <h3 className="story-card-title">{story.title}</h3>
                    <div className="story-card-meta">
                        <span><Tag size={12} /> {story.genre || 'Chưa phân loại'}</span>
                        <span><Calendar size={12} /> {Utils.formatDate(story.updatedAt)}</span>
                    </div>
                </div>
            </div>

            <div className="story-card-stats">
                <div className="story-card-stat">
                    <span className="stat-number">{chapterCount}</span>
                    <span className="stat-label">Chương</span>
                </div>
                <div className="story-card-stat">
                    <span className="stat-number">{charCount}</span>
                    <span className="stat-label">Nhân vật</span>
                </div>
                <div className="story-card-stat">
                    <span className="stat-number">{wordCount}</span>
                    <span className="stat-label">Từ</span>
                </div>
            </div>

            {/* Synopsis if available */}
            {story.synopsis && (
                <p className="story-card-synopsis">{story.synopsis}</p>
            )}

            {/* Type badge */}
            {story.type === 'roleplay' && (
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: 'linear-gradient(135deg, hsl(270,60%,25%), hsl(300,50%,25%))',
                    color: 'hsl(270,80%,80%)', border: '1px solid hsl(270,50%,40%)',
                    marginBottom: 8, width: 'fit-content',
                }}>
                    <Gamepad2 size={11} /> Roleplay
                </div>
            )}

            <div className="story-card-actions">
                <button
                    className="btn btn-primary story-card-btn-main"
                    onClick={() => onOpenStory(story.id)}
                >
                    <FolderOpen size={16} /> {story.type === 'roleplay' ? 'Quản lý' : 'Mở truyện'}
                </button>
                {story.type === 'roleplay' && (
                    <button
                        className="btn btn-small"
                        onClick={(e) => { e.stopPropagation(); onRoleplay && onRoleplay(story.id); }}
                        title="Chơi nhập vai"
                        style={{
                            background: 'linear-gradient(135deg, hsl(270,60%,35%), hsl(300,50%,30%))',
                            border: '1px solid hsl(270,50%,45%)',
                            color: 'white',
                        }}
                    >
                        <Gamepad2 size={14} />
                    </button>
                )}
                <button
                    className="btn btn-secondary btn-small"
                    onClick={(e) => { e.stopPropagation(); onExportJSON(story); }}
                    title="Tải JSON"
                >
                    <FileJson size={14} />
                </button>
                <button
                    className="btn btn-secondary btn-small"
                    onClick={(e) => { e.stopPropagation(); onExportTXT(story); }}
                    title="Tải TXT"
                >
                    <Download size={14} />
                </button>
                <button
                    className="btn btn-small"
                    onClick={(e) => { e.stopPropagation(); onDelete(story); }}
                    title="Xóa truyện"
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--color-error, #ef4444)',
                    }}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
});

export default StoryCard;
