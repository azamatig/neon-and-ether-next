/**
 * @apps/game
 * React Hook managing GameSession lifecycle, POI world navigation, state synchronization, and persistence.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ContentRegistry,
  GameSession,
  GameState,
  ResolvedPOI,
  SaveGame,
  SaveLoadResult,
  serializeSaveGame,
  StatCheckResolution,
} from '@neon-ether/game-runtime';
import { GAME_CONTENT_MANIFEST } from '@neon-ether/content';
import { CharacterDefinition, DialogueChoice, Vector2D } from '@neon-ether/game-schema';
import { EntityNameResolver } from '../presentation/entity-name-resolver.ts';

export function useGameRuntime() {
  const session = useMemo(() => {
    const registry = new ContentRegistry();
    registry.loadManifest(GAME_CONTENT_MANIFEST);
    const nextSession = new GameSession(registry);
    if ((import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV && new URLSearchParams(window.location.search).has('editorPlaytest')) {
      const playtestSave = localStorage.getItem('__neon_editor_playtest');
      if (playtestSave) nextSession.loadSave(playtestSave);
    }
    return nextSession;
  }, []);

  const [gameState, setGameState] = useState<GameState>(() => session.getState());
  const [lastCheck, setLastCheck] = useState<StatCheckResolution | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const entityNames = useMemo(() => new EntityNameResolver(session.getContentRegistry()), [session]);

  useEffect(() => {
    const unsubs = [
      session.events.on('STATE_CHANGED', (newState) => {
        setGameState(structuredClone(newState));
      }),
      session.events.on('STAT_CHECK_TRIGGERED', (resolution) => {
        setLastCheck(resolution);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [session]);

  const activeMap = useMemo(() => {
    return session.getContentRegistry().getMap(gameState.world.currentMapId);
  }, [session, gameState.world.currentMapId]);
  const currentWeather = useMemo(() => activeMap ? session.getCurrentWeather(activeMap.id) : undefined, [session, activeMap, gameState.time, gameState.world.weatherByScope]);

  const activeDialogueTree = useMemo(() => {
    if (!gameState.world.activeDialogueTreeId) return null;
    return session.getContentRegistry().getDialogue(gameState.world.activeDialogueTreeId);
  }, [session, gameState.world.activeDialogueTreeId]);

  const activeDialogueNode = useMemo(() => {
    if (!activeDialogueTree || !gameState.world.activeDialogueNodeId) return null;
    return activeDialogueTree.nodes[gameState.world.activeDialogueNodeId] ?? null;
  }, [activeDialogueTree, gameState.world.activeDialogueNodeId]);
  const activeDialogueState = useMemo(() => session.getResolvedDialogueState(), [session, gameState.world.activeDialogueTreeId, gameState.world.activeDialogueNodeId, gameState.world.activeDialogueChoiceId, gameState.player]);

  const resolvedPlayer = useMemo(() => {
    return session.getResolvedPlayerCharacter();
  }, [session, gameState.player]);

  const poisForActiveMap = useMemo<ResolvedPOI[]>(() => {
    return session.getPoisForCurrentMap();
  }, [session, gameState.world.currentMapId, gameState.world.pois, gameState.player]);

  const selectedPoi = useMemo<ResolvedPOI | undefined>(() => {
    const targetId = gameState.world.selectedPoiId ?? gameState.world.currentPoiId;
    if (!targetId) return undefined;
    return session.getResolvedPoi(targetId);
  }, [session, gameState.world.selectedPoiId, gameState.world.currentPoiId, gameState.world.pois]);

  const stationedNpcsAtSelectedPoi = useMemo<CharacterDefinition[]>(() => {
    if (!selectedPoi) return [];
    return (selectedPoi.npcIds ?? [])
      .map((id) => session.getResolvedNpcCharacter(id))
      .filter((c): c is CharacterDefinition => c !== undefined);
  }, [session, selectedPoi, gameState.npcs]);

  const activeActionResolution = useMemo(() => {
    return session.getActiveActionResolution();
  }, [session, gameState.world.mode]);

  const activeEventState = useMemo(() => {
    if (gameState.world.mode !== 'Event' || !gameState.world.activeEventId) return undefined;
    return session.getResolvedEventState();
  }, [session, gameState.world.mode, gameState.world.activeEventId, gameState.world.activeEventStepId, gameState.player]);

  const activeCombatPreview = useMemo(() => {
    if (gameState.world.mode !== 'CombatPreview' || !gameState.world.activeEncounterId) return undefined;
    return session.getCombatPreview(gameState.world.activeEncounterId);
  }, [session, gameState.world.mode, gameState.world.activeEncounterId, gameState.player]);

  const activeCombatResolution = useMemo(() => {
    return session.getActiveCombatResolution();
  }, [session, gameState.world.mode]);
  const combatAbilities = useMemo(() => session.getContentRegistry().abilities.getAll(), [session]);
  const combatCommands = useMemo(() => session.getResolvedCombatCommands(), [session, gameState.combat]);
  const activeGameplayTargetId = useMemo(() => {
    if (gameState.world.mode !== 'Screen' || !gameState.world.activeScreen || !selectedPoi) return undefined;
    return selectedPoi.actions.find((action) => action.outcome?.type === 'gameplayScreen' && action.outcome.screen === gameState.world.activeScreen)?.outcome?.targetId;
  }, [gameState.world.mode, gameState.world.activeScreen, selectedPoi]);
  const activeShop = gameState.world.activeScreen === 'Market' && activeGameplayTargetId ? session.getShop(activeGameplayTargetId) : undefined;
  const craftingContext = { location: 'room' as const, roomInstanceId: activeGameplayTargetId };
  const recipes = session.getContentRegistry().recipes.getAll();
  const availableRecipeIds = new Set(gameState.world.activeScreen === 'Workbench' ? session.getAvailableRecipes(craftingContext).map((recipe) => recipe.id) : []);
  const itemDefinitions = session.getContentRegistry().items.getAll();
  const equipmentOptions = Object.fromEntries(gameState.player.inventory.items.map((entry) => [entry.entryId ?? entry.itemId, Object.fromEntries((session.getContentRegistry().getItem(entry.itemId)?.equipmentSlots ?? []).map((slotId) => [slotId, session.canEquipInventoryEntry(entry.entryId ?? entry.itemId, slotId)]))]));
  const equipmentSlots = session.getEquipmentSlots();
  const playerRace = gameState.player.raceId ? session.getContentRegistry().races.get(gameState.player.raceId) : undefined;
  const playerBackground = gameState.player.backgroundId ? session.getContentRegistry().backgrounds.get(gameState.player.backgroundId) : undefined;
  const classNames = Object.fromEntries(session.getContentRegistry().classes.getAll().map((value) => [value.id, value.name]));
  const raceNames = Object.fromEntries(session.getContentRegistry().races.getAll().map((race) => [race.id, race.name]));
  const primaryClass = gameState.player.classId ? session.getContentRegistry().classes.get(gameState.player.classId) : undefined;
  const specialPaths = gameState.player.specialPathIds.flatMap((id) => { const definition = session.getContentRegistry().specialPaths.get(id); return definition ? [definition] : []; });
  const playerProgression = session.getPlayerProgressionView();
  const characterCreationOptions = useMemo(() => session.getCharacterCreationOptions(), [session]);
  const questDossiers = (Object.values(gameState.quests) as import('@neon-ether/game-schema').QuestRuntimeState[]).map((quest) => ({
    runtime: quest,
    definition: session.getContentRegistry().getQuest(quest.questId),
  })).filter((quest) => quest.definition !== undefined);
  const partyMembers = (Object.values(gameState.npcs) as import('@neon-ether/game-schema').NpcRuntimeState[])
    .filter((npc) => npc.assignment.partySlotId !== null)
    .map((runtime) => ({ runtime, character: session.getResolvedNpcCharacter(runtime.npcId) }))
    .filter((member) => member.character !== undefined);

  // --- Persistence & Savegame Handlers ---

  const saveToLocalSlot = (slotId: string = 'manual-1'): SaveGame => {
    const slotName = `Manual Slot ${slotId.replace('manual-','')}`;
    const saveGame = session.createSaveGame(slotName, 'Manual', slotId);
    localStorage.setItem(`neon_save_${slotId}`, serializeSaveGame(saveGame, true));
    setSaveStatus(`Saved to [${slotName}] at ${new Date().toLocaleTimeString()}`);
    session.logJournal('System', `Game state saved to storage slot "${slotName}".`);
    return saveGame;
  };

  const loadFromLocalSlot = (slotName: string = 'manual-1'): SaveLoadResult => {
    const jsonStr = localStorage.getItem(`neon_save_${slotName}`);
    if (!jsonStr) {
      setSaveStatus(`No save data found in [${slotName}]`);
      return { success: false, error: 'NO_SAVE_FOUND' };
    }
    const result = session.loadSave(jsonStr);
    if (result.success) {
      setSaveStatus(`Loaded [${slotName}] (Schema v${result.saveGame?.metadata.schemaVersion})`);
    } else {
      setSaveStatus(`Load failed: ${result.error}`);
    }
    return result;
  };

  const exportSaveJson = (): string => {
    return session.serializeSave(true);
  };

  const importSaveJson = (jsonString: string): SaveLoadResult => {
    const result = session.loadSave(jsonString);
    if (result.success) {
      setSaveStatus(`Imported savegame successfully (v${result.saveGame?.metadata.schemaVersion})`);
    } else {
      setSaveStatus(`Import error: ${result.error}`);
    }
    return result;
  };

  const baseResidents = (Object.values(gameState.npcs) as import('@neon-ether/game-schema').NpcRuntimeState[]).filter((npc) => ['companion','employee'].includes(npc.relationship.status)).map((runtime) => ({ runtime, name: entityNames.npc(runtime.npcId) }));
  const baseJobs = session.getContentRegistry().baseJobs.getAll();
  const activeMinigameSession=gameState.world.activeMinigame;const activeMinigame=activeMinigameSession?session.getContentRegistry().minigames.get(activeMinigameSession.definitionId):undefined;const minigameSequenceStates=session.getMinigameSequenceStates();

  return {
    session,
    entityNames,
    gameState,
    resolvedPlayer,
    activeMap,
    currentWeather,
    baseResidents,
    baseJobs,
    activeMinigameSession,activeMinigame,minigameSequenceStates,
    poisForActiveMap,
    selectedPoi,
    stationedNpcsAtSelectedPoi,
    activeDialogueTree,
    activeDialogueNode,
    activeDialogueState,
    activeActionResolution,
    activeEventState,
    activeCombatPreview,
    activeCombatResolution,
    combatAbilities,
    combatCommands,
    activeShop,
    recipes,
    availableRecipeIds,
    itemDefinitions,
    equipmentOptions,
    equipmentSlots,
    playerRace,
    playerBackground,
    raceNames,
    classNames,
    primaryClass,
    specialPaths,
    playerProgression,
    characterCreationOptions,
    generateCharacterName: () => session.generateCharacterName(),
    adjustCharacterCreationAttribute: session.adjustCharacterCreationAttribute.bind(session),
    adjustCharacterCreationSkill: session.adjustCharacterCreationSkill.bind(session),
    questDossiers,
    partyMembers,
    lastCheck,
    saveStatus,
    openPoi: (poiId: string) => session.openPoi(poiId),
    travelToPoi: (poiId: string) => session.travelToPoi(poiId),
    returnToMap: () => session.returnToMap(),
    changeMap: (mapId: string, poiId?: string) => session.changeMap(mapId, poiId),
    executePoiAction: (poiId: string, actionId: string) => session.executePoiAction(poiId, actionId),
    dismissActionResolution: () => session.dismissActionResolution(),
    startDialogue: (treeId: string) => session.startDialogue(treeId),
    chooseDialogueOption: (choice: DialogueChoice) => session.chooseDialogueOption(choice),
    advanceDialoguePlayerLine: () => session.advanceDialoguePlayerLine(),
    advanceDialogueNode: () => session.advanceDialogueNode(),
    endDialogue: () => session.endDialogue(),
    // Event methods
    startEvent: (eventId: string) => session.startEvent(eventId),
    advanceEventStep: () => session.advanceEventStep(),
    chooseEventOption: (choiceId: string) => session.chooseEventOption(choiceId),
    completeEvent: () => session.completeEvent(),
    skipEvent: () => session.skipEvent(),
    // Combat methods
    startCombatEncounter: (encounterId: string, previewFirst: boolean = true) =>
      session.startCombatEncounter(encounterId, previewFirst),
    attemptCombatEscape: () => session.attemptCombatEscape(),
    startTacticalCombat: () => session.startTacticalCombat(),
    takeLoot: (itemIds: string[], takeCredits?: boolean) => session.takeLoot(itemIds, takeCredits),
    executePostCombatAction: (
      enemyId: string,
      actionId: 'Search' | 'Restrain' | 'Capture' | 'Interrogate' | 'Release' | 'FinishOff'
    ) => session.executePostCombatAction(enemyId, actionId),
    executeCombatAction: (action: import('@neon-ether/game-schema').CombatAction) => session.executeCombatAction(action),
    getCharacterManagementActions: (npcId: string) => session.getCharacterManagementActions(npcId),
    executeCharacterManagementCommand: (command: import('@neon-ether/game-schema').CharacterManagementCommand) =>
      session.executeCharacterManagementCommand(command),
    getBaseRoomOptions: (slotId: string) => session.getBaseRoomOptions(slotId),
    getBaseUpgradeOptions: (roomInstanceId: string) => session.getBaseUpgradeOptions(roomInstanceId),
    executeBaseManagementCommand: (command: import('@neon-ether/game-schema').BaseManagementCommand) =>
      session.executeBaseManagementCommand(command),
    buyFromShop: (shopId: string, itemId: string) => session.buyFromShop(shopId, itemId),
    sellToShop: (shopId: string, itemId: string) => session.sellToShop(shopId, itemId),
    craftRecipe: (recipeId: string) => session.craftRecipe(recipeId, craftingContext),
    returnToOrigin: () => session.resolveOutcome({ type: 'returnToOrigin' }),
    selectMinigameCell:(row:number,column:number)=>session.selectMinigameCell(row,column),finishMinigame:()=>session.finishMinigame(),
    equipInventoryEntry: (entryId: string, slotId: string) => session.equipInventoryEntry(entryId, { id: slotId, acceptsCategories: [], acceptsTags: [] }),
    useInventoryItem: (itemId: string) => session.useInventoryItem(itemId),
    unequipSlot: (slotId: string) => session.unequipSlot(slotId),
    dropInventoryItem: (itemId: string) => session.removeInventoryItem(itemId, 1),
    initializeRosterCharacterLoadout:(npcId:string)=>session.initializeRosterCharacterLoadout(npcId),
    equipRosterCharacterItem:(npcId:string,entryId:string,slotId:string)=>session.equipRosterCharacterItem(npcId,entryId,slotId),
    unequipRosterCharacterSlot:(npcId:string,slotId:string)=>session.unequipRosterCharacterSlot(npcId,slotId),
    transferRosterItem:(from:'player'|string,to:'player'|string,itemId:string,quantity=1)=>session.transferRosterItem(from,to,itemId,quantity),
    validateCharacterCreation: (selection: import('@neon-ether/game-schema').CharacterCreationSelection) => session.validateCharacterCreation(selection),
    initializeNewGame: (selection: import('@neon-ether/game-schema').CharacterCreationSelection) => session.initializeNewGame(selection),
    previewCharacterCreation: (selection: import('@neon-ether/game-schema').CharacterCreationSelection) => session.previewCharacterCreation(selection),
    dismissCombatResult: () => session.dismissCombatResult(),
    saveToLocalSlot,
    loadFromLocalSlot,
    exportSaveJson,
    importSaveJson,
    spendAp: (amount: number) => session.spendPlayerResource('actionPoints', amount),
    spendEther: (amount: number) => session.spendPlayerResource('ether', amount),
    resetTurnAp: () => session.resetPlayerActionPoints(),
  };
}
