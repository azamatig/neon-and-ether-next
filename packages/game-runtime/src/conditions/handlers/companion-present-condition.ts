import { CompanionPresentCondition } from '@neon-ether/game-schema';
import { ConditionContext } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleCompanionPresentCondition: ConditionHandler<CompanionPresentCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  const npc = context.state.npcs?.[condition.companionId];
  const isPresent = npc?.assignment.partySlotId !== null && npc?.assignment.partySlotId !== undefined;
  const isMet = condition.inParty ? isPresent : !isPresent;

  return {
    isMet,
    type: 'companionPresent',
    actual: isPresent,
    expected: condition.inParty,
    reason: isMet
      ? `Companion '${condition.companionId}' party presence matches (inParty: ${isPresent})`
      : `Companion '${condition.companionId}' party presence mismatch (Actual: ${isPresent}, Required: ${condition.inParty})`,
  };
};
