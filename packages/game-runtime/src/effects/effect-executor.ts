/**
 * @neon-ether/game-runtime
 * Unified Effect Executor.
 */

import { Effect } from '@neon-ether/game-schema';
import { EffectExecutionContext } from './effect-context.ts';
import { EffectExecutionResult } from './effect-handler.ts';
import { defaultEffectRegistry, EffectRegistry } from './effect-registry.ts';
import type { RuntimeTraceSink } from '../observability/runtime-trace.ts';

export interface BatchEffectExecutionResult {
  success: boolean;
  totalExecuted: number;
  results: EffectExecutionResult[];
  failedResults: EffectExecutionResult[];
  summary: string[];
}

export class EffectExecutor {
  private registry: EffectRegistry;

  constructor(registry: EffectRegistry = defaultEffectRegistry, private trace?: RuntimeTraceSink) {
    this.registry = registry;
  }

  public getRegistry(): EffectRegistry {
    return this.registry;
  }

  /**
   * Executes a single Effect against the GameState context.
   */
  public execute(
    effect: Effect,
    context: EffectExecutionContext
  ): EffectExecutionResult {
    const finish = (result: EffectExecutionResult): EffectExecutionResult => {
      this.trace?.({ kind: 'EffectExecuted', message: `${result.type}: ${result.success ? 'executed' : 'failed'}`, details: { ...result } });
      return result;
    };
    if (!effect || !effect.type) {
      return finish({
        success: false,
        type: 'unknown',
        message: 'Invalid effect definition: missing effect.type',
        error: 'INVALID_EFFECT',
      });
    }

    const handler = this.registry.getHandler(effect.type);
    if (!handler) {
      return finish({
        success: false,
        type: effect.type,
        message: `No registered effect handler for type '${effect.type}'`,
        error: 'HANDLER_NOT_FOUND',
      });
    }

    try {
      this.trace?.({kind:'EffectStarted',message:`Effect started: ${effect.type}`,details:{effect}});
      return finish(handler(effect, context));
    } catch (err: any) {
      return finish({
        success: false,
        type: effect.type,
        message: `Unhandled exception executing effect '${effect.type}': ${err?.message ?? String(err)}`,
        error: 'EXECUTION_EXCEPTION',
      });
    }
  }

  /**
   * Executes a list of effects sequentially.
   */
  public executeBatch(
    effects: Effect[],
    context: EffectExecutionContext
  ): BatchEffectExecutionResult {
    if (!effects || effects.length === 0) {
      return {
        success: true,
        totalExecuted: 0,
        results: [],
        failedResults: [],
        summary: ['No effects to execute'],
      };
    }

    const results: EffectExecutionResult[] = [];
    const failedResults: EffectExecutionResult[] = [];
    const summary: string[] = [];

    for (const effect of effects) {
      const res = this.execute(effect, context);
      results.push(res);
      if (!res.success) {
        failedResults.push(res);
      }
      summary.push(res.message);
    }

    return {
      success: failedResults.length === 0,
      totalExecuted: results.length,
      results,
      failedResults,
      summary,
    };
  }
}

/** Global default shared singleton instance */
export const defaultEffectExecutor = new EffectExecutor(defaultEffectRegistry);
