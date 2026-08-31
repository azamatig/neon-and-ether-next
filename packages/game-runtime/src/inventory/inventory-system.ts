import type { EquipmentSlot, InventoryEntry, InventoryState, ItemDefinition } from '@neon-ether/game-schema';
import type { ContentRegistry } from '../content/content-registry.ts';
import type { GameState, PlayerState } from '../state/game-state.ts';
import type { Effect } from '@neon-ether/game-schema';

export interface InventoryCommandResult { success: boolean; reason?: string; changedQuantity?: number }

/** Content-driven inventory/equipment rules, independent from presentation. */
export class InventorySystem {
  constructor(private readonly content: ContentRegistry, private readonly runEffects?: (effects: Effect[], state: GameState) => void) {}

  public getWeight(inventory: InventoryState): number {
    return inventory.items.reduce((total, entry) => total + (this.content.getItem(entry.itemId)?.weightKg ?? 0) * entry.quantity, 0);
  }

  /** Normalizes legacy entries and rebuilds equipment-derived stats on session load. */
  public hydrate(state: GameState): void {
    state.player.inventory.items.forEach((entry, index) => { entry.entryId ??= `${entry.itemId}:${index + 1}`; });
    if (!Object.values(state.player.equipment.slots).some(Boolean)) {
      for (const entry of state.player.inventory.items.filter((candidate) => candidate.isEquipped)) {
        const slotId = this.content.getItem(entry.itemId)?.equipmentSlots[0];
        if (slotId && !state.player.equipment.slots[slotId]) { entry.slotId = slotId; state.player.equipment.slots[slotId] = entry.entryId!; }
        else entry.isEquipped = false;
      }
    }
    this.recomputeModifiers(state.player);
  }

  public add(inventory: InventoryState, itemId: string, quantity = 1): InventoryCommandResult {
    const item = this.content.getItem(itemId);
    if (!item) return { success: false, reason: `Item '${itemId}' was not found.` };
    if (!Number.isInteger(quantity) || quantity < 1) return { success: false, reason: 'Quantity must be a positive integer.' };
    if (inventory.maxWeight !== undefined && this.getWeight(inventory) + (item.weightKg ?? 0) * quantity > inventory.maxWeight) return { success: false, reason: 'Inventory weight capacity exceeded.' };
    const reusableCapacity = item.stackable
      ? inventory.items.filter((entry) => entry.itemId === itemId && !entry.isEquipped).reduce((sum, entry) => sum + Math.max(0, item.maxStack - entry.quantity), 0)
      : 0;
    const requiredSlots = Math.ceil(Math.max(0, quantity - reusableCapacity) / (item.stackable ? item.maxStack : 1));
    if (inventory.maxSlots !== undefined && inventory.items.length + requiredSlots > inventory.maxSlots) return { success: false, reason: 'Inventory slot capacity exceeded.' };
    let remaining = quantity;
    if (item.stackable) {
      for (const entry of inventory.items.filter((candidate) => candidate.itemId === itemId && !candidate.isEquipped)) {
        const moved = Math.min(remaining, item.maxStack - entry.quantity); entry.quantity += moved; remaining -= moved;
        if (!remaining) break;
      }
    }
    while (remaining > 0) {
      const moved = item.stackable ? Math.min(remaining, item.maxStack) : 1;
      inventory.items.push({ entryId: this.nextEntryId(inventory, itemId), itemId, quantity: moved, isEquipped: false }); remaining -= moved;
    }
    return { success: true, changedQuantity: quantity };
  }

  public remove(inventory: InventoryState, itemId: string, quantity = 1): InventoryCommandResult {
    let remaining = quantity;
    for (let index = inventory.items.length - 1; index >= 0 && remaining > 0; index--) {
      const entry = inventory.items[index]; if (entry.itemId !== itemId || entry.isEquipped) continue;
      const moved = Math.min(remaining, entry.quantity); entry.quantity -= moved; remaining -= moved;
      if (entry.quantity === 0) inventory.items.splice(index, 1);
    }
    return { success: remaining === 0, reason: remaining ? 'Not enough unequipped items.' : undefined, changedQuantity: quantity - remaining };
  }

