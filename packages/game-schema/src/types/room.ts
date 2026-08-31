import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { GridTileSchema, Vector2DSchema } from './grid.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';

export const BaseResourceCostSchema = z.record(z.string(), z.number().int().min(0));
export const BaseRoomCapacitySchema = z.object({
  residents: z.number().int().min(0).default(0),
  workers: z.number().int().min(0).default(0),
  storage: z.number().int().min(0).default(0),
});

/** Open content taxonomy: adding a room category never requires runtime code changes. */
export const RoomTypeSchema = z.string().min(1);

export type RoomType = z.infer<typeof RoomTypeSchema>;

export const RoomDoorwaySchema = z.object({
  position: Vector2DSchema,
  facing: z.enum(['North', 'South', 'East', 'West']),
  doorType: z.enum(['Standard', 'Reinforced', 'EtherSealed', 'Broken']).default('Standard'),
  connectsToRoomType: RoomTypeSchema.optional(),
});

export type RoomDoorway = z.infer<typeof RoomDoorwaySchema>;

export const BaseRoomDefinitionSchema = BaseEntitySchema.extend({
  roomType: RoomTypeSchema.default('room'),
  artwork: z.string().optional(),
  icon: z.string().default('Home'),
  width: z.number().int().min(3).default(6),
  height: z.number().int().min(3).default(6),
  tiles: z.array(z.array(GridTileSchema)).optional(),
  doorways: z.array(RoomDoorwaySchema).default([]),
  recommendedEnemies: z.array(z.string()).default([]),
  recommendedPois: z.array(z.string()).default([]),
  minSecurityLevel: z.number().int().min(1).max(5).default(1),
  isHazardous: z.boolean().default(false),
  ambientEtherBonus: z.number().int().default(0),
  buildCost: BaseResourceCostSchema.default({}),
  requirements: z.array(ConditionSchema).default([]),
  conditions: z.array(ConditionSchema).default([]),
  capacity: BaseRoomCapacitySchema.default({ residents: 0, workers: 0, storage: 0 }),
  storageModifiers: z.record(z.string(), z.number()).default({}),
  gameplayModifiers: z.record(z.string(), z.number()).default({}),
  effects: z.array(EffectSchema).default([]),
  upgradeIds: z.array(z.string()).default([]),
  allowedSlotTypes: z.array(z.string()).default(['Standard']),
  maxInstances: z.number().int().min(1).default(1),
});

export type BaseRoomDefinition = z.infer<typeof BaseRoomDefinitionSchema>;
