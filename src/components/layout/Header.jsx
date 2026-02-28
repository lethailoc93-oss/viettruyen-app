
import { useState, useRef } from 'react';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { ExportService } from '../../services/exportService';
import NewStoryModal from '../modals/NewStoryModal';
import ApiKeyModal from '../modals/ApiKeyModal';
import AISettingsModal from '../modals/AISettingsModal';
import GoogleDriveModal from '../modals/GoogleDriveModal';
import UserGuideModal from '../modals/UserGuideModal';
import { Download, Upload, Plus, Menu, Sparkles, Key, Bot, FileJson, HardDrive, MoreVertical, X, Book, FileText, Trash2 } from 'lucide-react';
import { GoogleDriveService } from '../../services/googleDriveService';
import { AnimatePresence, motion } from 'framer-motion';

export default function Header({ toggleSidebar }) {
    const { currentStory, importStory } = useStory();
    const { isKeySet } = useApiKey();
    const [showNewStoryModal, setShowNewStoryModal] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showDriveModal, setShowDriveModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const fileInputRef = useRef(null);

    const handleExport = () => {
        ExportService.exportStory(currentStory);
        setShowMoreMenu(false);
    };

    const handleExportJSON = () => {
        ExportService.exportStoryJSON(currentStory);
        setShowMoreMenu(false);
    };

    const handleExportHTML = () => {
        ExportService.exportHTML(currentStory);
        setShowMoreMenu(false);
    };

    const handleExportEPUB = () => {
        ExportService.exportEPUB(currentStory);
        setShowMoreMenu(false);
    };

    const handleImportJSON = () => {
        fileInputRef.current?.click();
        setShowMoreMenu(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (typeof data !== 'object' || Array.isArray(data)) {
                    alert('File JSON không hợp lệ: cần là một object.');
                    return;
                }
                const result = importStory(data);
                const s = result._importSummary;
                const parts = [];
                if (s.chapters) parts.push(`${s.chapters} chương`);
                if (s.characters) parts.push(`${s.characters} nhân vật`);
                if (s.settings) parts.push(`${s.settings} bối cảnh`);
                if (s.timeline) parts.push(`${s.timeline} sự kiện`);
                if (s.plots) parts.push(`${s.plots} cốt truyện`);
                if (s.scenes) parts.push(`${s.scenes} cảnh`);
                if (s.references) parts.push(`${s.references} tài liệu`);
                const detail = parts.length > 0 ? `\nDữ liệu: ${parts.join(', ')}` : '';
                alert(`Đã nhập truyện "${result.title}" thành công!${detail}`);
            } catch (err) {
                alert('Lỗi khi đọc file JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <>
            <header className="app-header">
                <div className="flex items-center gap-md">
                    <button className="btn-icon mobile-only" onClick={toggleSidebar}>
                        <Menu size={22} />
                    </button>
                    <div className="app-logo">
                        <Sparkles size={22} className="text-primary" />
                        <span className="logo-text">AI Story Writer</span>
                    </div>
                </div>
                <div className="header-actions">
                    {/* Always visible */}
                    <button
                        className="btn btn-secondary btn-small"
                        onClick={() => setShowGuideModal(true)}
                        title="Hướng dẫn sử dụng"
                    >
                        <Book size={16} />
                        <span className="desktop-only text-primary">Hướng dẫn</span>
                    </button>
                    <button
                        className="btn btn-secondary btn-small"
                        onClick={() => setShowApiKeyModal(true)}
                        title="Cài đặt API Key"
                        style={{ position: 'relative' }}
                    >
                        <Key size={16} />
                        <span className="desktop-only">API Key</span>
                        {isKeySet && (
                            <span className="header-dot-indicator" />
                        )}
                    </button>

                    {/* Desktop only - shown inline */}
                    <button className="btn btn-secondary btn-small desktop-only" onClick={handleImportJSON} title="Nhập truyện từ file JSON">
                        <Upload size={16} />
                        <span>Nhập JSON</span>
                    </button>
                    <button className="btn btn-secondary btn-small desktop-only" onClick={handleExportJSON} title="Xuất truyện ra file JSON">
                        <FileJson size={16} />
                        <span>Xuất JSON</span>
                    </button>
                    <button className="btn btn-secondary btn-small desktop-only" onClick={handleExport} title="Xuất truyện ra file TXT">
                        <Download size={16} />
                        <span>Xuất TXT</span>
                    </button>
                    <button className="btn btn-secondary btn-small desktop-only" onClick={handleExportHTML} title="Xuất truyện ra file HTML đẹp">
                        <FileText size={16} />
                        <span>HTML</span>
                    </button>
                    <button
                        className={`btn ${GoogleDriveService.isConnected() ? 'btn-secondary' : 'btn-primary'} btn-small desktop-only`}
                        onClick={() => setShowDriveModal(true)}
                        title="Google Drive"
                        style={{ position: 'relative', gap: '6px' }}
                    >
                        {GoogleDriveService.isConnected() ? (
                            <>
                                {GoogleDriveService.getSavedUser()?.photo ? (
                                    <img
                                        src={GoogleDriveService.getSavedUser().photo}
                                        alt=""
                                        style={{ width: 18, height: 18, borderRadius: '50%' }}
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <HardDrive size={16} />
                                )}
                                <span>{GoogleDriveService.getSavedUser()?.name?.split(' ')[0] || 'Drive'}</span>
                                <span className="header-dot-indicator" />
                            </>
                        ) : (
                            <>
                                <HardDrive size={16} />
                                <span>Đăng nhập Drive</span>
                            </>
                        )}
                    </button>

                    {/* Mobile: More menu button */}
                    <div className="mobile-more-container mobile-only">
                        <button
                            className="btn-icon"
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            title="Thêm"
                        >
                            <MoreVertical size={20} />
                        </button>
                        <AnimatePresence>
                            {showMoreMenu && (
                                <>
                                    <motion.div
                                        className="more-menu-overlay"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setShowMoreMenu(false)}
                                    />
                                    <motion.div
                                        className="more-menu"
                                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <button className="more-menu-item" onClick={() => { setShowGuideModal(true); setShowMoreMenu(false); }}>
                                            <Book size={16} className="text-primary" /> Hướng dẫn
                                        </button>
                                        <button className="more-menu-item" onClick={handleImportJSON}>
                                            <Upload size={16} /> Nhập JSON
                                        </button>
                                        <button className="more-menu-item" onClick={handleExportJSON}>
                                            <FileJson size={16} /> Xuất JSON
                                        </button>
                                        <button className="more-menu-item" onClick={handleExport}>
                                            <Download size={16} /> Xuất TXT
                                        </button>
                                        <button className="more-menu-item" onClick={handleExportHTML}>
                                            <FileText size={16} /> Xuất HTML
                                        </button>
                                        <button className="more-menu-item" onClick={() => { setShowDriveModal(true); setShowMoreMenu(false); }}>
                                            <HardDrive size={16} />
                                            {GoogleDriveService.isConnected()
                                                ? `${GoogleDriveService.getSavedUser()?.name?.split(' ')[0] || 'Drive'} (Đã kết nối)`
                                                : 'Đăng nhập Google Drive'
                                            }
                                            {GoogleDriveService.isConnected() && <span className="text-success" style={{ marginLeft: 'auto', fontSize: '10px' }}>●</span>}
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    <button className="btn btn-primary btn-small" onClick={() => setShowNewStoryModal(true)}>
                        <Plus size={16} />
                        <span className="desktop-only">Truyện mới</span>
                    </button>
                    <button
                        className="btn-icon"
                        onClick={() => setShowSettingsModal(true)}
                        title="Cấu hình AI"
                    >
                        <Bot size={20} />
                    </button>
                </div>
            </header>

            {showNewStoryModal && (
                <NewStoryModal onClose={() => setShowNewStoryModal(false)} />
            )}
            {showApiKeyModal && (
                <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />
            )}
            {showSettingsModal && (
                <AISettingsModal onClose={() => setShowSettingsModal(false)} />
            )}
            {showDriveModal && (
                <GoogleDriveModal onClose={() => setShowDriveModal(false)} />
            )}
            {showGuideModal && (
                <UserGuideModal onClose={() => setShowGuideModal(false)} />
            )}
        </>
    );
}