  public canEquip(state: GameState, item: ItemDefinition, slot: EquipmentSlot): InventoryCommandResult {
    const player = state.player;
    if (item.equipmentSlots.length && !item.equipmentSlots.includes(slot.id)) return { success: false, reason: `Item cannot use slot '${slot.id}'.` };
    if (slot.acceptsCategories.length && !slot.acceptsCategories.includes(item.category)) return { success: false, reason: 'Item category is not accepted by this slot.' };
    if (slot.acceptsTags.length && !slot.acceptsTags.some((tag) => item.tags.includes(tag))) return { success: false, reason: 'Item tags do not match this slot.' };
    for (const requirement of item.requirements) {
      if (requirement.type === 'level' && player.level < requirement.minimum) return { success: false, reason: `Requires level ${requirement.minimum}.` };
      if (requirement.type === 'attribute' && player.attributes[requirement.attribute] < requirement.minimum) return { success: false, reason: `Requires ${requirement.attribute} ${requirement.minimum}.` };
      if (requirement.type === 'flag' && state.world.flags[requirement.flag] !== requirement.expected) return { success: false, reason: `Requires flag '${requirement.flag}'.` };
    }
    return { success: true };
  }

  public equip(state: GameState, entryId: string, slot: EquipmentSlot): InventoryCommandResult {
    const entry = this.findEntry(state.player.inventory, entryId); if (!entry) return { success: false, reason: 'Inventory entry not found.' };
    const item = this.content.getItem(entry.itemId); if (!item) return { success: false, reason: 'Item definition not found.' };
    const allowed = this.canEquip(state, item, slot); if (!allowed.success) return allowed;
    const previousEntryId = state.player.equipment.slots[slot.id]; if (previousEntryId) this.unequip(state, slot.id);
    entry.isEquipped = true; entry.slotId = slot.id; state.player.equipment.slots[slot.id] = entry.entryId ?? entryId;
    this.recomputeModifiers(state.player);
    if (item.equipEffects.length) this.runEffects?.(item.equipEffects, state);
    return { success: true };
  }

  public unequip(state: GameState, slotId: string): InventoryCommandResult {
    const entryId = state.player.equipment.slots[slotId]; if (!entryId) return { success: false, reason: 'Equipment slot is empty.' };
    const entry = this.findEntry(state.player.inventory, entryId); const item = entry ? this.content.getItem(entry.itemId) : undefined;
    if (entry) { entry.isEquipped = false; delete entry.slotId; }
    state.player.equipment.slots[slotId] = null; this.recomputeModifiers(state.player);
    if (item?.unequipEffects.length) this.runEffects?.(item.unequipEffects, state);
    return { success: true };
  }

  private recomputeModifiers(player: PlayerState): void {
    const totals: Record<string, number> = {};
    for (const entryId of Object.values(player.equipment.slots)) {
      const entry = entryId ? this.findEntry(player.inventory, entryId) : undefined;
      const item = entry && this.content.getItem(entry.itemId);
      for (const modifier of item?.modifiers ?? []) {
        const base = this.readStat(player, modifier.target);
        const delta = modifier.operation === 'add' ? modifier.value : base * (modifier.value - 1);
        totals[modifier.target] = (totals[modifier.target] ?? 0) + delta;
      }
    }
    player.equipment.appliedModifiers = totals;
  }

  private findEntry(inventory: InventoryState, id: string): InventoryEntry | undefined { return inventory.items.find((entry) => entry.entryId === id || (!entry.entryId && entry.itemId === id)); }
  private nextEntryId(inventory: InventoryState, itemId: string): string { let index = inventory.items.length + 1; while (inventory.items.some((entry) => entry.entryId === `${itemId}:${index}`)) index++; return `${itemId}:${index}`; }
  private readStat(player: PlayerState, target: string): number { return target in player.attributes ? (player.attributes as unknown as Record<string,number>)[target] : (player.vitals as unknown as Record<string,number>)[target] ?? 0; }
}
