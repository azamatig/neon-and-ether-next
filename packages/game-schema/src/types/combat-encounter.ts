/**
 * @neon-ether/game-schema
 * Combat Encounter & Pre-Combat Preview Schemas.
 * Encapsulates combat environment, enemy setups, data-driven escape rules, and victory/defeat outcomes.
 */

import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';
import { GameplayOutcome, GameplayOutcomeSchema, OriginContextSchema } from './outcomes.ts';
import { PostCombatActionDefinitionSchema } from './resolutions.ts';

export const EnemyGroupSetupSchema = z.object({
  enemyId: z.string().min(1),
  count: z.number().int().min(1).default(1),
  nameOverride: z.string().optional(),
  portraitOverride: z.string().optional(),
  threatTier: z.enum(['Minion', 'Standard', 'Elite', 'Boss']).default('Standard'),
  isBoss: z.boolean().default(false),
  isUnknown: z.boolean().default(false),
  customHp: z.number().int().min(1).optional(),
});

export type EnemyGroupSetup = z.infer<typeof EnemyGroupSetupSchema>;

export const EscapeRulesSchema = z.object({
  allowed: z.boolean().default(true),
  conditions: z.array(ConditionSchema).default([]),
  check: z
    .object({
      stat: z.enum(['body', 'reflexes', 'mind', 'etherTech', 'presence']).default('reflexes'),
      difficulty: z.number().int().min(1).default(12),
      apCost: z.number().int().min(0).default(2),
    })
    .optional(),
  disabledReason: z.string().optional(),
  outcomeOnEscape: z.custom<GameplayOutcome>().optional(),
});

export type EscapeRules = z.infer<typeof EscapeRulesSchema>;

export const CombatLootDropSchema = z.object({
  itemId: z.string().min(1),
  minQuantity: z.number().int().min(1).default(1),
  maxQuantity: z.number().int().min(1).default(1),
  dropRate: z.number().min(0).max(1).default(1.0),
});

export type CombatLootDrop = z.infer<typeof CombatLootDropSchema>;

export const EncounterModifierSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  conditions: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
});

export type EncounterModifier = z.infer<typeof EncounterModifierSchema>;

export const CombatEncounterSchema = BaseEntitySchema.extend({
  enemyGroups: z.array(EnemyGroupSetupSchema).min(1, 'Combat encounter must have at least one enemy group'),
  environment: z
    .object({
      ambientEtherLevel: z.number().int().min(0).max(100).default(20),
      lighting: z.enum(['Normal', 'Dim', 'Dark', 'Strobe']).default('Normal'),
      hazardDescription: z.string().optional(),
    })
    .default({ ambientEtherLevel: 20, lighting: 'Normal' }),
  threatLevel: z.number().int().min(1).max(5).default(1),
  initialConditions: z.array(ConditionSchema).default([]),
  modifiers: z.array(EncounterModifierSchema).default([]),
  escapeRules: EscapeRulesSchema.default({ allowed: true, conditions: [] }),
  victoryOutcome: z.custom<GameplayOutcome>().optional(),
  defeatOutcome: z.custom<GameplayOutcome>().optional(),
  surrenderOutcome: z.custom<GameplayOutcome>().optional(),
  lootTable: z.array(CombatLootDropSchema).default([]),
  creditsReward: z.object({ min: z.number().int().default(50), max: z.number().int().default(150) }).default({ min: 50, max: 150 }),
  xpReward: z.number().int().min(0).default(100),
  survivingEnemyActions: z.array(PostCombatActionDefinitionSchema).default([]),
  tags: z.array(z.string()).default(['Encounter']),
});

export type CombatEncounter = z.infer<typeof CombatEncounterSchema>;
