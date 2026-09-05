import { GAME_CONTENT_MANIFEST } from '../content/index.ts';
import { ContentRegistry, TurnBasedCombatEngine, createInitialGameState } from '../packages/game-runtime/src/index.ts';

const registry = new ContentRegistry();
registry.loadManifest(GAME_CONTENT_MANIFEST);
const game = createInitialGameState();
const combatAbilityIds = registry.abilities.getAll().filter((ability) => ability.usableContexts.includes('Combat')).map((ability) => ability.id);
game.player.abilityIds = combatAbilityIds;
const engine = new TurnBasedCombatEngine(registry);
const state = engine.createEncounter('enc_prologue_ares_vault_response', game);
if (!state) throw new Error('Ability test encounter was not created.');
const player = state.combatants[game.player.characterId];
const human = Object.values(state.combatants).find((unit) => registry.getEnemy(unit.sourceId)?.tags.includes('HasMind'));
const mindless = Object.values(state.combatants).find((unit) => unit.team === 'Enemy' && !registry.getEnemy(unit.sourceId)?.tags.includes('HasMind'));
if (!player || !human || !mindless) throw new Error('Ability test requires player, sentient, and mindless combatants.');
player.currentAp = player.maxAp = 20;
player.currentEther = player.maxEther = 100;
player.position = { x: 0, y: 0 };
human.position = { x: 2, y: 0 };
mindless.position = { x: 2, y: 1 };
state.activeCombatantId = player.id;
state.activeTurnIndex = state.turnOrder.indexOf(player.id);
const commands = engine.getResolvedCommands(state);
for (const abilityId of combatAbilityIds) {
  if (!commands.actions.some((action) => action.abilityId === abilityId)) throw new Error(`Combat ability ${abilityId} is missing from resolved actions.`);
}
for (const ability of registry.abilities.getAll().filter((entry) => entry.requiredTargetTags.includes('HasMind'))) {
  const action = commands.actions.find((entry) => entry.abilityId === ability.id);
  if (!action?.targetIds.includes(human.id)) throw new Error(`${ability.id} rejected a HasMind target.`);
  if (action.targetIds.includes(mindless.id)) throw new Error(`${ability.id} accepted a target without HasMind.`);
  if (action.targetRejections?.[mindless.id] !== 'IMMUNE: NO SENTIENT MIND') throw new Error(`${ability.id} did not expose a readable immunity reason.`);
}
const depleted = structuredClone(state);
depleted.combatants[player.id].currentEther = 0;
const depletedCommands = engine.getResolvedCommands(depleted);
const costlyAbility = registry.abilities.getAll().find((ability) => ability.usableContexts.includes('Combat') && ability.etherCost > 0);
if (costlyAbility && depletedCommands.actions.find((action) => action.abilityId === costlyAbility.id)?.disabledReason !== 'Not enough Ether.') throw new Error('Resource requirement was not exposed by resolved commands.');
console.log('Combat abilities, context filtering, resources, and HasMind targeting passed.');
