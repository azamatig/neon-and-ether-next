import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';

export const RecipeCategorySchema = z.enum(['weapon','armor','consumable','material','upgrade','misc']);
export type RecipeCategory = z.infer<typeof RecipeCategorySchema>;
export const RecipeInputSchema = z.object({ itemId:z.string().min(1), quantity:z.number().int().min(1).default(1) });
export type RecipeInput = z.infer<typeof RecipeInputSchema>;
export const RecipeOutputSchema = z.object({ itemId:z.string().min(1), quantity:z.number().int().min(1).default(1) });
export type RecipeOutput = z.infer<typeof RecipeOutputSchema>;
export const CraftingRequirementSchema = z.discriminatedUnion('type',[
  z.object({type:z.literal('level'),minimum:z.number().int().min(1)}),
  z.object({type:z.literal('attribute'),attribute:z.enum(['body','reflexes','mind','etherTech','presence']),minimum:z.number().int().min(1)}),
  z.object({type:z.literal('skill'),skillId:z.string().min(1),minimum:z.number().int().min(0)}),
]);
export const CraftingLocationSchema = z.enum(['poi','base','room']);
export type CraftingLocation = z.infer<typeof CraftingLocationSchema>;

/** One recipe format is used at POIs, bases, and rooms/stations. */
export const RecipeSchema = BaseEntitySchema.extend({
  category:RecipeCategorySchema.default('misc'),
  inputs:z.array(RecipeInputSchema).min(1),
  requirements:z.array(CraftingRequirementSchema).default([]),
  toolItemIds:z.array(z.string().min(1)).default([]),
  roomIds:z.array(z.string().min(1)).default([]),
  availableAt:z.array(CraftingLocationSchema).min(1).default(['poi','base','room']),
  output:RecipeOutputSchema,
  timeCost:z.object({turns:z.number().int().min(0).default(1)}).default({turns:1}),
  conditions:z.array(ConditionSchema).default([]),
  effects:z.array(EffectSchema).default([]),
  discoveredByDefault:z.boolean().default(true),
});
export type RecipeDefinition = z.infer<typeof RecipeSchema>;
export type Recipe = RecipeDefinition;
