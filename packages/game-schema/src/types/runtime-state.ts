/**
 * @neon-ether/game-schema
 * Pure serializable runtime state definitions (Zod schemas & TypeScript types).
 * Separates static content definitions (blueprints) from mutable runtime state.
 */

import { z } from 'zod';
import { Vector2DSchema } from './grid.ts';
import { CharacterAttributesSchema, CharacterStatModifierSchema, CharacterStatusEffectSchema, DerivedVitalsSchema, SkillsSchema } from './stats.ts';
import { QuestStatusSchema } from './quest.ts';
import { CombatStateSchema } from './combat.ts';
import { CharacterAssignmentSchema, CharacterRelationshipSchema } from './character-management.ts';
import { PoiStatusSchema } from './world.ts';
import { ActionResolutionSchema, CombatResolutionSchema, PostCombatResolutionSchema } from './resolutions.ts';
import { GameplayOutcomeSchema } from './outcomes.ts';
import { InventoryEntrySchema, InventoryItemSlotSchema } from './inventory-state.ts';
import {MinigameSessionSchema} from './minigame.ts';
export type { InventoryEntry, InventoryItemSlot } from './inventory-state.ts';
export { InventoryEntrySchema, InventoryItemSlotSchema } from './inventory-state.ts';

export const DirectionSchema = z.enum(['North', 'South', 'East', 'West']);
export type Direction = z.infer<typeof DirectionSchema>;

// -----------------------------------------------------------------------------
// 1. Inventory Runtime State
// -----------------------------------------------------------------------------

export const EquipmentStateSchema = z.object({
  slots: z.record(z.string(), z.string().nullable()).default({}),
  appliedModifiers: z.record(z.string(), z.number()).default({}),
});
export type EquipmentState = z.infer<typeof EquipmentStateSchema>;

export const InventoryStateSchema = z.object({
  items: z.array(InventoryItemSlotSchema).default([]),
  credits: z.number().int().min(0).default(0),
  maxSlots: z.number().int().min(1).optional(),
  maxWeight: z.number().min(0).optional(),
});

export type InventoryState = z.infer<typeof InventoryStateSchema>;
export const ShopRuntimeStateSchema=z.object({shopId:z.string().min(1),stock:z.record(z.string(),z.number().int().min(0)).default({}),lastRestockTurn:z.number().int().min(0).default(0)});
export type ShopRuntimeState=z.infer<typeof ShopRuntimeStateSchema>;

// -----------------------------------------------------------------------------
// 2. Player Runtime State
// -----------------------------------------------------------------------------

export const ActiveStatusEffectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  durationTurns: z.number().int().min(0),
  magnitude: z.number().optional(),
  icon: z.string().optional(),
});

export type ActiveStatusEffect = z.infer<typeof ActiveStatusEffectSchema>;

