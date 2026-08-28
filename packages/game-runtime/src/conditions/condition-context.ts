/**
 * @neon-ether/game-runtime
 * Condition Context and Comparison Evaluation Helpers.
 */

import { ComparisonOperator } from '@neon-ether/game-schema';
import { GameState } from '../state/game-state.ts';
import { ContentRegistry } from '../content/content-registry.ts';

export interface ConditionContext {
  readonly state: GameState;
  readonly contentRegistry?: ContentRegistry;
  readonly rollRandom?: (min: number, max: number) => number;
  readonly customVariables?: Record<string, any>;
}

/**
 * Pure evaluation of comparison operators against values.
 */
export function evaluateComparison(
  actual: any,
  operator: ComparisonOperator,
  expected: any
): boolean {
  switch (operator) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '>':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case '>=':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case '<':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case '<=':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    default:
      return actual === expected;
  }
}
