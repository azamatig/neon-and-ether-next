/**
 * @neon-ether/game-runtime
 * Combat Encounter & Pre-Combat Preview Engine.
 * Handles: Encounter Preview → Tactical Combat → Combat Resolution → Loot Phase → Post-Combat Decisions → Outcome Pipeline.
 */

import {
  CombatEncounter,
  CombatIncapacitatedEnemy,
  CombatResolution,
  CombatResolvedEnemy,
  CombatState,
  Enemy,
  EscapeRules,
  GameplayOutcome,
  InventoryItemSlot,
  OriginContext,
  PostCombatActionDefinition,
  PostCombatResolution,
} from '@neon-ether/game-schema';
import { DiceRoller, type RandomSource } from '@neon-ether/engine';
import { InventorySystem } from '../inventory/inventory-system.ts';
import { GameState } from '../state/game-state.ts';
import { ContentRegistry } from '../content/content-registry.ts';
import { evaluateConditions } from '../conditions/condition-evaluator.ts';
import { ConditionRegistry, defaultConditionRegistry } from '../conditions/condition-registry.ts';
import { EffectExecutor, defaultEffectExecutor } from '../effects/effect-executor.ts';
import { GameplayOutcomeEngine, defaultGameplayOutcomeEngine } from '../resolution/gameplay-outcome-engine.ts';
import { resolveStatCheck, StatCheckResolution } from '../resolution/stat-check.ts';

export interface PreCombatPartyMember {
  id: string;
  name: string;
  title: string;
  portrait: string;
  currentHp: number;
  maxHp: number;
  currentEther: number;
  maxEther: number;
  actionPoints: number;
  statusEffects: string[];
  injuries: string[];
}

export interface PreCombatEnemyUnit {
  id: string;
  enemyId: string;
  name: string;
  count: number;
  threatTier: 'Minion' | 'Standard' | 'Elite' | 'Boss';
  isBoss: boolean;
  isUnknown: boolean;
  portrait: string;
  estimatedHp: number;
}

export interface ResolvedCombatPreview {
  encounter: CombatEncounter;
  party: PreCombatPartyMember[];
  enemies: PreCombatEnemyUnit[];
  environment: {
    ambientEtherLevel: number;
    lighting: string;
    hazardDescription?: string;
  };
  threatLevel: number;
  escape: {
    allowed: boolean;
    disabledReason?: string;
    checkInfo?: {
      stat: string;
      difficulty: number;
      apCost: number;
    };
  };
  originContext?: OriginContext | null;
}

export class CombatEncounterEngine {
  private conditionRegistry: ConditionRegistry;
  private effectExecutor: EffectExecutor;
  private outcomeEngine: GameplayOutcomeEngine;
  private diceRoller: RandomSource;

  constructor(
    conditionRegistry: ConditionRegistry = defaultConditionRegistry,
    effectExecutor: EffectExecutor = defaultEffectExecutor,
    outcomeEngine: GameplayOutcomeEngine = defaultGameplayOutcomeEngine,
    diceRoller: RandomSource = new DiceRoller(1337)
  ) {
    this.conditionRegistry = conditionRegistry;
    this.effectExecutor = effectExecutor;
    this.outcomeEngine = outcomeEngine;
    this.diceRoller = diceRoller;
  }

