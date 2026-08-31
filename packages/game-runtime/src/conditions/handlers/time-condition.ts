import type { TimeCondition } from '@neon-ether/game-schema';
import { evaluateComparison } from '../condition-context.ts';
import type { ConditionHandler } from '../condition-handler.ts';
export const handleTimeCondition:ConditionHandler<TimeCondition>=(condition,context)=>{const actual=context.state.time[condition.field];const isMet=evaluateComparison(actual,condition.operator,condition.value);return{isMet,type:'time',actual,expected:condition.value,reason:`World time ${condition.field} is ${String(actual)}; expected ${condition.operator} ${String(condition.value)}`};};
