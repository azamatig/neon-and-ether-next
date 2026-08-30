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
import { Badge, BaseScreen, Button, Panel, PoiScreen, TerminalLog, WorldMapView } from '@neon-ether/shared-ui';
import { Save } from 'lucide-react';

export const GameApp: React.FC = () => {
  const {
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
  const isCombatResultMode = gameState.world.mode === 'CombatResult' && activeCombatResolution;
  const isTacticalCombatMode = gameState.world.mode === 'TacticalCombat';

  return (
    <div className="w-full h-full flex flex-col gap-3 font-sans">
      {/* Top Tactical HUD */}
      <TacticalHUD
        player={resolvedPlayer}
        onEndTurn={resetTurnAp}
        onQuickEtherCast={() => spendEther(5)}
      />

      {/* Main Viewport & Sidebar Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[520px]">
        {/* District Map, POI Viewport, Event Screen, or Combat Viewport */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
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
          ) : (
            <Panel
              title={
                isPoiMode
                  ? `LOCATION PROTOCOL // ${selectedPoi.name.toUpperCase()}`
                  : `DISTRICT TACTICAL MAP // ${activeMap.name.toUpperCase()}`
              }
              subtitle={`${activeMap.district} • Time: Day ${gameState.time.day}, ${String(gameState.time.hour).padStart(2, '0')}:${String(gameState.time.minute).padStart(2, '0')} (${gameState.time.timeOfDay})`}
              glow="cyan"
              className="h-full flex flex-col"
              headerRight={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowSaveModal(true)}
                    leftIcon={<Save className="w-3.5 h-3.5 text-[#00f2ff]" />}
                  >
                    Save / State
                  </Button>
                  <Badge variant="purple" size="xs">
                    ETHER: {activeMap.ambientEtherLevel}%
                  </Badge>
                </div>
              }
            >
              <div className="flex-1 min-h-[460px] relative flex flex-col">
                {isBaseMode ? <BaseScreen base={gameState.base} onReturn={returnToMap}/> : isPoiMode ? (
                  <PoiScreen
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
            </Panel>
          )}
        </div>

        {/* Narrative & Event Log Terminal */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col">
          <Panel
            title="NEURAL JOURNAL // EVENT LOG"
            subtitle="DATA STREAM"
            className="h-full"
          >
            <TerminalLog entries={gameState.journal} className="h-full min-h-[440px]" />
          </Panel>
        </div>
      </div>

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
