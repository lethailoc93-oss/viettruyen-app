import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Confirmation dialog for deleting a chapter.
 */
export default function DeleteChapterDialog({ isOpen, chapter, contentLength, onConfirm, onCancel }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="delete-chapter-overlay"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="delete-chapter-dialog"
                    >
                        <div className="delete-dialog-header">
                            <AlertTriangle size={24} className="delete-dialog-icon" />
                            <h3 className="delete-dialog-title">Xóa chương?</h3>
                        </div>
                        <p className="delete-dialog-desc">
                            Bạn có chắc muốn xóa <strong className="delete-dialog-highlight">Chương {chapter.order}: {chapter.title}</strong>?
                        </p>
                        {contentLength > 0 && (
                            <p className="delete-dialog-warning">
                                ⚠️ Chương này có {contentLength.toLocaleString()} ký tự nội dung sẽ bị mất vĩnh viễn.
                            </p>
                        )}
                        <div className="delete-dialog-actions">
                            <button className="btn btn-secondary btn-small" onClick={onCancel}>
                                <X size={14} /> Hủy
                            </button>
                            <button
                                className="btn btn-small delete-dialog-confirm-btn"
                                onClick={onConfirm}
                            >
                                <Trash2 size={14} /> Xóa chương
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
