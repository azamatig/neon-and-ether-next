import { SetFlagEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';
import { createInitialWorldState } from '../../state/game-state.ts';

export const handleSetFlagEffect: EffectHandler<SetFlagEffect> = (effect, context) => {
  if (!context.state.world) {
    context.state.world = createInitialWorldState();
  }

  const previousValue = context.state.world.flags[effect.flag];
  context.state.world.flags[effect.flag] = effect.value;

  if (context.logJournal) {
    context.logJournal('System', `State flag '${effect.flag}' set to ${JSON.stringify(effect.value)}`, {
      flag: effect.flag,
      previousValue,
      newValue: effect.value,
    });
  }

  return {
    success: true,
    type: 'setFlag',
    message: `Flag '${effect.flag}' updated: ${JSON.stringify(previousValue)} -> ${JSON.stringify(effect.value)}`,
    mutationSummary: {
      flag: effect.flag,
      previousValue,
      newValue: effect.value,
    },
  };
};
