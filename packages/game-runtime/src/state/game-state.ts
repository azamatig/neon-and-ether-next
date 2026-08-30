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
  GameContent,
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
    items: overrides.items ?? [],
    credits: overrides.credits ?? 500,
    maxSlots: overrides.maxSlots ?? 30,
    maxWeight: overrides.maxWeight ?? 100,
  };
}

export function createInitialPlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    characterId: overrides.characterId ?? 'player',
    name: overrides.name ?? 'Player',
    title: overrides.title ?? 'Drifter',
    level: overrides.level ?? 1,
    experience: overrides.experience ?? 0,
    attributePointsUnspent: overrides.attributePointsUnspent ?? 0,
    skillPointsUnspent: overrides.skillPointsUnspent ?? 0,
    factionId: overrides.factionId ?? 'Neutral',
    attributes: overrides.attributes ?? {
      body: 12,
      reflexes: 14,
      mind: 16,
      etherTech: 15,
      presence: 11,
    },
    skills: overrides.skills ?? {},
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
    equipment: overrides.equipment ?? { slots: {}, appliedModifiers: {} },
    traits: overrides.traits ?? [],
    perks: overrides.perks ?? [],
    temporaryModifiers: overrides.temporaryModifiers ?? [],
    statusEffects: overrides.statusEffects ?? [],
    activeStatusEffects: overrides.activeStatusEffects ?? [],
  };
}

export function createInitialWorldState(overrides: Partial<WorldState> = {}): WorldState {
  return {
    currentMapId: overrides.currentMapId ?? '',
    currentPoiId: overrides.currentPoiId ?? null,
    selectedPoiId: overrides.selectedPoiId ?? null,
    discoveredMapIds: overrides.discoveredMapIds ?? [],
    flags: overrides.flags ?? {},
    activeDialogueTreeId: overrides.activeDialogueTreeId ?? null,
    activeDialogueNodeId: overrides.activeDialogueNodeId ?? null,
    activeEventId: overrides.activeEventId ?? undefined,
    activeEventStepId: overrides.activeEventStepId ?? undefined,
    activeEncounterId: overrides.activeEncounterId ?? undefined,
    activeOriginContext: overrides.activeOriginContext ?? undefined,
    mode: overrides.mode ?? 'Map',
    pois: overrides.pois ?? {},
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
    relationship: overrides.relationship ?? {
      status: overrides.isCompanion ? 'companion' : 'independent',
      affinity: 0,
      trust: 0,
      fear: 0,
      loyalty: 0,
    },
    assignment: overrides.assignment ?? { jobId: null, roomId: null, partySlotId: null },
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
    baseId: overrides.baseId ?? 'base_player',
    name: overrides.name ?? 'Player Base',
    rooms: overrides.rooms ?? {},
    roomSlots: overrides.roomSlots ?? {},
    residentNpcIds: overrides.residentNpcIds ?? [],
    storage: overrides.storage ?? { items: [], capacity: 20 },
    resources: overrides.resources ?? {},
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
    factions: overrides.factions ?? {},
    base: overrides.base ?? createInitialBaseState(),
    time: overrides.time ?? createInitialTimeState(),
    companions: overrides.companions ?? [],
    combat: overrides.combat ?? {
      encounterId: null,
      isActive: false,
      roundNumber: 0,
      turnOrder: [],
      activeTurnIndex: 0,
      combatants: {},
      log: [],
      outcome: null,
    },
    journal: overrides.journal ?? [
      {
        id: 'journal_session_boot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        category: 'System',
        text: 'Session booted.',
      },
    ],
  };
}

