import {
  BaseManagementCommand,
  BaseRoomDefinition,
  BaseUpgradeDefinition,
  GameState,
} from '@neon-ether/game-schema';
import { ConditionRegistry, defaultConditionRegistry } from '../conditions/condition-registry.ts';
import { evaluateConditions } from '../conditions/condition-evaluator.ts';
import { ContentRegistry } from '../content/content-registry.ts';
import { EffectExecutor, defaultEffectExecutor } from '../effects/effect-executor.ts';

export interface BaseOption<T> {
  definition: T;
  isAvailable: boolean;
  unavailableReasons: string[];
}

export interface BaseManagementResult {
  success: boolean;
  reason?: string;
  mutation?: Record<string, unknown>;
}

/** Generic base construction, upgrades, resources, slots, and storage rules. */
export class BaseManagementSystem {
  constructor(
    private readonly content: ContentRegistry,
    private readonly conditions: ConditionRegistry = defaultConditionRegistry,
    private readonly effects: EffectExecutor = defaultEffectExecutor,
  ) {}

  public getRoomOptions(slotId: string, state: GameState): BaseOption<BaseRoomDefinition>[] {
    const base = this.content.getBase(state.base.baseId);
    const slotDefinition = base?.roomSlots.find((slot) => slot.id === slotId);
    const slotState = state.base.roomSlots[slotId];
    if (!slotDefinition || !slotState) return [];
    return this.content.getAllRooms().map((definition) => {
      const unavailableReasons: string[] = [];
      if (slotState.isLocked) unavailableReasons.push('Room slot is locked.');
      if (slotState.roomInstanceId) unavailableReasons.push('Room slot is occupied.');
      if (!definition.allowedSlotTypes.includes(slotDefinition.slotType)) unavailableReasons.push(`Requires slot type: ${definition.allowedSlotTypes.join(', ')}`);
      if (slotDefinition.allowedRoomTypes.length && !slotDefinition.allowedRoomTypes.includes(definition.roomType)) unavailableReasons.push('Room type is not allowed in this slot.');
      const existing = Object.values(state.base.rooms).filter((room) => room.definitionId === definition.id).length;
      if (existing >= definition.maxInstances) unavailableReasons.push('Maximum room instances reached.');
      unavailableReasons.push(...this.getMissingResources(definition.buildCost, state));
      const conditionResult = evaluateConditions([...definition.requirements, ...definition.conditions], { state, contentRegistry: this.content }, this.conditions);
      if (!conditionResult.allMet) unavailableReasons.push(...conditionResult.failedConditions.map((condition) => condition.reason ?? 'Requirement not met.'));
      return { definition, isAvailable: unavailableReasons.length === 0, unavailableReasons };
    });
  }

  public getUpgradeOptions(roomInstanceId: string, state: GameState): BaseOption<BaseUpgradeDefinition>[] {
    const roomState = state.base.rooms[roomInstanceId];
    const roomDefinition = roomState ? this.content.getRoom(roomState.definitionId) : undefined;
    if (!roomState || !roomDefinition) return [];
    return this.content.baseUpgrades.getAll().map((definition) => {
      const unavailableReasons: string[] = [];
      if (definition.target !== 'room') unavailableReasons.push('Upgrade targets the whole base.');
      if (definition.applicableRoomTypes.length && !definition.applicableRoomTypes.includes(roomDefinition.roomType)) unavailableReasons.push('Upgrade is incompatible with this room type.');
      if (definition.applicableRoomIds.length && !definition.applicableRoomIds.includes(roomDefinition.id)) unavailableReasons.push('Upgrade is incompatible with this room.');
      if (definition.requiredRoomTags.some((tag) => !roomDefinition.tags.includes(tag))) unavailableReasons.push('Room tags do not meet upgrade requirements.');
      if (!definition.repeatable && roomState.installedUpgradeIds.includes(definition.id)) unavailableReasons.push('Upgrade is already installed.');
      if (roomDefinition.upgradeIds.length && !roomDefinition.upgradeIds.includes(definition.id)) unavailableReasons.push('Upgrade is not on this room upgrade path.');
      const predecessor = this.content.baseUpgrades.getAll().find((candidate) => candidate.nextUpgradeId === definition.id);
      if (predecessor && !roomState.installedUpgradeIds.includes(predecessor.id)) unavailableReasons.push(`Requires upgrade: ${predecessor.name}`);
      unavailableReasons.push(...this.getMissingResources(definition.cost, state));
      const conditionResult = evaluateConditions([...definition.requirements, ...definition.conditions], { state, contentRegistry: this.content }, this.conditions);
      if (!conditionResult.allMet) unavailableReasons.push(...conditionResult.failedConditions.map((condition) => condition.reason ?? 'Requirement not met.'));
      return { definition, isAvailable: unavailableReasons.length === 0, unavailableReasons };
    });
  }

