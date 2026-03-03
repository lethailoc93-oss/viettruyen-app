// ================================================
// RoleplayHome — SillyTavern-inspired Management UI
// ================================================
// Giao diện quản lý Roleplay riêng với các panel:
// Character Info, Lorebook/Knowledge, Rules, System Prompt,
// First Message, Scenario, Post-History Instructions
//
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoryState, useStoryDispatch } from '../../context/StoryContext';
import {
    Play, User, BookOpen, ShieldAlert, MessageSquare,
    Map, Settings, ChevronDown, ChevronUp, Users,
    Database, Sparkles, FileText, ArrowLeft, Gamepad2, Puzzle,
    Plus, Edit3, Trash2, Save, X
} from 'lucide-react';
import ExtensionsTab from './ExtensionsTab';
import '../../styles/roleplayHome.css';

const TABS = [
    { id: 'character', label: 'Nhân vật', icon: User },
    { id: 'knowledge', label: 'Kiến thức', icon: Database },
    { id: 'rules', label: 'Quy tắc', icon: ShieldAlert },
    { id: 'prompt', label: 'System Prompt', icon: Settings },
    { id: 'greeting', label: 'Lời chào', icon: MessageSquare },
    { id: 'scenario', label: 'Kịch bản', icon: Map },
    { id: 'extensions', label: 'Tiện ích', icon: Puzzle },
];

// === Section accordion helper ===
function Section({ title, icon: Icon, count, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rp-section">
            <div className="rp-section-header" onClick={() => setOpen(o => !o)}>
                <span className="rp-section-icon"><Icon size={16} /></span>
                <h3>{title}</h3>
                {count != null && <span className="rp-section-count">{count}</span>}
                <span className={`rp-section-toggle ${open ? 'open' : ''}`}>
                    <ChevronDown size={16} />
                </span>
            </div>
            {open && <div className="rp-section-body">{children}</div>}
        </div>
    );
}

