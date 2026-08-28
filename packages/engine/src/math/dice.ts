/**
 * @neon-ether/engine
 * Seedable deterministic dice roller and stat modifier calculator.
 */

export interface DiceRollResult {
  rawRoll: number;
  modifier: number;
  total: number;
  isNaturalCriticalSuccess: boolean;
  isNaturalCriticalFailure: boolean;
  breakdown: string;
}

export class DiceRoller {
  private seed: number;

  constructor(initialSeed: number = Date.now()) {
    this.seed = initialSeed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /**
   * Deterministic pseudo-random number generator (Lehmer LCG).
   */
  public nextRandom(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  public rollD20(modifier: number = 0, label: string = 'Check'): DiceRollResult {
    const raw = Math.floor(this.nextRandom() * 20) + 1;
    const isNaturalCriticalSuccess = raw === 20;
    const isNaturalCriticalFailure = raw === 1;
    const total = raw + modifier;

    return {
      rawRoll: raw,
      modifier,
      total,
      isNaturalCriticalSuccess,
      isNaturalCriticalFailure,
      breakdown: `[d20: ${raw} ${modifier >= 0 ? '+' : ''}${modifier} = ${total}] (${label})`,
    };
  }

  public rollRange(min: number, max: number): number {
    return Math.floor(this.nextRandom() * (max - min + 1)) + min;
  }
}