  public getBaseUpgradeOptions(state: GameState): BaseOption<BaseUpgradeDefinition>[] {
    return this.content.baseUpgrades.getAll().filter((definition)=>definition.target==='base').map((definition)=>{const unavailableReasons:string[]=[];if(definition.applicableBaseIds.length&&!definition.applicableBaseIds.includes(state.base.baseId))unavailableReasons.push('Upgrade is incompatible with this base.');if(!definition.repeatable&&state.base.unlockedUpgrades.includes(definition.id))unavailableReasons.push('Upgrade is already installed.');unavailableReasons.push(...this.getMissingResources(definition.cost,state));const conditions=evaluateConditions([...definition.requirements,...definition.conditions],{state,contentRegistry:this.content},this.conditions);if(!conditions.allMet)unavailableReasons.push(...conditions.failedConditions.map((entry)=>entry.reason??'Requirement not met.'));return{definition,isAvailable:unavailableReasons.length===0,unavailableReasons};});
  }

  public execute(command: BaseManagementCommand, state: GameState): BaseManagementResult {
    if (command.type === 'BuildRoom') return this.buildRoom(command.slotId, command.roomDefinitionId, command.roomInstanceId ?? this.nextRoomInstanceId(command.slotId, state), state);
    if (command.type === 'InstallUpgrade') return this.installUpgrade(command.roomInstanceId, command.upgradeId, state);
    if (command.type === 'InstallBaseUpgrade') return this.installBaseUpgrade(command.upgradeId,state);
    if (command.type === 'StoreItem') return this.transferItem(command.itemId, command.quantity, state, true);
    return this.transferItem(command.itemId, command.quantity, state, false);
  }

  private buildRoom(slotId: string, definitionId: string, instanceId: string, state: GameState): BaseManagementResult {
    if (state.base.rooms[instanceId]) return { success: false, reason: 'Room instance ID already exists.' };
    const option = this.getRoomOptions(slotId, state).find((entry) => entry.definition.id === definitionId);
    if (!option) return { success: false, reason: 'Room definition or slot was not found.' };
    if (!option.isAvailable) return { success: false, reason: option.unavailableReasons.join('; ') };
    const definition = option.definition;
    this.spendResources(definition.buildCost, state);
    state.base.rooms[instanceId] = {
      roomId: instanceId, definitionId: definition.id, slotId, isBuilt: true, level: 1,
      assignedNpcIds: [], productionProgress: 0, installedUpgradeIds: [], capacity: { ...definition.capacity },
      modifiers: { ...definition.gameplayModifiers },
    };
    state.base.roomSlots[slotId].roomInstanceId = instanceId;
    state.base.storage.capacity += definition.capacity.storage;
    this.effects.executeBatch(definition.effects, { state, contentRegistry: this.content });
    return { success: true, mutation: { roomInstanceId: instanceId, definitionId, slotId } };
  }