  /**
   * Builds rich, pre-computed pre-combat encounter preview data.
   */
  public getEncounterPreview(
    encounterId: string,
    state: GameState,
    contentRegistry: ContentRegistry,
    resolvedCombat?: CombatState,
  ): ResolvedCombatPreview | undefined {
    const encounter = contentRegistry.getEncounter(encounterId);
    if (!encounter) return undefined;

    const roster = Object.values(resolvedCombat?.combatants ?? {});
    const party: PreCombatPartyMember[] = roster.filter((unit) => unit.team === 'Player').map((unit) => {
      const npc = contentRegistry.getNPC(unit.sourceId);
      return { id: unit.id, name: unit.name, title: unit.sourceId === state.player.characterId ? state.player.title : npc?.title ?? 'Companion', portrait: npc?.portraitIcon ?? 'User', currentHp: unit.currentHp, maxHp: unit.maxHp, currentEther: unit.currentEther, maxEther: unit.maxEther, actionPoints: unit.currentAp, statusEffects: unit.statuses.map((status) => contentRegistry.getStatusEffect(status.statusEffectId)?.name ?? status.statusEffectId), injuries: [] };
    });
    const enemies: PreCombatEnemyUnit[] = roster.filter((unit) => unit.team === 'Enemy').map((unit) => {
      const definition = contentRegistry.getEnemy(unit.sourceId);
      const group = encounter.enemyGroups.find((entry) => entry.enemyId === unit.sourceId);
      return { id: unit.id, enemyId: unit.sourceId, name: group?.isUnknown ? 'Unknown Threat' : unit.name, count: 1, threatTier: group?.threatTier ?? 'Standard', isBoss: group?.isBoss ?? false, isUnknown: group?.isUnknown ?? false, portrait: group?.portraitOverride ?? definition?.portraitIcon ?? 'Bot', estimatedHp: unit.maxHp };
    });

    // Evaluate Escape Rules
    const escapeRules = encounter.escapeRules;
    let escapeAllowed = escapeRules.allowed;
    let disabledReason = escapeRules.disabledReason;

    if (escapeAllowed && escapeRules.conditions && escapeRules.conditions.length > 0) {
      const condRes = evaluateConditions(
        escapeRules.conditions,
        { state, contentRegistry, rollRandom:(min,max)=>this.diceRoller.integer(min,max) },
        this.conditionRegistry
      );
      if (!condRes.allMet) {
        escapeAllowed = false;
        disabledReason = condRes.failedConditions[0]?.reason ?? 'Escape route blocked.';
      }
    }

    return {
      encounter,
      party,
      enemies,
      environment: encounter.environment,
      threatLevel: encounter.threatLevel,
      escape: {
        allowed: escapeAllowed,
        disabledReason,
        checkInfo: escapeRules.check
          ? {
              stat: escapeRules.check.stat.toUpperCase(),
              difficulty: escapeRules.check.difficulty,
              apCost: escapeRules.check.apCost,
            }
          : undefined,
      },
      originContext: state.world.activeOriginContext,
    };
  }

  /**
   * Attempts to retreat / escape from the encounter.
   */
  public attemptEscape(
    encounterId: string,
    state: GameState,
    contentRegistry: ContentRegistry,
    logJournal?: (category: any, text: string) => void
  ): { success: boolean; reason?: string; statCheck?: StatCheckResolution } {
    const preview = this.getEncounterPreview(encounterId, state, contentRegistry, state.combat.encounterId === encounterId ? state.combat : undefined);
    if (!preview) return { success: false, reason: 'Encounter not found' };

    if (!preview.escape.allowed) {
      return { success: false, reason: preview.escape.disabledReason ?? 'Escape is impossible from this encounter.' };
    }

    const escapeRules = preview.encounter.escapeRules;

    // Deduct AP if required
    if (escapeRules.check?.apCost && state.player.vitals) {
      state.player.vitals.actionPointsCurrent = Math.max(
        0,
        state.player.vitals.actionPointsCurrent - escapeRules.check.apCost
      );
    }

    // Run skill check if required
    let statCheck: StatCheckResolution | undefined;
    if (escapeRules.check) {
      statCheck = resolveStatCheck(
        escapeRules.check.stat.toUpperCase() as any,
        state.player.attributes,
        'Moderate',
        this.diceRoller,
        escapeRules.check.difficulty,
        'Tactical Escape'
      );

      if (logJournal) {
        logJournal('SkillCheck', statCheck.logSummary);
      }

      if (!statCheck.isPassed) {
        if (logJournal) {
          logJournal('Combat', 'Escape route cutoff by hostiles! Forced to engage.');
        }
        return { success: false, reason: 'Escape check failed.', statCheck };
      }
    }

    if (logJournal) {
      logJournal('World', 'Successfully disengaged and retreated from combat encounter.');
    }

    // Execute escape outcome or return to origin
    const outcome = escapeRules.outcomeOnEscape ?? { type: 'returnToOrigin' };
    this.outcomeEngine.resolveOutcome(outcome, state, contentRegistry);

    return { success: true, statCheck };
  }

