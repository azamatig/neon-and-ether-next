/**
 * @neon-ether/game-schema
 * Unified Resolution Objects Schema.
 * Pre-computed, immutable resolution data for Action, Event, Combat, Loot, and Post-Combat phases.
 */

import { z } from 'zod';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';
import { InventoryItemSlotSchema } from './runtime-state.ts';
import { GameplayOutcome, GameplayOutcomeSchema, OriginContextSchema } from './outcomes.ts';

export const ActionResolutionSchema = z.object({
  actionId: z.string(),
  actionLabel: z.string(),
  title: z.string(),
  resultText: z.string(),
  status: z.enum(['Success', 'Failure', 'PartialSuccess']).default('Success'),
  costsSpent: z
    .object({
      ap: z.number().optional(),
      ether: z.number().optional(),
      credits: z.number().optional(),
      hp: z.number().optional(),
    })
    .optional(),
  gainedItems: z
    .array(
      z.object({
        itemId: z.string(),
        quantity: z.number().int().min(1),
        name: z.string().optional(),
      })
    )
    .default([]),
  lostItems: z
    .array(
      z.object({
        itemId: z.string(),
        quantity: z.number().int().min(1),
        name: z.string().optional(),
      })
    )
    .default([]),
  creditsDelta: z.number().int().default(0),
  xpGained: z.number().int().default(0),
  statChanges: z
    .array(
      z.object({
        stat: z.string(),
        delta: z.number().optional(),
        value: z.number().optional(),
        label: z.string().optional(),
      })
    )
    .default([]),
  relationshipChanges: z
    .array(
      z.object({
        npcId: z.string(),
        npcName: z.string().optional(),
        delta: z.number().int(),
      })
    )
    .default([]),
  factionRepChanges: z
    .array(
      z.object({
        factionId: z.string(),
        factionName: z.string().optional(),
        delta: z.number().int(),
      })
    )
    .default([]),
  statusEffectsGained: z.array(z.string()).default([]),
  statusEffectsRemoved: z.array(z.string()).default([]),
  flagsChanged: z.record(z.string(), z.any()).default({}),
  discoveredIntel: z.array(z.string()).default([]),
  unmetReason: z.string().optional(),
  nextOutcome: z.custom<GameplayOutcome>().optional(),
});

export type ActionResolution = z.infer<typeof ActionResolutionSchema>;

export const CombatIncapacitatedEnemySchema = z.object({
  id: z.string(),
  enemyId: z.string(),
  name: z.string(),
  portrait: z.string().optional(),
  status: z.enum(['Incapacitated', 'Surrendered', 'Restrained']).default('Incapacitated'),
  canBeInterrogated: z.boolean().default(true),
  canBeCaptured: z.boolean().default(true),
  canBeSearched: z.boolean().default(true),
  intelAvailable: z.string().optional(),
});

export type CombatIncapacitatedEnemy = z.infer<typeof CombatIncapacitatedEnemySchema>;

export const CombatResolutionSchema = z.object({
  encounterId: z.string(),
  encounterName: z.string(),
  victoryStatus: z.enum(['Victory', 'Defeat', 'Escape', 'Surrender']),
  roundsPlayed: z.number().int().min(0).default(1),
  xpGained: z.number().int().min(0).default(0),
  playerXp: z.number().int().min(0).default(0),
  companionXp: z.record(z.string(), z.number().int()).default({}),
  partyInjuries: z.array(z.string()).default([]),
  playerStatusEffects: z.array(z.string()).default([]),
  unconsciousCompanions: z.array(z.string()).default([]),
  deadCompanions: z.array(z.string()).default([]),
  enemyCasualties: z
    .array(
      z.object({
        enemyId: z.string(),
        name: z.string(),
        count: z.number().int().min(1),
      })
    )
    .default([]),
  incapacitatedEnemies: z.array(CombatIncapacitatedEnemySchema).default([]),
  resourcesFound: z.record(z.string(), z.number()).default({}),
  availableLoot: z.array(InventoryItemSlotSchema).default([]),
  creditsFound: z.number().int().default(0),
  questProgressSummaries: z.array(z.string()).default([]),
  logEntries: z.array(z.string()).default([]),
  originContext: OriginContextSchema.optional(),
  nextOutcome: z.custom<GameplayOutcome>().optional(),
});

export type CombatResolution = z.infer<typeof CombatResolutionSchema>;

export const PostCombatActionDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().default('Zap'),
  description: z.string().optional(),
  conditions: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
  outcome: z.custom<GameplayOutcome>().optional(),
  disabledReason: z.string().optional(),
});

export type PostCombatActionDefinition = z.infer<typeof PostCombatActionDefinitionSchema>;

export const PostCombatResolutionSchema = z.object({
  targetEnemyId: z.string(),
  targetEnemyName: z.string(),
  actionId: z.string(),
  actionLabel: z.string(),
  summaryText: z.string(),
  effectsApplied: z.array(EffectSchema).default([]),
  nextOutcome: z.custom<GameplayOutcome>().optional(),
});

export type PostCombatResolution = z.infer<typeof PostCombatResolutionSchema>;

export const LootResolutionSchema = z.object({
  availableItems: z.array(InventoryItemSlotSchema).default([]),
  credits: z.number().int().default(0),
  takenItems: z.array(InventoryItemSlotSchema).default([]),
  takenCredits: z.number().int().default(0),
  leftItems: z.array(InventoryItemSlotSchema).default([]),
  leftCredits: z.number().int().default(0),
});

export type LootResolution = z.infer<typeof LootResolutionSchema>;
