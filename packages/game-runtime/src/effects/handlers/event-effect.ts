import { TriggerEventEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleTriggerEventEffect: EffectHandler<TriggerEventEffect> = (effect, context) => {
  const eventDef = context.contentRegistry?.getEvent(effect.eventId);
  const eventTitle = eventDef?.name ?? effect.eventId;

  if (context.logJournal) {
    context.logJournal('World', `Event triggered: [${eventTitle}]`, {
      eventId: effect.eventId,
      payload: effect.payload,
    });
  }

  // Set flag for event triggered in world flags
  if (!context.state.world.flags) {
    context.state.world.flags = {};
  }
  context.state.world.flags[`event_${effect.eventId}_triggered`] = true;

  if (context.emitEvent) {
    context.emitEvent('GAME_EVENT_TRIGGERED', { eventId: effect.eventId, payload: effect.payload });
  }

  return {
    success: true,
    type: 'triggerEvent',
    message: `Event '${eventTitle}' triggered`,
    mutationSummary: {
      eventId: effect.eventId,
      payload: effect.payload,
    },
  };
};
