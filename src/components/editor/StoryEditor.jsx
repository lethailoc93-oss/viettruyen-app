
import { useState, useEffect } from 'react';
import { useStory } from '../../context/StoryContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Utils } from '../../utils/helpers';
import { BarChart2, Type, Check, Save, Maximize, Loader2 } from 'lucide-react';

export default function StoryEditor() {
    const { currentStory, updateStoryContent, setEditingItemId, setEditingItemType } = useStory();
    const [content, setContent] = useState('');
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving'

    useEffect(() => {
        setContent(currentStory?.content || '');

        if (currentStory) {
            setEditingItemId(currentStory.id);
            setEditingItemType('story');
        }

        return () => {
            setEditingItemId(null);
            setEditingItemType(null);
        };
    }, [currentStory, setEditingItemId, setEditingItemType]);

    useAutoSave(content, (value) => {
        if (currentStory && value !== currentStory.content) {
            updateStoryContent(value);
            setSaveStatus('saving');
            setTimeout(() => setSaveStatus('saved'), 500);
        }
    });

    const wordCount = Utils.countWords(content);
    const charCount = content.length;

    const handleFullscreen = () => {
        const editor = document.getElementById('story-editor-textarea');
        if (editor?.requestFullscreen) {
            editor.requestFullscreen();
        }
    };

    if (!currentStory) {
        return (
            <div className="editor-container">
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                    Tạo truyện mới để bắt đầu...
                </div>
            </div>
        );
    }

    return (
        <div className="editor-container">
            <div className="editor-toolbar">
                <div className="editor-stats">
                    <div className="stat-item" title="Số từ">
                        <BarChart2 size={16} />
                        <span>{wordCount} từ</span>
                    </div>
                    <div className="stat-item" title="Số ký tự">
                        <Type size={16} />
                        <span>{charCount} ký tự</span>
                    </div>
                    <div className="stat-item">
                        {saveStatus === 'saved' ? (
                            <span className="flex items-center gap-xs text-success">
                                <Check size={16} /> Đã lưu
                            </span>
                        ) : (
                            <span className="flex items-center gap-xs text-warning">
                                <Loader2 size={16} className="spin" /> Đang lưu...
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-sm">
                    <button className="btn-icon" onClick={handleFullscreen} title="Toàn màn hình">
                        <Maximize size={18} />
                    </button>
                </div>
            </div>
            <textarea
                id="story-editor-textarea"
                className="editor-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Bắt đầu viết câu chuyện của bạn...&#10;&#10;AI sẽ giúp bạn theo dõi nhân vật, bối cảnh và chi tiết để tránh mâu thuẫn trong truyện."
            />
        </div>
    );
}
