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
if (!tacticalRoster.some((unit) => unit.startsWith('npc_prologue_companion_female:')) || !tacticalRoster.some((unit) => unit.startsWith('npc_prologue_companion_male:'))) throw new Error('Companions were not deployed.');
const positions = Object.values(session.getState().combat.combatants).map((unit) => `${unit.position.x}:${unit.position.y}`);
if (new Set(positions).size !== positions.length) throw new Error('Initial grid positions overlap.');
console.log('PreCombatResolvedRoster === TacticalCombatInitialRoster');
