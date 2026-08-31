import type { FactionDefinition, FactionRuntimeState } from '@neon-ether/game-schema';

export function resolveFactionTier(definition:FactionDefinition,reputation:number){return [...definition.reputationTiers].sort((a,b)=>b.minimumReputation-a.minimumReputation).find((tier)=>reputation>=tier.minimumReputation)??definition.reputationTiers[0];}

export function refreshFactionRuntime(definition:FactionDefinition,state:FactionRuntimeState):void {const tier=resolveFactionTier(definition,state.reputation);state.reputationTierId=tier?.id??'';state.standing=tier?.name??'';state.isHostile=state.hostilityOverride??Boolean(definition.defaultHostile||tier?.hostile||(definition.hostility.hostileBelowReputation!==undefined&&state.reputation<definition.hostility.hostileBelowReputation));}

export function createFactionRuntime(definition:FactionDefinition):FactionRuntimeState {const state:FactionRuntimeState={factionId:definition.id,reputation:definition.defaultPlayerReputation,standing:'',reputationTierId:'',membershipStatus:definition.defaultMembershipStatus,isHostile:definition.defaultHostile,relations:Object.fromEntries(definition.defaultRelations.map((entry)=>[entry.factionId,entry.relation])),tier:1,isDiscovered:definition.discoveredByDefault,flags:{}};refreshFactionRuntime(definition,state);return state;}
