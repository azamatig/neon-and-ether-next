import type { SpecialPathUnlockedCondition } from '@neon-ether/game-schema';
import type { ConditionHandler } from '../condition-handler.ts';

export const handleSpecialPathUnlocked: ConditionHandler<SpecialPathUnlockedCondition> = (condition, context) => {
  const actual = context.state.player.specialPathIds.includes(condition.specialPathId);
  return { isMet:actual === condition.unlocked, type:condition.type, actual, expected:condition.unlocked, reason:`Special path is ${actual ? 'unlocked' : 'locked'}.` };
};
