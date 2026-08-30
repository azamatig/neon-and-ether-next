import type { AdvanceTimeEffect } from '@neon-ether/game-schema';
import type { EffectHandler } from '../effect-handler.ts';
import { WorldTimeSystem } from '../../time/world-time-system.ts';
export const handleAdvanceTimeEffect:EffectHandler<AdvanceTimeEffect>=(effect,context)=>{const result=new WorldTimeSystem().advance(context.state.time,{turns:effect.turns,minutes:effect.minutes,hours:effect.hours,days:effect.days});context.logJournal?.('World',`Time advanced to day ${result.current.day}, ${String(result.current.hour).padStart(2,'0')}:${String(result.current.minute).padStart(2,'0')} (${result.current.timeOfDay}).`);return{success:true,type:'advanceTime',message:`World time advanced by ${result.elapsedMinutes} minutes.`,mutationSummary:result};};
