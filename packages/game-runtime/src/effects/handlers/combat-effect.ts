import { StartCombatEffect } from '@neon-ether/game-schema';
import { TurnBasedCombatEngine } from '../../combat/turn-based-combat-engine.ts';
import { EffectHandler } from '../effect-handler.ts';

export const handleStartCombatEffect: EffectHandler<StartCombatEffect> = (effect, context) => {
  if (!effect.encounterId || !context.contentRegistry) {
    return {
      success: false,
      type: 'startCombat',
      message: 'A registered encounterId is required to start data-driven combat.',
    };
  }
  const combat = new TurnBasedCombatEngine(context.contentRegistry).createEncounter(effect.encounterId, context.state);
  if (!combat) return { success: false, type: 'startCombat', message: `Encounter '${effect.encounterId}' was not found.` };
  context.state.world.activeEncounterId = effect.encounterId;
  context.state.world.mode = 'TacticalCombat';
  context.state.combat = combat;
  context.logJournal?.('Combat', `Combat initiated: ${effect.encounterId}.`, { encounterId: effect.encounterId });
  context.emitEvent?.('COMBAT_INITIATED', { encounterId: effect.encounterId });
  return { success: true, type: 'startCombat', message: `Combat started: ${effect.encounterId}`, mutationSummary: { encounterId: effect.encounterId } };
};
