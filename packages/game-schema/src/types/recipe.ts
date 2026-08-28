import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { PrimaryStatSchema } from './stats.ts';

export const RecipeCategorySchema = z.enum([
  'WeaponMod',
  'ChemSynthesis',
  'EtherInfusion',
  'CyberwareAssembly',
  'Ammunition',
  'Medical',
]);

export type RecipeCategory = z.infer<typeof RecipeCategorySchema>;

export const CraftingStationTypeSchema = z.enum([
  'Workbench',
  'EtherCrucible',
  'BiotechLab',
  'CyberdeckStation',
  'FieldCrafting',
]);

export type CraftingStationType = z.infer<typeof CraftingStationTypeSchema>;

export const RecipeIngredientSchema = z.object({
  itemId: z.string().min(1, 'Ingredient itemId must not be empty'),
  quantity: z.number().int().min(1).default(1),
});

export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

export const RecipeSkillRequirementSchema = z.object({
  stat: PrimaryStatSchema,
  minLevel: z.number().int().min(1).default(1),
});

export type RecipeSkillRequirement = z.infer<typeof RecipeSkillRequirementSchema>;

export const RecipeSchema = BaseEntitySchema.extend({
  category: RecipeCategorySchema.default('ChemSynthesis'),
  requiredStationType: CraftingStationTypeSchema.default('FieldCrafting'),
  ingredients: z.array(RecipeIngredientSchema).min(1, 'A recipe requires at least one ingredient'),
  resultItemId: z.string().min(1, 'Resulting itemId must not be empty'),
  resultQuantity: z.number().int().min(1).default(1),
  craftingTimeTurns: z.number().int().min(0).default(1),
  etherCost: z.number().int().min(0).default(0),
  requiredSkill: RecipeSkillRequirementSchema.optional(),
  discoveredByDefault: z.boolean().default(true),
});

export type Recipe = z.infer<typeof RecipeSchema>;
