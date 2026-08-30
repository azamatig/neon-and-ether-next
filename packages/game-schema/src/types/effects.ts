import { z } from 'zod';
import { Vector2DSchema } from './grid.ts';
import { PoiStatusSchema } from './world.ts';
import { RewardDefinitionSchema } from './progression.ts';
import { FactionRelationValueSchema } from './faction.ts';

/**
 * 1. setFlag Effect: Sets a persistent global or local game state flag.
 */
export const SetFlagEffectSchema = z.object({
  type: z.literal('setFlag'),
  flag: z.string().min(1, 'Flag key must not be empty'),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export type SetFlagEffect = z.infer<typeof SetFlagEffectSchema>;

/**
 * 2. changeStat Effect: Mutates primary attributes or derived vitals (HP, Ether, AP, Armor, etc.).
 */
export const ChangeStatEffectSchema = z.object({
  type: z.literal('changeStat'),
  stat: z.string().min(1, 'Stat name must not be empty'),
  delta: z.number().optional(),
  value: z.number().optional(),
  mode: z.enum(['add', 'set', 'multiply']).default('add'),
  targetCharacterId: z.string().optional(),
});

export type ChangeStatEffect = z.infer<typeof ChangeStatEffectSchema>;

/**
 * 3. addItem Effect: Adds items to the player's or NPC's inventory.
 */
export const AddItemEffectSchema = z.object({
  type: z.literal('addItem'),
  itemId: z.string().min(1, 'Item ID must not be empty'),
  quantity: z.number().int().min(1).default(1),
  isEquipped: z.boolean().default(false),
  autoEquip: z.boolean().default(false),
  targetCharacterId: z.string().optional(),
});

export type AddItemEffect = z.infer<typeof AddItemEffectSchema>;

/**
 * 4. removeItem Effect: Removes items from inventory.
 */
export const RemoveItemEffectSchema = z.object({
  type: z.literal('removeItem'),
  itemId: z.string().min(1, 'Item ID must not be empty'),
  quantity: z.number().int().min(1).default(1),
  targetCharacterId: z.string().optional(),
});

export type RemoveItemEffect = z.infer<typeof RemoveItemEffectSchema>;

/**
 * 5. changeMoney Effect: Adds, subtracts, or sets player currency/credits.
 */
export const ChangeMoneyEffectSchema = z.object({
  type: z.literal('changeMoney'),
  amount: z.number().int(),
  mode: z.enum(['add', 'subtract', 'set']).default('add'),
});

export type ChangeMoneyEffect = z.infer<typeof ChangeMoneyEffectSchema>;

/**
 * 6. startQuest Effect: Activates a quest and initializes its stage.
 */
export const StartQuestEffectSchema = z.object({
  type: z.literal('startQuest'),
  questId: z.string().min(1, 'Quest ID must not be empty'),
  initialStageId: z.string().optional(),
});

export type StartQuestEffect = z.infer<typeof StartQuestEffectSchema>;

/**
 * 7. advanceQuest Effect: Transitions quest to target stage or marks objective complete.
 */
export const AdvanceQuestEffectSchema = z.object({
  type: z.literal('advanceQuest'),
  questId: z.string().min(1, 'Quest ID must not be empty'),
  targetStageId: z.string().optional(),
  completeObjectiveId: z.string().optional(),
});

export type AdvanceQuestEffect = z.infer<typeof AdvanceQuestEffectSchema>;

/**
 * 8. completeQuest Effect: Finishes quest with success or failure outcome.
 */
export const CompleteQuestEffectSchema = z.object({
  type: z.literal('completeQuest'),
  questId: z.string().min(1, 'Quest ID must not be empty'),
  outcome: z.enum(['Success', 'Failed']).default('Success'),
  grantRewards: z.boolean().default(true),
});

export type CompleteQuestEffect = z.infer<typeof CompleteQuestEffectSchema>;

/**
 * 9. changeNpcState Effect: Modifies NPC behavior, dialogue, alive status, or map location.
 */
export const ChangeNpcStateEffectSchema = z.object({
  type: z.literal('changeNpcState'),
  npcId: z.string().min(1, 'NPC ID must not be empty'),
  isAlive: z.boolean().optional(),
  behavior: z.enum(['Idle', 'Patrol', 'Guard', 'Wander']).optional(),
  dialogueTreeId: z.string().optional(),
  isMerchant: z.boolean().optional(),
  isCompanion: z.boolean().optional(),
  poiId: z.string().optional(),
  location: z
    .object({
      mapId: z.string().optional(),
      poiId: z.string().optional(),
      position: Vector2DSchema.optional(),
    })
    .optional(),
  customFlag: z
    .object({
      key: z.string().min(1),
      value: z.union([z.string(), z.number(), z.boolean()]),
    })
    .optional(),
});

export type ChangeNpcStateEffect = z.infer<typeof ChangeNpcStateEffectSchema>;

/**
 * 10. changeRelationship Effect: Modifies relationship / affinity value with an NPC.
 */
export const ChangeRelationshipEffectSchema = z.object({
  type: z.literal('changeRelationship'),
  npcId: z.string().min(1, 'NPC ID must not be empty'),
  delta: z.number().int(),
});

export type ChangeRelationshipEffect = z.infer<typeof ChangeRelationshipEffectSchema>;

/**
 * 11. changeFactionReputation Effect: Modifies reputation score with a faction.
 */
export const ChangeFactionReputationEffectSchema = z.object({
  type: z.literal('changeFactionReputation'),
  factionId: z.string().min(1, 'Faction ID must not be empty'),
  delta: z.number().int(),
});

export type ChangeFactionReputationEffect = z.infer<typeof ChangeFactionReputationEffectSchema>;
export const SetFactionReputationEffectSchema = z.object({type:z.literal('setFactionReputation'),factionId:z.string().min(1),value:z.number().int().min(-100).max(100)});
export const ChangeFactionRelationEffectSchema = z.object({type:z.literal('changeFactionRelation'),factionId:z.string().min(1),targetFactionId:z.string().min(1),relation:FactionRelationValueSchema});
export const SetFactionMembershipEffectSchema = z.object({type:z.literal('setFactionMembership'),factionId:z.string().min(1),membershipStatus:z.string().min(1)});
export const DiscoverFactionEffectSchema = z.object({type:z.literal('discoverFaction'),factionId:z.string().min(1),discovered:z.boolean().default(true)});
export const SetFactionHostilityEffectSchema = z.object({type:z.literal('setFactionHostility'),factionId:z.string().min(1),hostile:z.boolean()});
export type FactionStateEffect = z.infer<typeof SetFactionReputationEffectSchema>|z.infer<typeof ChangeFactionRelationEffectSchema>|z.infer<typeof SetFactionMembershipEffectSchema>|z.infer<typeof DiscoverFactionEffectSchema>|z.infer<typeof SetFactionHostilityEffectSchema>;

/**
 * 12. startCombat Effect: Triggers tactical combat encounter.
 */
export const StartCombatEffectSchema = z.object({
  type: z.literal('startCombat'),
  enemyIds: z.array(z.string()).optional(),
  encounterId: z.string().optional(),
  mapId: z.string().optional(),
  poiId: z.string().optional(),
});

export type StartCombatEffect = z.infer<typeof StartCombatEffectSchema>;

/**
 * 13. triggerEvent Effect: Dispatches a narrative or world event.
 */
export const TriggerEventEffectSchema = z.object({
  type: z.literal('triggerEvent'),
  eventId: z.string().min(1, 'Event ID must not be empty'),
  payload: z.record(z.string(), z.any()).optional(),
});

export type TriggerEventEffect = z.infer<typeof TriggerEventEffectSchema>;

/**
 * 14. movePlayer / travelPoi Effect: Relocates player to specific POI or district map.
 */
export const MovePlayerEffectSchema = z.object({
  type: z.literal('movePlayer'),
  mapId: z.string().optional(),
  poiId: z.string().optional(),
  position: Vector2DSchema.optional(),
  facing: z.enum(['North', 'South', 'East', 'West']).optional(),
});

export type MovePlayerEffect = z.infer<typeof MovePlayerEffectSchema>;

export const TravelPoiEffectSchema = z.object({
  type: z.literal('travelPoi'),
  poiId: z.string().min(1, 'Target POI ID is required'),
  mapId: z.string().optional(),
});

export type TravelPoiEffect = z.infer<typeof TravelPoiEffectSchema>;

/**
 * 15. changePoiState Effect: Mutates discovery, visit, lock, or description of a POI.
 */
export const ChangePoiStateEffectSchema = z.object({
  type: z.literal('changePoiState'),
  poiId: z.string().min(1, 'POI ID must not be empty'),
  status: PoiStatusSchema.optional(),
  isDiscovered: z.boolean().optional(),
  isVisited: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  customDescription: z.string().optional(),
  customImage: z.string().optional(),
  completeActionId: z.string().optional(),
});

export type ChangePoiStateEffect = z.infer<typeof ChangePoiStateEffectSchema>;

/**
 * 16. recruitNpc Effect: Recruits NPC into active companions party.
 */
export const RecruitNpcEffectSchema = z.object({
  type: z.literal('recruitNpc'),
  npcId: z.string().min(1, 'NPC ID must not be empty'),
  asCompanion: z.boolean().default(true),
});

export type RecruitNpcEffect = z.infer<typeof RecruitNpcEffectSchema>;

/**
 * 17. advanceTime Effect: Advances the world turn clock and time of day.
 */
export const AdvanceTimeEffectSchema = z.object({
  type: z.literal('advanceTime'),
  turns: z.number().int().min(0).default(1),
  hours: z.number().int().min(0).optional(),
  minutes: z.number().int().min(0).optional(),
  days: z.number().int().min(0).optional(),
});

export type AdvanceTimeEffect = z.infer<typeof AdvanceTimeEffectSchema>;

export const GrantRewardsEffectSchema = RewardDefinitionSchema.extend({ type: z.literal('grantRewards') });
export type GrantRewardsEffect = z.infer<typeof GrantRewardsEffectSchema>;
export const SetWeatherEffectSchema = z.object({ type:z.literal('setWeather'), weatherId:z.string().min(1), mapId:z.string().optional(), regionId:z.string().optional(), durationMinutes:z.number().int().positive().optional() });
export const ChangeWeatherEffectSchema = z.object({ type:z.literal('changeWeather'), weatherProfileId:z.string().optional(), mapId:z.string().optional(), regionId:z.string().optional() });
export type SetWeatherEffect=z.infer<typeof SetWeatherEffectSchema>;
export type ChangeWeatherEffect=z.infer<typeof ChangeWeatherEffectSchema>;
/** Generic persistent character status application shared by combat, events, items, and environments. */
export const ApplyStatusEffectSchema=z.object({type:z.literal('applyStatusEffect'),statusEffectId:z.string().min(1),durationTurns:z.number().int().positive(),targetCharacterId:z.string().optional()});
export type ApplyStatusEffect=z.infer<typeof ApplyStatusEffectSchema>;

/**
 * Universal Effect Discriminated Union.
 */
export const EffectSchema = z.discriminatedUnion('type', [
  SetFlagEffectSchema,
  ChangeStatEffectSchema,
  AddItemEffectSchema,
  RemoveItemEffectSchema,
  ChangeMoneyEffectSchema,
  StartQuestEffectSchema,
  AdvanceQuestEffectSchema,
  CompleteQuestEffectSchema,
  ChangeNpcStateEffectSchema,
  ChangeRelationshipEffectSchema,
  ChangeFactionReputationEffectSchema,
  SetFactionReputationEffectSchema,
  ChangeFactionRelationEffectSchema,
  SetFactionMembershipEffectSchema,
  DiscoverFactionEffectSchema,
  SetFactionHostilityEffectSchema,
  StartCombatEffectSchema,
  TriggerEventEffectSchema,
  MovePlayerEffectSchema,
  TravelPoiEffectSchema,
  ChangePoiStateEffectSchema,
  RecruitNpcEffectSchema,
  AdvanceTimeEffectSchema,
  GrantRewardsEffectSchema,
  SetWeatherEffectSchema,
  ChangeWeatherEffectSchema,
  ApplyStatusEffectSchema,
]);

export type Effect = z.infer<typeof EffectSchema>;
