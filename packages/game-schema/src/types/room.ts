import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { GridTileSchema, Vector2DSchema } from './grid.ts';

export const RoomTypeSchema = z.enum([
  'Corridor',
  'Barracks',
  'ServerRoom',
  'EtherLaboratory',
  'Armory',
  'BossChamber',
  'MedBay',
  'CryoVault',
  'SecurityCheckpoint',
  'GeneratorHub',
]);

export type RoomType = z.infer<typeof RoomTypeSchema>;

export const RoomDoorwaySchema = z.object({
  position: Vector2DSchema,
  facing: z.enum(['North', 'South', 'East', 'West']),
  doorType: z.enum(['Standard', 'Reinforced', 'EtherSealed', 'Broken']).default('Standard'),
  connectsToRoomType: RoomTypeSchema.optional(),
});

export type RoomDoorway = z.infer<typeof RoomDoorwaySchema>;

export const BaseRoomDefinitionSchema = BaseEntitySchema.extend({
  roomType: RoomTypeSchema.default('Corridor'),
  width: z.number().int().min(3).default(6),
  height: z.number().int().min(3).default(6),
  tiles: z.array(z.array(GridTileSchema)).optional(),
  doorways: z.array(RoomDoorwaySchema).default([]),
  recommendedEnemies: z.array(z.string()).default([]),
  recommendedPois: z.array(z.string()).default([]),
  minSecurityLevel: z.number().int().min(1).max(5).default(1),
  isHazardous: z.boolean().default(false),
  ambientEtherBonus: z.number().int().default(0),
});

export type BaseRoomDefinition = z.infer<typeof BaseRoomDefinitionSchema>;