  /**
   * Starts the tactical grid combat session.
   */
  public startCombat(encounterId: string, state: GameState, contentRegistry: ContentRegistry): boolean {
    const encounter = contentRegistry.getEncounter(encounterId);
    if (!encounter) return false;

    state.world.activeEncounterId = encounterId;
    state.world.mode = 'TacticalCombat';
    state.combat.isActive = true;
    state.combat.roundNumber = 1;

    return true;
  }

  /**
   * Resolves combat victory, generating deterministic rewards, casualties, and surviving enemies.
   */
  public resolveVictory(
    encounterId: string,
    state: GameState,
    contentRegistry: ContentRegistry,
    roundsPlayed: number = 3,
    logJournal?: (category: any, text: string) => void
  ): CombatResolution {
    this.outcomeEngine.bindState(state);
    const encounter = contentRegistry.getEncounter(encounterId);
    const encounterName = encounter?.name ?? 'Hostile Encounter';

    // 1. Calculate XP
    const xpReward = encounter?.xpReward ?? 0;
    this.effectExecutor.execute({ type:'grantRewards', xp:xpReward, credits:0, items:[], skillXp:{}, perkPoints:0 }, { state, contentRegistry, logJournal,random:this.diceRoller });

    // 2. Generate Loot from drops
    const availableLoot: InventoryItemSlot[] = [];
    if (encounter?.lootTable) {
      for (const drop of encounter.lootTable) {
        if (this.diceRoller.chance(drop.dropRate)) {
          const qty = this.diceRoller.integer(drop.minQuantity,drop.maxQuantity);
          availableLoot.push({
            itemId: drop.itemId,
            quantity: qty,
            isEquipped: false,
          });
        }
      }
    }

    // Random Credits reward
    const minCred = encounter?.creditsReward.min ?? 60;
    const maxCred = encounter?.creditsReward.max ?? 180;
    const creditsFound = this.diceRoller.integer(minCred,maxCred);

    // 3. Project the tactical outcome; never regenerate or invent survivors here.
    const enemyCasualties: { enemyId: string; name: string; count: number }[] = [];
    const incapacitatedEnemies: CombatIncapacitatedEnemy[] = [];
    const deadEnemies: CombatResolvedEnemy[] = [];
    const surrenderedEnemies: CombatResolvedEnemy[] = [];
    const escapedEnemies: CombatResolvedEnemy[] = [];
    const destroyedEnemies: CombatResolvedEnemy[] = [];
    const enemies = Object.values(state.combat.combatants).filter((combatant) => combatant.team === 'Enemy');
    for (const combatant of enemies) {
      const enemyDef = contentRegistry.getEnemy(combatant.sourceId);
      const resolved = { id: combatant.id, enemyId: combatant.sourceId, name: combatant.name, portrait: enemyDef?.portraitIcon };
      const resolutionState = combatant.resolutionState === 'Alive' && combatant.isDefeated
        ? enemyDef?.tags.includes('Mechanical') ? 'Destroyed' : combatant.defeatType === 'NonLethal' ? 'Incapacitated' : 'Dead'
        : combatant.resolutionState;
      if (resolutionState === 'Dead') deadEnemies.push(resolved);
      if (resolutionState === 'Destroyed') destroyedEnemies.push(resolved);
      if (resolutionState === 'Escaped') escapedEnemies.push(resolved);
      if (resolutionState === 'Surrendered') surrenderedEnemies.push(resolved);
      if ((resolutionState === 'Incapacitated' || resolutionState === 'Surrendered') && enemyDef?.tags.includes('HasMind')) {
        incapacitatedEnemies.push({ ...resolved, status: resolutionState, canBeInterrogated: true, canBeCaptured: true, canBeSearched: true });
      }
    }
    const casualtiesByEnemy = new Map<string, { enemyId: string; name: string; count: number }>();
    for (const enemy of [...deadEnemies, ...destroyedEnemies]) {
      const casualty = casualtiesByEnemy.get(enemy.enemyId);
      if (casualty) casualty.count += 1;
      else casualtiesByEnemy.set(enemy.enemyId, { enemyId: enemy.enemyId, name: enemy.name, count: 1 });
    }
    enemyCasualties.push(...casualtiesByEnemy.values());

    const resolution: CombatResolution = {
      encounterId,
      encounterName,
      victoryStatus: 'Victory',
      roundsPlayed,
      xpGained: xpReward,
      playerXp: xpReward,
      companionXp: {},
      partyInjuries: [],
      playerStatusEffects: [],
      unconsciousCompanions: [],
      deadCompanions: [],
      enemyCasualties,
      incapacitatedEnemies,
      deadEnemies,
      surrenderedEnemies,
      escapedEnemies,
      destroyedEnemies,
      resourcesFound: { techScrap: 12, etherCells: 4 },
      availableLoot,
      creditsFound,
      questProgressSummaries: ['Encounter eliminated. Sector secured.'],
      logEntries: [`Victory achieved in ${roundsPlayed} combat rounds.`],
      originContext: state.world.activeOriginContext ?? undefined,
      nextOutcome: encounter?.victoryOutcome,
    };

    state.combat.isActive = false;
    this.outcomeEngine.setActiveCombatResolution(resolution);
    state.world.mode = 'CombatResult';

    if (logJournal) {
      logJournal('Combat', `Combat Victory: ${encounterName} (+${xpReward} XP, +${creditsFound} ¢).`);
    }

    return resolution;
  }

