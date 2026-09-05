import { Ability, CombatAction, Combatant, CombatState } from '@neon-ether/game-schema';
import { DiceRoller, type RandomSource } from '@neon-ether/engine';
import { ContentRegistry } from '../content/content-registry.ts';
import { GameState } from '../state/game-state.ts';
import { CharacterStatsSystem } from '../stats/character-stats-system.ts';

export interface CombatCommandResult {
  success: boolean;
  state: CombatState;
  reason?: string;
}

export interface ResolvedCombatCommands {
  actorId?: string;
  legalMoves: Array<{ x: number; y: number; cost: number }>;
  attackTargetIds: string[];
  abilityTargetIds: Record<string, string[]>;
}

/** Framework-agnostic turn-based combat simulation. */
export class TurnBasedCombatEngine {
  constructor(
    private readonly content: ContentRegistry,
    private readonly dice: RandomSource = new DiceRoller(1337),
  ) {}

  public createEncounter(encounterId: string, gameState: GameState, active = true): CombatState | undefined {
    const encounter = this.content.getEncounter(encounterId);
    if (!encounter) return undefined;
    const playerDefinition = this.content.getCharacter(gameState.player.characterId);
    const equippedItems = gameState.player.inventory.items
      .filter((slot) => slot.isEquipped)
      .map((slot) => this.content.getItem(slot.itemId))
      .filter((item) => item !== undefined);
    const playerAbilities = new Set([
      ...(playerDefinition?.abilityIds ?? []),
      ...gameState.player.abilityIds,
      ...equippedItems.flatMap((item) => item.grantedAbilityIds),
    ]);
    const weapon = equippedItems.find((item) => item.category === 'weapon');
    const armor = equippedItems.filter((item) => item.category === 'armor');
    const effectivePlayer = new CharacterStatsSystem().resolve(gameState.player);
    const playerBodyImage = this.content.newGameDefinitions.getAll()
      .flatMap((definition) => definition.portraits)
      .find((portrait) => portrait.id === gameState.player.portraitId)?.image;
    const grid = encounter.tacticalGrid ?? {
      width: 8, height: 6, movementApCost: 1, tiles: [], blockingCells: [], playerDeployment: [], enemyDeployment: [],
    };
    const blocked = new Set([
      ...grid.tiles.filter((tile) => tile.type === 'Wall').map((tile) => `${tile.x}:${tile.y}`),
      ...grid.blockingCells.map((cell) => `${cell.x}:${cell.y}`),
    ]);
    const deployed = new Set<string>();
    const claimDeployment = (team: 'Player' | 'Enemy', index: number): { x: number; y: number } => {
      const authored = (team === 'Player' ? grid.playerDeployment : grid.enemyDeployment)[index];
      const generated = Array.from({ length: grid.width * grid.height }, (_, ordinal) => ({
        x: team === 'Player' ? Math.floor(ordinal / grid.height) : grid.width - 1 - Math.floor(ordinal / grid.height),
        y: ordinal % grid.height,
      }));
      const position = [authored, ...generated].find((candidate) => candidate
        && candidate.x >= 0 && candidate.y >= 0 && candidate.x < grid.width && candidate.y < grid.height
        && !blocked.has(`${candidate.x}:${candidate.y}`) && !deployed.has(`${candidate.x}:${candidate.y}`));
      if (!position) throw new Error(`Combat grid ${encounterId} has no free deployment cell for ${team}.`);
      deployed.add(`${position.x}:${position.y}`);
      return position;
    };
    const combatants: Record<string, Combatant> = {
      [gameState.player.characterId]: {
        id: gameState.player.characterId,
        sourceId: gameState.player.characterId,
        name: gameState.player.name,
        bodyImage: playerBodyImage,
        portraitIcon: 'User',
        team: 'Player',
        currentHp: effectivePlayer.derivedStats.currentHp,
        maxHp: effectivePlayer.derivedStats.maxHp,
        currentEther: effectivePlayer.derivedStats.currentEther,
        maxEther: effectivePlayer.derivedStats.maxEther,
        currentAp: effectivePlayer.derivedStats.actionPointsMax,
        maxAp: effectivePlayer.derivedStats.actionPointsMax,
        initiative: effectivePlayer.derivedStats.initiative,
        armor: effectivePlayer.derivedStats.armorRating,
        weaponId: weapon?.id,
        armorItemIds: armor.map((item) => item.id),
        abilityIds: [...playerAbilities],
        statuses: [
          ...gameState.player.statusEffects.map((status) => ({ statusEffectId: status.id, remainingTurns: status.durationTurns })),
          ...gameState.player.activeStatusEffects
            .filter((status) => !gameState.player.statusEffects.some((value) => value.id === status.id))
            .map((status) => ({ statusEffectId: status.id, remainingTurns: status.durationTurns })),
        ],
        isDefeated: false,
        isIncapacitated: false,
        position: claimDeployment('Player', 0),
        movementRange: 3,
        movementRemaining: 3,
      },
    };

    gameState.companions.forEach((npcId, index) => {
      const npc = this.content.getNPC(npcId);
      const runtime = gameState.npcs[npcId];
      if (!npc || runtime?.isAlive === false) return;
      const effective = new CharacterStatsSystem().resolve(npc);
      const inventory = runtime?.inventory?.items ?? npc.inventory;
      const equipped = inventory.filter((slot) => slot.isEquipped).map((slot) => this.content.getItem(slot.itemId)).filter((item) => item !== undefined);
      const abilities = new Set([...npc.abilityIds, ...equipped.flatMap((item) => item.grantedAbilityIds)]);
      combatants[npcId] = {
        id: npcId, sourceId: npcId, name: npc.name, team: 'Player',
        bodyImage: npc.combatImage, portraitIcon: npc.portraitIcon,
        currentHp: runtime?.currentHp ?? effective.derivedStats.currentHp,
        maxHp: runtime?.maxHp ?? effective.derivedStats.maxHp,
        currentEther: runtime?.currentEther ?? effective.derivedStats.currentEther,
        maxEther: effective.derivedStats.maxEther,
        currentAp: effective.derivedStats.actionPointsMax, maxAp: effective.derivedStats.actionPointsMax,
        initiative: effective.derivedStats.initiative, armor: effective.derivedStats.armorRating,
        weaponId: equipped.find((item) => item.category === 'weapon')?.id,
        armorItemIds: equipped.filter((item) => item.category === 'armor').map((item) => item.id),
        abilityIds: [...abilities], statuses: npc.statusEffects.map((status) => ({ statusEffectId: status.id, remainingTurns: status.durationTurns })), isDefeated: false, isIncapacitated: false,
        position: claimDeployment('Player', index + 1), movementRange: 3, movementRemaining: 3,
      };
    });

    let enemyDeploymentIndex = 0;
    encounter.enemyGroups.forEach((group, groupIndex) => {
      const enemy = this.content.getEnemy(group.enemyId);
      if (!enemy) return;
      const effectiveEnemy = new CharacterStatsSystem().resolve(enemy);
      for (let index = 0; index < group.count; index += 1) {
        const id = `enemy_${groupIndex}_${index}`;
        const deployment = claimDeployment('Enemy', enemyDeploymentIndex);
        enemyDeploymentIndex += 1;
        combatants[id] = {
          id, sourceId: enemy.id, name: group.nameOverride ?? enemy.name, team: 'Enemy',
          bodyImage: enemy.combatImage, portraitIcon: enemy.portraitIcon,
          currentHp: group.customHp ?? effectiveEnemy.derivedStats.currentHp,
          maxHp: group.customHp ?? effectiveEnemy.derivedStats.maxHp,
          currentEther: effectiveEnemy.derivedStats.currentEther, maxEther: effectiveEnemy.derivedStats.maxEther,
          currentAp: effectiveEnemy.derivedStats.actionPointsMax, maxAp: effectiveEnemy.derivedStats.actionPointsMax,
          initiative: effectiveEnemy.derivedStats.initiative, armor: effectiveEnemy.derivedStats.armorRating,
          weaponId: enemy.equippedWeaponId, armorItemIds: [], abilityIds: enemy.abilityIds,
          aiProfileId: enemy.combatAIProfileId, statuses: enemy.statusEffects.map((status) => ({ statusEffectId: status.id, remainingTurns: status.durationTurns })), isDefeated: false, isIncapacitated: false,
          position: deployment, movementRange: 3, movementRemaining: 3,
        };
      }
    });
    const turnOrder = Object.values(combatants)
      .sort((left, right) => right.initiative - left.initiative || left.id.localeCompare(right.id))
      .map((combatant) => combatant.id);
    return {
      encounterId, isActive: active, phase: active ? 'ACTIVE' : 'PREPARING', roundNumber: 1,
      turnOrder, activeTurnIndex: 0, activeCombatantId: active ? turnOrder[0] ?? null : null,
      combatants, log: [{ id: 'combat_start', round: 1, message: `${encounter.name} engaged.` }], outcome: null,
      grid,
    };
  }

