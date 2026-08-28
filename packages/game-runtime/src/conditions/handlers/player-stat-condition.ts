import { PlayerStatCondition } from '@neon-ether/game-schema';
import { ConditionContext, evaluateComparison } from '../condition-context.ts';
import { ConditionEvaluationResult, ConditionHandler } from '../condition-handler.ts';

function extractCharacterStat(character: any, statKey: string): number {
  if (!character) return 0;

  const keyLower = statKey.toLowerCase();

  // 1. Direct attribute match (case-insensitive)
  if (character.attributes) {
    for (const [attrName, val] of Object.entries(character.attributes)) {
      if (attrName.toLowerCase() === keyLower && typeof val === 'number') {
        return val;
      }
    }
  }

  // 2. Direct vitals match (e.g. currentHp, maxHp, currentEther, maxEther, actionPointsCurrent, armorRating, initiative)
  if (character.vitals) {
    for (const [vitalName, val] of Object.entries(character.vitals)) {
      if (vitalName.toLowerCase() === keyLower && typeof val === 'number') {
        return val;
      }
    }
  }

  // 3. Root character properties (e.g. level, credits)
  if (typeof character[statKey] === 'number') {
    return character[statKey];
  }
  if (typeof character[keyLower] === 'number') {
    return character[keyLower];
  }

  return 0;
}

export const handlePlayerStatCondition: ConditionHandler<PlayerStatCondition> = (
  condition,
  context
): ConditionEvaluationResult => {
  let targetData: any = context.state.player;
  if (condition.targetCharacterId && condition.targetCharacterId !== context.state.player?.characterId) {
    targetData = context.state.npcs?.[condition.targetCharacterId];
  }

  // Also support credits lookup from inventory
  if (condition.stat.toLowerCase() === 'credits') {
    const credits = targetData?.inventory?.credits ?? 0;
    const isMet = evaluateComparison(credits, condition.operator, condition.value);
    return {
      isMet,
      type: 'playerStat',
      actual: credits,
      expected: condition.value,
      reason: isMet
        ? `Credits are ${credits} (${condition.operator} ${condition.value})`
        : `Credits are ${credits}, required ${condition.operator} ${condition.value}`,
    };
  }

  const actual = extractCharacterStat(targetData, condition.stat);
  const expected = condition.value;
  const isMet = evaluateComparison(actual, condition.operator, expected);

  return {
    isMet,
    type: 'playerStat',
    actual,
    expected,
    reason: isMet
      ? `Stat '${condition.stat}' is ${actual} (${condition.operator} ${expected})`
      : `Stat '${condition.stat}' is ${actual}, required ${condition.operator} ${expected}`,
  };
};
