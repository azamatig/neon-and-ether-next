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
import { Badge, Button, Panel, PoiScreen, TacticalGridCanvas, TerminalLog, WorldMapView } from '@neon-ether/shared-ui';
import {
  Clock,
  Compass,
  Download,
  FileJson,
  HelpCircle,
  Layers,
  MapPin,
  MessageSquare,
  Package,
  Save,
  Shield,
  Swords,
  Upload,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';

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
    resolveCombatVictory,
    resolveCombatDefeat,
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

  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'saveLoad' | 'stateInspector'>('saveLoad');
  const [inspectorSubTab, setInspectorSubTab] = useState<
    'player' | 'world' | 'npcs' | 'quests' | 'inventory' | 'factions' | 'base' | 'time'
  >('player');

  const handleDownloadSaveFile = () => {
    const json = exportSaveJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon_ether_save_v1_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    if (!jsonInput.trim()) return;
    importSaveJson(jsonInput);
  };

  if (!activeMap) {
    return (
      <div className="p-6 text-center text-rose-400 font-mono">
        [ERROR] No active map found in game session!
      </div>
    );
  }

  const isPoiMode = gameState.world.mode === 'POI' && selectedPoi;
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
                {isPoiMode ? (
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

      {/* Save Game & Serializable State Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <Panel
            title="SERIALIZABLE GAME STATE // SAVE ENGINE"
            subtitle="CLEAN DEFINITION & RUNTIME SEPARATION (SCHEMA VERSIONING & MIGRATIONS)"
            glow="cyan"
            className="w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-y-auto"
            headerRight={
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            }
          >
            <div className="flex flex-col gap-4 font-mono text-xs">
              {/* Modal Tabs */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('saveLoad')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'saveLoad'
                        ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    Save & Load Slots
                  </button>
                  <button
                    onClick={() => setActiveTab('stateInspector')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'stateInspector'
                        ? 'bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/40 font-bold'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    State Sub-Modules
                  </button>
                </div>
                {saveStatus && <Badge variant="cyan" size="xs">{saveStatus}</Badge>}
              </div>

              {activeTab === 'saveLoad' ? (
                <div className="flex flex-col gap-4">
                  {/* Slots Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['Slot 1 (Autosave)', 'Slot 2 (Manual)', 'Slot 3 (Manual)'].map((slot) => (
                      <div
                        key={slot}
                        className="p-3 bg-black/40 border border-white/10 rounded-xl flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="text-white font-bold flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5 text-[#00f2ff]" />
                            <span>{slot}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-sans">
                            {localStorage.getItem(`neon_save_${slot}`)
                              ? 'Saved state present in local browser storage'
                              : 'Empty save slot'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => saveToLocalSlot(slot)}
                            className="flex-1"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => loadFromLocalSlot(slot)}
                            className="flex-1"
                          >
                            Load
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* JSON Export / Import */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                        <FileJson className="w-4 h-4 text-amber-400" /> SaveGame JSON Envelope (v1)
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleDownloadSaveFile}
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                      >
                        Download Save File
                      </Button>
                    </div>

                    <p className="text-[11px] text-slate-400 font-sans">
                      Content definitions (maps, POIs, dialogues, items) are never copied into the savegame.
                      The save stores immutable IDs and serializable runtime mutations only, wrapped with schemaVersion metadata.
                    </p>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase text-slate-400">
                        Paste SaveGame JSON (supports automatic migration from v0 to v1):
                      </label>
                      <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='Paste SaveGame JSON or legacy flat GameState JSON here...'
                        className="w-full h-28 bg-black/60 border border-white/10 rounded-lg p-2.5 font-mono text-[10px] text-emerald-400 focus:outline-none focus:border-[#00f2ff]"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleImportJson}
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                        >
                          Import & Migrate
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* State Inspector Tab */
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5 border-b border-white/10 pb-2">
                    {[
                      { key: 'player', label: 'PlayerState' },
                      { key: 'world', label: 'WorldState' },
                      { key: 'npcs', label: 'NpcRuntimeState' },
                      { key: 'quests', label: 'QuestRuntimeState' },
                      { key: 'inventory', label: 'InventoryState' },
                      { key: 'factions', label: 'FactionRuntimeState' },
                      { key: 'base', label: 'BaseState' },
                      { key: 'time', label: 'TimeState' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setInspectorSubTab(tab.key as any)}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                          inspectorSubTab === tab.key
                            ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                            : 'text-slate-400 hover:text-white bg-white/5'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="bg-black/60 border border-white/10 rounded-xl p-3 max-h-72 overflow-y-auto">
                    <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                      {inspectorSubTab === 'player' && JSON.stringify(gameState.player, null, 2)}
                      {inspectorSubTab === 'world' && JSON.stringify(gameState.world, null, 2)}
                      {inspectorSubTab === 'npcs' && JSON.stringify(gameState.npcs, null, 2)}
                      {inspectorSubTab === 'quests' && JSON.stringify(gameState.quests, null, 2)}
                      {inspectorSubTab === 'inventory' && JSON.stringify(gameState.player.inventory, null, 2)}
                      {inspectorSubTab === 'factions' && JSON.stringify(gameState.factions, null, 2)}
                      {inspectorSubTab === 'base' && JSON.stringify(gameState.base, null, 2)}
                      {inspectorSubTab === 'time' && JSON.stringify(gameState.time, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-white/10">
                <Button variant="primary" size="sm" onClick={() => setShowSaveModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
};
