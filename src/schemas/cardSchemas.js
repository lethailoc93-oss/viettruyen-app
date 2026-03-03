import { z } from 'zod';

// ═══════════════════════════════════════════════════
// Lorebook Entry Schema (character_book.entries[])
// ═══════════════════════════════════════════════════

export const LorebookEntrySchema = z.object({
    keys: z.array(z.string()).optional().default([]),
    key: z.array(z.string()).optional(), // V1 compat
    secondary_keys: z.array(z.string()).optional().default([]),
    content: z.string().optional().default(''),
    comment: z.string().optional().default(''),
    enabled: z.boolean().optional().default(true),
    selective: z.boolean().optional().default(false),
    constant: z.boolean().optional().default(false),
    match_whole_words: z.boolean().optional().default(false),
    position: z.union([z.number(), z.string()]).optional().default(1),
    priority: z.number().optional().default(10),
    insertion_order: z.number().optional(),
    order: z.number().optional(), // V1 compat
    depth: z.number().optional().default(0),
    name: z.string().optional(),
    extensions: z.record(z.string(), z.any()).optional(),
}).passthrough(); // Cho phép extra fields không khai báo

// ═══════════════════════════════════════════════════
// Character Book Schema
// ═══════════════════════════════════════════════════

export const CharacterBookSchema = z.object({
    entries: z.array(LorebookEntrySchema).optional().default([]),
    scan_depth: z.number().optional(),
    token_budget: z.number().optional(),
    recursive_scanning: z.boolean().optional(),
    name: z.string().optional(),
}).passthrough();

// ═══════════════════════════════════════════════════
// Character Card V1 Schema
// ═══════════════════════════════════════════════════

export const CharacterCardV1Schema = z.object({
    name: z.string().optional(),
    char_name: z.string().optional(),
    description: z.string().optional().default(''),
    personality: z.string().optional().default(''),
    world_scenario: z.string().optional().default(''),
    first_mes: z.string().optional().default(''),
    mes_example: z.string().optional().default(''),
}).passthrough();

// ═══════════════════════════════════════════════════
// Character Card V2 data.* Schema
// ═══════════════════════════════════════════════════

export const CharacterCardV2DataSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional().default(''),
    personality: z.string().optional().default(''),
    scenario: z.string().optional().default(''),
    first_mes: z.string().optional().default(''),
    mes_example: z.string().optional().default(''),
    system_prompt: z.string().optional().default(''),
    post_history_instructions: z.string().optional().default(''),
    creator_notes: z.string().optional().default(''),
    creatorcomment: z.string().optional().default(''),
    creator: z.string().optional().default(''),
    character_version: z.string().optional().default(''),
    alternate_greetings: z.array(z.string()).optional().default([]),
    tags: z.array(z.string()).optional().default([]),
    character_book: CharacterBookSchema.optional(),
    extensions: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ═══════════════════════════════════════════════════
// Character Card V2 Root Schema
// ═══════════════════════════════════════════════════

export const CharacterCardV2Schema = z.object({
    spec: z.string().optional(),
    spec_version: z.string().optional(),
    data: CharacterCardV2DataSchema.optional(),
    // V1 fallback fields
    name: z.string().optional(),
    char_name: z.string().optional(),
    description: z.string().optional(),
    personality: z.string().optional(),
    world_scenario: z.string().optional(),
    first_mes: z.string().optional(),
    mes_example: z.string().optional(),
    creatorcomment: z.string().optional(),
    regex_scripts: z.array(z.any()).optional(),
}).passthrough();
