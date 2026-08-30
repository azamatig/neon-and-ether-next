/**
 * @neon-ether/game-runtime
 * Extensible Condition Handler Registry.
 */

import { Condition } from '@neon-ether/game-schema';
import { ConditionHandler } from './condition-handler.ts';
import { handleFlagCondition } from './handlers/flag-condition.ts';
import { handlePlayerStatCondition } from './handlers/player-stat-condition.ts';
import { handleHasItemCondition } from './handlers/has-item-condition.ts';
import { handleQuestStateCondition } from './handlers/quest-state-condition.ts';
import { handleNpcStateCondition } from './handlers/npc-state-condition.ts';
import { handleRelationshipCondition } from './handlers/relationship-condition.ts';
import { handleFactionReputationCondition } from './handlers/faction-reputation-condition.ts';
import { handleCompanionPresentCondition } from './handlers/companion-present-condition.ts';
import { handleBaseRoomExistsCondition } from './handlers/base-room-exists-condition.ts';
import { handleRandomChanceCondition } from './handlers/random-chance-condition.ts';
import { handleAndCondition, handleOrCondition, handleNotCondition } from './handlers/combinator-conditions.ts';
import type { RuntimeTraceSink } from '../observability/runtime-trace.ts';
import { handleTimeCondition } from './handlers/time-condition.ts';

export class ConditionRegistry {
  private handlers = new Map<string, ConditionHandler<any>>();

  constructor(registerDefaults: boolean = true, private trace?: RuntimeTraceSink) {
    if (registerDefaults) {
      this.registerDefaultHandlers();
    }
  }

  public report(type: string, isMet: boolean, reason?: string): void {
    this.trace?.({ kind: 'ConditionChecked', message: `${type}: ${isMet ? 'passed' : 'failed'}`, details: { type, isMet, reason } });
  }

  private registerDefaultHandlers(): void {
    // 10 Universal RPG Condition Handlers
    this.registerHandler('flag', handleFlagCondition);
    this.registerHandler('playerStat', handlePlayerStatCondition);
    this.registerHandler('hasItem', handleHasItemCondition);
    this.registerHandler('questState', handleQuestStateCondition);
    this.registerHandler('npcState', handleNpcStateCondition);
    this.registerHandler('relationship', handleRelationshipCondition);
    this.registerHandler('factionReputation', handleFactionReputationCondition);
    this.registerHandler('companionPresent', handleCompanionPresentCondition);
    this.registerHandler('baseRoomExists', handleBaseRoomExistsCondition);
    this.registerHandler('randomChance', handleRandomChanceCondition);
    this.registerHandler('time', handleTimeCondition);

    // Combinators
    this.registerHandler('and', handleAndCondition);
    this.registerHandler('or', handleOrCondition);
    this.registerHandler('not', handleNotCondition);
  }

  /**
   * Registers or overrides a handler for a specific condition type.
   */
  public registerHandler<T extends Condition = Condition>(
    type: string,
    handler: ConditionHandler<T>
  ): void {
    this.handlers.set(type, handler);
  }

  public getHandler(type: string): ConditionHandler<any> | undefined {
    return this.handlers.get(type);
  }

  public hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }

  public getAllRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/** Global default shared singleton instance */
export const defaultConditionRegistry = new ConditionRegistry(true);