// === Entry display for lorebook items ===
function EntryItem({ entry, icon: Icon }) {
    return (
        <div className="rp-entry-item">
            <div className="rp-entry-icon"><Icon size={14} /></div>
            <div className="rp-entry-content">
                <div className="rp-entry-title">{entry.name}</div>
                {entry.description && (
                    <div className="rp-entry-desc">{entry.description}</div>
                )}
                {entry.keywords && (
                    <div className="rp-entry-keywords">
                        {entry.keywords.split(',').map((k, i) => (
                            <span key={i} className="rp-entry-keyword">{k.trim()}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RoleplayHome({ onNavigate }) {
    const navigate = useNavigate();
    const { currentStory } = useStoryState();
    const { updateStoryField } = useStoryDispatch();
    const [activeTab, setActiveTab] = useState('character');

    // Quick references
    const db = currentStory?.database || {};
    const characters = db.characters || [];
    const settings = db.settings || [];
    const metaRules = db.metaRules || [];
    const references = db.references || [];
    const mainChar = characters[0] || null;

    // Editable field updater
    const handleFieldChange = useCallback((field, value) => {
        updateStoryField(field, value);
    }, [updateStoryField]);

    if (!currentStory) return null;

    // === TAB: CHARACTER ===
    const renderCharacterTab = () => (
        <div className="rp-panel">
            {/* Main character header */}
            <div className="rp-char-header">
                {(mainChar?.avatar || mainChar?.image || currentStory.coverImage) ? (
                    <div className="rp-char-avatar">
                        <img src={mainChar?.avatar || mainChar?.image || currentStory.coverImage} alt={mainChar?.name} />
                    </div>
                ) : (
                    <div className="rp-char-avatar">
                        <div className="rp-char-avatar-placeholder">
                            <User size={40} />
                        </div>
                    </div>
                )}
                <div className="rp-char-info">
                    <h2 className="rp-char-name">{mainChar?.name || currentStory.title}</h2>
                    <div className="rp-char-tags">
                        {(currentStory.genres || []).map((g, i) => (
                            <span key={i} className="rp-char-tag">{g}</span>
                        ))}
                        {currentStory._cardImport && (
                            <span className="rp-char-tag">Card {currentStory._cardImport.cardSpec}</span>
                        )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {currentStory.synopsis || currentStory.description || 'Chưa có mô tả'}
                    </p>
                </div>
            </div>

            {/* Description */}
            <Section title="Mô tả nhân vật" icon={FileText}>
                <textarea
                    className="rp-textarea large"
                    value={mainChar?.description || ''}
                    onChange={e => {
                        // We'd need to update character via updateCharacter, but for simplicity let's use direct DB ops
                        // This triggers a re-render
                        if (mainChar && mainChar.id) {
                            const updated = { ...mainChar, description: e.target.value };
                            const newChars = characters.map(c => c.id === mainChar.id ? updated : c);
                            updateStoryField('database', { ...db, characters: newChars });
                        }
                    }}
                    placeholder="Mô tả chi tiết nhân vật..."
                />
            </Section>

            {/* Personality */}
            <Section title="Tính cách" icon={Sparkles}>
                <textarea
                    className="rp-textarea"
                    value={mainChar?.personality || currentStory.personality || ''}
                    onChange={e => {
                        const val = e.target.value;
                        // Lưu vào cả mainChar VÀ story.personality
                        handleFieldChange('personality', val);
                        if (mainChar && mainChar.id) {
                            const updated = { ...mainChar, personality: val };
                            const newChars = characters.map(c => c.id === mainChar.id ? updated : c);
                            updateStoryField('database', { ...db, characters: newChars });
                        }
                    }}
                    placeholder="Mô tả tính cách nhân vật..."
                />
            </Section>

            {/* Other characters */}
            {characters.length > 1 && (
                <Section title="Nhân vật khác" icon={Users} count={characters.length - 1} defaultOpen={false}>
                    <div className="rp-entry-list">
                        {characters.slice(1).map(char => (
                            <EntryItem key={char.id} entry={char} icon={User} />
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );

    // === TAB: KNOWLEDGE (Lorebook) ===
    const renderKnowledgeTab = () => (
        <div className="rp-panel">
            <Section title="Bối cảnh / Thế giới" icon={Map} count={settings.length}>
                {settings.length === 0 ? (
                    <div className="rp-empty">
                        <Map size={32} />
                        <p>Chưa có bối cảnh nào</p>
                    </div>
                ) : (
                    <div className="rp-entry-list">
                        {settings.map(s => (
                            <EntryItem key={s.id} entry={s} icon={Map} />
                        ))}
                    </div>
                )}
            </Section>

            <Section title="Tham khảo" icon={BookOpen} count={references.length} defaultOpen={false}>
                {references.length === 0 ? (
                    <div className="rp-empty">
                        <BookOpen size={32} />
                        <p>Chưa có tài liệu tham khảo</p>
                    </div>
                ) : (
                    <div className="rp-entry-list">
                        {references.map(r => (
                            <EntryItem key={r.id} entry={{ ...r, description: r.content }} icon={FileText} />
                        ))}
                    </div>
                )}
            </Section>
        </div>
    );

    // === TAB: RULES ===
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [draftRule, setDraftRule] = useState({});
    const [showAddRule, setShowAddRule] = useState(false);

    const emptyRule = {
        name: '', narrativeStyle: '', logicLimits: '', dynamicUpdates: '',
        description: '', keywords: '', notes: '',
        insertionOrder: '', priority: '5', alwaysActive: true
    };

    const handleSaveRule = () => {
        if (!draftRule.name?.trim()) return;
        const newRule = { ...draftRule, id: draftRule.id || Date.now().toString() };

        let newRules;
        if (editingRuleId) {
            newRules = metaRules.map(r => r.id === editingRuleId ? newRule : r);
        } else {
            newRules = [...metaRules, newRule];
        }
        updateStoryField('database', { ...db, metaRules: newRules });
        setEditingRuleId(null);
        setShowAddRule(false);
    };

    const handleDeleteRule = (id) => {
        if (!confirm('Xóa quy tắc này?')) return;
        const newRules = metaRules.filter(r => r.id !== id);
        updateStoryField('database', { ...db, metaRules: newRules });
    };

    const handleToggleRule = (id) => {
        const newRules = metaRules.map(r =>
            r.id === id ? { ...r, alwaysActive: !r.alwaysActive } : r
        );
        updateStoryField('database', { ...db, metaRules: newRules });
    };

    const renderRulesTab = () => (
        <div className="rp-panel">
            <Section title="Quy tắc / Hệ thống Game" icon={ShieldAlert} count={metaRules.length}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
                    <button
                        className="btn btn-primary btn-small"
                        onClick={() => {
                            setDraftRule({ ...emptyRule });
                            setShowAddRule(true);
                            setEditingRuleId(null);
                        }}
                    >
                        <Plus size={14} /> Thêm quy tắc
                    </button>
                </div>

                {showAddRule && !editingRuleId && (
                    <div className="ext-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>✨ Thêm quy tắc mới</div>
                        <input className="rp-input" placeholder="Tên quy tắc (bắt buộc)" value={draftRule.name} onChange={e => setDraftRule({ ...draftRule, name: e.target.value })} />
                        <textarea className="rp-textarea" placeholder="Nội dung quy tắc / Phong cách kể chuyện..." value={draftRule.narrativeStyle} onChange={e => setDraftRule({ ...draftRule, narrativeStyle: e.target.value })} rows={3} />
                        <textarea className="rp-textarea" placeholder="Giới hạn logic (tùy chọn)..." value={draftRule.logicLimits} onChange={e => setDraftRule({ ...draftRule, logicLimits: e.target.value })} rows={2} />
                        <textarea className="rp-textarea" placeholder="Cập nhật động (tùy chọn)..." value={draftRule.dynamicUpdates} onChange={e => setDraftRule({ ...draftRule, dynamicUpdates: e.target.value })} rows={2} />
                        <textarea className="rp-textarea" placeholder="Mô tả chi tiết / Nội dung gốc..." value={draftRule.description} onChange={e => setDraftRule({ ...draftRule, description: e.target.value })} rows={3} />
                        <textarea className="rp-textarea" placeholder="Ghi chú thêm (tùy chọn)..." value={draftRule.notes} onChange={e => setDraftRule({ ...draftRule, notes: e.target.value })} rows={2} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="btn btn-secondary btn-small" onClick={() => setShowAddRule(false)}><X size={14} /> Hủy</button>
                            <button className="btn btn-primary btn-small" onClick={handleSaveRule} disabled={!draftRule.name?.trim()}><Save size={14} /> Lưu</button>
                        </div>
                    </div>
                )}

                {metaRules.length === 0 && !showAddRule ? (
                    <div className="rp-empty">
                        <ShieldAlert size={32} />
                        <p>Chưa có quy tắc nào</p>
                    </div>
                ) : (
                    <div className="ext-list">
                        {metaRules.map(rule => (
                            editingRuleId === rule.id ? (
                                <div key={rule.id} className="ext-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, marginBottom: 16 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>✏ Sửa quy tắc</div>
                                    <input className="rp-input" placeholder="Tên quy tắc (bắt buộc)" value={draftRule.name} onChange={e => setDraftRule({ ...draftRule, name: e.target.value })} />
                                    <textarea className="rp-textarea" placeholder="Nội dung quy tắc / Phong cách kể chuyện..." value={draftRule.narrativeStyle} onChange={e => setDraftRule({ ...draftRule, narrativeStyle: e.target.value })} rows={3} />
                                    <textarea className="rp-textarea" placeholder="Giới hạn logic..." value={draftRule.logicLimits} onChange={e => setDraftRule({ ...draftRule, logicLimits: e.target.value })} rows={2} />
                                    <textarea className="rp-textarea" placeholder="Cập nhật động..." value={draftRule.dynamicUpdates} onChange={e => setDraftRule({ ...draftRule, dynamicUpdates: e.target.value })} rows={2} />
                                    <textarea className="rp-textarea" placeholder="Mô tả chi tiết / Nội dung gốc..." value={draftRule.description} onChange={e => setDraftRule({ ...draftRule, description: e.target.value })} rows={3} />
                                    <textarea className="rp-textarea" placeholder="Ghi chú thêm..." value={draftRule.notes} onChange={e => setDraftRule({ ...draftRule, notes: e.target.value })} rows={2} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                        <button className="btn btn-secondary btn-small" onClick={() => setEditingRuleId(null)}><X size={14} /> Hủy</button>
                                        <button className="btn btn-primary btn-small" onClick={handleSaveRule} disabled={!draftRule.name?.trim()}><Save size={14} /> Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <div key={rule.id} className={`ext-card ${!rule.alwaysActive ? 'disabled' : ''}`}>
                                    <div className="ext-card-icon">
                                        <ShieldAlert size={20} style={{ color: rule.alwaysActive ? 'hsl(270, 70%, 65%)' : 'var(--color-text-tertiary)' }} />
                                    </div>
                                    <div className="ext-card-info" style={{ flex: 1 }}>
                                        <div className="ext-card-name" style={{ marginBottom: 4 }}>
                                            {rule.name}
                                            {rule.alwaysActive && <span className="ext-card-badge type-builtin" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>Always Active</span>}
                                        </div>
                                        {rule.narrativeStyle && (
                                            <div className="ext-card-desc" style={{ marginBottom: 4 }}>
                                                <strong style={{ opacity: 0.7 }}>Nội dung:</strong> {rule.narrativeStyle}
                                            </div>
                                        )}
                                        {rule.logicLimits && (
                                            <div className="ext-card-desc" style={{ marginBottom: 4, color: 'hsl(0, 60%, 65%)' }}>
                                                <strong style={{ opacity: 0.7 }}>Giới hạn:</strong> {rule.logicLimits}
                                            </div>
                                        )}
                                        {rule.dynamicUpdates && (
                                            <div className="ext-card-desc" style={{ marginBottom: 4 }}>
                                                <strong style={{ opacity: 0.7 }}>Cập nhật:</strong> {rule.dynamicUpdates}
                                            </div>
                                        )}
                                        {rule.description && (
                                            <div className="ext-card-desc" style={{ marginBottom: 4 }}>
                                                <strong style={{ opacity: 0.7 }}>Mô tả:</strong> {rule.description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ext-card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <label className="ext-toggle" title={rule.alwaysActive ? "Tắt quy tắc" : "Bật quy tắc"}>
                                            <input
                                                type="checkbox"
                                                checked={!!rule.alwaysActive}
                                                onChange={() => handleToggleRule(rule.id)}
                                            />
                                            <span className="ext-toggle-slider" />
                                        </label>
                                        <button
                                            className="btn-icon"
                                            onClick={() => { setEditingRuleId(rule.id); setDraftRule(rule); setShowAddRule(false); }}
                                            title="Sửa quy tắc"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            className="ext-card-delete btn-icon"
                                            onClick={() => handleDeleteRule(rule.id)}
                                            style={{ color: 'var(--color-error)' }}
                                            title="Xóa quy tắc"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </Section>
        </div>
    );

    // === TAB: SYSTEM PROMPT ===
    const renderPromptTab = () => (
        <div className="rp-panel">
            <Section title="System Prompt" icon={Settings}>
                <textarea
                    className="rp-textarea large"
                    value={currentStory.prohibitions || ''}
                    onChange={e => handleFieldChange('prohibitions', e.target.value)}
                    placeholder="System Prompt — hướng dẫn cho AI cách nhập vai..."
                />
            </Section>

            <Section title="Post-History Instructions" icon={FileText}>
                <textarea
                    className="rp-textarea"
                    value={currentStory.globalDirective || ''}
                    onChange={e => handleFieldChange('globalDirective', e.target.value)}
                    placeholder="Hướng dẫn bổ sung sau lịch sử chat (post_history_instructions)..."
                />
            </Section>

            {currentStory.depthPrompt?.prompt && (
                <Section title="Depth Prompt" icon={Sparkles} defaultOpen={false}>
                    <textarea
                        className="rp-textarea small"
                        value={currentStory.depthPrompt.prompt || ''}
                        onChange={e => handleFieldChange('depthPrompt', {
                            ...currentStory.depthPrompt,
                            prompt: e.target.value
                        })}
                        placeholder="Depth prompt..."
                    />
                    <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                        Depth: {currentStory.depthPrompt.depth || 4} | Role: {currentStory.depthPrompt.role || 'system'}
                    </p>
                </Section>
            )}
        </div>
    );

    // === TAB: GREETING / FIRST MESSAGE ===
    const renderGreetingTab = () => {
        const firstMes = db.chapters?.[0]?.content || currentStory.content || '';
        return (
            <div className="rp-panel">
                <Section title="Lời chào đầu tiên (First Message)" icon={MessageSquare}>
                    <textarea
                        className="rp-textarea large"
                        value={firstMes}
                        onChange={e => {
                            if (db.chapters?.length > 0) {
                                const newChaps = [...db.chapters];
                                newChaps[0] = { ...newChaps[0], content: e.target.value };
                                updateStoryField('database', { ...db, chapters: newChaps });
                            } else {
                                handleFieldChange('content', e.target.value);
                            }
                        }}
                        placeholder="Tin nhắn đầu tiên khi bắt đầu roleplay (first_mes)..."
                    />
                </Section>
            </div>
        );
    };

    // === TAB: SCENARIO ===
    const altGreetings = currentStory.alternateGreetings || [];
    const renderScenarioTab = () => (
        <div className="rp-panel">
            <Section title="Kịch bản / Scenario" icon={Map}>
                <textarea
                    className="rp-textarea large"
                    value={currentStory.scenario || currentStory.description || ''}
                    onChange={e => handleFieldChange('scenario', e.target.value)}
                    placeholder="Kịch bản tổng quan cho roleplay..."
                />
            </Section>

            {/* Các kịch bản mở đầu (alternate_greetings) */}
            {altGreetings.length > 0 && (
                <Section title="Kịch bản mở đầu" icon={Gamepad2} count={altGreetings.length + 1}>
                    {/* Kịch bản mặc định (first_mes) */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <p style={{ fontSize: 12, color: 'hsl(270,70%,65%)', margin: 0, fontWeight: 600 }}>
                                🎭 Kịch bản #1 (Mặc định)
                            </p>
                        </div>
                        <textarea
                            className="rp-textarea small"
                            value={db.chapters?.[0]?.content || currentStory.content || ''}
                            readOnly
                            style={{ minHeight: 60 }}
                        />
                    </div>

                    {altGreetings.map((g, i) => (
                        <div key={g.id || i} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                                    🎭 {g.name || `Kịch bản #${i + 2}`}
                                </p>
                                <button
                                    className="rp-tab"
                                    style={{ padding: '3px 10px', fontSize: 11 }}
                                    onClick={() => {
                                        // Set kịch bản này làm first message
                                        if (db.chapters?.length > 0) {
                                            const newChaps = [...db.chapters];
                                            newChaps[0] = { ...newChaps[0], content: g.content };
                                            updateStoryField('database', { ...db, chapters: newChaps });
                                        } else {
                                            handleFieldChange('content', g.content);
                                        }
                                    }}
                                >
                                    ▶ Sử dụng
                                </button>
                            </div>
                            <textarea
                                className="rp-textarea small"
                                value={g.content}
                                readOnly
                                style={{ minHeight: 60 }}
                            />
                        </div>
                    ))}
                </Section>
            )}

            <Section title="Tóm tắt" icon={FileText} defaultOpen={false}>
                <textarea
                    className="rp-textarea"
                    value={currentStory.synopsis || ''}
                    onChange={e => handleFieldChange('synopsis', e.target.value)}
                    placeholder="Tóm tắt ngắn..."
                />
            </Section>
        </div>
    );

    const tabContent = {
        character: renderCharacterTab,
        knowledge: renderKnowledgeTab,
        rules: renderRulesTab,
        prompt: renderPromptTab,
        greeting: renderGreetingTab,
        scenario: renderScenarioTab,
        extensions: () => <ExtensionsTab />,
    };

    return (
        <div className="rp-home">
            {/* Header */}
            <div className="rp-home-header">
                <button
                    className="btn-icon"
                    onClick={() => onNavigate?.('home') || navigate('/')}
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    <ArrowLeft size={18} />
                </button>
                <h2>
                    <Gamepad2 size={18} style={{ verticalAlign: 'middle', marginRight: 6, color: 'hsl(270,70%,65%)' }} />
                    {currentStory.title}
                </h2>
                <button className="rp-play-btn" onClick={() => navigate('/roleplay')}>
                    <Play size={16} /> Bắt đầu chơi
                </button>
            </div>

            {/* Tabs */}
            <div className="rp-tabs">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`rp-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={14} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Panel */}
            <div className="rp-panel-container">
                {tabContent[activeTab]?.() || null}
            </div>
        </div>
    );
}
