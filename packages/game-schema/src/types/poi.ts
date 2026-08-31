/**
 * @neon-ether/game-schema
 * Point of Interest (POI) & Data-Driven POI Action Schemas.
 * Used for World / Local District Map navigation and interactive location exploration.
 */

import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';
import { SkillCheckDefinitionSchema } from './stats.ts';
import { GameplayOutcome } from './outcomes.ts';

/**
 * Normalized 2D percentage coordinate (0 to 100) on the map background image.
 * This allows visual map editors to freely position markers regardless of pixel resolution.
 */
export const POIPositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export type POIPosition = z.infer<typeof POIPositionSchema>;

/**
 * POI Category Classification.
 */
export const POICategorySchema = z.enum([
  'Safehouse',
  'Terminal',
  'Market',
  'EtherRift',
  'District',
  'FactionHQ',
  'Landmark',
  'Encounter',
  'Transit',
  'SecurityNode',
  'Alley',
  'Vault',
]);

export type POICategory = z.infer<typeof POICategorySchema>;

/**
 * Action Cost Definition for executing a POI Action.
 */
export const PoiActionCostSchema = z.object({
  ap: z.number().int().min(0).optional(),
  ether: z.number().int().min(0).optional(),
  credits: z.number().int().min(0).optional(),
  hp: z.number().int().min(0).optional(),
});

export type PoiActionCost = z.infer<typeof PoiActionCostSchema>;

/**
 * Action Type for UI styling and icon presets.
 */
export const PoiActionTypeSchema = z.enum([
  'Talk',
  'Explore',
  'Interact',
  'Terminal',
  'Market',
  'Quest',
  'Rest',
  'Travel',
  'Combat',
  'Event',
  'Crafting',
  'Custom',
]);

export type PoiActionType = z.infer<typeof PoiActionTypeSchema>;

/**
 * Data-Driven POI Action Check schema.
 */
export const PoiActionCheckSchema = SkillCheckDefinitionSchema.extend({
  passEffects: z.array(EffectSchema).default([]),
  partialEffects: z.array(EffectSchema).default([]),
  failEffects: z.array(EffectSchema).default([]),
  passOutcome: z.custom<GameplayOutcome>().optional(),
  partialOutcome: z.custom<GameplayOutcome>().optional(),
  failOutcome: z.custom<GameplayOutcome>().optional(),
  passText: z.string().optional(), partialText: z.string().optional(), failText: z.string().optional(),
});

export type PoiActionCheck = z.infer<typeof PoiActionCheckSchema>;

/**
 * Fully data-driven POI Action definition with outcome transitions.
 */
export const PoiActionSchema = z.object({
  id: z.string().min(1, 'Action ID is required'),
  label: z.string().min(1, 'Action label is required'),
  description: z.string().optional(),
  icon: z.string().default('Zap'),
  actionType: PoiActionTypeSchema.default('Interact'),
  cost: PoiActionCostSchema.optional(),
  conditions: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
  check: PoiActionCheckSchema.optional(),
  outcome: z.custom<GameplayOutcome>().optional(),
  dialogueTreeId: z.string().optional(),
  targetMapId: z.string().optional(),
  targetPoiId: z.string().optional(),
  questId: z.string().optional(),
  eventId: z.string().optional(),
  hideIfUnavailable: z.boolean().default(false),
  isRepeatable: z.boolean().default(true),
  customData: z.record(z.string(), z.any()).optional(),
});

export type PoiAction = z.infer<typeof PoiActionSchema>;

/**
 * Point of Interest (POI) Content Blueprint.
 */
export const POISchema = BaseEntitySchema.extend({
  mapId: z.string().min(1, 'Map ID is required'),
  travelTimeMinutes: z.number().int().min(0).optional(),
  mapPosition: POIPositionSchema.default({ x: 50, y: 50 }),
  district: z.string().optional(),
  regionId: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().default('MapPin'),
  category: POICategorySchema.default('Landmark'),
  tags: z.array(z.string()).default([]),
  
  // Visibility & Availability Conditions
  visibilityConditions: z.array(ConditionSchema).default([]),
  availabilityConditions: z.array(ConditionSchema).default([]),

  // State hook key
  stateKey: z.string().optional(),

  // Data-driven interactive actions available at this POI
  actions: z.array(PoiActionSchema).default([]),

  // Linked NPCs stationed or visiting this POI
  npcIds: z.array(z.string()).default([]),
  shopId: z.string().optional(),

  // Linked Quests / Events connected to this location
  questIds: z.array(z.string()).default([]),
  eventIds: z.array(z.string()).default([]),
  encounterIds: z.array(z.string()).default([]),

  // Environmental Metrics
  dangerLevel: z.number().int().min(0).max(5).default(1),
  ambientEtherLevel: z.number().int().min(0).max(100).default(20),
  controllingFactionId: z.string().optional(),
  ownerFactionId: z.string().optional(),
  environmentalExposure: z.enum(['outdoor', 'sheltered', 'indoor']).default('outdoor'),
  weatherVisualScale: z.number().min(0).max(1).optional(),
});

export type POI = z.infer<typeof POISchema>;
export type POIDefinition = POI;
