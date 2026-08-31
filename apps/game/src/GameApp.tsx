/**
 * @apps/game
 * Main Game Application Entry View & POI Exploration Flow.
 * Map Screen → click POI → POI Screen → choose action/event/quest → return to Map.
 */

import React, { useState } from 'react';
import { useGameRuntime } from './hooks/useGameRuntime.ts';
import { TacticalHUD } from './components/TacticalHUD.tsx';
import { DialogueOverlay } from './components/DialogueOverlay.tsx';
import { ActionResultModal } from './components/ActionResultModal.tsx';
import { EventContainer } from './components/EventContainer.tsx';
import { CombatPreviewContainer } from './components/CombatPreviewContainer.tsx';
import { CombatResultContainer } from './components/CombatResultContainer.tsx';
import { TurnBasedCombatScreen } from './components/TurnBasedCombatScreen.tsx';
import { SaveStateModal } from './components/SaveStateModal.tsx';
import { BaseScreen, ExplorationHud, Panel, PoiScreen, TerminalLog, WorldMapView } from '@neon-ether/shared-ui';

export const GameApp: React.FC = () => {
  const {
    gameState,
    resolvedPlayer,
    activeMap,
    currentWeather,
    baseResidents,
    baseJobs,
    getBaseRoomOptions,
    getBaseUpgradeOptions,
    executeBaseManagementCommand,
    executeCharacterManagementCommand,
    poisForActiveMap,
    selectedPoi,
    stationedNpcsAtSelectedPoi,
    activeDialogueNode,
    activeActionResolution,
    activeEventState,
    activeCombatPreview,
    activeCombatResolution,
    combatAbilities,
    saveStatus,
    openPoi,
    travelToPoi,
    returnToMap,
    executePoiAction,
    dismissActionResolution,
    startDialogue,
    chooseDialogueOption,
    endDialogue,
    advanceEventStep,
    chooseEventOption,
    completeEvent,
    attemptCombatEscape,
    startTacticalCombat,
    takeLoot,
    executePostCombatAction,
    executeCombatAction,
    dismissCombatResult,
    spendEther,
    resetTurnAp,
    saveToLocalSlot,
    loadFromLocalSlot,
    exportSaveJson,
    importSaveJson,
  } = useGameRuntime();

  const [showSaveModal, setShowSaveModal] = useState(false);

  if (!activeMap) {
    return (
      <div className="p-6 text-center text-rose-400 font-mono">
        [ERROR] No active map found in game session!
      </div>
    );
  }

  const isPoiMode = gameState.world.mode === 'POI' && selectedPoi;
  const isBaseMode = gameState.world.mode === 'Screen' && gameState.world.activeScreen === 'Base';
  const isEventMode = gameState.world.mode === 'Event' && activeEventState;
  const isCombatPreviewMode = gameState.world.mode === 'CombatPreview' && activeCombatPreview;
  const isCombatResultMode = ['CombatResult', 'Loot', 'PostCombat'].includes(gameState.world.mode) && activeCombatResolution;
  const isTacticalCombatMode = gameState.world.mode === 'TacticalCombat';
  const isExplorationMode = Boolean(isPoiMode) || gameState.world.mode === 'Map';

  return (
    <div className="w-full h-full flex flex-col gap-3 font-sans">
      {!isExplorationMode && <TacticalHUD
        player={resolvedPlayer}
        onEndTurn={resetTurnAp}
        onQuickEtherCast={() => spendEther(5)}
      />}

      {/* Main Viewport & Sidebar Grid */}
      <div className={`min-h-0 flex-1 grid grid-cols-1 gap-3 ${isExplorationMode ? '' : 'lg:grid-cols-12'}`}>
        {/* District Map, POI Viewport, Event Screen, or Combat Viewport */}
        <div className={`${isExplorationMode ? '' : 'lg:col-span-8 xl:col-span-9'} min-h-0 flex flex-col`}>
          {isEventMode ? (
            <EventContainer
              eventState={activeEventState}
              onAdvanceStep={advanceEventStep}
              onChooseOption={chooseEventOption}
              onCompleteEvent={completeEvent}
            />
          ) : isCombatPreviewMode ? (
            <CombatPreviewContainer
              preview={activeCombatPreview}
              onEngage={startTacticalCombat}
              onEscape={attemptCombatEscape}
            />
          ) : isCombatResultMode ? (
            <CombatResultContainer
              resolution={activeCombatResolution}
              onTakeLoot={takeLoot}
              onExecutePostCombatAction={executePostCombatAction}
              onDismiss={dismissCombatResult}
            />
          ) : isTacticalCombatMode ? (
            <TurnBasedCombatScreen
              state={gameState.combat}
              abilities={combatAbilities}
              onCommand={executeCombatAction}
            />
          ) : isBaseMode ? <BaseScreen base={gameState.base} onReturn={returnToMap} roomOptions={getBaseRoomOptions} upgradeOptions={getBaseUpgradeOptions} residents={baseResidents} jobs={baseJobs} onBuildRoom={(slotId,roomDefinitionId)=>executeBaseManagementCommand({type:'BuildRoom',slotId,roomDefinitionId})} onInstallUpgrade={(roomInstanceId,upgradeId)=>executeBaseManagementCommand({type:'InstallUpgrade',roomInstanceId,upgradeId})} onAssign={(npcId,jobId,roomId)=>{if(jobId)executeCharacterManagementCommand({type:'AssignJob',npcId,jobId});if(roomId)executeCharacterManagementCommand({type:'AssignRoom',npcId,roomId});}}/> : isPoiMode ? (
                  <PoiScreen
                    environment={currentWeather}
                    poi={selectedPoi}
                    map={activeMap}
                    stationedNpcs={stationedNpcsAtSelectedPoi}
                    onReturnToMap={returnToMap}
                    onExecuteAction={(actionId) => executePoiAction(selectedPoi.id, actionId)}
                    onTalkNpc={(npcId, dialogueTreeId) => {
                      if (dialogueTreeId) {
                        startDialogue(dialogueTreeId);
                      }
                    }}
                    playerVitals={{
                      actionPointsCurrent: gameState.player.vitals.actionPointsCurrent,
                      actionPointsMax: gameState.player.vitals.actionPointsMax,
                      currentEther: gameState.player.vitals.currentEther,
                      maxEther: gameState.player.vitals.maxEther,
                      currentHp: gameState.player.vitals.currentHp,
                      maxHp: gameState.player.vitals.maxHp,
                      credits: gameState.player.inventory.credits,
                    }}
                  />
                ) : (
                  <WorldMapView
                    environment={currentWeather}
                    map={activeMap}
                    pois={poisForActiveMap}
                    currentPoiId={gameState.world.currentPoiId}
                    onSelectPoi={(poiId) => openPoi(poiId)}
                    onTravelToPoi={(poiId) => travelToPoi(poiId)}
                    playerVitals={{
                      actionPointsCurrent: gameState.player.vitals.actionPointsCurrent,
                      actionPointsMax: gameState.player.vitals.actionPointsMax,
                      currentEther: gameState.player.vitals.currentEther,
                      maxEther: gameState.player.vitals.maxEther,
                    }}
                  />
                )}
        </div>

        {/* Narrative & Event Log Terminal */}
        {!isExplorationMode && <div className="lg:col-span-4 xl:col-span-3 flex flex-col">
          <Panel
            title="NEURAL JOURNAL // EVENT LOG"
            subtitle="DATA STREAM"
            className="h-full"
          >
            <TerminalLog entries={gameState.journal} className="h-full min-h-[440px]" />
          </Panel>
        </div>}
      </div>

      {isExplorationMode && <ExplorationHud
        weather={currentWeather?.definition.name}
        sector={activeMap.subregion ?? activeMap.district}
        hp={{ current: gameState.player.vitals.currentHp, max: gameState.player.vitals.maxHp }}
        ether={{ current: gameState.player.vitals.currentEther, max: gameState.player.vitals.maxEther }}
        actionPoints={{ current: gameState.player.vitals.actionPointsCurrent, max: gameState.player.vitals.actionPointsMax }}
        credits={gameState.player.inventory.credits}
        onOpenMenu={() => setShowSaveModal(true)}
      />}

      {/* Action Result Modal Overlay */}
      {gameState.world.mode === 'ActionResult' && activeActionResolution && (
        <ActionResultModal
          resolution={activeActionResolution}
          onDismiss={dismissActionResolution}
        />
      )}

      {/* Dialogue Modal Overlay */}
      {gameState.world.mode === 'Dialogue' && activeDialogueNode && (
        <DialogueOverlay
          node={activeDialogueNode}
          onChoose={chooseDialogueOption}
          onClose={endDialogue}
        />
      )}

      {showSaveModal && <SaveStateModal
        state={gameState}
        saveStatus={saveStatus}
        onClose={() => setShowSaveModal(false)}
        saveToLocalSlot={saveToLocalSlot}
        loadFromLocalSlot={loadFromLocalSlot}
        exportSaveJson={exportSaveJson}
        importSaveJson={importSaveJson}
      />}
    </div>
  );
};
