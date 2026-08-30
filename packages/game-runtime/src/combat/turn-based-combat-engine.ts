import { Ability, CombatAction, Combatant, CombatState } from '@neon-ether/game-schema';
import { DiceRoller } from '@neon-ether/engine';
import { ContentRegistry } from '../content/content-registry.ts';
import { GameState } from '../state/game-state.ts';

export interface CombatCommandResult {
  success: boolean;
  state: CombatState;
  reason?: string;
}

/** Framework-agnostic turn-based combat simulation. */
export class TurnBasedCombatEngine {
  constructor(
    private readonly content: ContentRegistry,
    private readonly dice: DiceRoller = new DiceRoller(1337),
  ) {}

  public createEncounter(encounterId: string, gameState: GameState): CombatState | undefined {
    const encounter = this.content.getEncounter(encounterId);
    if (!encounter) return undefined;
    const playerDefinition = this.content.getCharacter(gameState.player.characterId);
    const equippedItems = gameState.player.inventory.items
      .filter((slot) => slot.isEquipped)
      .map((slot) => this.content.getItem(slot.itemId))
      .filter((item) => item !== undefined);
    const playerAbilities = new Set([
      ...(playerDefinition?.abilityIds ?? []),
      ...equippedItems.flatMap((item) => item.grantedAbilityIds),
    ]);
    const weapon = equippedItems.find((item) => item.category === 'weapon');
    const armor = equippedItems.filter((item) => item.category === 'armor');
    const combatants: Record<string, Combatant> = {
      [gameState.player.characterId]: {
        id: gameState.player.characterId,
        sourceId: gameState.player.characterId,
        name: gameState.player.name,
        team: 'Player',
        currentHp: gameState.player.vitals.currentHp,
        maxHp: gameState.player.vitals.maxHp,
        currentEther: gameState.player.vitals.currentEther,
        maxEther: gameState.player.vitals.maxEther,
        currentAp: gameState.player.vitals.actionPointsMax,
        maxAp: gameState.player.vitals.actionPointsMax,
        initiative: gameState.player.vitals.initiative,
        armor: gameState.player.vitals.armorRating,
        weaponId: weapon?.id,
        armorItemIds: armor.map((item) => item.id),
        abilityIds: [...playerAbilities],
        statuses: [],
        isDefeated: false,
      },
    };

    encounter.enemyGroups.forEach((group, groupIndex) => {
      const enemy = this.content.getEnemy(group.enemyId);
      if (!enemy) return;
      for (let index = 0; index < group.count; index += 1) {
        const id = `enemy_${groupIndex}_${index}`;
        combatants[id] = {
          id, sourceId: enemy.id, name: group.nameOverride ?? enemy.name, team: 'Enemy',
          currentHp: group.customHp ?? enemy.vitals.currentHp,
          maxHp: group.customHp ?? enemy.vitals.maxHp,
          currentEther: enemy.vitals.currentEther, maxEther: enemy.vitals.maxEther,
          currentAp: enemy.vitals.actionPointsMax, maxAp: enemy.vitals.actionPointsMax,
          initiative: enemy.vitals.initiative, armor: enemy.vitals.armorRating,
          weaponId: enemy.equippedWeaponId, armorItemIds: [], abilityIds: enemy.abilityIds,
          aiProfileId: enemy.combatAIProfileId, statuses: [], isDefeated: false,
        };
      }
    });
    const turnOrder = Object.values(combatants)
      .sort((left, right) => right.initiative - left.initiative || left.id.localeCompare(right.id))
      .map((combatant) => combatant.id);
    return {
      encounterId, isActive: true, roundNumber: 1, turnOrder, activeTurnIndex: 0,
      combatants, log: [{ id: 'combat_start', round: 1, message: `${encounter.name} engaged.` }], outcome: null,
    };
  }

  public execute(source: CombatState, action: CombatAction): CombatCommandResult {
    const state = structuredClone(source);
    if (!state.isActive) return { success: false, state, reason: 'Combat is not active.' };
    const actor = state.combatants[action.actorId];
    if (!actor || actor.isDefeated) return { success: false, state, reason: 'Actor is unavailable.' };
    if (state.turnOrder[state.activeTurnIndex] !== actor.id) return { success: false, state, reason: 'It is not this combatant’s turn.' };

    if (action.type === 'EndTurn') {
      this.advanceTurn(state);
      return { success: true, state };
    }
    const target = state.combatants[action.targetId];
    if (!target || target.isDefeated) return { success: false, state, reason: 'Target is unavailable.' };

    if (action.type === 'Attack') {
      if (actor.team === target.team) return { success: false, state, reason: 'Attack requires an enemy target.' };
      const weapon = actor.weaponId ? this.content.getItem(actor.weaponId) : undefined;
      const apCost = weapon?.apUseCost ?? 2;
      if (actor.currentAp < apCost) return { success: false, state, reason: 'Not enough AP.' };
      actor.currentAp -= apCost;
      const range = weapon?.damageRange ?? [2, 5];
      this.dealDamage(state, actor, target, this.dice.rollRange(range[0], range[1]), weapon?.name ?? 'Basic attack');
    } else {
      const ability = actor.abilityIds.includes(action.abilityId) ? this.content.getAbility(action.abilityId) : undefined;
      if (!ability) return { success: false, state, reason: 'Ability is unavailable.' };
      const targetError = this.validateAbilityTarget(actor, target, ability);
      if (targetError) return { success: false, state, reason: targetError };
      if (actor.currentAp < ability.apCost || actor.currentEther < ability.etherCost) {
        return { success: false, state, reason: 'Not enough AP or Ether.' };
      }
      actor.currentAp -= ability.apCost;
      actor.currentEther -= ability.etherCost;
      for (const effect of ability.effects) {
        if (effect.type === 'Damage') this.dealDamage(state, actor, target, this.dice.rollRange(effect.min, effect.max), ability.name);
        if (effect.type === 'Heal') {
          const amount = this.dice.rollRange(effect.min, effect.max);
          target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
          this.log(state, `${actor.name} uses ${ability.name}; ${target.name} recovers ${amount} HP.`);
        }
        if (effect.type === 'ApplyStatus' && effect.statusEffectId) {
          target.statuses.push({ statusEffectId: effect.statusEffectId, remainingTurns: effect.durationTurns ?? 1, sourceCombatantId: actor.id });
          this.log(state, `${target.name} gains ${this.content.getStatusEffect(effect.statusEffectId)?.name ?? effect.statusEffectId}.`);
        }
      }
    }
    this.updateOutcome(state);
    if (state.isActive && actor.currentAp === 0) this.advanceTurn(state);
    return { success: true, state };
  }

