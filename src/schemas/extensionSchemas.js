import { z } from 'zod';

// ═══════════════════════════════════════════════════
// Regex Script Schema (SillyTavern format)
// ═══════════════════════════════════════════════════

export const RegexScriptSchema = z.object({
    scriptName: z.string().optional().default('Regex Script'),
    findRegex: z.string().min(1, 'findRegex không được để trống'),
    replaceString: z.string().optional().default(''),
    trimStrings: z.array(z.string()).optional().default([]),
    placement: z.array(z.number()).optional().default([]),
    disabled: z.boolean().optional().default(false),
    markdownOnly: z.boolean().optional().default(false),
    promptOnly: z.boolean().optional().default(false),
    runOnEdit: z.boolean().optional().default(false),
    substituteRegex: z.boolean().optional().default(false),
    minDepth: z.number().optional(),
    maxDepth: z.number().optional(),
}).passthrough();

// ═══════════════════════════════════════════════════
// Extension Manifest Schema
// ═══════════════════════════════════════════════════

export const ExtensionManifestSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    description: z.string().optional().default(''),
    type: z.string().optional().default('unknown'),
    enabled: z.boolean().optional().default(true),
    source: z.string().optional(),
    data: z.any().optional(),
}).passthrough();

// ═══════════════════════════════════════════════════
// Installed Extension Schema
// ═══════════════════════════════════════════════════

export const InstalledExtensionSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    description: z.string().optional().default(''),
    type: z.enum(['regex', 'script', 'config', 'unknown']),
    enabled: z.boolean().default(true),
    source: z.string(),
    installedAt: z.string(),
    data: z.any(),
}).passthrough();
