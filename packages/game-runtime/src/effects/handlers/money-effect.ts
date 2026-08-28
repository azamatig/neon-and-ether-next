import { ChangeMoneyEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleChangeMoneyEffect: EffectHandler<ChangeMoneyEffect> = (effect, context) => {
  const currentCredits = context.state.player.inventory.credits ?? 0;
  let newCredits = currentCredits;

  if (effect.mode === 'set') {
    newCredits = Math.max(0, effect.amount);
  } else if (effect.mode === 'subtract') {
    newCredits = Math.max(0, currentCredits - Math.abs(effect.amount));
  } else {
    // 'add'
    newCredits = Math.max(0, currentCredits + effect.amount);
  }

  context.state.player.inventory.credits = newCredits;
  const delta = newCredits - currentCredits;

  if (context.logJournal) {
    const deltaLabel = delta >= 0 ? `+${delta}` : `${delta}`;
    context.logJournal('System', `Credits updated: ${currentCredits} -> ${newCredits} (${deltaLabel} ¢)`);
  }

  return {
    success: true,
    type: 'changeMoney',
    message: `Credits updated: ${currentCredits} -> ${newCredits} (${delta >= 0 ? '+' : ''}${delta})`,
    mutationSummary: {
      previousCredits: currentCredits,
      newCredits,
      delta,
    },
  };
};