  public chooseAIAction(state: CombatState): CombatAction | undefined {
    const actorId = state.turnOrder[state.activeTurnIndex];
    const actor = state.combatants[actorId];
    if (!actor || actor.team !== 'Enemy' || actor.isDefeated) return undefined;
    const profile = actor.aiProfileId ? this.content.getCombatAIProfile(actor.aiProfileId) : undefined;
    const targets = Object.values(state.combatants).filter((target) => target.team !== actor.team && !target.isDefeated);
    if (!targets.length) return { type: 'EndTurn', actorId };
    const target = [...targets].sort((a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp)[0];
    const prioritized = [...(profile?.abilityPriority ?? []), ...actor.abilityIds]
      .map((id) => this.content.getAbility(id))
      .find((ability) => ability && actor.abilityIds.includes(ability.id) && actor.currentAp >= ability.apCost && actor.currentEther >= ability.etherCost);
    const woundedAlly = Object.values(state.combatants)
      .filter((unit) => unit.team === actor.team && !unit.isDefeated && unit.currentHp < unit.maxHp)
      .sort((a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp)[0];
    const abilityTarget = prioritized?.target === 'Self' ? actor : prioritized?.target === 'Ally' ? woundedAlly : target;
    return prioritized && abilityTarget
      ? { type: 'Ability', actorId, targetId: abilityTarget.id, abilityId: prioritized.id }
      : actor.currentAp >= 2 ? { type: 'Attack', actorId, targetId: target.id } : { type: 'EndTurn', actorId };
  }

  private validateAbilityTarget(actor: Combatant, target: Combatant, ability: Ability): string | undefined {
    if (ability.target === 'Self' && actor.id !== target.id) return 'Ability targets self.';
    if (ability.target === 'Ally' && actor.team !== target.team) return 'Ability targets an ally.';
    if (ability.target === 'Enemy' && actor.team === target.team) return 'Ability targets an enemy.';
  }

  private dealDamage(state: CombatState, actor: Combatant, target: Combatant, rawDamage: number, label: string): void {
    const statusArmor = target.statuses.reduce((sum, active) => sum + (this.content.getStatusEffect(active.statusEffectId)?.armorModifier ?? 0), 0);
    const damage = Math.max(1, rawDamage - Math.max(0, target.armor + statusArmor));
    target.currentHp = Math.max(0, target.currentHp - damage);
    target.isDefeated = target.currentHp === 0;
    this.log(state, `${actor.name} uses ${label} on ${target.name} for ${damage} damage.`);
  }

  private advanceTurn(state: CombatState): void {
    const current = state.combatants[state.turnOrder[state.activeTurnIndex]];
    if (current) this.tickStatuses(state, current, 'TurnEnd');
    this.updateOutcome(state);
    if (!state.isActive) return;
    do {
      state.activeTurnIndex += 1;
      if (state.activeTurnIndex >= state.turnOrder.length) {
        state.activeTurnIndex = 0; state.roundNumber += 1;
        Object.values(state.combatants).forEach((combatant) => { if (!combatant.isDefeated) combatant.currentAp = combatant.maxAp; });
      }
    } while (state.combatants[state.turnOrder[state.activeTurnIndex]]?.isDefeated);
    const next = state.combatants[state.turnOrder[state.activeTurnIndex]];
    if (next) this.tickStatuses(state, next, 'TurnStart');
    this.updateOutcome(state);
  }

  private tickStatuses(state: CombatState, combatant: Combatant, timing: 'TurnStart' | 'TurnEnd'): void {
    for (const active of combatant.statuses) {
      const definition = this.content.getStatusEffect(active.statusEffectId);
      if (!definition || definition.tickTiming !== timing) continue;
      combatant.currentHp = Math.max(0, Math.min(combatant.maxHp, combatant.currentHp - definition.damagePerTick + definition.healingPerTick));
      combatant.isDefeated = combatant.currentHp === 0;
      active.remainingTurns -= 1;
      this.log(state, `${definition.name} affects ${combatant.name}.`);
    }
    combatant.statuses = combatant.statuses.filter((active) => active.remainingTurns > 0);
  }

  private updateOutcome(state: CombatState): void {
    const living = Object.values(state.combatants).filter((combatant) => !combatant.isDefeated);
    if (!living.some((combatant) => combatant.team === 'Enemy')) state.outcome = 'Victory';
    if (!living.some((combatant) => combatant.team === 'Player')) state.outcome = 'Defeat';
    state.isActive = state.outcome === null;
  }

  private log(state: CombatState, message: string): void {
    state.log.push({ id: `combat_log_${state.log.length + 1}`, round: state.roundNumber, message });
  }
}
