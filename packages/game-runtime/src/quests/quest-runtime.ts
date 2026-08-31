import type { Quest, QuestStage, QuestStageAction, QuestStageBranch } from '@neon-ether/game-schema';
import type { ContentRegistry } from '../content/content-registry.ts';
import type { GameState, QuestRuntimeState } from '../state/game-state.ts';
import { ConditionRegistry, defaultConditionRegistry } from '../conditions/condition-registry.ts';
import { evaluateConditions, type BatchConditionResult } from '../conditions/condition-evaluator.ts';
import { EffectExecutor, defaultEffectExecutor, type BatchEffectExecutionResult } from '../effects/effect-executor.ts';
import { DiceRoller, type RandomSource } from '@neon-ether/engine';

export interface ResolvedQuestAction extends QuestStageAction {
  isAvailable: boolean;
  isVisible: boolean;
  unmetReason?: string;
}

export interface ResolvedQuestBranch extends QuestStageBranch {
  isAvailable: boolean;
  unmetReason?: string;
}

export interface ResolvedQuestState {
  definition: Quest;
  runtime: QuestRuntimeState;
  stage: QuestStage;
  actions: ResolvedQuestAction[];
  branches: ResolvedQuestBranch[];
  completion: BatchConditionResult;
  objectivesComplete: boolean;
  canCompleteStage: boolean;
}

export interface QuestCommandResult {
  success: boolean;
  message: string;
  effects?: BatchEffectExecutionResult;
  resolved?: ResolvedQuestState;
}

/** Framework-independent, content-driven staged quest state machine. */
export class QuestRuntime {
  constructor(
    private readonly conditions: ConditionRegistry = defaultConditionRegistry,
    private readonly effects: EffectExecutor = defaultEffectExecutor,
    private readonly random: RandomSource = new DiceRoller(1337),
  ) {}

  public startQuest(questId: string, state: GameState, content: ContentRegistry): QuestCommandResult {
    const quest = content.getQuest(questId);
    if (!quest) return this.failure(`Quest '${questId}' was not found.`);
    const existing = state.quests[questId];
    if (existing?.status === 'Active') return this.failure(`Quest '${questId}' is already active.`);
    if (existing?.status === 'Completed' && !quest.isRepeatable) return this.failure(`Quest '${questId}' is not repeatable.`);
    const stage = quest.stages[quest.initialStageId];
    if (!stage) return this.failure(`Initial stage '${quest.initialStageId}' was not found.`);
    const entry = this.evaluate(stage.entryConditions, state, content);
    if (!entry.allMet) return this.failure(entry.failedConditions[0]?.reason ?? 'Stage entry conditions are not met.');

    state.quests[questId] = {
      questId, status: 'Active', currentStageId: stage.id, completedObjectiveIds: [], failedObjectiveIds: [],
      objectiveCounters: {}, startedAtTurn: state.time.turnCount, customVariables: {},
    };
    const effects = this.execute(stage.entryEffects, state, content);
    return { success: effects.success, message: `Quest '${questId}' started at '${stage.id}'.`, effects, resolved: this.resolve(questId, state, content) };
  }

  public resolve(questId: string, state: GameState, content: ContentRegistry): ResolvedQuestState | undefined {
    const definition = content.getQuest(questId);
    const runtime = state.quests[questId];
    const stage = definition && runtime ? definition.stages[runtime.currentStageId] : undefined;
    if (!definition || !runtime || !stage) return undefined;
    const actions = stage.actions.map((action) => {
      const result = this.evaluate(action.conditions, state, content);
      return { ...action, isAvailable: result.allMet, isVisible: result.allMet || !action.hideIfUnavailable, unmetReason: result.failedConditions[0]?.reason };
    });
    const branches = stage.branches.map((branch) => {
      const result = this.evaluate(branch.conditions, state, content);
      return { ...branch, isAvailable: result.allMet, unmetReason: result.failedConditions[0]?.reason };
    });
    const completion = this.evaluate(stage.completionConditions, state, content);
    const objectivesComplete = stage.objectives.filter((objective) => !objective.isOptional).every((objective) =>
      runtime.completedObjectiveIds.includes(objective.id) || (runtime.objectiveCounters[objective.id] ?? 0) >= objective.requiredCount
    );
    return { definition, runtime, stage, actions, branches, completion, objectivesComplete, canCompleteStage: objectivesComplete && completion.allMet };
  }

