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
      if (slotState.roomInstanceId) unavailableReasons.push('Room slot is occupied.');
      if (!definition.allowedSlotTypes.includes(slotDefinition.slotType)) unavailableReasons.push(`Requires slot type: ${definition.allowedSlotTypes.join(', ')}`);
      if (slotDefinition.allowedRoomTypes.length && !slotDefinition.allowedRoomTypes.includes(definition.roomType)) unavailableReasons.push('Room type is not allowed in this slot.');
      const existing = Object.values(state.base.rooms).filter((room) => room.definitionId === definition.id).length;
      if (existing >= definition.maxInstances) unavailableReasons.push('Maximum room instances reached.');
      unavailableReasons.push(...this.getMissingResources(definition.buildCost, state));
      const conditionResult = evaluateConditions(definition.requirements, { state, contentRegistry: this.content }, this.conditions);
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
      if (definition.applicableRoomTypes.length && !definition.applicableRoomTypes.includes(roomDefinition.roomType)) unavailableReasons.push('Upgrade is incompatible with this room type.');
      if (!definition.repeatable && roomState.installedUpgradeIds.includes(definition.id)) unavailableReasons.push('Upgrade is already installed.');
      unavailableReasons.push(...this.getMissingResources(definition.cost, state));
      const conditionResult = evaluateConditions(definition.requirements, { state, contentRegistry: this.content }, this.conditions);
      if (!conditionResult.allMet) unavailableReasons.push(...conditionResult.failedConditions.map((condition) => condition.reason ?? 'Requirement not met.'));
      return { definition, isAvailable: unavailableReasons.length === 0, unavailableReasons };
    });
  }

  public execute(command: BaseManagementCommand, state: GameState): BaseManagementResult {
    if (command.type === 'BuildRoom') return this.buildRoom(command.slotId, command.roomDefinitionId, command.roomInstanceId, state);
    if (command.type === 'InstallUpgrade') return this.installUpgrade(command.roomInstanceId, command.upgradeId, state);
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
    state.base.storage.capacity = Math.max(0, state.base.storage.capacity + upgrade.capacityDelta.storage + upgrade.storageCapacityDelta);
    if (!state.base.unlockedUpgrades.includes(upgrade.id)) state.base.unlockedUpgrades.push(upgrade.id);
    this.effects.executeBatch(upgrade.effects, { state, contentRegistry: this.content });
    return { success: true, mutation: { roomInstanceId, upgradeId, level: room.level } };
  }

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
}
