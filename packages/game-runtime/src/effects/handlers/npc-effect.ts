import { ChangeNpcStateEffect, RecruitNpcEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleChangeNpcStateEffect: EffectHandler<ChangeNpcStateEffect> = (effect, context) => {
  const npc = context.state.npcs?.[effect.npcId];

  if (!npc) {
    return {
      success: false,
      type: 'changeNpcState',
      message: `NPC '${effect.npcId}' not found in runtime state`,
      error: 'NPC_NOT_FOUND',
    };
  }

  if (effect.isAlive !== undefined) {
    npc.isAlive = effect.isAlive;
    if (!effect.isAlive) {
      npc.currentHp = 0;
    } else if (npc.currentHp <= 0) {
      npc.currentHp = npc.maxHp ?? 25;
    }
  }

  if (effect.behavior !== undefined) {
    npc.behaviorOverride = effect.behavior;
  }

  if (effect.dialogueTreeId !== undefined) {
    npc.dialogueTreeIdOverride = effect.dialogueTreeId;
  }

  if (effect.isMerchant !== undefined) {
    npc.isMerchant = effect.isMerchant;
  }

  if (effect.isCompanion !== undefined) {
    npc.isCompanion = effect.isCompanion;
  }

  if (effect.location) {
    if (effect.location.mapId) {
      npc.mapId = effect.location.mapId;
    }
    if (effect.location.position) {
      npc.position = { ...effect.location.position };
    }
  }

  if (effect.customFlag) {
    if (!npc.flags) npc.flags = {};
    npc.flags[effect.customFlag.key] = effect.customFlag.value;
  }

  const npcName = context.contentRegistry?.getCharacter(effect.npcId)?.name ?? effect.npcId;

  if (context.logJournal) {
    context.logJournal('World', `NPC state updated: ${npcName}`, {
      npcId: effect.npcId,
      mutations: effect,
    });
  }

  return {
    success: true,
    type: 'changeNpcState',
    message: `NPC '${npcName}' state successfully updated`,
    mutationSummary: {
      npcId: effect.npcId,
      npcState: npc,
    },
  };
};

export const handleRecruitNpcEffect: EffectHandler<RecruitNpcEffect> = (effect, context) => {
  const npc = context.state.npcs?.[effect.npcId];

  if (!context.state.companions) {
    context.state.companions = [];
  }

  const asCompanion = effect.asCompanion !== false;
  if (asCompanion && !context.state.companions.includes(effect.npcId)) {
    context.state.companions.push(effect.npcId);
  } else if (!asCompanion) {
    context.state.companions = context.state.companions.filter((id) => id !== effect.npcId);
  }

  if (npc) {
    npc.isCompanion = asCompanion;
  }

  const npcName = context.contentRegistry?.getCharacter(effect.npcId)?.name ?? effect.npcId;

  if (context.logJournal) {
    context.logJournal('World', asCompanion ? `Recruited ${npcName} into the party.` : `Dismissed ${npcName} from the party.`);
  }

  return {
    success: true,
    type: 'recruitNpc',
    message: asCompanion ? `Recruited '${npcName}' as companion` : `Dismissed '${npcName}' as companion`,
    mutationSummary: {
      companionId: effect.npcId,
      companions: context.state.companions,
    },
  };
};
