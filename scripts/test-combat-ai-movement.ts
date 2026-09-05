import { GAME_CONTENT_MANIFEST } from '../content/index.ts';
import { ContentRegistry, TurnBasedCombatEngine, createInitialGameState } from '../packages/game-runtime/src/index.ts';

const registry = new ContentRegistry();
registry.loadManifest(GAME_CONTENT_MANIFEST);
const engine = new TurnBasedCombatEngine(registry);
const state = engine.createEncounter('enc_prologue_ares_freight_checkpoint', createInitialGameState());
if (!state) throw new Error('AI movement encounter was not created.');
const enemy = Object.values(state.combatants).find((unit) => unit.team === 'Enemy');
const player = Object.values(state.combatants).find((unit) => unit.team === 'Player');
if (!enemy || !player) throw new Error('AI movement encounter has no opposing units.');
for (const unit of Object.values(state.combatants)) {
  if (unit.id !== enemy.id && unit.id !== player.id) { unit.currentHp = 0; unit.isDefeated = true; unit.defeatType = 'Lethal'; }
}
state.grid = { width: 8, height: 4, movementApCost: 1, tiles: [], blockingCells: [{ x: 2, y: 1 }], playerDeployment: [], enemyDeployment: [] };
enemy.position = { x: 0, y: 0 };
enemy.weaponId = 'wpn_ether_baton';
enemy.abilityIds = [];
enemy.currentAp = enemy.maxAp = 8;
enemy.currentEther = enemy.maxEther = 50;
enemy.movementRange = enemy.movementRemaining = 3;
player.position = { x: 4, y: 0 };
state.activeCombatantId = enemy.id;
state.activeTurnIndex = state.turnOrder.indexOf(enemy.id);
const before = { ...enemy.position };
const legalMoves = engine.getResolvedCommands(state).legalMoves;
const move = engine.chooseAIAction(state);
if (move?.type !== 'Move') throw new Error('Out-of-range AI did not choose movement.');
if (!legalMoves.some((cell) => cell.x === move.position.x && cell.y === move.position.y)) throw new Error('AI selected a move outside runtime legal targets.');
const movedDistance = Math.abs(move.position.x - before.x) + Math.abs(move.position.y - before.y);
if (movedDistance > enemy.movementRange || (move.position.x === 2 && move.position.y === 1)) throw new Error('AI teleported or entered a blocking cell.');
const moved = engine.execute(state, move);
if (!moved.success || moved.state.combatants[enemy.id].currentAp !== 7) throw new Error('AI movement did not use the normal command/AP pipeline.');
const followUp = engine.chooseAIAction(moved.state);
if (followUp?.type !== 'MeleeAttack') throw new Error('AI did not attack after moving into valid melee range.');
const attacked = engine.execute(moved.state, followUp);
if (!attacked.success || attacked.state.combatants[player.id].currentHp >= player.currentHp) throw new Error('AI follow-up attack did not use normal combat resolution.');
const incapacitated = structuredClone(moved.state);
incapacitated.combatants[enemy.id].statuses.push({ statusEffectId: 'status_mental_suppression', remainingTurns: 2 });
if (engine.chooseAIAction(incapacitated) !== undefined) throw new Error('Incapacitated AI was allowed to act.');
console.log('Enemy AI used legal grid movement, then attacked without teleporting.');
