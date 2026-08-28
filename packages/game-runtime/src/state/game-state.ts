/**
 * @neon-ether/game-runtime
 * Root game state and session persistence data model.
 * Re-exports canonical types from @neon-ether/game-schema and provides factory builders.
 */

import {
  ActiveStatusEffect,
  BaseRoomRuntimeState,
  BaseState,
  CombatUnitState,
  ContainerRuntimeState,
  CURRENT_SAVE_SCHEMA_VERSION,
  DoorRuntimeState,
  FactionRuntimeState,
  FactionStanding,
  GameJournalEntry,
  GameMode,
  GameState,
  InventoryItemSlot,
  InventoryState,
  NpcRuntimeState,
  PlayerState,
  PoiRuntimeState,
  QuestRuntimeState,
  SaveGame,
  SaveGameMetadata,
  TacticalCombatState,
  TimeOfDay,
  TimeState,
  WorldState,
} from '@neon-ether/game-schema';

export type {
  ActiveStatusEffect,
  BaseRoomRuntimeState,
  BaseState,
  CombatUnitState,
  ContainerRuntimeState,
  DoorRuntimeState,
  FactionRuntimeState,
  FactionStanding,
  GameJournalEntry,
  GameMode,
  GameState,
  InventoryItemSlot,
  InventoryState,
  NpcRuntimeState,
  PlayerState,
  PoiRuntimeState,
  QuestRuntimeState,
  SaveGame,
  SaveGameMetadata,
  TacticalCombatState,
  TimeOfDay,
  TimeState,
  WorldState,
};

export { CURRENT_SAVE_SCHEMA_VERSION };

// -----------------------------------------------------------------------------
// State Factory Helpers
// -----------------------------------------------------------------------------

export function createInitialInventoryState(overrides: Partial<InventoryState> = {}): InventoryState {
  return {
    items: overrides.items ?? [
      { itemId: 'wpn_thermal_pistol', quantity: 1, isEquipped: true },
      { itemId: 'cyb_neural_jack_v1', quantity: 1, isEquipped: true },
      { itemId: 'con_ether_vial', quantity: 3, isEquipped: false },
    ],
    credits: overrides.credits ?? 500,
    maxSlots: overrides.maxSlots ?? 30,
    maxWeight: overrides.maxWeight ?? 100,
  };
}

export function createInitialPlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    characterId: overrides.characterId ?? 'char_protagonist',
    name: overrides.name ?? 'Vane',
    title: overrides.title ?? 'Technomancer Drifter',
    level: overrides.level ?? 1,
    experience: overrides.experience ?? 0,
    attributePointsUnspent: overrides.attributePointsUnspent ?? 0,
    skillPointsUnspent: overrides.skillPointsUnspent ?? 0,
    factionId: overrides.factionId ?? 'fac_undercity_drifters',
    attributes: overrides.attributes ?? {
      body: 12,
      reflexes: 14,
      mind: 16,
      etherTech: 15,
      presence: 11,
    },
    vitals: overrides.vitals ?? {
      maxHp: 38,
      currentHp: 38,
      maxEther: 50,
      currentEther: 45,
      actionPointsMax: 8,
      actionPointsCurrent: 8,
      initiative: 14,
      armorRating: 3,
      etherResistance: 15,
    },
    position: overrides.position ?? { x: 4, y: 5 },
    facing: overrides.facing ?? 'South',
    inventory: overrides.inventory ?? createInitialInventoryState(),
    activeStatusEffects: overrides.activeStatusEffects ?? [],
  };
}

export function createInitialWorldState(overrides: Partial<WorldState> = {}): WorldState {
  const initialPois: Record<string, PoiRuntimeState> = {
    poi_sec09_hideout: {
      poiId: 'poi_sec09_hideout',
      status: 'Visited',
      isDiscovered: true,
      isVisited: true,
      isLocked: false,
      completedActionIds: [],
      disabledActionIds: [],
      flags: {},
    },
    poi_sec09_market: {
      poiId: 'poi_sec09_market',
      status: 'Discovered',
      isDiscovered: true,
      isVisited: false,
      isLocked: false,
      completedActionIds: [],
      disabledActionIds: [],
      flags: {},
    },
    poi_sec09_terminal: {
      poiId: 'poi_sec09_terminal',
      status: 'Discovered',
      isDiscovered: true,
      isVisited: false,
      isLocked: false,
      completedActionIds: [],
      disabledActionIds: [],
      flags: {},
    },
    poi_ether_fissure: {
      poiId: 'poi_ether_fissure',
      status: 'Discovered',
      isDiscovered: true,
      isVisited: false,
      isLocked: false,
      completedActionIds: [],
      disabledActionIds: [],
      flags: {},
    },
    poi_omnicorp_checkpoint: {
      poiId: 'poi_omnicorp_checkpoint',
      status: 'Discovered',
      isDiscovered: true,
      isVisited: false,
      isLocked: false,
      completedActionIds: [],
      disabledActionIds: [],
      flags: {},
    },
  };

  return {
    currentMapId: overrides.currentMapId ?? 'map_slums_sec09',
    currentPoiId: overrides.currentPoiId ?? 'poi_sec09_hideout',
    selectedPoiId: overrides.selectedPoiId ?? null,
    discoveredMapIds: overrides.discoveredMapIds ?? ['map_slums_sec09'],
    flags: overrides.flags ?? {
      intro_seen: true,
      fixer_contract_offered: false,
    },
    activeDialogueTreeId: overrides.activeDialogueTreeId ?? null,
    activeDialogueNodeId: overrides.activeDialogueNodeId ?? null,
    activeEventId: overrides.activeEventId ?? undefined,
    activeEventStepId: overrides.activeEventStepId ?? undefined,
    activeEncounterId: overrides.activeEncounterId ?? undefined,
    activeOriginContext: overrides.activeOriginContext ?? undefined,
    mode: overrides.mode ?? 'Map',
    pois: overrides.pois ?? initialPois,
    containers: overrides.containers ?? {},
    doors: overrides.doors ?? {},
    ambientEtherModifier: overrides.ambientEtherModifier ?? 1.0,
  };
}

