import { ContentRegistry, GameSession } from '../packages/game-runtime/src/index.ts';
import { GAME_CONTENT_MANIFEST } from '../content/index.ts';

const registry = new ContentRegistry();
registry.loadManifest(GAME_CONTENT_MANIFEST);

const assertResolvedRosterHandoff = (session: GameSession, encounterId: string) => {
  const preview = session.getCombatPreview(encounterId);
  if (!preview) throw new Error(`${encounterId}: combat preview was not resolved.`);
  const activeCompanionIds = session.getState().companions.filter((id) => session.getState().npcs[id]?.isAlive !== false);
  const previewPartyIds = new Set(preview.party.map((unit) => unit.id));
  for (const companionId of activeCompanionIds) if (!previewPartyIds.has(companionId)) throw new Error(`${encounterId}: active companion ${companionId} is missing from preview.`);
  const previewEnemyCount = preview.enemies.reduce((total, group) => total + group.count, 0);
  const previewRoster = [
    ...preview.party.map((unit) => `${unit.id}:Player`),
    ...preview.enemies.flatMap((unit) => Array.from({ length: unit.count }, () => `${unit.id}:Enemy`)),
  ].sort();
  if (!session.startTacticalCombat(encounterId)) throw new Error(`${encounterId}: tactical combat did not start.`);
  const combat = session.getState().combat;
  const tacticalRoster = Object.values(combat.combatants).map((unit) => `${unit.id}:${unit.team}`).sort();
  const tacticalEnemyCount = Object.values(combat.combatants).filter((unit) => unit.team === 'Enemy').length;
  if (previewEnemyCount !== tacticalEnemyCount) throw new Error(`${encounterId}: enemy count changed from ${previewEnemyCount} to ${tacticalEnemyCount}.`);
  for (const companionId of activeCompanionIds) if (!combat.combatants[companionId]) throw new Error(`${encounterId}: active companion ${companionId} is missing from tactical combat.`);
  if (JSON.stringify(previewRoster) !== JSON.stringify(tacticalRoster)) {
    throw new Error(`${encounterId}: resolved roster changed between preview and combat.\nPreview: ${previewRoster}\nCombat: ${tacticalRoster}`);
  }
  const initiativeOrder = Object.values(combat.combatants).sort((left, right) => right.initiative - left.initiative || left.id.localeCompare(right.id)).map((unit) => unit.id);
  if (JSON.stringify(initiativeOrder) !== JSON.stringify(combat.turnOrder)) throw new Error(`${encounterId}: turn order does not match runtime initiative.`);
  if (combat.activeCombatantId !== combat.turnOrder[combat.activeTurnIndex]) throw new Error(`${encounterId}: current combatant is not aligned with turn order.`);
  for (const unit of Object.values(combat.combatants).filter((combatant) => combatant.team === 'Player')) {
    if (!unit.name || unit.maxHp <= 0) throw new Error(`${encounterId}: ${unit.id} has incomplete combat presentation data.`);
    if (!combat.turnOrder.includes(unit.id)) throw new Error(`${encounterId}: ${unit.id} is missing from turn order.`);
    if (!Number.isFinite(unit.position.x) || !Number.isFinite(unit.position.y)) throw new Error(`${encounterId}: ${unit.id} has no tactical position.`);
  }
  const positions = Object.values(combat.combatants).map((unit) => `${unit.position.x}:${unit.position.y}`);
  if (new Set(positions).size !== positions.length) throw new Error(`${encounterId}: initial grid positions overlap.`);
};

const freight = new GameSession(registry, 1337);
freight.executeEffect({ type: 'setFlag', flag: 'prologue.entry_advantage', value: true });
if (!freight.startEvent('evt_prologue_freight_encounter')) throw new Error('Freight encounter checkpoint did not start.');
while (freight.getState().world.mode === 'Event') freight.advanceEventStep();
assertResolvedRosterHandoff(freight, 'enc_prologue_ares_freight_checkpoint');

const vault = new GameSession(registry, 7331);
vault.executeEffect({ type: 'startQuest', questId: 'qst_prologue_ares_vault', initialStageId: 'stage_07_central_vault' });
const infiltrationCompanions = registry.npcs.findByTag('AresInfiltration').filter((npc) => npc.isCompanion);
if (infiltrationCompanions.length === 0) throw new Error('Vault response fixture did not resolve any active companions from content.');
for (const companion of infiltrationCompanions) vault.executeEffect({ type: 'recruitNpc', npcId: companion.id, asCompanion: true });
if (!vault.startEvent('evt_prologue_central_vault_bonding')) throw new Error('Vault response setup did not start.');
while (vault.getState().world.mode === 'Event') vault.advanceEventStep();
assertResolvedRosterHandoff(vault, 'enc_prologue_ares_vault_response');

console.log('Both Prologue Combat Preview rosters equal their Tactical Combat initial rosters.');
