import { FactionReputationCondition } from '@neon-ether/game-schema';
import { ConditionContext, evaluateComparison } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleFactionReputationCondition: ConditionHandler<FactionReputationCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  const actual = context.state.factions?.[condition.factionId]?.reputation ?? 0;
  const expected = condition.value;
  const isMet = evaluateComparison(actual, condition.operator, expected);

  return {
    isMet,
    type: 'factionReputation',
    actual,
    expected,
    reason: isMet
      ? `Faction '${condition.factionId}' reputation is ${actual} (${condition.operator} ${expected})`
      : `Faction '${condition.factionId}' reputation is ${actual}, required ${condition.operator} ${expected}`,
  };
};