  public getResolvedCommands(state: CombatState): ResolvedCombatCommands {
    if (state.phase === 'PREPARING' && !state.isActive) {
      return { actorId: undefined, legalMoves: [], attackTargetIds: [], abilityTargetIds: {} };
    }
    this.repairTurnState(state);
    const actorId = state.activeCombatantId ?? undefined;
    const actor = actorId ? state.combatants[actorId] : undefined;
    if (!actor || actor.isDefeated || actor.isIncapacitated || !state.isActive) {
      return { actorId, legalMoves: [], attackTargetIds: [], abilityTargetIds: {} };
    }
    const occupied = new Set(Object.values(state.combatants).filter((unit) => !unit.isDefeated).map((unit) => `${unit.position.x}:${unit.position.y}`));
    const legalMoves = actor.currentAp >= state.grid.movementApCost
      ? this.resolveReachableCells(state, actor, occupied)
      : [];
    const living = Object.values(state.combatants).filter((unit) => !unit.isDefeated);
    const weapon = actor.weaponId ? this.content.getItem(actor.weaponId) : undefined;
    const attackRange = weapon?.rangeTiles ?? 1;
    const attackTargetIds = living.filter((unit) => unit.team !== actor.team && this.distance(actor, unit) <= attackRange).map((unit) => unit.id);
    const abilityTargetIds: Record<string, string[]> = {};
    for (const abilityId of actor.abilityIds) {
      const ability = this.content.getAbility(abilityId);
      if (!ability || actor.currentAp < ability.apCost || actor.currentEther < ability.etherCost) continue;
      abilityTargetIds[abilityId] = living.filter((target) => this.distance(actor, target) <= ability.rangeTiles && !this.validateAbilityTarget(actor, target, ability)).map((target) => target.id);
    }
    return { actorId, legalMoves, attackTargetIds, abilityTargetIds };
  }

