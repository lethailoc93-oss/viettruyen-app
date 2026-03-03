import { useState, useRef, useCallback, useEffect } from 'react';
import { AIService } from '../services/aiService';
import { generateImage } from '../services/ai/aiImageService';
import { autoSummarizeChapter, summarizePlotProgress, shouldRunPlotProgress } from '../services/ai/autoSummarize';
import { Wand2 } from 'lucide-react';

/**
 * Custom hook extracting all AI-related state and logic from ChapterDetail:
 * - Continue writing (Tiếp tục viết) with prompt preview
 * - Chapter writing from hot directive (streaming + post-write scan)
 */
export default function useChapterAI({
    getNextKey, isKeySet, selectedModel, chapter, chapterId, currentStory,
    content, setContent, setIsSaved, showToast,
    getDirective, chapterOps, addCharacter, updateCharacter, settingOps, timelineOps,
    abilityOps, itemOps, organizationOps, updateCurrentInfo,
    extractSources, setChapterSources, setActiveTab,
    plotProgressOps, foreshadowingOps,
}) {
    // AI dropdown state
    const [showAIDropdown, setShowAIDropdown] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiLoadingAction, setAiLoadingAction] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const aiDropdownRef = useRef(null);

    // Prompt preview state
    const [showPromptPreview, setShowPromptPreview] = useState(false);
    const [promptPreviewData, setPromptPreviewData] = useState({ systemInstruction: '', userPrompt: '', title: '', action: '' });
    const [promptSending, setPromptSending] = useState(false);

    // Hot directive state
    const [hotDirective, setHotDirective] = useState('');
    const [isWritingChapter, setIsWritingChapter] = useState(false);
    const [writeChapterStatus, setWriteChapterStatus] = useState('');

    // Draw state
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStatus, setDrawStatus] = useState('');
    const [drawImage, setDrawImage] = useState('');
    const [drawImagePrompt, setDrawImagePrompt] = useState('');

    // MVU — Pending scan result for review
    const [pendingScan, setPendingScan] = useState(null);

    // Close AI dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (aiDropdownRef.current && !aiDropdownRef.current.contains(e.target)) {
                setShowAIDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ═══ MVU: Apply filtered scan results (called from MVUReviewPanel) ═══
    const applyScanResult = useCallback((filtered) => {
        if (!filtered) { setPendingScan(null); return; }
        const db = currentStory?.database || {};

        // Update chapter summary + recap + keywords
        if (filtered.summary || filtered.recap || filtered.keywords?.length) {
            const updates = {};
            if (filtered.summary) updates.summary = filtered.summary;
            if (filtered.recap) updates.recap = filtered.recap;
            if (filtered.keywords?.length) updates.keywords = filtered.keywords;
            chapterOps.update(chapterId, updates);
        }

        // Add new characters
        filtered.characters?.forEach(char => {
            addCharacter({
                name: char.name, role: char.role || '',
                description: char.description || '', personality: char.personality || '',
                currentState: char.newState || ''
            });
        });

        // Update existing characters (enhanced with dynamic state fields)
        if (filtered.characterUpdates?.length > 0) {
            const existingChars = db.characters || [];
            filtered.characterUpdates.forEach(upd => {
                const existing = existingChars.find(c => c.name === upd.name);
                if (!existing) return;
                const updates = {};
                if (upd.newInfo) {
                    updates.description = existing.description
                        ? `${existing.description}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}`
                        : upd.newInfo;
                }
                if (upd.newState) updates.currentState = upd.newState;
                // MVU enhanced dynamic fields
                if (upd.currentLocation) updates.currentLocation = upd.currentLocation;
                if (upd.currentGoal) updates.currentGoal = upd.currentGoal;
                if (upd.currentBodyState) updates.currentBodyState = upd.currentBodyState;
                if (upd.specialStatus) updates.specialStatus = upd.specialStatus;
                updateCharacter(existing.id, updates);
            });
        }

        // Add/update settings
        filtered.settings?.forEach(s => {
            const newFields = { name: s.name, description: s.description || '' };
            if (s.newState) newFields.state = s.newState;
            settingOps.add(newFields);
        });
        if (filtered.settingUpdates?.length > 0) {
            const existingSettings = db.settings || [];
            filtered.settingUpdates.forEach(upd => {
                const existing = existingSettings.find(s => s.name === upd.name);
                if (!existing) return;
                const updates = {};
                if (upd.newInfo) updates.description = existing.description
                    ? `${existing.description}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}` : upd.newInfo;
                if (upd.newState) updates.state = upd.newState;
                settingOps.update(existing.id, updates);
            });
        }

        // Timeline events
        filtered.timeline?.forEach(event => {
            timelineOps.add({
                name: event.title || event.name || 'Sự kiện',
                description: event.description || '',
                chapter: chapter.order
            });
        });

        // Add/update abilities
        filtered.abilities?.forEach(a => {
            const f = { name: a.name, owner: a.owner || '', effect: a.effect || '', limitation: a.limitation || '' };
            if (a.newState) f.state = a.newState;
            abilityOps.add(f);
        });
        if (filtered.abilityUpdates?.length > 0) {
            const existingAbilities = db.abilities || [];
            filtered.abilityUpdates.forEach(upd => {
                const existing = existingAbilities.find(a => a.name === upd.name);
                if (!existing) return;
                const updates = {};
                if (upd.newInfo) updates.effect = existing.effect
                    ? `${existing.effect}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}` : upd.newInfo;
                if (upd.newState) updates.state = upd.newState;
                abilityOps.update(existing.id, updates);
            });
        }

        // Add/update items (enhanced with quantity + newOwner)
        filtered.items?.forEach(i => {
            const f = { name: i.name, owner: i.owner || '', effect: i.effect || '' };
            if (i.quantity) f.quantity = i.quantity;
            if (i.newState) f.state = i.newState;
            itemOps.add(f);
        });
        if (filtered.itemUpdates?.length > 0) {
            const existingItems = db.items || [];
            filtered.itemUpdates.forEach(upd => {
                const existing = existingItems.find(i => i.name === upd.name);
                if (!existing) return;
                const updates = {};
                if (upd.newInfo) updates.effect = existing.effect
                    ? `${existing.effect}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}` : upd.newInfo;
                if (upd.newState) updates.state = upd.newState;
                // MVU enhanced: quantity + ownership transfer
                if (upd.quantity) updates.quantity = upd.quantity;
                if (upd.newOwner) updates.owner = upd.newOwner;
                itemOps.update(existing.id, updates);
            });
        }

        // Add/update organizations
        filtered.organizations?.forEach(o => {
            const f = { name: o.name, purpose: o.purpose || '' };
            if (o.newState) f.state = o.newState;
            organizationOps.add(f);
        });
        if (filtered.organizationUpdates?.length > 0) {
            const existingOrgs = db.organizations || [];
            filtered.organizationUpdates.forEach(upd => {
                const existing = existingOrgs.find(o => o.name === upd.name);
                if (!existing) return;
                const updates = {};
                if (upd.newInfo) updates.purpose = existing.purpose
                    ? `${existing.purpose}\n[Ch.${chapter.order || '?'}] ${upd.newInfo}` : upd.newInfo;
                if (upd.newState) updates.state = upd.newState;
                organizationOps.update(existing.id, updates);
            });
        }

        // Update #0 Current Info
        if (filtered.currentState) {
            updateCurrentInfo(
                filtered.currentState.time || currentStory?.currentTime || '',
                filtered.currentState.location || currentStory?.currentLocation || ''
            );
        }

        // Vector Events -> Character actionHistory (Phase 2)
        if (filtered.eventLog?.length > 0) {
            const existingChars = db.characters || [];
            // To ensure we don't overwrite updates from characterUpdates in the same pass if they already updated actionHistory
            // (Though characterUpdates doesn't currently update actionHistory).
            filtered.eventLog.forEach(logText => {
                // Extract possible character name before arrow or dash (e.g. "Lâm → giết rồng")
                const match = logText.match(/^([^→\-:]+)/);
                if (match) {
                    const charName = match[1].trim();
                    // Try to find a character that matches the extracted name
                    const existing = existingChars.find(c =>
                        c.name.toLowerCase() === charName.toLowerCase() ||
                        charName.toLowerCase().includes(c.name.toLowerCase()) ||
                        c.name.toLowerCase().includes(charName.toLowerCase())
                    );

                    if (existing) {
                        // Note: If multiple events target the same char in one scan, we might have a race condition depending on how updateCharacter is implemented.
                        // However, updateCharacter usually merges with existing state. For safety, we will just dispatch the update.
                        // To be safe, we'll fetch the latest from db object we have, but react state won't update immediately. 
                        // Assuming updateCharacter handles functional updates or this is acceptable for now.
                        const newHistory = existing.actionHistory
                            ? `${existing.actionHistory}\n[Ch.${chapter.order || '?'}] ${logText}`
                            : `[Ch.${chapter.order || '?'}] ${logText}`;
                        updateCharacter(existing.id, { actionHistory: newHistory });

                        // Mutate local db reference to avoid overwriting next log in same batch
                        existing.actionHistory = newHistory;
                    }
                }
            });
        }

        // Clear pending scan
        // Clear pending scan
        setPendingScan(null);
    }, [currentStory, chapter, chapterId, chapterOps, addCharacter, updateCharacter,
        settingOps, timelineOps, abilityOps, itemOps, organizationOps, updateCurrentInfo]);

    // AI Action handler — shows prompt preview first
    const handleAIAction = useCallback(async (action) => {
        if (!isKeySet) {
            showToast('Vui lòng nhập API key để dùng tính năng này', 'warning');
            return;
        }
        setShowAIDropdown(false);
        setAiLoading(true);
        setAiLoadingAction(action);
        setAiResponse('');

        const actionLabels = {
            continue: 'Tiếp tục viết',
        };

        try {
            const apiKey = getNextKey();
            const result = await AIService.buildPromptForAction(action, {
                apiKey,
                story: currentStory,
                content,
                chapter,
                model: selectedModel
            });
            setPromptPreviewData({
                systemInstruction: result.systemInstruction,
                userPrompt: result.userPrompt,
                title: actionLabels[action] || 'AI Action',
                action
            });
            setShowPromptPreview(true);
        } catch (err) {
            setAiResponse('❌ Lỗi xây dựng prompt: ' + err.message);
        } finally {
            setAiLoading(false);
            setAiLoadingAction('');
        }
    }, [isKeySet, getNextKey, selectedModel, currentStory, content, chapter, showToast]);

    // Handle confirmed prompt send (after preview/edit)
    const handlePromptConfirm = useCallback(async (editedPrompt) => {
        setPromptSending(true);
        try {
            const apiKey = getNextKey();
            const response = await AIService.sendRawPrompt(
                apiKey,
                promptPreviewData.systemInstruction,
                editedPrompt,
                { model: selectedModel, maxTokens: 2048 }
            );
            if (promptPreviewData.action === 'continue' && response) {
                const newContent = content ? (content + '\n\n' + response) : response;
                setContent(newContent);
                setIsSaved(false);
            } else if (response) {
                setAiResponse(response);
            }
            setShowPromptPreview(false);
        } catch (err) {
            setAiResponse('❌ Lỗi: ' + err.message);
            setShowPromptPreview(false);
        } finally {
            setPromptSending(false);
        }
    }, [getNextKey, selectedModel, promptPreviewData, content, setContent, setIsSaved]);

    // Write chapter from hot directive
    const handleWriteFromDirective = useCallback(async () => {
        if (!isKeySet) {
            showToast('Vui lòng nhập API key để dùng tính năng này', 'warning');
            return;
        }
        setIsWritingChapter(true);
        setWriteChapterStatus('📋 Bước 1/3: Đang lập dàn ý...');

        try {
            const apiKey = getNextKey();

            // Build directive that includes the hot directive text
            const directive = getDirective('writeChapter') || {};
            const enhancedDirective = {
                ...directive,
                customInstruction: [
                    directive.customInstruction || '',
                    hotDirective ? `\n\nCHỈ ĐẠO NÓNG TỪ NGƯỜI VIẾT:\n${hotDirective}` : ''
                ].filter(Boolean).join('')
            };

            // Track the base content before streaming starts
            const baseContent = content ? (content + '\n\n') : '';
            let streamedText = '';
            let lastUpdate = 0;

            const result = await AIService.writeChapter(apiKey, chapter, currentStory, {
                directive: enhancedDirective,
                model: selectedModel,
                useWebSearch: true,
                onProgress: (step, message) => setWriteChapterStatus(message),
                onStream: (chunk) => {
                    streamedText += chunk;
                    const now = Date.now();
                    if (now - lastUpdate > 50) {
                        lastUpdate = now;
                        setContent(baseContent + streamedText);
                    }
                }
            });

            // writeChapter now returns { text, webSources }
            const chapterText = result?.text || result || '';
            const webSources = result?.webSources || [];

            // Final update with complete text — extract sources first
            const { cleanContent: cleanResult, sources: extractedSources } = extractSources(chapterText);
            const newContent = baseContent + cleanResult;
            setContent(newContent);
            setIsSaved(true);

            // Auto-save chapter content to database
            chapterOps.update(chapterId, { content: newContent });

            // Combine extracted text citations + web sources
            const allSources = [...extractedSources, ...webSources];
            if (allSources.length > 0) {
                setChapterSources(prev => [...prev, ...allSources]);
                setActiveTab('sources');
            }

            // Step 3: Auto-scan → MVU Review Panel
            setWriteChapterStatus('🔍 Bước 3/3: Đang quét dữ liệu...');
            try {
                const scanApiKey = getNextKey();
                const scanResult = await AIService.postWriteScan(scanApiKey, chapterText, chapter, currentStory, {
                    model: selectedModel,
                    onProgress: (step, message) => setWriteChapterStatus(message)
                });

                // Count changes for status display
                const totalChanges = (scanResult.characters?.length || 0) + (scanResult.characterUpdates?.length || 0) +
                    (scanResult.settings?.length || 0) + (scanResult.settingUpdates?.length || 0) +
                    (scanResult.abilities?.length || 0) + (scanResult.abilityUpdates?.length || 0) +
                    (scanResult.items?.length || 0) + (scanResult.itemUpdates?.length || 0) +
                    (scanResult.organizations?.length || 0) + (scanResult.organizationUpdates?.length || 0) +
                    (scanResult.timeline?.length || 0) + (scanResult.eventLog?.length || 0) +
                    (scanResult.summary ? 1 : 0) + (scanResult.recap ? 1 : 0) +
                    (scanResult.currentState ? 1 : 0);

                if (totalChanges > 0) {
                    // Auto-Pilot: apply scan results automatically
                    applyScanResult(scanResult);
                    console.log(`🤖 Auto-Pilot: ${totalChanges} changes auto-applied`);
                    setWriteChapterStatus(`✅ Hoàn thành! 📊 ${totalChanges} thay đổi đã tự động cập nhật`);

                    // Auto-add foreshadowing seeds from scan
                    if (scanResult.foreshadowingSeeds?.length > 0 && foreshadowingOps) {
                        const existingFS = currentStory?.database?.foreshadowings || [];
                        let addedCount = 0;
                        scanResult.foreshadowingSeeds.forEach(seed => {
                            const isDupe = existingFS.some(f =>
                                f.hint?.toLowerCase() === seed.hint?.toLowerCase()
                            );
                            if (!isDupe) {
                                foreshadowingOps.add({
                                    hint: seed.hint,
                                    targetEvent: seed.targetEvent || '',
                                    confidence: seed.confidence || 'medium',
                                    plantedChapter: chapter.order || 1,
                                    status: 'active'
                                });
                                addedCount++;
                            }
                        });
                        if (addedCount > 0) {
                            console.log(`🌱 Auto-Pilot: ${addedCount} foreshadowing seeds auto-added`);
                        }
                    }
                } else {
                    setWriteChapterStatus('✅ Hoàn thành viết chương!');
                }
            } catch (scanErr) {
                console.warn('Post-write scan failed:', scanErr);
                setWriteChapterStatus('✅ Hoàn thành viết chương!');
            }

            // Step 3b (background): Auto-Consistency Check
            try {
                setWriteChapterStatus('🔎 Kiểm tra nhất quán...');
                const consistencyKey = getNextKey();
                const consistencyResult = await AIService.checkConsistency(
                    consistencyKey, chapterText, currentStory, { model: selectedModel }
                );
                const issueCount = consistencyResult?.issues?.length || 0;
                const warnCount = consistencyResult?.warnings?.length || 0;
                if (issueCount > 0) {
                    showToast(`⚠️ Phát hiện ${issueCount} mâu thuẫn tiềm ẩn! Kiểm tra console (F12).`, 'warning');
                    console.warn('🔎 Consistency issues:', consistencyResult.issues);
                    if (warnCount > 0) console.warn('🔎 Consistency warnings:', consistencyResult.warnings);
                } else {
                    console.log(`🔎 Consistency check passed ✅ (${warnCount} minor warnings)`);
                }
            } catch (consistencyErr) {
                console.warn('🔎 Consistency check failed (non-critical):', consistencyErr.message);
            }

            // Step 3c (background): Style Drift Check
            try {
                const prevChapters = (currentStory?.database?.chapters || [])
                    .filter(c => c.content && c.content.length > 200 && (c.order || 0) < (chapter.order || 0))
                    .sort((a, b) => (b.order || 0) - (a.order || 0));
                const prevContent = prevChapters[0]?.content;

                if (prevContent) {
                    setWriteChapterStatus('🎨 Kiểm tra phong cách...');
                    const styleKey = getNextKey();
                    const stylePrompt = `So sánh văn phong 2 đoạn văn bản dưới đây. Trả về JSON thuần (không markdown):
{"driftLevel":"none|minor|major","details":"mô tả ngắn gọn sự khác biệt nếu có"}

ĐOẠN CŨ (chương trước):
${prevContent.slice(-1500)}

ĐOẠN MỚI (chương vừa viết):
${chapterText.slice(0, 1500)}

Kiểm tra: giọng kể, nhịp câu, mức độ miêu tả, xưng hô, tone cảm xúc. Chỉ flag "major" nếu khác biệt RÕ RÀNG.`;

                    const styleResult = await AIService.sendRawPrompt(
                        styleKey, 'Bạn là chuyên gia phân tích văn phong. Chỉ trả JSON.', stylePrompt,
                        { model: selectedModel, maxTokens: 256 }
                    );
                    const driftMatch = styleResult?.match(/"driftLevel"\s*:\s*"(major)"/);
                    if (driftMatch) {
                        showToast('🎨 Cảnh báo: Văn phong chương này có vẻ khác biệt so với chương trước!', 'warning');
                        console.warn('🎨 Style drift detected:', styleResult);
                    } else {
                        console.log('🎨 Style consistency check passed ✅');
                    }
                }
            } catch (styleErr) {
                console.warn('🎨 Style check failed (non-critical):', styleErr.message);
            }

            // Step 4 (background): Auto-summarize chapter
            try {
                const sumApiKey = getNextKey();
                const chapterNumber = chapter.order || 1;
                const summary = await autoSummarizeChapter(sumApiKey, chapter, chapterText, currentStory, { model: selectedModel });
                if (summary) {
                    chapterOps.update(chapterId, { summary });
                    console.log(`📝 Auto-summarized chapter ${chapterNumber}`);
                }

                // Every 5 chapters: summarize plot progress
                if (shouldRunPlotProgress(chapterNumber)) {
                    const ppApiKey = getNextKey();
                    const plotProgress = await summarizePlotProgress(ppApiKey, currentStory, chapterNumber, { model: selectedModel });
                    if (plotProgress && plotProgressOps) {
                        plotProgressOps.add(plotProgress);
                        console.log(`📊 Plot progress saved at chapter ${chapterNumber}`);
                    }
                }
            } catch (sumErr) {
                console.warn('Auto-summarization failed (non-critical):', sumErr.message);
            }
        } catch (err) {
            showToast('Có lỗi khi viết chương: ' + err.message, 'error');
            setWriteChapterStatus('');
        } finally {
            setTimeout(() => {
                setIsWritingChapter(false);
                setWriteChapterStatus('');
            }, 3000);
        }
    }, [isKeySet, getNextKey, selectedModel, chapter, chapterId, currentStory, content, hotDirective,
        getDirective, chapterOps, extractSources, setChapterSources, setActiveTab,
        setContent, setIsSaved, showToast, plotProgressOps]);


    // Draw from directive — generate image based on directive text + current content
    const handleDrawFromDirective = useCallback(async () => {
        if (!isKeySet) {
            showToast('Vui lòng nhập API key để dùng tính năng này', 'warning');
            return;
        }
        const drawText = hotDirective?.trim() || content?.slice(-500) || chapter?.title || '';
        if (!drawText) {
            showToast('Hãy nhập mô tả cảnh cần vẽ vào ô Chỉ đạo AI', 'warning');
            return;
        }

        setIsDrawing(true);
        setDrawStatus('🎨 Đang tạo prompt cho ảnh...');
        setDrawImage(prev => {
            if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return '';
        });
        setDrawImagePrompt('');

        try {
            const apiKey = getNextKey();
            // Step 1: AI converts Vietnamese text to English image prompt
            const imagePrompt = await AIService.generateImagePrompt(apiKey, drawText, currentStory, {
                model: selectedModel,
                chapter
            });
            setDrawImagePrompt(imagePrompt);
            setDrawStatus('🖌️ Đang vẽ ảnh...');

            // Step 2: Generate image from prompt
            const result = await generateImage(imagePrompt, {
                onProgress: (msg) => setDrawStatus(`🖌️ ${msg}`),
            });

            if (result) {
                setDrawImage(result.url);
                const providerLabel = result.provider === 'ai-horde' ? ' (AI Horde)' : '';
                setDrawStatus(`✅ Đã tạo ảnh thành công${providerLabel}`);
            } else {
                setDrawStatus('❌ Không thể tạo ảnh. Vui lòng thử lại.');
            }
        } catch (err) {
            setDrawStatus('❌ Lỗi: ' + err.message);
        } finally {
            setTimeout(() => {
                setIsDrawing(false);
                setDrawStatus('');
            }, 5000);
        }
    }, [isKeySet, getNextKey, selectedModel, chapter, currentStory, content, hotDirective, showToast]);

    return {
        // AI state
        aiLoading, aiLoadingAction,
        aiResponse, setAiResponse,

        // Prompt preview
        showPromptPreview, setShowPromptPreview,
        promptPreviewData,
        promptSending,

        // Hot directive + write
        hotDirective, setHotDirective,
        isWritingChapter,
        writeChapterStatus,

        // Draw
        isDrawing, drawStatus,
        drawImage, setDrawImage, drawImagePrompt,

        // MVU Review
        pendingScan,
        applyScanResult,
        clearPendingScan: () => setPendingScan(null),

        // Actions
        handleAIAction,
        handlePromptConfirm,
        handleWriteFromDirective,
        handleDrawFromDirective,
    };
}
