import { HasItemCondition } from '@neon-ether/game-schema';
import { ConditionContext, evaluateComparison } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleHasItemCondition: ConditionHandler<HasItemCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  let inventoryItems = context.state.player?.inventory?.items ?? [];

  if (condition.targetCharacterId && condition.targetCharacterId !== context.state.player?.characterId) {
    const npc = context.state.npcs?.[condition.targetCharacterId];
    inventoryItems = npc?.inventory?.items ?? [];
  }

  let count = 0;
  for (const slot of inventoryItems) {
    if (slot.itemId === condition.itemId) {
      if (!condition.requireEquipped || slot.isEquipped) {
        count += slot.quantity;
      }
    }
  }

  const expected = condition.quantity;
  const isMet = evaluateComparison(count, condition.operator, expected);

  return {
    isMet,
    type: 'hasItem',
    actual: count,
    expected,
    reason: isMet
      ? `Inventory has ${count}x '${condition.itemId}' (${condition.operator} ${expected})`
      : `Inventory has ${count}x '${condition.itemId}', required ${condition.operator} ${expected}`,
  };
};
