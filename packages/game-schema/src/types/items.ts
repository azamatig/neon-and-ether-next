import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { PrimaryStatSchema } from './stats.ts';

export const ItemRaritySchema = z.enum([
  'Common',
  'StreetGrade',
  'MilitarySpec',
  'Prototype',
  'EtherArtifact',
]);

export type ItemRarity = z.infer<typeof ItemRaritySchema>;

export const ItemCategorySchema = z.enum([
  'Firearm',
  'Melee',
  'Cyberware',
  'EtherFocus',
  'Armor',
  'Consumable',
  'Datapad',
  'KeyItem',
  'CraftingMaterial',
  'Ammunition',
]);

export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const ItemStatModifierSchema = z.object({
  stat: PrimaryStatSchema,
  value: z.number().int(),
});

export type ItemStatModifier = z.infer<typeof ItemStatModifierSchema>;

export const StatRequirementsSchema = z
  .object({
    Body: z.number().int().min(1).optional(),
    Reflexes: z.number().int().min(1).optional(),
    Mind: z.number().int().min(1).optional(),
    EtherTech: z.number().int().min(1).optional(),
    Presence: z.number().int().min(1).optional(),
  })
  .partial();

export type StatRequirements = z.infer<typeof StatRequirementsSchema>;

export const ItemSchema = BaseEntitySchema.extend({
  category: ItemCategorySchema,
  rarity: ItemRaritySchema.default('Common'),
  weightKg: z.number().min(0).default(0.1),
  valueCredits: z.number().int().min(0).default(10),
  stackable: z.boolean().default(false),
  maxStack: z.number().int().min(1).default(1),
  apUseCost: z.number().int().min(0).optional(),
  etherCost: z.number().int().min(0).optional(),
  damageRange: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
  rangeTiles: z.number().int().min(0).optional(),
  armorRating: z.number().int().min(0).optional(),
  statRequirements: StatRequirementsSchema.optional(),
  modifiers: z.array(ItemStatModifierSchema).optional().default([]),
  icon: z.string().default('Box'),
});

export type Item = z.infer<typeof ItemSchema>;

/** Backwards-compatible alias */
export type ItemDefinition = Item;
