/**
 * @neon-ether/game-runtime
 * POI Action Pipeline.
 * Executes: PoiAction → check Conditions → resolve checks → execute Effects → resolve Outcome → present next gameplay context.
 */

import {
  ActionResolution,
  Effect,
  GameplayOutcome,
  Item,
  OriginContext,
  POI,
  PoiAction,
  PoiRuntimeState,
} from '@neon-ether/game-schema';
import { DiceRoller } from '@neon-ether/engine';
import { GameState } from '../state/game-state.ts';
import { ContentRegistry } from '../content/content-registry.ts';
import { BatchConditionResult, evaluateConditions } from '../conditions/condition-evaluator.ts';
import { ConditionRegistry, defaultConditionRegistry } from '../conditions/condition-registry.ts';
import { BatchEffectExecutionResult, EffectExecutor, defaultEffectExecutor } from '../effects/effect-executor.ts';
import { GameplayOutcomeEngine, defaultGameplayOutcomeEngine } from '../resolution/gameplay-outcome-engine.ts';
import { SkillCheckSystem, type SkillCheckResult } from '../resolution/skill-check.ts';

export interface PoiActionPipelineResult {
  success: boolean;
  actionId: string;
  actionLabel: string;
  resolution: ActionResolution;
  effectResults?: BatchEffectExecutionResult;
  statCheckResult?: SkillCheckResult;
  unmetReason?: string;
  nextOutcome?: GameplayOutcome;
}

export class PoiActionPipeline {
  private conditionRegistry: ConditionRegistry;
  private effectExecutor: EffectExecutor;
  private outcomeEngine: GameplayOutcomeEngine;
  private diceRoller: DiceRoller;

  constructor(
    conditionRegistry: ConditionRegistry = defaultConditionRegistry,
    effectExecutor: EffectExecutor = defaultEffectExecutor,
    outcomeEngine: GameplayOutcomeEngine = defaultGameplayOutcomeEngine,
    diceRoller: DiceRoller = new DiceRoller(42)
  ) {
    this.conditionRegistry = conditionRegistry;
    this.effectExecutor = effectExecutor;
    this.outcomeEngine = outcomeEngine;
    this.diceRoller = diceRoller;
  }

  /**
   * Evaluates if a POI action can be executed.
   */
  public canExecute(
    poi: POI,
    action: PoiAction,
    state: GameState,
    contentRegistry: ContentRegistry
  ): { canExecute: boolean; reason?: string; conditionResults: BatchConditionResult } {
    // 1. Evaluate prerequisites
    const conditionResults = evaluateConditions(
      action.conditions ?? [],
      { state, contentRegistry },
      this.conditionRegistry
    );

    if (!conditionResults.allMet) {
      const reason = conditionResults.failedConditions[0]?.reason ?? 'Prerequisites not met';
      return { canExecute: false, reason, conditionResults };
    }

    // 2. Evaluate costs
    if (action.cost) {
      if (action.cost.ap && (state.player.vitals?.actionPointsCurrent ?? 0) < action.cost.ap) {
        return {
          canExecute: false,
          reason: `Insufficient Action Points (Requires ${action.cost.ap} AP, Available: ${state.player.vitals?.actionPointsCurrent ?? 0})`,
          conditionResults,
        };
      }
      if (action.cost.ether && (state.player.vitals?.currentEther ?? 0) < action.cost.ether) {
        return {
          canExecute: false,
          reason: `Insufficient Ether (Requires ${action.cost.ether}, Available: ${state.player.vitals?.currentEther ?? 0})`,
          conditionResults,
        };
      }
      if (action.cost.credits && (state.player.inventory?.credits ?? 0) < action.cost.credits) {
        return {
          canExecute: false,
          reason: `Insufficient Credits (Requires ${action.cost.credits} ¢, Available: ${state.player.inventory?.credits ?? 0} ¢)`,
          conditionResults,
        };
      }
      if (action.cost.hp && (state.player.vitals?.currentHp ?? 0) <= action.cost.hp) {
        return {
          canExecute: false,
          reason: `Insufficient HP (Requires ${action.cost.hp} HP, Current: ${state.player.vitals?.currentHp ?? 0})`,
          conditionResults,
        };
      }
    }

    return { canExecute: true, conditionResults };
  }

