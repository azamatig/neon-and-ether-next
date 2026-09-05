import { strict as assert } from 'node:assert';
import { GAME_CONTENT_MANIFEST } from '../content/manifest.ts';
import { ContentRegistry, GameSession } from '../packages/game-runtime/src/index.ts';

const ENCOUNTER_ID = 'enc_glassline_annex_core';

function createSession(seed = 90210): GameSession {
  const registry = new ContentRegistry();
  registry.loadManifest(GAME_CONTENT_MANIFEST);
  return new GameSession(registry, seed);
}

function roundTrip(session: GameSession): GameSession {
  const restored = createSession(1);
  const result = restored.loadSave(session.serializeSave(false));
  assert.equal(result.success, true, result.error);
  return restored;
}

// Victory rewards are rolled once, stored in pending gameplay state, and survive
// a save made during the loot phase without advancing or rewinding the RNG.
const lootSession = createSession();
const victory = lootSession.resolveCombatVictory(ENCOUNTER_ID, 4);
assert.ok(victory);
const originalLoot = structuredClone(victory.availableLoot);
const originalCredits = victory.creditsFound;
lootSession.takeLoot([], false); // Explicitly enter Loot while leaving all rewards pending.
const rngAtSave = lootSession.getRandomState();

const restoredLootSession = roundTrip(lootSession);
const restoredLoot = restoredLootSession.getActiveCombatResolution();
assert.equal(restoredLootSession.getState().world.mode, 'Loot');
assert.equal(restoredLootSession.getState().pendingGameplay.phase, 'loot');
assert.deepEqual(restoredLoot?.availableLoot, originalLoot);
assert.equal(restoredLoot?.creditsFound, originalCredits);
assert.deepEqual(restoredLootSession.getRandomState(), rngAtSave);

// A surviving enemy's mutable post-combat options are part of the pending
// resolution. They remain changed after load instead of being regenerated.
const prisonerSession = createSession(17);
assert.equal(prisonerSession.startCombatEncounter(ENCOUNTER_ID, false), true);
assert.equal(prisonerSession.startTacticalCombat(), true);
const prisonerSave = JSON.parse(prisonerSession.serializeSave(false));
const tacticalSurvivor = Object.values(prisonerSave.state.combat.combatants as Record<string, any>).find((unit: any) => unit.team === 'Enemy') as any;
assert.ok(tacticalSurvivor);
Object.assign(tacticalSurvivor, { currentHp: 0, isDefeated: true, isIncapacitated: true, defeatType: 'NonLethal', resolutionState: 'Incapacitated' });
assert.equal(prisonerSession.loadSave(prisonerSave).success, true);
const prisonerVictory = prisonerSession.resolveCombatVictory(ENCOUNTER_ID, 2);
const survivorId = prisonerVictory?.incapacitatedEnemies[0]?.id;
assert.ok(survivorId);
prisonerSession.executePostCombatAction(survivorId, 'Restrain');
const restoredPrisonerSession = roundTrip(prisonerSession);
const restoredSurvivor = restoredPrisonerSession
  .getActiveCombatResolution()
  ?.incapacitatedEnemies.find((enemy) => enemy.id === survivorId);
assert.equal(restoredPrisonerSession.getState().world.mode, 'PostCombat');
assert.equal(restoredPrisonerSession.getState().pendingGameplay.phase, 'postCombat');
assert.equal(restoredSurvivor?.status, 'Restrained');
assert.equal(restoredPrisonerSession.getState().pendingGameplay.lastPostCombatResolution?.actionId, 'Restrain');

// Blocking results and the unexecuted tail of a chained outcome are saved as
// gameplay state. Dismissing after load continues the chain exactly once.
const chainSession = createSession(31);
chainSession.resolveOutcome({
  type: 'sequence',
  outcomes: [
    { type: 'showResult', title: 'Checkpoint', resultText: 'Pending acknowledgement.' },
    { type: 'map' },
  ],
});
const restoredChainSession = roundTrip(chainSession);
assert.equal(restoredChainSession.getActiveActionResolution()?.title, 'Checkpoint');
assert.equal(restoredChainSession.getState().pendingGameplay.outcomeQueue.length, 1);
restoredChainSession.dismissActionResolution();
assert.equal(restoredChainSession.getState().world.mode, 'Map');
assert.equal(restoredChainSession.getState().pendingGameplay.outcomeQueue.length, 0);

console.log('Pending gameplay resolution save/load regression tests passed.');
