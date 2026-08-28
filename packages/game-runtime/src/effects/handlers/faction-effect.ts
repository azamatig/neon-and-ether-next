import { ChangeFactionReputationEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleChangeFactionReputationEffect: EffectHandler<ChangeFactionReputationEffect> = (effect, context) => {
  if (!context.state.factions) {
    context.state.factions = {};
  }

  if (!context.state.factions[effect.factionId]) {
    context.state.factions[effect.factionId] = {
      factionId: effect.factionId,
      reputation: 0,
      standing: 'Neutral',
      tier: 1,
      isDiscovered: true,
      flags: {},
    };
  }

  const factionState = context.state.factions[effect.factionId];
  const previousVal = factionState.reputation;
  const newVal = Math.max(-100, Math.min(100, previousVal + effect.delta));
  factionState.reputation = newVal;

  if (newVal >= 50) factionState.standing = 'Honored';
  else if (newVal >= 20) factionState.standing = 'Friendly';
  else if (newVal <= -50) factionState.standing = 'Hostile';
  else if (newVal <= -20) factionState.standing = 'Unfriendly';
  else factionState.standing = 'Neutral';

  const factionName = context.contentRegistry?.getFaction(effect.factionId)?.name ?? effect.factionId;

  if (context.logJournal) {
    const deltaStr = effect.delta >= 0 ? `+${effect.delta}` : `${effect.delta}`;
    context.logJournal('World', `Reputation with [${factionName}] shifted: ${previousVal} -> ${newVal} (${deltaStr})`);
  }

  return {
    success: true,
    type: 'changeFactionReputation',
    message: `Faction '${factionName}' reputation updated: ${previousVal} -> ${newVal}`,
    mutationSummary: {
      factionId: effect.factionId,
      previousReputation: previousVal,
      newReputation: newVal,
      delta: effect.delta,
    },
  };
};
