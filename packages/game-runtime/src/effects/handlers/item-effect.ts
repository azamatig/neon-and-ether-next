import { AddItemEffect, RemoveItemEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';
import { InventorySystem } from '../../inventory/inventory-system.ts';

export const handleAddItemEffect: EffectHandler<AddItemEffect> = (effect, context) => {
  const isPlayer = !effect.targetCharacterId || effect.targetCharacterId === context.state.player?.characterId;
  let targetInventory = isPlayer
    ? context.state.player.inventory
    : context.state.npcs?.[effect.targetCharacterId!]?.inventory;

  const targetName = isPlayer ? context.state.player.name : (context.state.npcs?.[effect.targetCharacterId!]?.npcId ?? 'NPC');

  if (!targetInventory) {
    if (!isPlayer && context.state.npcs?.[effect.targetCharacterId!]) {
      context.state.npcs[effect.targetCharacterId!].inventory = {
        items: [],
        credits: 0,
        maxSlots: 20,
        maxWeight: 50,
      };
      targetInventory = context.state.npcs[effect.targetCharacterId!].inventory!;
    } else {
      return {
        success: false,
        type: 'addItem',
        message: `Target character '${effect.targetCharacterId ?? 'player'}' inventory not found`,
        error: 'INVENTORY_NOT_FOUND',
      };
    }
  }

  const quantityToAdd = effect.quantity ?? 1;
  const itemDefinition = context.contentRegistry?.getItem(effect.itemId);
  if (itemDefinition && context.contentRegistry && !effect.autoEquip && !effect.isEquipped) {
    const result = new InventorySystem(context.contentRegistry).add(targetInventory, effect.itemId, quantityToAdd);
    if (!result.success) return { success: false, type: 'addItem', message: result.reason ?? 'Could not add item.', error: 'INVENTORY_CAPACITY' };
    const itemName = itemDefinition.name;
    context.logJournal?.('System', `Acquired ${quantityToAdd}x ${itemName}.`, { itemId: effect.itemId, quantity: quantityToAdd });
    return { success: true, type: 'addItem', message: `Added ${quantityToAdd}x '${effect.itemId}' to ${targetName}'s inventory`, mutationSummary: { characterId: isPlayer ? context.state.player.characterId : effect.targetCharacterId, itemId: effect.itemId, quantityAdded: quantityToAdd } };
  }
  const existingSlot = targetInventory.items.find(
    (slot) => slot.itemId === effect.itemId && !slot.isEquipped && !effect.autoEquip
  );

  if (existingSlot) {
    existingSlot.quantity += quantityToAdd;
  } else {
    targetInventory.items.push({
      itemId: effect.itemId,
      quantity: quantityToAdd,
      isEquipped: effect.isEquipped || effect.autoEquip || false,
    });
  }

  const itemName = context.contentRegistry?.getItem(effect.itemId)?.name ?? effect.itemId;

  if (context.logJournal) {
    context.logJournal('System', `Acquired ${quantityToAdd}x ${itemName}.`, {
      itemId: effect.itemId,
      quantity: quantityToAdd,
    });
  }

  return {
    success: true,
    type: 'addItem',
    message: `Added ${quantityToAdd}x '${effect.itemId}' to ${targetName}'s inventory`,
    mutationSummary: {
      characterId: isPlayer ? context.state.player.characterId : effect.targetCharacterId,
      itemId: effect.itemId,
      quantityAdded: quantityToAdd,
    },
  };
};

export const handleRemoveItemEffect: EffectHandler<RemoveItemEffect> = (effect, context) => {
  const isPlayer = !effect.targetCharacterId || effect.targetCharacterId === context.state.player?.characterId;
  const targetInventory = isPlayer
    ? context.state.player.inventory
    : context.state.npcs?.[effect.targetCharacterId!]?.inventory;

  const targetName = isPlayer ? context.state.player.name : (context.state.npcs?.[effect.targetCharacterId!]?.npcId ?? 'NPC');

  if (!targetInventory || !Array.isArray(targetInventory.items)) {
    return {
      success: false,
      type: 'removeItem',
      message: `Target character '${effect.targetCharacterId ?? 'player'}' not found or empty inventory`,
      error: 'INVENTORY_NOT_FOUND',
    };
  }

  let remainingToRemove = effect.quantity ?? 1;
  const totalToRemove = remainingToRemove;

  for (let i = targetInventory.items.length - 1; i >= 0 && remainingToRemove > 0; i--) {
    const slot = targetInventory.items[i];
    if (slot.itemId === effect.itemId) {
      if (slot.quantity <= remainingToRemove) {
        remainingToRemove -= slot.quantity;
        targetInventory.items.splice(i, 1);
      } else {
        slot.quantity -= remainingToRemove;
        remainingToRemove = 0;
      }
    }
  }

  const removedCount = totalToRemove - remainingToRemove;
  const itemName = context.contentRegistry?.getItem(effect.itemId)?.name ?? effect.itemId;

  if (context.logJournal && removedCount > 0) {
    context.logJournal('System', `Removed ${removedCount}x ${itemName} from inventory.`, {
      itemId: effect.itemId,
      removedCount,
    });
  }

  return {
    success: removedCount > 0,
    type: 'removeItem',
    message: `Removed ${removedCount}/${totalToRemove}x '${effect.itemId}' from ${targetName}`,
    mutationSummary: {
      characterId: isPlayer ? context.state.player.characterId : effect.targetCharacterId,
      itemId: effect.itemId,
      removedCount,
    },
  };
};
