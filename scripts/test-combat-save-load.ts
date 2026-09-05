import { GAME_CONTENT_MANIFEST } from '../content/index.ts';
import { ContentRegistry, GameSession } from '../packages/game-runtime/src/index.ts';

const registry = new ContentRegistry();
registry.loadManifest(GAME_CONTENT_MANIFEST);
const source = new GameSession(registry, 6060);
if (!source.startCombatEncounter('enc_glassline_transit_standoff', false) || !source.startTacticalCombat()) throw new Error('Active combat save fixture did not start.');
const fixture = JSON.parse(source.serializeSave(false));
const combat = fixture.state.combat;
const active = combat.combatants[combat.activeCombatantId];
active.currentHp = Math.max(1, active.currentHp - 3);
active.currentAp = Math.max(0, active.currentAp - 1);
active.currentEther = Math.max(0, active.currentEther - 2);
active.statuses.push({ statusEffectId: 'status_burning', remainingTurns: 2, sourceCombatantId: active.id });
if (!source.loadSave(fixture).success) throw new Error('Prepared active combat fixture could not be loaded.');
const expected = source.getState().combat;
const restored = new GameSession(registry, 1);
if (!restored.loadSave(source.serializeSave(false)).success) throw new Error('Active tactical combat save did not load.');
const actual = restored.getState().combat;
if (!actual.isActive || actual.phase !== 'ACTIVE') throw new Error('Loaded tactical combat is no longer active.');
if (actual.activeCombatantId !== expected.activeCombatantId) throw new Error('Active actor changed after save/load.');
if (JSON.stringify(actual.turnOrder) !== JSON.stringify(expected.turnOrder)) throw new Error('Turn order changed after save/load.');
for (const [id, before] of Object.entries(expected.combatants)) {
  const after = actual.combatants[id];
  if (!after) throw new Error(`Combatant ${id} disappeared after save/load.`);
  if (JSON.stringify(after.position) !== JSON.stringify(before.position)) throw new Error(`${id}: position changed after save/load.`);
  if (after.currentHp !== before.currentHp || after.currentAp !== before.currentAp || after.currentEther !== before.currentEther) throw new Error(`${id}: HP/AP/Ether changed after save/load.`);
  if (JSON.stringify(after.statuses) !== JSON.stringify(before.statuses)) throw new Error(`${id}: statuses changed after save/load.`);
}
console.log('Active Tactical Combat positions, resources, order, actor, and statuses survived save/load.');
