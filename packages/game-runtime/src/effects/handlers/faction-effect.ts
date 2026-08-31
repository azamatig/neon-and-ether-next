import { ChangeFactionReputationEffect, FactionStateEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';
import { createFactionRuntime, refreshFactionRuntime } from '../../factions/faction-state.ts';

function stateFor(factionId:string,context:Parameters<EffectHandler<any>>[1]) {const definition=context.contentRegistry?.getFaction(factionId);if(!definition)return undefined;return context.state.factions[factionId]??(context.state.factions[factionId]=createFactionRuntime(definition));}

export const handleFactionEffect: EffectHandler<ChangeFactionReputationEffect|FactionStateEffect> = (effect,context) => {
  const state=stateFor(effect.factionId,context);const definition=context.contentRegistry?.getFaction(effect.factionId);
  if(!state||!definition)return{success:false,type:effect.type,message:`Faction '${effect.factionId}' was not found.`};
  const previous={...state,relations:{...state.relations}};
  if(effect.type==='changeFactionReputation')state.reputation=Math.max(-100,Math.min(100,state.reputation+effect.delta));
  if(effect.type==='setFactionReputation')state.reputation=effect.value;
  if(effect.type==='changeFactionRelation')state.relations[effect.targetFactionId]=effect.relation;
  if(effect.type==='setFactionMembership')state.membershipStatus=effect.membershipStatus;
  if(effect.type==='discoverFaction')state.isDiscovered=effect.discovered;
  if(effect.type==='setFactionHostility')state.hostilityOverride=effect.hostile;
  refreshFactionRuntime(definition,state);
  return{success:true,type:effect.type,message:`Faction '${definition.name}' state updated.`,mutationSummary:{factionId:effect.factionId,previous,current:{...state,relations:{...state.relations}}}};
};

export const handleChangeFactionReputationEffect = handleFactionEffect;
