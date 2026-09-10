import { ContentRegistry, GameSession } from '@neon-ether/game-runtime';
import { GAME_CONTENT_MANIFEST } from '@neon-ether/content';

const assert = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(message); };
const registry = new ContentRegistry();
registry.loadManifest(GAME_CONTENT_MANIFEST);
const session = new GameSession(registry, 41);

const pistol = session.getState().player.inventory.items.find((entry) => entry.itemId === 'wpn_thermal_pistol');
assert(pistol?.entryId, 'Production starting ranged weapon is missing.');
assert(session.unequipSlot('mainHand').success, 'Ranged weapon did not unequip.');
assert(session.equipInventoryEntry(pistol.entryId, { id: 'mainHand', acceptsCategories: [], acceptsTags: [] }).success, 'Ranged weapon did not re-equip.');
assert(session.addInventoryItem('wpn_ether_baton').success, 'Melee weapon was not obtained.');
const baton = session.getState().player.inventory.items.find((entry) => entry.itemId === 'wpn_ether_baton');
assert(baton?.entryId, 'Melee weapon entry is missing.');
assert(session.equipInventoryEntry(baton.entryId, { id: 'mainHand', acceptsCategories: [], acceptsTags: [] }).success, 'Melee weapon did not equip in its authored slot.');
assert(session.getState().player.equipment.slots.mainHand === baton.entryId, 'Melee weapon did not replace the ranged weapon.');
assert(session.addInventoryItem('arm_rainweave_coat').success, 'Armor was not obtained.');
const coat = session.getState().player.inventory.items.find((entry) => entry.itemId === 'arm_rainweave_coat');
assert(coat?.entryId, 'Armor entry is missing.');
assert(session.equipInventoryEntry(coat.entryId, { id: 'body', acceptsCategories: [], acceptsTags: [] }).success, 'Armor did not equip.');
assert(session.getResolvedPlayerCharacter().vitals.armorRating === session.getState().player.vitals.armorRating + 2, 'Equipped armor modifier was not resolved.');

const loadedEquipment = new GameSession(registry, 99);
assert(loadedEquipment.loadSave(session.serializeSave()).success, 'Equipment save did not load.');
assert(loadedEquipment.getState().player.equipment.slots.mainHand === baton.entryId, 'Melee equipment was not preserved by save/load.');
assert(loadedEquipment.getState().player.equipment.slots.body === coat.entryId, 'Armor equipment was not preserved by save/load.');

assert(loadedEquipment.addInventoryItem('con_trauma_patch', 2).success, 'Healing consumables were not obtained.');
const fullHealthQuantity = loadedEquipment.getState().player.inventory.items.find((entry) => entry.itemId === 'con_trauma_patch')?.quantity;
assert(!loadedEquipment.useInventoryItem('con_trauma_patch').success, 'A no-effect healing item use should be rejected.');
assert(loadedEquipment.getState().player.inventory.items.find((entry) => entry.itemId === 'con_trauma_patch')?.quantity === fullHealthQuantity, 'Rejected item use consumed inventory.');
const damagedSave = JSON.parse(loadedEquipment.serializeSave());
damagedSave.state.player.vitals.currentHp = 10;
assert(loadedEquipment.loadSave(JSON.stringify(damagedSave)).success, 'Damaged test state did not load.');
const explorationQuantity = loadedEquipment.getState().player.inventory.items.find((entry) => entry.itemId === 'con_trauma_patch')?.quantity ?? 0;
assert(loadedEquipment.useInventoryItem('con_trauma_patch').success, 'Exploration consumable use failed.');
assert(loadedEquipment.getState().player.vitals.currentHp === 30, 'Exploration consumable did not execute its authored healing effect.');
assert((loadedEquipment.getState().player.inventory.items.find((entry) => entry.itemId === 'con_trauma_patch')?.quantity ?? 0) === explorationQuantity - 1, 'Exploration consumable quantity did not decrease.');
const combatDamageSave = JSON.parse(loadedEquipment.serializeSave());
combatDamageSave.state.player.vitals.currentHp = 10;
assert(loadedEquipment.loadSave(JSON.stringify(combatDamageSave)).success, 'Combat damage test state did not load.');
assert(loadedEquipment.startCombatEncounter('enc_prologue_ares_freight_checkpoint', false), 'Production combat did not start.');
assert(loadedEquipment.startTacticalCombat(), 'Tactical combat roster was not created.');
const beforeUse = loadedEquipment.getState();
const player = beforeUse.combat.combatants[beforeUse.player.characterId];
assert(player && beforeUse.combat.activeCombatantId === player.id, 'Player turn was not available for the consumable regression.');
const meleeAction = loadedEquipment.getResolvedCombatCommands().actions.find((action) => action.type === 'MeleeAttack');
assert(meleeAction?.weaponId === 'wpn_ether_baton' && meleeAction.apCost === 2 && meleeAction.etherCost === 5, 'Melee combat action did not use equipped weapon metadata.');
const beforeQuantity = beforeUse.player.inventory.items.find((entry) => entry.itemId === 'con_trauma_patch')?.quantity ?? 0;
const used = loadedEquipment.executeCombatAction({ type: 'UseItem', actorId: player.id, itemId: 'con_trauma_patch' });
assert(used.success, `Combat consumable failed: ${used.reason ?? 'unknown reason'}`);
const afterUse = loadedEquipment.getState();
assert(afterUse.combat.combatants[afterUse.player.characterId].currentHp > player.currentHp, 'Combat consumable did not restore HP.');
assert((afterUse.player.inventory.items.find((entry) => entry.itemId === 'con_trauma_patch')?.quantity ?? 0) === beforeQuantity - 1, 'Combat consumable quantity did not decrease.');

const progression = new GameSession(registry, 77);
assert(progression.executeEffects([{ type: 'grantRewards', xp: 120, credits: 0, items: [], skillXp: {}, perkPoints: 0 }]).success, 'XP reward failed.');
assert(progression.getState().player.level === 2 && progression.getPlayerProgressionView().xpIntoLevel === 20, 'Prologue-sized XP did not level the player or preserve overflow XP.');
assert(progression.executeEffects([{ type: 'grantRewards', xp: 330, credits: 0, items: [], skillXp: {}, perkPoints: 0 }]).success, 'Large follow-up XP reward failed.');
assert(progression.getState().player.level === 3, 'A large XP reward did not grant multiple configured levels.');
assert(progression.getState().player.experience === 450, 'Accumulated XP was not preserved after leveling.');
const loadedProgression = new GameSession(registry, 78);
assert(loadedProgression.loadSave(progression.serializeSave()).success && loadedProgression.getState().player.level === 3, 'Progression was not preserved by save/load.');

console.log('RPG core production-flow regressions passed.');
