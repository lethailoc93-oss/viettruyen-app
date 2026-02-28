import React, { useState, useEffect } from 'react';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import { Utils } from '../../utils/helpers';
import {
    PenTool, Layout, Book, Clapperboard, Users, Map,
    Clock, FileText, CheckCircle, ChevronDown, ChevronRight,
    BookOpen, Calendar, Tag, Sparkles, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/storyHome.css';

export default React.memo(function StoryHome({ onNavigate }) {
    const { currentStory } = useStoryState();
    const { updateCurrentInfo, switchStory } = useStoryDispatch();
    const [expandedSections, setExpandedSections] = useState({ outline: true, database: false });

    const [currentTime, setCurrentTime] = useState('');
    const [currentLocation, setCurrentLocation] = useState('');
    const [isSavingInfo, setIsSavingInfo] = useState(false);

    useEffect(() => {
        setCurrentTime(currentStory?.currentTime || '');
        setCurrentLocation(currentStory?.currentLocation || '');
    }, [currentStory?.id, currentStory?.currentTime, currentStory?.currentLocation]);

    const handleSaveCurrentInfo = () => {
        setIsSavingInfo(true);
        updateCurrentInfo(currentTime, currentLocation);
        setTimeout(() => setIsSavingInfo(false), 500);
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    if (!currentStory) {
        return (
            <div className="story-home">
                <div className="story-home-empty">
                    <BookOpen size={64} className="text-muted" />
                    <h2>Chào mừng đến AI Story Writer</h2>
                    <p>Tạo truyện mới hoặc chọn truyện từ danh sách bên trái để bắt đầu.</p>
                </div>
            </div>
        );
    }

    const tocItems = [
        {
            id: 'toc',
            icon: Book,
            label: 'Mục lục chương',
            description: 'Xem danh sách chương và viết nội dung',
            color: 'hsl(280, 85%, 60%)'
        },
        {
            id: 'outlines',
            icon: Layout,
            label: 'Dàn ý',
            description: 'Dàn ý tổng + dàn ý từng chương',
            color: 'hsl(200, 90%, 55%)'
        },
        {
            id: 'scene-outline',
            icon: Clapperboard,
            label: 'Dàn ý phân cảnh',
            description: 'Chi tiết từng cảnh',
            color: 'hsl(30, 90%, 55%)'
        },
        {
            id: 'database',
            icon: FileText,
            label: 'Cơ sở dữ liệu',
            description: 'Quản lý nhân vật, bối cảnh và chi tiết',
            color: 'hsl(140, 70%, 55%)',
            expandable: true,
            children: [
                { id: 'characters', icon: Users, label: 'Nhân vật', description: 'Quản lý nhân vật' },
                { id: 'settings', icon: Map, label: 'Bối cảnh', description: 'Thiết lập bối cảnh' },
                { id: 'timeline', icon: Clock, label: 'Thời gian', description: 'Dòng thời gian' },
                { id: 'plots', icon: FileText, label: 'Chi tiết', description: 'Chi tiết cốt truyện' }
            ]
        },
        {
            id: 'checker',
            icon: CheckCircle,
            label: 'Kiểm tra nhất quán',
            description: 'Phát hiện mâu thuẫn trong truyện',
            color: 'hsl(40, 95%, 60%)'
        }
    ];

    return (
        <div className="story-home">
            <style>{`
                @media (min-width: 769px) {
                    .mobile-back-btn { display: none !important; }
                }
            `}</style>
            {/* Story Info Header */}
            <motion.div
                className="story-home-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ display: 'flex', alignItems: 'center' }}
            >
                <button
                    className="btn btn-secondary btn-icon mobile-back-btn"
                    onClick={() => switchStory(null)}
                    style={{ marginRight: 'var(--space-md)', padding: '6px' }}
                    title="Trở lại danh sách truyện"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="story-home-icon">
                    <Sparkles size={32} />
                </div>
                <div className="story-home-info">
                    <h1 className="story-home-title">{currentStory.title}</h1>
                    <div className="story-home-meta">
                        <span className="story-home-meta-item">
                            <Tag size={14} />
                            {currentStory.genre}
                        </span>
                        <span className="story-home-meta-item">
                            <Calendar size={14} />
                            {Utils.formatDate(currentStory.updatedAt)}
                        </span>
                        <span className="story-home-meta-item">
                            <PenTool size={14} />
                            {Utils.countWords(
                                (currentStory.database?.chapters || []).map(c => c.content || '').join(' ') || currentStory.content || ''
                            )} từ
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Quick Stats Dashboard */}
            <div className="story-stats-grid">
                {[
                    { label: 'Chương', count: currentStory.database?.chapters?.length || 0, icon: Book, tab: 'toc', color: 'hsl(280, 85%, 60%)' },
                    { label: 'Nhân vật', count: currentStory.database?.characters?.length || 0, icon: Users, tab: 'characters', color: 'hsl(200, 90%, 55%)' },
                    { label: 'Bối cảnh', count: currentStory.database?.settings?.length || 0, icon: Map, tab: 'settings', color: 'hsl(140, 70%, 55%)' },
                    { label: 'Phân cảnh', count: currentStory.database?.scenes?.length || 0, icon: Clapperboard, tab: 'scene-outline', color: 'hsl(30, 90%, 55%)' },
                    { label: 'Sự kiện', count: currentStory.database?.timeline?.length || 0, icon: Clock, tab: 'timeline', color: 'hsl(340, 80%, 55%)' },
                    { label: 'Cốt truyện', count: currentStory.database?.plots?.length || 0, icon: FileText, tab: 'plots', color: 'hsl(60, 70%, 50%)' }
                ].map(stat => {
                    const StatIcon = stat.icon;
                    return (
                        <div
                            key={stat.tab}
                            role="button"
                            tabIndex={0}
                            className="story-stat-card"
                            onClick={() => onNavigate(stat.tab)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(stat.tab) }}
                            style={{ borderBottom: `3px solid ${stat.color}` }}
                        >
                            <StatIcon size={18} style={{ color: stat.color, marginBottom: '4px' }} />
                            <div className="story-stat-number" style={{ color: stat.color }}>{stat.count}</div>
                            <div className="story-stat-label">{stat.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* #0 Current Info */}
            <div className="story-info-section">
                <div className="story-info-header">
                    <Map size={20} className="text-primary" />
                    <h3>#0 Thông tin Hiện tại</h3>
                    <span className="story-info-subtitle">(Tự động cập nhật sau mỗi chương)</span>
                </div>
                <div className="story-info-grid">
                    <div>
                        <label className="story-info-label">
                            <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />Thời gian hiện tại
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            value={currentTime}
                            onChange={(e) => setCurrentTime(e.target.value)}
                            placeholder="VD: Buổi tối, mùa đông năm 2..."
                            onBlur={handleSaveCurrentInfo}
                        />
                    </div>
                    <div>
                        <label className="story-info-label">
                            <Map size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />Địa điểm hiện tại
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            value={currentLocation}
                            onChange={(e) => setCurrentLocation(e.target.value)}
                            placeholder="VD: Quán trọ Mùa Thu, thành phố A..."
                            onBlur={handleSaveCurrentInfo}
                        />
                    </div>
                </div>
                {isSavingInfo && <div className="story-info-success">✓ Đã lưu thay đổi</div>}
            </div>

            {/* Writing Progress */}
            {(currentStory.database?.chapters?.length || 0) > 0 && (() => {
                const chapters = currentStory.database.chapters;
                const writtenCount = chapters.filter(c => c.content && c.content.trim().length > 0).length;
                const pct = Math.round((writtenCount / chapters.length) * 100);
                return (
                    <div className="story-progress-section">
                        <div className="story-progress-header">
                            <span className="story-progress-title">📝 Tiến độ viết</span>
                            <span className="story-progress-text">{writtenCount}/{chapters.length} chương ({pct}%)</span>
                        </div>
                        <div className="story-progress-bar-bg">
                            <div className="story-progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            })()}

            {/* Table of Contents */}
            <div className="story-toc">
                <h2 className="story-toc-title">Mục lục</h2>
                <div className="story-toc-list">
                    {tocItems.map((item, index) => {
                        const Icon = item.icon;
                        const isExpanded = expandedSections[item.id];

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.08 }}
                            >
                                <div
                                    className="toc-item"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                        if (item.expandable) {
                                            toggleSection(item.id);
                                        } else {
                                            onNavigate(item.id);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (item.expandable) toggleSection(item.id);
                                            else onNavigate(item.id);
                                        }
                                    }}
                                    style={{ '--item-color': item.color || 'var(--color-primary)' }}
                                >
                                    <div className="toc-item-icon" style={{ background: `${item.color}20`, color: item.color }}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="toc-item-content">
                                        <div className="toc-item-label">{item.label}</div>
                                        <div className="toc-item-desc">{item.description}</div>
                                    </div>
                                    {item.expandable && (
                                        <div className="toc-item-arrow">
                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </div>
                                    )}
                                </div>

                                {/* Sub-items */}
                                <AnimatePresence>
                                    {item.expandable && isExpanded && (
                                        <motion.div
                                            className="toc-subitems"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            {item.children.map((child, ci) => {
                                                const ChildIcon = child.icon;
                                                return (
                                                    <div
                                                        key={child.id}
                                                        className="toc-subitem"
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => onNavigate(child.id)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                onNavigate(child.id);
                                                            }
                                                        }}
                                                    >
                                                        <ChildIcon size={16} className="text-muted" />
                                                        <div className="toc-subitem-content">
                                                            <span className="toc-subitem-label">{child.label}</span>
                                                            <span className="toc-subitem-desc">{child.description}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