  /**
   * Resolves combat defeat, executing data-driven defeat outcome (rescue, captured, hospital, etc.).
   */
  public resolveDefeat(
    encounterId: string,
    state: GameState,
    contentRegistry: ContentRegistry,
    logJournal?: (category: any, text: string) => void
  ): CombatResolution {
    this.outcomeEngine.bindState(state);
    const encounter = contentRegistry.getEncounter(encounterId);
    const encounterName = encounter?.name ?? 'Hostile Encounter';

    // Restore minimal vitals to prevent stuck 0 HP states
    if (state.player.vitals) {
      state.player.vitals.currentHp = Math.max(5, Math.floor(state.player.vitals.maxHp * 0.2));
      state.player.vitals.currentEther = Math.max(5, Math.floor(state.player.vitals.maxEther * 0.2));
    }

    const resolution: CombatResolution = {
      encounterId,
      encounterName,
      victoryStatus: 'Defeat',
      roundsPlayed: 2,
      xpGained: 20,
      playerXp: 20,
      companionXp: {},
      partyInjuries: ['Severe Neural Trauma', 'Compromised Cyberware'],
      playerStatusEffects: ['Concussed'],
      unconsciousCompanions: [],
      deadCompanions: [],
      enemyCasualties: [],
      incapacitatedEnemies: [],
      deadEnemies: [],
      surrenderedEnemies: [],
      escapedEnemies: [],
      destroyedEnemies: [],
      resourcesFound: {},
      availableLoot: [],
      creditsFound: 0,
      questProgressSummaries: ['Combat squad compromised.'],
      logEntries: ['Squad vitals breached. Strategic retreat initiated.'],
      originContext: state.world.activeOriginContext ?? undefined,
      nextOutcome: encounter?.defeatOutcome ?? { type: 'returnToOrigin' },
    };

    state.combat.isActive = false;
    this.outcomeEngine.setActiveCombatResolution(resolution);
    state.world.mode = 'CombatResult';

    if (logJournal) {
      logJournal('Combat', `Combat Defeat: Squad incapacitated at ${encounterName}.`);
    }

    return resolution;
  }

