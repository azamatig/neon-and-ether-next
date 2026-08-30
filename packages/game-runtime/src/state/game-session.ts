/**
 * @neon-ether/game-runtime
 * GameSession orchestrator unifying Engine, State, Content, Resolution, Conditions, Effects, and Actions.
 * Refactored for World / District Map and interactive POI exploration flow.
 */

import {
  ActionDefinition,
  ActionResolution,
  CharacterDefinition,
  CombatResolution,
  CombatAction,
  CharacterManagementCommand,
  BaseManagementCommand,
  BaseRoomDefinition,
  BaseUpgradeDefinition,
  Condition,
  DialogueChoice,
  DialogueNode,
  Effect,
  GameplayOutcome,
  GameEvent,
  OriginContext,
  POI,
  PoiAction,
  PoiRuntimeState,
  PostCombatResolution,
  Vector2D,
  EquipmentSlot,
} from '@neon-ether/game-schema';
import { DiceRoller, TypedEventEmitter } from '@neon-ether/engine';
import {
  BaseState,
  FactionRuntimeState,
  GameJournalEntry,
  GameMode,
  GameState,
  NpcRuntimeState,
  PlayerState,
  QuestRuntimeState,
  SaveGame,
  TimeState,
  WorldState,
  createInitialGameStateFromContent,
} from './game-state.ts';
import { ContentRegistry } from '../content/content-registry.ts';
import { resolveStatCheck, StatCheckResolution } from '../resolution/stat-check.ts';
import { TurnBasedCombatEngine, CombatCommandResult } from '../combat/turn-based-combat-engine.ts';
import { CharacterManagementResult, CharacterManagementSystem, ResolvedCharacterAction } from '../characters/character-management-system.ts';
import { BaseManagementResult, BaseManagementSystem, BaseOption } from '../base/base-management-system.ts';
import { ConditionRegistry } from '../conditions/condition-registry.ts';
import { BatchConditionResult, evaluateCondition, evaluateConditions } from '../conditions/condition-evaluator.ts';
import { ConditionEvaluationResult } from '../conditions/condition-handler.ts';
import { EffectRegistry } from '../effects/effect-registry.ts';
import { BatchEffectExecutionResult, EffectExecutor } from '../effects/effect-executor.ts';
import { EffectExecutionResult } from '../effects/effect-handler.ts';
import { ActionExecutionResult, ActionExecutor } from '../actions/action-executor.ts';
import { GameplayOutcomeEngine } from '../resolution/gameplay-outcome-engine.ts';
import { PoiActionPipeline, PoiActionPipelineResult } from '../actions/poi-action-pipeline.ts';
import { EventRuntime, ResolvedEventState } from '../events/event-runtime.ts';
import { QuestRuntime, QuestCommandResult, ResolvedQuestState } from '../quests/quest-runtime.ts';
import { CombatEncounterEngine, ResolvedCombatPreview } from '../combat/combat-encounter-engine.ts';
import type { RuntimeTraceEvent, RuntimeTraceSink } from '../observability/runtime-trace.ts';
import { InventorySystem, InventoryCommandResult } from '../inventory/inventory-system.ts';
import { CharacterStatsSystem } from '../stats/character-stats-system.ts';
import { CraftingSystem, type CraftingContext, type CraftingResult } from '../crafting/crafting-system.ts';
import { EconomySystem, type ShopView, type TradeResult } from '../economy/economy-system.ts';
import { WorldTimeSystem, type TimeAdvance, type TimeAdvanceResult } from '../time/world-time-system.ts';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  deserializeSaveGame,
  SaveLoadResult,
  serializeSaveGame,
} from './save-serializer.ts';

export interface ResolvedPOI extends POI {
  runtime: PoiRuntimeState;
  isVisible: boolean;
  isAvailable: boolean;
  isCurrentLocation: boolean;
  resolvedActions: Array<
    PoiAction & {
      isAvailable: boolean;
      isVisible: boolean;
      unmetConditionReason?: string;
      isCompleted: boolean;
    }
  >;
}

export interface GameRuntimeEvents {
  STATE_CHANGED: GameState;
  JOURNAL_LOGGED: GameJournalEntry;
  DIALOGUE_NODE_CHANGED: { treeId: string; node: DialogueNode };
  DIALOGUE_ENDED: void;
  STAT_CHECK_TRIGGERED: StatCheckResolution;
  MODE_CHANGED: GameMode;
  POI_OPENED: { poiId: string };
  POI_TRAVELED: { poiId: string; mapId: string };
  RETURNED_TO_MAP: { mapId: string };
  COMBAT_STATE_CHANGED: void;
  COMBAT_INITIATED: { enemyIds: string[] };
  GAME_EVENT_TRIGGERED: { eventId: string; payload?: any };
  ACTION_EXECUTED: { actionId: string; actionName: string; effectResults: BatchEffectExecutionResult };
  POI_ACTION_EXECUTED: { poiId: string; actionId: string; actionLabel: string; resolution: ActionResolution };
  RUNTIME_TRACED: RuntimeTraceEvent;
}

export interface PlayerResourceCommandResult {
  success: boolean;
  resource: 'actionPoints' | 'ether';
  previous: number;
  current: number;
  error?: 'INVALID_AMOUNT' | 'INSUFFICIENT_RESOURCE';
}

export class GameSession {
  private state: GameState;
  private contentRegistry: ContentRegistry;
  private diceRoller: DiceRoller;
  private turnBasedCombatEngine: TurnBasedCombatEngine;
  private characterManagementSystem: CharacterManagementSystem;
  private baseManagementSystem: BaseManagementSystem;
  private conditionRegistry: ConditionRegistry;
  private effectRegistry: EffectRegistry;
  private effectExecutor: EffectExecutor;
  private actionExecutor: ActionExecutor;
  private outcomeEngine: GameplayOutcomeEngine;
  private poiActionPipeline: PoiActionPipeline;
  private eventRuntime: EventRuntime;
  private questRuntime: QuestRuntime;
  private combatEncounterEngine: CombatEncounterEngine;
  private inventorySystem: InventorySystem;
  private craftingSystem: CraftingSystem;
  private economySystem: EconomySystem;
  private worldTimeSystem: WorldTimeSystem;
  public events: TypedEventEmitter<GameRuntimeEvents>;

