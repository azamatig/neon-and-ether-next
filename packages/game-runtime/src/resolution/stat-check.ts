import { CharacterAttributes, PrimaryStat, SkillCheckDefinition, StatCheckDifficulty } from '@neon-ether/game-schema';
import { DiceRoller, DiceRollResult } from '@neon-ether/engine';
import { attributeModifier, SkillCheckSystem } from './skill-check.ts';
export type CheckOutcome = 'CriticalSuccess'|'Success'|'PartialSuccess'|'Failure'|'CriticalFailure';
export interface StatCheckResolution { stat:PrimaryStat; difficulty:StatCheckDifficulty; targetDc:number; attributeScore:number; attributeModifier:number; diceRoll:DiceRollResult; outcome:CheckOutcome; isPassed:boolean; logSummary:string }
export const calculateAttributeModifier = attributeModifier;
export function resolveStatCheck(stat:PrimaryStat,attributes:CharacterAttributes,difficulty:StatCheckDifficulty,roller:DiceRoller,customDc?:number,contextLabel?:string):StatCheckResolution {
 const key = `${stat[0].toLowerCase()}${stat.slice(1)}` as SkillCheckDefinition['attribute'];
 const resolved = new SkillCheckSystem(roller).resolve({attribute:key,difficulty,targetDc:customDc,modifiers:[],label:contextLabel},{attributes,skills:{}});
 const outcomes:Record<typeof resolved.result,CheckOutcome>={criticalFailure:'CriticalFailure',failure:'Failure',partialSuccess:'PartialSuccess',success:'Success',criticalSuccess:'CriticalSuccess'};
 return {stat,difficulty,targetDc:resolved.targetDc,attributeScore:resolved.attributeScore,attributeModifier:resolved.attributeModifier,diceRoll:resolved.roll,outcome:outcomes[resolved.result],isPassed:resolved.isPassed,logSummary:resolved.logSummary};
}
