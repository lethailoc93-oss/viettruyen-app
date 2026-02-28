import { useState, useEffect } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { useDirectives } from '../../context/DirectiveContext';
import { AIService } from '../../services/aiService';
import { Layout, Sparkles, Save, Check, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OverallOutline() {
    const { currentStory, updateOverallOutline } = useStory();
    const { getNextKey, isKeySet, selectedModel } = useApiKey();
    const { getDirective } = useDirectives();
    const [outline, setOutline] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved');

    useEffect(() => {
        setOutline(currentStory?.outlines?.overall || '');
    }, [currentStory]);

    const handleSave = () => {
        updateOverallOutline(outline);
        setSaveStatus('saving');
        setTimeout(() => setSaveStatus('saved'), 800);
    };

    const handleGenerateAI = async () => {
        if (!currentStory) return;
        setLoading(true);
        try {
            const result = await AIService.generateOutline(getNextKey(), currentStory, { directive: getDirective('generateOutline'), model: selectedModel });
            setOutline(result);
            updateOverallOutline(result);
        } catch (err) {
            alert('Có lỗi khi tạo dàn ý: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!currentStory) {
        return (
            <div className="database-container">
                <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                    Vui lòng chọn hoặc tạo truyện trước.
                </p>
            </div>
        );
    }

    return (
        <motion.div
            className="database-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="database-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Layout size={22} className="text-primary" />
                    Dàn ý tổng
                </h2>
                <div className="flex gap-sm">
                    <button
                        className="btn btn-secondary btn-small"
                        onClick={handleGenerateAI}
                        disabled={loading}
                        title={!isKeySet ? 'Sẽ dùng dữ liệu mẫu (chưa có API key)' : 'Tạo bằng AI'}
                    >
                        {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                        {loading ? 'Đang tạo...' : 'Tạo bằng AI'}
                    </button>
                    <button className="btn btn-primary btn-small" onClick={handleSave}>
                        {saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />}
                        {saveStatus === 'saved' ? 'Đã lưu' : 'Lưu'}
                    </button>
                </div>
            </div>

            {!isKeySet && (
                <div style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid var(--color-warning)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-warning)',
                    marginBottom: 'var(--space-md)'
                }}>
                    <AlertCircle size={14} />
                    <span>Nhập API key ở header để sử dụng AI. Hiện đang dùng dữ liệu mẫu.</span>
                </div>
            )}

            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <textarea
                    className="editor-textarea"
                    value={outline}
                    onChange={(e) => {
                        setOutline(e.target.value);
                        setSaveStatus('unsaved');
                    }}
                    placeholder="Nhập dàn ý tổng cho câu chuyện của bạn...&#10;&#10;Hoặc bấm 'Tạo bằng AI' để AI gợi ý."
                    style={{ minHeight: '400px', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--font-size-base)' }}
                />
            </div>
        </motion.div>
    );
}