  constructor(
    contentRegistry: ContentRegistry,
    seed: number = 1337,
    conditionRegistry?: ConditionRegistry,
    effectRegistry?: EffectRegistry,
    private readonly trace?: RuntimeTraceSink,
  ) {
    this.contentRegistry = contentRegistry;
    this.diceRoller = new DiceRoller(seed);
    this.events = new TypedEventEmitter<GameRuntimeEvents>();
    this.turnBasedCombatEngine = new TurnBasedCombatEngine(contentRegistry, this.diceRoller);
    this.characterManagementSystem = new CharacterManagementSystem(contentRegistry);
    // Initialize registries and executors
    const report = (event: RuntimeTraceEvent) => { this.trace?.(event); this.events.emit('RUNTIME_TRACED', event); };
    this.conditionRegistry = conditionRegistry ?? new ConditionRegistry(true, report);
    this.effectRegistry = effectRegistry ?? new EffectRegistry(true);
    this.effectExecutor = new EffectExecutor(this.effectRegistry, report);
    this.inventorySystem = new InventorySystem(contentRegistry, (effects, state) => { this.effectExecutor.executeBatch(effects, { state, contentRegistry }); });
    this.craftingSystem = new CraftingSystem(contentRegistry, this.conditionRegistry, this.effectExecutor);
    this.economySystem = new EconomySystem(contentRegistry, this.conditionRegistry);
    this.worldTimeSystem = new WorldTimeSystem();
    this.baseManagementSystem = new BaseManagementSystem(contentRegistry, this.conditionRegistry, this.effectExecutor);
    this.actionExecutor = new ActionExecutor(this.conditionRegistry, this.effectExecutor);
    this.outcomeEngine = new GameplayOutcomeEngine();
    this.poiActionPipeline = new PoiActionPipeline(this.conditionRegistry, this.effectExecutor, this.outcomeEngine, this.diceRoller);
    this.eventRuntime = new EventRuntime(this.conditionRegistry, this.effectExecutor, this.outcomeEngine, this.diceRoller);
    this.questRuntime = new QuestRuntime(this.conditionRegistry, this.effectExecutor);
    this.combatEncounterEngine = new CombatEncounterEngine(this.conditionRegistry, this.effectExecutor, this.outcomeEngine, this.diceRoller);

    // Initial modular state
    this.state = createInitialGameStateFromContent(this.contentRegistry.exportSnapshot());
    this.inventorySystem.hydrate(this.state);
  }

  // --- State Accessors ---

  public getState(): GameState {
    return structuredClone(this.state);
  }

  public getPlayerState(): PlayerState {
    return structuredClone(this.state.player);
  }

  public getInventoryWeight(): number { return this.inventorySystem.getWeight(this.state.player.inventory); }
  public addInventoryItem(itemId: string, quantity = 1): InventoryCommandResult {
    const result = this.inventorySystem.add(this.state.player.inventory, itemId, quantity);
    if (result.success) this.events.emit('STATE_CHANGED', this.state);
    return result;
  }
  public removeInventoryItem(itemId: string, quantity = 1): InventoryCommandResult {
    const result = this.inventorySystem.remove(this.state.player.inventory, itemId, quantity);
    if (result.changedQuantity) this.events.emit('STATE_CHANGED', this.state);
    return result;
  }
  public equipInventoryEntry(entryId: string, slot: EquipmentSlot): InventoryCommandResult {
    const result = this.inventorySystem.equip(this.state, entryId, slot);
    if (result.success) this.events.emit('STATE_CHANGED', this.state);
    return result;
  }
  public unequipSlot(slotId: string): InventoryCommandResult {
    const result = this.inventorySystem.unequip(this.state, slotId);
    if (result.success) this.events.emit('STATE_CHANGED', this.state);
    return result;
  }
  public getAvailableRecipes(context: CraftingContext) { return this.craftingSystem.getAvailable(this.state, context); }
  public craftRecipe(recipeId: string, context: CraftingContext): CraftingResult {
    const result = this.craftingSystem.craft(recipeId, this.state, context);
    if (result.success) this.events.emit('STATE_CHANGED', this.state);
    return result;
  }
  public getShop(shopId: string): ShopView | undefined { return this.economySystem.getShop(shopId, this.state); }
  public buyFromShop(shopId: string, itemId: string, quantity = 1): TradeResult { const result=this.economySystem.buy(shopId,itemId,quantity,this.state);if(result.success)this.events.emit('STATE_CHANGED',this.state);return result; }
  public sellToShop(shopId: string, itemId: string, quantity = 1): TradeResult { const result=this.economySystem.sell(shopId,itemId,quantity,this.state);if(result.success)this.events.emit('STATE_CHANGED',this.state);return result; }
  public advanceWorldTime(change: TimeAdvance): TimeAdvanceResult { const result=this.worldTimeSystem.advance(this.state.time,change);this.events.emit('STATE_CHANGED',this.state);return result; }
  public rest(hours = 8): TimeAdvanceResult { const result=this.worldTimeSystem.rest(this.state.time,hours);this.events.emit('STATE_CHANGED',this.state);return result; }

