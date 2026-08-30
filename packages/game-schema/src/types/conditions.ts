import { z } from 'zod';
import { FactionRelationValueSchema } from './faction.ts';
import { Vector2DSchema } from './grid.ts';

/**
 * Universal comparison operators for conditions.
 */
export const ComparisonOperatorSchema = z.enum([
  '==',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
]);

export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;

/**
 * 1. Flag Condition: Checks boolean/string/number game flags.
 */
export const FlagConditionSchema = z.object({
  type: z.literal('flag'),
  flag: z.string().min(1, 'Flag key must not be empty'),
  operator: ComparisonOperatorSchema.default('=='),
  value: z.union([z.string(), z.number(), z.boolean()]).default(true),
});

export type FlagCondition = z.infer<typeof FlagConditionSchema>;

/**
 * 2. Player Stat Condition: Checks primary attributes, derived vitals, level, or credits.
 */
export const PlayerStatConditionSchema = z.object({
  type: z.literal('playerStat'),
  stat: z.string().min(1, 'Stat name must not be empty'), // e.g. 'body', 'mind', 'currentHp', 'maxEther', 'level', 'credits'
  operator: ComparisonOperatorSchema.default('>='),
  value: z.number(),
  targetCharacterId: z.string().optional(), // Default to player if omitted
});

export type PlayerStatCondition = z.infer<typeof PlayerStatConditionSchema>;

/**
 * 3. Has Item Condition: Checks player or entity inventory for item ID and quantity.
 */
export const HasItemConditionSchema = z.object({
  type: z.literal('hasItem'),
  itemId: z.string().min(1, 'Item ID must not be empty'),
  quantity: z.number().int().min(1).default(1),
  operator: ComparisonOperatorSchema.default('>='),
  requireEquipped: z.boolean().default(false),
  targetCharacterId: z.string().optional(), // Default to player if omitted
});

export type HasItemCondition = z.infer<typeof HasItemConditionSchema>;

/**
 * 4. Quest State Condition: Checks quest assignment, status, or specific stage.
 */
export const QuestStateConditionSchema = z.object({
  type: z.literal('questState'),
  questId: z.string().min(1, 'Quest ID must not be empty'),
  status: z.enum(['NotStarted', 'Active', 'Completed', 'Failed']).optional(),
  stageId: z.string().optional(),
  operator: z.enum(['==', '!=']).default('=='),
});

export type QuestStateCondition = z.infer<typeof QuestStateConditionSchema>;

/**
 * 5. NPC State Condition: Checks status (alive, merchant, companion, location, behavior) of an NPC.
 */
