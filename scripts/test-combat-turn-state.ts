import { ContentRegistry, createInitialGameState, TurnBasedCombatEngine } from '../packages/game-runtime/src/index.ts';
import { GAME_CONTENT_MANIFEST } from '../content/index.ts';

const registry = new ContentRegistry();
registry.loadManifest(GAME_CONTENT_MANIFEST);
const engine = new TurnBasedCombatEngine(registry);
const game = createInitialGameState();
let state = engine.createEncounter('enc_prologue_ares_freight_checkpoint', game);
if (!state) throw new Error('Combat fixture could not be resolved.');

const assertActiveInvariant = () => {
  if (state?.phase !== 'ACTIVE') throw new Error(`Expected ACTIVE phase, received ${state?.phase}.`);
  if (!state.activeCombatantId) throw new Error('ACTIVE combat has no activeCombatantId.');
  const active = state.combatants[state.activeCombatantId];
  if (!active || active.isDefeated || !state.turnOrder.includes(active.id)) throw new Error('ACTIVE combatant is invalid.');
};

assertActiveInvariant();
const skippedId = state.turnOrder.find((id) => id !== state.activeCombatantId);
if (!skippedId) throw new Error('Fixture requires a second combatant.');
state.combatants[skippedId].isDefeated = true;
state.combatants[skippedId].currentHp = 0;

const targetRound = state.roundNumber + 10;
let transitions = 0;
while (state.roundNumber < targetRound) {
  assertActiveInvariant();
  const result = engine.execute(state, { type: 'EndTurn', actorId: state.activeCombatantId! });
  if (!result.success) throw new Error(result.reason ?? 'EndTurn failed.');
  state = result.state;
  if (state.phase === 'ACTIVE' && state.activeCombatantId === skippedId) throw new Error('Defeated actor was selected.');
  transitions += 1;
  if (transitions > 200) throw new Error('Infinite turn loop guard exceeded.');
}
assertActiveInvariant();
console.log('Combat turn state remained valid for 10 consecutive rounds.');
