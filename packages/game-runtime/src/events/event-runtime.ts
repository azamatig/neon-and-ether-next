/**
 * @neon-ether/game-runtime
 * Unified GameEvent Runtime.
 * Orchestrates Flavor, Choice, Dialogue, Scene, and Encounter events through a unified data-driven step machine.
 */

import {
  EventChoice,
  EventSpeaker,
  EventStep,
  GameEvent,
  GameplayOutcome,
  OriginContext,
} from '@neon-ether/game-schema';
import { DiceRoller, type RandomSource } from '@neon-ether/engine';
import { GameState } from '../state/game-state.ts';
import { ContentRegistry } from '../content/content-registry.ts';
import { BatchConditionResult, evaluateConditions } from '../conditions/condition-evaluator.ts';
import { ConditionRegistry, defaultConditionRegistry } from '../conditions/condition-registry.ts';
import { BatchEffectExecutionResult, EffectExecutor, defaultEffectExecutor } from '../effects/effect-executor.ts';
import { GameplayOutcomeEngine, defaultGameplayOutcomeEngine } from '../resolution/gameplay-outcome-engine.ts';
import { SkillCheckSystem } from '../resolution/skill-check.ts';
import type { RuntimeTraceSink } from '../observability/runtime-trace.ts';

export interface ResolvedEventChoice extends EventChoice {
  isAvailable: boolean;
  isVisible: boolean;
  unmetReason?: string;
  statCheckInfo?: {
    stat: string;
    difficulty: string;
  };
}

export interface ResolvedEventStep extends EventStep {
  resolvedSpeaker?: {
    type: 'npc' | 'player' | 'system' | 'companion' | 'narrator';
    name: string;
    title?: string;
    portrait?: string;
  };
  resolvedChoices: ResolvedEventChoice[];
  isFinalStep: boolean;
}

export interface ResolvedEventState {
  event: GameEvent;
  currentStep: ResolvedEventStep;
  stepIndex: number;
  totalSteps: number;
  originContext?: OriginContext | null;
  historyLog: Array<{ speaker?: string; text: string }>;
}

export class EventRuntime {
  private conditionRegistry: ConditionRegistry;
  private effectExecutor: EffectExecutor;
  private outcomeEngine: GameplayOutcomeEngine;
  private diceRoller: RandomSource;
  private trace?: RuntimeTraceSink;

  constructor(
    conditionRegistry: ConditionRegistry = defaultConditionRegistry,
    effectExecutor: EffectExecutor = defaultEffectExecutor,
    outcomeEngine: GameplayOutcomeEngine = defaultGameplayOutcomeEngine,
    diceRoller: RandomSource = new DiceRoller(777),
    trace?: RuntimeTraceSink,
  ) {
    this.conditionRegistry = conditionRegistry;
    this.effectExecutor = effectExecutor;
    this.outcomeEngine = outcomeEngine;
    this.diceRoller = diceRoller;
    this.trace = trace;
  }

  /** Resolves authored trigger and availability rules without starting an event. */
  public canTriggerEvent(event: GameEvent, state: GameState, contentRegistry: ContentRegistry): BatchConditionResult {
    return evaluateConditions(
      [...(event.conditions ?? []), ...(event.triggerConditions ?? []), ...(event.availabilityConditions ?? [])],
      { state, contentRegistry, rollRandom:(min,max)=>this.diceRoller.integer(min,max) },
      this.conditionRegistry
    );
  }

  /**
   * Initializes and starts a GameEvent.
   */
  public startEvent(
    eventId: string,
    state: GameState,
    contentRegistry: ContentRegistry,
    originContext?: OriginContext,
    logJournal?: (category: any, text: string) => void
  ): boolean {
    const event = contentRegistry.getEvent(eventId);
    if (!event) {
      if (logJournal) logJournal('System', `Failed to start event [${eventId}]: Event not found.`);
      return false;
    }
    const availability = this.canTriggerEvent(event, state, contentRegistry);
    if (!availability.allMet) {
      if (logJournal) logJournal('System', `Event [${eventId}] is unavailable: ${availability.failedConditions[0]?.reason ?? 'conditions unmet'}.`);
      return false;
    }

    // Set origin context if provided
    if (originContext) {
      state.world.activeOriginContext = originContext;
    }

    state.world.activeEventId = eventId;
    const firstStep = this.findAvailableStep(event, 0, state, contentRegistry);
    if (!firstStep) return false;
    state.world.activeEventStepId = firstStep.id;
    state.world.mode = 'Event';

    // Execute entry effects
    if (event.entryEffects && event.entryEffects.length > 0) {
      this.effectExecutor.executeBatch(event.entryEffects, { state, contentRegistry, logJournal,random:this.diceRoller });
    }

    if (logJournal) {
      logJournal('World', `Event triggered: ${event.name} (${event.type.toUpperCase()}).`);
    }

    return true;
  }

