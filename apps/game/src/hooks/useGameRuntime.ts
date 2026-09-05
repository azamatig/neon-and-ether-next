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
  StatCheckResolution,
} from '@neon-ether/game-runtime';
import { GAME_CONTENT_MANIFEST } from '@neon-ether/content';
import { CharacterDefinition, DialogueChoice, Vector2D } from '@neon-ether/game-schema';

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

  const saveToLocalSlot = (slotName: string = 'Slot 1'): SaveGame => {
    const saveGame = session.createSaveGame(slotName);
    const jsonStr = session.serializeSave(true);
    localStorage.setItem(`neon_save_${slotName}`, jsonStr);
    setSaveStatus(`Saved to [${slotName}] at ${new Date().toLocaleTimeString()}`);
    session.logJournal('System', `Game state saved to storage slot "${slotName}".`);
    return saveGame;
  };

  const loadFromLocalSlot = (slotName: string = 'Slot 1'): SaveLoadResult => {
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

  const baseResidents = (Object.values(gameState.npcs) as import('@neon-ether/game-schema').NpcRuntimeState[]).filter((npc) => ['companion','employee'].includes(npc.relationship.status)).map((runtime) => ({ runtime, name: session.getContentRegistry().getNPC(runtime.npcId)?.name ?? runtime.npcId }));
  const baseJobs = session.getContentRegistry().baseJobs.getAll();
  const activeMinigameSession=gameState.world.activeMinigame;const activeMinigame=activeMinigameSession?session.getContentRegistry().minigames.get(activeMinigameSession.definitionId):undefined;const minigameSequenceStates=session.getMinigameSequenceStates();

  return {
    session,
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
    activeDialogueNode,
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
    characterCreationOptions,
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
    unequipSlot: (slotId: string) => session.unequipSlot(slotId),
    dropInventoryItem: (itemId: string) => session.removeInventoryItem(itemId, 1),
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
