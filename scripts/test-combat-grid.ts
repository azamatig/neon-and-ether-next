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
  blockingCells: [{ x: 2, y: 1 }], playerDeployment: [], enemyDeployment: [],
  tiles: [
    { x: 1, y: 0, type: TileType.Wall, movementCost: 1, blocksLineOfSight: true, coverBonus: 100 },
    { x: 0, y: 1, type: TileType.HalfCover, movementCost: 2, blocksLineOfSight: false, coverBonus: 25 },
    { x: 1, y: 1, type: TileType.Console, movementCost: 1, blocksLineOfSight: false, coverBonus: 0 },
  ],
};
actor.position = { x: 0, y: 0 }; actor.movementRange = 3; actor.movementRemaining = 3; actor.currentAp = actor.maxAp = 8;
actor.currentEther = actor.maxEther = 50;
actor.abilityIds = ['ability_thermal_burst', 'ability_mindmancer_read_mind', 'ability_ether_patch'];
enemy.position = { x: 4, y: 0 }; actor.weaponId = 'wpn_ether_baton';
for (const unit of Object.values(state.combatants)) if (unit.id !== actor.id && unit.id !== enemy.id) { unit.isDefeated = true; unit.currentHp = 0; }
const commands = engine.getResolvedCommands(state);
for (const required of ['attack.weapon', 'attack.melee', 'move', 'end-turn']) if (!commands.actions.some((action) => action.id === required)) throw new Error(`Resolved action ${required} is missing.`);
if (commands.actions.find((action) => action.id === 'ability.ability_thermal_burst')?.category !== 'Attacks') throw new Error('Weapon ability was not categorized as an attack.');
if (commands.actions.find((action) => action.id === 'ability.ability_mindmancer_read_mind')?.category !== 'Skills') throw new Error('Mindmancer ability was not categorized as a skill.');
if (commands.actions.find((action) => action.id === 'ability.ability_ether_patch')?.category !== 'Support') throw new Error('Ally ability was not categorized as support.');
if (commands.legalMoves.some((cell) => cell.x === 1 && cell.y === 0)) throw new Error('Wall cell is reachable.');
if (!commands.legalMoves.some((cell) => cell.x === 1 && cell.y === 1 && cell.cost === 3)) throw new Error('Weighted route was not resolved.');
if (commands.legalMoves.some((cell) => cell.x === 2 && cell.y === 1)) throw new Error('Explicit blocking cell is reachable.');
if (commands.legalMoves.some((cell) => cell.x === enemy.position.x && cell.y === enemy.position.y)) throw new Error('Occupied cell is reachable.');
if (commands.attackTargetIds.includes(enemy.id)) throw new Error('A melee weapon was exposed as a ranged attack.');
if (commands.actions.find((action) => action.type === 'WeaponAttack')?.disabledReason !== 'Requires an equipped ranged weapon.') throw new Error('Ranged attack did not require an equipped ranged weapon.');
const outside = engine.execute(state, { type: 'Move', actorId: actor.id, position: { x: 5, y: 0 } });
if (outside.success) throw new Error('Out-of-bounds movement was accepted.');
const exhausted = structuredClone(state); exhausted.combatants[actor.id].currentAp = 1;
if (engine.getResolvedCommands(exhausted).legalMoves.length !== 0 || engine.execute(exhausted, { type: 'Move', actorId: actor.id, position: { x: 0, y: 1 } }).success) throw new Error('Movement was allowed without enough AP.');
const move = engine.execute(state, { type: 'Move', actorId: actor.id, position: { x: 1, y: 1 } });
if (!move.success || move.state.combatants[actor.id].currentAp !== 6) throw new Error('Movement AP cost was not applied.');
if (move.state.combatants[actor.id].movementRemaining !== 0) throw new Error('Movement allowance was not consumed.');
const repeatedMove = engine.execute(move.state, { type: 'Move', actorId: actor.id, position: { x: 0, y: 1 } });
if (repeatedMove.success) throw new Error('Movement exceeded the remaining allowance.');
move.state.combatants[enemy.id].position = { x: 2, y: 1 };
if (!engine.getResolvedCommands(move.state).actions.find((action) => action.type === 'MeleeAttack')?.targetIds.includes(enemy.id)) throw new Error('Adjacent melee target is unavailable.');
const melee = engine.execute(move.state, { type: 'MeleeAttack', weaponId: actor.weaponId, actorId: actor.id, targetId: enemy.id });
if (!melee.success || melee.state.combatants[actor.id].currentAp !== 4 || melee.state.combatants[actor.id].currentEther !== 45 || melee.state.combatants[enemy.id].currentHp >= enemy.currentHp) throw new Error('Resolved melee action did not apply its AP, Ether, and damage costs.');
const finishing = structuredClone(move.state); finishing.combatants[enemy.id].currentHp = 1;
const nonLethal = engine.execute(finishing, { type: 'MeleeAttack', weaponId: actor.weaponId, actorId: actor.id, targetId: enemy.id });
if (!nonLethal.success || nonLethal.state.combatants[enemy.id].defeatType !== 'NonLethal' || !nonLethal.state.combatants[enemy.id].isIncapacitated) throw new Error('Melee defeat metadata was not preserved.');
const ranged = structuredClone(state); ranged.combatants[actor.id].weaponId = 'wpn_thermal_pistol'; ranged.combatants[enemy.id].position = { x: 4, y: 0 }; ranged.combatants[enemy.id].currentHp = 1;
const rangedAction = engine.getResolvedCommands(ranged).actions.find((action) => action.type === 'WeaponAttack');
if (!rangedAction?.targetIds.includes(enemy.id) || rangedAction.weaponId !== 'wpn_thermal_pistol') throw new Error('Equipped ranged weapon did not resolve its legal target.');
const shot = engine.execute(ranged, { type: 'RangedAttack', weaponId: 'wpn_thermal_pistol', actorId: actor.id, targetId: enemy.id });
if (!shot.success || shot.state.combatants[actor.id].currentAp !== 5) throw new Error('Ranged weapon AP cost was not applied.');
if (shot.state.combatants[enemy.id].defeatType !== 'Lethal' || shot.state.combatants[enemy.id].isIncapacitated) throw new Error('Lethal ranged damage did not produce a dead combatant.');
if (shot.state.combatants[enemy.id].resolutionState !== 'Dead') throw new Error('Lethal ranged damage did not record a dead resolution state.');
const mechanical = structuredClone(move.state); mechanical.combatants[enemy.id].sourceId = 'enm_prologue_ares_security_drone'; mechanical.combatants[enemy.id].currentHp = 1;
const destroyed = engine.execute(mechanical, { type: 'MeleeAttack', weaponId: actor.weaponId, actorId: actor.id, targetId: enemy.id });
if (!destroyed.success || destroyed.state.combatants[enemy.id].resolutionState !== 'Destroyed' || destroyed.state.combatants[enemy.id].isIncapacitated) throw new Error('Mechanical defeat did not resolve as destroyed.');
for (const category of ['Movement', 'Attack', 'Damage', 'Defeat']) if (!destroyed.state.log.some((entry) => entry.category === category)) throw new Error(`Combat log is missing ${category}.`);
console.log('Combat grid movement, terrain cost, occupancy, and target range passed.');
