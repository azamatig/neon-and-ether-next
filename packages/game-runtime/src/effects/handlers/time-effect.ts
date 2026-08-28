import { AdvanceTimeEffect, TimeOfDay } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

function calculateTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return 'Dawn';
  if (hour >= 8 && hour < 18) return 'Day';
  if (hour >= 18 && hour < 21) return 'Dusk';
  return 'Night';
}

export const handleAdvanceTimeEffect: EffectHandler<AdvanceTimeEffect> = (effect, context) => {
  if (!context.state.time) {
    context.state.time = {
      turnCount: 0,
      day: 1,
      hour: 9,
      minute: 0,
      timeOfDay: 'Day',
      elapsedRealSeconds: 0,
    };
  }

  const previousTurns = context.state.time.turnCount;
  const turnsToAdd = effect.turns ?? 1;
  const hoursToAdd = effect.hours ?? 0;

  context.state.time.turnCount += turnsToAdd;

  if (hoursToAdd > 0) {
    context.state.time.hour += hoursToAdd;
    while (context.state.time.hour >= 24) {
      context.state.time.hour -= 24;
      context.state.time.day += 1;
    }
    context.state.time.timeOfDay = calculateTimeOfDay(context.state.time.hour);
  }

  if (context.logJournal) {
    context.logJournal('World', `Time advanced by ${turnsToAdd} turn(s)${hoursToAdd ? `, ${hoursToAdd}h` : ''} [Day ${context.state.time.day}, ${context.state.time.hour}:00 - ${context.state.time.timeOfDay}].`);
  }

  return {
    success: true,
    type: 'advanceTime',
    message: `Time advanced: +${turnsToAdd} turns (Total: ${context.state.time.turnCount})`,
    mutationSummary: {
      previousTurns,
      currentTurns: context.state.time.turnCount,
      hour: context.state.time.hour,
      day: context.state.time.day,
      timeOfDay: context.state.time.timeOfDay,
    },
  };
};