export const NpcStateConditionSchema = z.object({
  type: z.literal('npcState'),
  npcId: z.string().min(1, 'NPC ID must not be empty'),
  isAlive: z.boolean().optional(),
  isMerchant: z.boolean().optional(),
  isCompanion: z.boolean().optional(),
  behavior: z.string().optional(),
  locationMapId: z.string().optional(),
  flagKey: z.string().optional(),
  flagValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export type NpcStateCondition = z.infer<typeof NpcStateConditionSchema>;

/**
 * 6. Relationship Condition: Checks affinity / relationship score with an NPC.
 */
export const RelationshipConditionSchema = z.object({
  type: z.literal('relationship'),
  npcId: z.string().min(1, 'NPC ID must not be empty'),
  operator: ComparisonOperatorSchema.default('>='),
  value: z.number(),
});

export type RelationshipCondition = z.infer<typeof RelationshipConditionSchema>;

/**
 * 7. Faction Reputation Condition: Checks reputation level with a faction.
 */
export const FactionReputationConditionSchema = z.object({
  type: z.literal('factionReputation'),
  factionId: z.string().min(1, 'Faction ID must not be empty'),
  operator: ComparisonOperatorSchema.default('>='),
  value: z.number(),
});

export type FactionReputationCondition = z.infer<typeof FactionReputationConditionSchema>;

export const FactionReputationTierConditionSchema = z.object({ type:z.literal('factionReputationTier'), factionId:z.string().min(1), tierId:z.string().min(1) });
export const FactionMembershipConditionSchema = z.object({ type:z.literal('factionMembership'), factionId:z.string().min(1), membershipStatus:z.string().min(1) });
export const FactionRelationConditionSchema = z.object({ type:z.literal('factionRelation'), factionId:z.string().min(1), targetFactionId:z.string().min(1), relation:FactionRelationValueSchema });
export const FactionHostileConditionSchema = z.object({ type:z.literal('factionHostile'), factionId:z.string().min(1), hostile:z.boolean().default(true) });
export const FactionDiscoveredConditionSchema = z.object({ type:z.literal('factionDiscovered'), factionId:z.string().min(1), discovered:z.boolean().default(true) });
export type FactionStateCondition = z.infer<typeof FactionReputationTierConditionSchema>|z.infer<typeof FactionMembershipConditionSchema>|z.infer<typeof FactionRelationConditionSchema>|z.infer<typeof FactionHostileConditionSchema>|z.infer<typeof FactionDiscoveredConditionSchema>;

/**
 * 8. Companion Present Condition: Checks if a companion NPC is recruited or present in party.
 */
export const CompanionPresentConditionSchema = z.object({
  type: z.literal('companionPresent'),
  companionId: z.string().min(1, 'Companion ID must not be empty'),
  inParty: z.boolean().default(true),
});

export type CompanionPresentCondition = z.infer<typeof CompanionPresentConditionSchema>;

/**
 * 9. Base Room Exists Condition: Checks if a player base room has been constructed.
 */
export const BaseRoomExistsConditionSchema = z.object({
  type: z.literal('baseRoomExists'),
  roomId: z.string().min(1, 'Room ID must not be empty'),
  minLevel: z.number().int().min(1).default(1),
});

export type BaseRoomExistsCondition = z.infer<typeof BaseRoomExistsConditionSchema>;

/**
 * 10. Random Chance Condition: Evaluates a probability threshold (0.0 to 1.0).
 */
export const RandomChanceConditionSchema = z.object({
  type: z.literal('randomChance'),
  probability: z.number().min(0).max(1), // e.g. 0.75 for 75%
  seedOffset: z.number().optional(),
});

export type RandomChanceCondition = z.infer<typeof RandomChanceConditionSchema>;

export const TimeConditionSchema = z.object({
  type: z.literal('time'),
  field: z.enum(['day','hour','minute','turnCount','timeOfDay']),
  operator: ComparisonOperatorSchema.default('=='),
  value: z.union([z.number(), z.enum(['Dawn','Day','Dusk','Night'])]),
});
export type TimeCondition = z.infer<typeof TimeConditionSchema>;
export const CurrentWeatherConditionSchema = z.object({ type:z.literal('currentWeather'), weatherId:z.string().min(1), mapId:z.string().optional(), regionId:z.string().optional() });
export const WeatherTagConditionSchema = z.object({ type:z.literal('weatherTag'), tag:z.string().min(1), mapId:z.string().optional(), regionId:z.string().optional() });
export const EnvironmentTagConditionSchema = z.object({ type:z.literal('environmentTag'), tag:z.string().min(1), mapId:z.string().optional(), regionId:z.string().optional() });

/**
 * Base atomic condition types union.
 */
export const AtomicConditionSchema = z.discriminatedUnion('type', [
  FlagConditionSchema,
  PlayerStatConditionSchema,
  HasItemConditionSchema,
  QuestStateConditionSchema,
  NpcStateConditionSchema,
  RelationshipConditionSchema,
  FactionReputationConditionSchema,
  FactionReputationTierConditionSchema,
  FactionMembershipConditionSchema,
  FactionRelationConditionSchema,
  FactionHostileConditionSchema,
  FactionDiscoveredConditionSchema,
  CompanionPresentConditionSchema,
  BaseRoomExistsConditionSchema,
  RandomChanceConditionSchema,
  TimeConditionSchema,
  CurrentWeatherConditionSchema,
  WeatherTagConditionSchema,
  EnvironmentTagConditionSchema,
]);

export type AtomicCondition = z.infer<typeof AtomicConditionSchema>;

/**
 * Recursive schema supporting AND, OR, and NOT combinators.
 */
export type Condition =
  | AtomicCondition
  | { type: 'and'; conditions: Condition[] }
  | { type: 'or'; conditions: Condition[] }
  | { type: 'not'; condition: Condition };

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    AtomicConditionSchema,
    z.object({
      type: z.literal('and'),
      conditions: z.array(ConditionSchema).min(1),
    }),
    z.object({
      type: z.literal('or'),
      conditions: z.array(ConditionSchema).min(1),
    }),
    z.object({
      type: z.literal('not'),
      condition: ConditionSchema,
    }),
  ])
);
