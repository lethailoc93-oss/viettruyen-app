// ================================================
// RoleplayPage — Trang chính chế độ nhập vai
// ================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStory } from '../../context/StoryContext';
import RoleplayChat from './RoleplayChat';

export default function RoleplayPage() {
    const navigate = useNavigate();
    const { currentStory } = useStory();

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

    // Build character object from card import or first character
    const character = mainChar ? {
        name: mainChar.name || currentStory.title,
        description: mainChar.description || '',
        personality: mainChar.personality || '',
        background: mainChar.background || '',
        scenario: currentStory.description || '',
        system_prompt: currentStory.prohibitions || '',
        post_history_instructions: currentStory.globalDirective || '',
        first_mes: currentStory.database?.chapters?.[0]?.content || currentStory.content || '',
        ...mainChar,
    } : {
        name: currentStory.title,
        description: currentStory.description || '',
        personality: '',
        background: '',
        scenario: currentStory.description || '',
        system_prompt: currentStory.prohibitions || '',
        post_history_instructions: currentStory.globalDirective || '',
        first_mes: currentStory.database?.chapters?.[0]?.content || currentStory.content || '',
    };

    // Try to get background image (from card import or story cover)
    const bgImage = mainChar?.avatar || mainChar?.image || currentStory.coverImage || '';

    return (
        <RoleplayChat
            story={currentStory}
            character={character}
            bgImage={bgImage}
            onBack={() => navigate('/')}
        />
    );
}
