/**
 * @neon-ether/game-schema
 * Pure serializable runtime state definitions (Zod schemas & TypeScript types).
 * Separates static content definitions (blueprints) from mutable runtime state.
 */

import { z } from 'zod';
import { Vector2DSchema } from './grid.ts';
import { CharacterAttributesSchema, DerivedVitalsSchema } from './stats.ts';
import { QuestStatusSchema } from './quest.ts';
import { CombatStateSchema } from './combat.ts';
import { CharacterAssignmentSchema, CharacterRelationshipSchema } from './character-management.ts';
import { PoiStatusSchema } from './world.ts';

export const DirectionSchema = z.enum(['North', 'South', 'East', 'West']);
export type Direction = z.infer<typeof DirectionSchema>;

// -----------------------------------------------------------------------------
// 1. Inventory Runtime State
// -----------------------------------------------------------------------------

export const InventoryItemSlotSchema = z.object({
  itemId: z.string().min(1, 'Item ID cannot be empty'),
  quantity: z.number().int().min(1).default(1),
  isEquipped: z.boolean().default(false),
  slotId: z.string().optional(), // Specific equipment slot if equipped (e.g. 'MainHand', 'Head')
  durability: z.number().min(0).max(100).optional(),
  customName: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type InventoryItemSlot = z.infer<typeof InventoryItemSlotSchema>;

export const InventoryStateSchema = z.object({
  items: z.array(InventoryItemSlotSchema).default([]),
  credits: z.number().int().min(0).default(0),
  maxSlots: z.number().int().min(1).default(30),
  maxWeight: z.number().min(0).default(100),
});

export type InventoryState = z.infer<typeof InventoryStateSchema>;

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
  title: z.string().default('Drifter'),
  level: z.number().int().min(1).default(1),
  experience: z.number().int().min(0).default(0),
  attributePointsUnspent: z.number().int().min(0).default(0),
  skillPointsUnspent: z.number().int().min(0).default(0),
  factionId: z.string().default('Neutral'),
  attributes: CharacterAttributesSchema.default({
    body: 12,
    reflexes: 14,
    mind: 16,
    etherTech: 15,
    presence: 11,
  }),
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
  activeStatusEffects: z.array(ActiveStatusEffectSchema).default([]),
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;

// -----------------------------------------------------------------------------
// 3. NPC Runtime State (Mutable state only, not full content definition)
// -----------------------------------------------------------------------------

export const NpcRuntimeStateSchema = z.object({
  npcId: z.string().min(1),
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
  capacity: z.object({ residents: z.number().int().min(0), workers: z.number().int().min(0), storage: z.number().int().min(0) }),
});

export type BaseRoomRuntimeState = z.infer<typeof BaseRoomRuntimeStateSchema>;

export const BaseStateSchema = z.object({
  baseId: z.string().default('base_player'),
  name: z.string().default('Player Base'),
  rooms: z.record(z.string(), BaseRoomRuntimeStateSchema).default({}),
  roomSlots: z.record(z.string(), z.object({ slotId: z.string(), slotType: z.string(), roomInstanceId: z.string().nullable() })).default({}),
  residentNpcIds: z.array(z.string()).default([]),
  storage: z.object({ items: z.array(InventoryItemSlotSchema).default([]), capacity: z.number().int().min(0).default(20) }).default({ items: [], capacity: 20 }),
  resources: z.record(z.string(), z.number().int().min(0)).default({}),
  unlockedUpgrades: z.array(z.string()).default([]),
  stationedCompanionIds: z.array(z.string()).default([]),
});

export type BaseState = z.infer<typeof BaseStateSchema>;

// -----------------------------------------------------------------------------
// 6. Faction Runtime State
// -----------------------------------------------------------------------------

export const FactionStandingSchema = z.enum(['Hostile', 'Unfriendly', 'Neutral', 'Friendly', 'Honored']);
export type FactionStanding = z.infer<typeof FactionStandingSchema>;

export const FactionRuntimeStateSchema = z.object({
  factionId: z.string().min(1),
  reputation: z.number().int().min(-100).max(100).default(0),
  standing: FactionStandingSchema.default('Neutral'),
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
  pois: z.record(z.string(), PoiRuntimeStateSchema).default({}),
  containers: z.record(z.string(), ContainerRuntimeStateSchema).default({}),
  doors: z.record(z.string(), DoorRuntimeStateSchema).default({}),
  ambientEtherModifier: z.number().min(0).max(2).default(1.0),
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

export const GameStateSchema = z.object({
  schemaVersion: z.number().int().min(1).default(CURRENT_SAVE_SCHEMA_VERSION),
  gameId: z.string().default('session_default'),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),

  // Core Sub-States
  player: PlayerStateSchema,
  world: WorldStateSchema,
  npcs: z.record(z.string(), NpcRuntimeStateSchema).default({}),
  quests: z.record(z.string(), QuestRuntimeStateSchema).default({}),
  factions: z.record(z.string(), FactionRuntimeStateSchema).default({}),
  base: BaseStateSchema.default({
    baseId: 'base_player',
    name: 'Player Base',
    rooms: {},
    roomSlots: {},
    residentNpcIds: [],
    storage: { items: [], capacity: 20 },
    resources: {},
    unlockedUpgrades: [],
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
    roundNumber: 0,
    turnOrder: [],
    activeTurnIndex: 0,
    combatants: {},
    log: [],
    outcome: null,
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