export function createInitialNpcRuntimeState(
  npcId: string,
  mapId: string,
  overrides: Partial<NpcRuntimeState> = {}
): NpcRuntimeState {
  return {
    npcId,
    mapId,
    isAlive: overrides.isAlive ?? true,
    currentHp: overrides.currentHp ?? 30,
    maxHp: overrides.maxHp ?? 30,
    currentEther: overrides.currentEther ?? 0,
    position: overrides.position ?? { x: 0, y: 0 },
    facing: overrides.facing ?? 'South',
    behaviorOverride: overrides.behaviorOverride,
    dialogueTreeIdOverride: overrides.dialogueTreeIdOverride,
    isHostile: overrides.isHostile ?? false,
    isMerchant: overrides.isMerchant ?? false,
    isCompanion: overrides.isCompanion ?? false,
    relationship: overrides.relationship ?? 0,
    flags: overrides.flags ?? {},
  };
}

export function createInitialQuestRuntimeState(
  questId: string,
  overrides: Partial<QuestRuntimeState> = {}
): QuestRuntimeState {
  return {
    questId,
    status: overrides.status ?? 'Unassigned',
    currentStageId: overrides.currentStageId ?? 'stage_01',
    completedObjectiveIds: overrides.completedObjectiveIds ?? [],
    failedObjectiveIds: overrides.failedObjectiveIds ?? [],
    objectiveCounters: overrides.objectiveCounters ?? {},
    customVariables: overrides.customVariables ?? {},
  };
}

export function createInitialFactionRuntimeState(
  factionId: string,
  overrides: Partial<FactionRuntimeState> = {}
): FactionRuntimeState {
  const rep = overrides.reputation ?? 0;
  let standing: FactionStanding = overrides.standing ?? 'Neutral';
  if (!overrides.standing) {
    if (rep >= 50) standing = 'Honored';
    else if (rep >= 20) standing = 'Friendly';
    else if (rep <= -50) standing = 'Hostile';
    else if (rep <= -20) standing = 'Unfriendly';
  }

  return {
    factionId,
    reputation: rep,
    standing,
    tier: overrides.tier ?? 1,
    isDiscovered: overrides.isDiscovered ?? true,
    flags: overrides.flags ?? {},
  };
}

export function createInitialBaseState(overrides: Partial<BaseState> = {}): BaseState {
  return {
    baseId: overrides.baseId ?? 'base_hideout_sec09',
    name: overrides.name ?? 'Sector 09 Safehouse',
    rooms: overrides.rooms ?? {
      room_workbench: {
        roomId: 'room_workbench',
        isBuilt: true,
        level: 1,
        assignedNpcIds: [],
        productionProgress: 0,
      },
    },
    resources: overrides.resources ?? {
      etherCells: 15,
      techScrap: 40,
      biogel: 5,
    },
    unlockedUpgrades: overrides.unlockedUpgrades ?? [],
    stationedCompanionIds: overrides.stationedCompanionIds ?? [],
  };
}

export function createInitialTimeState(overrides: Partial<TimeState> = {}): TimeState {
  return {
    turnCount: overrides.turnCount ?? 1,
    day: overrides.day ?? 1,
    hour: overrides.hour ?? 9,
    minute: overrides.minute ?? 0,
    timeOfDay: overrides.timeOfDay ?? 'Day',
    elapsedRealSeconds: overrides.elapsedRealSeconds ?? 0,
  };
}

export function createInitialGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    gameId: overrides.gameId ?? `session_${Date.now()}`,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    player: overrides.player ?? createInitialPlayerState(),
    world: overrides.world ?? createInitialWorldState(),
    npcs: overrides.npcs ?? {},
    quests: overrides.quests ?? {},
    factions: overrides.factions ?? {
      fac_undercity_drifters: createInitialFactionRuntimeState('fac_undercity_drifters', { reputation: 25 }),
      fac_omnicorp_sec: createInitialFactionRuntimeState('fac_omnicorp_sec', { reputation: -10 }),
      fac_obsidian_syndicate: createInitialFactionRuntimeState('fac_obsidian_syndicate', { reputation: 10 }),
    },
    base: overrides.base ?? createInitialBaseState(),
    time: overrides.time ?? createInitialTimeState(),
    companions: overrides.companions ?? [],
    combat: overrides.combat ?? {
      isActive: false,
      roundNumber: 0,
      turnOrder: [],
      activeTurnIndex: 0,
      units: {},
    },
    journal: overrides.journal ?? [
      {
        id: 'j_001',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        category: 'System',
        text: 'Session booted. Neural link synced to Sector 09 grid.',
      },
    ],
  };
}
