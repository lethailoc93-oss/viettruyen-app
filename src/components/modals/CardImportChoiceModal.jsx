// ================================================
// CardImportChoiceModal — Chọn loại khi nhập Card
// ================================================
import React from 'react';
import { BookOpen, Gamepad2, X, Users, Database, ShieldAlert, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CardImportChoiceModal({ cardInfo, onChoose, onClose }) {
    // cardInfo: { name, avatarUrl, totalEntries, characterCount, settingCount, ruleCount }
    const info = cardInfo || {};

    return (
        <div className="modal-overlay card-import-choice-overlay" onClick={onClose}>
            <motion.div
                className="card-import-choice-modal"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
            >
                {/* Header */}
                <div className="cimodal-header">
                    <h2>📥 Nhập Character Card</h2>
                    <button className="btn-icon cimodal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Card Preview */}
                <div className="cimodal-preview">
                    {info.avatarUrl && (
                        <div className="cimodal-avatar">
                            <img src={info.avatarUrl} alt={info.name} />
                        </div>
                    )}
                    <div className="cimodal-info">
                        <h3>{info.name || 'Character Card'}</h3>
                        <div className="cimodal-stats">
                            {info.characterCount > 0 && (
                                <span><Users size={12} /> {info.characterCount} nhân vật</span>
                            )}
                            {info.settingCount > 0 && (
                                <span><Database size={12} /> {info.settingCount} bối cảnh</span>
                            )}
                            {info.ruleCount > 0 && (
                                <span><ShieldAlert size={12} /> {info.ruleCount} quy tắc</span>
                            )}
                            {info.totalEntries > 0 && (
                                <span>📚 {info.totalEntries} entries</span>
                            )}
                        </div>
                    </div>
                </div>

                <p className="cimodal-question">Bạn muốn sử dụng Card này như thế nào?</p>

                {/* Choice Buttons */}
                <div className="cimodal-choices">
                    <button
                        className="cimodal-choice cimodal-choice-story"
                        onClick={() => onChoose('story')}
                    >
                        <div className="cimodal-choice-icon">
                            <BookOpen size={32} />
                        </div>
                        <div className="cimodal-choice-text">
                            <strong>📖 Tạo Bộ Truyện</strong>
                            <p>Dùng làm tài liệu để viết truyện dài. Có chương, dàn ý, nội dung, phân cảnh.</p>
                        </div>
                    </button>

                    <button
                        className="cimodal-choice cimodal-choice-roleplay"
                        onClick={() => onChoose('roleplay')}
                    >
                        <div className="cimodal-choice-icon">
                            <Gamepad2 size={32} />
                        </div>
                        <div className="cimodal-choice-text">
                            <strong>🎮 Tạo Roleplay</strong>
                            <p>Nhập vai tương tác với nhân vật. Giao diện kiểu SillyTavern với kiến thức, quy tắc.</p>
                        </div>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
