import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';

export const CombatTargetSchema = z.enum(['Enemy', 'Ally', 'Self']);
export const AbilityEffectSchema = z.object({
  type: z.enum(['Damage', 'Heal', 'ApplyStatus']),
  min: z.number().int().default(0),
  max: z.number().int().default(0),
  statusEffectId: z.string().optional(),
  durationTurns: z.number().int().min(1).optional(),
});

export const AbilitySchema = BaseEntitySchema.extend({
  apCost: z.number().int().min(0).default(2),
  etherCost: z.number().int().min(0).default(0),
  target: CombatTargetSchema.default('Enemy'),
  effects: z.array(AbilityEffectSchema).min(1),
  icon: z.string().default('Zap'),
});
export type Ability = z.infer<typeof AbilitySchema>;

export const StatusEffectDefinitionSchema = BaseEntitySchema.extend({
  tickTiming: z.enum(['TurnStart', 'TurnEnd']).default('TurnEnd'),
  damagePerTick: z.number().int().min(0).default(0),
  healingPerTick: z.number().int().min(0).default(0),
  armorModifier: z.number().int().default(0),
  icon: z.string().default('Activity'),
});
export type StatusEffectDefinition = z.infer<typeof StatusEffectDefinitionSchema>;

export const CombatAIProfileSchema = BaseEntitySchema.extend({
  aggression: z.number().min(0).max(1).default(0.5),
  preferredTarget: z.enum(['LowestHp', 'HighestThreat', 'Random']).default('LowestHp'),
  abilityPriority: z.array(z.string()).default([]),
});
export type CombatAI = z.infer<typeof CombatAIProfileSchema>;

export const CombatantStatusSchema = z.object({
  statusEffectId: z.string(),
  remainingTurns: z.number().int().min(0),
  sourceCombatantId: z.string().optional(),
});

export const CombatantSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  name: z.string(),
  team: z.enum(['Player', 'Enemy']),
  currentHp: z.number().int().min(0),
  maxHp: z.number().int().min(1),
  currentEther: z.number().int().min(0),
  maxEther: z.number().int().min(0),
  currentAp: z.number().int().min(0),
  maxAp: z.number().int().min(0),
  initiative: z.number(),
  armor: z.number().int().min(0),
  weaponId: z.string().optional(),
  armorItemIds: z.array(z.string()).default([]),
  abilityIds: z.array(z.string()).default([]),
  aiProfileId: z.string().optional(),
  statuses: z.array(CombatantStatusSchema).default([]),
  isDefeated: z.boolean().default(false),
});
export type Combatant = z.infer<typeof CombatantSchema>;

export const CombatActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Attack'), actorId: z.string(), targetId: z.string() }),
  z.object({ type: z.literal('Ability'), actorId: z.string(), targetId: z.string(), abilityId: z.string() }),
  z.object({ type: z.literal('EndTurn'), actorId: z.string() }),
]);
export type CombatAction = z.infer<typeof CombatActionSchema>;
export type TurnOrder = string[];

export const CombatLogEntrySchema = z.object({
  id: z.string(), round: z.number().int(), message: z.string(),
});

export const CombatStateSchema = z.object({
  encounterId: z.string().nullable().default(null),
  isActive: z.boolean().default(false),
  roundNumber: z.number().int().min(0).default(0),
  turnOrder: z.array(z.string()).default([]),
  activeTurnIndex: z.number().int().min(0).default(0),
  combatants: z.record(z.string(), CombatantSchema).default({}),
  log: z.array(CombatLogEntrySchema).default([]),
  outcome: z.enum(['Victory', 'Defeat']).nullable().default(null),
});
export type CombatState = z.infer<typeof CombatStateSchema>;
