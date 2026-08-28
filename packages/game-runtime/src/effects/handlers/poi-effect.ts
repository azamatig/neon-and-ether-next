import { ChangePoiStateEffect, TravelPoiEffect } from '@neon-ether/game-schema';
import { EffectHandler } from '../effect-handler.ts';

export const handleTravelPoiEffect: EffectHandler<TravelPoiEffect> = (effect, context) => {
  const targetPoi = context.contentRegistry?.getPOI(effect.poiId);
  const targetMapId = effect.mapId ?? targetPoi?.mapId ?? context.state.world.currentMapId;

  const previousPoiId = context.state.world.currentPoiId;
  const previousMapId = context.state.world.currentMapId;

  context.state.world.currentMapId = targetMapId;
  context.state.world.currentPoiId = effect.poiId;
  context.state.world.selectedPoiId = effect.poiId;
  context.state.world.mode = 'POI';

  if (!context.state.world.discoveredMapIds.includes(targetMapId)) {
    context.state.world.discoveredMapIds.push(targetMapId);
  }

  // Ensure runtime POI state exists and mark visited
  if (!context.state.world.pois[effect.poiId]) {
    context.state.world.pois[effect.poiId] = {
      poiId: effect.poiId,
      status: 'Visited',
      isDiscovered: true,
      isVisited: true,
      isLocked: false,
      completedActionIds: [],
      disabledActionIds: [],
      flags: {},
    };
  } else {
    context.state.world.pois[effect.poiId].isVisited = true;
    context.state.world.pois[effect.poiId].isDiscovered = true;
    if (context.state.world.pois[effect.poiId].status !== 'Completed') {
      context.state.world.pois[effect.poiId].status = 'Visited';
    }
  }

  const poiName = targetPoi?.name ?? effect.poiId;
  if (context.logJournal) {
    context.logJournal('World', `Arrived at location: ${poiName}.`);
  }

  return {
    success: true,
    type: 'travelPoi',
    message: `Traveled to POI '${poiName}'`,
    mutationSummary: {
      mapId: targetMapId,
      poiId: effect.poiId,
      previousPoiId,
      previousMapId,
    },
  };
};

export const handleChangePoiStateEffect: EffectHandler<ChangePoiStateEffect> = (effect, context) => {
  let poiRuntime = context.state.world.pois[effect.poiId];
  if (!poiRuntime) {
    poiRuntime = {
      poiId: effect.poiId,
      status: effect.status ?? 'Discovered',
      isDiscovered: effect.isDiscovered ?? true,
      isVisited: effect.isVisited ?? false,
      isLocked: effect.isLocked ?? false,
      customDescription: effect.customDescription,
      customImage: effect.customImage,
      completedActionIds: effect.completeActionId ? [effect.completeActionId] : [],
      disabledActionIds: [],
      flags: {},
    };
    context.state.world.pois[effect.poiId] = poiRuntime;
  } else {
    if (effect.status !== undefined) poiRuntime.status = effect.status;
    if (effect.isDiscovered !== undefined) poiRuntime.isDiscovered = effect.isDiscovered;
    if (effect.isVisited !== undefined) poiRuntime.isVisited = effect.isVisited;
    if (effect.isLocked !== undefined) poiRuntime.isLocked = effect.isLocked;
    if (effect.customDescription !== undefined) poiRuntime.customDescription = effect.customDescription;
    if (effect.customImage !== undefined) poiRuntime.customImage = effect.customImage;
    if (effect.completeActionId && !poiRuntime.completedActionIds.includes(effect.completeActionId)) {
      poiRuntime.completedActionIds.push(effect.completeActionId);
    }
  }

  const poiName = context.contentRegistry?.getPOI(effect.poiId)?.name ?? effect.poiId;
  if (context.logJournal) {
    context.logJournal('World', `Location status updated: ${poiName} [${poiRuntime.status}].`);
  }

  return {
    success: true,
    type: 'changePoiState',
    message: `Updated POI '${poiName}' state: status=${poiRuntime.status}`,
    mutationSummary: {
      poiId: effect.poiId,
      status: poiRuntime.status,
      isDiscovered: poiRuntime.isDiscovered,
      isVisited: poiRuntime.isVisited,
      isLocked: poiRuntime.isLocked,
    },
  };
};
