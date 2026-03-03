
import React, { useState } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import {
    Book, Layout, Users, Map, Clock, FileText, Clapperboard,
    ArrowLeft, Plus, BookOpen, CheckCircle, ShieldAlert,
    Zap, Package, Building2, MapPinned, Database, Search, Gamepad2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default React.memo(function StorySidebar({ activeView, onNavigate, onGoHome, selectedChapterId, className = '' }) {
    const { currentStory } = useStoryState();
    const { chapterOps } = useStoryDispatch();
    const [activeTab, setActiveTab] = useState('chapters'); // 'chapters', 'knowledge', 'settings'

    if (!currentStory) return null;

    const chapters = currentStory.database?.chapters || [];

    const knowledgeItems = [
        { id: 'worldbook', label: 'Tổng Worldbook', icon: Database, count: null, color: 'var(--color-primary)' },
        { id: 'outlines', label: 'Dàn ý', icon: Layout, count: (currentStory.database?.chapters?.length || 0), color: 'hsl(200, 90%, 55%)' },
        { id: 'characters', label: 'Nhân vật', icon: Users, count: currentStory.database?.characters?.length || 0, color: 'hsl(280, 85%, 60%)' },
        { id: 'settings', label: 'Bối cảnh', icon: Map, count: currentStory.database?.settings?.length || 0, color: 'hsl(140, 70%, 55%)' },
        { id: 'abilities', label: 'Năng lực', icon: Zap, count: currentStory.database?.abilities?.length || 0, color: 'hsl(45, 95%, 55%)' },
        { id: 'items', label: 'Vật phẩm', icon: Package, count: currentStory.database?.items?.length || 0, color: 'hsl(30, 90%, 55%)' },
        { id: 'organizations', label: 'Tổ chức', icon: Building2, count: currentStory.database?.organizations?.length || 0, color: 'hsl(220, 80%, 60%)' },
        { id: 'quests', label: 'Nhiệm vụ', icon: MapPinned, count: currentStory.database?.quests?.length || 0, color: 'hsl(160, 70%, 50%)' },
        { id: 'plots', label: 'Chi tiết', icon: FileText, count: currentStory.database?.plots?.length || 0, color: 'hsl(40, 95%, 60%)' },
        { id: 'timeline', label: 'Thời gian', icon: Clock, count: currentStory.database?.timeline?.length || 0, color: 'hsl(340, 80%, 55%)' },
        { id: 'scene-outline', label: 'Phân cảnh', icon: Clapperboard, count: currentStory.database?.scenes?.length || 0, color: 'hsl(30, 90%, 55%)' },
        { id: 'references', label: 'Tham khảo', icon: BookOpen, count: currentStory.database?.references?.length || 0, color: 'hsl(170, 70%, 50%)' },
        { id: 'meta-rules', label: 'Quy tắc AI', icon: ShieldAlert, count: currentStory.database?.metaRules?.length || 0, color: 'hsl(270, 80%, 60%)' },
    ];

    const systemItems = [
        { id: 'auto', label: 'Tự động', icon: Zap, count: null, color: 'hsl(270, 85%, 60%)' },
        { id: 'research', label: 'Nghiên cứu', icon: Search, count: null, color: 'hsl(200, 85%, 55%)' },
        { id: 'checker', label: 'Kiểm tra', icon: CheckCircle, count: null, color: 'hsl(60, 70%, 50%)' },
        { id: 'story-rules', label: 'Quy tắc AI', icon: ShieldAlert, count: null, color: 'hsl(0, 75%, 55%)' },
    ];

    return (
        <aside className={`story-sidebar ${className}`}>
            {/* Header: Back & Title */}
            <div className="story-sidebar-header">
                <button className="btn-icon story-sidebar-back" onClick={onGoHome} title="Về trang chủ">
                    <ArrowLeft size={18} />
                </button>
                <div className="story-sidebar-title" onClick={() => onNavigate('home')} style={{ flex: 1, overflow: 'hidden' }}>
                    <span className="story-sidebar-title-text">{currentStory.title}</span>
                </div>
                {currentStory.type === 'roleplay' && (
                    <button
                        className="btn-icon"
                        onClick={() => onNavigate('roleplay')}
                        title="Chơi Nhập Vai"
                        style={{ color: 'hsl(270, 70%, 65%)' }}
                    >
                        <Gamepad2 size={18} />
                    </button>
                )}
            </div>

            {/* Top Tabs */}
            <div className="story-sidebar-tabs">
                <button
                    className={`sidebar-tab ${activeTab === 'chapters' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chapters')}
                >
                    <Book size={14} /> Chương
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'knowledge' ? 'active' : ''}`}
                    onClick={() => setActiveTab('knowledge')}
                >
                    <Database size={14} /> Kiến thức
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'system' ? 'active' : ''}`}
                    onClick={() => setActiveTab('system')}
                >
                    <ShieldAlert size={14} /> Hệ thống
                </button>
            </div>

            {/* Tab Content */}
            <div className="story-sidebar-tab-content">
                <AnimatePresence mode="wait">
                    {/* CHAPTERS TAB */}
                    {activeTab === 'chapters' && (
                        <motion.div
                            key="tab-chapters"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="sidebar-tab-pane"
                        >
                            <div className="story-sidebar-pane-header">
                                <span>Danh sách chương</span>
                                <span className="story-sidebar-count">{chapters.length}</span>
                            </div>
                            <div className="sidebar-pane-list">
                                {chapters.length === 0 ? (
                                    <div className="story-sidebar-empty">
                                        Chưa có chương nào
                                    </div>
                                ) : (
                                    chapters.map((ch, i) => {
                                        const isActive = activeView === 'chapter-detail' && selectedChapterId === ch.id;
                                        const hasContent = ch.content && ch.content.trim().length > 0;
                                        return (
                                            <button
                                                key={ch.id}
                                                className={`story-sidebar-chapter ${isActive ? 'active' : ''}`}
                                                onClick={() => onNavigate('chapter-detail', ch.id)}
                                            >
                                                <span className={`chapter-number ${hasContent ? 'written' : ''}`}>
                                                    {i + 1}
                                                </span>
                                                <span className="chapter-title">{ch.title || `Chương ${i + 1}`}</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            <button
                                className="story-sidebar-add-chapter"
                                onClick={() => {
                                    const newCh = chapterOps.add({
                                        title: `Chương ${chapters.length + 1}`,
                                        content: '',
                                        outline: ''
                                    });
                                    if (newCh) onNavigate('chapter-detail', newCh.id);
                                }}
                                title="Thêm chương mới"
                            >
                                <Plus size={14} />
                                <span>Thêm chương mới</span>
                            </button>
                        </motion.div>
                    )}

                    {/* KNOWLEDGE TAB */}
                    {activeTab === 'knowledge' && (
                        <motion.div
                            key="tab-knowledge"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="sidebar-tab-pane"
                        >
                            <div className="story-sidebar-pane-header">
                                <span>Cơ sở dữ liệu</span>
                            </div>
                            <div className="sidebar-pane-list">
                                {knowledgeItems.map(item => {
                                    const Icon = item.icon;
                                    const isActive = activeView === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            className={`story-sidebar-knowledge-item ${isActive ? 'active' : ''}`}
                                            onClick={() => onNavigate(item.id)}
                                        >
                                            <Icon size={16} style={{ color: item.color }} />
                                            <span>{item.label}</span>
                                            {item.count !== null && (
                                                <span className="story-sidebar-badge">{item.count}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* SYSTEM/SETTINGS TAB */}
                    {activeTab === 'system' && (
                        <motion.div
                            key="tab-system"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="sidebar-tab-pane"
                        >
                            <div className="story-sidebar-pane-header">
                                <span>Hệ thống</span>
                            </div>
                            <div className="sidebar-pane-list">
                                {systemItems.map(item => {
                                    const Icon = item.icon;
                                    const isActive = activeView === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            className={`story-sidebar-knowledge-item ${isActive ? 'active' : ''}`}
                                            onClick={() => onNavigate(item.id)}
                                        >
                                            <Icon size={16} style={{ color: item.color }} />
                                            <span>{item.label}</span>
                                            {item.count !== null && (
                                                <span className="story-sidebar-badge">{item.count}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </aside>
    );
});