  /**
   * Resolves the current active event state and active step presentation data.
   */
  public getResolvedEventState(
    state: GameState,
    contentRegistry: ContentRegistry
  ): ResolvedEventState | undefined {
    const eventId = state.world.activeEventId;
    if (!eventId) return undefined;

    const event = contentRegistry.getEvent(eventId);
    if (!event || !event.steps || event.steps.length === 0) return undefined;

    const stepId = state.world.activeEventStepId ?? event.steps[0].id;
    const stepIndex = event.steps.findIndex((s) => s.id === stepId);
    const currentStep = stepIndex >= 0 ? event.steps[stepIndex] : event.steps[0];
    const actualIndex = stepIndex >= 0 ? stepIndex : 0;
    const isFinalStep = actualIndex >= event.steps.length - 1 && (!currentStep.choices || currentStep.choices.length === 0);

    // Resolve speaker
    let resolvedSpeaker: ResolvedEventStep['resolvedSpeaker'] = undefined;
    if (currentStep.speaker) {
      const spk = currentStep.speaker;
      let name = spk.name ?? 'Unknown';
      let title = spk.title;
      let portrait = spk.portrait;

      if (spk.type === 'npc' && spk.npcId) {
        const npcDef = contentRegistry.getNPC(spk.npcId);
        if (npcDef) {
          name = npcDef.name;
          title = npcDef.title ?? title;
          portrait = portrait ?? npcDef.portraitIcon;
        }
      } else if (spk.type === 'player') {
        name = state.player.name;
        title = state.player.title;
        portrait = 'User';
      }

      resolvedSpeaker = {
        type: spk.type,
        name,
        title,
        portrait,
      };
    }

    // Resolve choices
    const resolvedChoices: ResolvedEventChoice[] = (currentStep.choices ?? []).map((choice) => {
      const condResult = evaluateConditions(
        choice.conditions ?? [],
        { state, contentRegistry, rollRandom:(min,max)=>this.diceRoller.integer(min,max) },
        this.conditionRegistry
      );

      const isAvailable = condResult.allMet;
      const isVisible = !choice.hideIfUnavailable || isAvailable;
      const unmetReason = condResult.allMet ? undefined : choice.disabledReason ?? condResult.failedConditions[0]?.reason;

      return {
        ...choice,
        isAvailable,
        isVisible,
        unmetReason,
        statCheckInfo: choice.check
          ? {
              stat: `${choice.check.attribute}${choice.check.skill ? ` / ${choice.check.skill}` : ''}`,
              difficulty: choice.check.difficulty,
            }
          : undefined,
      };
    });

    return {
      event,
      currentStep: {
        ...currentStep,
        resolvedSpeaker,
        resolvedChoices,
        isFinalStep,
      },
      stepIndex: actualIndex,
      totalSteps: event.steps.length,
      originContext: state.world.activeOriginContext,
      historyLog: [],
    };
  }

  /**
   * Advances a simple step or flavor event to the next step or completion.
   */
  public advanceStep(
    state: GameState,
    contentRegistry: ContentRegistry,
    logJournal?: (category: any, text: string) => void
  ): boolean {
    const eventId = state.world.activeEventId;
    if (!eventId) return false;

    const event = contentRegistry.getEvent(eventId);
    if (!event) return false;

    const currentStepId = state.world.activeEventStepId ?? event.steps[0]?.id;
    const currentIndex = event.steps.findIndex((s) => s.id === currentStepId);
    const currentStep = currentIndex >= 0 ? event.steps[currentIndex] : event.steps[0];

    // Execute step effects if any
    if (currentStep?.effects && currentStep.effects.length > 0) {
      this.effectExecutor.executeBatch(currentStep.effects, { state, contentRegistry, logJournal,random:this.diceRoller });
    }

    // If step specifies an explicit step outcome
    if (currentStep?.outcome) {
      this.outcomeEngine.resolveOutcome(currentStep.outcome, state, contentRegistry);
      return true;
    }

    // If step has an explicit nextStepId
    if (currentStep?.nextStepId) {
      const targetIndex = event.steps.findIndex((step) => step.id === currentStep.nextStepId);
      const nextStep = this.findAvailableStep(event, Math.max(0, targetIndex), state, contentRegistry);
      if (nextStep) { state.world.activeEventStepId = nextStep.id; return true; }
      return this.completeEvent(event, state, contentRegistry, logJournal);
    }

    // Check if next step in array exists
    if (currentIndex >= 0 && currentIndex + 1 < event.steps.length) {
      const nextStep = this.findAvailableStep(event, currentIndex + 1, state, contentRegistry);
      if (!nextStep) return this.completeEvent(event, state, contentRegistry, logJournal);
      state.world.activeEventStepId = nextStep.id;
      return true;
    }

    // Otherwise complete event
    return this.completeEvent(event, state, contentRegistry, logJournal);
  }

