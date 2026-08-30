import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { CharacterAttributesSchema, CharacterStatModifierSchema, CharacterStatusEffectSchema, DerivedVitalsSchema, SkillsSchema } from './stats.ts';
import { Vector2DSchema } from './grid.ts';
import { CharacterRelationshipSchema } from './character-management.ts';
import { ConditionSchema } from './conditions.ts';

export const CharacterInventorySlotSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  isEquipped: z.boolean().default(false),
});

export type CharacterInventorySlot = z.infer<typeof CharacterInventorySlotSchema>;

export const NPCSchema = BaseEntitySchema.extend({
  title: z.string().default('Citizen'),
  factionId: z.string().optional(),
  factionIds: z.array(z.string()).default([]),
  isPlayer: z.boolean().default(false),
  isMerchant: z.boolean().default(false),
  shopId: z.string().optional(),
  isCompanion: z.boolean().default(false),
  level: z.number().int().min(1).default(1),
  progressionDefinitionId: z.string().optional(),
  attributes: CharacterAttributesSchema,
  vitals: DerivedVitalsSchema,
  skills: SkillsSchema,
  perks: z.array(z.string()).default([]),
  temporaryModifiers: z.array(CharacterStatModifierSchema).default([]),
  statusEffects: z.array(CharacterStatusEffectSchema).default([]),
  position: Vector2DSchema.default({ x: 0, y: 0 }),
  facing: z.enum(['North', 'South', 'East', 'West']).default('South'),
  inventory: z.array(CharacterInventorySlotSchema).default([]),
  dialogueTreeId: z.string().optional(),
  portraitIcon: z.string().default('User'),
  defaultBehavior: z.enum(['Idle', 'Patrol', 'Guard', 'Wander']).default('Idle'),
  abilityIds: z.array(z.string()).default([]),
  traits: z.array(z.string()).default([]),
  initialRelationship: CharacterRelationshipSchema.optional(),
  availabilityConditions: z.array(ConditionSchema).default([]),
});

export type NPC = z.infer<typeof NPCSchema>;

/** Backwards-compatible alias */
export type CharacterDefinition = NPC;