  /**
   * Executes the full pipeline for a POI action.
   */
  public execute(
    poi: POI,
    action: PoiAction,
    state: GameState,
    contentRegistry: ContentRegistry,
    logJournal?: (category: any, text: string) => void
  ): PoiActionPipelineResult {
    const check = this.canExecute(poi, action, state, contentRegistry);

    if (!check.canExecute) {
      const failResolution: ActionResolution = {
        actionId: action.id,
        actionLabel: action.label,
        title: `${action.label} - Blocked`,
        resultText: check.reason ?? 'Action could not be performed.',
        status: 'Failure',
        unmetReason: check.reason,
        gainedItems: [],
        lostItems: [],
        creditsDelta: 0,
        xpGained: 0,
        statChanges: [],
        relationshipChanges: [],
        factionRepChanges: [],
        statusEffectsGained: [],
        statusEffectsRemoved: [],
        flagsChanged: {},
        discoveredIntel: [],
      };

      return {
        success: false,
        actionId: action.id,
        actionLabel: action.label,
        resolution: failResolution,
        unmetReason: check.reason,
      };
    }

    // 1. Track initial snapshots for calculating resolution deltas
    const initialCredits = state.player.inventory?.credits ?? 0;
    const initialHp = state.player.vitals?.currentHp ?? 0;
    const initialEther = state.player.vitals?.currentEther ?? 0;
    const initialAp = state.player.vitals?.actionPointsCurrent ?? 0;

    // 2. Deduct costs
    if (action.cost) {
      if (action.cost.ap && state.player.vitals) {
        state.player.vitals.actionPointsCurrent = Math.max(0, state.player.vitals.actionPointsCurrent - action.cost.ap);
      }
      if (action.cost.ether && state.player.vitals) {
        state.player.vitals.currentEther = Math.max(0, state.player.vitals.currentEther - action.cost.ether);
      }
      if (action.cost.credits && state.player.inventory) {
        state.player.inventory.credits = Math.max(0, state.player.inventory.credits - action.cost.credits);
      }
      if (action.cost.hp && state.player.vitals) {
        state.player.vitals.currentHp = Math.max(1, state.player.vitals.currentHp - action.cost.hp);
      }
    }

    // 3. Resolve skill checks if defined on action
    let statCheckResult: SkillCheckResult | undefined;
    let effectsToExecute: Effect[] = [...(action.effects ?? [])];
    let resolvedOutcome: GameplayOutcome | undefined = action.outcome;
    let actionStatus: 'Success' | 'Failure' | 'PartialSuccess' = 'Success';
    let resultSummaryText = action.description ?? `Successfully performed ${action.label} at ${poi.name}.`;

    if (action.check) {
      const checkDef = action.check;
      {
        statCheckResult = new SkillCheckSystem(this.diceRoller).resolve(checkDef, state.player);

        if (logJournal) {
          logJournal('SkillCheck', statCheckResult.logSummary);
        }

        if (statCheckResult.isPassed) {
          actionStatus = 'Success';
          effectsToExecute = [...effectsToExecute, ...(checkDef.passEffects ?? [])];
          if (checkDef.passOutcome) resolvedOutcome = checkDef.passOutcome;
          if (checkDef.passText) resultSummaryText = checkDef.passText;
        } else if (statCheckResult.result === 'partialSuccess') {
          actionStatus = 'PartialSuccess';
          effectsToExecute = [...effectsToExecute, ...(checkDef.partialEffects ?? [])];
          if (checkDef.partialOutcome) resolvedOutcome = checkDef.partialOutcome;
          if (checkDef.partialText) resultSummaryText = checkDef.partialText;
        } else {
          actionStatus = 'Failure';
          effectsToExecute = [...(checkDef.failEffects ?? [])];
          if (checkDef.failOutcome) resolvedOutcome = checkDef.failOutcome;
          if (checkDef.failText) resultSummaryText = checkDef.failText;
        }
      }
    }

    // 4. Execute Effects
    const effectResults = this.effectExecutor.executeBatch(effectsToExecute, {
      state,
      contentRegistry,
      logJournal,
    });

    // 5. Record POI action completion
    if (!state.world.pois[poi.id]) {
      state.world.pois[poi.id] = {
        poiId: poi.id,
        status: 'Visited',
        isDiscovered: true,
        isVisited: true,
        isLocked: false,
        completedActionIds: [action.id],
        disabledActionIds: [],
        flags: {},
      };
    } else {
      if (!state.world.pois[poi.id].completedActionIds.includes(action.id)) {
        state.world.pois[poi.id].completedActionIds.push(action.id);
      }
    }

    // 6. Build pre-computed immutable ActionResolution
    const creditsDelta = (state.player.inventory?.credits ?? 0) - initialCredits;
    const gainedItems: { itemId: string; quantity: number; name?: string }[] = [];
    const lostItems: { itemId: string; quantity: number; name?: string }[] = [];

    for (const res of effectResults.results) {
      if (res.success && res.mutationSummary) {
        if (res.mutationSummary.itemId && res.mutationSummary.quantity) {
          const itemDef = contentRegistry.getItem(res.mutationSummary.itemId);
          if (res.mutationSummary.quantity > 0) {
            gainedItems.push({
              itemId: res.mutationSummary.itemId,
              quantity: res.mutationSummary.quantity,
              name: itemDef?.name ?? res.mutationSummary.itemId,
            });
          } else {
            lostItems.push({
              itemId: res.mutationSummary.itemId,
              quantity: Math.abs(res.mutationSummary.quantity),
              name: itemDef?.name ?? res.mutationSummary.itemId,
            });
          }
        }
      }
    }

    const statChanges: { stat: string; delta?: number; value?: number; label?: string }[] = [];
    if (state.player.vitals?.currentHp !== initialHp) {
      statChanges.push({ stat: 'HP', delta: state.player.vitals.currentHp - initialHp, label: 'Health' });
    }
    if (state.player.vitals?.currentEther !== initialEther) {
      statChanges.push({ stat: 'Ether', delta: state.player.vitals.currentEther - initialEther, label: 'Ether Pool' });
    }
    if (state.player.vitals?.actionPointsCurrent !== initialAp) {
      statChanges.push({ stat: 'AP', delta: state.player.vitals.actionPointsCurrent - initialAp, label: 'Action Points' });
    }

    const resolution: ActionResolution = {
      actionId: action.id,
      actionLabel: action.label,
      title: `${action.label} - ${actionStatus === 'Success' ? 'Complete' : 'Failed'}`,
      resultText: resultSummaryText,
      status: actionStatus,
      costsSpent: action.cost,
      gainedItems,
      lostItems,
      creditsDelta,
      xpGained: 0,
      statChanges,
      relationshipChanges: [],
      factionRepChanges: [],
      statusEffectsGained: [],
      statusEffectsRemoved: [],
      flagsChanged: {},
      discoveredIntel: [],
      nextOutcome: resolvedOutcome,
    };

    // 7. Resolve final outcome & navigation context
    const originContext: OriginContext = {
      type: 'poi',
      id: poi.id,
      mapId: state.world.currentMapId,
    };

    // Determine appropriate outcome if not explicitly set
    if (!resolvedOutcome) {
      if (action.dialogueTreeId) {
        resolvedOutcome = {
          type: 'gameplayScreen',
          screen: 'Dialogue',
          targetId: action.dialogueTreeId,
          originContext,
        };
      } else if (action.eventId) {
        resolvedOutcome = {
          type: 'event',
          eventId: action.eventId,
          originContext,
        };
      } else if (action.targetMapId) {
        resolvedOutcome = {
          type: 'map',
          mapId: action.targetMapId,
        };
      } else if (action.targetPoiId) {
        resolvedOutcome = {
          type: 'poi',
          poiId: action.targetPoiId,
        };
      } else {
        // Standard interactive action (search, hack, investigate, heal, etc.) -> Show result popup!
        resolvedOutcome = {
          type: 'showResult',
          title: resolution.title,
          resultText: resolution.resultText,
          status: resolution.status,
          nextOutcome: { type: 'returnToOrigin' },
        };
      }
    }

    // Set origin context in world state
    state.world.activeOriginContext = originContext;
    this.outcomeEngine.setActiveActionResolution(resolution);

    // Apply the resolved outcome
    this.outcomeEngine.resolveOutcome(resolvedOutcome, state, contentRegistry);

    return {
      success: actionStatus === 'Success',
      actionId: action.id,
      actionLabel: action.label,
      resolution,
      effectResults,
      statCheckResult,
      nextOutcome: resolvedOutcome,
    };
  }
}

export const defaultPoiActionPipeline = new PoiActionPipeline();