  public progressObjective(questId: string, objectiveId: string, amount: number, state: GameState, content: ContentRegistry): QuestCommandResult {
    const resolved = this.resolve(questId, state, content);
    if (!resolved || resolved.runtime.status !== 'Active') return this.failure(`Quest '${questId}' is not active.`);
    const objective = resolved.stage.objectives.find((candidate) => candidate.id === objectiveId);
    if (!objective) return this.failure(`Objective '${objectiveId}' is not in the current stage.`);
    if (!Number.isInteger(amount) || amount <= 0) return this.failure('Objective progress must be a positive integer.');
    const next = Math.min(objective.requiredCount, (resolved.runtime.objectiveCounters[objectiveId] ?? 0) + amount);
    resolved.runtime.objectiveCounters[objectiveId] = next;
    if (next >= objective.requiredCount && !resolved.runtime.completedObjectiveIds.includes(objectiveId)) resolved.runtime.completedObjectiveIds.push(objectiveId);
    return { success: true, message: `Objective '${objectiveId}' progressed to ${next}/${objective.requiredCount}.`, resolved: this.resolve(questId, state, content) };
  }

  public executeAction(questId: string, actionId: string, state: GameState, content: ContentRegistry): QuestCommandResult {
    const resolved = this.resolve(questId, state, content);
    if (!resolved || resolved.runtime.status !== 'Active') return this.failure(`Quest '${questId}' is not active.`);
    const action = resolved.actions.find((candidate) => candidate.id === actionId);
    if (!action) return this.failure(`Action '${actionId}' was not found.`);
    if (!action.isAvailable) return this.failure(action.unmetReason ?? `Action '${actionId}' is unavailable.`);
    const effects = this.execute(action.effects, state, content);
    if (!effects.success) return { success: false, message: `Action '${actionId}' effects failed.`, effects };
    if (action.targetStageId) return this.transition(resolved, action.targetStageId, [], state, content);
    return { success: true, message: `Quest action '${actionId}' executed.`, effects, resolved: this.resolve(questId, state, content) };
  }

  public completeStage(questId: string, state: GameState, content: ContentRegistry, branchId?: string): QuestCommandResult {
    const resolved = this.resolve(questId, state, content);
    if (!resolved || resolved.runtime.status !== 'Active') return this.failure(`Quest '${questId}' is not active.`);
    if (!resolved.canCompleteStage) return this.failure(resolved.completion.failedConditions[0]?.reason ?? 'Required objectives are incomplete.');
    const branch = branchId ? resolved.branches.find((candidate) => candidate.id === branchId) : resolved.branches.find((candidate) => candidate.isAvailable);
    if (branchId && (!branch || !branch.isAvailable)) return this.failure(branch?.unmetReason ?? `Branch '${branchId}' is unavailable.`);
    const targetStageId = branch?.targetStageId ?? resolved.stage.nextStageId;
    if (!targetStageId) {
      const effects = this.execute([...resolved.stage.completionEffects, ...(branch?.effects ?? []), { type: 'completeQuest', questId, outcome: 'Success', grantRewards: true }], state, content);
      return { success: effects.success, message: `Quest '${questId}' completed.`, effects, resolved: this.resolve(questId, state, content) };
    }
    return this.transition(resolved, targetStageId, [...resolved.stage.completionEffects, ...(branch?.effects ?? [])], state, content);
  }

  private transition(resolved: ResolvedQuestState, targetStageId: string, transitionEffects: QuestStage['entryEffects'], state: GameState, content: ContentRegistry): QuestCommandResult {
    const target = resolved.definition.stages[targetStageId];
    if (!target) return this.failure(`Target stage '${targetStageId}' was not found.`);
    const entry = this.evaluate(target.entryConditions, state, content);
    if (!entry.allMet) return this.failure(entry.failedConditions[0]?.reason ?? `Cannot enter stage '${targetStageId}'.`);
    const effects = this.execute([...transitionEffects, ...target.entryEffects], state, content);
    if (!effects.success) return { success: false, message: `Transition effects for '${targetStageId}' failed.`, effects };
    resolved.runtime.currentStageId = targetStageId;
    return { success: true, message: `Quest '${resolved.definition.id}' advanced to '${targetStageId}'.`, effects, resolved: this.resolve(resolved.definition.id, state, content) };
  }

  private evaluate(conditions: QuestStage['entryConditions'], state: GameState, content: ContentRegistry): BatchConditionResult {
    return evaluateConditions(conditions, { state, contentRegistry: content, rollRandom:(min,max)=>this.random.integer(min,max) }, this.conditions);
  }

  private execute(effects: QuestStage['entryEffects'], state: GameState, content: ContentRegistry): BatchEffectExecutionResult {
    return this.effects.executeBatch(effects, { state, contentRegistry: content,random:this.random });
  }

  private failure(message: string): QuestCommandResult { return { success: false, message }; }
}
