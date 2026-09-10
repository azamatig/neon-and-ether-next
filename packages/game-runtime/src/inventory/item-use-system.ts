import type { ChangeStatEffect, GameState, ItemDefinition } from '@neon-ether/game-schema';
import type { RandomSource } from '@neon-ether/engine';
import type { ContentRegistry } from '../content/content-registry.ts';
import type { ConditionRegistry } from '../conditions/condition-registry.ts';
import { evaluateConditions } from '../conditions/condition-evaluator.ts';
import type { EffectExecutor } from '../effects/effect-executor.ts';
import { InventorySystem, type InventoryCommandResult } from './inventory-system.ts';

export type ItemUseContext = 'Exploration' | 'Combat';
export interface ItemUseResult extends InventoryCommandResult { nextState?: GameState; item?: ItemDefinition }

/** Validates and atomically executes authored consumable effects. */
export class ItemUseSystem {
  public constructor(
    private readonly content: ContentRegistry,
    private readonly conditions: ConditionRegistry,
    private readonly effects: EffectExecutor,
    private readonly random: RandomSource,
  ) {}

  public canUse(state: GameState, item: ItemDefinition, context: ItemUseContext): InventoryCommandResult {
    const definitionAllowed = this.canUseDefinition(state, item, context);
    if (!definitionAllowed.success) return definitionAllowed;
    const conditionState = context === 'Combat' ? structuredClone(state) : state;
    const combatant = context === 'Combat' ? conditionState.combat.combatants[conditionState.player.characterId] : undefined;
    if (combatant) { conditionState.player.vitals.currentHp = combatant.currentHp; conditionState.player.vitals.currentEther = combatant.currentEther; }
    const requirements = evaluateConditions(item.useConditions, { state: conditionState, contentRegistry: this.content, rollRandom: (min, max) => this.random.integer(min, max) }, this.conditions);
    if (!requirements.allMet) return { success: false, reason: requirements.failedConditions[0]?.reason ?? 'Item use requirements are not met.' };
    return { success: true };
  }

  /** Side-effect-free availability used while resolving presentation commands. */
  public canUseDefinition(state: GameState, item: ItemDefinition, context: ItemUseContext): InventoryCommandResult {
    if (item.category !== 'consumable') return { success: false, reason: 'This item is not consumable.' };
    if (!item.usableContexts.includes(context)) return { success: false, reason: `This item cannot be used during ${context.toLowerCase()}.` };
    if (item.useEffects.length === 0) return { success: false, reason: 'This item has no usable effect.' };
    const conditionState = context === 'Combat' ? structuredClone(state) : state;
    const combatant = context === 'Combat' ? conditionState.combat.combatants[conditionState.player.characterId] : undefined;
    if (combatant) { conditionState.player.vitals.currentHp = combatant.currentHp; conditionState.player.vitals.currentEther = combatant.currentEther; }
    const restorativeEffects = item.useEffects.filter((effect): effect is ChangeStatEffect => effect.type === 'changeStat' && (effect.delta ?? 0) > 0);
    if (restorativeEffects.length === item.useEffects.length && restorativeEffects.every((effect) => {
      const stat = effect.stat.toLowerCase();
      return stat === 'currenthp' ? conditionState.player.vitals.currentHp >= conditionState.player.vitals.maxHp
        : stat === 'currentether' ? conditionState.player.vitals.currentEther >= conditionState.player.vitals.maxEther
        : false;
    })) return { success: false, reason: `${item.name} would have no effect.` };
    return { success: true };
  }

  public use(state: GameState, itemId: string, context: ItemUseContext): ItemUseResult {
    const item = this.content.getItem(itemId);
    if (!item) return { success: false, reason: 'Item definition not found.' };
    const entry = state.player.inventory.items.find((candidate) => candidate.itemId === itemId && !candidate.isEquipped && candidate.quantity > 0);
    if (!entry) return { success: false, reason: 'Item is not available in inventory.', item };
    const allowed = this.canUse(state, item, context);
    if (!allowed.success) return { ...allowed, item };

    const nextState = structuredClone(state);
    const combatant = context === 'Combat' ? nextState.combat.combatants[nextState.player.characterId] : undefined;
    if (context === 'Combat') {
      if (!combatant || nextState.combat.activeCombatantId !== combatant.id || combatant.team !== 'Player') return { success: false, reason: 'Items can only be used on the player turn.', item };
      if (combatant.currentAp < (item.apUseCost ?? 0)) return { success: false, reason: 'Not enough AP to use this item.', item };
      nextState.player.vitals.currentHp = combatant.currentHp;
      nextState.player.vitals.currentEther = combatant.currentEther;
    }

    const beforeEffects = JSON.stringify({ player: nextState.player, flags: nextState.world.flags });
    const executed = this.effects.executeBatch(item.useEffects, { state: nextState, contentRegistry: this.content, random: this.random });
    if (!executed.success) return { success: false, reason: executed.failedResults[0]?.message ?? 'Item effect failed.', item };
    if (beforeEffects === JSON.stringify({ player: nextState.player, flags: nextState.world.flags })) return { success: false, reason: `${item.name} would have no effect.`, item };

    const removed = new InventorySystem(this.content).remove(nextState.player.inventory, itemId, 1);
    if (!removed.success) return { success: false, reason: removed.reason, item };
    if (combatant) {
      combatant.currentHp = nextState.player.vitals.currentHp;
      combatant.currentEther = nextState.player.vitals.currentEther;
      combatant.currentAp -= item.apUseCost ?? 0;
      combatant.statuses = nextState.player.activeStatusEffects.map((status) => ({ statusEffectId: status.id, remainingTurns: status.durationTurns }));
      nextState.combat.log.push({ id: `item_${nextState.combat.roundNumber}_${nextState.combat.log.length}`, round: nextState.combat.roundNumber, category: 'Status', message: `${nextState.player.name} uses ${item.name}.` });
    }
    return { success: true, changedQuantity: 1, nextState, item };
  }
}
