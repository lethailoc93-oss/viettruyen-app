import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useParams, useLocation } from 'react-router-dom';
import { StoryProvider, useStoryState, useStoryDispatch } from './context/StoryContext';
import { ApiKeyProvider } from './context/ApiKeyContext';
import { DirectiveProvider } from './context/DirectiveContext';
import LandingPage from './components/pages/LandingPage';
import StorySidebar from './components/layout/StorySidebar';
import StoryHome from './components/story/StoryHome';
import OutlinePage from './components/outlines/OutlinePage';
import TableOfContents from './components/outlines/TableOfContents';
import ChapterDetail from './components/outlines/ChapterDetail';
import SceneOutline from './components/outlines/SceneOutline';
import AutoWorkflowPanel from './components/outlines/AutoWorkflowPanel';
import ResearchPanel from './components/outlines/ResearchPanel';
import CharacterTab from './components/database/CharacterTab';
import SettingTab from './components/database/SettingTab';
import TimelineTab from './components/database/TimelineTab';
import PlotTab from './components/database/PlotTab';
import AbilityTab from './components/database/AbilityTab';
import ItemTab from './components/database/ItemTab';
import OrganizationTab from './components/database/OrganizationTab';
import QuestTab from './components/database/QuestTab';
import ReferencePanel from './components/database/ReferencePanel';
import MetaRulesTab from './components/database/MetaRulesTab';
import WorldbookTab from './components/database/WorldbookTab';
import ConsistencyChecker from './components/consistency/ConsistencyChecker';
import StoryRules from './components/outlines/StoryRules';
import ToastContainer from './components/modals/Toast';
import ErrorBoundary from './components/layout/ErrorBoundary';
import RoleplayPage from './components/roleplay/RoleplayPage';
import RoleplayHome from './components/roleplay/RoleplayHome';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Maximize, Minimize } from 'lucide-react';
import './styles/zenMode.css';

function ChapterDetailWrapper({ onNavigate }) {
    const { chapterId } = useParams();
    const navigate = useNavigate();
    return (
        <ChapterDetail
            chapterId={chapterId}
            onBack={() => navigate('/toc')}
            onNavigate={onNavigate}
        />
    );
}

function EditorLayout() {
    const { currentStory } = useStoryState();
    const { switchStory } = useStoryDispatch();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    const handleOpenStory = (storyId) => {
        switchStory(storyId);
        navigate('/');
    };

    if (!currentStory) {
        return (
            <Routes>
                <Route path="/roleplay" element={<RoleplayPage />} />
                <Route path="*" element={<LandingPage onOpenStory={handleOpenStory} />} />
            </Routes>
        );
    }

    // Roleplay mode — fullscreen, no sidebar
    if (location.pathname === '/roleplay') {
        return <RoleplayPage />;
    }

    const handleNavigate = (viewId, extraId) => {
        if (viewId === 'chapter-detail' && extraId) {
            navigate(`/chapter/${extraId}`);
        } else if (viewId === 'home') {
            navigate('/');
        } else {
            navigate(`/${viewId}`);
        }
        closeSidebar();
    };

    const handleGoHome = () => {
        switchStory(null);
        navigate('/');
    };

    const handleNavigateChapter = (chapterId) => {
        navigate(`/chapter/${chapterId}`);
        closeSidebar();
    };

    let activeView = 'home';
    let selectedChapterId = null;
    if (location.pathname === '/') {
        activeView = 'home';
    } else if (location.pathname.startsWith('/chapter/')) {
        activeView = 'chapter-detail';
        selectedChapterId = location.pathname.split('/')[2];
    } else {
        activeView = location.pathname.substring(1);
    }

    return (
        <div className={`app-container editor-mode ${isZenMode ? 'zen-mode' : ''}`}>
            <button
                className="mobile-sidebar-toggle"
                onClick={() => setSidebarOpen(prev => !prev)}
                aria-label="Toggle sidebar"
            >
                <Menu size={22} />
            </button>

            {sidebarOpen && (
                <div className="mobile-sidebar-backdrop" onClick={closeSidebar} />
            )}

            <StorySidebar
                activeView={activeView}
                onNavigate={handleNavigate}
                onGoHome={() => { handleGoHome(); closeSidebar(); }}
                selectedChapterId={selectedChapterId}
                className={sidebarOpen ? 'mobile-open' : ''}
            />

            <main className="editor-content">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}
                    >
                        <Routes location={location}>
                            {currentStory?.type === 'roleplay' ? (
                                /* Roleplay story routes */
                                <>
                                    <Route path="/" element={<RoleplayHome onNavigate={handleNavigate} />} />
                                    <Route path="/characters" element={<CharacterTab onNavigate={handleNavigate} />} />
                                    <Route path="/settings" element={<SettingTab onNavigate={handleNavigate} />} />
                                    <Route path="/meta-rules" element={<MetaRulesTab />} />
                                    <Route path="/worldbook" element={<WorldbookTab onNavigate={handleNavigate} />} />
                                    <Route path="/references" element={<ReferencePanel onNavigate={handleNavigate} />} />
                                    <Route path="/story-rules" element={<StoryRules />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </>
                            ) : (
                                /* Normal story routes */
                                <>
                                    <Route path="/" element={<StoryHome onNavigate={handleNavigate} />} />
                                    <Route path="/outlines" element={<OutlinePage onNavigate={handleNavigate} />} />
                                    <Route path="/toc" element={<TableOfContents onSelectChapter={handleNavigateChapter} onNavigate={handleNavigate} />} />
                                    <Route path="/chapter/:chapterId" element={<ChapterDetailWrapper onNavigate={handleNavigate} />} />
                                    <Route path="/scene-outline" element={<SceneOutline onNavigate={handleNavigate} />} />
                                    <Route path="/characters" element={<CharacterTab onNavigate={handleNavigate} />} />
                                    <Route path="/settings" element={<SettingTab onNavigate={handleNavigate} />} />
                                    <Route path="/abilities" element={<AbilityTab />} />
                                    <Route path="/items" element={<ItemTab />} />
                                    <Route path="/organizations" element={<OrganizationTab />} />
                                    <Route path="/quests" element={<QuestTab />} />
                                    <Route path="/timeline" element={<TimelineTab onNavigate={handleNavigate} />} />
                                    <Route path="/plots" element={<PlotTab onNavigate={handleNavigate} />} />
                                    <Route path="/references" element={<ReferencePanel onNavigate={handleNavigate} />} />
                                    <Route path="/meta-rules" element={<MetaRulesTab />} />
                                    <Route path="/worldbook" element={<WorldbookTab onNavigate={handleNavigate} />} />
                                    <Route path="/checker" element={<ConsistencyChecker onNavigate={handleNavigate} />} />
                                    <Route path="/story-rules" element={<StoryRules />} />
                                    <Route path="/auto" element={<AutoWorkflowPanel />} />
                                    <Route path="/research" element={<ResearchPanel />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </>
                            )}
                        </Routes>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Zen Mode Toggle */}
            <button
                className="zen-mode-toggle"
                onClick={() => setIsZenMode(prev => !prev)}
                title={isZenMode ? "Tắt chế độ tập trung" : "Bật chế độ tập trung"}
            >
                {isZenMode ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <ApiKeyProvider>
                <DirectiveProvider>
                    <StoryProvider>
                        <Router>
                            <EditorLayout />
                        </Router>
                        <ToastContainer />
                    </StoryProvider>
                </DirectiveProvider>
            </ApiKeyProvider>
        </ErrorBoundary>
    );
}

export default App;