  /**
   * Transfers selected loot items and credits to player inventory during the Loot Phase.
   */
  public takeLoot(
    selectedItemIds: string[],
    takeAllCredits: boolean,
    state: GameState,
    contentRegistry: ContentRegistry,
    logJournal?: (category: any, text: string) => void
  ): boolean {
    this.outcomeEngine.bindState(state);
    const activeRes = this.outcomeEngine.getActiveCombatResolution();
    if (!activeRes) return false;

    // Transfer Credits
    if (takeAllCredits && activeRes.creditsFound > 0) {
      const credits = activeRes.creditsFound;
      this.effectExecutor.execute({ type:'grantRewards', xp:0, credits, items:[], skillXp:{}, perkPoints:0 }, { state, contentRegistry, logJournal,random:this.diceRoller });
      if (logJournal) logJournal('World', `Looted ${credits} credits.`);
      activeRes.creditsFound = 0;
    }

    // Transfer Selected Items
    const remainingLoot: InventoryItemSlot[] = [];
    for (const slot of activeRes.availableLoot) {
      if (selectedItemIds.includes(slot.itemId)) {
        const transfer = new InventorySystem(contentRegistry).add(state.player.inventory, slot.itemId, slot.quantity);
        if (!transfer.success) { remainingLoot.push(slot); continue; }
        const itemDef = contentRegistry.getItem(slot.itemId);
        if (logJournal) logJournal('World', `Looted: ${itemDef?.name ?? slot.itemId} ×${slot.quantity}.`);
      } else {
        remainingLoot.push(slot);
      }
    }

    activeRes.availableLoot = remainingLoot;
    return true;
  }

  /**
   * Executes contextual actions on surviving incapacitated enemies (Search, Restrain, Capture, Interrogate, Release, Finish Off).
   */
  public executePostCombatAction(
    targetEnemyId: string,
    actionId: 'Search' | 'Restrain' | 'Capture' | 'Interrogate' | 'Release' | 'FinishOff',
    state: GameState,
    contentRegistry: ContentRegistry,
    logJournal?: (category: any, text: string) => void
  ): PostCombatResolution {
    this.outcomeEngine.bindState(state);
    const activeRes = this.outcomeEngine.getActiveCombatResolution();
    const targetEnemy = activeRes?.incapacitatedEnemies.find((e) => e.id === targetEnemyId);
    const enemyName = targetEnemy?.name ?? 'Hostile Survivor';

    let summaryText = '';
    switch (actionId) {
      case 'Search':
        summaryText = `Searched ${enemyName} for recoverable equipment.`;
        const searchableDrop = targetEnemy
          ? contentRegistry.getEnemy(targetEnemy.enemyId)?.lootTable[0]
          : undefined;
        if (searchableDrop) {
          state.player.inventory.items.push({
            itemId: searchableDrop.itemId,
            quantity: searchableDrop.minQuantity,
            isEquipped: false,
          });
        }
        if (targetEnemy) targetEnemy.canBeSearched = false;
        break;

      case 'Restrain':
        summaryText = `Applied magnetic restraints to ${enemyName}. Target secured.`;
        if (targetEnemy) {
          targetEnemy.status = 'Restrained';
        }
        break;

      case 'Capture':
        summaryText = `Target ${enemyName} registered into safehouse containment protocol.`;
        state.world.flags[`prisoner_${targetEnemyId}`] = true;
        if (targetEnemy) targetEnemy.canBeCaptured = false;
        break;

      case 'Interrogate':
        summaryText = `Interrogated ${enemyName}. Intelligence obtained: ${targetEnemy?.intelAvailable ?? 'Syndicate patrol routes revealed.'}`;
        state.world.flags[`intel_${targetEnemyId}`] = true;
        if (targetEnemy) targetEnemy.canBeInterrogated = false;
        break;

      case 'Release':
        summaryText = `Released ${enemyName}. Faction hostility decreased.`;
        if (activeRes) {
          activeRes.incapacitatedEnemies = activeRes.incapacitatedEnemies.filter((e) => e.id !== targetEnemyId);
        }
        break;

      case 'FinishOff':
        summaryText = `Terminated ${enemyName}. Threat neutralized.`;
        if (activeRes) {
          activeRes.incapacitatedEnemies = activeRes.incapacitatedEnemies.filter((e) => e.id !== targetEnemyId);
        }
        break;
    }

    if (logJournal) {
      logJournal('Combat', summaryText);
    }

    return {
      targetEnemyId,
      targetEnemyName: enemyName,
      actionId,
      actionLabel: actionId,
      summaryText,
      effectsApplied: [],
    };
  }
}

export const defaultCombatEncounterEngine = new CombatEncounterEngine();
