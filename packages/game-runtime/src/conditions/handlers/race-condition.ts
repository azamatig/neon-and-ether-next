import type { RaceCondition } from '@neon-ether/game-schema';
import type { ConditionHandler } from '../condition-handler.ts';

export const handleRaceCondition: ConditionHandler<RaceCondition> = (condition, context) => {
  const targetId = condition.targetCharacterId;
  const raceId = !targetId || targetId === context.state.player.characterId
    ? context.state.player.raceId
    : context.contentRegistry?.getCharacter(targetId)?.raceId;
  const race = raceId ? context.contentRegistry?.races.get(raceId) : undefined;
  const isMet = condition.type === 'raceIs' ? raceId === condition.raceId : race?.tags.includes(condition.tag) === true;
  return { isMet, type:condition.type, actual:condition.type === 'raceIs' ? raceId : race?.tags ?? [], expected:condition.type === 'raceIs' ? condition.raceId : condition.tag, reason:isMet ? undefined : 'Character lineage does not meet this requirement.' };
};
