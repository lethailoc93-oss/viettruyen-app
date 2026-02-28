
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStory } from '../../context/StoryContext';
import { useApiKey } from '../../context/ApiKeyContext';
import { ExportService } from '../../services/exportService';
import { importCardAsStory } from '../../services/cardImportService';
import { Utils } from '../../utils/helpers';
import NewStoryModal from '../modals/NewStoryModal';
import ApiKeyModal from '../modals/ApiKeyModal';
import AISettingsModal from '../modals/AISettingsModal';
import GoogleDriveModal from '../modals/GoogleDriveModal';
import ConfirmDialog from '../modals/ConfirmDialog';
import UserGuideModal from '../modals/UserGuideModal';
import StoryCard from './StoryCard';
import { showToast } from '../modals/Toast';
import {
    Plus, BookOpen, Download, FileJson, Upload, PenTool,
    Tag, Calendar, Sparkles, FolderOpen, Key, Bot, HardDrive, Search,
    Trash2, AlertTriangle, X, Book, Image, Gamepad2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleDriveService } from '../../services/googleDriveService';

export default function LandingPage({ onOpenStory }) {
    const { stories, importStory, deleteStory, switchStory } = useStory();
    const navigate = useNavigate();
    const [deleteConfirm, setDeleteConfirm] = useState(null); // story to delete
    const { isKeySet } = useApiKey();
    const [showNewStoryModal, setShowNewStoryModal] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showDriveModal, setShowDriveModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [isCardImporting, setIsCardImporting] = useState(false);
    const fileInputRef = useRef(null);
    const cardFileInputRef = useRef(null);

    const handleExportJSON = (story) => {
        ExportService.exportStoryJSON(story);
    };

    const handleExportTXT = (story) => {
        ExportService.exportStory(story);
    };

    const handleImportJSON = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        showToast('Đang xử lý dữ liệu từ file...', 'info', 2000);

        const reader = new FileReader();
        reader.onload = (event) => {
            // Use setTimeout to allow UI to update with loading state
            setTimeout(() => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (typeof data !== 'object' || Array.isArray(data)) {
                        showToast('File JSON không hợp lệ: cần là một object.', 'error');
                        setIsImporting(false);
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
                    const detail = parts.length > 0 ? ` — Dữ liệu: ${parts.join(', ')}` : '';
                    showToast(`Đã nhập truyện "${result.title}" thành công!${detail}`, 'success', 5000);
                } catch (err) {
                    showToast('Lỗi khi đọc file JSON: ' + err.message, 'error');
                } finally {
                    setIsImporting(false);
                }
            }, 100);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // === Card Import Handler ===
    const handleCardImport = () => {
        cardFileInputRef.current?.click();
    };

    const handleCardFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsCardImporting(true);
        showToast('🃏 Đang phân tích Card...', 'info', 2000);

        try {
            const { story, summary } = await importCardAsStory(file);
            const result = importStory(story);
            showToast(`✅ Đã tạo bộ truyện từ Card!\n${summary}`, 'success', 8000);

            // Automatically switch to roleplay mode if it's a card
            if (result._cardImport) {
                navigate('/roleplay');
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Card import error:', err);
            showToast('❌ Lỗi nhập Card: ' + err.message, 'error');
        } finally {
            setIsCardImporting(false);
            e.target.value = '';
        }
    };

    // === Roleplay Handler ===
    const handleRoleplay = (storyId) => {
        switchStory(storyId);
        navigate('/roleplay');
    };

    const filteredStories = stories.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <div className="landing-page">
                {/* Header Bar */}
                <header className="landing-header">
                    <div className="landing-header-left">
                        <div className="app-logo">
                            <Sparkles size={24} className="text-primary" />
                            <span>AI Story Writer</span>
                        </div>
                    </div>
                    <div className="landing-header-right">
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
                            style={{ position: 'relative' }}
                        >
                            <Key size={16} />
                            <span className="desktop-only">API Key</span>
                            {isKeySet && <span className="header-dot-indicator" />}
                        </button>
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={() => setShowDriveModal(true)}
                            style={{ position: 'relative' }}
                        >
                            <HardDrive size={16} />
                            <span className="desktop-only">Drive</span>
                            {GoogleDriveService.isConnected() && <span className="header-dot-indicator" />}
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

                {/* Hero Section */}
                <div className="landing-hero">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="landing-title">
                            <Sparkles size={32} /> Truyện của bạn
                        </h1>
                        <p className="landing-subtitle">Chọn một truyện để tiếp tục hoặc tạo truyện mới</p>
                    </motion.div>

                    <div className="landing-actions">
                        <button className="btn btn-primary" onClick={() => setShowNewStoryModal(true)}>
                            <Plus size={18} /> Tạo truyện mới
                        </button>
                        <button className="btn btn-secondary" onClick={handleImportJSON} disabled={isImporting}>
                            {isImporting ? <span className="spinner-small"></span> : <Upload size={16} />}
                            {isImporting ? 'Đang nhập...' : 'Nhập JSON'}
                        </button>
                        <button className="btn btn-secondary" onClick={handleCardImport} disabled={isCardImporting}
                            style={{ background: 'linear-gradient(135deg, hsl(270,60%,25%), hsl(220,60%,30%))', borderColor: 'hsl(270,50%,40%)' }}>
                            {isCardImporting ? <span className="spinner-small"></span> : <Image size={16} />}
                            {isCardImporting ? 'Đang phân tích...' : '📥 Nhập Card'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={cardFileInputRef}
                            type="file"
                            accept=".png,.json"
                            onChange={handleCardFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                {/* Search bar */}
                {stories.length > 3 && (
                    <div className="landing-search">
                        <Search size={16} className="landing-search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm truyện..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="landing-search-input"
                        />
                    </div>
                )}

                {/* Story Grid */}
                {filteredStories.length === 0 ? (
                    <motion.div
                        className="landing-empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <BookOpen size={64} className="text-muted" />
                        <h2>Chưa có truyện nào</h2>
                        <p>Bắt đầu bằng cách tạo truyện mới hoặc nhập từ file JSON</p>
                    </motion.div>
                ) : (
                    <div className="story-card-grid">
                        {filteredStories.map((story, index) => (
                            <StoryCard
                                key={story.id}
                                story={story}
                                index={index}
                                onOpenStory={onOpenStory}
                                onRoleplay={handleRoleplay}
                                onExportJSON={handleExportJSON}
                                onExportTXT={handleExportTXT}
                                onDelete={setDeleteConfirm}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showNewStoryModal && <NewStoryModal onClose={() => setShowNewStoryModal(false)} />}
            {showApiKeyModal && <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />}
            {showSettingsModal && <AISettingsModal onClose={() => setShowSettingsModal(false)} />}
            {showDriveModal && <GoogleDriveModal onClose={() => setShowDriveModal(false)} />}
            {showGuideModal && <UserGuideModal onClose={() => setShowGuideModal(false)} />}

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <ConfirmDialog
                    title="Xóa truyện?"
                    message={<>Bạn có chắc muốn xóa <strong style={{ color: 'var(--color-text-primary)' }}>{deleteConfirm.title}</strong>?</>}
                    details={<>
                        ⚠️ Tất cả dữ liệu sẽ bị xóa vĩnh viễn:
                        {deleteConfirm.database?.chapters?.length > 0 && ` ${deleteConfirm.database.chapters.length} chương,`}
                        {deleteConfirm.database?.characters?.length > 0 && ` ${deleteConfirm.database.characters.length} nhân vật,`}
                        {` ${Utils.countWords((deleteConfirm.database?.chapters || []).map(c => c.content || '').join(' ') || deleteConfirm.content || '')} từ`}
                    </>}
                    confirmLabel="Xóa truyện"
                    onConfirm={() => {
                        deleteStory(deleteConfirm.id);
                        setDeleteConfirm(null);
                    }}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
        </>
    );
}
