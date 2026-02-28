import React, { useState, useEffect } from 'react';

/**
 * Reusable component to add Worldbook (Lorebook) mechanic fields to any Database Entry.
 * 
 * Includes:
 * - Keywords: words that trigger this entry to be injected into the prompt.
 * - Strategy: 'Normal' (keyword-triggered) or 'Constant' (always active).
 * - Priority: 1-100 indicating how close to the system prompt this entity is injected.
 * - Insertion Order: Fine-grain tiebreaker when multiple entries have same priority.
 */
export default function LorebookFields({ data, onChange }) {
    const [testText, setTestText] = useState('');
    const [isMatch, setIsMatch] = useState(null);

    // Simple test function mimicking ragEntityBuilders.js
    useEffect(() => {
        if (!testText.trim() || !data.keywords) {
            setIsMatch(null);
            return;
        }

        const targetText = testText.toLowerCase();
        const keywordGroups = data.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
        let match = false;

        for (const group of keywordGroups) {
            const tokens = group.split(/\s+/);
            const requiredWords = [];
            const forbiddenWords = [];
            const normalWords = [];

            tokens.forEach(token => {
                if (token.startsWith('+') && token.length > 1) requiredWords.push(token.substring(1));
                else if (token.startsWith('-') && token.length > 1) forbiddenWords.push(token.substring(1));
                else normalWords.push(token);
            });

            const checkWordInText = (word) => {
                try {
                    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(?:^|[^\\p{L}\\p{M}\\p{N}_])${escaped}(?:[^\\p{L}\\p{M}\\p{N}_]|$)`, 'iu');
                    return regex.test(targetText);
                } catch (e) {
                    return targetText.includes(word);
                }
            };

            let groupHasForbidden = false;
            for (const fWord of forbiddenWords) {
                if (checkWordInText(fWord)) {
                    groupHasForbidden = true;
                    match = false; // Force fail overall if any forbidden is hit (simplification for test UI)
                    break;
                }
            }
            if (groupHasForbidden) continue;

            let allRequiredMet = true;
            for (const rWord of requiredWords) {
                if (!checkWordInText(rWord)) {
                    allRequiredMet = false;
                    break;
                }
            }
            if (!allRequiredMet) continue;

            let normalMet = true;
            if (normalWords.length > 0 && requiredWords.length === 0) {
                normalMet = checkWordInText(normalWords.join(' '));
            }

            if (allRequiredMet && normalMet) {
                match = true;
                break;
            }
        }

        setIsMatch(match);
    }, [testText, data.keywords]);

    return (
        <div style={{
            background: 'var(--glass-bg)', padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)',
            marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)'
        }}>
            <h4 style={{
                margin: '0 0 var(--space-sm) 0',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-xs)'
            }}>
                ⚙️ Cấu hình Worldbook (Lorebook)
            </h4>

            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                <label className="form-label">Từ khóa kích hoạt (Keywords)</label>
                <div style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 'normal', marginBottom: '4px' }}>
                    Nhập dấu phẩy (,) giữa các nhóm từ. So khớp nguyên từ (Whole Words).<br />
                    Dùng <strong style={{ color: 'var(--color-primary)' }}>+</strong> bắt buộc CÓ (AND). Dùng <strong style={{ color: 'var(--color-error)' }}>-</strong> bắt buộc KHÔNG (NOT).<br />
                    <em>VD: phép thuật +lửa, -nước (Kích hoạt khi có "phép thuật" VÀ "lửa", nhưng KHÔNG có "nước")</em>
                </div>
                <input
                    className="form-input"
                    value={data.keywords || ''}
                    onChange={e => onChange({ ...data, keywords: e.target.value })}
                    placeholder="VD: nữ chính, thanh kiếm +bạch kim, -bị gãy..."
                />
            </div>

            {/* Regex Sandbox Tool */}
            <div style={{
                background: isMatch === true ? 'rgba(46, 204, 113, 0.1)' : isMatch === false ? 'rgba(231, 76, 60, 0.1)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${isMatch === true ? '#2ecc71' : isMatch === false ? '#e74c3c' : 'rgba(255,255,255,0.1)'}`,
                padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)'
            }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🧪 Regex Sandbox (Test logic từ khóa):</span>
                    {isMatch === true && <span style={{ color: '#2ecc71' }}>✅ ĐÃ KÍCH HOẠT (MATCHED)</span>}
                    {isMatch === false && testText && <span style={{ color: '#e74c3c' }}>❌ ĐÃ BỎ QUA (UNMATCHED)</span>}
                </label>
                <input
                    className="form-input"
                    style={{ marginTop: '4px', fontSize: '12px', background: 'transparent' }}
                    value={testText}
                    onChange={e => setTestText(e.target.value)}
                    placeholder="Gõ thử 1 câu truyện vào đây xem từ khóa có bắt dính không..."
                />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 30%' }}>
                    <label className="form-label">Chiến lược (Strategy)</label>
                    <select
                        className="form-input"
                        value={data.strategy || 'Normal'}
                        onChange={e => onChange({ ...data, strategy: e.target.value })}
                    >
                        <option value="Normal">Normal (Chỉ nạp khi có Keyword)</option>
                        <option value="Constant">Constant (Luôn luôn nạp)</option>
                    </select>
                </div>

                <div className="form-group" style={{ flex: '1 1 30%' }}>
                    <label className="form-label">Độ ưu tiên (Priority)</label>
                    <select
                        className="form-input"
                        value={data.priority || 30}
                        onChange={e => onChange({ ...data, priority: parseInt(e.target.value) })}
                    >
                        <option value={30}>Tham khảo (1-30)</option>
                        <option value={70}>Kiến thức Thế giới (31-70)</option>
                        <option value={100}>Luật Cốt Lõi / Cấm kỵ (71-100)</option>
                    </select>
                </div>

                <div className="form-group" style={{ flex: '1 1 30%' }}>
                    <label className="form-label" title="Dùng khi nhiều thẻ có cùng Priority. Số TO hơn sẽ xếp dưới cùng (Hiệu lực cao hơn).">
                        Thứ tự chèn (Order) ℹ️
                    </label>
                    <input
                        type="number"
                        className="form-input"
                        value={data.insertionOrder !== undefined ? data.insertionOrder : 100}
                        onChange={e => onChange({ ...data, insertionOrder: parseInt(e.target.value) || 0 })}
                    />
                </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-xs)', fontStyle: 'italic' }}>
                * Priority &gt; 70 sẽ tạo thành <strong>Depth 0</strong>, khóa cứng luật này ở <strong style={{ color: 'var(--color-error)' }}>đáy Prompt</strong> ép AI tuân thủ tuyệt đối mà không bị trôi ngữ cảnh. Thẻ có Order lớn hơn sẽ nằm ở dưới cùng.
            </div>
        </div>
    );
}
