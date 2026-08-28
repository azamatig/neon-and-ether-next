import { RandomChanceCondition } from '@neon-ether/game-schema';
import { ConditionContext } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleRandomChanceCondition: ConditionHandler<RandomChanceCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  // Use context RNG or Math.random
  const roll = context.rollRandom ? context.rollRandom(0, 100) / 100 : Math.random();
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
