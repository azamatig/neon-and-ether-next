import { ContentRegistry, createInitialGameState, TurnBasedCombatEngine } from '../packages/game-runtime/src/index.ts';
import { GAME_CONTENT_MANIFEST } from '../content/index.ts';
import { TileType } from '../packages/game-schema/src/index.ts';

const registry = new ContentRegistry(); registry.loadManifest(GAME_CONTENT_MANIFEST);
const engine = new TurnBasedCombatEngine(registry); const game = createInitialGameState();
const state = engine.createEncounter('enc_prologue_ares_freight_checkpoint', game);
if (!state?.activeCombatantId) throw new Error('Combat grid fixture did not start.');
const actor = state.combatants[state.activeCombatantId];
const enemy = Object.values(state.combatants).find((unit) => unit.team !== actor.team);
if (!enemy) throw new Error('Combat grid fixture has no target.');
state.grid = {
  width: 5, height: 5, movementApCost: 2,
  playerDeployment: [], enemyDeployment: [],
  tiles: [
    { x: 1, y: 0, type: TileType.Wall, movementCost: 1, blocksLineOfSight: true, coverBonus: 100 },
    { x: 0, y: 1, type: TileType.HalfCover, movementCost: 2, blocksLineOfSight: false, coverBonus: 25 },
    { x: 1, y: 1, type: TileType.Console, movementCost: 1, blocksLineOfSight: false, coverBonus: 0 },
  ],
};
actor.position = { x: 0, y: 0 }; actor.movementRange = 3; actor.currentAp = actor.maxAp = 8;
enemy.position = { x: 4, y: 0 }; actor.weaponId = 'wpn_ether_baton';
for (const unit of Object.values(state.combatants)) if (unit.id !== actor.id && unit.id !== enemy.id) { unit.isDefeated = true; unit.currentHp = 0; }
const commands = engine.getResolvedCommands(state);
if (commands.legalMoves.some((cell) => cell.x === 1 && cell.y === 0)) throw new Error('Wall cell is reachable.');
if (!commands.legalMoves.some((cell) => cell.x === 1 && cell.y === 1 && cell.cost === 3)) throw new Error('Weighted route was not resolved.');
if (commands.attackTargetIds.includes(enemy.id)) throw new Error('Melee target outside range is legal.');
const move = engine.execute(state, { type: 'Move', actorId: actor.id, position: { x: 1, y: 1 } });
if (!move.success || move.state.combatants[actor.id].currentAp !== 6) throw new Error('Movement AP cost was not applied.');
move.state.combatants[enemy.id].position = { x: 2, y: 1 };
if (!engine.getResolvedCommands(move.state).attackTargetIds.includes(enemy.id)) throw new Error('Target inside weapon range is unavailable.');
console.log('Combat grid movement, terrain cost, occupancy, and target range passed.');