  /** Refreshes mutable player stats without rebuilding the already resolved roster. */
  public synchronizePlayer(combat: CombatState, gameState: GameState): void {
    const player = combat.combatants[gameState.player.characterId];
    if (!player) return;
    const effective = new CharacterStatsSystem().resolve(gameState.player).derivedStats;
    player.initiative = effective.initiative;
    player.maxAp = effective.actionPointsMax;
    player.currentAp = Math.min(player.currentAp, player.maxAp);
    player.armor = effective.armorRating;
  }

  public execute(source: CombatState, action: CombatAction): CombatCommandResult {
    const state = structuredClone(source);
    this.repairTurnState(state);
    if (state.phase !== 'ACTIVE' || !state.isActive) return { success: false, state, reason: 'Combat is not active.' };
    const actor = state.combatants[action.actorId];
    if (!actor || actor.isDefeated || actor.isIncapacitated) return { success: false, state, reason: 'Actor is unavailable.' };
    if (state.activeCombatantId !== actor.id) return { success: false, state, reason: 'It is not this combatant’s turn.' };

    if (action.type === 'EndTurn') {
      this.advanceTurn(state);
      return { success: true, state };
    }
    if (action.type === 'Move') {
      const move = this.getResolvedCommands(state).legalMoves.find((position) => position.x === action.position.x && position.y === action.position.y);
      if (!move) return { success: false, state, reason: 'Destination is unavailable.' };
      actor.position = action.position;
      actor.currentAp -= state.grid.movementApCost;
      actor.movementRemaining -= move.cost;
      this.log(state, `${actor.name} repositions (${move.cost} movement).`);
      if (actor.currentAp === 0) this.advanceTurn(state);
      return { success: true, state };
    }
    const target = state.combatants[action.targetId];
    if (!target || target.isDefeated) return { success: false, state, reason: 'Target is unavailable.' };

    if (action.type === 'Attack') {
      if (actor.team === target.team) return { success: false, state, reason: 'Attack requires an enemy target.' };
      if (!this.getResolvedCommands(state).attackTargetIds.includes(target.id)) return { success: false, state, reason: 'Target is out of range.' };
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
      if (!this.getResolvedCommands(state).abilityTargetIds[ability.id]?.includes(target.id)) return { success: false, state, reason: 'Target is out of range.' };
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
          this.refreshIncapacitation(target);
          this.log(state, `${target.name} gains ${this.content.getStatusEffect(effect.statusEffectId)?.name ?? effect.statusEffectId}.`);
        }
      }
    }
    this.updateOutcome(state);
    if (state.isActive && (actor.currentAp === 0 || actor.isIncapacitated)) this.advanceTurn(state);
    return { success: true, state };
  }

  public chooseAIAction(state: CombatState): CombatAction | undefined {
    this.repairTurnState(state);
    const actorId = state.activeCombatantId;
    if (!actorId) return undefined;
    const actor = state.combatants[actorId];
    if (!actor || actor.team !== 'Enemy' || actor.isDefeated || actor.isIncapacitated) return undefined;
    const profile = actor.aiProfileId ? this.content.getCombatAIProfile(actor.aiProfileId) : undefined;
    const commands = this.getResolvedCommands(state);
    const targets = Object.values(state.combatants).filter((target) => commands.attackTargetIds.includes(target.id));
    const allEnemies = Object.values(state.combatants).filter((target) => target.team !== actor.team && !target.isDefeated);
    if (!allEnemies.length) return { type: 'EndTurn', actorId };
    if (!targets.length) {
      const rangedAbility = [...(profile?.abilityPriority ?? []), ...actor.abilityIds]
        .map((id) => this.content.getAbility(id))
        .find((ability) => ability?.target === 'Enemy' && (commands.abilityTargetIds[ability.id]?.length ?? 0) > 0);
      const rangedTargetId = rangedAbility ? commands.abilityTargetIds[rangedAbility.id]?.[0] : undefined;
      if (rangedAbility && rangedTargetId) return { type: 'Ability', actorId, targetId: rangedTargetId, abilityId: rangedAbility.id };
      const nearest = [...allEnemies].sort((a, b) => this.distance(actor, a) - this.distance(actor, b))[0];
      const destination = [...commands.legalMoves].sort((a, b) =>
        Math.abs(a.x - nearest.position.x) + Math.abs(a.y - nearest.position.y)
        - Math.abs(b.x - nearest.position.x) - Math.abs(b.y - nearest.position.y)
      )[0];
      return destination ? { type: 'Move', actorId, position: destination } : { type: 'EndTurn', actorId };
    }
    const target = [...targets].sort((a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp)[0];
    const prioritized = [...(profile?.abilityPriority ?? []), ...actor.abilityIds]
      .map((id) => this.content.getAbility(id))
      .find((ability) => ability && actor.abilityIds.includes(ability.id) && actor.currentAp >= ability.apCost && actor.currentEther >= ability.etherCost && (commands.abilityTargetIds[ability.id]?.length ?? 0) > 0);
    const woundedAlly = Object.values(state.combatants)
      .filter((unit) => unit.team === actor.team && !unit.isDefeated && unit.currentHp < unit.maxHp)
      .sort((a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp)[0];
    const validAbilityTargets = prioritized ? commands.abilityTargetIds[prioritized.id] ?? [] : [];
    const abilityTarget = prioritized?.target === 'Self' ? actor : prioritized?.target === 'Ally' ? woundedAlly : target;
    return prioritized && abilityTarget
      && validAbilityTargets.includes(abilityTarget.id) ? { type: 'Ability', actorId, targetId: abilityTarget.id, abilityId: prioritized.id }
      : actor.currentAp >= 2 ? { type: 'Attack', actorId, targetId: target.id } : { type: 'EndTurn', actorId };
  }

  private resolveReachableCells(state: CombatState, actor: Combatant, occupied: Set<string>): Array<{ x: number; y: number; cost: number }> {
    const tileMap = new Map(state.grid.tiles.map((tile) => [`${tile.x}:${tile.y}`, tile]));
    const blocking = new Set(state.grid.blockingCells.map((cell) => `${cell.x}:${cell.y}`));
    const costs = new Map<string, number>([[`${actor.position.x}:${actor.position.y}`, 0]]);
    const frontier = [{ ...actor.position, cost: 0 }];
    while (frontier.length > 0) {
      frontier.sort((a, b) => a.cost - b.cost);
      const current = frontier.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = current.x + dx; const y = current.y + dy; const key = `${x}:${y}`;
        if (x < 0 || y < 0 || x >= state.grid.width || y >= state.grid.height || occupied.has(key) || blocking.has(key)) continue;
        const tile = tileMap.get(key);
        if (tile?.type === 'Wall') continue;
        const nextCost = current.cost + (tile?.movementCost ?? 1);
        if (nextCost > actor.movementRemaining || nextCost >= (costs.get(key) ?? Infinity)) continue;
        costs.set(key, nextCost); frontier.push({ x, y, cost: nextCost });
      }
    }
    return [...costs.entries()].filter(([key]) => key !== `${actor.position.x}:${actor.position.y}`).map(([key, cost]) => {
      const [x, y] = key.split(':').map(Number); return { x, y, cost };
    });
  }

  private distance(left: Combatant, right: Combatant): number {
    return Math.abs(left.position.x - right.position.x) + Math.abs(left.position.y - right.position.y);
  }

  private validateAbilityTarget(actor: Combatant, target: Combatant, ability: Ability): string | undefined {
    if (ability.target === 'Self' && actor.id !== target.id) return 'Ability targets self.';
    if (ability.target === 'Ally' && actor.team !== target.team) return 'Ability targets an ally.';
    if (ability.target === 'Enemy' && actor.team === target.team) return 'Ability targets an enemy.';
    const targetDefinition=this.content.getEnemy(target.sourceId)??this.content.getCharacter(target.sourceId);const tags=targetDefinition?.tags??[];
    if(ability.requiredTargetTags.length&&!ability.requiredTargetTags.every(tag=>tags.includes(tag)))return 'Target is incompatible with this ability.';
    if(ability.excludedTargetTags.some(tag=>tags.includes(tag)))return 'Target is immune to this ability.';
  }

  private dealDamage(state: CombatState, actor: Combatant, target: Combatant, rawDamage: number, label: string): void {
    const statusArmor = target.statuses.reduce((sum, active) => sum + (this.content.getStatusEffect(active.statusEffectId)?.armorModifier ?? 0), 0);
    const damage = Math.max(1, rawDamage - Math.max(0, target.armor + statusArmor));
    target.currentHp = Math.max(0, target.currentHp - damage);
    target.isDefeated = target.currentHp === 0;
    this.log(state, `${actor.name} uses ${label} on ${target.name} for ${damage} damage.`);
  }

  private advanceTurn(state: CombatState): void {
    const current = state.activeCombatantId ? state.combatants[state.activeCombatantId] : undefined;
    if (current) this.tickStatuses(state, current, 'TurnEnd');
    this.updateOutcome(state);
    if (!state.isActive) return;

    this.rebuildTurnOrder(state);
    const maximumTransitions = Math.max(1, state.turnOrder.length * 2);
    for (let transitions = 0; transitions < maximumTransitions; transitions += 1) {
      state.activeTurnIndex += 1;
      if (state.activeTurnIndex >= state.turnOrder.length) {
        state.activeTurnIndex = 0; state.roundNumber += 1;
        Object.values(state.combatants).forEach((combatant) => {
          if (!combatant.isDefeated) {
            combatant.currentAp = combatant.maxAp;
            combatant.movementRemaining = combatant.movementRange;
          }
        });
      }
      const next = state.combatants[state.turnOrder[state.activeTurnIndex]];
      if (!next || next.isDefeated) continue;
      this.tickStatuses(state, next, 'TurnStart');
      this.updateOutcome(state);
      if (!state.isActive) return;
      if (next.isDefeated) continue;
      if (next.isIncapacitated) {
        this.log(state, `${next.name} is incapacitated and loses the turn.`);
        this.tickStatuses(state, next, 'TurnEnd');
        this.updateOutcome(state);
        if (!state.isActive) return;
        continue;
      }
      state.activeCombatantId = next.id;
      return;
    }

    // A malformed order must never leave an active combat with no actor.
    this.repairTurnState(state);
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
    this.refreshIncapacitation(combatant);
  }

  private updateOutcome(state: CombatState): void {
    const living = Object.values(state.combatants).filter((combatant) => !combatant.isDefeated);
    if (!living.some((combatant) => combatant.team === 'Enemy')) state.outcome = 'Victory';
    if (!living.some((combatant) => combatant.team === 'Player')) state.outcome = 'Defeat';
    state.isActive = state.outcome === null;
    state.phase = state.outcome === 'Victory' ? 'VICTORY' : state.outcome === 'Defeat' ? 'DEFEAT' : 'ACTIVE';
    if (!state.isActive) state.activeCombatantId = null;
  }

  private rebuildTurnOrder(state: CombatState): void {
    const combatantIds = Object.keys(state.combatants);
    const known = new Set(combatantIds);
    state.turnOrder = [...new Set([...state.turnOrder.filter((id) => known.has(id)), ...combatantIds])];
  }

  /** Repairs migrated/malformed snapshots and enforces ACTIVE => valid activeCombatantId. */
  private repairTurnState(state: CombatState): void {
    if (state.phase === 'PREPARING' && !state.isActive) return;
    Object.values(state.combatants).forEach((combatant) => this.refreshIncapacitation(combatant));
    this.updateOutcome(state);
    if (!state.isActive) return;
    this.rebuildTurnOrder(state);
    const current = state.activeCombatantId ? state.combatants[state.activeCombatantId] : undefined;
    if (current && !current.isDefeated && !current.isIncapacitated && state.turnOrder.includes(current.id)) {
      state.activeTurnIndex = state.turnOrder.indexOf(current.id);
      return;
    }
    const nextIndex = state.turnOrder.findIndex((id) => !state.combatants[id]?.isDefeated && !state.combatants[id]?.isIncapacitated);
    if (nextIndex >= 0) {
      state.activeTurnIndex = nextIndex;
      state.activeCombatantId = state.turnOrder[nextIndex];
      state.phase = 'ACTIVE';
      return;
    }
    state.isActive = false;
    state.phase = state.outcome === 'Victory' ? 'VICTORY' : 'DEFEAT';
    state.activeCombatantId = null;
  }

  private refreshIncapacitation(combatant: Combatant): void {
    combatant.isIncapacitated = combatant.statuses.some((status) => this.content.getStatusEffect(status.statusEffectId)?.preventsTurn === true);
  }

  private log(state: CombatState, message: string): void {
    state.log.push({ id: `combat_log_${state.log.length + 1}`, round: state.roundNumber, message });
  }
}