  private installUpgrade(roomInstanceId: string, upgradeId: string, state: GameState): BaseManagementResult {
    const option = this.getUpgradeOptions(roomInstanceId, state).find((entry) => entry.definition.id === upgradeId);
    if (!option) return { success: false, reason: 'Room or upgrade definition was not found.' };
    if (!option.isAvailable) return { success: false, reason: option.unavailableReasons.join('; ') };
    const room = state.base.rooms[roomInstanceId];
    const upgrade = option.definition;
    this.spendResources(upgrade.cost, state);
    room.installedUpgradeIds.push(upgrade.id);
    room.level += 1;
    room.capacity.residents = Math.max(0, room.capacity.residents + upgrade.capacityDelta.residents);
    room.capacity.workers = Math.max(0, room.capacity.workers + upgrade.capacityDelta.workers);
    room.capacity.storage = Math.max(0, room.capacity.storage + upgrade.capacityDelta.storage);
    for (const [key, value] of Object.entries(upgrade.modifiers)) room.modifiers[key] = (room.modifiers[key] ?? 0) + value;
    state.base.storage.capacity = Math.max(0, state.base.storage.capacity + upgrade.capacityDelta.storage + upgrade.storageCapacityDelta);
    if (!state.base.unlockedUpgrades.includes(upgrade.id)) state.base.unlockedUpgrades.push(upgrade.id);
    this.effects.executeBatch(upgrade.effects, { state, contentRegistry: this.content });
    return { success: true, mutation: { roomInstanceId, upgradeId, level: room.level } };
  }

  private installBaseUpgrade(upgradeId:string,state:GameState):BaseManagementResult {const option=this.getBaseUpgradeOptions(state).find((entry)=>entry.definition.id===upgradeId);if(!option)return{success:false,reason:'Base upgrade was not found.'};if(!option.isAvailable)return{success:false,reason:option.unavailableReasons.join('; ')};const upgrade=option.definition;this.spendResources(upgrade.cost,state);if(!state.base.unlockedUpgrades.includes(upgrade.id))state.base.unlockedUpgrades.push(upgrade.id);state.base.storage.capacity=Math.max(0,state.base.storage.capacity+upgrade.storageCapacityDelta+upgrade.capacityDelta.storage);for(const [key,value] of Object.entries(upgrade.modifiers))state.base.modifiers[key]=(state.base.modifiers[key]??0)+value;this.effects.executeBatch(upgrade.effects,{state,contentRegistry:this.content});return{success:true,mutation:{upgradeId,target:'base'}};}

  private transferItem(itemId: string, quantity: number, state: GameState, intoStorage: boolean): BaseManagementResult {
    const source = intoStorage ? state.player.inventory.items : state.base.storage.items;
    const target = intoStorage ? state.base.storage.items : state.player.inventory.items;
    const sourceSlot = source.find((slot) => slot.itemId === itemId);
    if (!sourceSlot || sourceSlot.quantity < quantity) return { success: false, reason: 'Not enough items in source inventory.' };
    if (intoStorage && !target.some((slot) => slot.itemId === itemId) && target.length >= state.base.storage.capacity) return { success: false, reason: 'Base storage is full.' };
    sourceSlot.quantity -= quantity;
    if (sourceSlot.quantity === 0) source.splice(source.indexOf(sourceSlot), 1);
    const targetSlot = target.find((slot) => slot.itemId === itemId);
    if (targetSlot) targetSlot.quantity += quantity;
    else target.push({ itemId, quantity, isEquipped: false });
    return { success: true, mutation: { itemId, quantity, direction: intoStorage ? 'intoStorage' : 'toPlayer' } };
  }

  private getMissingResources(cost: Record<string, number>, state: GameState): string[] {
    return Object.entries(cost).filter(([id, amount]) => (state.base.resources[id] ?? 0) < amount).map(([id, amount]) => `Requires ${amount} ${id}.`);
  }
  private spendResources(cost: Record<string, number>, state: GameState): void {
    for (const [id, amount] of Object.entries(cost)) state.base.resources[id] = (state.base.resources[id] ?? 0) - amount;
  }
  private nextRoomInstanceId(slotId:string,state:GameState):string { let index=1; while(state.base.rooms[`room:${slotId}:${index}`]) index+=1; return `room:${slotId}:${index}`; }
}
