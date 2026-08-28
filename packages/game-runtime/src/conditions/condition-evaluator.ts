/**
 * @neon-ether/game-runtime
 * Pure Condition Evaluator.
 */

import { Condition } from '@neon-ether/game-schema';
import { ConditionContext } from './condition-context.ts';
import { ConditionEvaluationResult } from './condition-handler.ts';
import { ConditionRegistry, defaultConditionRegistry } from './condition-registry.ts';

export interface BatchConditionResult {
  allMet: boolean;
  results: ConditionEvaluationResult[];
  failedConditions: ConditionEvaluationResult[];
  explanation: string[];
}

/**
 * Purely evaluates a single condition against the GameState context.
 */
export function evaluateCondition(
  condition: Condition,
  context: ConditionContext,
  registry: ConditionRegistry = defaultConditionRegistry
): ConditionEvaluationResult {
  if (!condition || !condition.type) {
    return {
      isMet: false,
      type: 'unknown',
      reason: 'Condition is undefined or missing type',
    };
  }

  const handler = registry.getHandler(condition.type);
  if (!handler) {
    return {
      isMet: false,
      type: condition.type,
      reason: `No registered condition handler for type '${condition.type}'`,
    };
  }

  const rawResult = handler(condition, context, (innerCond, innerCtx) =>
    evaluateCondition(innerCond, innerCtx, registry)
  );

  if (typeof rawResult === 'boolean') {
    return {
      isMet: rawResult,
      type: condition.type,
      reason: rawResult ? `Condition '${condition.type}' passed` : `Condition '${condition.type}' failed`,
    };
  }

  return rawResult;
}

/**
 * Purely evaluates a list of conditions (implicit AND).
 */
export function evaluateConditions(
  conditions: Condition[],
  context: ConditionContext,
  registry: ConditionRegistry = defaultConditionRegistry
): BatchConditionResult {
  if (!conditions || conditions.length === 0) {
    return {
      allMet: true,
      results: [],
      failedConditions: [],
      explanation: ['No conditions specified; implicitly satisfied.'],
    };
  }

  const results: ConditionEvaluationResult[] = [];
  const failedConditions: ConditionEvaluationResult[] = [];
  const explanation: string[] = [];

  for (const cond of conditions) {
    const result = evaluateCondition(cond, context, registry);
    results.push(result);
    if (!result.isMet) {
      failedConditions.push(result);
    }
    if (result.reason) {
      explanation.push(result.reason);
    }
  }

  return {
    allMet: failedConditions.length === 0,
    results,
    failedConditions,
    explanation,
  };
}
