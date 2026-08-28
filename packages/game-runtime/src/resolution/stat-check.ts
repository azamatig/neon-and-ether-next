/**
 * @neon-ether/game-runtime
 * Deterministic stat check resolution system.
 */

import { CharacterAttributes, DIFFICULTY_DC, PrimaryStat, StatCheckDifficulty } from '@neon-ether/game-schema';
import { DiceRoller, DiceRollResult } from '@neon-ether/engine';

export type CheckOutcome = 'CriticalSuccess' | 'Success' | 'Failure' | 'CriticalFailure';

export interface StatCheckResolution {
  stat: PrimaryStat;
  difficulty: StatCheckDifficulty;
  targetDc: number;
  attributeScore: number;
  attributeModifier: number;
  diceRoll: DiceRollResult;
  outcome: CheckOutcome;
  isPassed: boolean;
  logSummary: string;
}

/**
 * Calculates attribute modifier using traditional PC RPG formula:
 * score 10 = +0, every 2 points above/below = +/- 1
 */
export function calculateAttributeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function resolveStatCheck(
  stat: PrimaryStat,
  attributes: CharacterAttributes,
  difficulty: StatCheckDifficulty,
  roller: DiceRoller,
  customDc?: number,
  contextLabel?: string
): StatCheckResolution {
  const statKey = stat.toLowerCase() as keyof CharacterAttributes;
  const score = attributes[statKey] ?? 10;
  const modifier = calculateAttributeModifier(score);
  const targetDc = customDc ?? DIFFICULTY_DC[difficulty];

  const roll = roller.rollD20(modifier, `${stat} vs DC ${targetDc}`);

  let outcome: CheckOutcome;
  if (roll.isNaturalCriticalSuccess) {
    outcome = 'CriticalSuccess';
  } else if (roll.isNaturalCriticalFailure) {
    outcome = 'CriticalFailure';
  } else if (roll.total >= targetDc) {
    outcome = 'Success';
  } else {
    outcome = 'Failure';
  }

  const isPassed = outcome === 'Success' || outcome === 'CriticalSuccess';

  const logSummary = `[${stat} Check - ${difficulty} (DC ${targetDc})] Roll: ${roll.rawRoll} ${modifier >= 0 ? '+' : ''}${modifier} = ${roll.total} -> ${outcome.toUpperCase()}${contextLabel ? ` [${contextLabel}]` : ''}`;

  return {
    stat,
    difficulty,
    targetDc,
    attributeScore: score,
    attributeModifier: modifier,
    diceRoll: roll,
    outcome,
    isPassed,
    logSummary,
  };
}
