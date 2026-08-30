import { z } from 'zod';

export const PrimaryStatSchema = z.enum(['Body','Reflexes','Mind','EtherTech','Presence']);
export type PrimaryStat = z.infer<typeof PrimaryStatSchema>;
export const AttributeKeySchema = z.enum(['body','reflexes','mind','etherTech','presence']);
export type AttributeKey = z.infer<typeof AttributeKeySchema>;

export const CharacterAttributesSchema = z.object({ body:z.number().int().min(1).max(30).default(10), reflexes:z.number().int().min(1).max(30).default(10), mind:z.number().int().min(1).max(30).default(10), etherTech:z.number().int().min(1).max(30).default(10), presence:z.number().int().min(1).max(30).default(10) });
export type CharacterAttributes = z.infer<typeof CharacterAttributesSchema>;
export const SkillsSchema = z.record(z.string().min(1), z.number().int()).default({});
export type Skills = z.infer<typeof SkillsSchema>;

export const DerivedStatsSchema = z.object({ maxHp:z.number().int().min(1).default(100), currentHp:z.number().int().min(0).default(100), maxEther:z.number().int().min(0).default(50), currentEther:z.number().int().min(0).default(50), actionPointsMax:z.number().int().min(1).default(6), actionPointsCurrent:z.number().int().min(0).default(6), initiative:z.number().int().default(10), armorRating:z.number().int().min(0).default(0), etherResistance:z.number().int().min(0).default(0) });
export type DerivedStats = z.infer<typeof DerivedStatsSchema>;
export const DerivedVitalsSchema = DerivedStatsSchema;
export type DerivedVitals = DerivedStats;

export const CharacterStatModifierSchema = z.object({ id:z.string().min(1), target:z.string().min(1), value:z.number(), operation:z.enum(['add','multiply']).default('add'), durationTurns:z.number().int().min(0).optional(), sourceId:z.string().optional() });
export type CharacterStatModifier = z.infer<typeof CharacterStatModifierSchema>;
export const CharacterStatusEffectSchema = z.object({ id:z.string().min(1), sourceId:z.string().optional(), durationTurns:z.number().int().min(0), stacks:z.number().int().min(1).default(1), modifiers:z.array(CharacterStatModifierSchema).default([]) });
export const CharacterRpgStatsSchema = z.object({ attributes:CharacterAttributesSchema, skills:SkillsSchema, derivedStats:DerivedStatsSchema, traits:z.array(z.string()).default([]), perks:z.array(z.string()).default([]), temporaryModifiers:z.array(CharacterStatModifierSchema).default([]), statusEffects:z.array(CharacterStatusEffectSchema).default([]) });
export type CharacterRpgStats = z.infer<typeof CharacterRpgStatsSchema>;

export const StatCheckDifficultySchema = z.enum(['Trivial','Easy','Moderate','Hard','Extreme','Impossible']);
export type StatCheckDifficulty = z.infer<typeof StatCheckDifficultySchema>;
export const DIFFICULTY_DC: Record<StatCheckDifficulty,number> = { Trivial:6, Easy:9, Moderate:12, Hard:15, Extreme:18, Impossible:22 };
export const SkillCheckModifierSchema = z.object({ source:z.string().min(1), value:z.number().int() });
export const SkillCheckDefinitionSchema = z.object({ attribute:AttributeKeySchema, skill:z.string().min(1).optional(), difficulty:StatCheckDifficultySchema.default('Moderate'), targetDc:z.number().int().optional(), modifiers:z.array(SkillCheckModifierSchema).default([]), label:z.string().optional() });
export type SkillCheckDefinition = z.infer<typeof SkillCheckDefinitionSchema>;
export const SkillCheckOutcomeSchema = z.enum(['criticalFailure','failure','partialSuccess','success','criticalSuccess']);
export type SkillCheckOutcome = z.infer<typeof SkillCheckOutcomeSchema>;

/** Legacy dialogue definition; resolved by the same generic SkillCheckSystem. */
export const StatCheckRequirementSchema = z.object({ stat:PrimaryStatSchema, difficulty:StatCheckDifficultySchema, customDc:z.number().int().optional(), label:z.string().optional() });
export type StatCheckRequirement = z.infer<typeof StatCheckRequirementSchema>;
