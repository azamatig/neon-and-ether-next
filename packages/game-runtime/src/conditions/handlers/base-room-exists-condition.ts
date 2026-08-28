import { BaseRoomExistsCondition } from '@neon-ether/game-schema';
import { ConditionContext } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleBaseRoomExistsCondition: ConditionHandler<BaseRoomExistsCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  const room = context.state.base?.rooms?.[condition.roomId];
  const isBuilt = room?.isBuilt ?? false;
  const currentLevel = room?.level ?? 0;
  const isMet = isBuilt && currentLevel >= (condition.minLevel ?? 1);

  return {
    isMet,
    type: 'baseRoomExists',
    actual: { built: isBuilt, level: currentLevel },
    expected: { built: true, minLevel: condition.minLevel ?? 1 },
    reason: isMet
      ? `Base room '${condition.roomId}' exists at level ${currentLevel}`
      : `Base room '${condition.roomId}' missing or below required level ${condition.minLevel ?? 1} (built: ${isBuilt}, level: ${currentLevel})`,
  };
};
