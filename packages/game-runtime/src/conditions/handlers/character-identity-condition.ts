import type { CharacterIdentityCondition } from '@neon-ether/game-schema';
import type { ConditionHandler } from '../condition-handler.ts';

const compare=(actual:number,operator:string,expected:number)=>operator==='=='?actual===expected:operator==='!='?actual!==expected:operator==='>'?actual>expected:operator==='>='?actual>=expected:operator==='<'?actual<expected:actual<=expected;

export const handleCharacterIdentityCondition:ConditionHandler<CharacterIdentityCondition>=(condition,context)=>{
  const player=context.state.player;
  let isMet=false,actual:unknown;
  if(condition.type==='classIs'){actual=player.classId;isMet=actual===condition.classId;}
  else if(condition.type==='backgroundIs'){actual=player.backgroundId;isMet=actual===condition.backgroundId;}
  else if(condition.type==='hasPerk'){actual=player.perks;isMet=player.perks.includes(condition.perkId);}
  else if(condition.type==='hasAbility'){actual=player.abilityIds;isMet=player.abilityIds.includes(condition.abilityId);}
  else {const skill=player.skills[condition.skillId]??0;actual=skill;isMet=compare(skill,condition.operator,condition.value);}
  return{isMet,type:condition.type,actual,expected:condition.type==='classIs'?condition.classId:condition.type==='backgroundIs'?condition.backgroundId:condition.type==='hasPerk'?condition.perkId:condition.type==='hasAbility'?condition.abilityId:condition.value,reason:isMet?undefined:'Character identity requirement is not met.'};
};
