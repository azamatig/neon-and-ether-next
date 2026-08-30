/**
 * @neon-ether/game-runtime
 * Unified Gameplay Outcome Engine.
 * Decouples gameplay state transitions (POIs, Events, Combat, Results, Screens) from React navigation.
 */

import {
  ActionResolution,
  CombatResolution,
  GameplayOutcome,
  OriginContext,
  PoiRuntimeState,
} from '@neon-ether/game-schema';
import { GameState } from '../state/game-state.ts';
import { ContentRegistry } from '../content/content-registry.ts';

export interface OutcomeExecutionResult {
  applied: boolean;
  nextMode: GameState['world']['mode'];
  originContext?: OriginContext | null;
  message?: string;
  activeEventId?: string | null;
  activeEventStepId?: string | null;
  activeEncounterId?: string | null;
  activeActionResolution?: ActionResolution | null;
  activeCombatResolution?: CombatResolution | null;
  activeLootEncounterId?: string | null;
}

export const MAX_SEQUENCE_DEPTH = 10;

export class GameplayOutcomeEngine {
  private activeActionResolution: ActionResolution | null = null;
  private activeCombatResolution: CombatResolution | null = null;

  public getActiveActionResolution(): ActionResolution | null {
    return this.activeActionResolution;
  }

  public setActiveActionResolution(res: ActionResolution | null): void {
    this.activeActionResolution = res;
  }

  public getActiveCombatResolution(): CombatResolution | null {
    return this.activeCombatResolution;
  }

  public setActiveCombatResolution(res: CombatResolution | null): void {
    this.activeCombatResolution = res;
  }

