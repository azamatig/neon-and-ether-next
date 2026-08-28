import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { CharacterAttributesSchema, DerivedVitalsSchema } from './stats.ts';
import { Vector2DSchema } from './grid.ts';

export const CharacterInventorySlotSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  isEquipped: z.boolean().default(false),
});

export type CharacterInventorySlot = z.infer<typeof CharacterInventorySlotSchema>;

export const NPCSchema = BaseEntitySchema.extend({
  title: z.string().default('Citizen'),
  factionId: z.string().default('Neutral'),
  isPlayer: z.boolean().default(false),
  isMerchant: z.boolean().default(false),
  isCompanion: z.boolean().default(false),
  level: z.number().int().min(1).default(1),
  attributes: CharacterAttributesSchema,
  vitals: DerivedVitalsSchema,
  position: Vector2DSchema.default({ x: 0, y: 0 }),
  facing: z.enum(['North', 'South', 'East', 'West']).default('South'),
  inventory: z.array(CharacterInventorySlotSchema).default([]),
  dialogueTreeId: z.string().optional(),
  portraitIcon: z.string().default('User'),
  defaultBehavior: z.enum(['Idle', 'Patrol', 'Guard', 'Wander']).default('Idle'),
});

export type NPC = z.infer<typeof NPCSchema>;

/** Backwards-compatible alias */
export type CharacterDefinition = NPC;
