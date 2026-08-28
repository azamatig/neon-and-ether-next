import { ChangeStatEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleChangeStatEffect: EffectHandler<ChangeStatEffect> = (effect, context) => {
  const isPlayer = !effect.targetCharacterId || effect.targetCharacterId === context.state.player.characterId;
  const target: any = isPlayer ? context.state.player : context.state.npcs?.[effect.targetCharacterId!];

  if (!target) {
    return {
      success: false,
      type: 'changeStat',
      message: `Target character '${effect.targetCharacterId ?? 'player'}' not found`,
      error: 'CHARACTER_NOT_FOUND',
    };
  }

  const statKeyLower = effect.stat.toLowerCase();
  let statCategory: 'attribute' | 'vital' | 'root' = 'root';
  let matchedKey = effect.stat;
  let previousValue = 0;

  // Check attributes
  if (target.attributes) {
    for (const [key, val] of Object.entries(target.attributes)) {
      if (key.toLowerCase() === statKeyLower) {
        statCategory = 'attribute';
        matchedKey = key;
        previousValue = val as number;
        break;
      }
    }
  }

  // Check vitals
  if (statCategory === 'root' && target.vitals) {
    for (const [key, val] of Object.entries(target.vitals)) {
      if (key.toLowerCase() === statKeyLower) {
        statCategory = 'vital';
        matchedKey = key;
        previousValue = val as number;
        break;
      }
    }
  }

  // Check root properties or inventory credits
  if (statCategory === 'root') {
    if (statKeyLower === 'credits') {
      previousValue = target.inventory?.credits ?? 0;
      matchedKey = 'credits';
    } else if (typeof target[effect.stat] === 'number') {
      previousValue = target[effect.stat];
    } else if (typeof target[statKeyLower] === 'number') {
      matchedKey = statKeyLower;
      previousValue = target[statKeyLower];
    }
  }

  let newValue = previousValue;
  if (effect.mode === 'set' && effect.value !== undefined) {
    newValue = effect.value;
  } else if (effect.mode === 'multiply' && effect.value !== undefined) {
    newValue = Math.round(previousValue * effect.value);
  } else if (effect.delta !== undefined) {
    newValue = previousValue + effect.delta;
  } else if (effect.value !== undefined) {
    newValue = effect.value;
  }

  // Clamping for vitals
  if (statCategory === 'vital') {
    if (matchedKey === 'currentHp') {
      newValue = Math.max(0, Math.min(target.vitals.maxHp ?? 100, newValue));
    } else if (matchedKey === 'currentEther') {
      newValue = Math.max(0, Math.min(target.vitals.maxEther ?? 100, newValue));
    } else if (matchedKey === 'actionPointsCurrent') {
      newValue = Math.max(0, Math.min(target.vitals.actionPointsMax ?? 10, newValue));
    }
    target.vitals[matchedKey] = newValue;
  } else if (statCategory === 'attribute') {
    target.attributes[matchedKey] = newValue;
  } else if (matchedKey === 'credits' && target.inventory) {
    target.inventory.credits = Math.max(0, newValue);
  } else {
    target[matchedKey] = newValue;
  }

  const charName = target.name || target.npcId || 'Character';

  if (context.logJournal) {
    const deltaStr = newValue >= previousValue ? `+${newValue - previousValue}` : `${newValue - previousValue}`;
    context.logJournal('System', `${charName} stat '${matchedKey}' modified: ${previousValue} -> ${newValue} (${deltaStr})`);
  }

  return {
    success: true,
    type: 'changeStat',
    message: `Stat '${matchedKey}' on ${charName} updated: ${previousValue} -> ${newValue}`,
    mutationSummary: {
      characterId: isPlayer ? context.state.player.characterId : effect.targetCharacterId,
      stat: matchedKey,
      previousValue,
      newValue,
    },
  };
};
