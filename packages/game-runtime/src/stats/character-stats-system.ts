import type { CharacterAttributes, CharacterStatModifier, DerivedStats } from '@neon-ether/game-schema';

export interface CharacterStatsSource {
  attributes: CharacterAttributes;
  vitals: DerivedStats;
  equipment?: { appliedModifiers: Record<string, number> };
  temporaryModifiers?: CharacterStatModifier[];
  statusEffects?: Array<{ modifiers: CharacterStatModifier[]; stacks: number }>;
}
export interface ResolvedCharacterStats { attributes: CharacterAttributes; derivedStats: DerivedStats }

/** Produces effective stats without mutating base attributes or authored definitions. */
export class CharacterStatsSystem {
  resolve(source: CharacterStatsSource): ResolvedCharacterStats {
    const attributes = { ...source.attributes };
    const derivedStats = { ...source.vitals };
    for (const [target, value] of Object.entries(source.equipment?.appliedModifiers ?? {})) this.apply(attributes, derivedStats, { target, value, operation:'add' });
    for (const modifier of source.temporaryModifiers ?? []) this.apply(attributes, derivedStats, modifier);
    for (const effect of source.statusEffects ?? []) for (const modifier of effect.modifiers) for (let stack=0; stack<effect.stacks; stack++) this.apply(attributes, derivedStats, modifier);
    derivedStats.currentHp = Math.min(derivedStats.currentHp, derivedStats.maxHp);
    derivedStats.currentEther = Math.min(derivedStats.currentEther, derivedStats.maxEther);
    return { attributes, derivedStats };
  }
  private apply(attributes: CharacterAttributes, derived: DerivedStats, modifier: Pick<CharacterStatModifier,'target'|'value'|'operation'>): void {
    const record = modifier.target in attributes ? attributes as unknown as Record<string,number> : derived as unknown as Record<string,number>;
    if (!(modifier.target in record)) return;
    record[modifier.target] = modifier.operation === 'multiply' ? record[modifier.target] * modifier.value : record[modifier.target] + modifier.value;
  }
}
