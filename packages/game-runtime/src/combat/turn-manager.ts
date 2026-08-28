/**
 * @neon-ether/game-runtime
 * Turn-based Tactical AP Economy & Round Manager.
 */

import { CombatUnitState, TacticalCombatState } from '../state/game-state.ts';

export class TurnManager {
  private state: TacticalCombatState;

  constructor(initialState?: TacticalCombatState) {
    this.state = initialState ?? {
      isActive: false,
      roundNumber: 0,
      turnOrder: [],
      activeTurnIndex: 0,
      units: {},
    };
  }

  public getState(): TacticalCombatState {
    return this.state;
  }

  public startCombat(combatants: Array<{ id: string; initiative: number; apMax: number; etherMax: number }>): void {
    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    const turnOrder = sorted.map((c) => c.id);
    const units: Record<string, CombatUnitState> = {};

    for (const c of sorted) {
      units[c.id] = {
        characterId: c.id,
        initiativeScore: c.initiative,
        remainingAp: c.apMax,
        remainingEther: c.etherMax,
        hasMovedThisTurn: false,
        hasActedThisTurn: false,
      };
    }

    this.state = {
      isActive: true,
      roundNumber: 1,
      turnOrder,
      activeTurnIndex: 0,
      units,
    };
  }

  public getActiveUnitId(): string | null {
    if (!this.state.isActive || this.state.turnOrder.length === 0) return null;
    return this.state.turnOrder[this.state.activeTurnIndex] ?? null;
  }

  public getActiveUnit(): CombatUnitState | null {
    const activeId = this.getActiveUnitId();
    if (!activeId) return null;
    return this.state.units[activeId] ?? null;
  }

  public spendAp(cost: number): boolean {
    const unit = this.getActiveUnit();
    if (!unit || unit.remainingAp < cost) return false;
    unit.remainingAp -= cost;
    return true;
  }

  public spendEther(cost: number): boolean {
    const unit = this.getActiveUnit();
    if (!unit || unit.remainingEther < cost) return false;
    unit.remainingEther -= cost;
    return true;
  }

  public endCurrentTurn(maxApResetMap: Record<string, number>): { nextUnitId: string; roundAdvanced: boolean } {
    let roundAdvanced = false;
    this.state.activeTurnIndex += 1;

    if (this.state.activeTurnIndex >= this.state.turnOrder.length) {
      this.state.activeTurnIndex = 0;
      this.state.roundNumber += 1;
      roundAdvanced = true;

      // Reset AP for new round
      for (const unitId of this.state.turnOrder) {
        const unit = this.state.units[unitId];
        if (unit) {
          unit.remainingAp = maxApResetMap[unitId] ?? 6;
          unit.hasMovedThisTurn = false;
          unit.hasActedThisTurn = false;
        }
      }
    }

    const nextUnitId = this.state.turnOrder[this.state.activeTurnIndex];
    return { nextUnitId, roundAdvanced };
  }

  public endCombat(): void {
    this.state = {
      isActive: false,
      roundNumber: 0,
      turnOrder: [],
      activeTurnIndex: 0,
      units: {},
    };
  }
}
