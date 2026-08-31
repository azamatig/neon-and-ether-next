import { RandomChanceCondition } from '@neon-ether/game-schema';
import { ConditionContext } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleRandomChanceCondition: ConditionHandler<RandomChanceCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  if (!context.rollRandom) return {isMet:false,type:'randomChance',reason:'Random condition requires an injected gameplay RNG.'};
  const roll = context.rollRandom(0, 1_000_000) / 1_000_000;
  const isMet = roll <= condition.probability;

  return {
    isMet,
    type: 'randomChance',
    actual: Math.round(roll * 100) / 100,
    expected: condition.probability,
    reason: isMet
      ? `Random check passed: rolled ${Math.round(roll * 100)}% <= required ${Math.round(condition.probability * 100)}%`
      : `Random check failed: rolled ${Math.round(roll * 100)}% > required ${Math.round(condition.probability * 100)}%`,
  };
};