export const PlayerStateSchema = z.object({
  characterId: z.string().default('player'),
  name: z.string().default('Player'),
  age: z.number().int().min(1).optional(),
  portraitId: z.string().optional(),
  backgroundId: z.string().optional(),
  title: z.string().default('Drifter'),
  level: z.number().int().min(1).default(1),
  experience: z.number().int().min(0).default(0),
  attributePointsUnspent: z.number().int().min(0).default(0),
  skillPointsUnspent: z.number().int().min(0).default(0),
  perkPointsUnspent: z.number().int().min(0).default(0),
  skillExperience: z.record(z.string(), z.number().int().min(0)).default({}),
  progressionDefinitionId: z.string().optional(),
  factionId: z.string().default('Neutral'),
  attributes: CharacterAttributesSchema.default({
    body: 12,
    reflexes: 14,
    mind: 16,
    etherTech: 15,
    presence: 11,
  }),
  skills: SkillsSchema,
  vitals: DerivedVitalsSchema.default({
    maxHp: 38,
    currentHp: 38,
    maxEther: 50,
    currentEther: 45,
    actionPointsMax: 8,
    actionPointsCurrent: 8,
    initiative: 14,
    armorRating: 3,
    etherResistance: 15,
  }),
  position: Vector2DSchema.default({ x: 0, y: 0 }),
  facing: DirectionSchema.default('South'),
  inventory: InventoryStateSchema.default({
    items: [],
    credits: 500,
    maxSlots: 30,
    maxWeight: 100,
  }),
  equipment: EquipmentStateSchema.default({ slots: {}, appliedModifiers: {} }),
  traits: z.array(z.string()).default([]),
  perks: z.array(z.string()).default([]),
  abilityIds: z.array(z.string()).default([]),
  temporaryModifiers: z.array(CharacterStatModifierSchema).default([]),
  statusEffects: z.array(CharacterStatusEffectSchema).default([]),
  activeStatusEffects: z.array(ActiveStatusEffectSchema).default([]),
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;

// -----------------------------------------------------------------------------
// 3. NPC Runtime State (Mutable state only, not full content definition)
// -----------------------------------------------------------------------------

export const NpcRuntimeStateSchema = z.object({
  npcId: z.string().min(1),
  level: z.number().int().min(1).default(1),
  experience: z.number().int().min(0).default(0),
  skills: SkillsSchema,
  skillExperience: z.record(z.string(), z.number().int().min(0)).default({}),
  skillPointsUnspent: z.number().int().min(0).default(0),
  perkPointsUnspent: z.number().int().min(0).default(0),
  progressionDefinitionId: z.string().optional(),
  mapId: z.string().min(1),
  poiId: z.string().optional(),
  isAlive: z.boolean().default(true),
  currentHp: z.number().int().min(0),
  maxHp: z.number().int().min(1).optional(),
  currentEther: z.number().int().min(0).optional(),
  position: Vector2DSchema.default({ x: 0, y: 0 }),
  facing: DirectionSchema.default('South'),
  behaviorOverride: z.enum(['Idle', 'Patrol', 'Guard', 'Wander']).optional(),
  dialogueTreeIdOverride: z.string().optional(),
  isHostile: z.boolean().default(false),
  hostilityOverride: z.boolean().optional(),
  isMerchant: z.boolean().default(false),
  isCompanion: z.boolean().default(false),
  relationship: CharacterRelationshipSchema.default({ status: 'independent', affinity: 0, trust: 0, fear: 0, loyalty: 0 }),
  assignment: CharacterAssignmentSchema.default({ jobId: null, roomId: null, partySlotId: null }),
  inventory: InventoryStateSchema.optional(),
  flags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type NpcRuntimeState = z.infer<typeof NpcRuntimeStateSchema>;

// -----------------------------------------------------------------------------
// 4. Quest Runtime State
// -----------------------------------------------------------------------------

export const QuestRuntimeStateSchema = z.object({
  questId: z.string().min(1),
  status: QuestStatusSchema.default('Unassigned'),
  currentStageId: z.string().default('stage_01'),
  completedObjectiveIds: z.array(z.string()).default([]),
  failedObjectiveIds: z.array(z.string()).default([]),
  objectiveCounters: z.record(z.string(), z.number()).default({}),
  startedAtTurn: z.number().int().optional(),
  completedAtTurn: z.number().int().optional(),
  customVariables: z.record(z.string(), z.any()).default({}),
});

export type QuestRuntimeState = z.infer<typeof QuestRuntimeStateSchema>;

// -----------------------------------------------------------------------------
// 5. Base & Hideout Runtime State
// -----------------------------------------------------------------------------

export const BaseRoomRuntimeStateSchema = z.object({
  roomId: z.string().min(1),
  definitionId: z.string().min(1),
  slotId: z.string().min(1),
  isBuilt: z.boolean().default(false),
  level: z.number().int().min(0).default(1),
  assignedNpcIds: z.array(z.string()).default([]),
  productionProgress: z.number().min(0).max(100).default(0),
  upgradeFinishedTurn: z.number().int().optional(),
  installedUpgradeIds: z.array(z.string()).default([]),
  modifiers: z.record(z.string(), z.number()).default({}),
  capacity: z.object({ residents: z.number().int().min(0), workers: z.number().int().min(0), storage: z.number().int().min(0) }),
});

export type BaseRoomRuntimeState = z.infer<typeof BaseRoomRuntimeStateSchema>;

export const BaseStateSchema = z.object({
  baseId: z.string().default('base_player'),
  name: z.string().default('Player Base'),
  rooms: z.record(z.string(), BaseRoomRuntimeStateSchema).default({}),
  roomSlots: z.record(z.string(), z.object({ slotId: z.string(), slotType: z.string(), roomInstanceId: z.string().nullable(), isLocked: z.boolean().default(false) })).default({}),
  residentNpcIds: z.array(z.string()).default([]),
  storage: z.object({ items: z.array(InventoryItemSlotSchema).default([]), capacity: z.number().int().min(0).default(20) }).default({ items: [], capacity: 20 }),
  resources: z.record(z.string(), z.number().int().min(0)).default({}),
  unlockedUpgrades: z.array(z.string()).default([]),
  modifiers: z.record(z.string(), z.number()).default({}),
  stationedCompanionIds: z.array(z.string()).default([]),
});

export type BaseState = z.infer<typeof BaseStateSchema>;

// -----------------------------------------------------------------------------
// 6. Faction Runtime State
// -----------------------------------------------------------------------------

export const FactionStandingSchema = z.string();
export type FactionStanding = z.infer<typeof FactionStandingSchema>;

export const FactionRuntimeStateSchema = z.object({
  factionId: z.string().min(1),
  reputation: z.number().int().min(-100).max(100).default(0),
  standing: FactionStandingSchema.default(''),
  reputationTierId: z.string().default(''),
  membershipStatus: z.string().default('none'),
  isHostile: z.boolean().default(false),
  hostilityOverride: z.boolean().optional(),
  relations: z.record(z.string(), z.string()).default({}),
  tier: z.number().int().min(1).default(1),
  isDiscovered: z.boolean().default(true),
  flags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type FactionRuntimeState = z.infer<typeof FactionRuntimeStateSchema>;

// -----------------------------------------------------------------------------
// 7. Time & World Clock Runtime State
// -----------------------------------------------------------------------------

export const TimeOfDaySchema = z.enum(['Dawn', 'Day', 'Dusk', 'Night']);
export type TimeOfDay = z.infer<typeof TimeOfDaySchema>;

export const TimeStateSchema = z.object({
  turnCount: z.number().int().min(0).default(1),
  day: z.number().int().min(1).default(1),
  hour: z.number().int().min(0).max(23).default(9),
  minute: z.number().int().min(0).max(59).default(0),
  timeOfDay: TimeOfDaySchema.default('Day'),
  elapsedRealSeconds: z.number().min(0).default(0),
});

export type TimeState = z.infer<typeof TimeStateSchema>;

export const WeatherStateSchema = z.object({
  mapId: z.string().min(1), regionId: z.string().optional(), currentWeatherId: z.string().min(1), weatherProfileId: z.string().optional(),
  startedAtWorldMinute: z.number().int().min(0), nextChangeAtWorldMinute: z.number().int().min(0).optional(), forced: z.boolean().default(false),
});
export type WeatherState = z.infer<typeof WeatherStateSchema>;

// -----------------------------------------------------------------------------
// 8. World Runtime State (Map, POIs, World Flags)
// -----------------------------------------------------------------------------

export const PoiRuntimeStateSchema = z.object({
  poiId: z.string().min(1),
  status: PoiStatusSchema.default('Discovered'),
  isDiscovered: z.boolean().default(true),
  isVisited: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  customDescription: z.string().optional(),
  customImage: z.string().optional(),
  completedActionIds: z.array(z.string()).default([]),
  disabledActionIds: z.array(z.string()).default([]),
  flags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  customState: z.record(z.string(), z.any()).optional(),
});

export type PoiRuntimeState = z.infer<typeof PoiRuntimeStateSchema>;

export const ContainerRuntimeStateSchema = z.object({
  containerId: z.string().min(1),
  isLooted: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  items: z.array(InventoryItemSlotSchema).default([]),
});

export type ContainerRuntimeState = z.infer<typeof ContainerRuntimeStateSchema>;

export const DoorRuntimeStateSchema = z.object({
  doorId: z.string().min(1),
  isOpen: z.boolean().default(false),
  isLocked: z.boolean().default(false),
});

export type DoorRuntimeState = z.infer<typeof DoorRuntimeStateSchema>;

export const GameModeSchema = z.enum([
  'Map',
  'Exploration', // Alias for Map mode
  'POI',
  'Event',
  'CombatPreview',
  'TacticalCombat',
  'CombatResult',
  'Loot',
  'PostCombat',
  'ActionResult',
  'Dialogue',
  'InventoryInspection',
  'Screen',
  'GameOver',
  'Minigame',
]);

export type GameMode = z.infer<typeof GameModeSchema>;

export const WorldStateSchema = z.object({
  currentMapId: z.string().default(''),
  currentPoiId: z.string().nullable().default(null),
  selectedPoiId: z.string().nullable().default(null),
  discoveredMapIds: z.array(z.string()).default([]),
  flags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  activeDialogueTreeId: z.string().nullable().default(null),
  activeDialogueNodeId: z.string().nullable().default(null),
  activeEventId: z.string().nullable().default(null),
  activeEventStepId: z.string().nullable().default(null),
  activeEncounterId: z.string().nullable().default(null),
  activeOriginContext: z
    .object({
      type: z.enum(['poi', 'map', 'event', 'combat', 'screen']),
      id: z.string(),
      mapId: z.string().optional(),
      extraData: z.record(z.string(), z.any()).optional(),
    })
    .nullable()
    .default(null),
  mode: GameModeSchema.default('Map'),
  activeScreen: z.enum(['Market', 'Workbench', 'Inventory', 'Base', 'Journal', 'Dialogue']).nullable().default(null),
  pois: z.record(z.string(), PoiRuntimeStateSchema).default({}),
  containers: z.record(z.string(), ContainerRuntimeStateSchema).default({}),
  doors: z.record(z.string(), DoorRuntimeStateSchema).default({}),
  ambientEtherModifier: z.number().min(0).max(2).default(1.0),
  weatherByScope: z.record(z.string(), WeatherStateSchema).default({}),
  activeMinigame:MinigameSessionSchema.nullable().default(null),
});

export type WorldState = z.infer<typeof WorldStateSchema>;

// -----------------------------------------------------------------------------
// 9. Combat Runtime State & Journal
// -----------------------------------------------------------------------------

export const CombatUnitStateSchema = z.object({
  characterId: z.string(),
  initiativeScore: z.number(),
  remainingAp: z.number(),
  remainingEther: z.number(),
  hasMovedThisTurn: z.boolean().default(false),
  hasActedThisTurn: z.boolean().default(false),
});

export type CombatUnitState = z.infer<typeof CombatUnitStateSchema>;

export const TacticalCombatStateSchema = CombatStateSchema;

export type TacticalCombatState = z.infer<typeof TacticalCombatStateSchema>;

export const GameJournalEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  category: z.enum(['System', 'Dialogue', 'Combat', 'EtherTech', 'SkillCheck', 'Quest', 'World']),
  text: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type GameJournalEntry = z.infer<typeof GameJournalEntrySchema>;

// -----------------------------------------------------------------------------
// 10. Root Serializable GameState Model (V1)
// -----------------------------------------------------------------------------

export const CURRENT_SAVE_SCHEMA_VERSION = 1;

export const RandomStateSchema=z.object({initialSeed:z.number().int().positive().default(1337),state:z.number().int().positive().default(1337),draws:z.number().int().min(0).default(0)});
export type RandomState=z.infer<typeof RandomStateSchema>;

/**
 * Serializable gameplay work which has resolved mechanically but still requires a
 * player acknowledgement or choice. This deliberately excludes modal/tab state,
 * animation progress, and every other presentation-only concern.
 */
export const PendingGameplayStateSchema = z.object({
  phase: z.enum(['actionResult', 'combatResolution', 'loot', 'postCombat']).nullable().default(null),
  activeActionResolution: ActionResolutionSchema.nullable().default(null),
  activeCombatResolution: CombatResolutionSchema.nullable().default(null),
  lastPostCombatResolution: PostCombatResolutionSchema.nullable().default(null),
  outcomeQueue: z.array(GameplayOutcomeSchema).default([]),
});
export type PendingGameplayState = z.infer<typeof PendingGameplayStateSchema>;

export const GameStateSchema = z.object({
  schemaVersion: z.number().int().min(1).default(CURRENT_SAVE_SCHEMA_VERSION),
  gameId: z.string().default('session_default'),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  rng: RandomStateSchema.default({initialSeed:1337,state:1337,draws:0}),
  pendingGameplay: PendingGameplayStateSchema.default({
    phase: null,
    activeActionResolution: null,
    activeCombatResolution: null,
    lastPostCombatResolution: null,
    outcomeQueue: [],
  }),

  // Core Sub-States
  player: PlayerStateSchema,
  world: WorldStateSchema,
  npcs: z.record(z.string(), NpcRuntimeStateSchema).default({}),
  quests: z.record(z.string(), QuestRuntimeStateSchema).default({}),
  factions: z.record(z.string(), FactionRuntimeStateSchema).default({}),
  shops: z.record(z.string(), ShopRuntimeStateSchema).default({}),
  base: BaseStateSchema.default({
    baseId: 'base_player',
    name: 'Player Base',
    rooms: {},
    roomSlots: {},
    residentNpcIds: [],
    storage: { items: [], capacity: 20 },
    resources: {},
    unlockedUpgrades: [],
    modifiers: {},
    stationedCompanionIds: [],
  }),
  time: TimeStateSchema.default({
    turnCount: 1,
    day: 1,
    hour: 9,
    minute: 0,
    timeOfDay: 'Day',
    elapsedRealSeconds: 0,
  }),

  // Party & Active Tactical Systems
  companions: z.array(z.string()).default([]),
  combat: TacticalCombatStateSchema.default({
    encounterId: null,
    isActive: false,
    phase: 'PREPARING',
    roundNumber: 0,
    turnOrder: [],
    activeTurnIndex: 0,
    activeCombatantId: null,
    combatants: {},
    log: [],
    outcome: null,
    grid: { width: 8, height: 6 },
  }),
  journal: z.array(GameJournalEntrySchema).default([]),
});

export type GameState = z.infer<typeof GameStateSchema>;

// -----------------------------------------------------------------------------
// 11. SaveGame Envelope & Metadata
// -----------------------------------------------------------------------------

export const SaveGameMetadataSchema = z.object({
  saveId: z.string(),
  slotName: z.string().default('AutoSave'),
  schemaVersion: z.number().int().min(1).default(CURRENT_SAVE_SCHEMA_VERSION),
  timestamp: z.string().default(() => new Date().toISOString()),
  playtimeSeconds: z.number().min(0).default(0),
  playerLevel: z.number().int().min(1).default(1),
  playerName: z.string().default('Player'),
  currentMapId: z.string().default(''),
  activeQuestCount: z.number().int().min(0).default(0),
  screenshotDataUrl: z.string().optional(),
});

export type SaveGameMetadata = z.infer<typeof SaveGameMetadataSchema>;

export const SaveGameSchema = z.object({
  metadata: SaveGameMetadataSchema,
  state: GameStateSchema,
});

export type SaveGame = z.infer<typeof SaveGameSchema>;
