// ================================================
// RoleplayPage — Trang chính chế độ nhập vai
// ================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStory } from '../../context/StoryContext';
import { get } from 'idb-keyval';
import { motion } from 'framer-motion';
import { Play, X, MessageSquare } from 'lucide-react';
import RoleplayChat from './RoleplayChat';

export default function RoleplayPage() {
    const navigate = useNavigate();
    const { currentStory } = useStory();
    const [showGreetingSelector, setShowGreetingSelector] = useState(false);
    const [selectedGreeting, setSelectedGreeting] = useState(null);

    // Kiểm tra xem có cần hiện greeting selector không
    useEffect(() => {
        if (!currentStory) return;
        const altGreetings = currentStory.alternateGreetings || [];
        if (altGreetings.length === 0) return;

        // Kiểm tra đã có chat history chưa
        const checkHistory = async () => {
            try {
                const saved = await get(`rp_chat_${currentStory.id}`);
                if (!saved || saved.length === 0) {
                    setShowGreetingSelector(true);
                }
            } catch {
                // Lỗi → bỏ qua, không hiện selector
            }
        };
        checkHistory();
    }, [currentStory?.id]);

    if (!currentStory) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100vh',
                background: 'var(--color-bg-primary, #0a0e1a)',
                color: 'var(--color-text-primary, #e0e0e0)',
            }}>
                <h2>🎮 Chế độ Nhập vai</h2>
                <p>Chưa chọn truyện. Vui lòng chọn truyện trước.</p>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        marginTop: 16, padding: '10px 24px', borderRadius: 12,
                        background: 'linear-gradient(135deg, hsl(270,60%,50%), hsl(220,60%,50%))',
                        border: 'none', color: 'white', cursor: 'pointer', fontSize: 14,
                    }}
                >
                    ← Quay lại chọn truyện
                </button>
            </div>
        );
    }

    // Get main character from story database
    const mainChar = currentStory.database?.characters?.[0] || null;

    // Build character object
    const defaultFirstMes = currentStory.database?.chapters?.[0]?.content || currentStory.content || '';
    const firstMes = selectedGreeting || defaultFirstMes;

    const character = mainChar ? {
        ...mainChar,
        name: mainChar.name || currentStory.title,
        description: mainChar.description || currentStory.description || '',
        personality: mainChar.personality || currentStory.personality || '',
        background: mainChar.background || currentStory.scenario || '',
        scenario: currentStory.scenario || currentStory.description || '',
        system_prompt: currentStory.prohibitions || '',
        post_history_instructions: currentStory.globalDirective || '',
        first_mes: firstMes,
    } : {
        name: currentStory.title,
        description: currentStory.description || '',
        personality: currentStory.personality || '',
        background: currentStory.scenario || '',
        scenario: currentStory.scenario || currentStory.description || '',
        system_prompt: currentStory.prohibitions || '',
        post_history_instructions: currentStory.globalDirective || '',
        first_mes: firstMes,
    };

    // Background image
    const bgImage = mainChar?.avatar || mainChar?.image || currentStory.coverImage || '';

    // Alternate greetings
    const altGreetings = currentStory.alternateGreetings || [];

    // === Nếu đang hiện selector → KHÔNG render RoleplayChat ===
    if (showGreetingSelector && altGreetings.length > 0) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-bg-primary, #0a0e1a)',
                backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                }} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    style={{
                        position: 'relative', zIndex: 1,
                        background: 'var(--color-bg-secondary, #1a1e2e)',
                        borderRadius: 16, padding: 24,
                        maxWidth: 560, width: '90%', maxHeight: '80vh',
                        overflow: 'auto',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-text-primary, #e0e0e0)' }}>
                            🎭 Chọn kịch bản bắt đầu
                        </h3>
                        <button
                            onClick={() => navigate('/')}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #888)', marginBottom: 16 }}>
                        Card này có {altGreetings.length + 1} kịch bản mở đầu. Chọn một để bắt đầu chơi:
                    </p>

                    {/* Kịch bản mặc định */}
                    <button
                        onClick={() => { setSelectedGreeting(null); setShowGreetingSelector(false); }}
                        style={{
                            width: '100%', textAlign: 'left', padding: '12px 16px',
                            background: 'rgba(100,100,255,0.08)', border: '1px solid rgba(100,100,255,0.2)',
                            borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                            color: 'var(--color-text-primary, #e0e0e0)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <MessageSquare size={14} />
                            <strong style={{ fontSize: 13 }}>Kịch bản mặc định</strong>
                            <Play size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
                            {(defaultFirstMes || '').substring(0, 150)}...
                        </div>
                    </button>

                    {/* Kịch bản thay thế */}
                    {altGreetings.map((g, i) => (
                        <button
                            key={g.id || i}
                            onClick={() => { setSelectedGreeting(g.content); setShowGreetingSelector(false); }}
                            style={{
                                width: '100%', textAlign: 'left', padding: '12px 16px',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                                color: 'var(--color-text-primary, #e0e0e0)',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,100,255,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <MessageSquare size={14} />
                                <strong style={{ fontSize: 13 }}>{g.name || `Kịch bản #${i + 2}`}</strong>
                                <Play size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
                                {(g.content || '').substring(0, 150)}...
                            </div>
                        </button>
                    ))}
                </motion.div>
            </div>
        );
    }

    return (
        <RoleplayChat
            story={currentStory}
            character={character}
            bgImage={bgImage}
            onBack={() => navigate('/')}
        />
    );
}
