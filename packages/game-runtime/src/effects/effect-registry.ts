/**
 * @neon-ether/game-runtime
 * Extensible Effect Handler Registry.
 */

import { Effect } from '@neon-ether/game-schema';
import { EffectHandler } from './effect-handler.ts';
import { handleSetFlagEffect } from './handlers/flag-effect.ts';
import { handleChangeStatEffect } from './handlers/stat-effect.ts';
import { handleAddItemEffect, handleRemoveItemEffect } from './handlers/item-effect.ts';
import { handleChangeMoneyEffect } from './handlers/money-effect.ts';
import { handleAdvanceQuestEffect, handleCompleteQuestEffect, handleStartQuestEffect } from './handlers/quest-effect.ts';
import { handleChangeNpcStateEffect, handleRecruitNpcEffect } from './handlers/npc-effect.ts';
import { handleChangeRelationshipEffect } from './handlers/relationship-effect.ts';
import { handleFactionEffect } from './handlers/faction-effect.ts';
import { handleStartCombatEffect } from './handlers/combat-effect.ts';
import { handleTriggerEventEffect } from './handlers/event-effect.ts';
import { handleMovePlayerEffect } from './handlers/player-effect.ts';
import { handleAdvanceTimeEffect } from './handlers/time-effect.ts';
import { handleChangePoiStateEffect, handleTravelPoiEffect } from './handlers/poi-effect.ts';
import { handleGrantRewardsEffect } from './handlers/reward-effect.ts';

export class EffectRegistry {
  private handlers = new Map<string, EffectHandler<any>>();

  constructor(registerDefaults: boolean = true) {
    if (registerDefaults) {
      this.registerDefaultHandlers();
    }
  }

  private registerDefaultHandlers(): void {
    // Universal RPG Effect Handlers
    this.registerHandler('setFlag', handleSetFlagEffect);
    this.registerHandler('changeStat', handleChangeStatEffect);
    this.registerHandler('addItem', handleAddItemEffect);
    this.registerHandler('removeItem', handleRemoveItemEffect);
    this.registerHandler('changeMoney', handleChangeMoneyEffect);
    this.registerHandler('startQuest', handleStartQuestEffect);
    this.registerHandler('advanceQuest', handleAdvanceQuestEffect);
    this.registerHandler('completeQuest', handleCompleteQuestEffect);
    this.registerHandler('changeNpcState', handleChangeNpcStateEffect);
    this.registerHandler('changeRelationship', handleChangeRelationshipEffect);
    for(const type of ['changeFactionReputation','setFactionReputation','changeFactionRelation','setFactionMembership','discoverFaction','setFactionHostility']) this.registerHandler(type,handleFactionEffect);
    this.registerHandler('startCombat', handleStartCombatEffect);
    this.registerHandler('triggerEvent', handleTriggerEventEffect);
    this.registerHandler('movePlayer', handleMovePlayerEffect);
    this.registerHandler('travelPoi', handleTravelPoiEffect);
    this.registerHandler('changePoiState', handleChangePoiStateEffect);
    this.registerHandler('recruitNpc', handleRecruitNpcEffect);
    this.registerHandler('advanceTime', handleAdvanceTimeEffect);
    this.registerHandler('grantRewards', handleGrantRewardsEffect);
  }

  /**
   * Registers or overrides a handler for a specific effect type.
   */
  public registerHandler<T extends Effect = Effect>(
    type: string,
    handler: EffectHandler<T>
  ): void {
    this.handlers.set(type, handler);
  }

  public getHandler(type: string): EffectHandler<any> | undefined {
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
export const defaultEffectRegistry = new EffectRegistry(true);
