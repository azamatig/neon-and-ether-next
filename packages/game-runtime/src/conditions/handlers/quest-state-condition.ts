import { QuestStateCondition } from '@neon-ether/game-schema';
import { ConditionContext } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleQuestStateCondition: ConditionHandler<QuestStateCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  const questProgress = context.state.quests[condition.questId];
  const actualStatus = questProgress ? questProgress.status : 'NotStarted';
  const actualStageId = questProgress ? questProgress.currentStageId : undefined;

  let isMatch = true;

  if (condition.status !== undefined) {
    if (actualStatus !== condition.status) {
      isMatch = false;
    }
  }

  if (condition.stageId !== undefined) {
    if (actualStageId !== condition.stageId) {
      isMatch = false;
    }
  }

  const isMet = condition.operator === '!=' ? !isMatch : isMatch;

  return {
    isMet,
    type: 'questState',
    actual: { status: actualStatus, stageId: actualStageId },
    expected: { status: condition.status, stageId: condition.stageId, operator: condition.operator },
    reason: isMet
      ? `Quest '${condition.questId}' matches state (Status: ${actualStatus}, Stage: ${actualStageId ?? 'None'})`
      : `Quest '${condition.questId}' mismatch (Actual: [${actualStatus}, ${actualStageId ?? 'None'}], Expected: [${condition.status ?? '*'}, ${condition.stageId ?? '*'}])`,
  };
};
