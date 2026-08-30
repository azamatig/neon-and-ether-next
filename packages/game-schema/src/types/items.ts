import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { PrimaryStatSchema } from './stats.ts';
import { EffectSchema } from './effects.ts';

export const ItemRaritySchema = z.enum(['Common','StreetGrade','MilitarySpec','Prototype','EtherArtifact']);
export type ItemRarity = z.infer<typeof ItemRaritySchema>;

/** Broad categories are gameplay-neutral; tags and modifiers provide specialization. */
export const ItemCategorySchema = z.enum(['weapon','armor','consumable','material','quest','misc']);
export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const ItemModifierSchema = z.object({
  target: z.enum(['body','reflexes','mind','etherTech','presence','maxHp','maxEther','actionPointsMax','initiative','armorRating','etherResistance']),
  operation: z.enum(['add','multiply']).default('add'),
  value: z.number(),
});
export type ItemModifier = z.infer<typeof ItemModifierSchema>;

export const ItemRequirementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('level'), minimum: z.number().int().min(1) }),
  z.object({ type: z.literal('attribute'), attribute: z.enum(['body','reflexes','mind','etherTech','presence']), minimum: z.number().int().min(1) }),
  z.object({ type: z.literal('flag'), flag: z.string().min(1), expected: z.union([z.string(),z.number(),z.boolean()]).default(true) }),
]);
export type ItemRequirement = z.infer<typeof ItemRequirementSchema>;

export const EquipmentSlotSchema = z.object({
  id: z.string().min(1),
  acceptsCategories: z.array(ItemCategorySchema).default([]),
  acceptsTags: z.array(z.string()).default([]),
});
export type EquipmentSlot = z.infer<typeof EquipmentSlotSchema>;

/** Legacy authoring shapes remain accepted while content migrates to generic modifiers. */
export const ItemStatModifierSchema = z.object({ stat: PrimaryStatSchema, value: z.number().int() });
export type ItemStatModifier = z.infer<typeof ItemStatModifierSchema>;
export const StatRequirementsSchema = z.object({ Body:z.number().int().min(1).optional(), Reflexes:z.number().int().min(1).optional(), Mind:z.number().int().min(1).optional(), EtherTech:z.number().int().min(1).optional(), Presence:z.number().int().min(1).optional() }).partial();
export type StatRequirements = z.infer<typeof StatRequirementsSchema>;

export const ItemSchema = BaseEntitySchema.extend({
  category: ItemCategorySchema,
  rarity: ItemRaritySchema.default('Common'),
  weightKg: z.number().min(0).optional(),
  valueCredits: z.number().int().min(0).default(0),
  stackable: z.boolean().default(false),
  maxStack: z.number().int().min(1).default(1),
  equipmentSlots: z.array(z.string().min(1)).default([]),
  requirements: z.array(ItemRequirementSchema).default([]),
  modifiers: z.array(ItemModifierSchema).default([]),
  equipEffects: z.array(EffectSchema).default([]),
  unequipEffects: z.array(EffectSchema).default([]),
  grantedAbilityIds: z.array(z.string()).default([]),
  apUseCost: z.number().int().min(0).optional(), etherCost: z.number().int().min(0).optional(),
  damageRange: z.tuple([z.number().int().min(0),z.number().int().min(0)]).optional(), rangeTiles: z.number().int().min(0).optional(),
  icon: z.string().default('Box'),
});
export type Item = z.infer<typeof ItemSchema>;
export type ItemDefinition = Item;