  /**
   * Selects a choice on the current event step.
   */
  public chooseOption(
    choiceId: string,
    state: GameState,
    contentRegistry: ContentRegistry,
    logJournal?: (category: any, text: string) => void
  ): boolean {
    const resolved = this.getResolvedEventState(state, contentRegistry);
    if (!resolved) return false;

    const choice = resolved.currentStep.resolvedChoices.find((c) => c.id === choiceId);
    if (!choice || !choice.isAvailable) {
      if (logJournal) logJournal('System', `Choice not available: ${choice?.unmetReason ?? 'Conditions unmet'}`);
      return false;
    }

    let effectsToRun = [...(choice.effects ?? [])];
    let nextOutcome = choice.outcome;
    let nextStepId = choice.nextStepId;

    // 1. If choice includes a stat check
    if (choice.check) {
      const checkDef = choice.check;
      {
        const rollRes = new SkillCheckSystem(this.diceRoller).resolve(checkDef, state.player);
        this.trace?.({kind:'SkillCheck',message:`Event skill check: ${rollRes.result}`,details:{eventId:state.world.activeEventId,stepId:state.world.activeEventStepId,choiceId,attribute:checkDef.attribute,skill:checkDef.skill,difficulty:checkDef.difficulty,targetDc:rollRes.targetDc,roll:rollRes.roll,result:rollRes.result,passed:rollRes.isPassed}});

        if (logJournal) {
          logJournal('SkillCheck', rollRes.logSummary);
        }

        if (rollRes.isPassed) {
          effectsToRun = [...effectsToRun, ...(checkDef.passEffects ?? [])];
          if (checkDef.passOutcome) nextOutcome = checkDef.passOutcome;
        } else if (rollRes.result === 'partialSuccess') {
          effectsToRun = [...effectsToRun, ...(checkDef.partialEffects ?? [])];
          if (checkDef.partialOutcome) nextOutcome = checkDef.partialOutcome;
        } else {
          effectsToRun = [...(checkDef.failEffects ?? [])];
          if (checkDef.failOutcome) nextOutcome = checkDef.failOutcome;
        }
      }
    }

    // 2. Execute Effects
    if (effectsToRun.length > 0) {
      this.effectExecutor.executeBatch(effectsToRun, { state, contentRegistry, logJournal,random:this.diceRoller });
    }

    // 3. Resolve transition
    if (nextOutcome) {
      this.outcomeEngine.resolveOutcome(nextOutcome, state, contentRegistry);
      return true;
    }

    if (nextStepId) {
      const targetIndex = resolved.event.steps.findIndex((step) => step.id === nextStepId);
      const nextStep = this.findAvailableStep(resolved.event, Math.max(0, targetIndex), state, contentRegistry);
      if (nextStep) { state.world.activeEventStepId = nextStep.id; return true; }
      return this.completeEvent(resolved.event, state, contentRegistry, logJournal);
    }

    // If no explicit outcome or next step, advance or complete
    return this.advanceStep(state, contentRegistry, logJournal);
  }

  /**
   * Completes the event, applying completion effects and resolving completion outcome.
   */
  public completeEvent(
    event: GameEvent,
    state: GameState,
    contentRegistry: ContentRegistry,
    logJournal?: (category: any, text: string) => void
  ): boolean {
    // 1. Run completion effects
    if (event.completionEffects && event.completionEffects.length > 0) {
      this.effectExecutor.executeBatch(event.completionEffects, { state, contentRegistry, logJournal,random:this.diceRoller });
    }

    // 2. Clear active event
    state.world.activeEventId = null;
    state.world.activeEventStepId = null;

    // 3. Resolve completion outcome
    const outcome = event.completionOutcome ?? { type: 'returnToOrigin' };
    this.outcomeEngine.resolveOutcome(outcome, state, contentRegistry);

    if (logJournal) {
      logJournal('World', `Event completed: ${event.name}.`);
    }

    return true;
  }

  /** Skips only events with an explicitly authored safe outcome. */
  public skipEvent(event: GameEvent, state: GameState, contentRegistry: ContentRegistry, logJournal?: (category: any, text: string) => void): boolean {
    if (!event.skipOutcome) return false;
    if (event.completionEffects?.length) this.effectExecutor.executeBatch(event.completionEffects, { state, contentRegistry, logJournal, random:this.diceRoller });
    state.world.activeEventId = null;
    state.world.activeEventStepId = null;
    this.outcomeEngine.resolveOutcome(event.skipOutcome, state, contentRegistry);
    if (logJournal) logJournal('World', `Event skipped: ${event.name}.`);
    return true;
  }

  private findAvailableStep(event: GameEvent, startIndex: number, state: GameState, contentRegistry: ContentRegistry): EventStep | undefined {
    return event.steps.slice(startIndex).find((step) => evaluateConditions(step.conditions ?? [], { state, contentRegistry, rollRandom:(min,max)=>this.diceRoller.integer(min,max) }, this.conditionRegistry).allMet);
  }
}

export const defaultEventRuntime = new EventRuntime();
