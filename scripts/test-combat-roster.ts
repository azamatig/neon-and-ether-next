import { ContentRegistry, GameSession } from '../packages/game-runtime/src/index.ts';
import { GAME_CONTENT_MANIFEST } from '../content/index.ts';

const registry = new ContentRegistry();
registry.loadManifest(GAME_CONTENT_MANIFEST);
const session = new GameSession(registry, 1337);
session.executeEffect({ type: 'setFlag', flag: 'prologue.entry_advantage', value: true });
if (!session.startEvent('evt_prologue_freight_encounter')) throw new Error('Encounter checkpoint did not start.');
while (session.getState().world.mode === 'Event') session.advanceEventStep();
const preview = session.getCombatPreview();
if (!preview) throw new Error('Combat preview was not resolved.');
const previewRoster = [...preview.party.map((unit) => `${unit.id}:Player`), ...preview.enemies.flatMap((unit) => Array.from({ length: unit.count }, () => `${unit.id}:Enemy`))].sort();
if (!session.startTacticalCombat()) throw new Error('Tactical combat did not start.');
const tacticalRoster = Object.values(session.getState().combat.combatants).map((unit) => `${unit.id}:${unit.team}`).sort();
if (JSON.stringify(previewRoster) !== JSON.stringify(tacticalRoster)) {
  throw new Error(`Resolved roster changed between preview and combat.\nPreview: ${previewRoster}\nCombat: ${tacticalRoster}`);
}
const initiativeOrder = Object.values(session.getState().combat.combatants).sort((left, right) => right.initiative - left.initiative || left.id.localeCompare(right.id)).map((unit) => unit.id);
if (JSON.stringify(initiativeOrder) !== JSON.stringify(session.getState().combat.turnOrder)) throw new Error('Turn order does not match runtime initiative.');
if (session.getState().combat.activeCombatantId !== session.getState().combat.turnOrder[session.getState().combat.activeTurnIndex]) throw new Error('Current combatant is not aligned with turn order.');
if (!tacticalRoster.some((unit) => unit.startsWith('npc_prologue_companion_female:')) || !tacticalRoster.some((unit) => unit.startsWith('npc_prologue_companion_male:'))) throw new Error('Companions were not deployed.');
for (const companionId of ['npc_prologue_companion_female', 'npc_prologue_companion_male']) {
  const companion = session.getState().combat.combatants[companionId];
  if (!companion || companion.team !== 'Player' || !companion.bodyImage) throw new Error(`${companionId} presentation data is incomplete.`);
  if (!companion.weaponId || companion.abilityIds.length === 0) throw new Error(`${companionId} equipment or abilities were not resolved.`);
  if (!session.getState().combat.turnOrder.includes(companionId)) throw new Error(`${companionId} is missing from turn order.`);
  if (!Number.isFinite(companion.position.x) || !Number.isFinite(companion.position.y)) throw new Error(`${companionId} has no tactical position.`);
}
const positions = Object.values(session.getState().combat.combatants).map((unit) => `${unit.position.x}:${unit.position.y}`);
if (new Set(positions).size !== positions.length) throw new Error('Initial grid positions overlap.');
console.log('PreCombatResolvedRoster === TacticalCombatInitialRoster');
