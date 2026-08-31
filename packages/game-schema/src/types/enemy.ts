import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { CharacterAttributesSchema, CharacterStatModifierSchema, CharacterStatusEffectSchema, DerivedVitalsSchema, SkillsSchema } from './stats.ts';

export const EnemyTierSchema = z.enum([
  'Minion',
  'Standard',
  'Elite',
  'Boss',
  'CyberAbomination',
  'CombatDrone',
]);

export type EnemyTier = z.infer<typeof EnemyTierSchema>;

export const AIArchetypeSchema = z.enum([
  'MeleeRusher',
  'RangedFlanker',
  'EtherCaster',
  'HeavyTank',
  'SupportBuffer',
  'PatrolGuard',
]);

export type AIArchetype = z.infer<typeof AIArchetypeSchema>;

export const LootDropSchema = z.object({
  itemId: z.string().min(1),
  dropRate: z.number().min(0).max(1).default(1.0), // Probability 0.0 - 1.0
  minQuantity: z.number().int().min(1).default(1),
  maxQuantity: z.number().int().min(1).default(1),
});

export type LootDrop = z.infer<typeof LootDropSchema>;

export const EnemySchema = BaseEntitySchema.extend({
  factionId: z.string().optional(),
  factionIds: z.array(z.string()).default([]),
  level: z.number().int().min(1).default(1),
  progressionDefinitionId: z.string().optional(),
  tier: EnemyTierSchema.default('Standard'),
  attributes: CharacterAttributesSchema,
  vitals: DerivedVitalsSchema,
  skills: SkillsSchema,
  perks: z.array(z.string()).default([]),
  temporaryModifiers: z.array(CharacterStatModifierSchema).default([]),
  statusEffects: z.array(CharacterStatusEffectSchema).default([]),
  aiArchetype: AIArchetypeSchema.default('MeleeRusher'),
  equippedWeaponId: z.string().optional(),
  lootTable: z.array(LootDropSchema).default([]),
  grantedXp: z.number().int().min(0).default(25),
  bountyCredits: z.number().int().min(0).default(50),
  behaviorFlags: z.array(z.string()).default([]),
  traits: z.array(z.string()).default([]),
  abilityIds: z.array(z.string()).default([]),
  combatAIProfileId: z.string().optional(),
  portraitIcon: z.string().default('Skull'),
});

export type Enemy = z.infer<typeof EnemySchema>;
