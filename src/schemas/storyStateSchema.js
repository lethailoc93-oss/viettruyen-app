import { z } from 'zod';

export const CharacterStateSchema = z.object({
    name: z.string(),
    role: z.string().optional(),
    description: z.string().optional(),
    personality: z.string().optional(),
    newState: z.string().optional()
});

export const CharacterUpdateSchema = z.object({
    name: z.string(),
    newInfo: z.string().optional(),
    newState: z.string().optional(),
    currentLocation: z.string().optional(),
    currentGoal: z.string().optional(),
    currentBodyState: z.string().optional(),
    specialStatus: z.string().optional()
});

export const SettingSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    newState: z.string().optional()
});

export const SettingUpdateSchema = z.object({
    name: z.string(),
    newInfo: z.string().optional(),
    newState: z.string().optional()
});

export const AbilitySchema = z.object({
    name: z.string(),
    owner: z.string().optional(),
    effect: z.string().optional(),
    limitation: z.string().optional(),
    newState: z.string().optional()
});

export const AbilityUpdateSchema = z.object({
    name: z.string(),
    newInfo: z.string().optional(),
    newState: z.string().optional()
});

export const ItemSchema = z.object({
    name: z.string(),
    owner: z.string().optional(),
    quantity: z.union([z.number(), z.string()]).optional(),
    effect: z.string().optional(),
    newState: z.string().optional()
});

export const ItemUpdateSchema = z.object({
    name: z.string(),
    newInfo: z.string().optional(),
    quantity: z.union([z.number(), z.string()]).optional(),
    newOwner: z.string().optional(),
    newState: z.string().optional()
});

export const OrganizationSchema = z.object({
    name: z.string(),
    purpose: z.string().optional(),
    newState: z.string().optional()
});

export const OrganizationUpdateSchema = z.object({
    name: z.string(),
    newInfo: z.string().optional(),
    newState: z.string().optional()
});

export const TimelineEventSchema = z.object({
    title: z.string().optional(),
    name: z.string().optional(), // Fallback
    description: z.string().optional()
});

export const EventLogSchema = z.object({
    chain: z.string().optional()
});

export const ForeshadowingSeedSchema = z.object({
    hint: z.string().optional(),
    targetEvent: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low']).optional()
});

export const CurrentStateSchema = z.object({
    time: z.string().optional(),
    location: z.string().optional()
});

export const AIScanOutputSchema = z.object({
    summary: z.string().optional(),
    recap: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    characters: z.array(CharacterStateSchema).default([]),
    characterUpdates: z.array(CharacterUpdateSchema).default([]),
    settings: z.array(SettingSchema).default([]),
    settingUpdates: z.array(SettingUpdateSchema).default([]),
    abilities: z.array(AbilitySchema).default([]),
    abilityUpdates: z.array(AbilityUpdateSchema).default([]),
    items: z.array(ItemSchema).default([]),
    itemUpdates: z.array(ItemUpdateSchema).default([]),
    organizations: z.array(OrganizationSchema).default([]),
    organizationUpdates: z.array(OrganizationUpdateSchema).default([]),
    currentState: CurrentStateSchema.optional().nullable(),
    timeline: z.array(TimelineEventSchema).default([]),
    eventLog: z.array(EventLogSchema).default([]),
    foreshadowingSeeds: z.array(ForeshadowingSeedSchema).default([])
});
