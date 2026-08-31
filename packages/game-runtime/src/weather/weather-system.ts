import type { Condition, GameState, WeatherDefinition, WeatherProfile, WeatherState } from '@neon-ether/game-schema';
import type { ContentRegistry } from '../content/content-registry.ts';

export interface ResolvedEnvironment { state: WeatherState; definition: WeatherDefinition; tags: string[]; modifiers: Record<string, number> }

/** Deterministic, world-time-driven weather resolution; it never owns timers or UI state. */
export class WeatherSystem {
  constructor(private readonly content: ContentRegistry, private readonly conditionsMet:(conditions:Condition[],state:GameState)=>boolean=(conditions)=>conditions.length===0) {}
  absoluteMinute(state: GameState): number { return (state.time.day - 1) * 1440 + state.time.hour * 60 + state.time.minute; }
  scopeKey(mapId: string, regionId?: string): string { return regionId ? `region:${mapId}:${regionId}` : `map:${mapId}`; }
  profileFor(mapId: string, regionId?: string, explicitProfileId?: string): WeatherProfile | undefined {
    if (explicitProfileId) return this.content.weatherProfiles.get(explicitProfileId);
    const map=this.content.maps.get(mapId); const region=regionId ? map?.regions.find((value)=>value.id===regionId) : undefined;
    return this.content.weatherProfiles.get(region?.weatherProfileId ?? map?.weatherProfileId ?? '');
  }
  private hash(value:string):number { let result=2166136261; for(const char of value){result^=char.charCodeAt(0);result=Math.imul(result,16777619);} return result>>>0; }
  private select(profile:WeatherProfile,state:GameState,salt:string){
    const eligible=profile.possibleWeather.filter((entry)=>this.conditionsMet(entry.timeConditions,state) && this.content.weatherDefinitions.has(entry.weatherId));
    const entries=eligible.length?eligible:profile.possibleWeather.filter((entry)=>this.content.weatherDefinitions.has(entry.weatherId));
    if(!entries.length)return undefined; const total=entries.reduce((sum,entry)=>sum+entry.weight,0); let cursor=(this.hash(salt)%100000)/100000*total;
    return entries.find((entry)=>((cursor-=entry.weight)<=0))??entries.at(-1);
  }
  ensure(state:GameState,mapId:string,regionId?:string,profileId?:string,forceNext=false):WeatherState|undefined {
    const profile=this.profileFor(mapId,regionId,profileId); if(!profile)return undefined; const key=this.scopeKey(mapId,regionId); const now=this.absoluteMinute(state); const current=state.world.weatherByScope[key];
    if(current&&!forceNext&&(current.forced||current.nextChangeAtWorldMinute===undefined||current.nextChangeAtWorldMinute>now))return current;
    const entry=this.select(profile,state,`${key}:${now}:${current?.currentWeatherId??''}`); if(!entry)return current;
    const span=entry.maximumDurationMinutes-entry.minimumDurationMinutes; const duration=entry.minimumDurationMinutes+(span?this.hash(`${key}:${now}:duration`)%(span+1):0);
    return state.world.weatherByScope[key]={mapId,regionId,currentWeatherId:entry.weatherId,weatherProfileId:profile.id,startedAtWorldMinute:now,nextChangeAtWorldMinute:now+duration,forced:false};
  }
  update(state:GameState):void { for(const map of this.content.maps) { this.ensure(state,map.id); for(const region of map.regions)this.ensure(state,map.id,region.id); } }
  set(state:GameState,mapId:string,weatherId:string,regionId?:string,durationMinutes?:number):WeatherState {
    this.content.weatherDefinitions.require(weatherId); const now=this.absoluteMinute(state); return state.world.weatherByScope[this.scopeKey(mapId,regionId)]={mapId,regionId,currentWeatherId:weatherId,startedAtWorldMinute:now,nextChangeAtWorldMinute:durationMinutes?now+durationMinutes:undefined,forced:true};
  }
  resolve(state:GameState,mapId:string,regionId?:string):ResolvedEnvironment|undefined {
    const weatherState=this.ensure(state,mapId,regionId); if(!weatherState)return undefined; const definition=this.content.weatherDefinitions.get(weatherState.currentWeatherId); if(!definition)return undefined;
    return {state:weatherState,definition,tags:[...new Set([...definition.tags,...definition.environmentTags])],modifiers:{...definition.gameplayModifiers}};
  }
}
