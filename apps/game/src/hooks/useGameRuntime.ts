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
    return new GameSession(registry);
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

  return {
    session,
    gameState,
    resolvedPlayer,
    activeMap,
    poisForActiveMap,
    selectedPoi,
    stationedNpcsAtSelectedPoi,
    activeDialogueNode,
    activeActionResolution,
    activeEventState,
    activeCombatPreview,
    activeCombatResolution,
    combatAbilities,
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
