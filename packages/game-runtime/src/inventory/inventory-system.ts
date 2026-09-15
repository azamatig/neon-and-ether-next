import type { EquipmentSlot, InventoryEntry, InventoryState, ItemDefinition } from '@neon-ether/game-schema';
import type { ContentRegistry } from '../content/content-registry.ts';
import type { GameState, NpcRuntimeState, PlayerState } from '../state/game-state.ts';
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
    const authoredSlots = this.content.newGameDefinitions.getAll()[0]?.equipmentSlots ?? [];
    for (const slot of authoredSlots) state.player.equipment.slots[slot.id] ??= null;
    const legacyEntryId = state.player.equipment.slots.mainHand;
    if (legacyEntryId) {
      const entry = this.findEntry(state.player.inventory, legacyEntryId);
      const item = entry && this.content.getItem(entry.itemId);
      const target = item?.combatAttackType === 'Melee' ? 'meleeWeapon' : 'primaryWeapon';
      if (entry && item?.equipmentSlots.includes(target) && !state.player.equipment.slots[target]) {
        state.player.equipment.slots[target] = entry.entryId!;
        entry.slotId = target;
        entry.isEquipped = true;
      } else if (entry) { entry.isEquipped = false; delete entry.slotId; }
    }
    delete state.player.equipment.slots.mainHand;
    for (const entry of state.player.inventory.items.filter((candidate) => candidate.isEquipped)) {
      const item = this.content.getItem(entry.itemId);
      const currentSlot = entry.slotId && item?.equipmentSlots.includes(entry.slotId) ? entry.slotId : undefined;
      const slotId = currentSlot ?? item?.equipmentSlots.find((candidate) => !state.player.equipment.slots[candidate]);
      if (slotId && (!state.player.equipment.slots[slotId] || state.player.equipment.slots[slotId] === entry.entryId)) {
        entry.slotId = slotId; state.player.equipment.slots[slotId] = entry.entryId!;
      } else { entry.isEquipped = false; delete entry.slotId; }
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
    return this.canEquipFor(state, item, slot, state.player.level, state.player.attributes, state.player.raceId);
  }

  private canEquipFor(state:GameState,item:ItemDefinition,slot:EquipmentSlot,level:number,attributes:PlayerState['attributes'],raceId?:string):InventoryCommandResult {
    if (item.equipmentSlots.length && !item.equipmentSlots.includes(slot.id)) return { success: false, reason: `Item cannot use slot '${slot.id}'.` };
    if (slot.acceptsCategories.length && !slot.acceptsCategories.includes(item.category)) return { success: false, reason: 'Item category is not accepted by this slot.' };
    if (slot.acceptsTags.length && !slot.acceptsTags.some((tag) => item.tags.includes(tag))) return { success: false, reason: 'Item tags do not match this slot.' };
    for (const requirement of item.requirements) {
      if (requirement.type === 'level' && level < requirement.minimum) return { success: false, reason: `Requires level ${requirement.minimum}.` };
      if (requirement.type === 'attribute' && attributes[requirement.attribute] < requirement.minimum) return { success: false, reason: `Requires ${requirement.attribute} ${requirement.minimum}.` };
      if (requirement.type === 'flag' && state.world.flags[requirement.flag] !== requirement.expected) return { success: false, reason: `Requires flag '${requirement.flag}'.` };
      if (requirement.type === 'raceIs' && raceId !== requirement.raceId) return { success: false, reason: `Requires ${this.content.races.get(requirement.raceId)?.name ?? 'another lineage'}.` };
      if (requirement.type === 'raceHasTag' && !this.content.races.get(raceId ?? '')?.tags.includes(requirement.tag)) return { success: false, reason: `Requires lineage trait ${requirement.tag}.` };
    }
    return { success: true };
  }

  public initializeNpcLoadout(state:GameState,npcId:string):InventoryCommandResult { const runtime=state.npcs[npcId],definition=this.content.getCharacter(npcId);if(!runtime||!definition)return{success:false,reason:'Roster character was not found.'};if(runtime.inventory)return{success:true};runtime.inventory={items:[],credits:0,maxSlots:30,maxWeight:100};runtime.equipment={slots:{},appliedModifiers:{}};for(const slot of this.content.newGameDefinitions.getAll()[0]?.equipmentSlots??[])runtime.equipment.slots[slot.id]=null;for(const authored of definition.inventory){this.add(runtime.inventory,authored.itemId,authored.quantity);if(authored.isEquipped){const entry=runtime.inventory.items.find(value=>value.itemId===authored.itemId&&!value.isEquipped),item=this.content.getItem(authored.itemId),slotId=item?.equipmentSlots.find(id=>!runtime.equipment.slots[id]);if(entry&&slotId)this.equipNpc(state,npcId,entry.entryId??entry.itemId,slotId);}}return{success:true}; }

  public equipNpc(state:GameState,npcId:string,entryId:string,slotId:string):InventoryCommandResult { const runtime=state.npcs[npcId],definition=this.content.getCharacter(npcId),slot=this.content.newGameDefinitions.getAll()[0]?.equipmentSlots.find(value=>value.id===slotId);if(!runtime?.inventory||!definition||!slot)return{success:false,reason:'Roster loadout is unavailable.'};const entry=this.findEntry(runtime.inventory,entryId),item=entry&&this.content.getItem(entry.itemId);if(!entry||!item)return{success:false,reason:'Inventory entry not found.'};const allowed=this.canEquipFor(state,item,slot,runtime.level,definition.attributes,definition.raceId);if(!allowed.success)return allowed;const previous=runtime.equipment.slots[slotId];if(previous)this.unequipNpc(state,npcId,slotId);entry.isEquipped=true;entry.slotId=slotId;runtime.equipment.slots[slotId]=entry.entryId??entryId;this.recomputeNpcModifiers(runtime);return{success:true}; }

  public unequipNpc(state:GameState,npcId:string,slotId:string):InventoryCommandResult { const runtime=state.npcs[npcId],entryId=runtime?.equipment.slots[slotId];if(!runtime?.inventory||!entryId)return{success:false,reason:'Equipment slot is empty.'};const entry=this.findEntry(runtime.inventory,entryId);if(entry){entry.isEquipped=false;delete entry.slotId;}runtime.equipment.slots[slotId]=null;this.recomputeNpcModifiers(runtime);return{success:true}; }

  public transfer(state:GameState,from:'player'|string,to:'player'|string,itemId:string,quantity:number):InventoryCommandResult {if(from===to)return{success:false,reason:'Source and destination are the same.'};if(!Number.isInteger(quantity)||quantity<1)return{success:false,reason:'Quantity must be a positive integer.'};const source=from==='player'?state.player.inventory:state.npcs[from]?.inventory,destination=to==='player'?state.player.inventory:state.npcs[to]?.inventory;if(!source||!destination)return{success:false,reason:'Inventory owner is unavailable.'};const available=source.items.filter(entry=>entry.itemId===itemId&&!entry.isEquipped).reduce((sum,entry)=>sum+entry.quantity,0);if(available<quantity)return{success:false,reason:source.items.some(entry=>entry.itemId===itemId&&entry.isEquipped)?'Unequip this item before transferring it.':'Not enough items to transfer.'};const added=this.add(destination,itemId,quantity);if(!added.success)return added;const removed=this.remove(source,itemId,quantity);if(!removed.success){this.remove(destination,itemId,quantity);return removed;}return{success:true,changedQuantity:quantity}; }

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
  private recomputeNpcModifiers(runtime:NpcRuntimeState):void {const totals:Record<string,number>={};for(const entryId of Object.values(runtime.equipment.slots)){const entry=entryId&&runtime.inventory?this.findEntry(runtime.inventory,entryId):undefined,item=entry&&this.content.getItem(entry.itemId);for(const modifier of item?.modifiers??[])totals[modifier.target]=(totals[modifier.target]??0)+modifier.value;}runtime.equipment.appliedModifiers=totals;}

  private findEntry(inventory: InventoryState, id: string): InventoryEntry | undefined { return inventory.items.find((entry) => entry.entryId === id || (!entry.entryId && entry.itemId === id)); }
  private nextEntryId(inventory: InventoryState, itemId: string): string { let index = inventory.items.length + 1; while (inventory.items.some((entry) => entry.entryId === `${itemId}:${index}`)) index++; return `${itemId}:${index}`; }
  private readStat(player: PlayerState, target: string): number { return target in player.attributes ? (player.attributes as unknown as Record<string,number>)[target] : (player.vitals as unknown as Record<string,number>)[target] ?? 0; }
}
