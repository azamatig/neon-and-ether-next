import { MovePlayerEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleMovePlayerEffect: EffectHandler<MovePlayerEffect> = (effect, context) => {
  const previousMapId = context.state.world.currentMapId;
  const previousPos = { ...context.state.player.position };

  if (effect.mapId) {
    context.state.world.currentMapId = effect.mapId;
    if (!context.state.world.discoveredMapIds.includes(effect.mapId)) {
      context.state.world.discoveredMapIds.push(effect.mapId);
    }
  }

  if (effect.position) {
    context.state.player.position = { ...effect.position };
  }

  if (effect.facing) {
    context.state.player.facing = effect.facing;
  }

  if (context.logJournal) {
    if (effect.mapId && effect.mapId !== previousMapId) {
      const mapName = context.contentRegistry?.getMap(effect.mapId)?.name ?? effect.mapId;
      context.logJournal('World', `Transitioned to area: ${mapName}`);
    }
  }

  if (context.emitEvent) {
    context.emitEvent('POSITION_CHANGED', {
      characterId: context.state.player.characterId,
      position: context.state.player.position,
      mapId: context.state.world.currentMapId,
    });
  }

  return {
    success: true,
    type: 'movePlayer',
    message: `Player moved: (${previousPos.x}, ${previousPos.y}) -> (${context.state.player.position.x}, ${context.state.player.position.y})`,
    mutationSummary: {
      mapId: context.state.world.currentMapId,
      position: context.state.player.position,
      facing: context.state.player.facing,
    },
  };
};
