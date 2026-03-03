import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Utils } from '../utils/helpers';
import { setApiSafety } from '../services/apiClient';

const StoryStateContext = createContext();
const StoryDispatchContext = createContext();

export const useStoryState = () => {
    const context = useContext(StoryStateContext);
    if (!context) {
        throw new Error('useStoryState must be used within StoryProvider');
    }
    return context;
};

export const useStoryDispatch = () => {
    const context = useContext(StoryDispatchContext);
    if (!context) {
        throw new Error('useStoryDispatch must be used within StoryProvider');
    }
    return context;
};

// Backward compatibility hook
export const useStory = () => {
    const state = useStoryState();
    const dispatch = useStoryDispatch();
    return { ...state, ...dispatch };
};

export const StoryProvider = ({ children }) => {
    const [stories, setStories] = useState([]);
    const [currentStory, setCurrentStory] = useState(null);
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingItemType, setEditingItemType] = useState(null);

    // Sync safety settings whenever current story changes or NSFW rule is toggled
    useEffect(() => {
        if (currentStory) {
            setApiSafety(currentStory.allowNSFW);
        }
    }, [currentStory?.id, currentStory?.allowNSFW]);

    // Guard: skip saving until initial load completes
    const hasLoadedRef = useRef(false);

    // Load stories from IndexedDB on mount (async)
    useEffect(() => {
        let cancelled = false;
        StorageService.loadStories().then(savedStories => {
            if (!cancelled) {
                setStories(savedStories);
                hasLoadedRef.current = true;
            }
        }).catch(err => {
            console.error('Failed to load stories:', err);
            hasLoadedRef.current = true;
        });
        return () => { cancelled = true; };
    }, []);

    // Save stories whenever they change (async, includes empty array to fix zombie data)
    useEffect(() => {
        if (!hasLoadedRef.current) return; // Don't save before initial load
        StorageService.saveStories(stories).catch(err => {
            console.error('Failed to save stories:', err);
        });
    }, [stories]);

    // Default anti-cliché rules extracted from Dreammini preset
    const DEFAULT_ANTI_CLICHES = [
        'KHÔNG dùng các khuôn sáo rập khuôn web novel (hệ thống toàn năng, vả mặt vô lý, từ hôn)',
        'KHÔNG tạo mâu thuẫn/drama khiên cưỡng, tránh các hiểu lầm vô lý kéo dài',
        'KHÔNG miêu tả cường điệu, lặp đi lặp lại về cảm giác (VD: "linh hồn run rẩy", "toàn thân chấn động")',
        'KHÔNG dùng từ ngữ quá hoa mỹ, sáo rỗng mà bỏ qua logic hành động thực tế',
        'KHÔNG dùng các từ thay thế/ẩn dụ rập khuôn (VD: "ánh mắt sắc như dao", "mỉm cười bí ẩn")',
        'KHÔNG melodrama: cường độ cảm xúc phải TƯƠNG XỨNG với sự kiện. Cảnh hài/nhẹ → phản ứng nhẹ; cảnh bi thật → mới được đau đớn',
        'CẤM sáo ngữ AI tiếng Việt: "ký ức như thủy triều ập đến", "trán lấm tấm mồ hôi lạnh", "đau nhức xé toạc từng thớ thịt", "tim như bị bóp nghẹt", "gào thét trong lòng"',
        'KHÔNG nhồi nhét quá nhiều giác quan vào một đoạn — chọn 1-2 giác quan nổi bật nhất',
        'Khi miêu tả sắc dục: dùng GỢI CẢM chứ KHÔNG thô thiển chỉ thẳng bộ phận. Giữ duyên dáng'
    ];

    // Story Management
    const createStory = (storyData) => {
        const {
            title,
            genres = [], // Changed from genre to genres
            genre, // Fallback
            customGenres = '',
            description = '',
            // World & Setting
            timePeriod = '',
            mainLocations = '',
            worldRules = '',
            cultivationLevels = '',
            powerSystemDetails = '',
            worldHistory = '',
            factionsRaces = '',
            religionCulture = '',
            economyLife = '',
            technologyLevel = '',
            // Characters & Plot
            // Protagonist details
            protagonistName = '',
            protagonistRole = '',
            protagonistStrengths = '',
            protagonistWeaknesses = '',
            protagonistPersonality = '',
            protagonistAppearance = '',
            protagonistBackground = '',
            protagonistGoal = '',
            // Other chars
            antagonist = '',
            supportingCharacters = '',
            characterRelationships = '',
            mainConflict = '',
            subConflicts = '',
            plotTwists = '',
            endingType = '',
            // Style & Structure
            toneAtmosphere = '',
            mainThemes = '',
            writingStyle = '',
            narrationPov = '',
            pacing = '',
            targetAudience = '',
            inspirations = '',
            specialLanguage = '',
            styleReference = '',
            plannedChapters = 0,
            maxOutputTokens = 8192,
            synopsis = '',
            allowNSFW = false,
            type = 'story'
        } = storyData;

        // Construct protagonist description for backward compatibility & summary
        const protagonistDesc = `Tên: ${protagonistName}\nVai trò: ${protagonistRole}\nĐiểm mạnh: ${protagonistStrengths}\nĐiểm yếu: ${protagonistWeaknesses}\nTính cách: ${protagonistPersonality}\nNgoại hình: ${protagonistAppearance}\nQuá khứ: ${protagonistBackground}\nMục tiêu: ${protagonistGoal}`;

        const newStory = {
            id: Utils.generateId(),
            type, // 'story' | 'roleplay'
            title,
            genres: genres.length > 0 ? genres : [genre || 'other'], // Ensure genres array
            genre: genres.length > 0 ? genres[0] : (genre || 'other'), // Keep single genre for compatibility
            description,
            // World
            timePeriod, mainLocations, worldRules, cultivationLevels, powerSystemDetails, worldHistory,
            factionsRaces, religionCulture, economyLife, technologyLevel,
            customGenres,
            // Characters & Plot
            protagonist: protagonistDesc, // Condensed version
            antagonist, supportingCharacters, characterRelationships,
            mainConflict, subConflicts, plotTwists, endingType,
            // Style
            toneAtmosphere, mainThemes, writingStyle, narrationPov,
            pacing, targetAudience, inspirations, specialLanguage, styleReference,
            // Structure
            plannedChapters, maxOutputTokens, synopsis,
            allowNSFW,
            enableFetish: false,
            enableShowDontSmell: false,
            enableSlowBurn: false,
            antiCliches: [...DEFAULT_ANTI_CLICHES],
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            database: {
                characters: [],
                settings: [],
                timeline: [],
                plots: [],
                abilities: [],
                items: [],
                organizations: [],
                quests: [],
                chapters: [],
                scenes: [],
                references: [],
                metaRules: []
            },
            outlines: {
                overall: synopsis || ''
            }
        };

        // Auto-create Main Character if name is provided
        if (protagonistName) {
            const mc = {
                id: Utils.generateId(),
                name: protagonistName,
                role: protagonistRole || 'Nhân vật chính',
                description: protagonistDesc,
                personality: protagonistPersonality,
                appearance: protagonistAppearance,
                background: protagonistBackground,
                isMain: true
            };
            newStory.database.characters.push(mc);
        }

        setStories(prev => [...prev, newStory]);
        setCurrentStory(newStory);
    };

    const deleteStory = (storyId) => {
        setStories(prev => {
            const remaining = prev.filter(s => s.id !== storyId);
            if (currentStory?.id === storyId) {
                setCurrentStory(remaining[0] || null);
            }
            return remaining;
        });
    };

    // Import story from JSON — works with partial data AND external formats
    const importStory = (storyData) => {
        // ---- Field mapping: normalize foreign JSON field names ----
        const d = { ...storyData };

        // Top-level field aliases
        if (!d.title && d.name) d.title = d.name;
        if (!d.title && d.ten) d.title = d.ten;
        if (!d.title && d.tieu_de) d.title = d.tieu_de;
        if (!d.genre && d.the_loai) d.genre = d.the_loai;
        if (!d.description && d.mo_ta) d.description = d.mo_ta;
        if (!d.content && d.noi_dung) d.content = d.noi_dung;
        if (!d.synopsis && d.tom_tat) d.synopsis = d.tom_tat;

        // ---- Database sub-collections: detect & normalize ----
        const db = d.database || {};

        // Chapters
        const rawChapters = db.chapters
            || d.chapters || d.chuong || d.content_chapters || [];
        db.chapters = rawChapters.map((ch, i) => ({
            id: ch.id || Utils.generateId(),
            title: ch.title || ch.name || ch.ten || ch.tieu_de || `Chương ${i + 1}`,
            content: ch.content || ch.body || ch.text || ch.noi_dung || '',
            summary: ch.summary || ch.description || ch.tom_tat || ch.mo_ta || '',
            outline: ch.outline || ch.dan_y || '',
            keywords: Array.isArray(ch.keywords) ? ch.keywords : [],
            order: ch.order ?? ch.so_thu_tu ?? ch.index ?? ch.number ?? (i + 1),
        }));

        // Characters
        const rawChars = db.characters
            || d.characters || d.nhan_vat || d.cast || [];
        db.characters = rawChars.map(c => ({
            id: c.id || Utils.generateId(),
            name: c.name || c.ten || c.full_name || 'Nhân vật',
            role: c.role || c.vai_tro || '',
            description: c.description || c.mo_ta || c.bio || '',
            personality: c.personality || c.tinh_cach || '',
            appearance: c.appearance || c.ngoai_hinh || '',
            age: c.age || c.tuoi || '',
            gender: c.gender || c.gioi_tinh || c.sex || '',
            background: c.background || c.past || c.qua_khu || '',
            motivation: c.motivation || c.dong_luc || '',
            abilities: c.abilities || c.kha_nang || '',
            relationships: c.relationships || c.moi_quan_he || '',
            weakness: c.weakness || c.weaknesses || c.diem_yeu || '',
            notes: c.notes || c.ghi_chu || '',
            // Extended lore (LSR #2)
            bodyFeatures: c.bodyFeatures || '',
            clothingPreference: c.clothingPreference || '',
            hobbies: c.hobbies || '',
            longTermGoal: c.longTermGoal || '',
            importantRelationships: c.importantRelationships || '',
            backgroundSetting: c.backgroundSetting || '',
            attitudeToProtagonist: c.attitudeToProtagonist || '',
            // Dynamic state (LSR #1)
            currentLocation: c.currentLocation || '',
            currentClothing: c.currentClothing || '',
            currentState: c.currentState || '',
            currentGoal: c.currentGoal || '',
            currentPosture: c.currentPosture || '',
            currentBodyState: c.currentBodyState || '',
            specialStatus: c.specialStatus || '',
        }));

        // Settings / Locations
        const rawSettings = db.settings
            || d.settings || d.locations || d.worlds || d.boi_canh || [];
        db.settings = rawSettings.map(s => ({
            id: s.id || Utils.generateId(),
            name: s.name || s.ten || s.title || 'Bối cảnh',
            description: s.description || s.mo_ta || '',
        }));

        // Timeline / Events
        const rawTimeline = db.timeline
            || d.timeline || d.events || d.su_kien || [];
        db.timeline = rawTimeline.map(t => ({
            id: t.id || Utils.generateId(),
            name: t.name || t.ten || t.title || t.event || 'Sự kiện',
            description: t.description || t.mo_ta || '',
        }));

        // Plots
        const rawPlots = db.plots
            || d.plots || d.plot || d.cot_truyen || [];
        db.plots = (Array.isArray(rawPlots) ? rawPlots : [rawPlots]).map(p => ({
            id: p.id || Utils.generateId(),
            name: p.name || p.ten || p.title || 'Cốt truyện',
            description: p.description || p.mo_ta || '',
        }));

        // Scenes
        const rawScenes = db.scenes
            || d.scenes || d.canh || d.phan_canh || [];
        db.scenes = rawScenes.map(s => ({
            id: s.id || Utils.generateId(),
            name: s.name || s.ten || s.title || 'Cảnh',
            description: s.description || s.mo_ta || '',
        }));

        // References
        const rawRefs = db.references
            || d.references || d.tai_lieu || [];
        db.references = rawRefs.map(r => ({
            id: r.id || Utils.generateId(),
            name: r.name || r.ten || r.title || r.fileName || 'Tham khảo',
            content: r.content || r.noi_dung || r.text || '',
        }));

        d.database = db;

        // Remove raw top-level duplicates that were mapped into database
        delete d.chapters; delete d.chuong; delete d.content_chapters;
        delete d.nhan_vat; delete d.cast;
        delete d.locations; delete d.worlds; delete d.boi_canh;
        delete d.events; delete d.su_kien;
        delete d.cot_truyen;
        delete d.canh; delete d.phan_canh;
        delete d.tai_lieu;
        delete d.ten; delete d.tieu_de; delete d.the_loai; delete d.mo_ta; delete d.noi_dung; delete d.tom_tat;

        // ---- Build the final imported object with defaults ----
        const imported = {
            type: 'story', // default, can be overridden by d.type
            title: 'Truyện chưa đặt tên',
            genre: 'other',
            genres: [],
            description: '',
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // World
            timePeriod: '', mainLocations: '', worldRules: '', cultivationLevels: '', powerSystemDetails: '', worldHistory: '',
            factionsRaces: '', religionCulture: '', economyLife: '', technologyLevel: '',
            customGenres: '',
            // Characters & Plot
            protagonist: '', antagonist: '', supportingCharacters: '', characterRelationships: '',
            mainConflict: '', subConflicts: '', plotTwists: '', endingType: '',
            // Style
            toneAtmosphere: '', mainThemes: '', writingStyle: '', narrationPov: '',
            pacing: '', targetAudience: '', inspirations: '', specialLanguage: '', styleReference: '',
            plannedChapters: 0, maxOutputTokens: 8192, synopsis: '',
            allowNSFW: false,
            enableFetish: false,
            enableShowDontSmell: false,
            enableSlowBurn: false,
            // Rules
            prohibitions: '',
            globalDirective: '',
            depthPrompt: null,
            regexScripts: [],
            worldInfoName: '',
            coverImage: null,
            _cardImport: null,
            antiCliches: [...DEFAULT_ANTI_CLICHES],
            // Spread normalized data
            ...d,
            // Always override ID
            id: Utils.generateId(),
            // Ensure database with defaults
            database: {
                characters: [],
                settings: [],
                timeline: [],
                plots: [],
                chapters: [],
                scenes: [],
                references: [],
                metaRules: [],
                abilities: [],
                items: [],
                organizations: [],
                quests: [],
                ...d.database
            },
            outlines: {
                overall: '',
                ...(d.outlines || {})
            }
        };
        // Ensure genres array
        if (!imported.genres || imported.genres.length === 0) {
            imported.genres = [imported.genre || 'other'];
        }

        // Build import summary
        const summary = {
            title: imported.title,
            chapters: imported.database.chapters.length,
            characters: imported.database.characters.length,
            settings: imported.database.settings.length,
            timeline: imported.database.timeline.length,
            plots: imported.database.plots.length,
            scenes: imported.database.scenes.length,
            references: imported.database.references.length,
        };
        imported._importSummary = summary;

        setStories(prev => [...prev, imported]);
        setCurrentStory(imported);
        return imported;
    };

    const switchStory = (storyId) => {
        if (storyId === null) {
            setCurrentStory(null);
            return;
        }
        const story = stories.find(s => s.id === storyId);
        if (story) {
            setCurrentStory(story);
        }
    };

    const updateStoryContent = (content) => {
        if (!currentStory) return;

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? { ...s, content, updatedAt: Date.now() }
                : s
        ));

        setCurrentStory(prev => ({ ...prev, content, updatedAt: Date.now() }));
    };

    const updateOverallOutline = (outline) => {
        if (!currentStory) return;

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? { ...s, outlines: { ...s.outlines, overall: outline }, updatedAt: Date.now() }
                : s
        ));

        setCurrentStory(prev => ({
            ...prev,
            outlines: { ...prev.outlines, overall: outline },
            updatedAt: Date.now()
        }));
    };

    const updateStoryRules = (rulesPatch) => {
        if (!currentStory) return;

        // Build patch from all defined values
        const patch = { updatedAt: Date.now() };
        const fields = [
            'prohibitions', 'globalDirective', 'maxOutputTokens', 'maxInputTokens',
            'autoApplyPrinciples', 'allowNSFW', 'styleTemplate', 'difficulty',
            'antiCliches', 'customStyleInstruction',
            'enableMontage', 'enableFlashback', 'enableSensory',
            'enableDynamicNpc', 'enableMultiPov', 'enableFetish',
            'enableShowDontSmell', 'enableAntiGeminism', 'enableSlowBurn'
        ];
        for (const key of fields) {
            if (rulesPatch[key] !== undefined) patch[key] = rulesPatch[key];
        }

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? { ...s, ...patch }
                : s
        ));

        setCurrentStory(prev => ({
            ...prev,
            ...patch
        }));
    };

    const updateChapterContent = (chapterId, content) => {
        if (!currentStory) return;

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? {
                    ...s,
                    database: {
                        ...s.database,
                        chapters: s.database.chapters.map(c => c.id === chapterId ? { ...c, content } : c)
                    },
                    updatedAt: Date.now()
                }
                : s
        ));

        setCurrentStory(prev => ({
            ...prev,
            database: {
                ...prev.database,
                chapters: prev.database.chapters.map(c => c.id === chapterId ? { ...c, content } : c)
            },
            updatedAt: Date.now()
        }));
    };

    const updateChapterOutline = (chapterId, outline) => {
        if (!currentStory) return;

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? {
                    ...s,
                    database: {
                        ...s.database,
                        chapters: s.database.chapters.map(c => c.id === chapterId ? { ...c, outline } : c)
                    },
                    updatedAt: Date.now()
                }
                : s
        ));

        setCurrentStory(prev => ({
            ...prev,
            database: {
                ...prev.database,
                chapters: prev.database.chapters.map(c => c.id === chapterId ? { ...c, outline } : c)
            },
            updatedAt: Date.now()
        }));
    };

    // Database Management - Characters
    const addCharacter = (data) => {
        if (!currentStory) return;

        const character = {
            id: Utils.generateId(),
            ...data
        };

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? { ...s, database: { ...s.database, characters: [...s.database.characters, character] } }
                : s
        ));

        setCurrentStory(prev => ({
            ...prev,
            database: { ...prev.database, characters: [...prev.database.characters, character] }
        }));
    };

    const updateCharacter = (id, data) => {
        if (!currentStory) return;

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? {
                    ...s,
                    database: {
                        ...s.database,
                        characters: s.database.characters.map(c => c.id === id ? { ...c, ...data } : c)
                    }
                }
                : s
        ));

        setCurrentStory(prev => ({
            ...prev,
            database: {
                ...prev.database,
                characters: prev.database.characters.map(c => c.id === id ? { ...c, ...data } : c)
            }
        }));
    };

    const deleteCharacter = (id) => {
        if (!currentStory) return;

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? { ...s, database: { ...s.database, characters: s.database.characters.filter(c => c.id !== id) } }
                : s
        ));

        setCurrentStory(prev => ({
            ...prev,
            database: { ...prev.database, characters: prev.database.characters.filter(c => c.id !== id) }
        }));
    };

    // Similar functions for settings, timeline, plots, chapters, scenes...
    // I'll create helper function to avoid repetition
    const createDatabaseOperations = (dbKey) => ({
        add: (data) => {
            if (!currentStory) return;

            const item = { id: Utils.generateId(), ...data };

            setStories(prev => prev.map(s =>
                s.id === currentStory.id
                    ? { ...s, database: { ...s.database, [dbKey]: [...(s.database[dbKey] || []), item] } }
                    : s
            ));

            setCurrentStory(prev => ({
                ...prev,
                database: { ...prev.database, [dbKey]: [...(prev.database[dbKey] || []), item] }
            }));

            return item;
        },

        update: (id, data) => {
            if (!currentStory) return;

            setStories(prev => prev.map(s =>
                s.id === currentStory.id
                    ? {
                        ...s,
                        database: {
                            ...s.database,
                            [dbKey]: (s.database[dbKey] || []).map(item => item.id === id ? { ...item, ...data } : item)
                        }
                    }
                    : s
            ));

            setCurrentStory(prev => ({
                ...prev,
                database: {
                    ...prev.database,
                    [dbKey]: (prev.database[dbKey] || []).map(item => item.id === id ? { ...item, ...data } : item)
                }
            }));
        },

        delete: (id) => {
            if (!currentStory) return;

            setStories(prev => prev.map(s =>
                s.id === currentStory.id
                    ? { ...s, database: { ...s.database, [dbKey]: (s.database[dbKey] || []).filter(item => item.id !== id) } }
                    : s
            ));

            setCurrentStory(prev => ({
                ...prev,
                database: { ...prev.database, [dbKey]: (prev.database[dbKey] || []).filter(item => item.id !== id) }
            }));
        }
    });

    // Replace all stories (for Google Drive sync)
    const replaceAllStories = (newStories) => {
        setStories(newStories);
        StorageService.saveStories(newStories);
        if (newStories.length > 0) {
            setCurrentStory(newStories[0]);
        } else {
            setCurrentStory(null);
        }
    };

    // Reload stories from primary storage (Drive if connected, else IndexedDB)
    const reloadFromStorage = async () => {
        try {
            const loaded = await StorageService.loadStories();
            setStories(loaded);
            if (loaded.length > 0) {
                setCurrentStory(loaded[0]);
            } else {
                setCurrentStory(null);
            }
            return loaded;
        } catch (err) {
            console.error('Failed to reload stories:', err);
            return [];
        }
    };

    // #0 Current Info — update story-level current time and location
    const updateCurrentInfo = (currentTime, currentLocation) => {
        if (!currentStory) return;

        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? { ...s, currentTime, currentLocation, updatedAt: Date.now() }
                : s
        ));

        setCurrentStory(prev => ({
            ...prev,
            currentTime,
            currentLocation,
            updatedAt: Date.now()
        }));
    };

    // Generic field updater (for customMacros, etc.)
    const updateStoryField = (fieldName, value) => {
        if (!currentStory) return;
        setStories(prev => prev.map(s =>
            s.id === currentStory.id
                ? { ...s, [fieldName]: value, updatedAt: Date.now() }
                : s
        ));
        setCurrentStory(prev => ({ ...prev, [fieldName]: value, updatedAt: Date.now() }));
    };

    const stateValue = {
        stories,
        currentStory,
        editingItemId,
        editingItemType,
    };

    const dispatchValue = {
        setEditingItemId,
        setEditingItemType,
        createStory,
        deleteStory,
        importStory,
        switchStory,
        updateStoryContent,
        updateOverallOutline,
        updateStoryRules,
        updateChapterContent,
        updateChapterOutline,
        replaceAllStories,
        reloadFromStorage,
        updateCurrentInfo,
        updateStoryField,
        // Character operations
        addCharacter,
        updateCharacter,
        deleteCharacter,
        // Other database operations
        settingOps: createDatabaseOperations('settings'),
        timelineOps: createDatabaseOperations('timeline'),
        plotOps: createDatabaseOperations('plots'),
        abilityOps: createDatabaseOperations('abilities'),
        itemOps: createDatabaseOperations('items'),
        organizationOps: createDatabaseOperations('organizations'),
        questOps: createDatabaseOperations('quests'),
        chapterOps: createDatabaseOperations('chapters'),
        sceneOps: createDatabaseOperations('scenes'),
        referenceOps: createDatabaseOperations('references'),
        metaRuleOps: createDatabaseOperations('metaRules'),
        foreshadowingOps: createDatabaseOperations('foreshadowings'),
        plotProgressOps: createDatabaseOperations('plotProgress'),
        branchOps: createDatabaseOperations('branches')
    };

    return (
        <StoryStateContext.Provider value={stateValue}>
            <StoryDispatchContext.Provider value={dispatchValue}>
                {children}
            </StoryDispatchContext.Provider>
        </StoryStateContext.Provider>
    );
};
