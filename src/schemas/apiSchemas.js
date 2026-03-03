import { z } from 'zod';

// ═══════════════════════════════════════════════════
// Proxy & Provider Config Schemas
// ═══════════════════════════════════════════════════

export const ProxyConfigSchema = z.object({
    provider: z.enum(['gemini', 'custom', 'orbit', 'ws-relay']).optional(),
    customBaseUrl: z.string().optional(),
});

// ═══════════════════════════════════════════════════
// Generation Config Schema
// ═══════════════════════════════════════════════════

export const GenerationConfigSchema = z.object({
    maxOutputTokens: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().int().min(1).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    thinkingBudget: z.number().int().min(0).optional(),
});

// ═══════════════════════════════════════════════════
// Worker Config Schema
// ═══════════════════════════════════════════════════

export const WorkerConfigSchema = z.object({
    provider: z.string().min(1),
    baseUrl: z.string().optional(),
    apiKey: z.string().optional(),
    model: z.string().optional(),
});
