import type { TimeOfDay, TimeState } from '@neon-ether/game-schema';
export interface TimeAdvance {turns?:number;minutes?:number;hours?:number;days?:number}
export interface TimeAdvanceResult {previous:TimeState;current:TimeState;elapsedMinutes:number}
/** Canonical world clock used by effects, rest, travel, and availability conditions. */
export class WorldTimeSystem {
 timeOfDay(hour:number):TimeOfDay{if(hour>=5&&hour<8)return'Dawn';if(hour>=8&&hour<18)return'Day';if(hour>=18&&hour<21)return'Dusk';return'Night';}
 advance(state:TimeState,change:TimeAdvance):TimeAdvanceResult{const previous=structuredClone(state);const elapsedMinutes=(change.days??0)*1440+(change.hours??0)*60+(change.minutes??0);const absolute=(state.day-1)*1440+state.hour*60+state.minute+elapsedMinutes;state.day=Math.floor(absolute/1440)+1;const dayMinute=((absolute%1440)+1440)%1440;state.hour=Math.floor(dayMinute/60);state.minute=dayMinute%60;state.turnCount+=change.turns??0;state.timeOfDay=this.timeOfDay(state.hour);return{previous,current:structuredClone(state),elapsedMinutes};}
 rest(state:TimeState,hours:number):TimeAdvanceResult{return this.advance(state,{hours,turns:1});}
 travel(state:TimeState,minutes:number):TimeAdvanceResult{return this.advance(state,{minutes,turns:Math.max(1,Math.ceil(minutes/30))});}
}
