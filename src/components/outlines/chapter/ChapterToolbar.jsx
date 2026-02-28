import {
    Save, ArrowLeft, Sparkles, Loader2,
    BookPlus, Trash2, Maximize2, Minimize2, Wand2
} from 'lucide-react';

/**
 * Top toolbar for ChapterDetail — back button, title, "Tiếp tục viết" button, save, word count, etc.
 */
export default function ChapterToolbar({
    chapter,
    content,
    isSaving,
    isSaved,
    aiLoading,
    isSidebarOpen,
    onBack,
    onSave,
    onToggleSidebar,
    onContinueWrite,
    onCreateNewChapter,
    onDeleteRequest,
}) {
    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;

    return (
        <div className="chapter-detail-toolbar">
            <div className="chapter-toolbar-left">
                <button className="btn-icon" onClick={onBack} title="Quay lại mục lục">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <div className="chapter-toolbar-order">
                        Chương {chapter.order}
                    </div>
                    <div className="chapter-toolbar-title">
                        {chapter.title}
                    </div>
                </div>
            </div>
            <div className="chapter-detail-toolbar-actions">
                <span className={`chapter-toolbar-status ${isSaved ? 'saved' : 'unsaved'}`}>
                    {isSaving ? 'Đang lưu...' : (isSaved ? 'Đã lưu' : 'Chưa lưu')}
                </span>
                <button
                    className="btn btn-secondary btn-small"
                    onClick={onContinueWrite}
                    disabled={aiLoading}
                    title="Tiếp tục viết bằng AI"
                >
                    {aiLoading ? (
                        <><Loader2 size={16} className="spin" /> AI đang xử lý...</>
                    ) : (
                        <><Wand2 size={16} /> Tiếp tục viết</>
                    )}
                </button>
                <button className="btn btn-primary btn-small" onClick={onSave}>
                    <Save size={16} /> Lưu
                </button>
                <span className="chapter-toolbar-wordcount">
                    {wordCount} từ
                </span>
                <button
                    className="btn btn-secondary btn-small chapter-toolbar-new-btn"
                    onClick={onCreateNewChapter}
                    title="Tạo chương mới"
                >
                    <BookPlus size={16} /> Chương mới
                </button>
                <button
                    className="btn btn-small chapter-toolbar-delete-btn"
                    onClick={onDeleteRequest}
                    title="Xóa chương này"
                >
                    <Trash2 size={16} /> Xóa
                </button>
                <button
                    className="btn-icon"
                    onClick={onToggleSidebar}
                    title={isSidebarOpen ? "Đóng sidebar" : "Mở sidebar"}
                >
                    {isSidebarOpen ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                </button>
            </div>
        </div>
    );
}
