import React, { useState } from 'react';
import { Zap, Sparkles, Loader2, Palette, Download, Image as ImageIcon, Info } from 'lucide-react';
import AIImageGuideModal from '../../modals/AIImageGuideModal';

/**
 * "Chỉ đạo AI" (AI Directive) panel below the editor.
 * Users type instructions here before triggering AI chapter writing or image drawing.
 */
export default function AIDirectivePanel({
    hotDirective,
    setHotDirective,
    onWriteFromDirective,
    onDrawFromDirective,
    isWritingChapter,
    writeChapterStatus,
    isDrawing,
    drawStatus,
    drawImage,
    setDrawImage,
    drawImagePrompt,
    isKeySet
}) {
    const [showGuide, setShowGuide] = useState(false);

    const handleDownloadImage = () => {
        if (!drawImage) return;
        try {
            if (drawImage.startsWith('blob:')) {
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = drawImage;
                a.download = `ai-scene-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                window.open(drawImage, '_blank', 'noopener,noreferrer');
            }
        } catch {
            // fallback
        }
    };

    return (
        <div className="chapter-detail-hot-directive">
            <div className="hot-directive-header">
                <div className="hot-directive-title">
                    <Zap size={14} className="directive-panel-icon" />
                    <span>Chỉ đạo AI</span>
                </div>
                <div className="hot-directive-subtitle">
                    Hướng dẫn cụ thể cho AI trong lần viết tiếp theo hoặc mô tả cảnh cần vẽ
                </div>
            </div>

            <div className="hot-directive-body">
                <textarea
                    value={hotDirective}
                    onChange={(e) => setHotDirective(e.target.value)}
                    placeholder="VD: Tập trung miêu tả nội tâm nhân vật chính... hoặc: Vẽ cảnh nữ chính đứng trước tòa lâu đài dưới ánh trăng"
                    className="hot-directive-input"
                    rows={3}
                />

                <div className="hot-directive-actions">
                    <div className="hot-directive-options">
                        {/* Placeholders for potential future options like Model select */}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="btn-icon"
                            onClick={() => setShowGuide(true)}
                            title="Xem hướng dẫn các chế độ vẽ AI"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '8px', borderRadius: 'var(--radius-md)',
                                background: 'transparent',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--glass-bg-hover)';
                                e.currentTarget.style.color = 'var(--color-text)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }}
                        >
                            <Info size={16} />
                        </button>

                        <button
                            className="btn-ai-draw"
                            onClick={onDrawFromDirective}
                            disabled={isDrawing || isWritingChapter || !isKeySet}
                            title={!isKeySet ? 'Cần API key để vẽ' : 'Tạo ảnh minh họa từ mô tả trong ô Chỉ đạo AI'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                background: isDrawing ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.1)',
                                color: 'var(--color-warning)',
                                cursor: isDrawing || isWritingChapter || !isKeySet ? 'not-allowed' : 'pointer',
                                opacity: isDrawing || isWritingChapter || !isKeySet ? 0.6 : 1,
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {isDrawing ? (
                                <><Loader2 size={16} className="spin" /> <span>{drawStatus || 'Đang vẽ...'}</span></>
                            ) : (
                                <><Palette size={16} /> <span>Vẽ</span></>
                            )}
                        </button>

                        <button
                            className="btn-ai-write"
                            onClick={onWriteFromDirective}
                            disabled={isWritingChapter || isDrawing || !isKeySet}
                            title={!isKeySet ? 'Cần API key để viết' : 'AI viết chương (3 bước: dàn ý → viết → quét)'}
                        >
                            {isWritingChapter ? (
                                <><Loader2 size={16} className="spin" /> <span>{writeChapterStatus || 'Đang xử lý...'}</span></>
                            ) : (
                                <><Sparkles size={16} /> <span>Viết tiếp (Quality Mode)</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Draw result — show generated image */}
            {drawImage && (
                <div style={{
                    margin: '8px 12px 12px',
                    padding: 'var(--space-md)',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ImageIcon size={14} className="text-primary" /> Ảnh do AI tạo
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                onClick={handleDownloadImage}
                            >
                                <Download size={12} /> Tải xuống
                            </button>
                            <button
                                style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                onClick={() => {
                                    if (drawImage.startsWith('blob:')) URL.revokeObjectURL(drawImage);
                                    setDrawImage('');
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                    <div style={{ width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center', minHeight: '200px', alignItems: 'center' }}>
                        <img
                            src={drawImage}
                            alt="AI Generated Scene"
                            style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = '<div style="padding: 20px; color: var(--color-text-secondary); text-align: center;">❌ Không thể tải ảnh. Nhấn <b>Vẽ</b> để thử lại.</div>';
                            }}
                        />
                    </div>
                    {drawImagePrompt && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginTop: '6px' }}>
                            <strong>Prompt:</strong> {drawImagePrompt}
                        </div>
                    )}
                </div>
            )}

            <AIImageGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
        </div>
    );
}

