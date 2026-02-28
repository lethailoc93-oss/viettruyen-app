import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Floating toast to display AI-generated response with Apply/Copy actions.
 */
export default function AIResponseToast({ aiResponse, onClose, onApply, onCopy }) {
    return (
        <AnimatePresence>
            {aiResponse && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="ai-response-toast"
                >
                    <div className="ai-response-toast-header">
                        <span className="ai-response-toast-title">
                            <Sparkles size={14} className="directive-panel-icon" /> Kết quả AI
                        </span>
                        <button className="btn-icon ai-response-toast-close" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>
                    <div className="ai-response-toast-body">
                        {aiResponse}
                    </div>
                    <div className="ai-response-toast-actions">
                        <button
                            className="btn btn-primary btn-small ai-response-toast-action-btn"
                            onClick={onApply}
                        >
                            Áp dụng vào bài viết
                        </button>
                        <button
                            className="btn btn-secondary btn-small ai-response-toast-action-btn"
                            onClick={onCopy}
                        >
                            Sao chép
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
