
import { useStory } from '../../context/StoryContext';
import { Utils } from '../../utils/helpers';
import { BookOpen, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ isOpen, onClose, onSelectStory }) {
    const { stories, currentStory, switchStory, deleteStory } = useStory();

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="sidebar-overlay mobile-only"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
                <div className="sidebar-section">
                    <div className="sidebar-title">Truyện của bạn</div>
                    <ul className="story-list">
                        {stories.length === 0 ? (
                            <li style={{ padding: 'var(--space-md)', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                                Chưa có truyện nào
                            </li>
                        ) : (
                            stories.map(story => (
                                <li
                                    key={story.id}
                                    className={`story-item ${currentStory?.id === story.id ? 'active' : ''}`}
                                    onClick={() => {
                                        switchStory(story.id);
                                        if (onSelectStory) onSelectStory();
                                        if (window.innerWidth <= 768) onClose();
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div className="story-name flex items-center gap-sm" style={{ flex: 1, minWidth: 0 }}>
                                            <BookOpen size={16} className={currentStory?.id === story.id ? 'text-primary' : 'text-muted'} style={{ flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.title}</span>
                                        </div>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteStory(story.id);
                                            }}
                                            title="Xóa truyện"
                                            style={{
                                                color: 'var(--color-text-tertiary)',
                                                opacity: 0.5,
                                                transition: 'all 0.2s',
                                                padding: '2px',
                                                flexShrink: 0
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.opacity = '1'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; e.currentTarget.style.opacity = '0.5'; }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="story-meta flex items-center gap-xs" style={{ marginLeft: '24px' }}>
                                        <FileText size={12} />
                                        <span>{story.genre} • {Utils.formatDate(story.updatedAt)}</span>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </aside>
        </>
    );
}
