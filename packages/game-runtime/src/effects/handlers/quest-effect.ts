import { AdvanceQuestEffect, CompleteQuestEffect, StartQuestEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleStartQuestEffect: EffectHandler<StartQuestEffect> = (effect, context) => {
  const questDefinition = context.contentRegistry?.getQuest(effect.questId);
  const initialStage = effect.initialStageId ?? questDefinition?.initialStageId ?? 'stage_01';

  context.state.quests[effect.questId] = {
    questId: effect.questId,
    currentStageId: initialStage,
    status: 'Active',
    completedObjectiveIds: [],
    failedObjectiveIds: [],
    objectiveCounters: {},
    startedAtTurn: context.state.time?.turnCount ?? 1,
    customVariables: {},
  };

  const questTitle = questDefinition?.title ?? effect.questId;

  if (context.logJournal) {
    context.logJournal('Quest', `Quest Started: "${questTitle}" (Stage: ${initialStage})`, {
      questId: effect.questId,
      stageId: initialStage,
    });
  }

  return {
    success: true,
    type: 'startQuest',
    message: `Quest '${effect.questId}' started at stage '${initialStage}'`,
    mutationSummary: {
      questId: effect.questId,
      status: 'Active',
      stageId: initialStage,
    },
  };
};

export const handleAdvanceQuestEffect: EffectHandler<AdvanceQuestEffect> = (effect, context) => {
  const questProgress = context.state.quests[effect.questId];

  if (!questProgress) {
    const questDefinition = context.contentRegistry?.getQuest(effect.questId);
    const targetStage = effect.targetStageId ?? questDefinition?.initialStageId ?? 'stage_01';

    context.state.quests[effect.questId] = {
      questId: effect.questId,
      currentStageId: targetStage,
      status: 'Active',
      completedObjectiveIds: effect.completeObjectiveId ? [effect.completeObjectiveId] : [],
      failedObjectiveIds: [],
      objectiveCounters: {},
      startedAtTurn: context.state.time?.turnCount ?? 1,
      customVariables: {},
    };

    return {
      success: true,
      type: 'advanceQuest',
      message: `Quest '${effect.questId}' initialized and advanced to '${targetStage}'`,
      mutationSummary: {
        questId: effect.questId,
        stageId: targetStage,
      },
    };
  }

  const previousStage = questProgress.currentStageId;
  if (effect.targetStageId) {
    questProgress.currentStageId = effect.targetStageId;
  }

  if (effect.completeObjectiveId && !questProgress.completedObjectiveIds.includes(effect.completeObjectiveId)) {
    questProgress.completedObjectiveIds.push(effect.completeObjectiveId);
  }

  const questDefinition = context.contentRegistry?.getQuest(effect.questId);
  const questTitle = questDefinition?.title ?? effect.questId;

  if (context.logJournal) {
    context.logJournal('Quest', `Quest Updated: "${questTitle}" -> Stage: ${questProgress.currentStageId}`, {
      questId: effect.questId,
      previousStage,
      newStage: questProgress.currentStageId,
    });
  }

  return {
    success: true,
    type: 'advanceQuest',
    message: `Quest '${effect.questId}' advanced: ${previousStage} -> ${questProgress.currentStageId}`,
    mutationSummary: {
      questId: effect.questId,
      previousStage,
      currentStageId: questProgress.currentStageId,
      completedObjectives: questProgress.completedObjectiveIds,
    },
  };
};

export const handleCompleteQuestEffect: EffectHandler<CompleteQuestEffect> = (effect, context) => {
  const questProgress = context.state.quests[effect.questId];
  const outcomeStatus = effect.outcome === 'Failed' ? 'Failed' : 'Completed';

  if (!questProgress) {
    context.state.quests[effect.questId] = {
      questId: effect.questId,
      currentStageId: 'completed',
      status: outcomeStatus,
      completedObjectiveIds: [],
      failedObjectiveIds: [],
      objectiveCounters: {},
      completedAtTurn: context.state.time?.turnCount ?? 1,
      customVariables: {},
    };
  } else {
    questProgress.status = outcomeStatus;
    questProgress.completedAtTurn = context.state.time?.turnCount ?? 1;
  }

  const questDefinition = context.contentRegistry?.getQuest(effect.questId);
  const questTitle = questDefinition?.title ?? effect.questId;

  // Grant rewards if successful and configured
  if (outcomeStatus === 'Completed' && effect.grantRewards && questDefinition) {
    if (questDefinition.rewardCredits && questDefinition.rewardCredits > 0) {
      context.state.player.inventory.credits = (context.state.player.inventory.credits ?? 0) + questDefinition.rewardCredits;
    }
    if (questDefinition.rewardItemIds && questDefinition.rewardItemIds.length > 0) {
      for (const itemId of questDefinition.rewardItemIds) {
        context.state.player.inventory.items.push({
          itemId,
          quantity: 1,
          isEquipped: false,
        });
      }
    }
    if (questDefinition.reputationChanges) {
      for (const [facId, delta] of Object.entries(questDefinition.reputationChanges)) {
        if (typeof delta === 'number') {
          if (!context.state.factions[facId]) {
            context.state.factions[facId] = {
              factionId: facId,
              reputation: 0,
              standing: 'Neutral',
              tier: 1,
              isDiscovered: true,
              flags: {},
            };
          }
          const prev = context.state.factions[facId].reputation;
          context.state.factions[facId].reputation = Math.max(-100, Math.min(100, prev + delta));
        }
      }
    }
  }

  if (context.logJournal) {
    context.logJournal('Quest', `Quest ${outcomeStatus}: "${questTitle}"`, {
      questId: effect.questId,
      status: outcomeStatus,
    });
  }

  return {
    success: true,
    type: 'completeQuest',
    message: `Quest '${effect.questId}' marked as ${outcomeStatus}`,
    mutationSummary: {
      questId: effect.questId,
      status: outcomeStatus,
    },
  };
};