/** Builds a fresh runtime snapshot from injected content without campaign IDs. */
export function createInitialGameStateFromContent(content: GameContent): GameState {
  const playerBlueprint = content.npcs.find((npc) => npc.isPlayer) ?? content.npcs[0];
  const initialMap = content.maps[0];
  const initialPoiId = initialMap?.defaultPoiId ?? initialMap?.poiIds[0] ?? null;
  const baseDefinition = content.bases[0];
  const player = playerBlueprint
    ? createInitialPlayerState({
        characterId: playerBlueprint.id,
        name: playerBlueprint.name,
        title: playerBlueprint.title,
        level: playerBlueprint.level,
        factionId: playerBlueprint.factionId,
        attributes: { ...playerBlueprint.attributes },
        skills: { ...playerBlueprint.skills },
        vitals: { ...playerBlueprint.vitals },
        position: { ...playerBlueprint.position },
        facing: playerBlueprint.facing,
        traits: [...playerBlueprint.traits],
        perks: [...playerBlueprint.perks],
        temporaryModifiers: [...playerBlueprint.temporaryModifiers],
        statusEffects: [...playerBlueprint.statusEffects],
        inventory: createInitialInventoryState({
          items: playerBlueprint.inventory.map((slot) => ({ ...slot })),
        }),
      })
    : createInitialPlayerState({ inventory: createInitialInventoryState({ items: [] }) });

  const pois = Object.fromEntries(content.pois.map((poi) => [poi.id, {
    poiId: poi.id,
    status: poi.id === initialPoiId ? 'Visited' as const : 'Discovered' as const,
    isDiscovered: true,
    isVisited: poi.id === initialPoiId,
    isLocked: false,
    completedActionIds: [],
    disabledActionIds: [],
    flags: {},
  }]));
  const npcs = Object.fromEntries(content.npcs.filter((npc) => !npc.isPlayer).map((npc) => [
    npc.id,
    createInitialNpcRuntimeState(npc.id, initialMap?.id ?? '', {
      currentHp: npc.vitals.currentHp,
      maxHp: npc.vitals.maxHp,
      currentEther: npc.vitals.currentEther,
      position: { ...npc.position },
      facing: npc.facing,
      isMerchant: npc.isMerchant,
      isCompanion: npc.isCompanion,
      dialogueTreeIdOverride: npc.dialogueTreeId,
      relationship: npc.initialRelationship,
    }),
  ]));
  const factions = Object.fromEntries(content.factions.map((faction) => [
    faction.id,
    createInitialFactionRuntimeState(faction.id, { reputation: faction.defaultPlayerReputation }),
  ]));
  const startingRooms = baseDefinition?.startingRooms ?? [];
  const rooms = Object.fromEntries(startingRooms.flatMap((startingRoom) => {
    const definition = content.rooms.find((room) => room.id === startingRoom.roomDefinitionId);
    return definition ? [[startingRoom.roomInstanceId, {
      roomId: startingRoom.roomInstanceId,
      definitionId: definition.id,
      slotId: startingRoom.slotId,
      isBuilt: true,
      level: 1,
      assignedNpcIds: [],
      productionProgress: 0,
      installedUpgradeIds: [],
      capacity: { ...definition.capacity },
    }]] : [];
  }));
  const roomSlots = Object.fromEntries((baseDefinition?.roomSlots ?? []).map((slot) => [slot.id, {
    slotId: slot.id,
    slotType: slot.slotType,
    roomInstanceId: startingRooms.find((room) => room.slotId === slot.id)?.roomInstanceId ?? null,
  }]));

  return createInitialGameState({
    player,
    world: createInitialWorldState({
      currentMapId: initialMap?.id ?? '',
      currentPoiId: initialPoiId,
      discoveredMapIds: initialMap ? [initialMap.id] : [],
      flags: {},
      pois,
    }),
    npcs,
    factions,
    base: createInitialBaseState({
      baseId: baseDefinition?.id ?? 'base_player',
      name: baseDefinition?.name ?? 'Player Base',
      rooms,
      roomSlots,
      resources: baseDefinition?.startingResources ?? {},
      storage: {
        items: [],
        capacity: (baseDefinition?.storageCapacity ?? 20) + Object.values(rooms).reduce((sum, room) => sum + room.capacity.storage, 0),
      },
    }),
    journal: [{
      id: 'journal_session_boot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      category: 'System',
      text: initialMap ? `Session booted. Neural link synced to ${initialMap.name}.` : 'Session booted.',
    }],
  });
}
