import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { GridTileSchema } from './grid.ts';

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
  requiredTargetTags:z.array(z.string()).default([]),
  excludedTargetTags:z.array(z.string()).default([]),
  rangeTiles: z.number().int().min(0).default(6),
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

export const CombatGridPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const CombatGridSchema = z.object({
  width: z.number().int().min(4).default(8),
  height: z.number().int().min(3).default(6),
  movementApCost: z.number().int().min(1).default(1),
  tiles: z.array(GridTileSchema).default([]),
  blockingCells: z.array(CombatGridPositionSchema).default([]),
  playerDeployment: z.array(CombatGridPositionSchema).default([]),
  enemyDeployment: z.array(CombatGridPositionSchema).default([]),
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
  position: CombatGridPositionSchema.default({ x: 0, y: 0 }),
  movementRange: z.number().int().min(1).default(3),
  movementRemaining: z.number().int().min(0).default(3),
});
export type Combatant = z.infer<typeof CombatantSchema>;

export const CombatActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Attack'), actorId: z.string(), targetId: z.string() }),
  z.object({ type: z.literal('Ability'), actorId: z.string(), targetId: z.string(), abilityId: z.string() }),
  z.object({ type: z.literal('Move'), actorId: z.string(), position: CombatGridPositionSchema }),
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
  phase: z.enum(['PREPARING', 'ACTIVE', 'VICTORY', 'DEFEAT']).default('PREPARING'),
  roundNumber: z.number().int().min(0).default(0),
  turnOrder: z.array(z.string()).default([]),
  activeTurnIndex: z.number().int().min(0).default(0),
  activeCombatantId: z.string().nullable().default(null),
  combatants: z.record(z.string(), CombatantSchema).default({}),
  log: z.array(CombatLogEntrySchema).default([]),
  outcome: z.enum(['Victory', 'Defeat']).nullable().default(null),
  grid: CombatGridSchema.default({ width: 8, height: 6, movementApCost: 1, tiles: [], blockingCells: [], playerDeployment: [], enemyDeployment: [] }),
});
export type CombatState = z.infer<typeof CombatStateSchema>;
