import { z } from 'zod';

/**
 * Primary RPG attributes for deterministic checks and derived calculations.
 */
export const PrimaryStatSchema = z.enum([
  'Body',
  'Reflexes',
  'Mind',
  'EtherTech',
  'Presence',
]);

export type PrimaryStat = z.infer<typeof PrimaryStatSchema>;

export const CharacterAttributesSchema = z.object({
  body: z.number().int().min(1).max(30).default(10),
  reflexes: z.number().int().min(1).max(30).default(10),
  mind: z.number().int().min(1).max(30).default(10),
  etherTech: z.number().int().min(1).max(30).default(10),
  presence: z.number().int().min(1).max(30).default(10),
});

export type CharacterAttributes = z.infer<typeof CharacterAttributesSchema>;

export const DerivedVitalsSchema = z.object({
  maxHp: z.number().int().min(1).default(100),
  currentHp: z.number().int().min(0).default(100),
  maxEther: z.number().int().min(0).default(50),
  currentEther: z.number().int().min(0).default(50),
  actionPointsMax: z.number().int().min(1).default(6),
  actionPointsCurrent: z.number().int().min(0).default(6),
  initiative: z.number().int().default(10),
  armorRating: z.number().int().min(0).default(0),
  etherResistance: z.number().int().min(0).default(0),
});

export type DerivedVitals = z.infer<typeof DerivedVitalsSchema>;

export const StatCheckDifficultySchema = z.enum([
  'Trivial',
  'Easy',
  'Moderate',
  'Hard',
  'Extreme',
  'Impossible',
]);

export type StatCheckDifficulty = z.infer<typeof StatCheckDifficultySchema>;

export const DIFFICULTY_DC: Record<StatCheckDifficulty, number> = {
  Trivial: 6,
  Easy: 9,
  Moderate: 12,
  Hard: 15,
  Extreme: 18,
  Impossible: 22,
};

export const StatCheckRequirementSchema = z.object({
  stat: PrimaryStatSchema,
  difficulty: StatCheckDifficultySchema,
  customDc: z.number().int().optional(),
  label: z.string().optional(),
});

export type StatCheckRequirement = z.infer<typeof StatCheckRequirementSchema>;
