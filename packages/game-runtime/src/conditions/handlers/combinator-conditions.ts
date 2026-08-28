import { Condition } from '@neon-ether/game-schema';
import { ConditionContext } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleAndCondition: ConditionHandler<any> = (
  condition: { type: 'and'; conditions: Condition[] },
  context: ConditionContext,
  evaluator: (cond: Condition, ctx: ConditionContext) => ConditionEvaluationResult
): ConditionEvaluationResult => {
  const childResults: ConditionEvaluationResult[] = [];
  let allMet = true;

  for (const child of condition.conditions) {
    const res = evaluator(child, context);
    childResults.push(res);
    if (!res.isMet) {
      allMet = false;
    }
  }

  return {
    isMet: allMet,
    type: 'and',
    childResults,
    reason: allMet
      ? `All ${childResults.length} nested conditions satisfied`
      : `1 or more of ${childResults.length} nested conditions failed`,
  };
};

export const handleOrCondition: ConditionHandler<any> = (
  condition: { type: 'or'; conditions: Condition[] },
  context: ConditionContext,
  evaluator: (cond: Condition, ctx: ConditionContext) => ConditionEvaluationResult
): ConditionEvaluationResult => {
  const childResults: ConditionEvaluationResult[] = [];
  let anyMet = false;

  for (const child of condition.conditions) {
    const res = evaluator(child, context);
    childResults.push(res);
    if (res.isMet) {
      anyMet = true;
    }
  }

  return {
    isMet: anyMet,
    type: 'or',
    childResults,
    reason: anyMet
      ? `At least 1 condition satisfied in OR block`
      : `All ${childResults.length} conditions in OR block failed`,
  };
};

export const handleNotCondition: ConditionHandler<any> = (
  condition: { type: 'not'; condition: Condition },
  context: ConditionContext,
  evaluator: (cond: Condition, ctx: ConditionContext) => ConditionEvaluationResult
): ConditionEvaluationResult => {
  const innerResult = evaluator(condition.condition, context);
  const isMet = !innerResult.isMet;

  return {
    isMet,
    type: 'not',
    childResults: [innerResult],
    reason: isMet
      ? `Inverted condition satisfied (inner was false)`
      : `Inverted condition failed (inner was true)`,
  };
};
