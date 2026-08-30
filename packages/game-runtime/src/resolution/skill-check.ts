import type { CharacterAttributes, CharacterStatModifier, DerivedStats, SkillCheckDefinition, SkillCheckOutcome, Skills } from '@neon-ether/game-schema';
import { DIFFICULTY_DC } from '@neon-ether/game-schema';
import type { DiceRollResult } from '@neon-ether/engine';
import { DiceRoller } from '@neon-ether/engine';
import { CharacterStatsSystem } from '../stats/character-stats-system.ts';

export interface SkillCheckStats { attributes: CharacterAttributes; skills: Skills; vitals?: DerivedStats; equipment?: { appliedModifiers: Record<string,number> }; temporaryModifiers?: CharacterStatModifier[]; statusEffects?: Array<{ modifiers: CharacterStatModifier[]; stacks: number }> }
export interface SkillCheckResult {
  definition: SkillCheckDefinition; attributeScore: number; attributeModifier: number; skillModifier: number;
  situationalModifier: number; totalModifier: number; targetDc: number; roll: DiceRollResult;
  result: SkillCheckOutcome; isPassed: boolean; logSummary: string;
}
export function attributeModifier(score: number): number { return Math.floor((score - 10) / 2); }

/** Generic attribute/skill resolver. Skill IDs are authored strings, never runtime branches. */
export class SkillCheckSystem {
  constructor(private readonly roller: DiceRoller) {}
  resolve(definition: SkillCheckDefinition, stats: SkillCheckStats): SkillCheckResult {
    const effectiveAttributes = stats.vitals ? new CharacterStatsSystem().resolve({ ...stats, vitals: stats.vitals }).attributes : stats.attributes;
    const attributeScore = effectiveAttributes[definition.attribute];
    const baseAttributeModifier = attributeModifier(attributeScore);
    const skillModifier = definition.skill ? (stats.skills[definition.skill] ?? 0) : 0;
    const temporary = (stats.temporaryModifiers ?? []).filter((modifier) => ['checks', `attribute:${definition.attribute}`, definition.skill ? `skill:${definition.skill}` : ''].includes(modifier.target)).reduce((sum, modifier) => sum + modifier.value, 0);
    const situationalModifier = definition.modifiers.reduce((sum, modifier) => sum + modifier.value, 0) + temporary;
    const totalModifier = baseAttributeModifier + skillModifier + situationalModifier;
    const targetDc = definition.targetDc ?? DIFFICULTY_DC[definition.difficulty];
    const roll = this.roller.rollD20(totalModifier, definition.label ?? `${definition.attribute}${definition.skill ? ` / ${definition.skill}` : ''}`);
    let result: SkillCheckOutcome;
    if (roll.isNaturalCriticalFailure) result = 'criticalFailure';
    else if (roll.isNaturalCriticalSuccess) result = 'criticalSuccess';
    else if (roll.total >= targetDc) result = 'success';
    else if (roll.total >= targetDc - 2) result = 'partialSuccess';
    else result = 'failure';
    const isPassed = result === 'success' || result === 'criticalSuccess';
    return { definition, attributeScore, attributeModifier:baseAttributeModifier, skillModifier, situationalModifier, totalModifier, targetDc, roll, result, isPassed, logSummary:`[${definition.attribute}${definition.skill ? `/${definition.skill}` : ''} vs DC ${targetDc}] ${roll.rawRoll}${totalModifier >= 0 ? '+' : ''}${totalModifier}=${roll.total} → ${result}` };
  }
}
