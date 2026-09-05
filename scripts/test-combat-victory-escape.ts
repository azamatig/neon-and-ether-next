import { GAME_CONTENT_MANIFEST } from '../content/index.ts';
import { ContentRegistry, GameSession, TurnBasedCombatEngine, createInitialGameState } from '../packages/game-runtime/src/index.ts';

const registry = new ContentRegistry();
registry.loadManifest(GAME_CONTENT_MANIFEST);
const engine = new TurnBasedCombatEngine(registry);
const victoryState = engine.createEncounter('enc_prologue_ares_vault_response', createInitialGameState());
if (!victoryState) throw new Error('Victory condition fixture was not created.');
const hostileStates = ['Dead', 'Incapacitated', 'Surrendered', 'Destroyed'] as const;
Object.values(victoryState.combatants).filter((unit) => unit.team === 'Enemy').forEach((unit, index) => {
  unit.resolutionState = hostileStates[index % hostileStates.length];
  unit.isDefeated = unit.resolutionState === 'Dead' || unit.resolutionState === 'Destroyed' || unit.resolutionState === 'Incapacitated';
  unit.isIncapacitated = unit.resolutionState === 'Incapacitated' || unit.resolutionState === 'Surrendered';
  unit.defeatType = unit.resolutionState === 'Incapacitated' ? 'NonLethal' : unit.isDefeated ? 'Lethal' : undefined;
});
engine.getResolvedCommands(victoryState);
if (victoryState.outcome !== 'Victory' || victoryState.phase !== 'VICTORY') throw new Error('Non-combat-capable hostile side did not trigger victory.');

const defeatState = engine.createEncounter('enc_prologue_ares_freight_checkpoint', createInitialGameState());
if (!defeatState) throw new Error('Defeat condition fixture was not created.');
Object.values(defeatState.combatants).filter((unit) => unit.team === 'Player').forEach((unit) => {
  unit.resolutionState = 'Incapacitated'; unit.isDefeated = true; unit.isIncapacitated = true; unit.defeatType = 'NonLethal';
});
engine.getResolvedCommands(defeatState);
if (defeatState.outcome !== 'Defeat' || defeatState.phase !== 'DEFEAT') throw new Error('Non-combat-capable player party did not trigger defeat.');

const escapable = new GameSession(registry, 91);
if (!escapable.startCombatEncounter('enc_glassline_transit_standoff', false) || !escapable.startTacticalCombat()) throw new Error('Escapable encounter did not start.');
const flee = escapable.getResolvedCombatCommands().actions.find((action) => action.type === 'AttemptFlee');
if (!flee || flee.disabledReason) throw new Error('Allowed encounter did not expose Attempt Flee.');
const depletedSave = JSON.parse(escapable.serializeSave(false));
depletedSave.state.combat.combatants[depletedSave.state.combat.activeCombatantId].currentAp = 0;
if (!escapable.loadSave(depletedSave).success) throw new Error('Escape AP fixture did not load.');
if (escapable.getResolvedCombatCommands().actions.find((action) => action.type === 'AttemptFlee')?.disabledReason !== 'Not enough AP to attempt retreat.') throw new Error('Attempt Flee ignored its authored AP cost.');
const mandatory = new GameSession(registry, 92);
if (!mandatory.startCombatEncounter('enc_prologue_ares_freight_checkpoint', false) || !mandatory.startTacticalCombat()) throw new Error('Mandatory encounter did not start.');
const blockedFlee = mandatory.getResolvedCombatCommands().actions.find((action) => action.type === 'AttemptFlee');
if (!blockedFlee?.disabledReason?.includes('sealed')) throw new Error('Mandatory encounter did not expose its authored retreat restriction.');
console.log('Combat-capable side victory rules and authored tactical escape availability passed.');
