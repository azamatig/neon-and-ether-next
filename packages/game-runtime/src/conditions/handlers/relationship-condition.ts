import { RelationshipCondition } from '@neon-ether/game-schema';
import { ConditionContext, evaluateComparison } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleRelationshipCondition: ConditionHandler<RelationshipCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  const actual = context.state.npcs?.[condition.npcId]?.relationship.affinity ?? 0;
  const expected = condition.value;
  const isMet = evaluateComparison(actual, condition.operator, expected);

  return {
    isMet,
    type: 'relationship',
    actual,
    expected,
    reason: isMet
      ? `Relationship with NPC '${condition.npcId}' is ${actual} (${condition.operator} ${expected})`
      : `Relationship with NPC '${condition.npcId}' is ${actual}, required ${condition.operator} ${expected}`,
  };
};
