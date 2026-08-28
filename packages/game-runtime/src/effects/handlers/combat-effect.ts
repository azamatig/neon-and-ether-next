import { StartCombatEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleStartCombatEffect: EffectHandler<StartCombatEffect> = (effect, context) => {
  const enemyIds = effect.enemyIds ?? [];

  context.state.world.mode = 'TacticalCombat';
  context.state.combat = {
    isActive: true,
    roundNumber: 1,
    turnOrder: [context.state.player.characterId, ...enemyIds],
    activeTurnIndex: 0,
    units: {
      [context.state.player.characterId]: {
        characterId: context.state.player.characterId,
        initiativeScore: context.state.player.vitals?.initiative ?? 10,
        remainingAp: context.state.player.vitals?.actionPointsMax ?? 6,
        remainingEther: context.state.player.vitals?.currentEther ?? 20,
        hasMovedThisTurn: false,
        hasActedThisTurn: false,
      },
    },
  };

  for (const enemyId of enemyIds) {
    const enemy = context.contentRegistry?.getEnemy(enemyId);
    context.state.combat.units[enemyId] = {
      characterId: enemyId,
      initiativeScore: enemy?.vitals?.initiative ?? 8,
      remainingAp: enemy?.vitals?.actionPointsMax ?? 4,
      remainingEther: enemy?.vitals?.currentEther ?? 0,
      hasMovedThisTurn: false,
      hasActedThisTurn: false,
    };
  }

  if (context.logJournal) {
    context.logJournal('Combat', `Combat initiated! ${enemyIds.length} hostile units engaged.`, {
      enemyIds,
    });
  }

  if (context.emitEvent) {
    context.emitEvent('COMBAT_INITIATED', { enemyIds });
  }

  return {
    success: true,
    type: 'startCombat',
    message: `Combat started with ${enemyIds.length} enemies`,
    mutationSummary: {
      mode: 'TacticalCombat',
      enemyIds,
    },
  };
};
