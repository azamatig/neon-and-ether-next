/**
 * @neon-ether/game-runtime
 * Unified Action Executor combining Conditions, Costs, and Effects.
 */

import { ActionCost, ActionDefinition } from '@neon-ether/game-schema';
import { GameState } from '../state/game-state.ts';
import { ContentRegistry } from '../content/content-registry.ts';
import { BatchConditionResult, evaluateConditions } from '../conditions/condition-evaluator.ts';
import { ConditionRegistry, defaultConditionRegistry } from '../conditions/condition-registry.ts';
import { BatchEffectExecutionResult, EffectExecutor, defaultEffectExecutor } from '../effects/effect-executor.ts';
import { EffectExecutionContext } from '../effects/effect-context.ts';
import { DiceRoller, type RandomSource } from '@neon-ether/engine';

export interface ActionExecutionResult {
  success: boolean;
  actionId: string;
  actionName: string;
  reason?: string;
  conditionResults: BatchConditionResult;
  effectResults?: BatchEffectExecutionResult;
  costPaid?: ActionCost;
}

export class ActionExecutor {
  private conditionRegistry: ConditionRegistry;
  private effectExecutor: EffectExecutor;
  private random:RandomSource;

  constructor(
    conditionRegistry: ConditionRegistry = defaultConditionRegistry,
    effectExecutor: EffectExecutor = defaultEffectExecutor,
    random:RandomSource=new DiceRoller(1337),
  ) {
    this.conditionRegistry = conditionRegistry;
    this.effectExecutor = effectExecutor;
    this.random=random;
  }

  /**
   * Evaluates whether an action can be currently performed.
   */
  public canExecute(
    action: ActionDefinition,
    state: GameState,
    contentRegistry?: ContentRegistry
  ): { canExecute: boolean; reason?: string; conditionResults: BatchConditionResult } {
    // 1. Evaluate prerequisites/conditions
    const conditionResults = evaluateConditions(
      action.conditions ?? [],
      { state, contentRegistry, rollRandom:(min,max)=>this.random.integer(min,max) },
      this.conditionRegistry
    );

    if (!conditionResults.allMet) {
      const failed = conditionResults.failedConditions.map((f) => f.reason).join('; ');
      return {
        canExecute: false,
        reason: `Conditions not met: ${failed}`,
        conditionResults,
      };
    }

    // 2. Validate costs
    if (action.cost) {
      if (action.cost.ap && (state.player.vitals?.actionPointsCurrent ?? 0) < action.cost.ap) {
        return {
          canExecute: false,
          reason: `Insufficient Action Points (Required: ${action.cost.ap}, Available: ${state.player.vitals?.actionPointsCurrent ?? 0})`,
          conditionResults,
        };
      }
      if (action.cost.ether && (state.player.vitals?.currentEther ?? 0) < action.cost.ether) {
        return {
          canExecute: false,
          reason: `Insufficient Ether (Required: ${action.cost.ether}, Available: ${state.player.vitals?.currentEther ?? 0})`,
          conditionResults,
        };
      }
      if (action.cost.credits && (state.player.inventory?.credits ?? 0) < action.cost.credits) {
        return {
          canExecute: false,
          reason: `Insufficient Credits (Required: ${action.cost.credits} ¢, Available: ${state.player.inventory?.credits ?? 0} ¢)`,
          conditionResults,
        };
      }
      if (action.cost.hp && (state.player.vitals?.currentHp ?? 0) <= action.cost.hp) {
        return {
          canExecute: false,
          reason: `Insufficient HP to sacrifice (Cost: ${action.cost.hp}, Current HP: ${state.player.vitals?.currentHp ?? 0})`,
          conditionResults,
        };
      }
    }

    return {
      canExecute: true,
      conditionResults,
    };
  }

  /**
   * Executes an action: checks conditions, deducts costs, and executes effects.
   */
  public execute(
    action: ActionDefinition,
    context: EffectExecutionContext
  ): ActionExecutionResult {
    const check = this.canExecute(action, context.state, context.contentRegistry);

    if (!check.canExecute) {
      if (context.logJournal) {
        context.logJournal('System', `Action [${action.name}] failed: ${check.reason}`);
      }
      return {
        success: false,
        actionId: action.id,
        actionName: action.name,
        reason: check.reason,
        conditionResults: check.conditionResults,
      };
    }

    // Deduct costs
    if (action.cost) {
      if (action.cost.ap && context.state.player.vitals) {
        context.state.player.vitals.actionPointsCurrent -= action.cost.ap;
      }
      if (action.cost.ether && context.state.player.vitals) {
        context.state.player.vitals.currentEther -= action.cost.ether;
      }
      if (action.cost.credits && context.state.player.inventory) {
        context.state.player.inventory.credits = Math.max(0, (context.state.player.inventory.credits ?? 0) - action.cost.credits);
      }
      if (action.cost.hp && context.state.player.vitals) {
        context.state.player.vitals.currentHp -= action.cost.hp;
      }
    }

    // Execute effects batch
    const effectResults = this.effectExecutor.executeBatch(action.effects, context);

    if (context.logJournal) {
      context.logJournal('System', `Action executed: [${action.name}] (${effectResults.totalExecuted} effects applied)`);
    }

    if (context.emitEvent) {
      context.emitEvent('ACTION_EXECUTED', { actionId: action.id, actionName: action.name, effectResults });
    }

    return {
      success: effectResults.success,
      actionId: action.id,
      actionName: action.name,
      conditionResults: check.conditionResults,
      effectResults,
      costPaid: action.cost,
    };
  }
}

/** Global default shared singleton instance */
export const defaultActionExecutor = new ActionExecutor(defaultConditionRegistry, defaultEffectExecutor);