  /**
   * Resolves any GameplayOutcome against the mutable GameState.
   */
  public resolveOutcome(
    outcome: GameplayOutcome,
    state: GameState,
    contentRegistry: ContentRegistry,
    depth: number = 0
  ): OutcomeExecutionResult {
    if (depth > MAX_SEQUENCE_DEPTH) {
      console.warn(`[GameplayOutcomeEngine] Max outcome sequence depth (${MAX_SEQUENCE_DEPTH}) exceeded. Halting transition.`);
      return {
        applied: false,
        nextMode: state.world.mode,
        message: 'Max transition depth reached to prevent circular recursion.',
      };
    }

    switch (outcome.type) {
      case 'showResult': {
        state.world.mode = 'ActionResult';
        if (outcome.resultText || outcome.title) {
          this.activeActionResolution = {
            actionId: 'custom_result',
            actionLabel: outcome.title ?? 'Action Result',
            title: outcome.title ?? 'Action Completed',
            resultText: outcome.resultText ?? 'The action has resolved.',
            status: outcome.status ?? 'Success',
            gainedItems: [],
            lostItems: [],
            creditsDelta: 0,
            xpGained: 0,
            statChanges: [],
            relationshipChanges: [],
            factionRepChanges: [],
            statusEffectsGained: [],
            statusEffectsRemoved: [],
            flagsChanged: {},
            discoveredIntel: [],
            nextOutcome: outcome.nextOutcome,
          };
        } else if (this.activeActionResolution && outcome.nextOutcome) {
          this.activeActionResolution.nextOutcome = outcome.nextOutcome;
        }
        return {
          applied: true,
          nextMode: 'ActionResult',
          activeActionResolution: this.activeActionResolution,
        };
      }

      case 'event': {
        const event = contentRegistry.getEvent(outcome.eventId);
        if (!event) {
          console.warn(`[GameplayOutcomeEngine] Event with ID '${outcome.eventId}' not found in registry.`);
          return {
            applied: false,
            nextMode: state.world.mode,
            message: `Event '${outcome.eventId}' not found`,
          };
        }

        // Set origin context if provided, otherwise preserve existing if present
        if (outcome.originContext) {
          state.world.activeOriginContext = outcome.originContext;
        }

        state.world.activeEventId = outcome.eventId;
        state.world.activeEventStepId = outcome.stepId ?? event.steps[0]?.id ?? 'step_01';
        state.world.mode = 'Event';

        return {
          applied: true,
          nextMode: 'Event',
          activeEventId: outcome.eventId,
          activeEventStepId: state.world.activeEventStepId,
          originContext: state.world.activeOriginContext,
        };
      }

      case 'combat': {
        const encounter = contentRegistry.getEncounter(outcome.encounterId);
        if (!encounter) {
          console.warn(`[GameplayOutcomeEngine] Combat encounter '${outcome.encounterId}' not found.`);
          return {
            applied: false,
            nextMode: state.world.mode,
            message: `Encounter '${outcome.encounterId}' not found`,
          };
        }

        if (outcome.originContext) {
          state.world.activeOriginContext = outcome.originContext;
        }

        state.world.activeEncounterId = outcome.encounterId;
        const targetMode = outcome.previewFirst !== false ? 'CombatPreview' : 'TacticalCombat';
        state.world.mode = targetMode;

        return {
          applied: true,
          nextMode: targetMode,
          activeEncounterId: outcome.encounterId,
          originContext: state.world.activeOriginContext,
        };
      }

      case 'poi': {
        const poi = contentRegistry.getPOI(outcome.poiId);
        if (!poi) {
          console.warn(`[GameplayOutcomeEngine] POI with ID '${outcome.poiId}' not found.`);
          return {
            applied: false,
            nextMode: state.world.mode,
            message: `POI '${outcome.poiId}' not found`,
          };
        }

        if (outcome.mapId && outcome.mapId !== state.world.currentMapId) {
          state.world.currentMapId = outcome.mapId;
        }

        state.world.currentPoiId = outcome.poiId;
        state.world.selectedPoiId = outcome.poiId;
        state.world.mode = 'POI';

        // Mark discovered & visited
        if (!state.world.pois[outcome.poiId]) {
          state.world.pois[outcome.poiId] = {
            poiId: outcome.poiId,
            status: 'Visited',
            isDiscovered: true,
            isVisited: true,
            isLocked: false,
            completedActionIds: [],
            disabledActionIds: [],
            flags: {},
          };
        } else {
          state.world.pois[outcome.poiId].isVisited = true;
          if (state.world.pois[outcome.poiId].status !== 'Completed') {
            state.world.pois[outcome.poiId].status = 'Visited';
          }
        }

        return {
          applied: true,
          nextMode: 'POI',
        };
      }

      case 'map': {
        if (outcome.mapId && outcome.mapId !== state.world.currentMapId) {
          state.world.currentMapId = outcome.mapId;
        }
        state.world.selectedPoiId = null;
        state.world.mode = 'Map';

        return {
          applied: true,
          nextMode: 'Map',
        };
      }

      case 'gameplayScreen': {
        if (outcome.originContext) {
          state.world.activeOriginContext = outcome.originContext;
        }
        state.world.mode = 'Screen';
        state.world.activeScreen = outcome.screen;
        return {
          applied: true,
          nextMode: 'Screen',
          originContext: state.world.activeOriginContext,
        };
      }

      case 'returnToOrigin': {
        const origin = state.world.activeOriginContext;
        if (!origin) {
          // Default fallback: return to current POI or Map
          if (state.world.currentPoiId) {
            state.world.mode = 'POI';
            state.world.selectedPoiId = state.world.currentPoiId;
            return { applied: true, nextMode: 'POI' };
          }
          state.world.mode = 'Map';
          return { applied: true, nextMode: 'Map' };
        }

        switch (origin.type) {
          case 'poi': {
            if (origin.mapId) state.world.currentMapId = origin.mapId;
            state.world.currentPoiId = origin.id;
            state.world.selectedPoiId = origin.id;
            state.world.mode = 'POI';
            return { applied: true, nextMode: 'POI' };
          }
          case 'map': {
            if (origin.id) state.world.currentMapId = origin.id;
            state.world.selectedPoiId = null;
            state.world.mode = 'Map';
            return { applied: true, nextMode: 'Map' };
          }
          case 'event': {
            state.world.activeEventId = origin.id;
            state.world.mode = 'Event';
            return { applied: true, nextMode: 'Event', activeEventId: origin.id };
          }
          default: {
            state.world.mode = 'Map';
            return { applied: true, nextMode: 'Map' };
          }
        }
      }

      case 'sequence': {
        let lastResult: OutcomeExecutionResult = { applied: true, nextMode: state.world.mode };
        for (const subOutcome of outcome.outcomes) {
          lastResult = this.resolveOutcome(subOutcome, state, contentRegistry, depth + 1);
          // If a modal/blocking outcome was opened (e.g., showResult, Event, CombatPreview), halt immediate auto-transition
          if (['ActionResult', 'Event', 'CombatPreview', 'TacticalCombat', 'Loot', 'PostCombat'].includes(lastResult.nextMode)) {
            break;
          }
        }
        return lastResult;
      }

      case 'noPresentation':
      default: {
        return {
          applied: true,
          nextMode: state.world.mode,
        };
      }
    }
  }
}

export const defaultGameplayOutcomeEngine = new GameplayOutcomeEngine();
