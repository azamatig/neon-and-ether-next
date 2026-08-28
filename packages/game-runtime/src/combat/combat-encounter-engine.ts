/**
 * @neon-ether/game-runtime
 * Combat Encounter & Pre-Combat Preview Engine.
 * Handles: Encounter Preview → Tactical Combat → Combat Resolution → Loot Phase → Post-Combat Decisions → Outcome Pipeline.
 */

import {
  CombatEncounter,
  CombatIncapacitatedEnemy,
  CombatResolution,
  Enemy,
  EscapeRules,
  GameplayOutcome,
  InventoryItemSlot,
  OriginContext,
  PostCombatActionDefinition,
  PostCombatResolution,
} from '@neon-ether/game-schema';
import { DiceRoller } from '@neon-ether/engine';
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
  private diceRoller: DiceRoller;

  constructor(
    conditionRegistry: ConditionRegistry = defaultConditionRegistry,
    effectExecutor: EffectExecutor = defaultEffectExecutor,
    outcomeEngine: GameplayOutcomeEngine = defaultGameplayOutcomeEngine,
    diceRoller: DiceRoller = new DiceRoller(1337)
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
    contentRegistry: ContentRegistry
  ): ResolvedCombatPreview | undefined {
    const encounter = contentRegistry.getEncounter(encounterId);
    if (!encounter) return undefined;

    // Build Player Side
    const p = state.player;
    const playerPartyMember: PreCombatPartyMember = {
      id: p.characterId,
      name: p.name,
      title: p.title,
      portrait: 'User',
      currentHp: p.vitals.currentHp,
      maxHp: p.vitals.maxHp,
      currentEther: p.vitals.currentEther,
      maxEther: p.vitals.maxEther,
      actionPoints: p.vitals.actionPointsCurrent,
      statusEffects: p.activeStatusEffects.map((s) => s.name),
      injuries: p.vitals.currentHp < p.vitals.maxHp * 0.4 ? ['Light Concussion', 'Fractured Plating'] : [],
    };

    const party: PreCombatPartyMember[] = [playerPartyMember];

    // Build active companions
    for (const compId of state.companions ?? []) {
      const compNpc = contentRegistry.getNPC(compId);
      const runtime = state.npcs[compId];
      if (compNpc) {
        party.push({
          id: compId,
          name: compNpc.name,
          title: compNpc.title ?? 'Companion',
          portrait: compNpc.portraitIcon ?? 'Users',
          currentHp: runtime?.currentHp ?? 28,
          maxHp: runtime?.maxHp ?? 28,
          currentEther: runtime?.currentEther ?? 20,
          maxEther: 20,
          actionPoints: 6,
          statusEffects: [],
          injuries: [],
        });
      }
    }

    // Build Enemy Side
    const enemies: PreCombatEnemyUnit[] = encounter.enemyGroups.map((group, idx) => {
      const enemyDef = contentRegistry.getEnemy(group.enemyId);
      return {
        id: `eg_${idx}_${group.enemyId}`,
        enemyId: group.enemyId,
        name: group.isUnknown ? 'Unknown Threat' : group.nameOverride ?? enemyDef?.name ?? 'Hostile Unit',
        count: group.count,
        threatTier: group.threatTier,
        isBoss: group.isBoss,
        isUnknown: group.isUnknown,
        portrait: group.portraitOverride ?? enemyDef?.portraitIcon ?? 'Bot',
        estimatedHp: group.customHp ?? enemyDef?.vitals.maxHp ?? 25,
      };
    });

    // Evaluate Escape Rules
    const escapeRules = encounter.escapeRules;
    let escapeAllowed = escapeRules.allowed;
    let disabledReason = escapeRules.disabledReason;

    if (escapeAllowed && escapeRules.conditions && escapeRules.conditions.length > 0) {
      const condRes = evaluateConditions(
        escapeRules.conditions,
        { state, contentRegistry },
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
    const preview = this.getEncounterPreview(encounterId, state, contentRegistry);
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
    const encounter = contentRegistry.getEncounter(encounterId);
    const encounterName = encounter?.name ?? 'Hostile Encounter';

    // 1. Calculate XP
    const xpReward = encounter?.xpReward ?? 120;
    state.player.experience += xpReward;

    // 2. Generate Loot from drops
    const availableLoot: InventoryItemSlot[] = [];
    if (encounter?.lootTable) {
      for (const drop of encounter.lootTable) {
        if (Math.random() <= drop.dropRate) {
          const qty = Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1)) + drop.minQuantity;
          availableLoot.push({
            itemId: drop.itemId,
            quantity: qty,
            isEquipped: false,
          });
        }
      }
    }

    // Always ensure at least some tactical loot if table empty
    if (availableLoot.length === 0) {
      availableLoot.push({ itemId: 'con_ether_vial', quantity: 2, isEquipped: false });
    }

    // Random Credits reward
    const minCred = encounter?.creditsReward.min ?? 60;
    const maxCred = encounter?.creditsReward.max ?? 180;
    const creditsFound = Math.floor(Math.random() * (maxCred - minCred + 1)) + minCred;

    // 3. Enemy casualties and surviving incapacitated enemies
    const enemyCasualties: { enemyId: string; name: string; count: number }[] = [];
    const incapacitatedEnemies: CombatIncapacitatedEnemy[] = [];

    if (encounter?.enemyGroups) {
      for (let i = 0; i < encounter.enemyGroups.length; i++) {
        const grp = encounter.enemyGroups[i];
        const enemyDef = contentRegistry.getEnemy(grp.enemyId);
        const name = grp.nameOverride ?? enemyDef?.name ?? 'Hostile Raider';

        enemyCasualties.push({
          enemyId: grp.enemyId,
          name,
          count: grp.count,
        });

        // Chance of an incapacitated/surrendered survivor if humanoid
        if (i === 0) {
          incapacitatedEnemies.push({
            id: `inc_${grp.enemyId}_01`,
            enemyId: grp.enemyId,
            name: `${name} Squad Leader`,
            portrait: enemyDef?.portraitIcon ?? 'User',
            status: 'Incapacitated',
            canBeInterrogated: true,
            canBeCaptured: true,
            canBeSearched: true,
            intelAvailable: 'Encrypted Syndicate frequency chip recovered.',
          });
        }
      }
    }

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
    const activeRes = this.outcomeEngine.getActiveCombatResolution();
    if (!activeRes) return false;

    // Transfer Credits
    if (takeAllCredits && activeRes.creditsFound > 0) {
      state.player.inventory.credits = (state.player.inventory.credits ?? 0) + activeRes.creditsFound;
      if (logJournal) logJournal('World', `Looted ${activeRes.creditsFound} credits.`);
      activeRes.creditsFound = 0;
    }

    // Transfer Selected Items
    const remainingLoot: InventoryItemSlot[] = [];
    for (const slot of activeRes.availableLoot) {
      if (selectedItemIds.includes(slot.itemId)) {
        // Add to player inventory
        const existing = state.player.inventory.items.find((i) => i.itemId === slot.itemId && !i.isEquipped);
        if (existing) {
          existing.quantity += slot.quantity;
        } else {
          state.player.inventory.items.push({ ...slot });
        }
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
    const activeRes = this.outcomeEngine.getActiveCombatResolution();
    const targetEnemy = activeRes?.incapacitatedEnemies.find((e) => e.id === targetEnemyId);
    const enemyName = targetEnemy?.name ?? 'Hostile Survivor';

    let summaryText = '';
    switch (actionId) {
      case 'Search':
        summaryText = `Searched ${enemyName}. Recovered encrypted Syndicate comm-pad.`;
        state.player.inventory.items.push({ itemId: 'cyb_neural_jack_v1', quantity: 1, isEquipped: false });
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
