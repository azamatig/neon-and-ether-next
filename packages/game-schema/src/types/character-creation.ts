import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';
import { AttributeKeySchema, CharacterStatModifierSchema } from './stats.ts';
import { EquipmentSlotSchema } from './items.ts';

export const CharacterCreationAttributeRuleSchema = z.object({ attribute: AttributeKeySchema, minimum: z.number().int().min(1), maximum: z.number().int().min(1), costPerPoint: z.number().int().min(1).default(1) });
export const CharacterCreationSkillRuleSchema = z.object({ skillId: z.string().min(1), name: z.string().min(1), minimum: z.number().int().min(0).default(0), maximum: z.number().int().min(0), costPerRank: z.number().int().min(1).default(1) });
export const StartingItemSchema = z.object({ itemId: z.string().min(1), quantity: z.number().int().min(1).default(1) });
export const CharacterAvailabilitySchema = z.enum(['Player', 'NPC', 'Both']);
export const CharacterArchetypeRaritySchema = z.enum(['common', 'uncommon', 'rare', 'unique']);

export const RaceDefinitionSchema = BaseEntitySchema.extend({
  artwork: z.string().optional(), availability: CharacterAvailabilitySchema.default('Both'), rarity: CharacterArchetypeRaritySchema.default('common'), requirements: z.array(ConditionSchema).default([]),
  attributeModifiers: z.array(CharacterStatModifierSchema).default([]), skillModifiers: z.record(z.string(), z.number().int()).default({}),
  grantedTraits: z.array(z.string()).default([]), grantedAbilityIds: z.array(z.string()).default([]), startingEffects: z.array(EffectSchema).default([]),
  parentRaceIds: z.array(z.string().min(1)).default([]), lineageMetadata: z.record(z.string(), z.string()).default({}),
});
export type RaceDefinition = z.infer<typeof RaceDefinitionSchema>;

export const ClassDefinitionSchema = BaseEntitySchema.extend({
  artwork: z.string().optional(), availability: CharacterAvailabilitySchema.default('Both'), rarity: CharacterArchetypeRaritySchema.default('common'), requirements: z.array(ConditionSchema).default([]),
  startingAbilityIds: z.array(z.string()).default([]), startingSkillModifiers: z.record(z.string(), z.number().int()).default({}),
  startingModifiers: z.array(CharacterStatModifierSchema).default([]), startingEquipment: z.array(StartingItemSchema).default([]),
  grantedTraits: z.array(z.string()).default([]), startingEffects: z.array(EffectSchema).default([]), progressionConfigId: z.string().optional(),
});
export type ClassDefinition = z.infer<typeof ClassDefinitionSchema>;

export const SpecialPathProgressionEntrySchema = z.object({
  abilityId: z.string().min(1), group: z.string().min(1).optional(), unlockConditions: z.array(ConditionSchema).default([]),
});
export const SpecialPathDefinitionSchema = BaseEntitySchema.extend({
  availability: CharacterAvailabilitySchema.default('Both'), rarity: CharacterArchetypeRaritySchema.default('rare'),
  unlockConditions: z.array(ConditionSchema).default([]), progression: z.array(SpecialPathProgressionEntrySchema).default([]),
});
export type SpecialPathDefinition = z.infer<typeof SpecialPathDefinitionSchema>;

export const NamePoolDefinitionSchema = BaseEntitySchema.extend({
  firstNames: z.array(z.string().trim().min(1)).min(1), surnames: z.array(z.string().trim().min(1)).default([]), style: z.string().optional(),
});
export type NamePoolDefinition = z.infer<typeof NamePoolDefinitionSchema>;

export const BackgroundDefinitionSchema = BaseEntitySchema.extend({
  artwork: z.string().optional(), requirements: z.array(ConditionSchema).default([]),
  startingModifiers: z.array(CharacterStatModifierSchema).default([]), startingSkills: z.record(z.string(), z.number().int().min(0)).default({}),
  startingItems: z.array(StartingItemSchema).default([]), startingMoney: z.number().int().min(0).default(0),
  startingFactionReputation: z.record(z.string(), z.number().int()).default({}), startingFlags: z.record(z.string(), z.union([z.string(),z.number(),z.boolean()])).default({}),
  startingEffects: z.array(EffectSchema).default([]),
});
export type BackgroundDefinition = z.infer<typeof BackgroundDefinitionSchema>;

export const PerkDefinitionSchema = BaseEntitySchema.extend({
  requirements: z.array(ConditionSchema).default([]), excludedPerkIds: z.array(z.string()).default([]), requiredBackgroundIds: z.array(z.string()).default([]),
  modifiers: z.array(CharacterStatModifierSchema).default([]), startingEffects: z.array(EffectSchema).default([]),
});
export type PerkDefinition = z.infer<typeof PerkDefinitionSchema>;

export const NewGameDefinitionSchema = BaseEntitySchema.extend({
  startingMapId: z.string().min(1), startingPoiId: z.string().optional(), startingEventId: z.string().optional(),
  minimumAge: z.number().int().min(1), maximumAge: z.number().int().min(1), defaultAge: z.number().int().min(1),
  portraits: z.array(z.object({ id:z.string().min(1), name:z.string().min(1), image:z.string().optional() })).default([]),
  attributePointBudget: z.number().int().min(0), attributeRules: z.array(CharacterCreationAttributeRuleSchema).min(1),
  skillPointBudget: z.number().int().min(0).default(0), skillRules: z.array(CharacterCreationSkillRuleSchema).default([]),
  startingPerkCount: z.number().int().min(0).default(0), requireAllPointsSpent: z.boolean().default(true),
  defaultRaceId: z.string().min(1), namePoolIds: z.array(z.string()).min(1),
  equipmentSlots: z.array(EquipmentSlotSchema).default([]),
  startingQuestIds: z.array(z.string()).default([]), startingTime: z.object({ day:z.number().int().min(1), hour:z.number().int().min(0).max(23), minute:z.number().int().min(0).max(59) }).optional(),
});
export type NewGameDefinition = z.infer<typeof NewGameDefinitionSchema>;

export const CharacterCreationSelectionSchema = z.object({
  name: z.string().trim().min(1).max(40), age: z.number().int(), portraitId: z.string().optional(), raceId: z.string().min(1), classId: z.string().min(1), backgroundId: z.string().min(1),
  attributes: z.record(AttributeKeySchema, z.number().int()), skills: z.record(z.string(), z.number().int()).default({}), perkIds: z.array(z.string()).default([]),
});
export type CharacterCreationSelection = z.infer<typeof CharacterCreationSelectionSchema>;
