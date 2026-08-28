import { FlagCondition } from '@neon-ether/game-schema';
import { ConditionContext, evaluateComparison } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleFlagCondition: ConditionHandler<FlagCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  const flags = context.state.world?.flags ?? (context.state as any).flags ?? {};
  const actual = flags[condition.flag];
  const expected = condition.value;
  const isMet = evaluateComparison(actual, condition.operator, expected);

  return {
    isMet,
    type: 'flag',
    actual,
    expected,
    reason: isMet
      ? `Flag '${condition.flag}' is ${JSON.stringify(actual)} (${condition.operator} ${JSON.stringify(expected)})`
      : `Flag '${condition.flag}' is ${JSON.stringify(actual)}, expected ${condition.operator} ${JSON.stringify(expected)}`,
  };
};
