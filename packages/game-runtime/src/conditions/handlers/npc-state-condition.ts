import { NpcStateCondition } from '@neon-ether/game-schema';
import { ConditionContext } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

export const handleNpcStateCondition: ConditionHandler<NpcStateCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  const npc = context.state.npcs?.[condition.npcId];

  if (!npc) {
    return {
      isMet: false,
      type: 'npcState',
      actual: null,
      expected: condition,
      reason: `NPC '${condition.npcId}' not found in runtime state`,
    };
  }

  // 1. Alive check
  if (condition.isAlive !== undefined) {
    const isAlive = npc.isAlive && (npc.currentHp ?? 1) > 0;
    if (isAlive !== condition.isAlive) {
      return {
        isMet: false,
        type: 'npcState',
        actual: { isAlive },
        expected: { isAlive: condition.isAlive },
        reason: `NPC '${condition.npcId}' alive status mismatch (Actual: ${isAlive}, Expected: ${condition.isAlive})`,
      };
    }
  }

  // 2. Merchant check
  if (condition.isMerchant !== undefined && npc.isMerchant !== condition.isMerchant) {
    return {
      isMet: false,
      type: 'npcState',
      actual: { isMerchant: npc.isMerchant },
      expected: { isMerchant: condition.isMerchant },
      reason: `NPC '${condition.npcId}' merchant status mismatch`,
    };
  }

  // 3. Companion check
  if (condition.isCompanion !== undefined) {
    const isCompanion = npc.isCompanion || (context.state.companions?.includes(condition.npcId) ?? false);
    if (isCompanion !== condition.isCompanion) {
      return {
        isMet: false,
        type: 'npcState',
        actual: { isCompanion },
        expected: { isCompanion: condition.isCompanion },
        reason: `NPC '${condition.npcId}' companion status mismatch`,
      };
    }
  }

  // 4. Behavior check
  if (condition.behavior !== undefined && npc.behaviorOverride !== condition.behavior) {
    return {
      isMet: false,
      type: 'npcState',
      actual: { behavior: npc.behaviorOverride },
      expected: { behavior: condition.behavior },
      reason: `NPC '${condition.npcId}' behavior mismatch (Actual: ${npc.behaviorOverride}, Expected: ${condition.behavior})`,
    };
  }

  // 5. Custom state flag check
  if (condition.flagKey !== undefined) {
    const flagKey = `npc_${condition.npcId}_${condition.flagKey}`;
    const actualFlag = npc.flags?.[condition.flagKey] ?? context.state.world?.flags?.[flagKey];
    if (condition.flagValue !== undefined && actualFlag !== condition.flagValue) {
      return {
        isMet: false,
        type: 'npcState',
        actual: { [condition.flagKey]: actualFlag },
        expected: { [condition.flagKey]: condition.flagValue },
        reason: `NPC '${condition.npcId}' flag '${condition.flagKey}' mismatch`,
      };
    }
  }

  return {
    isMet: true,
    type: 'npcState',
    actual: npc,
    reason: `NPC '${condition.npcId}' matches state conditions`,
  };
};
