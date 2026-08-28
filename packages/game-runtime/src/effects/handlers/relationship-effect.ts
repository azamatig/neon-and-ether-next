import { ChangeRelationshipEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleChangeRelationshipEffect: EffectHandler<ChangeRelationshipEffect> = (effect, context) => {
  if (!context.state.npcs) {
    context.state.npcs = {};
  }

  if (!context.state.npcs[effect.npcId]) {
    context.state.npcs[effect.npcId] = {
      npcId: effect.npcId,
      mapId: context.state.world.currentMapId,
      isAlive: true,
      currentHp: 25,
      position: { x: 0, y: 0 },
      facing: 'South',
      isHostile: false,
      isMerchant: false,
      isCompanion: false,
      relationship: 0,
      flags: {},
    };
  }

  const npcState = context.state.npcs[effect.npcId];
  const previousVal = npcState.relationship ?? 0;
  const newVal = Math.max(-100, Math.min(100, previousVal + effect.delta));
  npcState.relationship = newVal;

  const npcName = context.contentRegistry?.getCharacter(effect.npcId)?.name ?? effect.npcId;

  if (context.logJournal) {
    const deltaStr = effect.delta >= 0 ? `+${effect.delta}` : `${effect.delta}`;
    context.logJournal('World', `Relationship with ${npcName} changed: ${previousVal} -> ${newVal} (${deltaStr})`);
  }

  return {
    success: true,
    type: 'changeRelationship',
    message: `Relationship with '${npcName}' updated: ${previousVal} -> ${newVal}`,
    mutationSummary: {
      npcId: effect.npcId,
      previousRelationship: previousVal,
      newRelationship: newVal,
      delta: effect.delta,
    },
  };
};
