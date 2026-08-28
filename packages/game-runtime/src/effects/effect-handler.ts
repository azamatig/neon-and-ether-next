/**
 * @neon-ether/game-runtime
 * Effect Handler and Execution Result Types.
 */

import { Effect } from '@neon-ether/game-schema';
import { EffectExecutionContext } from './effect-context.ts';

export interface EffectExecutionResult {
  success: boolean;
  type: string;
  message: string;
  mutationSummary?: Record<string, any>;
  error?: string;
}

export type EffectHandler<T extends Effect = Effect> = (
  effect: T,
  context: EffectExecutionContext
) => EffectExecutionResult;