  /** Applies HUD resource commands inside the runtime rather than mutating React snapshots. */
  public spendPlayerResource(resource: 'actionPoints' | 'ether', amount: number): PlayerResourceCommandResult {
    const field = resource === 'actionPoints' ? 'actionPointsCurrent' : 'currentEther';
    const previous = this.state.player.vitals[field];
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, resource, previous, current: previous, error: 'INVALID_AMOUNT' };
    if (previous < amount) return { success: false, resource, previous, current: previous, error: 'INSUFFICIENT_RESOURCE' };
    const current = previous - amount;
    this.state.player.vitals[field] = current;
    this.logJournal(resource === 'actionPoints' ? 'Combat' : 'EtherTech', resource === 'actionPoints' ? `Spent ${amount} AP. Remaining: ${current}` : `Channelled ${amount} Ether resonance.`);
    return { success: true, resource, previous, current };
  }

  public resetPlayerActionPoints(): PlayerResourceCommandResult {
    const previous = this.state.player.vitals.actionPointsCurrent;
    const current = this.state.player.vitals.actionPointsMax;
    this.state.player.vitals.actionPointsCurrent = current;
    this.logJournal('Combat', `Turn refreshed. AP restored to ${current}.`);
    return { success: true, resource: 'actionPoints', previous, current };
  }

  public getWorldState(): WorldState {
    return structuredClone(this.state.world);
  }

  public getNpcRuntimeState(npcId: string): NpcRuntimeState | undefined {
    const state = this.state.npcs[npcId];
    return state ? structuredClone(state) : undefined;
  }

  public getQuestRuntimeState(questId: string): QuestRuntimeState | undefined {
    const state = this.state.quests[questId];
    return state ? structuredClone(state) : undefined;
  }

  public getResolvedQuestState(questId: string): ResolvedQuestState | undefined {
    return this.questRuntime.resolve(questId, this.state, this.contentRegistry);
  }

  public startQuest(questId: string): QuestCommandResult {
    return this.emitQuestResult(this.questRuntime.startQuest(questId, this.state, this.contentRegistry));
  }

  public progressQuestObjective(questId: string, objectiveId: string, amount = 1): QuestCommandResult {
    return this.emitQuestResult(this.questRuntime.progressObjective(questId, objectiveId, amount, this.state, this.contentRegistry));
  }

  public executeQuestAction(questId: string, actionId: string): QuestCommandResult {
    return this.emitQuestResult(this.questRuntime.executeAction(questId, actionId, this.state, this.contentRegistry));
  }

  public completeQuestStage(questId: string, branchId?: string): QuestCommandResult {
    return this.emitQuestResult(this.questRuntime.completeStage(questId, this.state, this.contentRegistry, branchId));
  }

  private emitQuestResult(result: QuestCommandResult): QuestCommandResult {
    if (result.success) {
      this.reportTrace({ kind: 'QuestTransition', message: result.message, details: { questId: result.resolved?.definition.id, stageId: result.resolved?.stage.id } });
      this.events.emit('STATE_CHANGED', this.state);
    }
    return result;
  }

  public getFactionRuntimeState(factionId: string): FactionRuntimeState | undefined {
    const state = this.state.factions[factionId];
    return state ? structuredClone(state) : undefined;
  }

  public getBaseState(): BaseState {
    return structuredClone(this.state.base);
  }

  public getCharacterManagementActions(npcId: string): ResolvedCharacterAction[] {
    return this.characterManagementSystem.getAvailableActions(npcId, this.state);
  }

  public executeCharacterManagementCommand(command: CharacterManagementCommand): CharacterManagementResult {
    const result = this.characterManagementSystem.execute(command, this.state);
    if (result.success) {
      this.logJournal('World', `Character management command '${command.type}' applied to '${command.npcId}'.`);
      this.events.emit('STATE_CHANGED', this.state);
    }
    return result;
  }

  public getBaseRoomOptions(slotId: string): BaseOption<BaseRoomDefinition>[] {
    return this.baseManagementSystem.getRoomOptions(slotId, this.state);
  }

  public getBaseUpgradeOptions(roomInstanceId: string): BaseOption<BaseUpgradeDefinition>[] {
    return this.baseManagementSystem.getUpgradeOptions(roomInstanceId, this.state);
  }

  public executeBaseManagementCommand(command: BaseManagementCommand): BaseManagementResult {
    const result = this.baseManagementSystem.execute(command, this.state);
    if (result.success) {
      this.logJournal('World', `Base management command '${command.type}' completed.`);
      this.events.emit('STATE_CHANGED', this.state);
    }
    return result;
  }

  public getTimeState(): TimeState {
    return structuredClone(this.state.time);
  }

  public getContentRegistry(): ContentRegistry {
    return this.contentRegistry;
  }

  public getConditionRegistry(): ConditionRegistry {
    return this.conditionRegistry;
  }

  public getEffectRegistry(): EffectRegistry {
    return this.effectRegistry;
  }

  public getEffectExecutor(): EffectExecutor {
    return this.effectExecutor;
  }

  public getActionExecutor(): ActionExecutor {
    return this.actionExecutor;
  }

  // --- Content-to-Runtime Dynamic Resolution ---

  /**
   * Returns a resolved CharacterDefinition for the player.
   */
  public getResolvedPlayerCharacter(): CharacterDefinition {
    const p = this.state.player;
    const effective = new CharacterStatsSystem().resolve(p);
    return {
      id: p.characterId,
      name: p.name,
      description: 'Technomancer protagonist.',
      tags: ['Player', 'Protagonist'],
      title: p.title,
      factionId: p.factionId,
      isPlayer: true,
      isMerchant: false,
      isCompanion: false,
      level: p.level,
      attributes: effective.attributes,
      vitals: effective.derivedStats,
      skills: { ...p.skills },
      perks: [...p.perks],
      temporaryModifiers: [...p.temporaryModifiers],
      statusEffects: [...p.statusEffects],
      position: { ...p.position },
      facing: p.facing,
      inventory: p.inventory.items.map((slot) => ({ ...slot })),
      portraitIcon: 'User',
      defaultBehavior: 'Idle',
      abilityIds: this.contentRegistry.getCharacter(p.characterId)?.abilityIds ?? [],
      traits: this.contentRegistry.getCharacter(p.characterId)?.traits ?? [],
      availabilityConditions: [],
    };
  }

  /**
   * Resolves an NPC by ID, dynamically overlaying runtime HP, map position, behavior overrides,
   * and inventory onto the static Content blueprint.
   */
  public getResolvedNpcCharacter(npcId: string): (CharacterDefinition & { credits?: number }) | undefined {
    const blueprint = this.contentRegistry.getCharacter(npcId);
    const runtime = this.state.npcs[npcId];
    if (!blueprint && !runtime) return undefined;
    if (blueprint?.availabilityConditions.length && !this.evaluateConditions(blueprint.availabilityConditions).allMet) return undefined;

    const base: CharacterDefinition = blueprint ?? {
      id: npcId,
      name: runtime?.npcId ?? 'Unknown NPC',
      description: 'Sector resident.',
      tags: ['NPC'],
      title: 'Resident',
      factionId: 'Neutral',
      isPlayer: false,
      isMerchant: runtime?.isMerchant ?? false,
      isCompanion: runtime?.isCompanion ?? false,
      level: 1,
      attributes: { body: 10, reflexes: 10, mind: 10, etherTech: 10, presence: 10 },
      skills: {},
      perks: [],
      temporaryModifiers: [],
      statusEffects: [],
      vitals: {
        maxHp: runtime?.maxHp ?? 25,
        currentHp: runtime?.currentHp ?? 25,
        maxEther: 0,
        currentEther: 0,
        actionPointsMax: 4,
        actionPointsCurrent: 4,
        initiative: 10,
        armorRating: 0,
        etherResistance: 0,
      },
      position: runtime?.position ?? { x: 0, y: 0 },
      facing: runtime?.facing ?? 'South',
      inventory: [],
      portraitIcon: 'User',
      defaultBehavior: (runtime?.behaviorOverride as any) ?? 'Idle',
      abilityIds: [],
      traits: [],
      availabilityConditions: [],
    };

    if (!runtime) return base;

    return {
      ...base,
      isMerchant: runtime.isMerchant ?? base.isMerchant,
      isCompanion: runtime.isCompanion ?? base.isCompanion,
      defaultBehavior: (runtime.behaviorOverride as any) ?? base.defaultBehavior,
      dialogueTreeId: runtime.dialogueTreeIdOverride ?? base.dialogueTreeId,
      position: { ...runtime.position },
      facing: runtime.facing ?? base.facing,
      vitals: {
        ...base.vitals,
        currentHp: runtime.currentHp,
        maxHp: runtime.maxHp ?? base.vitals.maxHp,
      },
      inventory: runtime.inventory ? runtime.inventory.items.map((slot) => ({ ...slot })) : base.inventory,
      credits: runtime.inventory?.credits ?? 0,
    };
  }

  // --- World & POI Navigation Architecture ---

  /**
   * Gets or initializes runtime state for a POI.
   */
  public getPoiRuntimeState(poiId: string): PoiRuntimeState {
    if (!this.state.world.pois[poiId]) {
      this.state.world.pois[poiId] = {
        poiId,
        status: 'Discovered',
        isDiscovered: true,
        isVisited: false,
        isLocked: false,
        completedActionIds: [],
        disabledActionIds: [],
        flags: {},
      };
    }
    return this.state.world.pois[poiId];
  }

  /**
   * Resolves a POI definition with its live runtime state, evaluated conditions, and action states.
   */
  public getResolvedPoi(poiId: string): ResolvedPOI | undefined {
    const blueprint = this.contentRegistry.getPOI(poiId);
    if (!blueprint) return undefined;

    const runtime = this.getPoiRuntimeState(poiId);

    // Evaluate visibility and availability
    const isVisible =
      !runtime.isLocked &&
      runtime.status !== 'Hidden' &&
      (blueprint.visibilityConditions.length === 0 ||
        this.evaluateConditions(blueprint.visibilityConditions).allMet);

    const isAvailable =
      isVisible &&
      (blueprint.availabilityConditions.length === 0 ||
        this.evaluateConditions(blueprint.availabilityConditions).allMet);

    // Resolve individual actions
    const resolvedActions = (blueprint.actions ?? []).map((action) => {
      const isCompleted = runtime.completedActionIds.includes(action.id);
      const isRepeatable = action.isRepeatable ?? true;
      const condResult = this.evaluateConditions(action.conditions ?? []);

      let isActionAvailable = isAvailable && condResult.allMet;
      if (!isRepeatable && isCompleted) {
        isActionAvailable = false;
      }

      // Check costs
      if (isActionAvailable && action.cost) {
        if (action.cost.ap && this.state.player.vitals.actionPointsCurrent < action.cost.ap) {
          isActionAvailable = false;
        }
        if (action.cost.ether && this.state.player.vitals.currentEther < action.cost.ether) {
          isActionAvailable = false;
        }
        if (action.cost.credits && this.state.player.inventory.credits < action.cost.credits) {
          isActionAvailable = false;
        }
      }

      return {
        ...action,
        isAvailable: isActionAvailable,
        isVisible: !action.hideIfUnavailable || isActionAvailable,
        unmetConditionReason: condResult.allMet ? undefined : condResult.failedConditions[0]?.reason,
        isCompleted,
      };
    });

    return {
      ...blueprint,
      description: runtime.customDescription ?? blueprint.description,
      image: runtime.customImage ?? blueprint.image,
      runtime,
      isVisible,
      isAvailable,
      isCurrentLocation: this.state.world.currentPoiId === poiId,
      resolvedActions,
    };
  }

  /**
   * Retrieves all POIs for the current active world map.
   */
  public getPoisForCurrentMap(): ResolvedPOI[] {
    const activeMap = this.contentRegistry.getMap(this.state.world.currentMapId);
    if (!activeMap) return [];

    const poiIds = activeMap.poiIds ?? [];
    return poiIds
      .map((id) => this.getResolvedPoi(id))
      .filter((poi): poi is ResolvedPOI => poi !== undefined && poi.isVisible);
  }

  /**
   * Inspects/Opens a POI screen without traveling or moving the player.
   */
  public openPoi(poiId: string): boolean {
    const poi = this.getResolvedPoi(poiId);
    if (!poi) {
      this.logJournal('World', `Unable to locate POI coordinate: [${poiId}].`);
      return false;
    }

    this.state.world.selectedPoiId = poiId;
    this.state.world.mode = 'POI';

    this.logJournal('World', `Inspecting location: ${poi.name}.`);
    this.events.emit('POI_OPENED', { poiId });
    this.events.emit('STATE_CHANGED', this.state);
    return true;
  }

  /**
   * Travels to a POI, updating the player's current location, marking it visited, and transitioning to POI Screen.
   */
  public travelToPoi(poiId: string): boolean {
    const poi = this.getResolvedPoi(poiId);
    if (!poi) {
      this.logJournal('World', `Navigation error: Target POI [${poiId}] not found.`);
      return false;
    }

    if (!poi.isAvailable) {
      this.logJournal('World', `Access denied: Location '${poi.name}' is currently unavailable or locked.`);
      return false;
    }

    const previousPoiId = this.state.world.currentPoiId;
    this.state.world.currentPoiId = poiId;
    this.state.world.selectedPoiId = poiId;
    this.state.world.mode = 'POI';

    // Mark visited
    const runtime = this.getPoiRuntimeState(poiId);
    runtime.isVisited = true;
    if (runtime.status !== 'Completed') {
      runtime.status = 'Visited';
    }

    // Resolve authored route/POI travel duration through the shared world clock.
    if (previousPoiId && previousPoiId !== poiId) {
      const map = this.contentRegistry.getMap(this.state.world.currentMapId);
      const route = map?.routes.find((candidate) => (candidate.fromPoiId === previousPoiId && candidate.toPoiId === poiId) || (candidate.bidirectional && candidate.fromPoiId === poiId && candidate.toPoiId === previousPoiId));
      this.worldTimeSystem.travel(this.state.time, route?.travelTimeMinutes ?? poi.travelTimeMinutes ?? map?.defaultTravelTimeMinutes ?? 30);
    }

    this.logJournal('World', `Arrived at ${poi.name} [${poi.district ?? 'Sector 09'}].`);
    this.events.emit('POI_TRAVELED', { poiId, mapId: this.state.world.currentMapId });
    this.events.emit('STATE_CHANGED', this.state);
    return true;
  }

  /**
   * Returns from POI Screen back to the District Map Screen.
   */
  public returnToMap(): void {
    this.state.world.selectedPoiId = null;
    this.state.world.mode = 'Map';

    this.logJournal('World', 'Returned to Sector Map overview.');
    this.events.emit('RETURNED_TO_MAP', { mapId: this.state.world.currentMapId });
    this.events.emit('STATE_CHANGED', this.state);
  }

  /**
   * Transitions to a different World / District Map.
   */
  public changeMap(mapId: string, defaultPoiId?: string): boolean {
    const targetMap = this.contentRegistry.getMap(mapId);
    if (!targetMap) {
      this.logJournal('World', `District link failed: Map [${mapId}] not found.`);
      return false;
    }

    this.state.world.currentMapId = mapId;
    if (!this.state.world.discoveredMapIds.includes(mapId)) {
      this.state.world.discoveredMapIds.push(mapId);
    }

    const targetPoi = defaultPoiId ?? targetMap.defaultPoiId ?? targetMap.poiIds?.[0];
    if (targetPoi) {
      this.state.world.currentPoiId = targetPoi;
      this.state.world.selectedPoiId = null;
    }

    this.state.world.mode = 'Map';
    this.logJournal('World', `Entered District: ${targetMap.name} (${targetMap.district}).`);
    this.events.emit('STATE_CHANGED', this.state);
    return true;
  }

  /**
   * Executes a data-driven POI Action through the unified PoiActionPipeline:
   * check Conditions → resolve checks → execute Effects → resolve Outcome → present next gameplay context.
   */
  public executePoiAction(
    poiId: string,
    actionId: string
  ): PoiActionPipelineResult {
    const poi = this.getResolvedPoi(poiId);
    if (!poi) {
      return {
        success: false,
        actionId,
        actionLabel: 'Unknown Action',
        resolution: {
          actionId,
          actionLabel: 'Unknown Action',
          title: 'Error',
          resultText: `POI '${poiId}' not found.`,
          status: 'Failure',
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
        },
        unmetReason: `POI '${poiId}' not found.`,
      };
    }

    const action = poi.resolvedActions.find((a) => a.id === actionId);
    if (!action) {
      return {
        success: false,
        actionId,
        actionLabel: 'Unknown Action',
        resolution: {
          actionId,
          actionLabel: 'Unknown Action',
          title: 'Error',
          resultText: `Action '${actionId}' not found on POI '${poi.name}'.`,
          status: 'Failure',
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
        },
        unmetReason: `Action '${actionId}' not found on POI '${poi.name}'.`,
      };
    }

    const result = this.poiActionPipeline.execute(
      poi,
      action,
      this.state,
      this.contentRegistry,
      (cat, txt) => this.logJournal(cat, txt)
    );

    this.events.emit('POI_ACTION_EXECUTED', {
      poiId,
      actionId,
      actionLabel: action.label,
      resolution: result.resolution,
    });
    this.events.emit('STATE_CHANGED', this.state);

    return result;
  }

  // --- Unified Gameplay Outcome & Presentation Lifecycle ---

  public resolveOutcome(outcome: GameplayOutcome): void {
    this.outcomeEngine.resolveOutcome(outcome, this.state, this.contentRegistry);
    this.reportTrace({ kind: 'OutcomeResolved', message: `Outcome resolved: ${outcome.type}`, details: { type: outcome.type } });
    this.events.emit('STATE_CHANGED', this.state);
  }

  public getActiveActionResolution(): ActionResolution | null {
    return this.outcomeEngine.getActiveActionResolution();
  }

  public dismissActionResolution(): void {
    const res = this.outcomeEngine.getActiveActionResolution();
    const nextOutcome = res?.nextOutcome ?? { type: 'returnToOrigin' };
    this.outcomeEngine.setActiveActionResolution(null);
    this.outcomeEngine.resolveOutcome(nextOutcome, this.state, this.contentRegistry);
    this.events.emit('STATE_CHANGED', this.state);
  }

  // --- Unified GameEvent Runtime Integration ---

  public startEvent(eventId: string, originContext?: OriginContext): boolean {
    const ok = this.eventRuntime.startEvent(
      eventId,
      this.state,
      this.contentRegistry,
      originContext,
      (cat, txt) => this.logJournal(cat, txt)
    );
    if (ok) {
      this.reportTrace({ kind: 'EventTransition', message: `Event started: ${eventId}`, details: { eventId, stepId: this.state.world.activeEventStepId } });
      this.events.emit('GAME_EVENT_TRIGGERED', { eventId });
      this.events.emit('STATE_CHANGED', this.state);
    }
    return ok;
  }

  public getAvailableEvents(): GameEvent[] {
    return this.contentRegistry.getAllEvents().filter((event) =>
      this.eventRuntime.canTriggerEvent(event, this.state, this.contentRegistry).allMet
    );
  }

  public getResolvedEventState(): ResolvedEventState | undefined {
    return this.eventRuntime.getResolvedEventState(this.state, this.contentRegistry);
  }

  public advanceEventStep(): boolean {
    const ok = this.eventRuntime.advanceStep(this.state, this.contentRegistry, (cat, txt) => this.logJournal(cat, txt));
    this.events.emit('STATE_CHANGED', this.state);
    return ok;
  }

  public chooseEventOption(choiceId: string): boolean {
    const ok = this.eventRuntime.chooseOption(choiceId, this.state, this.contentRegistry, (cat, txt) => this.logJournal(cat, txt));
    this.events.emit('STATE_CHANGED', this.state);
    return ok;
  }

  public completeEvent(): boolean {
    const eventId = this.state.world.activeEventId;
    if (!eventId) return false;
    const event = this.contentRegistry.getEvent(eventId);
    if (!event) return false;
    const ok = this.eventRuntime.completeEvent(event, this.state, this.contentRegistry, (cat, txt) => this.logJournal(cat, txt));
    this.events.emit('STATE_CHANGED', this.state);
    return ok;
  }

  // --- Combat Encounter & Resolution Lifecycle ---

  public startCombatEncounter(encounterId: string, previewFirst: boolean = true, originContext?: OriginContext): boolean {
    if (originContext) {
      this.state.world.activeOriginContext = originContext;
    }
    const outcome: GameplayOutcome = {
      type: 'combat',
      encounterId,
      previewFirst,
      originContext: this.state.world.activeOriginContext ?? undefined,
    };
    this.outcomeEngine.resolveOutcome(outcome, this.state, this.contentRegistry);
    this.events.emit('COMBAT_INITIATED', { enemyIds: [encounterId] });
    this.events.emit('STATE_CHANGED', this.state);
    return true;
  }

  public getCombatPreview(encounterId?: string): ResolvedCombatPreview | undefined {
    const id = encounterId ?? this.state.world.activeEncounterId;
    if (!id) return undefined;
    return this.combatEncounterEngine.getEncounterPreview(id, this.state, this.contentRegistry);
  }

  public attemptCombatEscape(encounterId?: string): { success: boolean; reason?: string } {
    const id = encounterId ?? this.state.world.activeEncounterId;
    if (!id) return { success: false, reason: 'No active combat encounter' };
    const res = this.combatEncounterEngine.attemptEscape(id, this.state, this.contentRegistry, (cat, txt) => this.logJournal(cat, txt));
    this.events.emit('STATE_CHANGED', this.state);
    return res;
  }

  public startTacticalCombat(encounterId?: string): boolean {
    const id = encounterId ?? this.state.world.activeEncounterId;
    if (!id) return false;
    const combat = this.turnBasedCombatEngine.createEncounter(id, this.state);
    const ok = combat !== undefined;
    if (combat) {
      this.state.world.activeEncounterId = id;
      this.state.world.mode = 'TacticalCombat';
      this.state.combat = combat;
      this.resolvePendingAiTurns();
    }
    if (ok) {
      this.reportTrace({ kind: 'CombatStarted', message: `Combat started: ${id}`, details: { encounterId: id } });
      this.events.emit('COMBAT_STATE_CHANGED', undefined);
      this.events.emit('STATE_CHANGED', this.state);
    }
    return ok;
  }

  public executeCombatAction(action: CombatAction): CombatCommandResult {
    let result = this.turnBasedCombatEngine.execute(this.state.combat, action);
    if (!result.success) return result;
    this.state.combat = result.state;

    // AI turns are resolved by the runtime; presentation never makes AI decisions.
    this.resolvePendingAiTurns();

    this.state.player.vitals.currentHp = this.state.combat.combatants[this.state.player.characterId]?.currentHp ?? this.state.player.vitals.currentHp;
    this.state.player.vitals.currentEther = this.state.combat.combatants[this.state.player.characterId]?.currentEther ?? this.state.player.vitals.currentEther;
    const outcome = this.state.combat.outcome;
    if (outcome === 'Victory') this.resolveCombatVictory(undefined, this.state.combat.roundNumber);
    if (outcome === 'Defeat') this.resolveCombatDefeat();
    this.events.emit('COMBAT_STATE_CHANGED', undefined);
    this.events.emit('STATE_CHANGED', this.state);
    return result;
  }

  private resolvePendingAiTurns(): void {
    let guard = 0;
    while (this.state.combat.isActive && guard < 50) {
      const activeId = this.state.combat.turnOrder[this.state.combat.activeTurnIndex];
      if (this.state.combat.combatants[activeId]?.team !== 'Enemy') break;
      const aiAction = this.turnBasedCombatEngine.chooseAIAction(this.state.combat);
      if (!aiAction) break;
      const aiResult = this.turnBasedCombatEngine.execute(this.state.combat, aiAction);
      if (!aiResult.success) break;
      this.state.combat = aiResult.state;
      guard += 1;
    }
  }

  public resolveCombatVictory(encounterId?: string, rounds: number = 3): CombatResolution | undefined {
    const id = encounterId ?? this.state.world.activeEncounterId;
    if (!id) return undefined;
    const res = this.combatEncounterEngine.resolveVictory(id, this.state, this.contentRegistry, rounds, (cat, txt) => this.logJournal(cat, txt));
    this.reportTrace({ kind: 'CombatCompleted', message: `Combat completed: victory in ${rounds} rounds`, details: { encounterId: id, outcome: 'Victory', rounds } });
    this.events.emit('STATE_CHANGED', this.state);
    return res;
  }

  public resolveCombatDefeat(encounterId?: string): CombatResolution | undefined {
    const id = encounterId ?? this.state.world.activeEncounterId;
    if (!id) return undefined;
    const res = this.combatEncounterEngine.resolveDefeat(id, this.state, this.contentRegistry, (cat, txt) => this.logJournal(cat, txt));
    this.reportTrace({ kind: 'CombatCompleted', message: 'Combat completed: defeat', details: { encounterId: id, outcome: 'Defeat' } });
    this.events.emit('STATE_CHANGED', this.state);
    return res;
  }

  public getActiveCombatResolution(): CombatResolution | null {
    return this.outcomeEngine.getActiveCombatResolution();
  }

  public takeLoot(itemIds: string[], takeCredits: boolean = true): boolean {
    const ok = this.combatEncounterEngine.takeLoot(itemIds, takeCredits, this.state, this.contentRegistry, (cat, txt) => this.logJournal(cat, txt));
    this.events.emit('STATE_CHANGED', this.state);
    return ok;
  }

  public executePostCombatAction(
    targetEnemyId: string,
    actionId: 'Search' | 'Restrain' | 'Capture' | 'Interrogate' | 'Release' | 'FinishOff'
  ): PostCombatResolution {
    const res = this.combatEncounterEngine.executePostCombatAction(
      targetEnemyId,
      actionId,
      this.state,
      this.contentRegistry,
      (cat, txt) => this.logJournal(cat, txt)
    );
    this.events.emit('STATE_CHANGED', this.state);
    return res;
  }

  public dismissCombatResult(): void {
    const res = this.outcomeEngine.getActiveCombatResolution();
    const nextOutcome = res?.nextOutcome ?? { type: 'returnToOrigin' };
    this.outcomeEngine.setActiveCombatResolution(null);
    this.outcomeEngine.resolveOutcome(nextOutcome, this.state, this.contentRegistry);
    this.events.emit('STATE_CHANGED', this.state);
  }

  // --- Save / Load & Migration Lifecycle ---

  public createSaveGame(slotName: string = 'Autosave'): SaveGame {
    const activeQuestCount = Object.values(this.state.quests).filter((q) => q.status === 'Active').length;
    return {
      metadata: {
        saveId: `save_${Date.now()}`,
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
        slotName,
        playerName: this.state.player.name,
        playerLevel: this.state.player.level,
        currentMapId: this.state.world.currentMapId,
        playtimeSeconds: this.state.time.elapsedRealSeconds ?? 0,
        activeQuestCount,
      },
      state: JSON.parse(JSON.stringify(this.state)),
    };
  }

  public serializeSave(pretty: boolean = true): string {
    const saveObj = this.createSaveGame();
    return serializeSaveGame(saveObj, pretty);
  }

  public loadSave(jsonOrSave: string | SaveGame): SaveLoadResult {
    const result = deserializeSaveGame(jsonOrSave);
    if (result.success && result.saveGame) {
      this.state = result.saveGame.state;
      this.inventorySystem.hydrate(this.state);
      this.events.emit('STATE_CHANGED', this.state);
      this.logJournal('System', `Game session loaded successfully (Schema v${result.saveGame.metadata.schemaVersion}).`, {
        migrated: result.migrated,
        appliedMigrations: result.appliedMigrations,
      });
    }
    return result;
  }

  // --- Journal & Mode Controls ---

  public logJournal(category: GameJournalEntry['category'], text: string, metadata?: Record<string, any>): void {
    const entry: GameJournalEntry = {
      id: `j_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      category,
      text,
      metadata,
    };
    this.state.journal.unshift(entry);
    if (this.state.journal.length > 100) {
      this.state.journal.pop();
    }
    this.events.emit('JOURNAL_LOGGED', entry);
    this.events.emit('STATE_CHANGED', this.state);
  }

  public setMode(mode: GameMode): void {
    this.state.world.mode = mode;
    this.events.emit('MODE_CHANGED', mode);
    this.events.emit('STATE_CHANGED', this.state);
  }

  // --- Dialogue Flow ---

  public startDialogue(treeId: string): boolean {
    const tree = this.contentRegistry.getDialogue(treeId);
    if (!tree) {
      this.logJournal('Dialogue', `Failed to open dialogue stream [${treeId}]: Tree not found.`);
      return false;
    }

    const rootNode = tree.nodes[tree.rootNodeId];
    if (!rootNode) return false;

    this.state.world.activeDialogueTreeId = treeId;
    this.state.world.activeDialogueNodeId = tree.rootNodeId;
    this.state.world.mode = 'Dialogue';

    this.logJournal('Dialogue', `Comm link established with: ${rootNode.speakerName}.`);
    this.events.emit('DIALOGUE_NODE_CHANGED', { treeId, node: rootNode });
    this.events.emit('STATE_CHANGED', this.state);
    return true;
  }

  public chooseDialogueOption(choice: DialogueChoice): boolean {
    const activeTreeId = this.state.world.activeDialogueTreeId;
    if (!activeTreeId) return false;

    const tree = this.contentRegistry.getDialogue(activeTreeId);
    if (!tree) return false;

    // 1. Resolve stat checks if required
    if (choice.requirement) {
      const resolution = resolveStatCheck(
        choice.requirement.stat,
        this.state.player.attributes,
        choice.requirement.difficulty,
        this.diceRoller,
        choice.requirement.customDc
      );

      this.events.emit('STAT_CHECK_TRIGGERED', resolution);
      this.logJournal('SkillCheck', resolution.logSummary);

      if (!resolution.isPassed) {
        this.logJournal('Dialogue', `Skill check failed. Comm connection terminated.`);
        this.endDialogue();
        return false;
      }
    }

    // 2. Ether cost deduction
    if (choice.costEther && choice.costEther > 0) {
      if (this.state.player.vitals.currentEther < choice.costEther) {
        this.logJournal('EtherTech', `Insufficient Ether conduit. Required: ${choice.costEther}, Available: ${this.state.player.vitals.currentEther}`);
        return false;
      }
      this.state.player.vitals.currentEther -= choice.costEther;
      this.logJournal('EtherTech', `Channelled ${choice.costEther} Ether for neural manipulation.`);
    }

    // 3. Credits cost deduction
    if (choice.costCredits && choice.costCredits > 0) {
      if (this.state.player.inventory.credits < choice.costCredits) {
        this.logJournal('World', `Insufficient credits. Required: ${choice.costCredits}, Available: ${this.state.player.inventory.credits}`);
        return false;
      }
      this.state.player.inventory.credits -= choice.costCredits;
      this.logJournal('World', `Paid ${choice.costCredits} credits.`);
    }

    // 4. Set Flag if present
    if (choice.setFlag) {
      this.state.world.flags[choice.setFlag.key] = choice.setFlag.value;
      this.logJournal('World', `World flag updated: ${choice.setFlag.key} = ${choice.setFlag.value}`);
    }

    // 5. Advance to next node or end dialogue
    if (!choice.targetNodeId) {
      this.endDialogue();
      return true;
    }

    const nextNode = tree.nodes[choice.targetNodeId];
    if (!nextNode) {
      this.endDialogue();
      return true;
    }

    this.state.world.activeDialogueNodeId = choice.targetNodeId;
    this.events.emit('DIALOGUE_NODE_CHANGED', { treeId: activeTreeId, node: nextNode });
    this.events.emit('STATE_CHANGED', this.state);
    return true;
  }

  public endDialogue(): void {
    this.state.world.activeDialogueTreeId = null;
    this.state.world.activeDialogueNodeId = null;
    this.state.world.mode = this.state.world.selectedPoiId ? 'POI' : 'Map';
    this.logJournal('Dialogue', 'Comm link closed.');
    this.events.emit('DIALOGUE_ENDED', undefined);
    this.events.emit('STATE_CHANGED', this.state);
  }

  // --- Conditions, Effects & Actions Pipeline ---

  public evaluateCondition(condition: Condition): ConditionEvaluationResult {
    return evaluateCondition(
      condition,
      {
        state: this.state,
        contentRegistry: this.contentRegistry,
      },
      this.conditionRegistry
    );
  }

  public evaluateConditions(conditions: Condition[]): BatchConditionResult {
    return evaluateConditions(
      conditions,
      {
        state: this.state,
        contentRegistry: this.contentRegistry,
      },
      this.conditionRegistry
    );
  }

  public executeEffect(effect: Effect): EffectExecutionResult {
    const result = this.effectExecutor.execute(effect, {
      state: this.state,
      contentRegistry: this.contentRegistry,
    });
    if (result.success && result.message) {
      this.logJournal('System', result.message);
    }
    this.events.emit('STATE_CHANGED', this.state);
    return result;
  }

  private reportTrace(event: RuntimeTraceEvent): void {
    this.trace?.(event);
    this.events.emit('RUNTIME_TRACED', event);
  }

  public executeEffects(effects: Effect[]): BatchEffectExecutionResult {
    const batchResult = this.effectExecutor.executeBatch(effects, {
      state: this.state,
      contentRegistry: this.contentRegistry,
    });
    for (const res of batchResult.results) {
      if (res.success && res.message) {
        this.logJournal('System', res.message);
      }
    }
    this.events.emit('STATE_CHANGED', this.state);
    return batchResult;
  }

  public executeAction(action: ActionDefinition): ActionExecutionResult {
    const result = this.actionExecutor.execute(action, {
      state: this.state,
      contentRegistry: this.contentRegistry,
    });

    if (result.success) {
      this.logJournal('System', `Action executed: ${action.name}`);
      this.events.emit('ACTION_EXECUTED', {
        actionId: action.id,
        actionName: action.name,
        effectResults: result.effectResults!,
      });
      this.events.emit('STATE_CHANGED', this.state);
    } else {
      this.logJournal('System', `Action failed: ${action.name} - ${result.reason ?? 'Unknown error'}`);
    }

    return result;
  }
}
