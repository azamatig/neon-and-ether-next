import type {SetAbilityUnlockedEffect} from '@neon-ether/game-schema';
import type {EffectHandler} from '../effect-handler.ts';

export const handleSetAbilityUnlocked:EffectHandler<SetAbilityUnlockedEffect>=(effect,context)=>{
  if(effect.targetCharacterId&&effect.targetCharacterId!==context.state.player.characterId)return{success:false,type:effect.type,message:'Persistent NPC ability unlocks are not supported by the current runtime state.',error:'UNSUPPORTED_TARGET'};
  if(!context.contentRegistry?.getAbility(effect.abilityId))return{success:false,type:effect.type,message:`Ability '${effect.abilityId}' was not found.`,error:'ABILITY_NOT_FOUND'};
  const abilities=context.state.player.abilityIds;
  if(effect.unlocked&&!abilities.includes(effect.abilityId))abilities.push(effect.abilityId);
  if(!effect.unlocked)context.state.player.abilityIds=abilities.filter(id=>id!==effect.abilityId);
  return{success:true,type:effect.type,message:`Ability '${effect.abilityId}' ${effect.unlocked?'unlocked':'revoked'}.`,mutationSummary:{abilityId:effect.abilityId,unlocked:effect.unlocked}};
};
