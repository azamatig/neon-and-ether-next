/**
 * @neon-ether/game-runtime
 * Condition Handler Interfaces and Result Types.
 */

import { Condition } from '@neon-ether/game-schema';
import { ConditionContext } from './condition-context.ts';

export interface ConditionEvaluationResult {
  isMet: boolean;
  type: string;
  reason?: string;
  expected?: any;
  actual?: any;
  childResults?: ConditionEvaluationResult[];
}

export type ConditionHandler<T extends Condition = Condition> = (
  condition: T,
  context: ConditionContext,
  evaluator: (cond: Condition, ctx: ConditionContext) => ConditionEvaluationResult
) => boolean | ConditionEvaluationResult;
