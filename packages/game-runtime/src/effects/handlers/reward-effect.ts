import type { GrantRewardsEffect } from '@neon-ether/game-schema';
import { ProgressionSystem } from '../../progression/progression-system.ts';
import type { EffectHandler } from '../effect-handler.ts';

export const handleGrantRewardsEffect: EffectHandler<GrantRewardsEffect> = (effect, context) => {
  if (!context.contentRegistry) return { success:false, type:'grantRewards', message:'Content registry is required.', error:'CONTENT_REQUIRED' };
  const result = new ProgressionSystem(context.contentRegistry).grant(context.state, effect);
  context.logJournal?.('System', `Rewards granted: ${effect.xp} XP, ${effect.credits} credits.`, { reward:effect, result });
  return { success:result.success, type:'grantRewards', message:result.success?'Rewards granted.':result.reason ?? 'Reward failed.', mutationSummary:result, error:result.success?undefined:'REWARD_FAILED' };
};
