/**
 * @apps/game
 * Main Game Application Entry View & POI Exploration Flow.
 * Map Screen → click POI → POI Screen → choose action/event/quest → return to Map.
 */

import React, { useEffect, useState } from 'react';
import { useGameRuntime } from './hooks/useGameRuntime.ts';
import { DialogueOverlay } from './components/DialogueOverlay.tsx';
import { ActionResultModal } from './components/ActionResultModal.tsx';
import { EventContainer } from './components/EventContainer.tsx';
import { CombatPreviewContainer } from './components/CombatPreviewContainer.tsx';
import { CombatResultContainer } from './components/CombatResultContainer.tsx';
import { TurnBasedCombatScreen } from './components/TurnBasedCombatScreen.tsx';
import { CharacterSheet } from './components/CharacterSheet.tsx';
import { InGameMenu, MainMenu } from './components/GameMenus.tsx';
import { CharacterCreator } from './components/CharacterCreator.tsx';
import{MatchValuesScreen}from'./components/MatchValuesScreen.tsx';
import { BaseScreen, CraftingScreen, ExplorationHud, GameShell, PoiScreen, ShopScreen, WorldMapView } from '@neon-ether/shared-ui';

export const GameApp: React.FC = () => {
  const runtime = useGameRuntime();
  const { gameState, activeMap, currentWeather, selectedPoi } = runtime;
  const [showCharacter, setShowCharacter] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(() => !new URLSearchParams(window.location.search).has('newGame'));
  const [showCreator, setShowCreator] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('newGame')) return;
    url.searchParams.delete('newGame');
    window.history.replaceState({}, '', url);
  }, []);
  if (!activeMap) return <div className="p-6 text-center text-rose-400 font-mono">[ERROR] No active map found in game session!</div>;

  const mode = gameState.world.mode;
  const isPoi = mode === 'POI' && selectedPoi;
  const isEvent = mode === 'Event' && runtime.activeEventState;
  const isPreview = mode === 'CombatPreview' && runtime.activeCombatPreview;
  const isResult = ['CombatResult','Loot','PostCombat'].includes(mode) && runtime.activeCombatResolution;
  const isCombat = mode === 'TacticalCombat';
  const isScreen = mode === 'Screen';
  const isMinigame=mode==='Minigame'&&runtime.activeMinigame&&runtime.activeMinigameSession;
  const shellMode = isCombat || isPreview || isResult ? 'combat' : isEvent||isMinigame || mode === 'Dialogue' ? 'immersive' : 'standard';
  const hud = ['Map','POI','Screen'].includes(mode) ? <ExplorationHud weather={currentWeather?.definition.name} sector={activeMap.subregion ?? activeMap.district} hp={{current:gameState.player.vitals.currentHp,max:gameState.player.vitals.maxHp}} ether={{current:gameState.player.vitals.currentEther,max:gameState.player.vitals.maxEther}} actionPoints={{current:gameState.player.vitals.actionPointsCurrent,max:gameState.player.vitals.actionPointsMax}} credits={gameState.player.inventory.credits} onOpenCharacterSheet={()=>setShowCharacter(true)} onOpenMenu={()=>setShowGameMenu(true)}/> : undefined;

  let content: React.ReactNode;
  if(isMinigame)content=<MatchValuesScreen definition={runtime.activeMinigame!} session={runtime.activeMinigameSession!} states={runtime.minigameSequenceStates} onSelect={runtime.selectMinigameCell} onFinish={runtime.finishMinigame}/>;
  else if (isEvent) content=<EventContainer eventState={runtime.activeEventState!} onAdvanceStep={runtime.advanceEventStep} onChooseOption={runtime.chooseEventOption} onSkip={runtime.skipEvent}/>;
  else if (isPreview) content=<CombatPreviewContainer preview={runtime.activeCombatPreview!} onEngage={runtime.startTacticalCombat} onEscape={runtime.attemptCombatEscape}/>;
  else if (isResult) content=<CombatResultContainer resolution={runtime.activeCombatResolution!} onTakeLoot={runtime.takeLoot} onExecutePostCombatAction={runtime.executePostCombatAction} onDismiss={runtime.dismissCombatResult}/>;
  else if (isCombat) content=<TurnBasedCombatScreen state={gameState.combat} abilities={runtime.combatAbilities} onCommand={runtime.executeCombatAction}/>;
  else if (isScreen && gameState.world.activeScreen==='Market') content=<ShopScreen view={runtime.activeShop} inventory={gameState.player.inventory} items={runtime.itemDefinitions} onBuy={runtime.buyFromShop} onSell={runtime.sellToShop} onReturn={runtime.returnToOrigin}/>;
  else if (isScreen && gameState.world.activeScreen==='Workbench') content=<CraftingScreen recipes={runtime.recipes} availableIds={runtime.availableRecipeIds} inventory={gameState.player.inventory} items={runtime.itemDefinitions} onCraft={runtime.craftRecipe} onReturn={runtime.returnToOrigin}/>;
  else if (isScreen && gameState.world.activeScreen==='Base') content=<BaseScreen base={gameState.base} onReturn={runtime.returnToOrigin} roomOptions={runtime.getBaseRoomOptions} upgradeOptions={runtime.getBaseUpgradeOptions} residents={runtime.baseResidents} jobs={runtime.baseJobs} onBuildRoom={(slotId,roomDefinitionId)=>runtime.executeBaseManagementCommand({type:'BuildRoom',slotId,roomDefinitionId})} onInstallUpgrade={(roomInstanceId,upgradeId)=>runtime.executeBaseManagementCommand({type:'InstallUpgrade',roomInstanceId,upgradeId})} onAssign={(npcId,jobId,roomId)=>{if(jobId)runtime.executeCharacterManagementCommand({type:'AssignJob',npcId,jobId});if(roomId)runtime.executeCharacterManagementCommand({type:'AssignRoom',npcId,roomId});}}/>;
  else if (isPoi) content=<PoiScreen environment={currentWeather} poi={selectedPoi} map={activeMap} stationedNpcs={runtime.stationedNpcsAtSelectedPoi} onReturnToMap={runtime.returnToMap} onExecuteAction={(id)=>runtime.executePoiAction(selectedPoi.id,id)} onTalkNpc={(_id,treeId)=>treeId&&runtime.startDialogue(treeId)} playerVitals={{actionPointsCurrent:gameState.player.vitals.actionPointsCurrent,actionPointsMax:gameState.player.vitals.actionPointsMax,currentEther:gameState.player.vitals.currentEther,maxEther:gameState.player.vitals.maxEther,currentHp:gameState.player.vitals.currentHp,maxHp:gameState.player.vitals.maxHp,credits:gameState.player.inventory.credits}}/>;
  else content=<WorldMapView environment={currentWeather} map={activeMap} pois={runtime.poisForActiveMap} currentPoiId={gameState.world.currentPoiId} onSelectPoi={runtime.openPoi} onTravelToPoi={runtime.travelToPoi}/>;

  if (showCreator && runtime.characterCreationOptions.definition) return <CharacterCreator definition={runtime.characterCreationOptions.definition} backgrounds={runtime.characterCreationOptions.backgrounds} perks={runtime.characterCreationOptions.perks} validate={runtime.validateCharacterCreation} preview={runtime.previewCharacterCreation} onCancel={()=>setShowCreator(false)} onConfirm={(selection)=>{const result=runtime.initializeNewGame(selection);if(result.valid){setShowCreator(false);setShowMainMenu(false)}}}/>;
  if (showMainMenu) return <MainMenu onNewGame={()=>setShowCreator(true)} onContinue={(slot)=>{const result=runtime.loadFromLocalSlot(slot);if(result.success)setShowMainMenu(false);return result;}}/>;

  return <GameShell mode={shellMode} hud={hud}>{content}
    {mode==='ActionResult'&&runtime.activeActionResolution&&<ActionResultModal resolution={runtime.activeActionResolution} onDismiss={runtime.dismissActionResolution}/>}
    {mode==='Dialogue'&&runtime.activeDialogueNode&&<DialogueOverlay node={runtime.activeDialogueNode} onChoose={runtime.chooseDialogueOption} onClose={runtime.endDialogue}/>}
    {showCharacter&&<CharacterSheet state={gameState} items={runtime.itemDefinitions} quests={runtime.questDossiers} party={runtime.partyMembers} onClose={()=>setShowCharacter(false)} onEquip={runtime.equipInventoryEntry} onUnequip={runtime.unequipSlot} onDrop={runtime.dropInventoryItem}/>}
    {showGameMenu&&<InGameMenu onResume={()=>setShowGameMenu(false)} onMainMenu={()=>{setShowGameMenu(false);setShowMainMenu(true)}} onSave={runtime.saveToLocalSlot} onLoad={(slot)=>{const result=runtime.loadFromLocalSlot(slot);if(result.success)setShowGameMenu(false);return result;}}/>}
  </GameShell>;
};
