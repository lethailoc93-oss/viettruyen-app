// ================================================
// AI Service — Barrel Re-Export
// All functions split into modules under ./ai/
// This file maintains backward compatibility for all consumers
// ================================================

// Writing module: continueStory, chatWithAI, writeChapter
import { continueStory, chatWithAI, writeChapter } from './ai/aiWriting';

// Outline module: generateOutline, generateChapterOutline, generateSingleChapterOutline, generateSceneOutline
import { generateOutline, generateChapterOutline, generateSingleChapterOutline, generateSceneOutline } from './ai/aiOutline';

// Analysis module: suggestions, scanning, consistency, story form
import {
    suggestCharacter, suggestPlot, improveWriting,
    summarizeReference, postWriteScan, summarizeChapter,
    generateSceneDescription, checkConsistency, suggestStorySection,
    checkConsistencyLocal, generateImagePrompt, analyzeStoryFromUrl, analyzeStoryFromFile, analyzeWritingStyle
} from './ai/aiAnalysis';

// Prompt module: buildPromptForAction, sendRawPrompt
import { buildPromptForAction, sendRawPrompt } from './ai/aiPrompt';

// Smart Editor — delegated to smartEditorService.js
import { rewriteText, expandText, condenseText, suggestWordtune } from './smartEditorService';

// ================================================
// Unified AIService object (backward compatible)
// ================================================
export const AIService = {
    // Writing
    continueStory,
    chatWithAI,
    writeChapter,

    // Outlines
    generateOutline,
    generateChapterOutline,
    generateSingleChapterOutline,
    generateSceneOutline,

    // Analysis & Suggestions
    suggestCharacter,
    suggestPlot,
    improveWriting,
    summarizeReference,
    postWriteScan,
    summarizeChapter,
    generateSceneDescription,
    checkConsistency,
    suggestStorySection,
    generateImagePrompt,
    analyzeStoryFromUrl,
    analyzeStoryFromFile,
    analyzeWritingStyle,

    // Prompt preview
    buildPromptForAction,
    sendRawPrompt,

    // Smart Editor (delegated)
    rewriteText,
    expandText,
    condenseText,
    suggestWordtune,
};

// Standalone export for fallback consistency checker
export { checkConsistencyLocal };
