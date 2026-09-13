import type { SetSpecialPathUnlockedEffect } from '@neon-ether/game-schema';
import type { EffectHandler } from '../effect-handler.ts';

export const handleSetSpecialPathUnlocked: EffectHandler<SetSpecialPathUnlockedEffect> = (effect, context) => {
  if (!context.contentRegistry?.specialPaths.has(effect.specialPathId)) return { success:false, type:effect.type, message:`Special path '${effect.specialPathId}' was not found.`, error:'SPECIAL_PATH_NOT_FOUND' };
  const paths = context.state.player.specialPathIds;
  if (effect.unlocked && !paths.includes(effect.specialPathId)) paths.push(effect.specialPathId);
  if (!effect.unlocked) context.state.player.specialPathIds = paths.filter((id) => id !== effect.specialPathId);
  return { success:true, type:effect.type, message:`Special path '${effect.specialPathId}' ${effect.unlocked ? 'unlocked' : 'revoked'}.`, mutationSummary:{ specialPathId:effect.specialPathId, unlocked:effect.unlocked } };
};
