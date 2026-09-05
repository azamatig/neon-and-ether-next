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
import{MatchValuesRuntime}from'../minigames/match-values-runtime.ts';

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
  private state: GameState | null = null;

  /** Binds the engine to serializable session state (also called after load). */
  public bindState(state: GameState): void {
    this.state = state;
  }

  public getActiveActionResolution(): ActionResolution | null {
    return this.state?.pendingGameplay.activeActionResolution ?? null;
  }

  public setActiveActionResolution(res: ActionResolution | null): void {
    if (!this.state) throw new Error('GameplayOutcomeEngine must be bound before use');
    this.state.pendingGameplay.activeActionResolution = res;
    this.state.pendingGameplay.phase = res ? 'actionResult' : null;
  }

  public getActiveCombatResolution(): CombatResolution | null {
    return this.state?.pendingGameplay.activeCombatResolution ?? null;
  }

  public setActiveCombatResolution(res: CombatResolution | null): void {
    if (!this.state) throw new Error('GameplayOutcomeEngine must be bound before use');
    this.state.pendingGameplay.activeCombatResolution = res;
    this.state.pendingGameplay.phase = res ? 'combatResolution' : null;
  }

  public setPendingPhase(phase: GameState['pendingGameplay']['phase']): void {
    if (!this.state) throw new Error('GameplayOutcomeEngine must be bound before use');
    this.state.pendingGameplay.phase = phase;
  }

  public setLastPostCombatResolution(resolution: GameState['pendingGameplay']['lastPostCombatResolution']): void {
    if (!this.state) throw new Error('GameplayOutcomeEngine must be bound before use');
    this.state.pendingGameplay.lastPostCombatResolution = resolution;
  }

  /** Resolves an explicit continuation, followed by any deferred sequence tail. */
  public continueOutcome(outcome: GameplayOutcome | undefined, state: GameState, contentRegistry: ContentRegistry): OutcomeExecutionResult {
    const next = outcome ?? state.pendingGameplay.outcomeQueue.shift() ?? { type: 'returnToOrigin' as const };
    const result = this.resolveOutcome(next, state, contentRegistry);
    if (!this.isBlocking(result.nextMode) && state.pendingGameplay.outcomeQueue.length > 0) {
      return this.continueOutcome(undefined, state, contentRegistry);
    }
    return result;
  }

  private isBlocking(mode: GameState['world']['mode']): boolean {
    return ['ActionResult','Event','CombatPreview','TacticalCombat','CombatResult','Loot','PostCombat','Minigame'].includes(mode);
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
    // Stateless callers may use the legacy default engine; the provided runtime
    // state remains the source of truth rather than engine instance memory.
    if (this.state !== state) this.bindState(state);
    if (depth > MAX_SEQUENCE_DEPTH) {
      console.warn(`[GameplayOutcomeEngine] Max outcome sequence depth (${MAX_SEQUENCE_DEPTH}) exceeded. Halting transition.`);
      return {
        applied: false,
        nextMode: state.world.mode,
        message: 'Max transition depth reached to prevent circular recursion.',
      };
    }

    switch (outcome.type) {
      case'minigame':{const definition=contentRegistry.minigames.get(outcome.minigameId);if(!definition)return{applied:false,nextMode:state.world.mode,message:`Minigame '${outcome.minigameId}' not found`};if(outcome.originContext)state.world.activeOriginContext=outcome.originContext;state.world.activeMinigame=new MatchValuesRuntime().create(definition,state.player,state.rng.state,state.world.activeOriginContext);state.world.mode='Minigame';return{applied:true,nextMode:'Minigame',originContext:state.world.activeOriginContext}}
      case 'showResult': {
        state.world.mode = 'ActionResult';
        if (outcome.resultText || outcome.title) {
          state.pendingGameplay.activeActionResolution = {
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
        } else if (state.pendingGameplay.activeActionResolution && outcome.nextOutcome) {
          state.pendingGameplay.activeActionResolution.nextOutcome = outcome.nextOutcome;
        }
        state.pendingGameplay.phase = 'actionResult';
        return {
          applied: true,
          nextMode: 'ActionResult',
          activeActionResolution: state.pendingGameplay.activeActionResolution,
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
        for (let index = 0; index < outcome.outcomes.length; index += 1) {
          const subOutcome = outcome.outcomes[index];
          lastResult = this.resolveOutcome(subOutcome, state, contentRegistry, depth + 1);
          // If a modal/blocking outcome was opened (e.g., showResult, Event, CombatPreview), halt immediate auto-transition
          if (this.isBlocking(lastResult.nextMode)) {
            state.pendingGameplay.outcomeQueue.unshift(...outcome.outcomes.slice(index + 1));
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
